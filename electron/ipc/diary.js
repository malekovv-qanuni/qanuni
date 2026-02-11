/**
 * Diary / Matter Timeline Module - Dual-Mode (IPC + REST)
 * 4 handlers: get-matter-timeline (aggregated), diary CRUD
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getMatterTimeline(database, matterId) {
  if (!matterId) return [];

  const entries = [];

  // 1. Hearings
  const hearings = database.query(`
    SELECT h.*,
      lc.name_en as court_name, lc.name_ar as court_name_ar,
      lr.name_en as region_name, lr.name_ar as region_name_ar,
      lp.name_en as purpose_name, lp.name_ar as purpose_name_ar,
      l.name as lawyer_name, l.name_arabic as lawyer_name_ar
    FROM hearings h
    LEFT JOIN lookup_court_types lc ON h.court_type_id = lc.court_type_id
    LEFT JOIN lookup_regions lr ON h.court_region_id = lr.region_id
    LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
    LEFT JOIN lawyers l ON h.attended_by = l.lawyer_id
    WHERE h.matter_id = ? AND h.deleted_at IS NULL
  `, [matterId]);
  (hearings || []).forEach(h => {
    entries.push({
      id: h.hearing_id, type: 'hearing', source: 'auto',
      date: h.hearing_date, time: h.hearing_time,
      title: h.purpose_name || 'Hearing',
      title_ar: h.purpose_name_ar || '\u062c\u0644\u0633\u0629',
      description: h.notes,
      court_name: h.court_name, court_name_ar: h.court_name_ar,
      region_name: h.region_name, region_name_ar: h.region_name_ar,
      outcome: h.outcome,
      lawyer_name: h.lawyer_name, lawyer_name_ar: h.lawyer_name_ar
    });
  });

  // 2. Judgments
  const judgments = database.query(`
    SELECT j.* FROM judgments j
    WHERE j.matter_id = ? AND j.deleted_at IS NULL
  `, [matterId]);
  (judgments || []).forEach(j => {
    entries.push({
      id: j.judgment_id, type: 'judgment', source: 'auto',
      date: j.actual_date || j.expected_date,
      title: j.judgment_type || 'Judgment',
      title_ar: '\u062d\u0643\u0645',
      description: j.judgment_summary,
      outcome: j.judgment_outcome, in_favor: j.in_favor_of,
      amount: j.amount_awarded, currency: j.currency
    });
  });

  // 3. Timesheets
  const timesheets = database.query(`
    SELECT t.*, l.name as lawyer_name, l.name_arabic as lawyer_name_ar
    FROM timesheets t
    LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
    WHERE t.matter_id = ? AND t.deleted_at IS NULL
  `, [matterId]);
  (timesheets || []).forEach(t => {
    entries.push({
      id: t.timesheet_id, type: 'timesheet', source: 'auto',
      date: t.date,
      title: t.narrative, title_ar: t.narrative,
      description: null,
      lawyer_name: t.lawyer_name, lawyer_name_ar: t.lawyer_name_ar,
      minutes: t.minutes, rate: t.rate_per_hour,
      billable: t.billable,
      amount: t.billable && t.rate_per_hour ? (t.minutes / 60) * t.rate_per_hour : null,
      currency: t.rate_currency
    });
  });

  // 4. Expenses
  const expenses = database.query(`
    SELECT e.*,
      lec.name_en as category_name, lec.name_ar as category_name_ar,
      l.name as lawyer_name, l.name_arabic as lawyer_name_ar
    FROM expenses e
    LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
    LEFT JOIN lawyers l ON e.lawyer_id = l.lawyer_id
    WHERE e.matter_id = ? AND e.deleted_at IS NULL
  `, [matterId]);
  (expenses || []).forEach(e => {
    entries.push({
      id: e.expense_id, type: 'expense', source: 'auto',
      date: e.date,
      title: e.description, title_ar: e.description,
      description: e.notes,
      lawyer_name: e.lawyer_name, lawyer_name_ar: e.lawyer_name_ar,
      amount: e.amount, currency: e.currency
    });
  });

  // 5. Tasks
  const tasks = database.query(`
    SELECT t.*, l.name as lawyer_name, l.name_arabic as lawyer_name_ar
    FROM tasks t
    LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
    WHERE t.matter_id = ? AND t.deleted_at IS NULL
  `, [matterId]);
  (tasks || []).forEach(t => {
    entries.push({
      id: t.task_id, type: 'task', source: 'auto',
      date: t.due_date || t.assigned_date,
      title: t.title, title_ar: t.title,
      description: t.description,
      lawyer_name: t.lawyer_name, lawyer_name_ar: t.lawyer_name_ar,
      status: t.status, priority: t.priority
    });
  });

  // 6. Diary entries (manual)
  const diary = database.query(`
    SELECT d.*, l.name as lawyer_name, l.name_arabic as lawyer_name_ar
    FROM matter_diary d
    LEFT JOIN lawyers l ON d.created_by = l.lawyer_id
    WHERE d.matter_id = ? AND d.deleted_at IS NULL
  `, [matterId]);
  (diary || []).forEach(d => {
    entries.push({
      id: d.entry_id, type: 'diary', subtype: d.entry_type, source: 'manual',
      date: d.entry_date,
      title: d.title, title_ar: d.title,
      description: d.description,
      lawyer_name: d.lawyer_name, lawyer_name_ar: d.lawyer_name_ar,
      created_by: d.created_by
    });
  });

  // Sort by date descending (newest first)
  entries.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  return entries;
}

function addDiaryEntry(database, logger, data) {
  const check = validation.check(data, 'diary_entry');
  if (!check.valid) return check.result;

  const id = database.generateId('DRY');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO matter_diary
    (entry_id, matter_id, entry_date, entry_type, title, description, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.matter_id, data.entry_date, data.entry_type,
     data.title, data.description || null, data.created_by || null, now, now]);

  logger.info('Diary entry created', { entryId: id, matterId: data.matter_id });
  return { success: true, entryId: id };
}

function updateDiaryEntry(database, logger, data) {
  if (!data.entry_id) return { success: false, error: 'entry_id is required' };

  const check = validation.check(data, 'diary_entry');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  database.execute(`UPDATE matter_diary SET
    entry_date = ?, entry_type = ?, title = ?, description = ?, created_by = ?, updated_at = ?
    WHERE entry_id = ?`,
    [data.entry_date, data.entry_type, data.title,
     data.description || null, data.created_by || null, now, data.entry_id]);

  logger.info('Diary entry updated', { entryId: data.entry_id });
  return { success: true };
}

function deleteDiaryEntry(database, logger, id) {
  if (!id) return { success: false, error: 'entry_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE matter_diary SET deleted_at = ? WHERE entry_id = ?', [now, id]);

  logger.info('Diary entry soft-deleted', { entryId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerDiaryHandlers({ database, logger }) {

  ipcMain.handle('get-matter-timeline', logger.wrapHandler('get-matter-timeline', (event, matterId) => {
    return getMatterTimeline(database, matterId);
  }));

  ipcMain.handle('add-diary-entry', logger.wrapHandler('add-diary-entry', (event, data) => {
    return addDiaryEntry(database, logger, data);
  }));

  ipcMain.handle('update-diary-entry', logger.wrapHandler('update-diary-entry', (event, data) => {
    return updateDiaryEntry(database, logger, data);
  }));

  ipcMain.handle('delete-diary-entry', logger.wrapHandler('delete-diary-entry', (event, id) => {
    return deleteDiaryEntry(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getMatterTimeline = getMatterTimeline;
module.exports.addDiaryEntry = addDiaryEntry;
module.exports.updateDiaryEntry = updateDiaryEntry;
module.exports.deleteDiaryEntry = deleteDiaryEntry;
