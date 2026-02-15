/**
 * Qanuni SaaS - Judgments CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Required FK: matter_id. Optional FK: hearing_id.
 * Judgment IDs are INT IDENTITY (SaaS pattern).
 *
 * @version 1.0.0 (Week 3 Day 12)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/judgments ====================
// List all judgments for the user's firm
// Query params: ?matter_id=123, ?status=pending, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, status } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE j.firm_id = @firm_id AND j.is_deleted = 0';

    if (search) {
      where += ` AND (
        j.judgment_summary LIKE '%' + @search + '%' OR
        j.judgment_outcome LIKE '%' + @search + '%' OR
        j.notes LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND j.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (status) {
      where += ' AND j.status = @status';
      params.status = status;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM judgments j ${where}`,
      params
    );
    const total = countResult.total;

    const judgments = await db.getAll(
      `SELECT
        j.judgment_id,
        j.firm_id,
        j.matter_id,
        j.hearing_id,
        j.judgment_type,
        j.expected_date,
        j.actual_date,
        j.reminder_days,
        j.judgment_outcome,
        j.judgment_summary,
        j.amount_awarded,
        j.currency,
        j.in_favor_of,
        j.appeal_deadline,
        j.status,
        j.notes,
        j.created_at,
        j.updated_at,
        m.matter_name,
        m.matter_number,
        c.client_name
      FROM judgments j
      LEFT JOIN matters m ON j.matter_id = m.matter_id
      LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id AND mc.is_primary = 1
      LEFT JOIN clients c ON mc.client_id = c.client_id
      ${where}
      ORDER BY j.expected_date DESC, j.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: judgments,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get judgments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve judgments'
    });
  }
});

// ==================== GET /api/judgments/:id ====================
// Get single judgment with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid judgment ID'
      });
    }

    const judgment = await db.getOne(
      `SELECT
        j.judgment_id,
        j.firm_id,
        j.matter_id,
        j.hearing_id,
        j.judgment_type,
        j.expected_date,
        j.actual_date,
        j.reminder_days,
        j.judgment_outcome,
        j.judgment_summary,
        j.amount_awarded,
        j.currency,
        j.in_favor_of,
        j.appeal_deadline,
        j.status,
        j.notes,
        j.created_by,
        j.created_at,
        j.updated_at,
        m.matter_name,
        m.matter_number,
        c.client_name
      FROM judgments j
      LEFT JOIN matters m ON j.matter_id = m.matter_id
      LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id AND mc.is_primary = 1
      LEFT JOIN clients c ON mc.client_id = c.client_id
      WHERE j.judgment_id = @judgment_id
        AND j.firm_id = @firm_id
        AND j.is_deleted = 0`,
      {
        judgment_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!judgment) {
      return res.status(404).json({
        success: false,
        error: 'Judgment not found'
      });
    }

    res.json({
      success: true,
      judgment
    });

  } catch (error) {
    console.error('Get judgment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve judgment'
    });
  }
});

// ==================== POST /api/judgments ====================
// Create new judgment (validates matter_id FK, optional hearing_id FK)

router.post('/', validateBody('judgment_saas'), async (req, res) => {
  const {
    matter_id,
    hearing_id,
    judgment_type,
    expected_date,
    actual_date,
    reminder_days,
    judgment_outcome,
    judgment_summary,
    amount_awarded,
    currency,
    in_favor_of,
    appeal_deadline,
    status,
    notes
  } = req.body;

  try {
    const firm_id = req.user.firm_id;

    // Validate matter_id (REQUIRED)
    if (!matter_id) {
      return res.status(400).json({
        success: false,
        error: 'matter_id is required'
      });
    }

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

    // Validate hearing_id (if provided)
    if (hearing_id) {
      const hearing = await db.getOne(
        'SELECT hearing_id FROM hearings WHERE hearing_id = @hearing_id AND firm_id = @firm_id AND is_deleted = 0',
        { hearing_id, firm_id }
      );
      if (!hearing) {
        return res.status(404).json({
          success: false,
          error: 'Hearing not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `INSERT INTO judgments (
        firm_id,
        matter_id,
        hearing_id,
        judgment_type,
        expected_date,
        actual_date,
        reminder_days,
        judgment_outcome,
        judgment_summary,
        amount_awarded,
        currency,
        in_favor_of,
        appeal_deadline,
        status,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.judgment_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.hearing_id,
        INSERTED.judgment_type,
        INSERTED.expected_date,
        INSERTED.actual_date,
        INSERTED.reminder_days,
        INSERTED.judgment_outcome,
        INSERTED.judgment_summary,
        INSERTED.amount_awarded,
        INSERTED.currency,
        INSERTED.in_favor_of,
        INSERTED.appeal_deadline,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @hearing_id,
        @judgment_type,
        @expected_date,
        @actual_date,
        @reminder_days,
        @judgment_outcome,
        @judgment_summary,
        @amount_awarded,
        @currency,
        @in_favor_of,
        @appeal_deadline,
        @status,
        @notes,
        @created_by
      )`,
      {
        firm_id,
        matter_id,
        hearing_id: hearing_id || null,
        judgment_type: judgment_type || 'first_instance',
        expected_date: expected_date || null,
        actual_date: actual_date || null,
        reminder_days: reminder_days || 7,
        judgment_outcome: judgment_outcome || null,
        judgment_summary: judgment_summary || null,
        amount_awarded: amount_awarded ? parseFloat(amount_awarded) : null,
        currency: currency || 'USD',
        in_favor_of: in_favor_of || null,
        appeal_deadline: appeal_deadline || null,
        status: status || 'pending',
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      judgment: result.recordset[0]
    });

  } catch (error) {
    console.error('Create judgment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create judgment'
    });
  }
});

// ==================== PUT /api/judgments/:id ====================
// Update judgment (firm-scoped, all editable fields)

router.put('/:id', validateBody('judgment_saas'), async (req, res) => {
  const {
    matter_id,
    hearing_id,
    judgment_type,
    expected_date,
    actual_date,
    reminder_days,
    judgment_outcome,
    judgment_summary,
    amount_awarded,
    currency,
    in_favor_of,
    appeal_deadline,
    status,
    notes
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid judgment ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify judgment exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT judgment_id FROM judgments WHERE judgment_id = @judgment_id AND firm_id = @firm_id AND is_deleted = 0',
      { judgment_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Judgment not found'
      });
    }

    // Validate matter_id (REQUIRED)
    if (!matter_id) {
      return res.status(400).json({
        success: false,
        error: 'matter_id is required'
      });
    }

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

    // Validate hearing_id (if provided)
    if (hearing_id) {
      const hearing = await db.getOne(
        'SELECT hearing_id FROM hearings WHERE hearing_id = @hearing_id AND firm_id = @firm_id AND is_deleted = 0',
        { hearing_id, firm_id }
      );
      if (!hearing) {
        return res.status(404).json({
          success: false,
          error: 'Hearing not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE judgments
      SET
        matter_id = @matter_id,
        hearing_id = @hearing_id,
        judgment_type = @judgment_type,
        expected_date = @expected_date,
        actual_date = @actual_date,
        reminder_days = @reminder_days,
        judgment_outcome = @judgment_outcome,
        judgment_summary = @judgment_summary,
        amount_awarded = @amount_awarded,
        currency = @currency,
        in_favor_of = @in_favor_of,
        appeal_deadline = @appeal_deadline,
        status = @status,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.judgment_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.hearing_id,
        INSERTED.judgment_type,
        INSERTED.expected_date,
        INSERTED.actual_date,
        INSERTED.reminder_days,
        INSERTED.judgment_outcome,
        INSERTED.judgment_summary,
        INSERTED.amount_awarded,
        INSERTED.currency,
        INSERTED.in_favor_of,
        INSERTED.appeal_deadline,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.updated_at
      WHERE judgment_id = @judgment_id AND firm_id = @firm_id`,
      {
        judgment_id: id,
        firm_id,
        matter_id,
        hearing_id: hearing_id || null,
        judgment_type: judgment_type || 'first_instance',
        expected_date: expected_date || null,
        actual_date: actual_date || null,
        reminder_days: reminder_days || 7,
        judgment_outcome: judgment_outcome || null,
        judgment_summary: judgment_summary || null,
        amount_awarded: amount_awarded ? parseFloat(amount_awarded) : null,
        currency: currency || 'USD',
        in_favor_of: in_favor_of || null,
        appeal_deadline: appeal_deadline || null,
        status: status || 'pending',
        notes: notes || null
      }
    );

    res.json({
      success: true,
      judgment: result.recordset[0]
    });

  } catch (error) {
    console.error('Update judgment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update judgment'
    });
  }
});

// ==================== DELETE /api/judgments/:id ====================
// Soft delete judgment (firm-scoped, sets is_deleted = 1)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid judgment ID'
      });
    }

    // Verify judgment exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT judgment_id FROM judgments WHERE judgment_id = @judgment_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        judgment_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Judgment not found'
      });
    }

    await db.execute(
      `UPDATE judgments
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE judgment_id = @judgment_id AND firm_id = @firm_id`,
      {
        judgment_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Judgment deleted successfully'
    });

  } catch (error) {
    console.error('Delete judgment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete judgment'
    });
  }
});

module.exports = router;
