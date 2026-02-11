/**
 * Conflict Check Module - Dual-Mode (IPC + REST)
 * 2 handlers: search + log
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function conflictCheck(database, logger, searchTerms) {
  const results = [];
  const searchName = searchTerms.name ? `%${searchTerms.name}%` : null;
  const searchReg = searchTerms.registration_number ? `%${searchTerms.registration_number}%` : null;
  const searchVat = searchTerms.vat_number ? `%${searchTerms.vat_number}%` : null;
  const searchEmail = searchTerms.email ? `%${searchTerms.email}%` : null;
  const searchPhone = searchTerms.phone ? `%${searchTerms.phone}%` : null;

  // CRITICAL: Adverse party matches an existing CLIENT = true conflict (ABA Rule 1.7)
  if (searchName) {
    const clientsByName = database.query(`
      SELECT client_id, client_name, client_name_arabic, 'client_name' as match_type, 'CRITICAL' as severity
      FROM clients WHERE (client_name LIKE ? OR client_name_arabic LIKE ?) AND active = 1 AND deleted_at IS NULL`,
      [searchName, searchName]);
    results.push(...clientsByName);
  }

  if (searchReg) {
    const clientsByReg = database.query(`
      SELECT client_id, client_name, registration_number as matched_value, 'registration_number' as match_type, 'HIGH' as severity
      FROM clients WHERE registration_number LIKE ? AND active = 1 AND deleted_at IS NULL`, [searchReg]);
    results.push(...clientsByReg);
  }

  if (searchVat) {
    const clientsByVat = database.query(`
      SELECT client_id, client_name, vat_number as matched_value, 'vat_number' as match_type, 'MEDIUM' as severity
      FROM clients WHERE vat_number LIKE ? AND active = 1 AND deleted_at IS NULL`, [searchVat]);
    results.push(...clientsByVat);
  }

  if (searchEmail) {
    const clientsByEmail = database.query(`
      SELECT client_id, client_name, email as matched_value, 'email' as match_type, 'MEDIUM' as severity
      FROM clients WHERE email LIKE ? AND active = 1 AND deleted_at IS NULL`, [searchEmail]);
    results.push(...clientsByEmail);
  }

  if (searchPhone) {
    const clientsByPhone = database.query(`
      SELECT client_id, client_name, phone as matched_value, 'phone' as match_type, 'LOW' as severity
      FROM clients WHERE (phone LIKE ? OR mobile LIKE ?) AND active = 1 AND deleted_at IS NULL`,
      [searchPhone, searchPhone]);
    results.push(...clientsByPhone);
  }

  // Search shareholders — CRITICAL: matches shareholder of existing client
  if (searchName) {
    const shareholders = database.query(`
      SELECT s.client_id, c.client_name, s.name as matched_value,
             'shareholder' as match_type, 'CRITICAL' as severity, s.shares_owned, s.nationality
      FROM shareholders s JOIN clients c ON s.client_id = c.client_id
      WHERE s.name LIKE ? AND s.deleted_at IS NULL AND c.active = 1 AND c.deleted_at IS NULL`, [searchName]);
    results.push(...shareholders.map(s => ({
      ...s, display_info: `Shareholder at ${s.client_name} (${s.shares_owned || 0} shares)`
    })));
  }

  // Search directors — CRITICAL: matches director of existing client
  if (searchName) {
    const directors = database.query(`
      SELECT d.client_id, c.client_name, d.name as matched_value,
             'director' as match_type, 'CRITICAL' as severity, d.position
      FROM directors d JOIN clients c ON d.client_id = c.client_id
      WHERE d.name LIKE ? AND d.deleted_at IS NULL AND d.date_resigned IS NULL AND c.active = 1 AND c.deleted_at IS NULL`, [searchName]);
    results.push(...directors.map(d => ({
      ...d, display_info: `${d.position || 'Director'} at ${d.client_name}`
    })));
  }

  // Search adverse parties — LOW/INFORMATIONAL (both parties are opponents)
  if (searchName) {
    const mattersWithAdverse = database.query(`
      SELECT m.matter_id, m.matter_name, m.adverse_parties, c.client_name, c.client_id,
             'adverse_party' as match_type, 'LOW' as severity
      FROM matters m JOIN clients c ON m.client_id = c.client_id
      WHERE m.adverse_parties LIKE ? AND m.status != 'closed' AND m.deleted_at IS NULL`, [searchName]);
    results.push(...mattersWithAdverse.map(m => ({
      ...m, display_info: `Also adverse party in matter "${m.matter_name}" (Client: ${m.client_name}) - Informational only`
    })));
  }

  // Deduplicate by client_id + match_type, keeping highest severity
  const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  const uniqueResults = Object.values(
    results.reduce((acc, item) => {
      const key = `${item.client_id}-${item.match_type}`;
      if (!acc[key] || severityOrder[item.severity] > severityOrder[acc[key].severity]) {
        acc[key] = item;
      }
      return acc;
    }, {})
  );

  uniqueResults.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  logger.info('Conflict check performed', { terms: Object.keys(searchTerms).filter(k => searchTerms[k]), results: uniqueResults.length });
  return uniqueResults;
}

function logConflictCheck(database, data) {
  const now = new Date().toISOString();
  database.execute(`INSERT INTO conflict_check_log (check_date, check_type, search_terms, results_found,
    decision, notes, entity_type, entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [now, data.check_type, JSON.stringify(data.search_terms), JSON.stringify(data.results_found),
     data.decision, data.notes, data.entity_type, data.entity_id, now]);
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerConflictCheckHandlers({ database, logger }) {

  ipcMain.handle('conflict-check', logger.wrapHandler('conflict-check', (event, searchTerms) => {
    return conflictCheck(database, logger, searchTerms);
  }));

  ipcMain.handle('log-conflict-check', logger.wrapHandler('log-conflict-check', (event, data) => {
    return logConflictCheck(database, data);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.conflictCheck = conflictCheck;
module.exports.logConflictCheck = logConflictCheck;
