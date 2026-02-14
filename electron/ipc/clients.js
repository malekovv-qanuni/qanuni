/**
 * Clients Module - Dual-Mode (IPC + REST)
 * Refactored to preserve EXACT working logic
 */

const { ipcMain } = require('electron');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getClients(database) {
  return database.query('SELECT * FROM clients WHERE active = 1 ORDER BY client_name');
}

function addClient(database, logger, client) {
  // Validate input
  const check = validation.check(client, 'client');
  if (!check.valid) {
    return check.result;
  }

  // Generate ID
  const id = database.generateId('CLT');
  const now = new Date().toISOString();

  // EXACT SQL from working version
  database.execute(`
    INSERT INTO clients (client_id, client_name, client_name_arabic, client_type, entity_type, custom_id,
      registration_number, vat_number, main_contact, email, phone, mobile, address, website,
      industry, default_currency, billing_terms, source, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    id, client.client_name, client.client_name_arabic || null,
    client.client_type || 'individual', client.entity_type || null, client.custom_id || null,
    client.registration_number || null, client.vat_number || null, client.main_contact || null,
    client.email || null, client.phone || null, client.mobile || null, client.address || null,
    client.website || null, client.industry || null,
    client.default_currency || 'USD', client.billing_terms || 'hourly',
    client.source || null, client.notes || null,
    now, now
  ]);

  logger.info('Client created', { clientId: id, name: client.client_name });

  return { success: true, client_id: id, message: 'Client created successfully' };
}

function updateClient(database, logger, client) {
  // Validate
  if (!client.client_id) {
    return { success: false, error: 'client_id is required' };
  }

  const check = validation.check(client, 'client');
  if (!check.valid) {
    return check.result;
  }

  const now = new Date().toISOString();

  // EXACT SQL from working version
  database.execute(`
    UPDATE clients SET
      client_name = ?, client_name_arabic = ?, client_type = ?, entity_type = ?,
      custom_id = ?, registration_number = ?, vat_number = ?, main_contact = ?,
      email = ?, phone = ?, mobile = ?, address = ?, website = ?,
      industry = ?, default_currency = ?, billing_terms = ?, source = ?,
      notes = ?, updated_at = ?
    WHERE client_id = ? AND active = 1
  `, [
    client.client_name, client.client_name_arabic || null,
    client.client_type || 'individual', client.entity_type || null,
    client.custom_id || null, client.registration_number || null,
    client.vat_number || null, client.main_contact || null,
    client.email || null, client.phone || null, client.mobile || null,
    client.address || null, client.website || null, client.industry || null,
    client.default_currency || 'USD', client.billing_terms || 'hourly',
    client.source || null, client.notes || null,
    now, client.client_id
  ]);

  logger.info('Client updated', { clientId: client.client_id });

  return { success: true, message: 'Client updated successfully' };
}

function deleteClient(database, logger, id) {
  if (!id) {
    return { success: false, error: 'client_id is required' };
  }

  database.execute('UPDATE clients SET active = 0 WHERE client_id = ?', [id]);

  logger.info('Client soft-deleted', { clientId: id });

  return { success: true, message: 'Client deleted successfully' };
}

function checkClientReference(database, custom_id, exclude_client_id = null) {
  if (!custom_id) {
    return { exists: false };
  }

  let query = 'SELECT COUNT(*) as count FROM clients WHERE custom_id = ? AND active = 1';
  let params = [custom_id];

  if (exclude_client_id) {
    query += ' AND client_id != ?';
    params.push(exclude_client_id);
  }

  const result = database.query(query, params);
  return { exists: result[0]?.count > 0 };
}

function getClientById(database, client_id) {
  const result = database.query(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM matters WHERE client_id = c.client_id AND active = 1) as matter_count
    FROM clients c 
    WHERE c.client_id = ? AND c.active = 1
  `, [client_id]);
  
  return result[0] || null;
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerClientHandlers({ database, logger }) {
  
  ipcMain.handle('get-all-clients', logger.wrapHandler('get-all-clients', () => {
    return getClients(database);
  }));

  ipcMain.handle('add-client', logger.wrapHandler('add-client', (event, client) => {
    return addClient(database, logger, client);
  }));

  ipcMain.handle('update-client', logger.wrapHandler('update-client', (event, client) => {
    return updateClient(database, logger, client);
  }));

  ipcMain.handle('delete-client', logger.wrapHandler('delete-client', (event, id) => {
    return deleteClient(database, logger, id);
  }));

  ipcMain.handle('check-client-reference', logger.wrapHandler('check-client-reference', (event, custom_id, exclude_client_id) => {
    return checkClientReference(database, custom_id, exclude_client_id);
  }));

  ipcMain.handle('get-client-by-id', logger.wrapHandler('get-client-by-id', (event, client_id) => {
    return getClientById(database, client_id);
  }));
};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getClients = getClients;
module.exports.addClient = addClient;
module.exports.updateClient = updateClient;
module.exports.deleteClient = deleteClient;
module.exports.checkClientReference = checkClientReference;
module.exports.getClientById = getClientById;
