/**
 * Qanuni SaaS - Matter CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Supports multi-client linking via matter_clients junction table.
 *
 * @version 1.0.0 (Week 2 Day 5)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/matters ====================
// List all matters for the user's firm, with linked clients

router.get('/', async (req, res) => {
  try {
    const { search, matter_status, matter_type, billing_type: billingFilter } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses for matters
    let where = 'WHERE m.firm_id = @firm_id AND m.is_deleted = 0';

    if (search) {
      where += ` AND (
        m.matter_name LIKE '%' + @search + '%' OR
        m.matter_name_arabic LIKE '%' + @search + '%' OR
        m.matter_number LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (matter_status) {
      where += ' AND m.matter_status = @matter_status';
      params.matter_status = matter_status;
    }

    if (matter_type) {
      where += ' AND m.matter_type = @matter_type';
      params.matter_type = matter_type;
    }

    if (billingFilter) {
      where += ' AND m.billing_type = @billing_type';
      params.billing_type = billingFilter;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM matters m ${where}`,
      params
    );
    const total = countResult.total;

    // Get paginated results with embedded clients
    const matters = await db.getAll(
      `SELECT
        m.matter_id,
        m.firm_id,
        m.matter_number,
        m.matter_name,
        m.matter_name_arabic,
        m.matter_type,
        m.matter_status,
        m.court_name,
        m.court_name_arabic,
        m.case_number,
        m.case_year,
        m.hourly_rate,
        m.flat_fee,
        m.billing_type,
        m.date_opened,
        m.date_closed,
        m.statute_of_limitations,
        m.description,
        m.notes,
        m.is_active,
        m.created_at,
        m.updated_at,
        (
          SELECT
            mc.client_id,
            c.client_name,
            c.client_name_arabic,
            mc.client_role,
            mc.is_primary
          FROM matter_clients mc
          INNER JOIN clients c ON mc.client_id = c.client_id
          WHERE mc.matter_id = m.matter_id
          FOR JSON PATH
        ) AS clients_json
      FROM matters m
      ${where}
      ORDER BY m.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    // Parse clients_json from string to array
    const mattersWithClients = matters.map(m => {
      const { clients_json, ...matter } = m;
      return {
        ...matter,
        clients: clients_json ? JSON.parse(clients_json) : []
      };
    });

    res.json({
      success: true,
      data: mattersWithClients,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get matters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve matters'
    });
  }
});

// ==================== GET /api/matters/:id ====================
// Get single matter with full details and linked clients

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid matter ID'
      });
    }

    const matter = await db.getOne(
      `SELECT
        m.matter_id,
        m.firm_id,
        m.matter_number,
        m.matter_name,
        m.matter_name_arabic,
        m.matter_type,
        m.matter_status,
        m.court_name,
        m.court_name_arabic,
        m.case_number,
        m.case_year,
        m.hourly_rate,
        m.flat_fee,
        m.billing_type,
        m.date_opened,
        m.date_closed,
        m.statute_of_limitations,
        m.description,
        m.notes,
        m.is_active,
        m.created_by,
        m.created_at,
        m.updated_at
      FROM matters m
      WHERE m.matter_id = @matter_id
        AND m.firm_id = @firm_id
        AND m.is_deleted = 0`,
      {
        matter_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!matter) {
      return res.status(404).json({
        success: false,
        error: 'Matter not found'
      });
    }

    // Fetch linked clients separately (cleaner than subquery for single record)
    const clients = await db.getAll(
      `SELECT
        mc.client_id,
        c.client_name,
        c.client_name_arabic,
        mc.client_role,
        mc.is_primary
      FROM matter_clients mc
      INNER JOIN clients c ON mc.client_id = c.client_id
      WHERE mc.matter_id = @matter_id`,
      { matter_id: id }
    );

    res.json({
      success: true,
      matter: {
        ...matter,
        clients
      }
    });

  } catch (error) {
    console.error('Get matter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve matter'
    });
  }
});

// ==================== POST /api/matters ====================
// Create new matter with optional client linking

router.post('/', validateBody('matter_saas'), async (req, res) => {
  const {
    matter_number,
    matter_name,
    matter_name_arabic,
    matter_type,
    matter_status,
    court_name,
    court_name_arabic,
    case_number,
    case_year,
    hourly_rate,
    flat_fee,
    billing_type,
    date_opened,
    date_closed,
    statute_of_limitations,
    description,
    notes,
    client_ids,
    primary_client_id
  } = req.body;

  try {
    // If client_ids provided, verify they all belong to this firm
    if (client_ids && client_ids.length > 0) {
      const clientCheck = await db.getAll(
        `SELECT client_id FROM clients
        WHERE client_id IN (${client_ids.map((_, i) => `@cid${i}`).join(', ')})
          AND firm_id = @firm_id
          AND is_deleted = 0`,
        {
          ...client_ids.reduce((acc, id, i) => ({ ...acc, [`cid${i}`]: id }), {}),
          firm_id: req.user.firm_id
        }
      );

      if (clientCheck.length !== client_ids.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more client IDs are invalid or do not belong to your firm'
        });
      }
    }

    // Use transaction for matter + matter_clients
    const result = await db.transaction(async (createRequest) => {
      // 1. Insert matter
      const matterReq = createRequest();
      matterReq.input('firm_id', req.user.firm_id);
      matterReq.input('matter_number', matter_number);
      matterReq.input('matter_name', matter_name);
      matterReq.input('matter_name_arabic', matter_name_arabic || null);
      matterReq.input('matter_type', matter_type || null);
      matterReq.input('matter_status', matter_status || 'active');
      matterReq.input('court_name', court_name || null);
      matterReq.input('court_name_arabic', court_name_arabic || null);
      matterReq.input('case_number', case_number || null);
      matterReq.input('case_year', case_year || null);
      matterReq.input('hourly_rate', hourly_rate || null);
      matterReq.input('flat_fee', flat_fee || null);
      matterReq.input('billing_type', billing_type || null);
      matterReq.input('date_opened', date_opened || null);
      matterReq.input('date_closed', date_closed || null);
      matterReq.input('statute_of_limitations', statute_of_limitations || null);
      matterReq.input('description', description || null);
      matterReq.input('notes', notes || null);
      matterReq.input('created_by', req.user.user_id);

      const matterResult = await matterReq.query(
        `INSERT INTO matters (
          firm_id, matter_number, matter_name, matter_name_arabic,
          matter_type, matter_status,
          court_name, court_name_arabic, case_number, case_year,
          hourly_rate, flat_fee, billing_type,
          date_opened, date_closed, statute_of_limitations,
          description, notes, created_by
        )
        OUTPUT INSERTED.matter_id, INSERTED.firm_id, INSERTED.matter_number, INSERTED.matter_name, INSERTED.created_at
        VALUES (
          @firm_id, @matter_number, @matter_name, @matter_name_arabic,
          @matter_type, @matter_status,
          @court_name, @court_name_arabic, @case_number, @case_year,
          @hourly_rate, @flat_fee, @billing_type,
          @date_opened, @date_closed, @statute_of_limitations,
          @description, @notes, @created_by
        )`
      );

      const newMatter = matterResult.recordset[0];
      const matterId = newMatter.matter_id;

      // 2. Insert matter_clients (if any)
      const linkedClients = [];
      if (client_ids && client_ids.length > 0) {
        for (const clientId of client_ids) {
          const mcReq = createRequest();
          mcReq.input('matter_id', matterId);
          mcReq.input('client_id', clientId);
          mcReq.input('firm_id', req.user.firm_id);
          mcReq.input('client_role', 'client');
          mcReq.input('is_primary', primary_client_id === clientId ? 1 : 0);

          await mcReq.query(
            `INSERT INTO matter_clients (matter_id, client_id, firm_id, client_role, is_primary)
            VALUES (@matter_id, @client_id, @firm_id, @client_role, @is_primary)`
          );

          linkedClients.push(clientId);
        }
      }

      return { matter: newMatter, clients: linkedClients };
    });

    res.status(201).json({
      success: true,
      matter_id: result.matter.matter_id,
      firm_id: result.matter.firm_id,
      matter_number: result.matter.matter_number,
      clients: result.clients
    });

  } catch (error) {
    // Handle unique constraint violation (duplicate matter_number within firm)
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        success: false,
        error: 'Matter number already exists for this firm'
      });
    }
    console.error('Create matter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create matter'
    });
  }
});

// ==================== PUT /api/matters/:id ====================
// Update existing matter (firm-scoped)

router.put('/:id', validateBody('matter_saas'), async (req, res) => {
  const {
    matter_number,
    matter_name,
    matter_name_arabic,
    matter_type,
    matter_status,
    court_name,
    court_name_arabic,
    case_number,
    case_year,
    hourly_rate,
    flat_fee,
    billing_type,
    date_opened,
    date_closed,
    statute_of_limitations,
    description,
    notes,
    is_active,
    client_ids,
    primary_client_id
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid matter ID'
      });
    }

    // Verify matter exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT matter_id, is_active FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        matter_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Matter not found'
      });
    }

    // If client_ids provided, verify they all belong to this firm
    if (client_ids && client_ids.length > 0) {
      const clientCheck = await db.getAll(
        `SELECT client_id FROM clients
        WHERE client_id IN (${client_ids.map((_, i) => `@cid${i}`).join(', ')})
          AND firm_id = @firm_id
          AND is_deleted = 0`,
        {
          ...client_ids.reduce((acc, cid, i) => ({ ...acc, [`cid${i}`]: cid }), {}),
          firm_id: req.user.firm_id
        }
      );

      if (clientCheck.length !== client_ids.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more client IDs are invalid or do not belong to your firm'
        });
      }
    }

    // Use transaction for matter update + client re-linking
    const result = await db.transaction(async (createRequest) => {
      // 1. Update matter
      const updateReq = createRequest();
      updateReq.input('matter_id', id);
      updateReq.input('firm_id', req.user.firm_id);
      updateReq.input('matter_number', matter_number);
      updateReq.input('matter_name', matter_name);
      updateReq.input('matter_name_arabic', matter_name_arabic || null);
      updateReq.input('matter_type', matter_type || null);
      updateReq.input('matter_status', matter_status || 'active');
      updateReq.input('court_name', court_name || null);
      updateReq.input('court_name_arabic', court_name_arabic || null);
      updateReq.input('case_number', case_number || null);
      updateReq.input('case_year', case_year || null);
      updateReq.input('hourly_rate', hourly_rate || null);
      updateReq.input('flat_fee', flat_fee || null);
      updateReq.input('billing_type', billing_type || null);
      updateReq.input('date_opened', date_opened || null);
      updateReq.input('date_closed', date_closed || null);
      updateReq.input('statute_of_limitations', statute_of_limitations || null);
      updateReq.input('description', description || null);
      updateReq.input('notes', notes || null);
      updateReq.input('is_active', is_active !== undefined ? is_active : existing.is_active);

      const updateResult = await updateReq.query(
        `UPDATE matters
        SET
          matter_number = @matter_number,
          matter_name = @matter_name,
          matter_name_arabic = @matter_name_arabic,
          matter_type = @matter_type,
          matter_status = @matter_status,
          court_name = @court_name,
          court_name_arabic = @court_name_arabic,
          case_number = @case_number,
          case_year = @case_year,
          hourly_rate = @hourly_rate,
          flat_fee = @flat_fee,
          billing_type = @billing_type,
          date_opened = @date_opened,
          date_closed = @date_closed,
          statute_of_limitations = @statute_of_limitations,
          description = @description,
          notes = @notes,
          is_active = @is_active,
          updated_at = GETUTCDATE()
        OUTPUT
          INSERTED.matter_id,
          INSERTED.firm_id,
          INSERTED.matter_number,
          INSERTED.matter_name,
          INSERTED.matter_name_arabic,
          INSERTED.matter_type,
          INSERTED.matter_status,
          INSERTED.court_name,
          INSERTED.court_name_arabic,
          INSERTED.case_number,
          INSERTED.case_year,
          INSERTED.hourly_rate,
          INSERTED.flat_fee,
          INSERTED.billing_type,
          INSERTED.date_opened,
          INSERTED.date_closed,
          INSERTED.statute_of_limitations,
          INSERTED.description,
          INSERTED.notes,
          INSERTED.is_active,
          INSERTED.updated_at
        WHERE matter_id = @matter_id AND firm_id = @firm_id`
      );

      // 2. Replace matter_clients if client_ids provided
      let linkedClients = [];
      if (client_ids !== undefined) {
        // Delete existing links
        const deleteReq = createRequest();
        deleteReq.input('matter_id', id);
        await deleteReq.query('DELETE FROM matter_clients WHERE matter_id = @matter_id');

        // Insert new links
        if (client_ids && client_ids.length > 0) {
          for (const clientId of client_ids) {
            const mcReq = createRequest();
            mcReq.input('matter_id', id);
            mcReq.input('client_id', clientId);
            mcReq.input('firm_id', req.user.firm_id);
            mcReq.input('client_role', 'client');
            mcReq.input('is_primary', primary_client_id === clientId ? 1 : 0);

            await mcReq.query(
              `INSERT INTO matter_clients (matter_id, client_id, firm_id, client_role, is_primary)
              VALUES (@matter_id, @client_id, @firm_id, @client_role, @is_primary)`
            );

            linkedClients.push(clientId);
          }
        }
      }

      return { matter: updateResult.recordset[0], clients: linkedClients };
    });

    res.json({
      success: true,
      matter: result.matter,
      clients: result.clients
    });

  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        success: false,
        error: 'Matter number already exists for this firm'
      });
    }
    console.error('Update matter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update matter'
    });
  }
});

// ==================== DELETE /api/matters/:id ====================
// Soft delete matter (firm-scoped)
// matter_clients rows preserved for soft delete (matter can be restored)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid matter ID'
      });
    }

    // Verify matter exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        matter_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Matter not found'
      });
    }

    await db.execute(
      `UPDATE matters
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE matter_id = @matter_id AND firm_id = @firm_id`,
      {
        matter_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Matter deleted successfully'
    });

  } catch (error) {
    console.error('Delete matter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete matter'
    });
  }
});

module.exports = router;
