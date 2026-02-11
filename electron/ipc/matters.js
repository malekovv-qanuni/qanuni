/**
 * Matters Module - Dual-Mode (IPC + REST)
 * 6 handlers: CRUD + related matters (appeal chain) + file number uniqueness check
 * Refactored to preserve EXACT working logic
 * @version 3.0.0 (Session 2 - Dual-Mode)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getMatters(database) {
  return database.query(`SELECT m.*, c.client_name, c.client_name_arabic as client_name_ar,
      lc.name_en as court_name, lc.name_ar as court_name_ar,
      lr.name_en as region_name, lr.name_ar as region_name_ar,
      pm.matter_name as parent_matter_name, pm.case_number as parent_case_number
      FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
      LEFT JOIN lookup_court_types lc ON m.court_type_id = lc.court_type_id
      LEFT JOIN lookup_regions lr ON m.court_region_id = lr.region_id
      LEFT JOIN matters pm ON m.parent_matter_id = pm.matter_id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC`);
}

function addMatter(database, logger, matter) {
  const check = validation.check(matter, 'matter');
  if (!check.valid) return check.result;

  const id = matter.matter_id || database.generateId('MTR');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO matters (matter_id, client_id, matter_name, matter_name_arabic,
      matter_type, status, custom_matter_number, case_number, court_type_id, court_region_id, judge_name,
      responsible_lawyer_id, opening_date, notes, parent_matter_id, matter_stage, fee_arrangement,
      agreed_fee_amount, agreed_fee_currency, success_fee_type, success_fee_percentage,
      success_fee_fixed_amount, success_fee_currency, custom_hourly_rate, custom_hourly_currency,
      adverse_parties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, matter.client_id, matter.matter_name, matter.matter_name_arabic || null,
       matter.matter_type || 'litigation', matter.status || 'active',
       matter.custom_matter_number || null, matter.case_number || null,
       matter.court_type_id || null, matter.court_region_id || null,
       matter.judge_name || null, matter.responsible_lawyer_id || null,
       matter.opening_date || null, matter.notes || null,
       matter.parent_matter_id || null, matter.matter_stage || 'first_instance',
       matter.fee_arrangement || null,
       matter.agreed_fee_amount || null, matter.agreed_fee_currency || 'USD',
       matter.success_fee_type || 'percentage', matter.success_fee_percentage || null,
       matter.success_fee_fixed_amount || null, matter.success_fee_currency || 'USD',
       matter.custom_hourly_rate || null, matter.custom_hourly_currency || 'USD',
       matter.adverse_parties || '[]', now, now]);

  logger.info('Matter created', { matterId: id, name: matter.matter_name });
  return { success: true, matterId: id };
}

function updateMatter(database, logger, matter) {
  if (!matter.matter_id) {
    return { success: false, error: 'matter_id is required for update' };
  }
  const check = validation.check(matter, 'matter');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();

  database.execute(`UPDATE matters SET client_id=?, matter_name=?, matter_name_arabic=?, matter_type=?, status=?,
      custom_matter_number=?, case_number=?, court_type_id=?, court_region_id=?, judge_name=?, responsible_lawyer_id=?,
      opening_date=?, notes=?, parent_matter_id=?, matter_stage=?, fee_arrangement=?,
      agreed_fee_amount=?, agreed_fee_currency=?, success_fee_type=?, success_fee_percentage=?,
      success_fee_fixed_amount=?, success_fee_currency=?, custom_hourly_rate=?, custom_hourly_currency=?,
      adverse_parties=?, updated_at=? WHERE matter_id=?`,
      [matter.client_id, matter.matter_name, matter.matter_name_arabic || null,
       matter.matter_type, matter.status,
       matter.custom_matter_number || null, matter.case_number || null,
       matter.court_type_id || null, matter.court_region_id || null,
       matter.judge_name || null, matter.responsible_lawyer_id || null,
       matter.opening_date || null, matter.notes || null,
       matter.parent_matter_id || null, matter.matter_stage || 'first_instance',
       matter.fee_arrangement || null,
       matter.agreed_fee_amount || null, matter.agreed_fee_currency || 'USD',
       matter.success_fee_type || 'percentage', matter.success_fee_percentage || null,
       matter.success_fee_fixed_amount || null, matter.success_fee_currency || 'USD',
       matter.custom_hourly_rate || null, matter.custom_hourly_currency || 'USD',
       matter.adverse_parties || '[]', now, matter.matter_id]);

  logger.info('Matter updated', { matterId: matter.matter_id });
  return { success: true };
}

function deleteMatter(database, logger, id) {
  if (!id) return { success: false, error: 'matter_id is required' };

  // Check for related hearings and judgments
  const relatedHearings = database.query('SELECT COUNT(*) as count FROM hearings WHERE matter_id = ? AND deleted_at IS NULL', [id]);
  const relatedJudgments = database.query('SELECT COUNT(*) as count FROM judgments WHERE matter_id = ? AND deleted_at IS NULL', [id]);
  const hearingCount = relatedHearings[0]?.count || 0;
  const judgmentCount = relatedJudgments[0]?.count || 0;

  if (hearingCount > 0 || judgmentCount > 0) {
    const parts = [];
    if (hearingCount > 0) parts.push(`${hearingCount} hearing(s)`);
    if (judgmentCount > 0) parts.push(`${judgmentCount} judgment(s)`);

    return {
      success: false,
      error: `Cannot delete matter: ${parts.join(' and ')} exist. Delete related records first.`,
      code: 'HAS_RELATED_RECORDS',
      relatedHearings: hearingCount,
      relatedJudgments: judgmentCount
    };
  }

  const now = new Date().toISOString();
  database.execute('UPDATE matters SET deleted_at = ? WHERE matter_id = ?', [now, id]);

  logger.info('Matter soft-deleted', { matterId: id });
  return { success: true };
}

function getRelatedMatters(database, matterId) {
  if (!matterId) return { parent: null, children: [] };

  const currentMatter = database.queryOne('SELECT * FROM matters WHERE matter_id = ?', [matterId]);
  if (!currentMatter) return { parent: null, children: [] };

  let parent = null;
  if (currentMatter.parent_matter_id) {
    parent = database.queryOne(`SELECT m.*, c.client_name
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE m.matter_id = ?`, [currentMatter.parent_matter_id]);
  }

  const children = database.query(`SELECT m.*, c.client_name
      FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
      WHERE m.parent_matter_id = ? ORDER BY m.created_at ASC`, [matterId]);

  return { parent, children: children || [] };
}

function checkFileNumberUnique(database, fileNumber, excludeMatterId) {
  if (!fileNumber || !fileNumber.trim()) return [];

  let sql = 'SELECT matter_id, matter_name FROM matters WHERE custom_matter_number = ? AND deleted_at IS NULL';
  const params = [fileNumber.trim()];

  if (excludeMatterId) {
    sql += ' AND matter_id != ?';
    params.push(excludeMatterId);
  }

  return database.query(sql, params) || [];
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerMatterHandlers({ database, logger }) {

  ipcMain.handle('get-all-matters', logger.wrapHandler('get-all-matters', () => {
    return getMatters(database);
  }));

  ipcMain.handle('add-matter', logger.wrapHandler('add-matter', (event, matter) => {
    return addMatter(database, logger, matter);
  }));

  ipcMain.handle('update-matter', logger.wrapHandler('update-matter', (event, matter) => {
    return updateMatter(database, logger, matter);
  }));

  ipcMain.handle('delete-matter', logger.wrapHandler('delete-matter', (event, id) => {
    return deleteMatter(database, logger, id);
  }));

  ipcMain.handle('get-related-matters', logger.wrapHandler('get-related-matters', (event, matterId) => {
    return getRelatedMatters(database, matterId);
  }));

  ipcMain.handle('check-file-number-unique', logger.wrapHandler('check-file-number-unique', (event, fileNumber, excludeMatterId) => {
    return checkFileNumberUnique(database, fileNumber, excludeMatterId);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getMatters = getMatters;
module.exports.addMatter = addMatter;
module.exports.updateMatter = updateMatter;
module.exports.deleteMatter = deleteMatter;
module.exports.getRelatedMatters = getRelatedMatters;
module.exports.checkFileNumberUnique = checkFileNumberUnique;
