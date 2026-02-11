/**
 * Lookups Module - Dual-Mode (IPC + REST)
 * 9 handlers: 6 read handlers + add/update/delete for lookup items
 * Note: Lawyers are also handled via lookup CRUD (from Settings page)
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');

// ============================================================================
// SHARED CONFIG
// ============================================================================

const TYPE_MAP = {
  'courtTypes': 'court-types', 'court-types': 'court-types',
  'regions': 'regions',
  'hearingPurposes': 'hearing-purposes', 'hearing-purposes': 'hearing-purposes',
  'taskTypes': 'task-types', 'task-types': 'task-types',
  'expenseCategories': 'expense-categories', 'expense-categories': 'expense-categories',
  'lawyers': 'lawyers'
};

const TABLE_CONFIGS = {
  'court-types': { table: 'lookup_court_types', id: 'court_type_id' },
  'regions': { table: 'lookup_regions', id: 'region_id' },
  'hearing-purposes': { table: 'lookup_hearing_purposes', id: 'purpose_id' },
  'task-types': { table: 'lookup_task_types', id: 'task_type_id' },
  'expense-categories': { table: 'lookup_expense_categories', id: 'category_id' }
};

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getCourtTypes(database) {
  return database.query('SELECT * FROM lookup_court_types WHERE active = 1 ORDER BY sort_order');
}

function getRegions(database) {
  return database.query('SELECT * FROM lookup_regions WHERE active = 1 ORDER BY sort_order');
}

function getHearingPurposes(database) {
  return database.query('SELECT * FROM lookup_hearing_purposes WHERE active = 1 ORDER BY sort_order');
}

function getTaskTypes(database) {
  return database.query('SELECT * FROM lookup_task_types WHERE active = 1 ORDER BY sort_order');
}

function getExpenseCategories(database) {
  return database.query('SELECT * FROM lookup_expense_categories WHERE active = 1 ORDER BY sort_order');
}

function getEntityTypes(database) {
  return database.query('SELECT * FROM lookup_entity_types WHERE active = 1 ORDER BY sort_order');
}

function addLookupItem(database, logger, type, data) {
  const normalizedType = TYPE_MAP[type];
  if (!normalizedType) return { success: false, error: 'Invalid lookup type: ' + type };

  // Handle lawyers separately
  if (normalizedType === 'lawyers') {
    const id = database.generateId('LAW');
    const now = new Date().toISOString();
    database.execute(`INSERT INTO lawyers (lawyer_id, name, name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, data.full_name, data.full_name_arabic || null, data.initials || null,
       data.email || null, data.phone || null,
       data.hourly_rate || 0, data.hourly_rate_currency || 'USD', now]);
    logger.info('Lawyer added via lookups', { lawyerId: id });
    return { success: true, lawyerId: id };
  }

  const cfg = TABLE_CONFIGS[normalizedType];
  if (!cfg) return { success: false, error: 'Invalid lookup type: ' + type };

  if (normalizedType === 'task-types') {
    database.execute(`INSERT INTO ${cfg.table} (name_en, name_ar, name_fr, icon, is_system, sort_order, active) VALUES (?, ?, ?, ?, 0, 999, 1)`,
      [data.name_en, data.name_ar || null, data.name_fr || null, data.icon || '\u2713']);
  } else {
    database.execute(`INSERT INTO ${cfg.table} (name_en, name_ar, name_fr, is_system, sort_order, active) VALUES (?, ?, ?, 0, 999, 1)`,
      [data.name_en, data.name_ar || null, data.name_fr || null]);
  }

  logger.info('Lookup item added', { type: normalizedType, name: data.name_en });
  return { success: true };
}

function updateLookupItem(database, logger, type, data) {
  const normalizedType = TYPE_MAP[type];
  if (!normalizedType) return { success: false, error: 'Invalid lookup type: ' + type };

  if (normalizedType === 'lawyers') {
    database.execute(`UPDATE lawyers SET name=?, name_arabic=?, initials=?, email=?, phone=?, hourly_rate=?, hourly_rate_currency=? WHERE lawyer_id=?`,
      [data.full_name, data.full_name_arabic || null, data.initials || null,
       data.email || null, data.phone || null,
       data.hourly_rate || 0, data.hourly_rate_currency || 'USD', data.lawyer_id]);
    logger.info('Lawyer updated via lookups', { lawyerId: data.lawyer_id });
    return { success: true };
  }

  const cfg = TABLE_CONFIGS[normalizedType];
  if (!cfg) return { success: false, error: 'Invalid lookup type: ' + type };

  if (normalizedType === 'task-types') {
    database.execute(`UPDATE ${cfg.table} SET name_en=?, name_ar=?, name_fr=?, icon=? WHERE ${cfg.id}=?`,
      [data.name_en, data.name_ar || null, data.name_fr || null, data.icon, data[cfg.id]]);
  } else {
    database.execute(`UPDATE ${cfg.table} SET name_en=?, name_ar=?, name_fr=? WHERE ${cfg.id}=?`,
      [data.name_en, data.name_ar || null, data.name_fr || null, data[cfg.id]]);
  }

  logger.info('Lookup item updated', { type: normalizedType, id: data[cfg?.id] });
  return { success: true };
}

function deleteLookupItem(database, logger, type, item) {
  const normalizedType = TYPE_MAP[type];
  if (!normalizedType) return { success: false, error: 'Invalid lookup type: ' + type };

  if (normalizedType === 'lawyers') {
    const id = item.lawyer_id || item;
    database.execute('UPDATE lawyers SET active = 0 WHERE lawyer_id = ?', [id]);
    logger.info('Lawyer deactivated via lookups', { lawyerId: id });
    return { success: true };
  }

  const cfg = TABLE_CONFIGS[normalizedType];
  if (!cfg) return { success: false, error: 'Invalid lookup type: ' + type };

  const id = item[cfg.id] || item;
  database.execute(`UPDATE ${cfg.table} SET active = 0 WHERE ${cfg.id} = ?`, [id]);

  logger.info('Lookup item deactivated', { type: normalizedType, id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerLookupHandlers({ database, logger }) {

  ipcMain.handle('get-court-types', logger.wrapHandler('get-court-types', () => {
    return getCourtTypes(database);
  }));

  ipcMain.handle('get-regions', logger.wrapHandler('get-regions', () => {
    return getRegions(database);
  }));

  ipcMain.handle('get-hearing-purposes', logger.wrapHandler('get-hearing-purposes', () => {
    return getHearingPurposes(database);
  }));

  ipcMain.handle('get-task-types', logger.wrapHandler('get-task-types', () => {
    return getTaskTypes(database);
  }));

  ipcMain.handle('get-expense-categories', logger.wrapHandler('get-expense-categories', () => {
    return getExpenseCategories(database);
  }));

  ipcMain.handle('get-entity-types', logger.wrapHandler('get-entity-types', () => {
    return getEntityTypes(database);
  }));

  ipcMain.handle('add-lookup-item', logger.wrapHandler('add-lookup-item', (event, type, data) => {
    return addLookupItem(database, logger, type, data);
  }));

  ipcMain.handle('update-lookup-item', logger.wrapHandler('update-lookup-item', (event, type, data) => {
    return updateLookupItem(database, logger, type, data);
  }));

  ipcMain.handle('delete-lookup-item', logger.wrapHandler('delete-lookup-item', (event, type, item) => {
    return deleteLookupItem(database, logger, type, item);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getCourtTypes = getCourtTypes;
module.exports.getRegions = getRegions;
module.exports.getHearingPurposes = getHearingPurposes;
module.exports.getTaskTypes = getTaskTypes;
module.exports.getExpenseCategories = getExpenseCategories;
module.exports.getEntityTypes = getEntityTypes;
module.exports.addLookupItem = addLookupItem;
module.exports.updateLookupItem = updateLookupItem;
module.exports.deleteLookupItem = deleteLookupItem;
