/**
 * Lawyers Module - Dual-Mode (IPC + REST)
 * 7 handlers: CRUD + get-all (incl inactive) + usage check + reactivate
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getLawyers(database) {
  return database.query(
    'SELECT lawyer_id, name as full_name, name_arabic as full_name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active FROM lawyers WHERE active = 1 ORDER BY name'
  );
}

function getAllLawyers(database) {
  return database.query(
    'SELECT lawyer_id, name as full_name, name_arabic as full_name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active FROM lawyers ORDER BY active DESC, name'
  );
}

function addLawyer(database, logger, lawyer) {
  const check = validation.check(lawyer, 'lawyer');
  if (!check.valid) return check.result;

  const id = database.generateId('LAW');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO lawyers (lawyer_id, name, name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, lawyer.full_name, lawyer.full_name_arabic || null, lawyer.initials || null,
     lawyer.email || null, lawyer.phone || null,
     lawyer.hourly_rate || 0, lawyer.hourly_rate_currency || 'USD', now]);

  logger.info('Lawyer created', { lawyerId: id, name: lawyer.full_name });
  return { success: true, lawyerId: id };
}

function updateLawyer(database, logger, lawyer) {
  if (!lawyer.lawyer_id) {
    return { success: false, error: 'lawyer_id is required for update' };
  }
  const check = validation.check(lawyer, 'lawyer');
  if (!check.valid) return check.result;

  database.execute(`UPDATE lawyers SET name=?, name_arabic=?, initials=?, email=?, phone=?, hourly_rate=?, hourly_rate_currency=? WHERE lawyer_id=?`,
    [lawyer.full_name, lawyer.full_name_arabic || null, lawyer.initials || null,
     lawyer.email || null, lawyer.phone || null,
     lawyer.hourly_rate || 0, lawyer.hourly_rate_currency || 'USD', lawyer.lawyer_id]);

  logger.info('Lawyer updated', { lawyerId: lawyer.lawyer_id });
  return { success: true };
}

function deleteLawyer(database, logger, id) {
  if (!id) return { success: false, error: 'lawyer_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE lawyers SET active = 0, deleted_at = ? WHERE lawyer_id = ?', [now, id]);

  logger.info('Lawyer soft-deleted', { lawyerId: id });
  return { success: true };
}

function checkLawyerUsage(database, lawyerId) {
  if (!lawyerId) return { success: false, error: 'lawyerId is required' };

  const usage = {
    timesheets: 0,
    expenses: 0,
    tasks: 0,
    advances: 0,
    matters: 0,
    hasData: false
  };

  const ts = database.queryOne('SELECT COUNT(*) as count FROM timesheets WHERE lawyer_id = ? AND deleted_at IS NULL', [lawyerId]);
  usage.timesheets = ts?.count || 0;

  const exp = database.queryOne('SELECT COUNT(*) as count FROM expenses WHERE paid_by_lawyer_id = ? AND deleted_at IS NULL', [lawyerId]);
  usage.expenses = exp?.count || 0;

  const tasks = database.queryOne('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND deleted_at IS NULL', [lawyerId]);
  usage.tasks = tasks?.count || 0;

  const adv = database.queryOne('SELECT COUNT(*) as count FROM advances WHERE lawyer_id = ? AND advance_type = ? AND deleted_at IS NULL', [lawyerId, 'lawyer_advance']);
  usage.advances = adv?.count || 0;

  const mat = database.queryOne('SELECT COUNT(*) as count FROM matters WHERE responsible_lawyer_id = ? AND deleted_at IS NULL', [lawyerId]);
  usage.matters = mat?.count || 0;

  usage.hasData = (usage.timesheets + usage.expenses + usage.tasks + usage.advances + usage.matters) > 0;

  return usage;
}

function reactivateLawyer(database, logger, id) {
  if (!id) return { success: false, error: 'lawyer_id is required' };

  database.execute('UPDATE lawyers SET active = 1, deleted_at = NULL WHERE lawyer_id = ?', [id]);

  logger.info('Lawyer reactivated', { lawyerId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerLawyerHandlers({ database, logger }) {

  ipcMain.handle('get-lawyers', logger.wrapHandler('get-lawyers', () => {
    return getLawyers(database);
  }));

  ipcMain.handle('get-all-lawyers', logger.wrapHandler('get-all-lawyers', () => {
    return getAllLawyers(database);
  }));

  ipcMain.handle('add-lawyer', logger.wrapHandler('add-lawyer', (event, lawyer) => {
    return addLawyer(database, logger, lawyer);
  }));

  ipcMain.handle('update-lawyer', logger.wrapHandler('update-lawyer', (event, lawyer) => {
    return updateLawyer(database, logger, lawyer);
  }));

  ipcMain.handle('delete-lawyer', logger.wrapHandler('delete-lawyer', (event, id) => {
    return deleteLawyer(database, logger, id);
  }));

  ipcMain.handle('check-lawyer-usage', logger.wrapHandler('check-lawyer-usage', (event, lawyerId) => {
    return checkLawyerUsage(database, lawyerId);
  }));

  ipcMain.handle('reactivate-lawyer', logger.wrapHandler('reactivate-lawyer', (event, id) => {
    return reactivateLawyer(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getLawyers = getLawyers;
module.exports.getAllLawyers = getAllLawyers;
module.exports.addLawyer = addLawyer;
module.exports.updateLawyer = updateLawyer;
module.exports.deleteLawyer = deleteLawyer;
module.exports.checkLawyerUsage = checkLawyerUsage;
module.exports.reactivateLawyer = reactivateLawyer;
