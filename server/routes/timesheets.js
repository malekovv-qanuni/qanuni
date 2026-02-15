/**
 * Qanuni SaaS - Timesheets CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Optional FKs: matter_id, lawyer_id.
 * Timesheet IDs are INT IDENTITY (SaaS pattern).
 *
 * @version 1.0.0 (Week 3 Day 14)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/timesheets ====================
// List all timesheets for the user's firm
// Query params: ?matter_id=123, ?lawyer_id=456, ?status=draft, ?billable=true, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, lawyer_id, status, billable } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE t.firm_id = @firm_id AND t.is_deleted = 0';

    if (search) {
      where += ` AND (
        t.narrative LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND t.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (lawyer_id) {
      const lid = parseInt(lawyer_id);
      if (!isNaN(lid)) {
        where += ' AND t.lawyer_id = @lawyer_id';
        params.lawyer_id = lid;
      }
    }

    if (status) {
      where += ' AND t.status = @status';
      params.status = status;
    }

    if (billable !== undefined) {
      where += ' AND t.billable = @billable';
      params.billable = billable === 'true' ? 1 : 0;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM timesheets t ${where}`,
      params
    );
    const total = countResult.total;

    const timesheets = await db.getAll(
      `SELECT
        t.timesheet_id,
        t.firm_id,
        t.matter_id,
        t.lawyer_id,
        t.entry_date,
        t.minutes,
        t.narrative,
        t.billable,
        t.rate_per_hour,
        t.rate_currency,
        t.status,
        t.created_at,
        t.updated_at,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM timesheets t
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
      ${where}
      ORDER BY t.entry_date DESC, t.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: timesheets,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve timesheets'
    });
  }
});

// ==================== GET /api/timesheets/:id ====================
// Get single timesheet with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timesheet ID'
      });
    }

    const timesheet = await db.getOne(
      `SELECT
        t.timesheet_id,
        t.firm_id,
        t.matter_id,
        t.lawyer_id,
        t.entry_date,
        t.minutes,
        t.narrative,
        t.billable,
        t.rate_per_hour,
        t.rate_currency,
        t.status,
        t.created_by,
        t.created_at,
        t.updated_at,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM timesheets t
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
      WHERE t.timesheet_id = @timesheet_id
        AND t.firm_id = @firm_id
        AND t.is_deleted = 0`,
      {
        timesheet_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    res.json({
      success: true,
      timesheet
    });

  } catch (error) {
    console.error('Get timesheet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve timesheet'
    });
  }
});

// ==================== POST /api/timesheets ====================
// Create new timesheet (optional matter_id + lawyer_id FK validation)

router.post('/', validateBody('timesheet_saas'), async (req, res) => {
  const {
    matter_id,
    lawyer_id,
    entry_date,
    minutes,
    narrative,
    billable,
    rate_per_hour,
    rate_currency,
    status
  } = req.body;

  try {
    const firm_id = req.user.firm_id;

    // Validate matter_id (if provided)
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

    // Validate lawyer_id (if provided)
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
      `INSERT INTO timesheets (
        firm_id,
        matter_id,
        lawyer_id,
        entry_date,
        minutes,
        narrative,
        billable,
        rate_per_hour,
        rate_currency,
        status,
        created_by
      )
      OUTPUT
        INSERTED.timesheet_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.entry_date,
        INSERTED.minutes,
        INSERTED.narrative,
        INSERTED.billable,
        INSERTED.rate_per_hour,
        INSERTED.rate_currency,
        INSERTED.status,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @lawyer_id,
        @entry_date,
        @minutes,
        @narrative,
        @billable,
        @rate_per_hour,
        @rate_currency,
        @status,
        @created_by
      )`,
      {
        firm_id,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        entry_date,
        minutes: parseInt(minutes),
        narrative,
        billable: billable === false ? 0 : 1,
        rate_per_hour: rate_per_hour ? parseFloat(rate_per_hour) : null,
        rate_currency: rate_currency || 'USD',
        status: status || 'draft',
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      timesheet: result.recordset[0]
    });

  } catch (error) {
    console.error('Create timesheet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create timesheet'
    });
  }
});

// ==================== PUT /api/timesheets/:id ====================
// Update timesheet (firm-scoped, all editable fields)

router.put('/:id', validateBody('timesheet_saas'), async (req, res) => {
  const {
    matter_id,
    lawyer_id,
    entry_date,
    minutes,
    narrative,
    billable,
    rate_per_hour,
    rate_currency,
    status
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timesheet ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify timesheet exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT timesheet_id FROM timesheets WHERE timesheet_id = @timesheet_id AND firm_id = @firm_id AND is_deleted = 0',
      { timesheet_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    // Validate matter_id (if provided)
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

    // Validate lawyer_id (if provided)
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
      `UPDATE timesheets
      SET
        matter_id = @matter_id,
        lawyer_id = @lawyer_id,
        entry_date = @entry_date,
        minutes = @minutes,
        narrative = @narrative,
        billable = @billable,
        rate_per_hour = @rate_per_hour,
        rate_currency = @rate_currency,
        status = @status,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.timesheet_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.entry_date,
        INSERTED.minutes,
        INSERTED.narrative,
        INSERTED.billable,
        INSERTED.rate_per_hour,
        INSERTED.rate_currency,
        INSERTED.status,
        INSERTED.updated_at
      WHERE timesheet_id = @timesheet_id AND firm_id = @firm_id`,
      {
        timesheet_id: id,
        firm_id,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        entry_date,
        minutes: parseInt(minutes),
        narrative,
        billable: billable === false ? 0 : 1,
        rate_per_hour: rate_per_hour ? parseFloat(rate_per_hour) : null,
        rate_currency: rate_currency || 'USD',
        status: status || 'draft'
      }
    );

    res.json({
      success: true,
      timesheet: result.recordset[0]
    });

  } catch (error) {
    console.error('Update timesheet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update timesheet'
    });
  }
});

// ==================== DELETE /api/timesheets/:id ====================
// Soft delete timesheet (firm-scoped, sets is_deleted = 1)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timesheet ID'
      });
    }

    // Verify timesheet exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT timesheet_id FROM timesheets WHERE timesheet_id = @timesheet_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        timesheet_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    await db.execute(
      `UPDATE timesheets
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE timesheet_id = @timesheet_id AND firm_id = @firm_id`,
      {
        timesheet_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Timesheet deleted successfully'
    });

  } catch (error) {
    console.error('Delete timesheet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete timesheet'
    });
  }
});

module.exports = router;
