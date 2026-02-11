/**
 * Qanuni IPC Handlers — Corporate Secretary (Dual-Mode: IPC + REST)
 * ~25 handlers: entities, shareholders, share transfers, directors, filings, meetings, compliance
 * Note: Some handlers use db.run() directly for legacy compatibility with sql.js (no auto-increment IDs)
 * @version 3.0.0 (Dual-Mode Refactor)
 */

const { ipcMain } = require('electron');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

// ==================== CORPORATE ENTITIES ====================

function getAllCorporateEntities(database) {
  return database.query(`
    SELECT c.client_id, c.client_name, c.client_name_arabic, c.client_type, c.entity_type,
      c.email, c.phone, ce.entity_id, ce.registration_number, ce.registration_date,
      ce.registered_address, ce.share_capital, ce.share_capital_currency, ce.total_shares,
      ce.fiscal_year_end, ce.tax_id, ce.commercial_register, ce.status as corporate_status,
      ce.notes as corporate_notes,
      CASE WHEN ce.entity_id IS NOT NULL THEN 1 ELSE 0 END as has_corporate_details,
      let.name_en as entity_type_name, let.name_ar as entity_type_name_ar
    FROM clients c
    LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id
    LEFT JOIN lookup_entity_types let ON c.entity_type = let.code
    WHERE c.client_type = 'legal_entity' AND c.deleted_at IS NULL
    ORDER BY c.client_name`);
}

function getCorporateEntity(database, clientId) {
  if (!clientId) return null;
  return database.queryOne(`
    SELECT ce.*, c.client_name, c.client_name_arabic, c.entity_type
    FROM corporate_entities ce JOIN clients c ON ce.client_id = c.client_id
    WHERE ce.client_id = ?`, [clientId]);
}

function addCorporateEntity(database, logger, data) {
  if (!data.client_id) return { success: false, error: 'client_id is required' };
  const now = new Date().toISOString();
  database.execute(`INSERT INTO corporate_entities
    (client_id, registration_number, registration_date, registered_address, share_capital,
     share_capital_currency, total_shares, fiscal_year_end, tax_id, commercial_register,
     status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.registration_number || null, data.registration_date || null,
     data.registered_address || null, data.share_capital || null,
     data.share_capital_currency || 'USD', data.total_shares || null,
     data.fiscal_year_end || null, data.tax_id || null, data.commercial_register || null,
     data.status || 'active', data.notes || null, now, now]);
  logger.info('Corporate entity created', { clientId: data.client_id });
  return { success: true };
}

function updateCorporateEntity(database, logger, data) {
  if (!data.client_id) return { success: false, error: 'client_id is required' };
  const now = new Date().toISOString();
  database.execute(`UPDATE corporate_entities SET
    registration_number=?, registration_date=?, registered_address=?, share_capital=?,
    share_capital_currency=?, total_shares=?, fiscal_year_end=?, tax_id=?,
    commercial_register=?, status=?, notes=?, updated_at=?
    WHERE client_id=?`,
    [data.registration_number, data.registration_date, data.registered_address,
     data.share_capital, data.share_capital_currency, data.total_shares,
     data.fiscal_year_end, data.tax_id, data.commercial_register,
     data.status, data.notes, now, data.client_id]);
  logger.info('Corporate entity updated', { clientId: data.client_id });
  return { success: true };
}

function deleteCorporateEntity(database, logger, clientId) {
  if (!clientId) return { success: false, error: 'client_id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE corporate_entities SET deleted_at = ? WHERE client_id = ?', [now, clientId]);
  logger.info('Corporate entity deleted', { clientId });
  return { success: true };
}

function getCompanyClientsWithoutEntity(database) {
  return database.query(`SELECT c.* FROM clients c
    LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id
    WHERE c.client_type = 'legal_entity' AND c.deleted_at IS NULL AND ce.entity_id IS NULL
    ORDER BY c.client_name`);
}

function getCorporateClients(database) {
  return database.query(`
    SELECT c.*, ce.entity_id, ce.entity_id as has_corporate_details,
      ce.registration_number, ce.share_capital, ce.share_capital_currency, ce.total_shares,
      ce.status as corporate_status,
      let.name_en as entity_type_name, let.name_ar as entity_type_name_ar
    FROM clients c
    LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id
    LEFT JOIN lookup_entity_types let ON c.entity_type = let.code
    WHERE c.client_type = 'legal_entity' AND c.deleted_at IS NULL
    ORDER BY c.client_name`);
}

// ==================== SHAREHOLDERS ====================

function getShareholders(database, clientId) {
  if (!clientId) return [];
  return database.query('SELECT * FROM shareholders WHERE client_id = ? AND deleted_at IS NULL ORDER BY name', [clientId]);
}

function addShareholder(database, logger, data) {
  if (!data.client_id || !data.name) return { success: false, error: 'client_id and name are required' };
  const now = new Date().toISOString();
  database.execute(`INSERT INTO shareholders (client_id, name, id_number, nationality, shares_owned, share_class, date_acquired, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.name, data.id_number || null, data.nationality || null,
     data.shares_owned || 0, data.share_class || 'Ordinary', data.date_acquired || null, now]);
  logger.info('Shareholder added', { clientId: data.client_id, name: data.name });
  return { success: true };
}

