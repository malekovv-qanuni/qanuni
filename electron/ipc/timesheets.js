/**
 * Timesheets Module - Dual-Mode (IPC + REST)
 * 5 handlers: CRUD + unbilled time query
 * Refactored to preserve EXACT working logic
 * @version 3.0.0 (Session 2 - Dual-Mode)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getTimesheets(database) {
  return database.query(`SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
      FROM timesheets t LEFT JOIN clients c ON t.client_id = c.client_id
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.date DESC`);
}

function getUnbilledTime(database, clientId, matterId) {
  let sql = `SELECT * FROM timesheets WHERE status != 'billed' AND billable = 1 AND deleted_at IS NULL`;
  const params = [];
  if (clientId) { sql += ' AND client_id = ?'; params.push(clientId); }
  if (matterId) { sql += ' AND matter_id = ?'; params.push(matterId); }
  sql += ' ORDER BY date ASC';
  return database.query(sql, params);
}

function addTimesheet(database, logger, ts) {
  const check = validation.check(ts, 'timesheet');
  if (!check.valid) return check.result;

  const id = database.generateId('TS');
  const now = new Date().toISOString();
  const minutes = parseInt(ts.minutes) || 0;
  const ratePerHour = ts.rate_per_hour ? parseFloat(ts.rate_per_hour) : null;

  database.execute(`INSERT INTO timesheets (timesheet_id, lawyer_id, client_id, matter_id, date,
      minutes, narrative, billable, rate_per_hour, rate_currency, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ts.lawyer_id || null, ts.client_id, ts.matter_id || null, ts.date,
       minutes, ts.narrative, ts.billable ? 1 : 0, ratePerHour,
       ts.rate_currency || 'USD', ts.status || 'draft', now, now]);

  logger.info('Timesheet created', { timesheetId: id, matterId: ts.matter_id });
  return { success: true, timesheetId: id };
}

function updateTimesheet(database, logger, ts) {
  if (!ts.timesheet_id) return { success: false, error: 'timesheet_id is required' };

  const check = validation.check(ts, 'timesheet');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  const minutes = parseInt(ts.minutes) || 0;
  const ratePerHour = ts.rate_per_hour ? parseFloat(ts.rate_per_hour) : null;

  database.execute(`UPDATE timesheets SET lawyer_id=?, client_id=?, matter_id=?, date=?,
      minutes=?, narrative=?, billable=?, rate_per_hour=?, rate_currency=?, status=?, updated_at=?
      WHERE timesheet_id=?`,
      [ts.lawyer_id || null, ts.client_id, ts.matter_id || null, ts.date,
       minutes, ts.narrative, ts.billable ? 1 : 0, ratePerHour,
       ts.rate_currency || 'USD', ts.status || 'draft', now, ts.timesheet_id]);

  logger.info('Timesheet updated', { timesheetId: ts.timesheet_id });
  return { success: true };
}

function deleteTimesheet(database, logger, id) {
  if (!id) return { success: false, error: 'timesheet_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE timesheets SET deleted_at = ? WHERE timesheet_id = ?', [now, id]);

  logger.info('Timesheet soft-deleted', { timesheetId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerTimesheetHandlers({ database, logger }) {

  ipcMain.handle('get-all-timesheets', logger.wrapHandler('get-all-timesheets', () => {
    return getTimesheets(database);
  }));

  ipcMain.handle('get-unbilled-time', logger.wrapHandler('get-unbilled-time', (event, clientId, matterId) => {
    return getUnbilledTime(database, clientId, matterId);
  }));

  ipcMain.handle('add-timesheet', logger.wrapHandler('add-timesheet', (event, ts) => {
    return addTimesheet(database, logger, ts);
  }));

  ipcMain.handle('update-timesheet', logger.wrapHandler('update-timesheet', (event, ts) => {
    return updateTimesheet(database, logger, ts);
  }));

  ipcMain.handle('delete-timesheet', logger.wrapHandler('delete-timesheet', (event, id) => {
    return deleteTimesheet(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getTimesheets = getTimesheets;
module.exports.getUnbilledTime = getUnbilledTime;
module.exports.addTimesheet = addTimesheet;
module.exports.updateTimesheet = updateTimesheet;
module.exports.deleteTimesheet = deleteTimesheet;
