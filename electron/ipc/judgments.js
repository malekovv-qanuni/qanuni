/**
 * Judgments Module - Dual-Mode (IPC + REST)
 * 4 handlers: CRUD
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getAllJudgments(database) {
  return database.query(`SELECT j.*, m.matter_name, c.client_name FROM judgments j
    LEFT JOIN matters m ON j.matter_id = m.matter_id
    LEFT JOIN clients c ON m.client_id = c.client_id
    WHERE j.deleted_at IS NULL ORDER BY j.expected_date DESC`);
}

function addJudgment(database, logger, judgment) {
  const check = validation.check(judgment, 'judgment');
  if (!check.valid) return check.result;

  const id = database.generateId('JDG');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO judgments (judgment_id, matter_id, hearing_id, judgment_type,
    expected_date, actual_date, reminder_days, judgment_outcome, judgment_summary, amount_awarded,
    currency, in_favor_of, appeal_deadline, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, judgment.matter_id, judgment.hearing_id || null,
     judgment.judgment_type || 'first_instance',
     judgment.expected_date, judgment.actual_date || null,
     judgment.reminder_days || 7, judgment.judgment_outcome || null,
     judgment.judgment_summary || null, judgment.amount_awarded || null,
     judgment.currency || 'USD', judgment.in_favor_of || null,
     judgment.appeal_deadline || null, judgment.status || 'pending',
     judgment.notes || null, now, now]);

  logger.info('Judgment created', { judgmentId: id, matterId: judgment.matter_id });
  return { success: true, judgment_id: id };
}

function updateJudgment(database, logger, judgment) {
  if (!judgment.judgment_id) return { success: false, error: 'judgment_id is required' };

  const check = validation.check(judgment, 'judgment');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  database.execute(`UPDATE judgments SET matter_id=?, hearing_id=?, judgment_type=?, expected_date=?,
    actual_date=?, reminder_days=?, judgment_outcome=?, judgment_summary=?, amount_awarded=?, in_favor_of=?,
    appeal_deadline=?, status=?, notes=?, updated_at=? WHERE judgment_id=?`,
    [judgment.matter_id, judgment.hearing_id || null, judgment.judgment_type,
     judgment.expected_date, judgment.actual_date || null,
     judgment.reminder_days || 7, judgment.judgment_outcome || null,
     judgment.judgment_summary || null, judgment.amount_awarded || null,
     judgment.in_favor_of || null, judgment.appeal_deadline || null,
     judgment.status, judgment.notes || null, now, judgment.judgment_id]);

  logger.info('Judgment updated', { judgmentId: judgment.judgment_id });
  return { success: true };
}

function deleteJudgment(database, logger, id) {
  if (!id) return { success: false, error: 'judgment_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE judgments SET deleted_at = ? WHERE judgment_id = ?', [now, id]);

  logger.info('Judgment soft-deleted', { judgmentId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerJudgmentHandlers({ database, logger }) {

  ipcMain.handle('get-all-judgments', logger.wrapHandler('get-all-judgments', () => {
    return getAllJudgments(database);
  }));

  ipcMain.handle('add-judgment', logger.wrapHandler('add-judgment', (event, judgment) => {
    return addJudgment(database, logger, judgment);
  }));

  ipcMain.handle('update-judgment', logger.wrapHandler('update-judgment', (event, judgment) => {
    return updateJudgment(database, logger, judgment);
  }));

  ipcMain.handle('delete-judgment', logger.wrapHandler('delete-judgment', (event, id) => {
    return deleteJudgment(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllJudgments = getAllJudgments;
module.exports.addJudgment = addJudgment;
module.exports.updateJudgment = updateJudgment;
module.exports.deleteJudgment = deleteJudgment;
