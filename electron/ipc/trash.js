/**
 * Qanuni IPC Handlers — Trash (Dual-Mode: IPC + REST)
 * 5 handlers: get items, count, restore, permanent delete, empty all
 * @version 3.0.0 (Dual-Mode Refactor)
 */

const { ipcMain } = require('electron');

// ============================================================================
// SHARED CONFIG
// ============================================================================

const TABLE_MAP = {
  client:      { table: 'clients',      idCol: 'client_id',      extraRestore: ', active = 1' },
  matter:      { table: 'matters',      idCol: 'matter_id',      extraRestore: '' },
  hearing:     { table: 'hearings',     idCol: 'hearing_id',     extraRestore: '' },
  judgment:    { table: 'judgments',     idCol: 'judgment_id',    extraRestore: '' },
  task:        { table: 'tasks',        idCol: 'task_id',        extraRestore: '' },
  timesheet:   { table: 'timesheets',   idCol: 'timesheet_id',   extraRestore: '' },
  expense:     { table: 'expenses',     idCol: 'expense_id',     extraRestore: '' },
  invoice:     { table: 'invoices',     idCol: 'invoice_id',     extraRestore: '' },
  appointment: { table: 'appointments', idCol: 'appointment_id', extraRestore: '' },
  advance:     { table: 'advances',     idCol: 'advance_id',     extraRestore: '' },
  deadline:    { table: 'deadlines',    idCol: 'deadline_id',    extraRestore: '' },
  lawyer:      { table: 'lawyers',      idCol: 'lawyer_id',      extraRestore: ', active = 1' }
};

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getTrashItems(database) {
  return {
    clients: database.query(`SELECT client_id as id, 'client' as type, client_name as name, deleted_at
      FROM clients WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
    matters: database.query(`SELECT m.matter_id as id, 'matter' as type, m.matter_name as name, m.deleted_at, c.client_name
      FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
      WHERE m.deleted_at IS NOT NULL ORDER BY m.deleted_at DESC`),
    hearings: database.query(`SELECT h.hearing_id as id, 'hearing' as type,
      m.matter_name || ' - ' || h.hearing_date as name, h.deleted_at
      FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
      WHERE h.deleted_at IS NOT NULL ORDER BY h.deleted_at DESC`),
    judgments: database.query(`SELECT j.judgment_id as id, 'judgment' as type,
      m.matter_name || ' - ' || COALESCE(j.actual_date, j.expected_date) as name, j.deleted_at
      FROM judgments j LEFT JOIN matters m ON j.matter_id = m.matter_id
      WHERE j.deleted_at IS NOT NULL ORDER BY j.deleted_at DESC`),
    tasks: database.query(`SELECT task_id as id, 'task' as type, title as name, deleted_at
      FROM tasks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
    timesheets: database.query(`SELECT ts.timesheet_id as id, 'timesheet' as type,
      l.name || ' - ' || ts.date || ' (' || ts.minutes || ' min)' as name, ts.deleted_at
      FROM timesheets ts LEFT JOIN lawyers l ON ts.lawyer_id = l.lawyer_id
      WHERE ts.deleted_at IS NOT NULL ORDER BY ts.deleted_at DESC`),
    expenses: database.query(`SELECT expense_id as id, 'expense' as type,
      description || ' - $' || amount as name, deleted_at
      FROM expenses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
    invoices: database.query(`SELECT i.invoice_id as id, 'invoice' as type,
      i.invoice_number || ' - ' || c.client_name as name, i.deleted_at
      FROM invoices i LEFT JOIN clients c ON i.client_id = c.client_id
      WHERE i.deleted_at IS NOT NULL ORDER BY i.deleted_at DESC`),
    appointments: database.query(`SELECT appointment_id as id, 'appointment' as type,
      title || ' - ' || date as name, deleted_at
      FROM appointments WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
    advances: database.query(`SELECT a.advance_id as id, 'advance' as type,
      a.advance_type || ' - $' || a.amount as name, a.deleted_at
      FROM advances a WHERE a.deleted_at IS NOT NULL ORDER BY a.deleted_at DESC`),
    deadlines: database.query(`SELECT deadline_id as id, 'deadline' as type, title as name, deleted_at
      FROM deadlines WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`)
  };
}

function getTrashCount(database) {
  const counts = {
    clients:      database.queryOne('SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NOT NULL')?.count || 0,
    matters:      database.queryOne('SELECT COUNT(*) as count FROM matters WHERE deleted_at IS NOT NULL')?.count || 0,
    hearings:     database.queryOne('SELECT COUNT(*) as count FROM hearings WHERE deleted_at IS NOT NULL')?.count || 0,
    judgments:    database.queryOne('SELECT COUNT(*) as count FROM judgments WHERE deleted_at IS NOT NULL')?.count || 0,
    tasks:        database.queryOne('SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NOT NULL')?.count || 0,
    timesheets:   database.queryOne('SELECT COUNT(*) as count FROM timesheets WHERE deleted_at IS NOT NULL')?.count || 0,
    expenses:     database.queryOne('SELECT COUNT(*) as count FROM expenses WHERE deleted_at IS NOT NULL')?.count || 0,
    invoices:     database.queryOne('SELECT COUNT(*) as count FROM invoices WHERE deleted_at IS NOT NULL')?.count || 0,
    appointments: database.queryOne('SELECT COUNT(*) as count FROM appointments WHERE deleted_at IS NOT NULL')?.count || 0,
    advances:     database.queryOne('SELECT COUNT(*) as count FROM advances WHERE deleted_at IS NOT NULL')?.count || 0,
    deadlines:    database.queryOne('SELECT COUNT(*) as count FROM deadlines WHERE deleted_at IS NOT NULL')?.count || 0
  };
  counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
  return counts;
}

function restoreTrashItem(database, logger, type, id) {
  const config = TABLE_MAP[type];
  if (!config) return { success: false, error: 'Unknown item type' };
  if (!id) return { success: false, error: 'id is required' };

  database.execute(
    `UPDATE ${config.table} SET deleted_at = NULL${config.extraRestore} WHERE ${config.idCol} = ?`, [id]);
  logger.info('Trash item restored', { type, id });
  return { success: true };
}

function permanentDeleteItem(database, logger, type, id) {
  const config = TABLE_MAP[type];
  if (!config) return { success: false, error: 'Unknown item type' };
  if (!id) return { success: false, error: 'id is required' };

  database.execute(`DELETE FROM ${config.table} WHERE ${config.idCol} = ?`, [id]);
  logger.warn('Item permanently deleted', { type, id });
  return { success: true };
}

function emptyTrash(database, logger) {
  const tables = [
    'clients', 'matters', 'hearings', 'judgments', 'tasks',
    'timesheets', 'expenses', 'invoices', 'appointments', 'advances', 'deadlines'
  ];

  database.transaction(() => {
    tables.forEach(table => {
      database.execute(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
    });
  });

  logger.warn('All trash emptied', { tables: tables.length });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerTrashHandlers({ database, logger }) {

  ipcMain.handle('get-trash-items', logger.wrapHandler('get-trash-items', () => {
    return getTrashItems(database);
  }));

  ipcMain.handle('get-trash-count', logger.wrapHandler('get-trash-count', () => {
    return getTrashCount(database);
  }));

  ipcMain.handle('restore-trash-item', logger.wrapHandler('restore-trash-item', (event, type, id) => {
    return restoreTrashItem(database, logger, type, id);
  }));

  ipcMain.handle('permanent-delete-item', logger.wrapHandler('permanent-delete-item', (event, type, id) => {
    return permanentDeleteItem(database, logger, type, id);
  }));

  ipcMain.handle('empty-trash', logger.wrapHandler('empty-trash', () => {
    return emptyTrash(database, logger);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getTrashItems = getTrashItems;
module.exports.getTrashCount = getTrashCount;
module.exports.restoreTrashItem = restoreTrashItem;
module.exports.permanentDeleteItem = permanentDeleteItem;
module.exports.emptyTrash = emptyTrash;
