/**
 * Qanuni SaaS - Hearing CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Each hearing belongs to a matter (FK validated on create).
 *
 * @version 1.0.0 (Week 2 Day 7)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/hearings ====================
// List all hearings for the user's firm
// Query params: ?matter_id=123, ?start_date=2026-01-01, ?end_date=2026-12-31, ?outcome=pending

router.get('/', async (req, res) => {
  try {
    const { matter_id, start_date, end_date, outcome } = req.query;

    let query = `
      SELECT
        h.hearing_id,
        h.firm_id,
        h.matter_id,
        h.hearing_date,
        h.hearing_time,
        h.hearing_type,
        h.court_name,
        h.court_room,
        h.judge_name,
        h.outcome,
        h.outcome_notes,
        h.next_hearing_date,
        h.reminder_days,
        h.created_at,
        h.updated_at,
        m.matter_name,
        m.matter_name_arabic
      FROM hearings h
      INNER JOIN matters m ON h.matter_id = m.matter_id
      WHERE h.firm_id = @firm_id AND h.is_deleted = 0`;

    const params = { firm_id: req.user.firm_id };

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        query += ' AND h.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (start_date) {
      query += ' AND h.hearing_date >= @start_date';
      params.start_date = start_date;
    }

    if (end_date) {
      query += ' AND h.hearing_date <= @end_date';
      params.end_date = end_date;
    }

    if (outcome) {
      query += ' AND h.outcome = @outcome';
      params.outcome = outcome;
    }

    query += ' ORDER BY h.hearing_date DESC';

    const hearings = await db.getAll(query, params);

    res.json({
      success: true,
      count: hearings.length,
      hearings
    });

  } catch (error) {
    console.error('Get hearings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve hearings'
    });
  }
});

// ==================== GET /api/hearings/:id ====================
// Get single hearing with matter details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hearing ID'
      });
    }

    const hearing = await db.getOne(
      `SELECT
        h.hearing_id,
        h.firm_id,
        h.matter_id,
        h.hearing_date,
        h.hearing_time,
        h.hearing_type,
        h.court_name,
        h.court_room,
        h.judge_name,
        h.outcome,
        h.outcome_notes,
        h.next_hearing_date,
        h.reminder_days,
        h.created_by,
        h.created_at,
        h.updated_at,
        m.matter_name,
        m.matter_name_arabic
      FROM hearings h
      INNER JOIN matters m ON h.matter_id = m.matter_id
      WHERE h.hearing_id = @hearing_id
        AND h.firm_id = @firm_id
        AND h.is_deleted = 0`,
      {
        hearing_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!hearing) {
      return res.status(404).json({
        success: false,
        error: 'Hearing not found'
      });
    }

    res.json({
      success: true,
      hearing
    });

  } catch (error) {
    console.error('Get hearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve hearing'
    });
  }
});

// ==================== POST /api/hearings ====================
// Create new hearing (validates matter belongs to firm)

router.post('/', validateBody('hearing_saas'), async (req, res) => {
  const {
    matter_id,
    hearing_date,
    hearing_time,
    hearing_type,
    court_name,
    court_room,
    judge_name,
    outcome,
    outcome_notes,
    next_hearing_date,
    reminder_days
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
      `INSERT INTO hearings (
        firm_id,
        matter_id,
        hearing_date,
        hearing_time,
        hearing_type,
        court_name,
        court_room,
        judge_name,
        outcome,
        outcome_notes,
        next_hearing_date,
        reminder_days,
        created_by
      )
      OUTPUT
        INSERTED.hearing_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.hearing_date,
        INSERTED.hearing_time,
        INSERTED.hearing_type,
        INSERTED.court_name,
        INSERTED.court_room,
        INSERTED.judge_name,
        INSERTED.outcome,
        INSERTED.outcome_notes,
        INSERTED.next_hearing_date,
        INSERTED.reminder_days,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @hearing_date,
        @hearing_time,
        @hearing_type,
        @court_name,
        @court_room,
        @judge_name,
        @outcome,
        @outcome_notes,
        @next_hearing_date,
        @reminder_days,
        @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        matter_id,
        hearing_date,
        hearing_time: hearing_time || null,
        hearing_type: hearing_type || null,
        court_name: court_name || null,
        court_room: court_room || null,
        judge_name: judge_name || null,
        outcome: outcome || 'pending',
        outcome_notes: outcome_notes || null,
        next_hearing_date: next_hearing_date || null,
        reminder_days: reminder_days != null ? reminder_days : 7,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      hearing: result.recordset[0]
    });

  } catch (error) {
    console.error('Create hearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hearing'
    });
  }
});

// ==================== PUT /api/hearings/:id ====================
// Update hearing (firm-scoped)

router.put('/:id', validateBody('hearing_saas'), async (req, res) => {
  const {
    matter_id,
    hearing_date,
    hearing_time,
    hearing_type,
    court_name,
    court_room,
    judge_name,
    outcome,
    outcome_notes,
    next_hearing_date,
    reminder_days
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hearing ID'
      });
    }

    // Verify hearing exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT hearing_id, outcome, reminder_days FROM hearings WHERE hearing_id = @hearing_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        hearing_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Hearing not found'
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
      `UPDATE hearings
      SET
        matter_id = @matter_id,
        hearing_date = @hearing_date,
        hearing_time = @hearing_time,
        hearing_type = @hearing_type,
        court_name = @court_name,
        court_room = @court_room,
        judge_name = @judge_name,
        outcome = @outcome,
        outcome_notes = @outcome_notes,
        next_hearing_date = @next_hearing_date,
        reminder_days = @reminder_days,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.hearing_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.hearing_date,
        INSERTED.hearing_time,
        INSERTED.hearing_type,
        INSERTED.court_name,
        INSERTED.court_room,
        INSERTED.judge_name,
        INSERTED.outcome,
        INSERTED.outcome_notes,
        INSERTED.next_hearing_date,
        INSERTED.reminder_days,
        INSERTED.updated_at
      WHERE hearing_id = @hearing_id AND firm_id = @firm_id`,
      {
        hearing_id: id,
        firm_id: req.user.firm_id,
        matter_id,
        hearing_date,
        hearing_time: hearing_time || null,
        hearing_type: hearing_type || null,
        court_name: court_name || null,
        court_room: court_room || null,
        judge_name: judge_name || null,
        outcome: outcome || existing.outcome,
        outcome_notes: outcome_notes || null,
        next_hearing_date: next_hearing_date || null,
        reminder_days: reminder_days != null ? reminder_days : existing.reminder_days
      }
    );

    res.json({
      success: true,
      hearing: result.recordset[0]
    });

  } catch (error) {
    console.error('Update hearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hearing'
    });
  }
});

// ==================== DELETE /api/hearings/:id ====================
// Soft delete hearing (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hearing ID'
      });
    }

    // Verify hearing exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT hearing_id FROM hearings WHERE hearing_id = @hearing_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        hearing_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Hearing not found'
      });
    }

    await db.execute(
      `UPDATE hearings
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE hearing_id = @hearing_id AND firm_id = @firm_id`,
      {
        hearing_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Hearing deleted successfully'
    });

  } catch (error) {
    console.error('Delete hearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hearing'
    });
  }
});

module.exports = router;
