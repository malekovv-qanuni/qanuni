/**
 * Qanuni SaaS - Diary CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Each diary entry belongs to a matter (FK validated on create).
 *
 * @version 1.0.0 (Week 3 Day 10)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/diary ====================
// List all diary entries for the user's firm
// Query params: ?matter_id=123, ?start_date=2026-01-01, ?end_date=2026-12-31, ?search=term, ?entry_type=note

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, start_date, end_date, entry_type } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE d.firm_id = @firm_id AND d.is_deleted = 0';

    if (search) {
      where += ` AND (
        d.title LIKE '%' + @search + '%' OR
        d.description LIKE '%' + @search + '%'
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

    if (start_date) {
      where += ' AND d.entry_date >= @start_date';
      params.start_date = start_date;
    }

    if (end_date) {
      where += ' AND d.entry_date <= @end_date';
      params.end_date = end_date;
    }

    if (entry_type) {
      where += ' AND d.entry_type = @entry_type';
      params.entry_type = entry_type;
    }

    // Get total count (join needed for firm_id filter correctness)
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM diary d
      INNER JOIN matters m ON d.matter_id = m.matter_id
      ${where}`,
      params
    );
    const total = countResult.total;

    const entries = await db.getAll(
      `SELECT
        d.diary_id,
        d.firm_id,
        d.matter_id,
        d.entry_date,
        d.entry_type,
        d.title,
        d.description,
        d.created_at,
        d.updated_at,
        u.full_name as created_by_name,
        m.matter_name,
        m.matter_number
      FROM diary d
      INNER JOIN users u ON d.created_by = u.user_id
      INNER JOIN matters m ON d.matter_id = m.matter_id
      ${where}
      ORDER BY d.entry_date DESC, d.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: entries,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get diary entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve diary entries'
    });
  }
});

// ==================== GET /api/diary/:id ====================
// Get single diary entry with matter details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid diary entry ID'
      });
    }

    const diary = await db.getOne(
      `SELECT
        d.diary_id,
        d.firm_id,
        d.matter_id,
        d.entry_date,
        d.entry_type,
        d.title,
        d.description,
        d.created_by,
        d.created_at,
        d.updated_at,
        u.full_name as created_by_name,
        m.matter_name,
        m.matter_number
      FROM diary d
      INNER JOIN users u ON d.created_by = u.user_id
      INNER JOIN matters m ON d.matter_id = m.matter_id
      WHERE d.diary_id = @diary_id
        AND d.firm_id = @firm_id
        AND d.is_deleted = 0`,
      {
        diary_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!diary) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    res.json({
      success: true,
      diary
    });

  } catch (error) {
    console.error('Get diary entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve diary entry'
    });
  }
});

// ==================== POST /api/diary ====================
// Create new diary entry (validates matter belongs to firm)

router.post('/', validateBody('diary_saas'), async (req, res) => {
  const {
    matter_id,
    entry_date,
    entry_type,
    title,
    description
  } = req.body;

  try {
    // Verify matter exists and belongs to user's firm
    const matter = await db.getOne(
      'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        matter_id,
        firm_id: req.user.firm_id
      }
    );

    if (!matter) {
      return res.status(404).json({
        success: false,
        error: 'Matter not found or does not belong to your firm'
      });
    }

    const result = await db.execute(
      `INSERT INTO diary (
        firm_id,
        matter_id,
        entry_date,
        entry_type,
        title,
        description,
        created_by
      )
      OUTPUT
        INSERTED.diary_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.entry_date,
        INSERTED.entry_type,
        INSERTED.title,
        INSERTED.description,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @entry_date,
        @entry_type,
        @title,
        @description,
        @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        matter_id,
        entry_date,
        entry_type: entry_type || 'note',
        title,
        description: description || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      diary: result.recordset[0]
    });

  } catch (error) {
    console.error('Create diary entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create diary entry'
    });
  }
});

// ==================== PUT /api/diary/:id ====================
// Update diary entry (firm-scoped)

router.put('/:id', validateBody('diary_saas'), async (req, res) => {
  const {
    matter_id,
    entry_date,
    entry_type,
    title,
    description
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid diary entry ID'
      });
    }

    // Verify diary entry exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT diary_id FROM diary WHERE diary_id = @diary_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        diary_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    // Verify matter exists and belongs to user's firm
    const matter = await db.getOne(
      'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        matter_id,
        firm_id: req.user.firm_id
      }
    );

    if (!matter) {
      return res.status(404).json({
        success: false,
        error: 'Matter not found or does not belong to your firm'
      });
    }

    const result = await db.execute(
      `UPDATE diary
      SET
        matter_id = @matter_id,
        entry_date = @entry_date,
        entry_type = @entry_type,
        title = @title,
        description = @description,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.diary_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.entry_date,
        INSERTED.entry_type,
        INSERTED.title,
        INSERTED.description,
        INSERTED.updated_at
      WHERE diary_id = @diary_id AND firm_id = @firm_id`,
      {
        diary_id: id,
        firm_id: req.user.firm_id,
        matter_id,
        entry_date,
        entry_type: entry_type || 'note',
        title,
        description: description || null
      }
    );

    res.json({
      success: true,
      diary: result.recordset[0]
    });

  } catch (error) {
    console.error('Update diary entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update diary entry'
    });
  }
});

// ==================== DELETE /api/diary/:id ====================
// Soft delete diary entry (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid diary entry ID'
      });
    }

    // Verify diary entry exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT diary_id FROM diary WHERE diary_id = @diary_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        diary_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    await db.execute(
      `UPDATE diary
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE diary_id = @diary_id AND firm_id = @firm_id`,
      {
        diary_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete diary entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete diary entry'
    });
  }
});

module.exports = router;
