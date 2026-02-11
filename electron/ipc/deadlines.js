/**
 * Deadlines Module - Dual-Mode (IPC + REST)
 * 6 handlers: CRUD + by-judgment + status update
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getAllDeadlines(database) {
  return database.query(`SELECT d.*, m.matter_name, c.client_name, j.judgment_type, j.appeal_deadline as judgment_appeal_deadline
    FROM deadlines d
    LEFT JOIN matters m ON d.matter_id = m.matter_id
    LEFT JOIN clients c ON d.client_id = c.client_id
    LEFT JOIN judgments j ON d.judgment_id = j.judgment_id
    WHERE d.deleted_at IS NULL
    ORDER BY d.deadline_date ASC`);
}

function getDeadlinesByJudgment(database, judgmentId) {
  if (!judgmentId) return [];
  return database.query('SELECT * FROM deadlines WHERE judgment_id = ? ORDER BY deadline_date ASC', [judgmentId]);
}

function addDeadline(database, logger, deadline) {
  const check = validation.check(deadline, 'deadline');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();

  database.execute(`INSERT INTO deadlines (client_id, matter_id, judgment_id, title, deadline_date, reminder_days, priority, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [deadline.client_id || null, deadline.matter_id, deadline.judgment_id || null,
     deadline.title, deadline.deadline_date,
     deadline.reminder_days || 7, deadline.priority || 'medium',
     deadline.status || 'pending', deadline.notes || '', now]);

  logger.info('Deadline created', { matterId: deadline.matter_id });
  return { success: true };
}

function updateDeadline(database, logger, deadline) {
  if (!deadline.deadline_id) return { success: false, error: 'deadline_id is required' };

  const check = validation.check(deadline, 'deadline');
  if (!check.valid) return check.result;

  database.execute(`UPDATE deadlines SET client_id=?, matter_id=?, judgment_id=?, title=?, deadline_date=?, reminder_days=?,
    priority=?, status=?, notes=? WHERE deadline_id=?`,
    [deadline.client_id || null, deadline.matter_id || null, deadline.judgment_id || null,
     deadline.title, deadline.deadline_date,
     deadline.reminder_days || 7, deadline.priority || 'medium',
     deadline.status || 'pending', deadline.notes || '', deadline.deadline_id]);

  logger.info('Deadline updated', { deadlineId: deadline.deadline_id });
  return { success: true };
}

function updateDeadlineStatus(database, logger, deadlineId, status) {
  if (!deadlineId) return { success: false, error: 'deadlineId is required' };
  if (!status) return { success: false, error: 'status is required' };

  database.execute('UPDATE deadlines SET status = ? WHERE deadline_id = ?', [status, deadlineId]);

  logger.info('Deadline status updated', { deadlineId, status });
  return { success: true };
}

function deleteDeadline(database, logger, id) {
  if (!id) return { success: false, error: 'deadline_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE deadlines SET deleted_at = ? WHERE deadline_id = ?', [now, id]);

  logger.info('Deadline soft-deleted', { deadlineId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerDeadlineHandlers({ database, logger }) {

  ipcMain.handle('get-all-deadlines', logger.wrapHandler('get-all-deadlines', () => {
    return getAllDeadlines(database);
  }));

  ipcMain.handle('get-deadlines-by-judgment', logger.wrapHandler('get-deadlines-by-judgment', (event, judgmentId) => {
    return getDeadlinesByJudgment(database, judgmentId);
  }));

  ipcMain.handle('add-deadline', logger.wrapHandler('add-deadline', (event, deadline) => {
    return addDeadline(database, logger, deadline);
  }));

  ipcMain.handle('update-deadline', logger.wrapHandler('update-deadline', (event, deadline) => {
    return updateDeadline(database, logger, deadline);
  }));

  ipcMain.handle('update-deadline-status', logger.wrapHandler('update-deadline-status', (event, deadlineId, status) => {
    return updateDeadlineStatus(database, logger, deadlineId, status);
  }));

  ipcMain.handle('delete-deadline', logger.wrapHandler('delete-deadline', (event, id) => {
    return deleteDeadline(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllDeadlines = getAllDeadlines;
module.exports.getDeadlinesByJudgment = getDeadlinesByJudgment;
module.exports.addDeadline = addDeadline;
module.exports.updateDeadline = updateDeadline;
module.exports.updateDeadlineStatus = updateDeadlineStatus;
module.exports.deleteDeadline = deleteDeadline;