function updateShareholder(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };
  database.execute(`UPDATE shareholders SET name=?, id_number=?, nationality=?, shares_owned=?, share_class=?, date_acquired=? WHERE id=?`,
    [data.name, data.id_number, data.nationality, data.shares_owned, data.share_class, data.date_acquired, data.id]);
  return { success: true };
}

function deleteShareholder(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE shareholders SET deleted_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

function getTotalShares(database, clientId) {
  if (!clientId) return 0;
  const result = database.queryOne('SELECT SUM(shares_owned) as total FROM shareholders WHERE client_id = ? AND deleted_at IS NULL', [clientId]);
  return result?.total || 0;
}

// ==================== SHARE TRANSFERS ====================

function getShareTransfers(database, clientId) {
  if (!clientId) return [];
  return database.query('SELECT * FROM share_transfers WHERE client_id = ? AND deleted_at IS NULL ORDER BY transfer_date DESC, created_at DESC', [clientId]);
}

function addShareTransfer(database, logger, data) {
  if (!data.client_id) return { success: false, error: 'client_id is required' };
  const now = new Date().toISOString();
  const shares = parseInt(data.shares_transferred) || 0;

  database.transaction(() => {
    database.execute(`INSERT INTO share_transfers
      (client_id, transfer_type, transfer_date, from_shareholder_id, to_shareholder_id,
       from_shareholder_name, to_shareholder_name, shares_transferred, price_per_share,
       total_consideration, share_class, board_resolution, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.client_id, data.transfer_type, data.transfer_date,
       data.from_shareholder_id || null, data.to_shareholder_id || null,
       data.from_shareholder_name || null, data.to_shareholder_name || null,
       shares, data.price_per_share || null, data.total_consideration || null,
       data.share_class || 'Ordinary', data.board_resolution || null, data.notes || null, now]);

    // Auto-update shareholder balances
    if (data.transfer_type === 'transfer') {
      if (data.from_shareholder_id) {
        database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [shares, data.from_shareholder_id]);
      }
      if (data.to_shareholder_id) {
        database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [shares, data.to_shareholder_id]);
      }
    } else if (data.transfer_type === 'issuance') {
      if (data.to_shareholder_id) {
        database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [shares, data.to_shareholder_id]);
      }
    } else if (data.transfer_type === 'buyback') {
      if (data.from_shareholder_id) {
        database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [shares, data.from_shareholder_id]);
      }
    }
  });

  logger.info('Share transfer added', { clientId: data.client_id, type: data.transfer_type, shares });
  return { success: true };
}

function updateShareTransfer(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };

  const original = database.queryOne('SELECT * FROM share_transfers WHERE id = ?', [data.id]);
  if (!original) return { success: false, error: 'Transfer not found' };

  const oldShares = parseInt(original.shares_transferred) || 0;
  const newShares = parseInt(data.shares_transferred) || 0;

  database.transaction(() => {
    // Reverse original balance effect
    if (original.transfer_type === 'transfer') {
      if (original.from_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [oldShares, original.from_shareholder_id]);
      if (original.to_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [oldShares, original.to_shareholder_id]);
    } else if (original.transfer_type === 'issuance') {
      if (original.to_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [oldShares, original.to_shareholder_id]);
    } else if (original.transfer_type === 'buyback') {
      if (original.from_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [oldShares, original.from_shareholder_id]);
    }

    // Apply new balance effect
    if (data.transfer_type === 'transfer') {
      if (data.from_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [newShares, data.from_shareholder_id]);
      if (data.to_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [newShares, data.to_shareholder_id]);
    } else if (data.transfer_type === 'issuance') {
      if (data.to_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned + ? WHERE id = ?', [newShares, data.to_shareholder_id]);
    } else if (data.transfer_type === 'buyback') {
      if (data.from_shareholder_id) database.execute('UPDATE shareholders SET shares_owned = shares_owned - ? WHERE id = ?', [newShares, data.from_shareholder_id]);
    }

    // Update the record
    database.execute(`UPDATE share_transfers SET
      transfer_type=?, transfer_date=?, from_shareholder_id=?, to_shareholder_id=?,
      from_shareholder_name=?, to_shareholder_name=?, shares_transferred=?,
      price_per_share=?, total_consideration=?, share_class=?, board_resolution=?, notes=?
      WHERE id=?`,
      [data.transfer_type, data.transfer_date,
       data.from_shareholder_id || null, data.to_shareholder_id || null,
       data.from_shareholder_name || null, data.to_shareholder_name || null,
       newShares, data.price_per_share || null, data.total_consideration || null,
       data.share_class || 'Ordinary', data.board_resolution || null, data.notes || null, data.id]);
  });

  return { success: true };
}

function deleteShareTransfer(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE share_transfers SET deleted_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

// ==================== DIRECTORS ====================

function getDirectors(database, clientId) {
  if (!clientId) return [];
  return database.query('SELECT * FROM directors WHERE client_id = ? AND deleted_at IS NULL ORDER BY date_appointed DESC, name', [clientId]);
}

function addDirector(database, data) {
  if (!data.client_id || !data.name) return { success: false, error: 'client_id and name required' };
  const now = new Date().toISOString();
  database.execute(`INSERT INTO directors (client_id, name, id_number, nationality, position, date_appointed, date_resigned, is_signatory, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.name, data.id_number || null, data.nationality || null,
     data.position || 'Director', data.date_appointed || null, data.date_resigned || null,
     data.is_signatory ? 1 : 0, data.notes || null, now]);
  return { success: true };
}

function updateDirector(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };
  database.execute(`UPDATE directors SET name=?, id_number=?, nationality=?, position=?, date_appointed=?, date_resigned=?, is_signatory=?, notes=? WHERE id=?`,
    [data.name, data.id_number, data.nationality, data.position, data.date_appointed,
     data.date_resigned || null, data.is_signatory ? 1 : 0, data.notes, data.id]);
  return { success: true };
}

function deleteDirector(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE directors SET deleted_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

// ==================== COMMERCIAL REGISTER FILINGS ====================

function getFilings(database, clientId) {
  if (!clientId) return [];
  return database.query('SELECT * FROM commercial_register_filings WHERE client_id = ? AND deleted_at IS NULL ORDER BY filing_date DESC', [clientId]);
}

function addFiling(database, data) {
  if (!data.client_id) return { success: false, error: 'client_id is required' };
  database.execute(`INSERT INTO commercial_register_filings
    (client_id, filing_type, filing_description, filing_date, filing_reference, next_due_date, reminder_days, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.filing_type, data.filing_description || null, data.filing_date,
     data.filing_reference || null, data.next_due_date || null, data.reminder_days || 30,
     data.notes || null, data.status || 'completed']);
  return { success: true };
}

function updateFiling(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };
  database.execute(`UPDATE commercial_register_filings SET
    filing_type=?, filing_description=?, filing_date=?, filing_reference=?,
    next_due_date=?, reminder_days=?, notes=?, status=? WHERE id=?`,
    [data.filing_type, data.filing_description, data.filing_date, data.filing_reference,
     data.next_due_date, data.reminder_days, data.notes, data.status, data.id]);
  return { success: true };
}

function deleteFiling(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE commercial_register_filings SET deleted_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

// ==================== COMPANY MEETINGS ====================

function getMeetings(database, clientId) {
  if (!clientId) return [];
  return database.query('SELECT * FROM company_meetings WHERE client_id = ? AND deleted_at IS NULL ORDER BY meeting_date DESC', [clientId]);
}

function addMeeting(database, data) {
  if (!data.client_id) return { success: false, error: 'client_id is required' };
  database.execute(`INSERT INTO company_meetings
    (client_id, meeting_type, meeting_description, meeting_date, meeting_notes, attendees,
     next_meeting_date, next_meeting_agenda, reminder_days, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.meeting_type, data.meeting_description || null, data.meeting_date,
     data.meeting_notes || null, data.attendees || null, data.next_meeting_date || null,
     data.next_meeting_agenda || null, data.reminder_days || 14, data.status || 'held']);
  return { success: true };
}

function updateMeeting(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };
  database.execute(`UPDATE company_meetings SET
    meeting_type=?, meeting_description=?, meeting_date=?, meeting_notes=?,
    attendees=?, next_meeting_date=?, next_meeting_agenda=?, reminder_days=?, status=?
    WHERE id=?`,
    [data.meeting_type, data.meeting_description, data.meeting_date, data.meeting_notes,
     data.attendees, data.next_meeting_date, data.next_meeting_agenda, data.reminder_days,
     data.status, data.id]);
  return { success: true };
}

function deleteMeeting(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE company_meetings SET deleted_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

// ==================== COMPLIANCE DASHBOARD ====================

function getUpcomingCompliance(database, daysAhead) {
  if (daysAhead === undefined || daysAhead === null) daysAhead = 30;
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filings = database.query(`
    SELECT f.*, c.client_name, c.client_name_arabic, 'filing' as item_type
    FROM commercial_register_filings f JOIN clients c ON f.client_id = c.client_id
    WHERE f.next_due_date IS NOT NULL AND f.next_due_date <= ?
    AND (f.status = 'pending' OR f.next_due_date >= ?)
    ORDER BY f.next_due_date ASC`, [futureDate, today]);

  const meetings = database.query(`
    SELECT m.*, c.client_name, c.client_name_arabic, 'meeting' as item_type
    FROM company_meetings m JOIN clients c ON m.client_id = c.client_id
    WHERE m.next_meeting_date IS NOT NULL AND m.next_meeting_date <= ?
    AND m.next_meeting_date >= ?
    ORDER BY m.next_meeting_date ASC`, [futureDate, today]);

  return { filings, meetings };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerCorporateHandlers({ database, logger }) {

  // ==================== CORPORATE ENTITIES ====================

  ipcMain.handle('get-all-corporate-entities', logger.wrapHandler('get-all-corporate-entities', () => {
    return getAllCorporateEntities(database);
  }));

  ipcMain.handle('get-corporate-entity', logger.wrapHandler('get-corporate-entity', (event, clientId) => {
    return getCorporateEntity(database, clientId);
  }));

  ipcMain.handle('add-corporate-entity', logger.wrapHandler('add-corporate-entity', (event, data) => {
    return addCorporateEntity(database, logger, data);
  }));

  ipcMain.handle('update-corporate-entity', logger.wrapHandler('update-corporate-entity', (event, data) => {
    return updateCorporateEntity(database, logger, data);
  }));

  ipcMain.handle('delete-corporate-entity', logger.wrapHandler('delete-corporate-entity', (event, clientId) => {
    return deleteCorporateEntity(database, logger, clientId);
  }));

  ipcMain.handle('get-company-clients-without-entity', logger.wrapHandler('get-company-clients-without-entity', () => {
    return getCompanyClientsWithoutEntity(database);
  }));

  ipcMain.handle('get-corporate-clients', logger.wrapHandler('get-corporate-clients', () => {
    return getCorporateClients(database);
  }));

  // ==================== SHAREHOLDERS ====================

  ipcMain.handle('get-shareholders', logger.wrapHandler('get-shareholders', (event, clientId) => {
    return getShareholders(database, clientId);
  }));

  ipcMain.handle('add-shareholder', logger.wrapHandler('add-shareholder', (event, data) => {
    return addShareholder(database, logger, data);
  }));

  ipcMain.handle('update-shareholder', logger.wrapHandler('update-shareholder', (event, data) => {
    return updateShareholder(database, data);
  }));

  ipcMain.handle('delete-shareholder', logger.wrapHandler('delete-shareholder', (event, id) => {
    return deleteShareholder(database, id);
  }));

  ipcMain.handle('get-total-shares', logger.wrapHandler('get-total-shares', (event, clientId) => {
    return getTotalShares(database, clientId);
  }));

  // ==================== SHARE TRANSFERS ====================

  ipcMain.handle('get-share-transfers', logger.wrapHandler('get-share-transfers', (event, clientId) => {
    return getShareTransfers(database, clientId);
  }));

  ipcMain.handle('add-share-transfer', logger.wrapHandler('add-share-transfer', (event, data) => {
    return addShareTransfer(database, logger, data);
  }));

  ipcMain.handle('update-share-transfer', logger.wrapHandler('update-share-transfer', (event, data) => {
    return updateShareTransfer(database, data);
  }));

  ipcMain.handle('delete-share-transfer', logger.wrapHandler('delete-share-transfer', (event, id) => {
    return deleteShareTransfer(database, id);
  }));

  // ==================== DIRECTORS ====================

  ipcMain.handle('get-directors', logger.wrapHandler('get-directors', (event, clientId) => {
    return getDirectors(database, clientId);
  }));

  ipcMain.handle('add-director', logger.wrapHandler('add-director', (event, data) => {
    return addDirector(database, data);
  }));

  ipcMain.handle('update-director', logger.wrapHandler('update-director', (event, data) => {
    return updateDirector(database, data);
  }));

  ipcMain.handle('delete-director', logger.wrapHandler('delete-director', (event, id) => {
    return deleteDirector(database, id);
  }));

  // ==================== COMMERCIAL REGISTER FILINGS ====================

  ipcMain.handle('get-filings', logger.wrapHandler('get-filings', (event, clientId) => {
    return getFilings(database, clientId);
  }));

  ipcMain.handle('add-filing', logger.wrapHandler('add-filing', (event, data) => {
    return addFiling(database, data);
  }));

  ipcMain.handle('update-filing', logger.wrapHandler('update-filing', (event, data) => {
    return updateFiling(database, data);
  }));

  ipcMain.handle('delete-filing', logger.wrapHandler('delete-filing', (event, id) => {
    return deleteFiling(database, id);
  }));

  // ==================== COMPANY MEETINGS ====================

  ipcMain.handle('get-meetings', logger.wrapHandler('get-meetings', (event, clientId) => {
    return getMeetings(database, clientId);
  }));

  ipcMain.handle('add-meeting', logger.wrapHandler('add-meeting', (event, data) => {
    return addMeeting(database, data);
  }));

  ipcMain.handle('update-meeting', logger.wrapHandler('update-meeting', (event, data) => {
    return updateMeeting(database, data);
  }));

  ipcMain.handle('delete-meeting', logger.wrapHandler('delete-meeting', (event, id) => {
    return deleteMeeting(database, id);
  }));

  // ==================== COMPLIANCE DASHBOARD ====================

  ipcMain.handle('get-upcoming-compliance', logger.wrapHandler('get-upcoming-compliance', (event, daysAhead) => {
    return getUpcomingCompliance(database, daysAhead);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllCorporateEntities = getAllCorporateEntities;
module.exports.getCorporateEntity = getCorporateEntity;
module.exports.addCorporateEntity = addCorporateEntity;
module.exports.updateCorporateEntity = updateCorporateEntity;
module.exports.deleteCorporateEntity = deleteCorporateEntity;
module.exports.getCompanyClientsWithoutEntity = getCompanyClientsWithoutEntity;
module.exports.getCorporateClients = getCorporateClients;
module.exports.getShareholders = getShareholders;
module.exports.addShareholder = addShareholder;
module.exports.updateShareholder = updateShareholder;
module.exports.deleteShareholder = deleteShareholder;
module.exports.getTotalShares = getTotalShares;
module.exports.getShareTransfers = getShareTransfers;
module.exports.addShareTransfer = addShareTransfer;
module.exports.updateShareTransfer = updateShareTransfer;
module.exports.deleteShareTransfer = deleteShareTransfer;
module.exports.getDirectors = getDirectors;
module.exports.addDirector = addDirector;
module.exports.updateDirector = updateDirector;
module.exports.deleteDirector = deleteDirector;
module.exports.getFilings = getFilings;
module.exports.addFiling = addFiling;
module.exports.updateFiling = updateFiling;
module.exports.deleteFiling = deleteFiling;
module.exports.getMeetings = getMeetings;
module.exports.addMeeting = addMeeting;
module.exports.updateMeeting = updateMeeting;
module.exports.deleteMeeting = deleteMeeting;
module.exports.getUpcomingCompliance = getUpcomingCompliance;
