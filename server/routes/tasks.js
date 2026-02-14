/**
 * Qanuni SaaS - Tasks CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * All FK relationships are optional (matter, client, hearing, assigned_to).
 * Auto-generates task_number: WA-YYYY-NNNN (firm-scoped).
 *
 * @version 1.0.0 (Week 3 Day 11)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/tasks ====================
// List all tasks for the user's firm
// Query params: ?matter_id=123, ?status=assigned, ?priority=high, ?assigned_to=456, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, status, priority, assigned_to } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE t.firm_id = @firm_id AND t.is_deleted = 0';

    if (search) {
      where += ` AND (
        t.title LIKE '%' + @search + '%' OR
        t.description LIKE '%' + @search + '%' OR
        t.task_number LIKE '%' + @search + '%'
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

    if (status) {
      where += ' AND t.status = @status';
      params.status = status;
    }

    if (priority) {
      where += ' AND t.priority = @priority';
      params.priority = priority;
    }

    if (assigned_to) {
      const aid = parseInt(assigned_to);
      if (!isNaN(aid)) {
        where += ' AND t.assigned_to = @assigned_to';
        params.assigned_to = aid;
      }
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM tasks t ${where}`,
      params
    );
    const total = countResult.total;

    const tasks = await db.getAll(
      `SELECT
        t.task_id,
        t.firm_id,
        t.task_number,
        t.title,
        t.description,
        t.instructions,
        t.due_date,
        t.due_time,
        t.time_budget_minutes,
        t.priority,
        t.status,
        t.matter_id,
        t.client_id,
        t.hearing_id,
        t.assigned_to,
        t.assigned_by,
        t.assigned_date,
        t.completion_notes,
        t.completed_date,
        t.notes,
        t.created_at,
        t.updated_at,
        u.full_name as created_by_name,
        m.matter_name,
        m.matter_number,
        l.full_name as assigned_lawyer_name
      FROM tasks t
      INNER JOIN users u ON t.created_by = u.user_id
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
      ${where}
      ORDER BY t.due_date ASC, t.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: tasks,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tasks'
    });
  }
});

// ==================== GET /api/tasks/:id ====================
// Get single task with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const task = await db.getOne(
      `SELECT
        t.task_id,
        t.firm_id,
        t.task_number,
        t.title,
        t.description,
        t.instructions,
        t.due_date,
        t.due_time,
        t.time_budget_minutes,
        t.priority,
        t.status,
        t.matter_id,
        t.client_id,
        t.hearing_id,
        t.assigned_to,
        t.assigned_by,
        t.assigned_date,
        t.completion_notes,
        t.completed_date,
        t.notes,
        t.created_by,
        t.created_at,
        t.updated_at,
        u.full_name as created_by_name,
        m.matter_name,
        m.matter_number,
        l.full_name as assigned_lawyer_name
      FROM tasks t
      INNER JOIN users u ON t.created_by = u.user_id
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
      WHERE t.task_id = @task_id
        AND t.firm_id = @firm_id
        AND t.is_deleted = 0`,
      {
        task_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve task'
    });
  }
});

// ==================== POST /api/tasks ====================
// Create new task (validates optional FKs if provided)

router.post('/', validateBody('task_saas'), async (req, res) => {
  const {
    title,
    description,
    instructions,
    due_date,
    due_time,
    time_budget_minutes,
    priority,
    status,
    client_id,
    hearing_id,
    assigned_date,
    notes
  } = req.body;

  // Accept assigned_to_id OR assigned_to (frontend compatibility)
  const assigned_to = req.body.assigned_to_id || req.body.assigned_to || null;
  const matter_id = req.body.matter_id || null;

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

    // Validate client_id (if provided)
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

    // Validate assigned_to (if provided) - FK to lawyers
    if (assigned_to) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id: assigned_to, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Assigned lawyer not found or does not belong to your firm'
        });
      }
    }

    // Auto-generate task_number: WA-YYYY-NNNN (firm-scoped)
    const year = new Date().getFullYear();
    const countResult = await db.getOne(
      `SELECT COUNT(*) as count FROM tasks
       WHERE firm_id = @firm_id AND task_number LIKE 'WA-' + CAST(@year AS NVARCHAR(4)) + '-%'`,
      { firm_id, year }
    );
    const num = (countResult.count || 0) + 1;
    const task_number = `WA-${year}-${num.toString().padStart(4, '0')}`;

    const result = await db.execute(
      `INSERT INTO tasks (
        firm_id,
        task_number,
        title,
        description,
        instructions,
        due_date,
        due_time,
        time_budget_minutes,
        priority,
        status,
        matter_id,
        client_id,
        hearing_id,
        assigned_to,
        assigned_by,
        assigned_date,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.task_id,
        INSERTED.firm_id,
        INSERTED.task_number,
        INSERTED.title,
        INSERTED.description,
        INSERTED.instructions,
        INSERTED.due_date,
        INSERTED.due_time,
        INSERTED.time_budget_minutes,
        INSERTED.priority,
        INSERTED.status,
        INSERTED.matter_id,
        INSERTED.client_id,
        INSERTED.hearing_id,
        INSERTED.assigned_to,
        INSERTED.assigned_by,
        INSERTED.assigned_date,
        INSERTED.notes,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @task_number,
        @title,
        @description,
        @instructions,
        @due_date,
        @due_time,
        @time_budget_minutes,
        @priority,
        @status,
        @matter_id,
        @client_id,
        @hearing_id,
        @assigned_to,
        @assigned_by,
        @assigned_date,
        @notes,
        @created_by
      )`,
      {
        firm_id,
        task_number,
        title,
        description: description || null,
        instructions: instructions || null,
        due_date: due_date || null,
        due_time: due_time || null,
        time_budget_minutes: time_budget_minutes ? parseInt(time_budget_minutes) : null,
        priority: priority || 'medium',
        status: status || 'assigned',
        matter_id: matter_id || null,
        client_id: client_id || null,
        hearing_id: hearing_id || null,
        assigned_to: assigned_to || null,
        assigned_by: req.user.user_id,
        assigned_date: assigned_date || null,
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      task: result.recordset[0]
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

// ==================== PUT /api/tasks/:id ====================
// Update task (firm-scoped, all editable fields)

router.put('/:id', validateBody('task_saas'), async (req, res) => {
  const {
    title,
    description,
    instructions,
    due_date,
    due_time,
    time_budget_minutes,
    priority,
    status,
    client_id,
    hearing_id,
    assigned_date,
    completion_notes,
    completed_date,
    notes
  } = req.body;

  // Accept assigned_to_id OR assigned_to (frontend compatibility)
  const assigned_to = req.body.assigned_to_id || req.body.assigned_to || null;
  const matter_id = req.body.matter_id || null;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify task exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT task_id FROM tasks WHERE task_id = @task_id AND firm_id = @firm_id AND is_deleted = 0',
      { task_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
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

    // Validate client_id (if provided)
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

    // Validate assigned_to (if provided)
    if (assigned_to) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id: assigned_to, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Assigned lawyer not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE tasks
      SET
        title = @title,
        description = @description,
        instructions = @instructions,
        due_date = @due_date,
        due_time = @due_time,
        time_budget_minutes = @time_budget_minutes,
        priority = @priority,
        status = @status,
        matter_id = @matter_id,
        client_id = @client_id,
        hearing_id = @hearing_id,
        assigned_to = @assigned_to,
        assigned_date = @assigned_date,
        completion_notes = @completion_notes,
        completed_date = @completed_date,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.task_id,
        INSERTED.firm_id,
        INSERTED.task_number,
        INSERTED.title,
        INSERTED.description,
        INSERTED.instructions,
        INSERTED.due_date,
        INSERTED.due_time,
        INSERTED.time_budget_minutes,
        INSERTED.priority,
        INSERTED.status,
        INSERTED.matter_id,
        INSERTED.client_id,
        INSERTED.hearing_id,
        INSERTED.assigned_to,
        INSERTED.assigned_by,
        INSERTED.assigned_date,
        INSERTED.completion_notes,
        INSERTED.completed_date,
        INSERTED.notes,
        INSERTED.updated_at
      WHERE task_id = @task_id AND firm_id = @firm_id`,
      {
        task_id: id,
        firm_id,
        title,
        description: description || null,
        instructions: instructions || null,
        due_date: due_date || null,
        due_time: due_time || null,
        time_budget_minutes: time_budget_minutes ? parseInt(time_budget_minutes) : null,
        priority: priority || 'medium',
        status: status || 'assigned',
        matter_id: matter_id || null,
        client_id: client_id || null,
        hearing_id: hearing_id || null,
        assigned_to: assigned_to || null,
        assigned_date: assigned_date || null,
        completion_notes: completion_notes || null,
        completed_date: completed_date || null,
        notes: notes || null
      }
    );

    res.json({
      success: true,
      task: result.recordset[0]
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

// ==================== DELETE /api/tasks/:id ====================
// Soft delete task (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    // Verify task exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT task_id FROM tasks WHERE task_id = @task_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        task_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    await db.execute(
      `UPDATE tasks
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE task_id = @task_id AND firm_id = @firm_id`,
      {
        task_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

module.exports = router;
