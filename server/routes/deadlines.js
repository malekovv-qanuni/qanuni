/**
 * Qanuni SaaS - Deadlines CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Required FK: matter_id. Optional FK: judgment_id.
 * Deadline IDs are INT IDENTITY (SaaS pattern).
 *
 * @version 1.0.0 (Week 3 Day 13)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/deadlines ====================
// List all deadlines for the user's firm
// Query params: ?matter_id=123, ?status=pending, ?priority=high, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, status, priority } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE d.firm_id = @firm_id AND d.is_deleted = 0';

    if (search) {
      where += ` AND (
        d.title LIKE '%' + @search + '%' OR
        d.notes LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND d.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (status) {
      where += ' AND d.status = @status';
      params.status = status;
    }

    if (priority) {
      where += ' AND d.priority = @priority';
      params.priority = priority;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM deadlines d ${where}`,
      params
    );
    const total = countResult.total;

    const deadlines = await db.getAll(
      `SELECT
        d.deadline_id,
        d.firm_id,
        d.matter_id,
        d.judgment_id,
        d.title,
        d.deadline_date,
        d.reminder_days,
        d.priority,
        d.status,
        d.notes,
        d.created_at,
        d.updated_at,
        m.matter_name,
        m.matter_number,
        c.client_name
      FROM deadlines d
      LEFT JOIN matters m ON d.matter_id = m.matter_id
      LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id AND mc.is_primary = 1
      LEFT JOIN clients c ON mc.client_id = c.client_id
      ${where}
      ORDER BY d.deadline_date ASC, d.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: deadlines,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deadlines'
    });
  }
});

// ==================== GET /api/deadlines/:id ====================
// Get single deadline with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deadline ID'
      });
    }

    const deadline = await db.getOne(
      `SELECT
        d.deadline_id,
        d.firm_id,
        d.matter_id,
        d.judgment_id,
        d.title,
        d.deadline_date,
        d.reminder_days,
        d.priority,
        d.status,
        d.notes,
        d.created_by,
        d.created_at,
        d.updated_at,
        m.matter_name,
        m.matter_number,
        c.client_name
      FROM deadlines d
      LEFT JOIN matters m ON d.matter_id = m.matter_id
      LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id AND mc.is_primary = 1
      LEFT JOIN clients c ON mc.client_id = c.client_id
      WHERE d.deadline_id = @deadline_id
        AND d.firm_id = @firm_id
        AND d.is_deleted = 0`,
      {
        deadline_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!deadline) {
      return res.status(404).json({
        success: false,
        error: 'Deadline not found'
      });
    }

    res.json({
      success: true,
      deadline
    });

  } catch (error) {
    console.error('Get deadline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deadline'
    });
  }
});

// ==================== POST /api/deadlines ====================
// Create new deadline (validates matter_id FK, optional judgment_id FK)

router.post('/', validateBody('deadline_saas'), async (req, res) => {
  const {
    matter_id,
    judgment_id,
    title,
    deadline_date,
    reminder_days,
    priority,
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

    // Validate judgment_id (if provided)
    if (judgment_id) {
      const judgment = await db.getOne(
        'SELECT judgment_id FROM judgments WHERE judgment_id = @judgment_id AND firm_id = @firm_id AND is_deleted = 0',
        { judgment_id, firm_id }
      );
      if (!judgment) {
        return res.status(404).json({
          success: false,
          error: 'Judgment not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `INSERT INTO deadlines (
        firm_id,
        matter_id,
        judgment_id,
        title,
        deadline_date,
        reminder_days,
        priority,
        status,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.deadline_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.judgment_id,
        INSERTED.title,
        INSERTED.deadline_date,
        INSERTED.reminder_days,
        INSERTED.priority,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @judgment_id,
        @title,
        @deadline_date,
        @reminder_days,
        @priority,
        @status,
        @notes,
        @created_by
      )`,
      {
        firm_id,
        matter_id,
        judgment_id: judgment_id || null,
        title,
        deadline_date,
        reminder_days: reminder_days || 7,
        priority: priority || 'medium',
        status: status || 'pending',
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      deadline: result.recordset[0]
    });

  } catch (error) {
    console.error('Create deadline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deadline'
    });
  }
});

// ==================== PUT /api/deadlines/:id ====================
// Update deadline (firm-scoped, all editable fields)

router.put('/:id', validateBody('deadline_saas'), async (req, res) => {
  const {
    matter_id,
    judgment_id,
    title,
    deadline_date,
    reminder_days,
    priority,
    status,
    notes
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deadline ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify deadline exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT deadline_id FROM deadlines WHERE deadline_id = @deadline_id AND firm_id = @firm_id AND is_deleted = 0',
      { deadline_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Deadline not found'
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

    // Validate judgment_id (if provided)
    if (judgment_id) {
      const judgment = await db.getOne(
        'SELECT judgment_id FROM judgments WHERE judgment_id = @judgment_id AND firm_id = @firm_id AND is_deleted = 0',
        { judgment_id, firm_id }
      );
      if (!judgment) {
        return res.status(404).json({
          success: false,
          error: 'Judgment not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE deadlines
      SET
        matter_id = @matter_id,
        judgment_id = @judgment_id,
        title = @title,
        deadline_date = @deadline_date,
        reminder_days = @reminder_days,
        priority = @priority,
        status = @status,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.deadline_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.judgment_id,
        INSERTED.title,
        INSERTED.deadline_date,
        INSERTED.reminder_days,
        INSERTED.priority,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.updated_at
      WHERE deadline_id = @deadline_id AND firm_id = @firm_id`,
      {
        deadline_id: id,
        firm_id,
        matter_id,
        judgment_id: judgment_id || null,
        title,
        deadline_date,
        reminder_days: reminder_days || 7,
        priority: priority || 'medium',
        status: status || 'pending',
        notes: notes || null
      }
    );

    res.json({
      success: true,
      deadline: result.recordset[0]
    });

  } catch (error) {
    console.error('Update deadline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deadline'
    });
  }
});

// ==================== DELETE /api/deadlines/:id ====================
// Soft delete deadline (firm-scoped, sets is_deleted = 1)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deadline ID'
      });
    }

    // Verify deadline exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT deadline_id FROM deadlines WHERE deadline_id = @deadline_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        deadline_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Deadline not found'
      });
    }

    await db.execute(
      `UPDATE deadlines
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE deadline_id = @deadline_id AND firm_id = @firm_id`,
      {
        deadline_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Deadline deleted successfully'
    });

  } catch (error) {
    console.error('Delete deadline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deadline'
    });
  }
});

module.exports = router;
