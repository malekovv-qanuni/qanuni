/**
 * Qanuni SaaS - Trash CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * SaaS uses is_deleted BIT (not deleted_at timestamp).
 * SaaS uses is_active BIT for clients/lawyers (not active).
 *
 * Supports 13 entity types:
 *   client, lawyer, matter, hearing, diary, task, judgment,
 *   deadline, timesheet, expense, advance, invoice, appointment
 *
 * api-client.js endpoints:
 *   GET  /trash          -> getTrash()
 *   GET  /trash/count    -> getTrashCount()
 *   POST /trash/restore  -> restoreItem({type, id})
 *   POST /trash/permanent-delete -> permanentDeleteItem(type, id)
 *   POST /trash/empty    -> emptyTrash()
 *
 * @version 1.0.0 (Week 4 Day 19)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ==================== TABLE MAP ====================
// All 13 SaaS entity types with their column mappings
const TABLE_MAP = {
  client: {
    table: 'clients',
    idCol: 'client_id',
    nameCol: 'client_name',
    extraRestore: ', is_active = 1'
  },
  lawyer: {
    table: 'lawyers',
    idCol: 'lawyer_id',
    nameCol: 'full_name',
    extraRestore: ', is_active = 1'
  },
  matter: {
    table: 'matters',
    idCol: 'matter_id',
    nameCol: 'matter_name',
    extraRestore: ''
  },
  hearing: {
    table: 'hearings',
    idCol: 'hearing_id',
    nameCol: 'court_name',
    extraRestore: ''
  },
  diary: {
    table: 'diary',
    idCol: 'diary_id',
    nameCol: 'title',
    extraRestore: ''
  },
  task: {
    table: 'tasks',
    idCol: 'task_id',
    nameCol: 'title',
    extraRestore: ''
  },
  judgment: {
    table: 'judgments',
    idCol: 'judgment_id',
    nameCol: 'judgment_type',
    extraRestore: ''
  },
  deadline: {
    table: 'deadlines',
    idCol: 'deadline_id',
    nameCol: 'title',
    extraRestore: ''
  },
  timesheet: {
    table: 'timesheets',
    idCol: 'timesheet_id',
    nameCol: 'narrative',
    extraRestore: ''
  },
  expense: {
    table: 'expenses',
    idCol: 'expense_id',
    nameCol: 'description',
    extraRestore: ''
  },
  advance: {
    table: 'advances',
    idCol: 'advance_id',
    nameCol: 'reference_number',
    extraRestore: ''
  },
  invoice: {
    table: 'invoices',
    idCol: 'invoice_id',
    nameCol: 'invoice_number',
    extraRestore: ''
  },
  appointment: {
    table: 'appointments',
    idCol: 'appointment_id',
    nameCol: 'title',
    extraRestore: ''
  }
};

// ==================== GET /api/trash ====================
// List all deleted items across all entity types

router.get('/', async (req, res) => {
  try {
    const firm_id = req.user.firm_id;
    const allItems = [];

    for (const [type, config] of Object.entries(TABLE_MAP)) {
      try {
        const items = await db.getAll(
          `SELECT ${config.idCol} as id, ${config.nameCol} as display_name, updated_at as deleted_at
          FROM ${config.table}
          WHERE firm_id = @firm_id AND is_deleted = 1`,
          { firm_id }
        );
        for (const item of items) {
          allItems.push({
            type,
            id: item.id,
            display_name: item.display_name || '(no name)',
            deleted_at: item.deleted_at
          });
        }
      } catch (tableErr) {
        // Table might not exist yet (e.g., appointments before schema is run)
        // Silently skip
      }
    }

    // Sort by deletion time (most recent first)
    allItems.sort((a, b) => {
      if (!a.deleted_at) return 1;
      if (!b.deleted_at) return -1;
      return new Date(b.deleted_at) - new Date(a.deleted_at);
    });

    res.json({
      success: true,
      data: allItems
    });

  } catch (error) {
    console.error('Get trash items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trash items'
    });
  }
});

// ==================== GET /api/trash/count ====================
// Count deleted items per entity type

router.get('/count', async (req, res) => {
  try {
    const firm_id = req.user.firm_id;
    const counts = {};
    let totalCount = 0;

    for (const [type, config] of Object.entries(TABLE_MAP)) {
      try {
        const result = await db.getOne(
          `SELECT COUNT(*) as count FROM ${config.table}
          WHERE firm_id = @firm_id AND is_deleted = 1`,
          { firm_id }
        );
        counts[type] = result.count;
        totalCount += result.count;
      } catch (tableErr) {
        counts[type] = 0;
      }
    }

    res.json({
      success: true,
      counts,
      total: totalCount
    });

  } catch (error) {
    console.error('Get trash count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trash count'
    });
  }
});

// ==================== POST /api/trash/restore ====================
// Restore a deleted item (body: {type, id})

router.post('/restore', async (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'type and id are required'
      });
    }

    const config = TABLE_MAP[type];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type: ' + type
      });
    }

    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID'
      });
    }

    // Verify item exists and is deleted
    const existing = await db.getOne(
      `SELECT ${config.idCol} FROM ${config.table}
      WHERE ${config.idCol} = @id AND firm_id = @firm_id AND is_deleted = 1`,
      { id: itemId, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in trash'
      });
    }

    await db.execute(
      `UPDATE ${config.table}
      SET is_deleted = 0, updated_at = GETUTCDATE()${config.extraRestore}
      WHERE ${config.idCol} = @id AND firm_id = @firm_id`,
      { id: itemId, firm_id: req.user.firm_id }
    );

    res.json({
      success: true,
      message: type + ' restored successfully'
    });

  } catch (error) {
    console.error('Restore trash item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore item'
    });
  }
});

// ==================== POST /api/trash/permanent-delete ====================
// Permanently delete an item (body: {type, id})

router.post('/permanent-delete', async (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'type and id are required'
      });
    }

    const config = TABLE_MAP[type];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type: ' + type
      });
    }

    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID'
      });
    }

    // Verify item exists and is deleted
    const existing = await db.getOne(
      `SELECT ${config.idCol} FROM ${config.table}
      WHERE ${config.idCol} = @id AND firm_id = @firm_id AND is_deleted = 1`,
      { id: itemId, firm_id: req.user.firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in trash'
      });
    }

    await db.execute(
      `DELETE FROM ${config.table}
      WHERE ${config.idCol} = @id AND firm_id = @firm_id AND is_deleted = 1`,
      { id: itemId, firm_id: req.user.firm_id }
    );

    res.json({
      success: true,
      message: type + ' permanently deleted'
    });

  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to permanently delete item'
    });
  }
});

// ==================== POST /api/trash/empty ====================
// Empty all trash (permanently delete all soft-deleted items)

router.post('/empty', async (req, res) => {
  try {
    const firm_id = req.user.firm_id;
    let totalDeleted = 0;

    // Delete in reverse dependency order to avoid FK violations
    // Entities with FKs to others must be deleted first
    const deleteOrder = [
      'invoice', 'advance', 'expense', 'timesheet',
      'deadline', 'judgment', 'hearing', 'diary',
      'task', 'appointment', 'matter', 'lawyer', 'client'
    ];

    for (const type of deleteOrder) {
      const config = TABLE_MAP[type];
      try {
        const result = await db.execute(
          `DELETE FROM ${config.table}
          WHERE firm_id = @firm_id AND is_deleted = 1`,
          { firm_id }
        );
        totalDeleted += result.rowsAffected[0] || 0;
      } catch (tableErr) {
        // Skip if table doesn't exist or FK constraint
      }
    }

    res.json({
      success: true,
      message: 'Trash emptied successfully',
      deleted_count: totalDeleted
    });

  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to empty trash'
    });
  }
});

module.exports = router;
