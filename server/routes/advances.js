/**
 * Qanuni SaaS - Advances CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Optional FKs: client_id, matter_id, lawyer_id (depends on advance_type).
 * Advance IDs are INT IDENTITY (SaaS pattern).
 *
 * Business rules:
 *   - lawyer_advance: requires lawyer_id, no client_id/matter_id
 *   - client_retainer/client_expense_advance: requires client_id, optional matter_id
 *   - fee_payment_*: requires client_id and matter_id
 *   - balance_remaining auto-set to amount for non-fee types
 *
 * @version 1.0.0 (Week 3 Day 16)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/advances ====================
// List all advances for the user's firm
// Query params: ?client_id=123, ?matter_id=456, ?lawyer_id=789, ?status=active, ?advance_type=client_retainer, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, client_id, matter_id, lawyer_id, status, advance_type } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE a.firm_id = @firm_id AND a.is_deleted = 0';

    if (search) {
      where += ` AND (
        a.reference_number LIKE '%' + @search + '%' OR
        a.fee_description LIKE '%' + @search + '%' OR
        a.notes LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (client_id) {
      const cid = parseInt(client_id);
      if (!isNaN(cid)) {
        where += ' AND a.client_id = @client_id';
        params.client_id = cid;
      }
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND a.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (lawyer_id) {
      const lid = parseInt(lawyer_id);
      if (!isNaN(lid)) {
        where += ' AND a.lawyer_id = @lawyer_id';
        params.lawyer_id = lid;
      }
    }

    if (status) {
      where += ' AND a.status = @status';
      params.status = status;
    }

    if (advance_type) {
      where += ' AND a.advance_type = @advance_type';
      params.advance_type = advance_type;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM advances a ${where}`,
      params
    );
    const total = countResult.total;

    const advances = await db.getAll(
      `SELECT
        a.advance_id,
        a.firm_id,
        a.client_id,
        a.matter_id,
        a.lawyer_id,
        a.advance_type,
        a.amount,
        a.currency,
        a.date_received,
        a.payment_method,
        a.reference_number,
        a.balance_remaining,
        a.minimum_balance_alert,
        a.fee_description,
        a.notes,
        a.status,
        a.created_at,
        a.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM advances a
      LEFT JOIN clients c ON a.client_id = c.client_id
      LEFT JOIN matters m ON a.matter_id = m.matter_id
      LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
      ${where}
      ORDER BY a.date_received DESC, a.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: advances,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get advances error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve advances'
    });
  }
});

// ==================== GET /api/advances/:id ====================
// Get single advance with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid advance ID'
      });
    }

    const advance = await db.getOne(
      `SELECT
        a.advance_id,
        a.firm_id,
        a.client_id,
        a.matter_id,
        a.lawyer_id,
        a.advance_type,
        a.amount,
        a.currency,
        a.date_received,
        a.payment_method,
        a.reference_number,
        a.balance_remaining,
        a.minimum_balance_alert,
        a.fee_description,
        a.notes,
        a.status,
        a.created_by,
        a.created_at,
        a.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM advances a
      LEFT JOIN clients c ON a.client_id = c.client_id
      LEFT JOIN matters m ON a.matter_id = m.matter_id
      LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
      WHERE a.advance_id = @advance_id
        AND a.firm_id = @firm_id
        AND a.is_deleted = 0`,
      {
        advance_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!advance) {
      return res.status(404).json({
        success: false,
        error: 'Advance not found'
      });
    }

    res.json({
      success: true,
      advance
    });

  } catch (error) {
    console.error('Get advance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve advance'
    });
  }
});

// ==================== POST /api/advances ====================
// Create new advance (FK validation for client_id, matter_id, lawyer_id)

router.post('/', validateBody('advance_saas'), async (req, res) => {
  const {
    advance_type,
    client_id,
    matter_id,
    lawyer_id,
    amount,
    currency,
    date_received,
    payment_method,
    reference_number,
    balance_remaining,
    minimum_balance_alert,
    fee_description,
    notes,
    status
  } = req.body;

  try {
    const firm_id = req.user.firm_id;
    const type = advance_type || 'client_retainer';

    // Business rule validation
    if (type === 'lawyer_advance') {
      if (!lawyer_id) {
        return res.status(400).json({
          success: false,
          error: 'Lawyer ID is required for lawyer_advance type'
        });
      }
      if (client_id || matter_id) {
        return res.status(400).json({
          success: false,
          error: 'Client ID and Matter ID must not be provided for lawyer_advance type'
        });
      }
    } else {
      if (!client_id) {
        return res.status(400).json({
          success: false,
          error: 'Client ID is required for ' + type + ' type'
        });
      }
      if (lawyer_id) {
        return res.status(400).json({
          success: false,
          error: 'Lawyer ID must not be provided for ' + type + ' type'
        });
      }
    }

    // Validate client_id FK (if provided)
    if (client_id) {
      const client = await db.getOne(
        'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id, firm_id }
      );
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found or does not belong to your firm'
        });
      }
    }

    // Validate matter_id FK (if provided)
    if (matter_id) {
      const matter = await db.getOne(
        'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
        { matter_id, firm_id }
      );
      if (!matter) {
        return res.status(404).json({
          success: false,
          error: 'Matter not found or does not belong to your firm'
        });
      }
    }

    // Validate lawyer_id FK (if provided)
    if (lawyer_id) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Lawyer not found or does not belong to your firm'
        });
      }
    }

    // Auto-set balance_remaining for non-fee types
    const isFeePayment = type.startsWith('fee_payment');
    const computedBalance = isFeePayment ? null : (balance_remaining != null ? parseFloat(balance_remaining) : parseFloat(amount));

    const result = await db.execute(
      `INSERT INTO advances (
        firm_id,
        client_id,
        matter_id,
        lawyer_id,
        advance_type,
        amount,
        currency,
        date_received,
        payment_method,
        reference_number,
        balance_remaining,
        minimum_balance_alert,
        fee_description,
        notes,
        status,
        created_by
      )
      OUTPUT
        INSERTED.advance_id,
        INSERTED.firm_id,
        INSERTED.client_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.advance_type,
        INSERTED.amount,
        INSERTED.currency,
        INSERTED.date_received,
        INSERTED.payment_method,
        INSERTED.reference_number,
        INSERTED.balance_remaining,
        INSERTED.minimum_balance_alert,
        INSERTED.fee_description,
        INSERTED.notes,
        INSERTED.status,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @client_id,
        @matter_id,
        @lawyer_id,
        @advance_type,
        @amount,
        @currency,
        @date_received,
        @payment_method,
        @reference_number,
        @balance_remaining,
        @minimum_balance_alert,
        @fee_description,
        @notes,
        @status,
        @created_by
      )`,
      {
        firm_id,
        client_id: client_id || null,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        advance_type: type,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        date_received,
        payment_method: payment_method || 'bank_transfer',
        reference_number: reference_number || null,
        balance_remaining: computedBalance,
        minimum_balance_alert: minimum_balance_alert != null ? parseFloat(minimum_balance_alert) : null,
        fee_description: fee_description || null,
        notes: notes || null,
        status: status || 'active',
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      advance: result.recordset[0]
    });

  } catch (error) {
    console.error('Create advance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create advance'
    });
  }
});

// ==================== PUT /api/advances/:id ====================
// Update advance (firm-scoped, all editable fields)

router.put('/:id', validateBody('advance_saas'), async (req, res) => {
  const {
    advance_type,
    client_id,
    matter_id,
    lawyer_id,
    amount,
    currency,
    date_received,
    payment_method,
    reference_number,
    balance_remaining,
    minimum_balance_alert,
    fee_description,
    notes,
    status
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid advance ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify advance exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT advance_id FROM advances WHERE advance_id = @advance_id AND firm_id = @firm_id AND is_deleted = 0',
      { advance_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Advance not found'
      });
    }

    const type = advance_type || 'client_retainer';

    // Validate client_id FK (if provided)
    if (client_id) {
      const client = await db.getOne(
        'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id, firm_id }
      );
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found or does not belong to your firm'
        });
      }
    }

    // Validate matter_id FK (if provided)
    if (matter_id) {
      const matter = await db.getOne(
        'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
        { matter_id, firm_id }
      );
      if (!matter) {
        return res.status(404).json({
          success: false,
          error: 'Matter not found or does not belong to your firm'
        });
      }
    }

    // Validate lawyer_id FK (if provided)
    if (lawyer_id) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Lawyer not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE advances
      SET
        advance_type = @advance_type,
        client_id = @client_id,
        matter_id = @matter_id,
        lawyer_id = @lawyer_id,
        amount = @amount,
        currency = @currency,
        date_received = @date_received,
        payment_method = @payment_method,
        reference_number = @reference_number,
        balance_remaining = @balance_remaining,
        minimum_balance_alert = @minimum_balance_alert,
        fee_description = @fee_description,
        notes = @notes,
        status = @status,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.advance_id,
        INSERTED.firm_id,
        INSERTED.client_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.advance_type,
        INSERTED.amount,
        INSERTED.currency,
        INSERTED.date_received,
        INSERTED.payment_method,
        INSERTED.reference_number,
        INSERTED.balance_remaining,
        INSERTED.minimum_balance_alert,
        INSERTED.fee_description,
        INSERTED.notes,
        INSERTED.status,
        INSERTED.updated_at
      WHERE advance_id = @advance_id AND firm_id = @firm_id`,
      {
        advance_id: id,
        firm_id,
        advance_type: type,
        client_id: client_id || null,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        date_received,
        payment_method: payment_method || 'bank_transfer',
        reference_number: reference_number || null,
        balance_remaining: balance_remaining != null ? parseFloat(balance_remaining) : null,
        minimum_balance_alert: minimum_balance_alert != null ? parseFloat(minimum_balance_alert) : null,
        fee_description: fee_description || null,
        notes: notes || null,
        status: status || 'active'
      }
    );

    res.json({
      success: true,
      advance: result.recordset[0]
    });

  } catch (error) {
    console.error('Update advance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update advance'
    });
  }
});

// ==================== DELETE /api/advances/:id ====================
// Soft delete advance (firm-scoped, sets is_deleted = 1)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid advance ID'
      });
    }

    // Verify advance exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT advance_id FROM advances WHERE advance_id = @advance_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        advance_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Advance not found'
      });
    }

    await db.execute(
      `UPDATE advances
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE advance_id = @advance_id AND firm_id = @firm_id`,
      {
        advance_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Advance deleted successfully'
    });

  } catch (error) {
    console.error('Delete advance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete advance'
    });
  }
});

module.exports = router;
