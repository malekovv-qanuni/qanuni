/**
 * Qanuni SaaS - Lookups CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Hybrid scoping: system items (firm_id IS NULL) + firm items (firm_id = X).
 * Uses soft delete (is_active = 0) instead of hard delete.
 *
 * 12 endpoints:
 *   9 GET (6 table lookups + matter-types + matter-statuses + courts alias)
 *   1 POST (create, type in body)
 *   1 PUT (update by id, type in body)
 *   1 DELETE (soft-delete by type + id)
 *
 * @version 1.0.0 (Week 4 Day 20)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const validation = require('../../shared/validation');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// CONSTANTS
// ============================================================================

// Hardcoded enums (from desktop - no tables needed)
const MATTER_TYPES = ['litigation', 'corporate', 'advisory', 'arbitration', 'enforcement', 'other'];
const MATTER_STATUSES = ['active', 'pending', 'closed', 'on_hold', 'archived'];

// Type to table mapping (supports both camelCase and kebab-case keys)
const TYPE_MAP = {
  'court-types':        { table: 'lookup_court_types',       idCol: 'court_type_id' },
  'courtTypes':         { table: 'lookup_court_types',       idCol: 'court_type_id' },
  'regions':            { table: 'lookup_regions',           idCol: 'region_id' },
  'hearing-purposes':   { table: 'lookup_hearing_purposes',  idCol: 'purpose_id' },
  'hearingPurposes':    { table: 'lookup_hearing_purposes',  idCol: 'purpose_id' },
  'task-types':         { table: 'lookup_task_types',        idCol: 'task_type_id' },
  'taskTypes':          { table: 'lookup_task_types',        idCol: 'task_type_id' },
  'expense-categories': { table: 'lookup_expense_categories', idCol: 'category_id' },
  'expenseCategories':  { table: 'lookup_expense_categories', idCol: 'category_id' },
  'expense_categories': { table: 'lookup_expense_categories', idCol: 'category_id' },
  'entity-types':       { table: 'lookup_entity_types',      idCol: 'entity_type_id' }
};

// ============================================================================
// HELPER: Generic lookup GET query
// ============================================================================

async function getLookupItems(table, firmId) {
  return db.getAll(
    `SELECT * FROM ${table}
     WHERE (firm_id = @firm_id OR firm_id IS NULL) AND is_active = 1
     ORDER BY sort_order, name_en`,
    { firm_id: firmId }
  );
}

// ============================================================================
// GET ENDPOINTS (9)
// ============================================================================

// GET /api/lookups/court-types
router.get('/court-types', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_court_types', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching court types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch court types' });
  }
});

// GET /api/lookups/regions
router.get('/regions', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_regions', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch regions' });
  }
});

// GET /api/lookups/hearing-purposes
router.get('/hearing-purposes', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_hearing_purposes', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching hearing purposes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hearing purposes' });
  }
});

// GET /api/lookups/task-types
router.get('/task-types', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_task_types', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching task types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task types' });
  }
});

// GET /api/lookups/expense-categories
router.get('/expense-categories', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_expense_categories', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expense categories' });
  }
});

// GET /api/lookups/entity-types
router.get('/entity-types', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_entity_types', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching entity types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entity types' });
  }
});

// GET /api/lookups/matter-types (hardcoded enum)
router.get('/matter-types', (req, res) => {
  res.json({ success: true, data: MATTER_TYPES });
});

// GET /api/lookups/matter-statuses (hardcoded enum)
router.get('/matter-statuses', (req, res) => {
  res.json({ success: true, data: MATTER_STATUSES });
});

// GET /api/lookups/courts (alias for court-types)
router.get('/courts', async (req, res) => {
  try {
    const items = await getLookupItems('lookup_court_types', req.user.firm_id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch courts' });
  }
});

// ============================================================================
// POST /api/lookups (create lookup item)
// Body: { type: 'court-types', name_en: '...', name_ar: '...', ... }
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { type, ...data } = req.body;

    // Reject lawyer creation (must use /api/lawyers)
    if (type === 'lawyers') {
      return res.status(400).json({
        success: false,
        error: 'Lawyer creation must use /api/lawyers endpoint directly'
      });
    }

    // Validate type
    const config = TYPE_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, error: `Invalid lookup type: ${type}` });
    }

    // Validate input
    const check = validation.check(data, 'lookup_item');
    if (!check.valid) {
      return res.status(400).json(check.result);
    }

    const firmId = req.user.firm_id;
    const { table, idCol } = config;

    // Build params - always include these base fields
    const params = {
      firm_id: firmId,
      name_en: data.name_en,
      name_ar: data.name_ar || null,
      name_fr: data.name_fr || null,
      sort_order: data.sort_order || 999
    };

    // Build INSERT columns/placeholders
    let columns = 'firm_id, name_en, name_ar, name_fr, is_system, sort_order';
    let placeholders = '@firm_id, @name_en, @name_ar, @name_fr, 0, @sort_order';

    // Task types: add icon column
    if (table === 'lookup_task_types') {
      columns += ', icon';
      placeholders += ', @icon';
      params.icon = data.icon || '\u2713';  // Default checkmark like desktop
    }

    // Entity types: add code column
    if (table === 'lookup_entity_types') {
      columns += ', code';
      placeholders += ', @code';
      params.code = data.code || null;
    }

    const result = await db.execute(
      `INSERT INTO ${table} (${columns})
       OUTPUT INSERTED.${idCol}
       VALUES (${placeholders})`,
      params
    );

    const newId = result.recordset[0][idCol];
    res.status(201).json({ success: true, id: newId });
  } catch (error) {
    console.error('Error creating lookup item:', error);
    res.status(500).json({ success: false, error: 'Failed to create lookup item' });
  }
});

// ============================================================================
// PUT /api/lookups/:id (update lookup item)
// Body: { type: 'court-types', name_en: '...', ... }
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, ...data } = req.body;

    // Validate type
    const config = TYPE_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, error: `Invalid lookup type: ${type}` });
    }

    // Validate input
    const check = validation.check(data, 'lookup_item');
    if (!check.valid) {
      return res.status(400).json(check.result);
    }

    const firmId = req.user.firm_id;
    const { table, idCol } = config;

    // Build SET clauses dynamically
    const setClauses = ['name_en = @name_en', 'updated_at = GETUTCDATE()'];
    const params = {
      name_en: data.name_en,
      id: id,
      firm_id: firmId
    };

    if (data.name_ar !== undefined) {
      setClauses.push('name_ar = @name_ar');
      params.name_ar = data.name_ar;
    }

    if (data.name_fr !== undefined) {
      setClauses.push('name_fr = @name_fr');
      params.name_fr = data.name_fr;
    }

    if (data.sort_order !== undefined) {
      setClauses.push('sort_order = @sort_order');
      params.sort_order = data.sort_order;
    }

    // Task types: icon
    if (table === 'lookup_task_types' && data.icon !== undefined) {
      setClauses.push('icon = @icon');
      params.icon = data.icon;
    }

    // Entity types: code
    if (table === 'lookup_entity_types' && data.code !== undefined) {
      setClauses.push('code = @code');
      params.code = data.code;
    }

    const result = await db.execute(
      `UPDATE ${table}
       SET ${setClauses.join(', ')}
       WHERE ${idCol} = @id AND firm_id = @firm_id AND is_system = 0`,
      params
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lookup item not found or is a system item (cannot modify)'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lookup item:', error);
    res.status(500).json({ success: false, error: 'Failed to update lookup item' });
  }
});

// ============================================================================
// DELETE /api/lookups/:type/:id (soft-delete lookup item)
// ============================================================================

router.delete('/:type/:id', async (req, res) => {
  try {
    const type = req.params.type;
    const id = parseInt(req.params.id);

    const config = TYPE_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, error: `Invalid lookup type: ${type}` });
    }

    const firmId = req.user.firm_id;
    const { table, idCol } = config;

    const result = await db.execute(
      `UPDATE ${table}
       SET is_active = 0, updated_at = GETUTCDATE()
       WHERE ${idCol} = @id AND firm_id = @firm_id AND is_system = 0`,
      { id: id, firm_id: firmId }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lookup item not found or is a system item (cannot delete)'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lookup item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lookup item' });
  }
});

module.exports = router;
