/**
 * Hearings Module - Dual-Mode (IPC + REST)
 * 4 handlers: CRUD
 * Refactored to preserve EXACT working logic
 * @version 3.0.0 (Session 2 - Dual-Mode)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getHearings(database) {
  return database.query(`SELECT h.*, m.matter_name, m.client_id, c.client_name,
      lc.name_en as court_name, lc.name_ar as court_name_ar,
      lr.name_en as region_name, lr.name_ar as region_name_ar,
      lp.name_en as purpose_name, lp.name_ar as purpose_name_ar
      FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
      LEFT JOIN clients c ON m.client_id = c.client_id
      LEFT JOIN lookup_court_types lc ON h.court_type_id = lc.court_type_id
      LEFT JOIN lookup_regions lr ON h.court_region_id = lr.region_id
      LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
      WHERE h.deleted_at IS NULL
      ORDER BY h.hearing_date DESC`);
}

function addHearing(database, logger, hearing) {
  const check = validation.check(hearing, 'hearing');
  if (!check.valid) return check.result;

  const id = database.generateId('HRG');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time,
      end_time, court_type_id, court_region_id, judge, purpose_id, purpose_custom, outcome,
      outcome_notes, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, hearing.matter_id, hearing.hearing_date, hearing.hearing_time || null,
       hearing.end_time || null, hearing.court_type_id || null, hearing.court_region_id || null,
       hearing.judge || null, hearing.purpose_id || null, hearing.purpose_custom || null,
       hearing.outcome || null, hearing.outcome_notes || null, hearing.notes || null, now, now]);

  logger.info('Hearing created', { hearingId: id, matterId: hearing.matter_id });
  return { success: true, hearing_id: id };
}

function updateHearing(database, logger, hearing) {
  if (!hearing.hearing_id) return { success: false, error: 'hearing_id is required' };

  const check = validation.check(hearing, 'hearing');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  database.execute(`UPDATE hearings SET matter_id=?, hearing_date=?, hearing_time=?, end_time=?,
      court_type_id=?, court_region_id=?, judge=?, purpose_id=?, purpose_custom=?, outcome=?,
      outcome_notes=?, notes=?, updated_at=? WHERE hearing_id=?`,
      [hearing.matter_id, hearing.hearing_date, hearing.hearing_time || null,
       hearing.end_time || null, hearing.court_type_id || null, hearing.court_region_id || null,
       hearing.judge || null, hearing.purpose_id || null, hearing.purpose_custom || null,
       hearing.outcome || null, hearing.outcome_notes || null, hearing.notes || null,
       now, hearing.hearing_id]);

  logger.info('Hearing updated', { hearingId: hearing.hearing_id });
  return { success: true };
}

function deleteHearing(database, logger, id) {
  if (!id) return { success: false, error: 'hearing_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE hearings SET deleted_at = ? WHERE hearing_id = ?', [now, id]);

  logger.info('Hearing soft-deleted', { hearingId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerHearingHandlers({ database, logger }) {

  ipcMain.handle('get-all-hearings', logger.wrapHandler('get-all-hearings', () => {
    return getHearings(database);
  }));

  ipcMain.handle('add-hearing', logger.wrapHandler('add-hearing', (event, hearing) => {
    return addHearing(database, logger, hearing);
  }));

  ipcMain.handle('update-hearing', logger.wrapHandler('update-hearing', (event, hearing) => {
    return updateHearing(database, logger, hearing);
  }));

  ipcMain.handle('delete-hearing', logger.wrapHandler('delete-hearing', (event, id) => {
    return deleteHearing(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getHearings = getHearings;
module.exports.addHearing = addHearing;
module.exports.updateHearing = updateHearing;
module.exports.deleteHearing = deleteHearing;
