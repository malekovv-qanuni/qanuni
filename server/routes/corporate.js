/**
 * Qanuni SaaS - Corporate Secretary Routes
 * 29 endpoints across 7 areas: entities, shareholders, directors,
 * share transfers, filings, meetings, compliance/analytics
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag).
 * Sub-resources nested under /entities/:clientId/ for list queries.
 *
 * @version 1.0.0 (Week 5 Day 22)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// CORPORATE ENTITIES
// ============================================================================

// GET /api/corporate/entities — List all corporate entities
router.get('/entities', async (req, res) => {
  try {
    const { search, status } = req.query;
    const params = { firm_id: req.user.firm_id };

    let where = 'WHERE ce.firm_id = @firm_id AND ce.is_deleted = 0 AND c.is_deleted = 0';

    if (search) {
      where += ` AND (
        c.client_name LIKE '%' + @search + '%' OR
        c.client_name_arabic LIKE '%' + @search + '%' OR
        ce.registration_number LIKE '%' + @search + '%' OR
        ce.tax_id LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (status) {
      where += ' AND ce.status = @status';
      params.status = status;
    }

    const entities = await db.getAll(
      `SELECT
        ce.entity_id,
        ce.firm_id,
        ce.client_id,
        c.client_name,
        c.client_name_arabic,
        c.client_type,
        c.email,
        c.phone,
        ce.registration_number,
        ce.registration_date,
        ce.registered_address,
        ce.share_capital,
        ce.share_capital_currency,
        ce.total_shares,
        ce.fiscal_year_end,
        ce.tax_id,
        ce.commercial_register,
        ce.status,
        ce.notes,
        ce.created_at,
        ce.updated_at
      FROM corporate_entities ce
      INNER JOIN clients c ON ce.client_id = c.client_id
      ${where}
      ORDER BY c.client_name`,
      params
    );

    res.json({ success: true, data: entities });
  } catch (error) {
    console.error('Get corporate entities error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve corporate entities' });
  }
});

// GET /api/corporate/clients — List all legal_entity clients (with or without corporate details)
router.get('/clients', async (req, res) => {
  try {
    const clients = await db.getAll(
      `SELECT c.*,
        ce.entity_id,
        ce.registration_number,
        ce.share_capital,
        ce.share_capital_currency,
        ce.total_shares,
        ce.status as corporate_status,
        CASE WHEN ce.entity_id IS NOT NULL THEN 1 ELSE 0 END as has_corporate_details
      FROM clients c
      LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id AND ce.is_deleted = 0
      WHERE c.client_type = 'legal_entity'
        AND c.firm_id = @firm_id
        AND c.is_deleted = 0
      ORDER BY c.client_name`,
      { firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Get corporate clients error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve corporate clients' });
  }
});

// GET /api/corporate/clients-without-entity — Clients eligible for entity creation
router.get('/clients-without-entity', async (req, res) => {
  try {
    const clients = await db.getAll(
      `SELECT c.* FROM clients c
      LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id AND ce.is_deleted = 0
      WHERE c.client_type = 'legal_entity'
        AND c.firm_id = @firm_id
        AND c.is_deleted = 0
        AND ce.entity_id IS NULL
      ORDER BY c.client_name`,
      { firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Get clients without entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve clients' });
  }
});

// GET /api/corporate/company-types — Lookup entity types
router.get('/company-types', async (req, res) => {
  try {
    const types = await db.getAll(
      `SELECT code, name_en, name_ar FROM lookup_entity_types
       WHERE is_active = 1
       ORDER BY sort_order, name_en`
    );
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Get company types error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve company types' });
  }
});

// GET /api/corporate/director-roles — Lookup director roles
router.get('/director-roles', async (req, res) => {
  try {
    const roles = [
      { code: 'chairman', name_en: 'Chairman', name_ar: '\u0631\u0626\u064A\u0633 \u0645\u062C\u0644\u0633 \u0627\u0644\u0625\u062F\u0627\u0631\u0629' },
      { code: 'vice_chairman', name_en: 'Vice Chairman', name_ar: '\u0646\u0627\u0626\u0628 \u0631\u0626\u064A\u0633 \u0645\u062C\u0644\u0633 \u0627\u0644\u0625\u062F\u0627\u0631\u0629' },
      { code: 'managing_director', name_en: 'Managing Director', name_ar: '\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645' },
      { code: 'director', name_en: 'Director', name_ar: '\u0639\u0636\u0648 \u0645\u062C\u0644\u0633 \u0625\u062F\u0627\u0631\u0629' },
      { code: 'secretary', name_en: 'Secretary', name_ar: '\u0623\u0645\u064A\u0646 \u0627\u0644\u0633\u0631' },
      { code: 'treasurer', name_en: 'Treasurer', name_ar: '\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642' },
      { code: 'auditor', name_en: 'Auditor', name_ar: '\u0645\u062F\u0642\u0642 \u062D\u0633\u0627\u0628\u0627\u062A' },
      { code: 'manager', name_en: 'Manager', name_ar: '\u0645\u062F\u064A\u0631' }
    ];
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Get director roles error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve director roles' });
  }
});

// GET /api/corporate/upcoming-compliance — Compliance dashboard
router.get('/upcoming-compliance', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const params = { firm_id: req.user.firm_id, days };

    const filings = await db.getAll(
      `SELECT f.*, c.client_name, c.client_name_arabic, 'filing' as item_type
      FROM commercial_register_filings f
      INNER JOIN clients c ON f.client_id = c.client_id
      WHERE f.firm_id = @firm_id AND f.is_deleted = 0
        AND f.next_due_date IS NOT NULL
        AND f.next_due_date <= DATEADD(day, @days, GETUTCDATE())
        AND (f.status = 'pending' OR f.next_due_date >= CAST(GETUTCDATE() AS DATE))
      ORDER BY f.next_due_date ASC`,
      params
    );

    const meetings = await db.getAll(
      `SELECT m.*, c.client_name, c.client_name_arabic, 'meeting' as item_type
      FROM company_meetings m
      INNER JOIN clients c ON m.client_id = c.client_id
      WHERE m.firm_id = @firm_id AND m.is_deleted = 0
        AND m.next_meeting_date IS NOT NULL
        AND m.next_meeting_date <= DATEADD(day, @days, GETUTCDATE())
        AND m.next_meeting_date >= CAST(GETUTCDATE() AS DATE)
      ORDER BY m.next_meeting_date ASC`,
      params
    );

    res.json({ success: true, data: { filings, meetings } });
  } catch (error) {
    console.error('Get upcoming compliance error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve compliance data' });
  }
});

// GET /api/corporate/entities/:clientId — Get single entity detail
router.get('/entities/:clientId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const entity = await db.getOne(
      `SELECT
        ce.*,
        c.client_name,
        c.client_name_arabic,
        c.client_type,
        c.email,
        c.phone
      FROM corporate_entities ce
      INNER JOIN clients c ON ce.client_id = c.client_id
      WHERE ce.client_id = @client_id
        AND ce.firm_id = @firm_id
        AND ce.is_deleted = 0`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    if (!entity) {
      return res.status(404).json({ success: false, error: 'Corporate entity not found' });
    }

    res.json({ success: true, entity });
  } catch (error) {
    console.error('Get corporate entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve corporate entity' });
  }
});

// POST /api/corporate/entities — Create corporate entity
router.post('/entities', validateBody('corporate_entity_saas'), async (req, res) => {
  try {
    const { client_id } = req.body;

    // Verify client exists, belongs to firm, and is legal_entity
    const client = await db.getOne(
      `SELECT client_id, client_type FROM clients
       WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0`,
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    if (client.client_type !== 'legal_entity') {
      return res.status(400).json({ success: false, error: 'Client must be a legal entity' });
    }

    // Check for existing entity
    const existing = await db.getOne(
      'SELECT entity_id FROM corporate_entities WHERE client_id = @client_id AND is_deleted = 0',
      { client_id }
    );

    if (existing) {
      return res.status(409).json({ success: false, error: 'Corporate entity already exists for this client' });
    }

    const result = await db.execute(
      `INSERT INTO corporate_entities (
        firm_id, client_id, registration_number, registration_date,
        registered_address, share_capital, share_capital_currency,
        total_shares, fiscal_year_end, tax_id, commercial_register,
        status, notes, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @registration_number, @registration_date,
        @registered_address, @share_capital, @share_capital_currency,
        @total_shares, @fiscal_year_end, @tax_id, @commercial_register,
        @status, @notes, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        registration_number: req.body.registration_number || null,
        registration_date: req.body.registration_date || null,
        registered_address: req.body.registered_address || null,
        share_capital: req.body.share_capital || null,
        share_capital_currency: req.body.share_capital_currency || 'USD',
        total_shares: req.body.total_shares || null,
        fiscal_year_end: req.body.fiscal_year_end || null,
        tax_id: req.body.tax_id || null,
        commercial_register: req.body.commercial_register || null,
        status: req.body.status || 'active',
        notes: req.body.notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({ success: true, entity: result.recordset[0] });
  } catch (error) {
    console.error('Create corporate entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to create corporate entity' });
  }
});

// PUT /api/corporate/entities/:clientId — Update corporate entity
router.put('/entities/:clientId', validateBody('corporate_entity_saas'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const existing = await db.getOne(
      'SELECT entity_id FROM corporate_entities WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Corporate entity not found' });
    }

    const result = await db.execute(
      `UPDATE corporate_entities SET
        registration_number = @registration_number,
        registration_date = @registration_date,
        registered_address = @registered_address,
        share_capital = @share_capital,
        share_capital_currency = @share_capital_currency,
        total_shares = @total_shares,
        fiscal_year_end = @fiscal_year_end,
        tax_id = @tax_id,
        commercial_register = @commercial_register,
        status = @status,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE client_id = @client_id AND firm_id = @firm_id`,
      {
        client_id: clientId,
        firm_id: req.user.firm_id,
        registration_number: req.body.registration_number || null,
        registration_date: req.body.registration_date || null,
        registered_address: req.body.registered_address || null,
        share_capital: req.body.share_capital || null,
        share_capital_currency: req.body.share_capital_currency || 'USD',
        total_shares: req.body.total_shares || null,
        fiscal_year_end: req.body.fiscal_year_end || null,
        tax_id: req.body.tax_id || null,
        commercial_register: req.body.commercial_register || null,
        status: req.body.status || 'active',
        notes: req.body.notes || null
      }
    );

    res.json({ success: true, entity: result.recordset[0] });
  } catch (error) {
    console.error('Update corporate entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update corporate entity' });
  }
});

// DELETE /api/corporate/entities/:clientId — Soft delete corporate entity
router.delete('/entities/:clientId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const existing = await db.getOne(
      'SELECT entity_id FROM corporate_entities WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Corporate entity not found' });
    }

    await db.execute(
      'UPDATE corporate_entities SET is_deleted = 1, updated_at = GETUTCDATE() WHERE client_id = @client_id AND firm_id = @firm_id',
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Corporate entity deleted successfully' });
  } catch (error) {
    console.error('Delete corporate entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete corporate entity' });
  }
});

// ============================================================================
// SHAREHOLDERS
// ============================================================================

// GET /api/corporate/entities/:clientId/shareholders — List shareholders for entity
router.get('/entities/:clientId/shareholders', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const shareholders = await db.getAll(
      `SELECT s.*
      FROM shareholders s
      WHERE s.client_id = @client_id
        AND s.firm_id = @firm_id
        AND s.is_deleted = 0
      ORDER BY s.name`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    // Also get total shares
    const totalResult = await db.getOne(
      `SELECT ISNULL(SUM(shares_owned), 0) as total
      FROM shareholders
      WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: shareholders, total_shares_held: totalResult.total });
  } catch (error) {
    console.error('Get shareholders error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve shareholders' });
  }
});

// POST /api/corporate/shareholders — Create shareholder
router.post('/shareholders', validateBody('shareholder_saas'), async (req, res) => {
  try {
    const { client_id } = req.body;

    // Verify client exists and belongs to firm
    const client = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    const result = await db.execute(
      `INSERT INTO shareholders (
        firm_id, client_id, name, name_arabic, id_number, nationality,
        shares_owned, share_class, date_acquired, notes, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @name, @name_arabic, @id_number, @nationality,
        @shares_owned, @share_class, @date_acquired, @notes, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        name: req.body.name,
        name_arabic: req.body.name_arabic || null,
        id_number: req.body.id_number || null,
        nationality: req.body.nationality || null,
        shares_owned: req.body.shares_owned || 0,
        share_class: req.body.share_class || 'Ordinary',
        date_acquired: req.body.date_acquired || null,
        notes: req.body.notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({ success: true, shareholder: result.recordset[0] });
  } catch (error) {
    console.error('Create shareholder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create shareholder' });
  }
});

// PUT /api/corporate/shareholders/:id — Update shareholder
router.put('/shareholders/:id', validateBody('shareholder_saas'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid shareholder ID' });
    }

    const existing = await db.getOne(
      'SELECT shareholder_id FROM shareholders WHERE shareholder_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Shareholder not found' });
    }

    const result = await db.execute(
      `UPDATE shareholders SET
        name = @name,
        name_arabic = @name_arabic,
        id_number = @id_number,
        nationality = @nationality,
        shares_owned = @shares_owned,
        share_class = @share_class,
        date_acquired = @date_acquired,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE shareholder_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: req.user.firm_id,
        name: req.body.name,
        name_arabic: req.body.name_arabic || null,
        id_number: req.body.id_number || null,
        nationality: req.body.nationality || null,
        shares_owned: req.body.shares_owned || 0,
        share_class: req.body.share_class || 'Ordinary',
        date_acquired: req.body.date_acquired || null,
        notes: req.body.notes || null
      }
    );

    res.json({ success: true, shareholder: result.recordset[0] });
  } catch (error) {
    console.error('Update shareholder error:', error);
    res.status(500).json({ success: false, error: 'Failed to update shareholder' });
  }
});

// DELETE /api/corporate/shareholders/:id — Soft delete shareholder
router.delete('/shareholders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid shareholder ID' });
    }

    const existing = await db.getOne(
      'SELECT shareholder_id FROM shareholders WHERE shareholder_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Shareholder not found' });
    }

    await db.execute(
      'UPDATE shareholders SET is_deleted = 1, updated_at = GETUTCDATE() WHERE shareholder_id = @id AND firm_id = @firm_id',
      { id, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Shareholder deleted successfully' });
  } catch (error) {
    console.error('Delete shareholder error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete shareholder' });
  }
});

// ============================================================================
// DIRECTORS
// ============================================================================

// GET /api/corporate/entities/:clientId/directors — List directors for entity
router.get('/entities/:clientId/directors', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const directors = await db.getAll(
      `SELECT d.*
      FROM directors d
      WHERE d.client_id = @client_id
        AND d.firm_id = @firm_id
        AND d.is_deleted = 0
      ORDER BY d.date_appointed DESC, d.name`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: directors });
  } catch (error) {
    console.error('Get directors error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve directors' });
  }
});

// POST /api/corporate/directors — Create director
router.post('/directors', validateBody('director_saas'), async (req, res) => {
  try {
    const { client_id } = req.body;

    const client = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    const result = await db.execute(
      `INSERT INTO directors (
        firm_id, client_id, name, name_arabic, id_number, nationality,
        position, date_appointed, date_resigned, is_signatory, notes, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @name, @name_arabic, @id_number, @nationality,
        @position, @date_appointed, @date_resigned, @is_signatory, @notes, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        name: req.body.name,
        name_arabic: req.body.name_arabic || null,
        id_number: req.body.id_number || null,
        nationality: req.body.nationality || null,
        position: req.body.position || 'Director',
        date_appointed: req.body.date_appointed || null,
        date_resigned: req.body.date_resigned || null,
        is_signatory: req.body.is_signatory ? 1 : 0,
        notes: req.body.notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({ success: true, director: result.recordset[0] });
  } catch (error) {
    console.error('Create director error:', error);
    res.status(500).json({ success: false, error: 'Failed to create director' });
  }
});

// PUT /api/corporate/directors/:id — Update director
router.put('/directors/:id', validateBody('director_saas'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid director ID' });
    }

    const existing = await db.getOne(
      'SELECT director_id FROM directors WHERE director_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Director not found' });
    }

    const result = await db.execute(
      `UPDATE directors SET
        name = @name,
        name_arabic = @name_arabic,
        id_number = @id_number,
        nationality = @nationality,
        position = @position,
        date_appointed = @date_appointed,
        date_resigned = @date_resigned,
        is_signatory = @is_signatory,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE director_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: req.user.firm_id,
        name: req.body.name,
        name_arabic: req.body.name_arabic || null,
        id_number: req.body.id_number || null,
        nationality: req.body.nationality || null,
        position: req.body.position || 'Director',
        date_appointed: req.body.date_appointed || null,
        date_resigned: req.body.date_resigned || null,
        is_signatory: req.body.is_signatory ? 1 : 0,
        notes: req.body.notes || null
      }
    );

    res.json({ success: true, director: result.recordset[0] });
  } catch (error) {
    console.error('Update director error:', error);
    res.status(500).json({ success: false, error: 'Failed to update director' });
  }
});

// DELETE /api/corporate/directors/:id — Soft delete director
router.delete('/directors/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid director ID' });
    }

    const existing = await db.getOne(
      'SELECT director_id FROM directors WHERE director_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Director not found' });
    }

    await db.execute(
      'UPDATE directors SET is_deleted = 1, updated_at = GETUTCDATE() WHERE director_id = @id AND firm_id = @firm_id',
      { id, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Director deleted successfully' });
  } catch (error) {
    console.error('Delete director error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete director' });
  }
});

// ============================================================================
// SHARE TRANSFERS
// ============================================================================

// GET /api/corporate/entities/:clientId/share-transfers — List share transfers
router.get('/entities/:clientId/share-transfers', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const transfers = await db.getAll(
      `SELECT st.*,
        sf.name as from_name,
        st2.name as to_name
      FROM share_transfers st
      LEFT JOIN shareholders sf ON st.from_shareholder_id = sf.shareholder_id
      LEFT JOIN shareholders st2 ON st.to_shareholder_id = st2.shareholder_id
      WHERE st.client_id = @client_id
        AND st.firm_id = @firm_id
        AND st.is_deleted = 0
      ORDER BY st.transfer_date DESC, st.created_at DESC`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Get share transfers error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve share transfers' });
  }
});

// POST /api/corporate/share-transfers — Create share transfer
router.post('/share-transfers', validateBody('share_transfer_saas'), async (req, res) => {
  try {
    const { client_id, transfer_type, from_shareholder_id, to_shareholder_id } = req.body;
    const shares = parseInt(req.body.shares_transferred) || 0;

    // Verify client belongs to firm
    const client = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    // Validate shareholder FKs if provided
    if (from_shareholder_id) {
      const fromSh = await db.getOne(
        'SELECT shareholder_id FROM shareholders WHERE shareholder_id = @id AND firm_id = @firm_id AND is_deleted = 0',
        { id: from_shareholder_id, firm_id: req.user.firm_id }
      );
      if (!fromSh) {
        return res.status(404).json({ success: false, error: 'From shareholder not found' });
      }
    }
    if (to_shareholder_id) {
      const toSh = await db.getOne(
        'SELECT shareholder_id FROM shareholders WHERE shareholder_id = @id AND firm_id = @firm_id AND is_deleted = 0',
        { id: to_shareholder_id, firm_id: req.user.firm_id }
      );
      if (!toSh) {
        return res.status(404).json({ success: false, error: 'To shareholder not found' });
      }
    }

    // Insert transfer record
    const result = await db.execute(
      `INSERT INTO share_transfers (
        firm_id, client_id, transfer_type, transfer_date,
        from_shareholder_id, to_shareholder_id,
        from_shareholder_name, to_shareholder_name,
        shares_transferred, price_per_share, total_consideration,
        share_class, board_resolution, notes, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @transfer_type, @transfer_date,
        @from_shareholder_id, @to_shareholder_id,
        @from_shareholder_name, @to_shareholder_name,
        @shares_transferred, @price_per_share, @total_consideration,
        @share_class, @board_resolution, @notes, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        transfer_type,
        transfer_date: req.body.transfer_date,
        from_shareholder_id: from_shareholder_id || null,
        to_shareholder_id: to_shareholder_id || null,
        from_shareholder_name: req.body.from_shareholder_name || null,
        to_shareholder_name: req.body.to_shareholder_name || null,
        shares_transferred: shares,
        price_per_share: req.body.price_per_share || null,
        total_consideration: req.body.total_consideration || null,
        share_class: req.body.share_class || 'Ordinary',
        board_resolution: req.body.board_resolution || null,
        notes: req.body.notes || null,
        created_by: req.user.user_id
      }
    );

    // Auto-update shareholder balances
    if (transfer_type === 'transfer') {
      if (from_shareholder_id) {
        await db.execute(
          'UPDATE shareholders SET shares_owned = shares_owned - @shares, updated_at = GETUTCDATE() WHERE shareholder_id = @id',
          { shares, id: from_shareholder_id }
        );
      }
      if (to_shareholder_id) {
        await db.execute(
          'UPDATE shareholders SET shares_owned = shares_owned + @shares, updated_at = GETUTCDATE() WHERE shareholder_id = @id',
          { shares, id: to_shareholder_id }
        );
      }
    } else if (transfer_type === 'issuance') {
      if (to_shareholder_id) {
        await db.execute(
          'UPDATE shareholders SET shares_owned = shares_owned + @shares, updated_at = GETUTCDATE() WHERE shareholder_id = @id',
          { shares, id: to_shareholder_id }
        );
      }
    } else if (transfer_type === 'buyback') {
      if (from_shareholder_id) {
        await db.execute(
          'UPDATE shareholders SET shares_owned = shares_owned - @shares, updated_at = GETUTCDATE() WHERE shareholder_id = @id',
          { shares, id: from_shareholder_id }
        );
      }
    }

    res.status(201).json({ success: true, transfer: result.recordset[0] });
  } catch (error) {
    console.error('Create share transfer error:', error);
    res.status(500).json({ success: false, error: 'Failed to create share transfer' });
  }
});

// PUT /api/corporate/share-transfers/:id — Update share transfer
router.put('/share-transfers/:id', validateBody('share_transfer_saas'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid transfer ID' });
    }

    const existing = await db.getOne(
      'SELECT * FROM share_transfers WHERE transfer_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Share transfer not found' });
    }

    const oldShares = parseInt(existing.shares_transferred) || 0;
    const newShares = parseInt(req.body.shares_transferred) || 0;

    // Reverse original balance effect
    if (existing.transfer_type === 'transfer') {
      if (existing.from_shareholder_id) {
        await db.execute('UPDATE shareholders SET shares_owned = shares_owned + @shares WHERE shareholder_id = @id', { shares: oldShares, id: existing.from_shareholder_id });
      }
      if (existing.to_shareholder_id) {
        await db.execute('UPDATE shareholders SET shares_owned = shares_owned - @shares WHERE shareholder_id = @id', { shares: oldShares, id: existing.to_shareholder_id });
      }
    } else if (existing.transfer_type === 'issuance') {
      if (existing.to_shareholder_id) {
        await db.execute('UPDATE shareholders SET shares_owned = shares_owned - @shares WHERE shareholder_id = @id', { shares: oldShares, id: existing.to_shareholder_id });
      }
    } else if (existing.transfer_type === 'buyback') {
      if (existing.from_shareholder_id) {
        await db.execute('UPDATE shareholders SET shares_owned = shares_owned + @shares WHERE shareholder_id = @id', { shares: oldShares, id: existing.from_shareholder_id });
      }
    }

    // Apply new balance effect
    const newType = req.body.transfer_type;
    const newFrom = req.body.from_shareholder_id || null;
    const newTo = req.body.to_shareholder_id || null;

    if (newType === 'transfer') {
      if (newFrom) await db.execute('UPDATE shareholders SET shares_owned = shares_owned - @shares WHERE shareholder_id = @id', { shares: newShares, id: newFrom });
      if (newTo) await db.execute('UPDATE shareholders SET shares_owned = shares_owned + @shares WHERE shareholder_id = @id', { shares: newShares, id: newTo });
    } else if (newType === 'issuance') {
      if (newTo) await db.execute('UPDATE shareholders SET shares_owned = shares_owned + @shares WHERE shareholder_id = @id', { shares: newShares, id: newTo });
    } else if (newType === 'buyback') {
      if (newFrom) await db.execute('UPDATE shareholders SET shares_owned = shares_owned - @shares WHERE shareholder_id = @id', { shares: newShares, id: newFrom });
    }

    // Update transfer record
    const result = await db.execute(
      `UPDATE share_transfers SET
        transfer_type = @transfer_type,
        transfer_date = @transfer_date,
        from_shareholder_id = @from_shareholder_id,
        to_shareholder_id = @to_shareholder_id,
        from_shareholder_name = @from_shareholder_name,
        to_shareholder_name = @to_shareholder_name,
        shares_transferred = @shares_transferred,
        price_per_share = @price_per_share,
        total_consideration = @total_consideration,
        share_class = @share_class,
        board_resolution = @board_resolution,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE transfer_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: req.user.firm_id,
        transfer_type: newType,
        transfer_date: req.body.transfer_date,
        from_shareholder_id: newFrom,
        to_shareholder_id: newTo,
        from_shareholder_name: req.body.from_shareholder_name || null,
        to_shareholder_name: req.body.to_shareholder_name || null,
        shares_transferred: newShares,
        price_per_share: req.body.price_per_share || null,
        total_consideration: req.body.total_consideration || null,
        share_class: req.body.share_class || 'Ordinary',
        board_resolution: req.body.board_resolution || null,
        notes: req.body.notes || null
      }
    );

    res.json({ success: true, transfer: result.recordset[0] });
  } catch (error) {
    console.error('Update share transfer error:', error);
    res.status(500).json({ success: false, error: 'Failed to update share transfer' });
  }
});

// DELETE /api/corporate/share-transfers/:id — Soft delete share transfer
router.delete('/share-transfers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid transfer ID' });
    }

    const existing = await db.getOne(
      'SELECT transfer_id FROM share_transfers WHERE transfer_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Share transfer not found' });
    }

    await db.execute(
      'UPDATE share_transfers SET is_deleted = 1, updated_at = GETUTCDATE() WHERE transfer_id = @id AND firm_id = @firm_id',
      { id, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Share transfer deleted successfully' });
  } catch (error) {
    console.error('Delete share transfer error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete share transfer' });
  }
});

// ============================================================================
// FILINGS (Commercial Register Filings / Corporate Documents)
// ============================================================================

// GET /api/corporate/entities/:clientId/documents — List filings/documents
router.get('/entities/:clientId/documents', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const filings = await db.getAll(
      `SELECT f.*
      FROM commercial_register_filings f
      WHERE f.client_id = @client_id
        AND f.firm_id = @firm_id
        AND f.is_deleted = 0
      ORDER BY f.filing_date DESC`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: filings });
  } catch (error) {
    console.error('Get filings error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve filings' });
  }
});

// POST /api/corporate/documents — Create filing/document
router.post('/documents', validateBody('filing_saas'), async (req, res) => {
  try {
    const { client_id } = req.body;

    const client = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    const result = await db.execute(
      `INSERT INTO commercial_register_filings (
        firm_id, client_id, filing_type, filing_description, filing_date,
        filing_reference, next_due_date, reminder_days, notes, status, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @filing_type, @filing_description, @filing_date,
        @filing_reference, @next_due_date, @reminder_days, @notes, @status, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        filing_type: req.body.filing_type,
        filing_description: req.body.filing_description || null,
        filing_date: req.body.filing_date,
        filing_reference: req.body.filing_reference || null,
        next_due_date: req.body.next_due_date || null,
        reminder_days: req.body.reminder_days != null ? req.body.reminder_days : 30,
        notes: req.body.notes || null,
        status: req.body.status || 'completed',
        created_by: req.user.user_id
      }
    );

    res.status(201).json({ success: true, filing: result.recordset[0] });
  } catch (error) {
    console.error('Create filing error:', error);
    res.status(500).json({ success: false, error: 'Failed to create filing' });
  }
});

// PUT /api/corporate/documents/:id — Update filing/document
router.put('/documents/:id', validateBody('filing_saas'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid filing ID' });
    }

    const existing = await db.getOne(
      'SELECT filing_id FROM commercial_register_filings WHERE filing_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Filing not found' });
    }

    const result = await db.execute(
      `UPDATE commercial_register_filings SET
        filing_type = @filing_type,
        filing_description = @filing_description,
        filing_date = @filing_date,
        filing_reference = @filing_reference,
        next_due_date = @next_due_date,
        reminder_days = @reminder_days,
        notes = @notes,
        status = @status,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE filing_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: req.user.firm_id,
        filing_type: req.body.filing_type,
        filing_description: req.body.filing_description || null,
        filing_date: req.body.filing_date,
        filing_reference: req.body.filing_reference || null,
        next_due_date: req.body.next_due_date || null,
        reminder_days: req.body.reminder_days != null ? req.body.reminder_days : 30,
        notes: req.body.notes || null,
        status: req.body.status || 'completed'
      }
    );

    res.json({ success: true, filing: result.recordset[0] });
  } catch (error) {
    console.error('Update filing error:', error);
    res.status(500).json({ success: false, error: 'Failed to update filing' });
  }
});

// DELETE /api/corporate/documents/:id — Soft delete filing/document
router.delete('/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid filing ID' });
    }

    const existing = await db.getOne(
      'SELECT filing_id FROM commercial_register_filings WHERE filing_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Filing not found' });
    }

    await db.execute(
      'UPDATE commercial_register_filings SET is_deleted = 1, updated_at = GETUTCDATE() WHERE filing_id = @id AND firm_id = @firm_id',
      { id, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Filing deleted successfully' });
  } catch (error) {
    console.error('Delete filing error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete filing' });
  }
});

// ============================================================================
// MEETINGS (Board Meetings)
// ============================================================================

// GET /api/corporate/entities/:clientId/board-meetings — List meetings
router.get('/entities/:clientId/board-meetings', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const meetings = await db.getAll(
      `SELECT m.*
      FROM company_meetings m
      WHERE m.client_id = @client_id
        AND m.firm_id = @firm_id
        AND m.is_deleted = 0
      ORDER BY m.meeting_date DESC`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve meetings' });
  }
});

// POST /api/corporate/board-meetings — Create meeting
router.post('/board-meetings', validateBody('meeting_saas'), async (req, res) => {
  try {
    const { client_id } = req.body;

    const client = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      { client_id, firm_id: req.user.firm_id }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or does not belong to your firm' });
    }

    const result = await db.execute(
      `INSERT INTO company_meetings (
        firm_id, client_id, meeting_type, meeting_description, meeting_date,
        meeting_notes, attendees, next_meeting_date, next_meeting_agenda,
        reminder_days, status, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @firm_id, @client_id, @meeting_type, @meeting_description, @meeting_date,
        @meeting_notes, @attendees, @next_meeting_date, @next_meeting_agenda,
        @reminder_days, @status, @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_id,
        meeting_type: req.body.meeting_type,
        meeting_description: req.body.meeting_description || null,
        meeting_date: req.body.meeting_date,
        meeting_notes: req.body.meeting_notes || null,
        attendees: req.body.attendees || null,
        next_meeting_date: req.body.next_meeting_date || null,
        next_meeting_agenda: req.body.next_meeting_agenda || null,
        reminder_days: req.body.reminder_days != null ? req.body.reminder_days : 14,
        status: req.body.status || 'held',
        created_by: req.user.user_id
      }
    );

    res.status(201).json({ success: true, meeting: result.recordset[0] });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to create meeting' });
  }
});

// PUT /api/corporate/board-meetings/:id — Update meeting
router.put('/board-meetings/:id', validateBody('meeting_saas'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid meeting ID' });
    }

    const existing = await db.getOne(
      'SELECT meeting_id FROM company_meetings WHERE meeting_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    const result = await db.execute(
      `UPDATE company_meetings SET
        meeting_type = @meeting_type,
        meeting_description = @meeting_description,
        meeting_date = @meeting_date,
        meeting_notes = @meeting_notes,
        attendees = @attendees,
        next_meeting_date = @next_meeting_date,
        next_meeting_agenda = @next_meeting_agenda,
        reminder_days = @reminder_days,
        status = @status,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE meeting_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: req.user.firm_id,
        meeting_type: req.body.meeting_type,
        meeting_description: req.body.meeting_description || null,
        meeting_date: req.body.meeting_date,
        meeting_notes: req.body.meeting_notes || null,
        attendees: req.body.attendees || null,
        next_meeting_date: req.body.next_meeting_date || null,
        next_meeting_agenda: req.body.next_meeting_agenda || null,
        reminder_days: req.body.reminder_days != null ? req.body.reminder_days : 14,
        status: req.body.status || 'held'
      }
    );

    res.json({ success: true, meeting: result.recordset[0] });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to update meeting' });
  }
});

// DELETE /api/corporate/board-meetings/:id — Soft delete meeting
router.delete('/board-meetings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid meeting ID' });
    }

    const existing = await db.getOne(
      'SELECT meeting_id FROM company_meetings WHERE meeting_id = @id AND firm_id = @firm_id AND is_deleted = 0',
      { id, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    await db.execute(
      'UPDATE company_meetings SET is_deleted = 1, updated_at = GETUTCDATE() WHERE meeting_id = @id AND firm_id = @firm_id',
      { id, firm_id: req.user.firm_id }
    );

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete meeting' });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

// GET /api/corporate/entities/:clientId/cap-table — Capitalization table
router.get('/entities/:clientId/cap-table', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    // Get entity info
    const entity = await db.getOne(
      `SELECT ce.total_shares, ce.share_capital, ce.share_capital_currency
      FROM corporate_entities ce
      WHERE ce.client_id = @client_id AND ce.firm_id = @firm_id AND ce.is_deleted = 0`,
      { client_id: clientId, firm_id: req.user.firm_id }
    );

    if (!entity) {
      return res.status(404).json({ success: false, error: 'Corporate entity not found' });
    }

    // Get shareholders with ownership percentages
    const shareholders = await db.getAll(
      `SELECT
        s.shareholder_id,
        s.name,
        s.name_arabic,
        s.shares_owned,
        s.share_class,
        CASE
          WHEN @total_shares > 0 THEN CAST(s.shares_owned AS FLOAT) / @total_shares * 100
          ELSE 0
        END as ownership_percentage
      FROM shareholders s
      WHERE s.client_id = @client_id
        AND s.firm_id = @firm_id
        AND s.is_deleted = 0
      ORDER BY s.shares_owned DESC`,
      {
        client_id: clientId,
        firm_id: req.user.firm_id,
        total_shares: entity.total_shares || 0
      }
    );

    const totalHeld = shareholders.reduce((sum, s) => sum + (s.shares_owned || 0), 0);

    res.json({
      success: true,
      data: {
        total_authorized_shares: entity.total_shares,
        total_held_shares: totalHeld,
        share_capital: entity.share_capital,
        share_capital_currency: entity.share_capital_currency,
        shareholders
      }
    });
  } catch (error) {
    console.error('Get cap table error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve cap table' });
  }
});

// GET /api/corporate/entities/:clientId/timeline — Entity events timeline
router.get('/entities/:clientId/timeline', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const params = { client_id: clientId, firm_id: req.user.firm_id };

    // Aggregate events from multiple tables
    const events = await db.getAll(
      `SELECT * FROM (
        SELECT 'share_transfer' as event_type, transfer_date as event_date,
          transfer_type as event_subtype,
          CONCAT('Share ', transfer_type, ': ', shares_transferred, ' shares') as description,
          created_at
        FROM share_transfers
        WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0

        UNION ALL

        SELECT 'filing' as event_type, filing_date as event_date,
          filing_type as event_subtype,
          filing_description as description,
          created_at
        FROM commercial_register_filings
        WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0

        UNION ALL

        SELECT 'meeting' as event_type, meeting_date as event_date,
          meeting_type as event_subtype,
          meeting_description as description,
          created_at
        FROM company_meetings
        WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0

        UNION ALL

        SELECT 'director_appointed' as event_type, date_appointed as event_date,
          position as event_subtype,
          CONCAT(name, ' - ', position) as description,
          created_at
        FROM directors
        WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0 AND date_appointed IS NOT NULL
      ) events
      ORDER BY event_date DESC, created_at DESC`,
      params
    );

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Get entity timeline error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve timeline' });
  }
});

module.exports = router;
