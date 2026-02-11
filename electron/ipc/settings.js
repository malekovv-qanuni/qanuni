/**
 * Settings Module - Dual-Mode (IPC + REST)
 * ~24 handlers: settings CRUD, firm info, backup/restore, auto-backup, currencies, exchange rates
 * Dependencies: dialog, shell, BrowserWindow, fs, path, app (Electron modules)
 *
 * NOTE: Backup/restore/export handlers use Electron dialogs and remain Electron-only.
 * Pure data functions are exported for REST API use.
 *
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

// -------------------- SETTINGS CRUD --------------------

function getSettings(database) {
  return database.query('SELECT * FROM settings');
}

function getSetting(database, key) {
  if (!key) return null;
  return database.queryOne('SELECT * FROM settings WHERE setting_key = ?', [key]);
}

function saveSetting(database, key, value, type = 'string', category = 'general') {
  if (!key) return { success: false, error: 'key is required' };
  const now = new Date().toISOString();
  const existing = database.queryOne('SELECT * FROM settings WHERE setting_key = ?', [key]);
  if (existing) {
    database.execute('UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?', [value, now, key]);
  } else {
    database.execute('INSERT INTO settings (setting_key, setting_value, setting_type, category, updated_at) VALUES (?, ?, ?, ?, ?)',
      [key, value, type, category, now]);
  }
  return { success: true };
}

// -------------------- FIRM INFO --------------------

function saveFirmInfo(database, logger, firmInfo) {
  const now = new Date().toISOString();
  const keys = ['firm_name', 'firm_name_arabic', 'firm_address', 'firm_phone', 'firm_email',
                'firm_website', 'firm_vat_number', 'default_currency', 'default_vat_rate',
                'lawyer_advance_min_balance'];

  for (const key of keys) {
    if (firmInfo[key] !== undefined) {
      const existing = database.queryOne('SELECT * FROM settings WHERE setting_key = ?', [key]);
      if (existing) {
        database.execute('UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?', [firmInfo[key], now, key]);
      } else {
        database.execute('INSERT INTO settings (setting_key, setting_value, setting_type, category, updated_at) VALUES (?, ?, ?, ?, ?)',
          [key, firmInfo[key], 'string', 'firm', now]);
      }
    }
  }
  logger.info('Firm info saved');
  return { success: true };
}

function getFirmInfo(database) {
  const settings = database.query("SELECT * FROM settings WHERE category = 'firm' OR setting_key LIKE 'firm_%' OR setting_key LIKE 'default_%' OR setting_key = 'lawyer_advance_min_balance'");
  const firmInfo = {};
  settings.forEach(s => { firmInfo[s.setting_key] = s.setting_value; });
  return firmInfo;
}

// -------------------- CURRENCIES --------------------

function getCurrencies(database) {
  return database.query(`SELECT id, code, name, name_ar, symbol, sort_order, active, created_at, updated_at
    FROM firm_currencies WHERE active = 1 ORDER BY sort_order ASC, code ASC`);
}

function addCurrency(database, data) {
  if (!data.code || !data.name) return { success: false, error: 'code and name are required' };
  const now = new Date().toISOString();
  const maxSort = database.queryOne('SELECT MAX(sort_order) as max_sort FROM firm_currencies');
  const nextSort = (maxSort?.max_sort || 0) + 1;
  database.execute(
    `INSERT INTO firm_currencies (code, name, name_ar, symbol, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [data.code.toUpperCase(), data.name, data.name_ar || null, data.symbol || null, nextSort, now, now]);
  return { success: true };
}

function updateCurrency(database, data) {
  if (!data.id) return { success: false, error: 'id is required' };

  const check = validation.check(data, 'currency');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  database.execute('UPDATE firm_currencies SET name=?, name_ar=?, symbol=?, updated_at=? WHERE id=?',
    [data.name, data.name_ar || null, data.symbol || null, now, data.id]);
  return { success: true };
}

function deleteCurrency(database, id) {
  if (!id) return { success: false, error: 'id is required' };
  const now = new Date().toISOString();
  database.execute('UPDATE firm_currencies SET active = 0, updated_at = ? WHERE id = ?', [now, id]);
  return { success: true };
}

// -------------------- EXCHANGE RATES --------------------

function getExchangeRates(database) {
  return database.query(`SELECT rate_id, from_currency, to_currency, rate, effective_date, notes, created_at, updated_at
    FROM exchange_rates ORDER BY from_currency ASC, to_currency ASC, effective_date DESC`);
}

function addExchangeRate(database, data) {
  if (!data.from_currency || !data.to_currency || !data.rate) return { success: false, error: 'from_currency, to_currency, and rate are required' };
  const now = new Date().toISOString();
  const rateId = database.generateId('RATE');
  database.execute(
    `INSERT INTO exchange_rates (rate_id, from_currency, to_currency, rate, effective_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rateId, data.from_currency, data.to_currency, data.rate, data.effective_date, data.notes || null, now, now]);
  return { success: true, rate_id: rateId };
}

function updateExchangeRate(database, data) {
  if (!data.rate_id) return { success: false, error: 'rate_id is required' };

  const check = validation.check(data, 'exchange_rate');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  database.execute(
    'UPDATE exchange_rates SET from_currency=?, to_currency=?, rate=?, effective_date=?, notes=?, updated_at=? WHERE rate_id=?',
    [data.from_currency, data.to_currency, data.rate, data.effective_date, data.notes || null, now, data.rate_id]);
  return { success: true };
}

function deleteExchangeRate(database, rateId) {
  if (!rateId) return { success: false, error: 'rate_id is required' };
  database.execute('DELETE FROM exchange_rates WHERE rate_id = ?', [rateId]);
  return { success: true };
}

function getExchangeRateForDate(database, fromCurrency, toCurrency, date) {
  if (!fromCurrency || !toCurrency) return null;
  return database.queryOne(
    `SELECT rate, effective_date FROM exchange_rates
     WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
     ORDER BY effective_date DESC LIMIT 1`, [fromCurrency, toCurrency, date]) || null;
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerSettingsHandlers({ database, logger, getMainWindow, getAutoBackupSettings, saveSettingDirect, performAutoBackup, DEFAULT_BACKUP_FOLDER, userDataPath, XLSX, SQL }) {

  const fs = require('fs');
  const path = require('path');
  const { dialog, shell, app } = require('electron');

  // -------------------- SETTINGS CRUD --------------------

  ipcMain.handle('get-settings', logger.wrapHandler('get-settings', () => {
    return getSettings(database);
  }));

  ipcMain.handle('get-setting', logger.wrapHandler('get-setting', (event, key) => {
    return getSetting(database, key);
  }));

  ipcMain.handle('save-setting', logger.wrapHandler('save-setting', (event, key, value, type = 'string', category = 'general') => {
    return saveSetting(database, key, value, type, category);
  }));

  // -------------------- FIRM INFO --------------------

  ipcMain.handle('save-firm-info', logger.wrapHandler('save-firm-info', (event, firmInfo) => {
    return saveFirmInfo(database, logger, firmInfo);
  }));

  ipcMain.handle('get-firm-info', logger.wrapHandler('get-firm-info', () => {
    return getFirmInfo(database);
  }));

  // -------------------- AUTO-BACKUP (Electron-only) --------------------

  ipcMain.handle('get-auto-backup-status', logger.wrapHandler('get-auto-backup-status', () => {
    const settings = getAutoBackupSettings();
    return {
      enabled: settings.enabled,
      frequency: settings.frequency,
      retention: settings.retention,
      location: settings.location,
      lastBackup: settings.lastBackup
    };
  }));

  ipcMain.handle('save-auto-backup-settings', logger.wrapHandler('save-auto-backup-settings', (event, newSettings) => {
    if (newSettings.enabled !== undefined) saveSettingDirect('auto_backup_enabled', newSettings.enabled, 'boolean');
    if (newSettings.frequency) saveSettingDirect('auto_backup_frequency', newSettings.frequency, 'string');
    if (newSettings.retention) saveSettingDirect('auto_backup_retention', newSettings.retention, 'number');
    if (newSettings.location) saveSettingDirect('auto_backup_location', newSettings.location, 'string');
    logger.info('Auto-backup settings saved', newSettings);
    return { success: true };
  }));

  ipcMain.handle('run-auto-backup', logger.wrapHandler('run-auto-backup', () => {
    return performAutoBackup();
  }));

  ipcMain.handle('select-backup-folder', logger.wrapHandler('select-backup-folder', async () => {
    const mainWindow = getMainWindow();
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    return { success: true, path: filePaths[0] };
  }));

  ipcMain.handle('get-backup-history', logger.wrapHandler('get-backup-history', () => {
    const settings = getAutoBackupSettings();
    const backupFolder = settings.location || DEFAULT_BACKUP_FOLDER;
    if (!fs.existsSync(backupFolder)) return [];

    const files = fs.readdirSync(backupFolder)
      .filter(f => f.startsWith('qanuni-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupFolder, f));
        return { filename: f, path: path.join(backupFolder, f), date: stats.mtime.toISOString(), size: stats.size };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return files;
  }));

  ipcMain.handle('open-backup-folder', logger.wrapHandler('open-backup-folder', () => {
    const settings = getAutoBackupSettings();
    const backupFolder = settings.location || DEFAULT_BACKUP_FOLDER;
    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder, { recursive: true });
    shell.openPath(backupFolder);
    return { success: true };
  }));

  // -------------------- BACKUP & RESTORE (Electron-only) --------------------

  ipcMain.handle('backup-database', logger.wrapHandler('backup-database', async () => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Database Backup',
      defaultPath: path.join(app.getPath('documents'), `qanuni-backup-${new Date().toISOString().split('T')[0]}.db`),
      filters: [{ name: 'Database Files', extensions: ['db'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const data = database.getDb().export();
    fs.writeFileSync(filePath, Buffer.from(data));
    logger.info('Database backed up', { filePath });
    return { success: true, filePath };
  }));

  ipcMain.handle('restore-database', logger.wrapHandler('restore-database', async () => {
    const mainWindow = getMainWindow();
    const settings = getAutoBackupSettings();
    const backupFolder = settings.location || DEFAULT_BACKUP_FOLDER;

    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File to Restore',
      defaultPath: backupFolder,
      filters: [{ name: 'Database Files', extensions: ['db'] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    const backupPath = filePaths[0];
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Restore'],
      defaultId: 0,
      title: 'Confirm Restore',
      message: 'This will replace all current data with the backup. This cannot be undone.',
      detail: `Restoring from: ${backupPath}`
    });
    if (response === 0) return { success: false, canceled: true };

    // Safety backup before restore
    const currentBackupPath = path.join(userDataPath, `qanuni-pre-restore-${Date.now()}.db`);
    const currentData = database.getDb().export();
    fs.writeFileSync(currentBackupPath, Buffer.from(currentData));

    // Load backup
    const fileBuffer = fs.readFileSync(backupPath);
    database.replaceDb(new SQL.Database(fileBuffer));

    logger.warn('Database restored from backup', { backupPath, safetyBackup: currentBackupPath });
    return { success: true, message: 'Database restored successfully. Please restart the application.' };
  }));

  ipcMain.handle('export-all-data', logger.wrapHandler('export-all-data', async () => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export All Data',
      defaultPath: path.join(app.getPath('documents'), `qanuni-export-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    const tables = [
      { name: 'Clients', query: 'SELECT * FROM clients' },
      { name: 'Matters', query: 'SELECT * FROM matters' },
      { name: 'Hearings', query: 'SELECT * FROM hearings' },
      { name: 'Judgments', query: 'SELECT * FROM judgments' },
      { name: 'Tasks', query: 'SELECT * FROM tasks' },
      { name: 'Timesheets', query: 'SELECT * FROM timesheets' },
      { name: 'Expenses', query: 'SELECT * FROM expenses' },
      { name: 'Advances', query: 'SELECT * FROM advances' },
      { name: 'Invoices', query: 'SELECT * FROM invoices' },
      { name: 'Invoice Items', query: 'SELECT * FROM invoice_items' }
    ];
    for (const table of tables) {
      const data = database.query(table.query);
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, table.name);
      }
    }
    XLSX.writeFile(wb, filePath);
    logger.info('All data exported', { filePath });
    return { success: true, filePath };
  }));

  // -------------------- CURRENCIES --------------------

  ipcMain.handle('get-currencies', logger.wrapHandler('get-currencies', () => {
    return getCurrencies(database);
  }));

  ipcMain.handle('add-currency', logger.wrapHandler('add-currency', (event, data) => {
    return addCurrency(database, data);
  }));

  ipcMain.handle('update-currency', logger.wrapHandler('update-currency', (event, data) => {
    return updateCurrency(database, data);
  }));

  ipcMain.handle('delete-currency', logger.wrapHandler('delete-currency', (event, id) => {
    return deleteCurrency(database, id);
  }));

  // -------------------- EXCHANGE RATES --------------------

  ipcMain.handle('get-exchange-rates', logger.wrapHandler('get-exchange-rates', () => {
    return getExchangeRates(database);
  }));

  ipcMain.handle('add-exchange-rate', logger.wrapHandler('add-exchange-rate', (event, data) => {
    return addExchangeRate(database, data);
  }));

  ipcMain.handle('update-exchange-rate', logger.wrapHandler('update-exchange-rate', (event, data) => {
    return updateExchangeRate(database, data);
  }));

  ipcMain.handle('delete-exchange-rate', logger.wrapHandler('delete-exchange-rate', (event, rateId) => {
    return deleteExchangeRate(database, rateId);
  }));

  ipcMain.handle('get-exchange-rate-for-date', logger.wrapHandler('get-exchange-rate-for-date', (event, fromCurrency, toCurrency, date) => {
    return getExchangeRateForDate(database, fromCurrency, toCurrency, date);
  }));

  // -------------------- OPEN FILE (Electron-only) --------------------

  ipcMain.handle('open-file', logger.wrapHandler('open-file', async (event, filePath) => {
    await shell.openPath(filePath);
    return { success: true };
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getSettings = getSettings;
module.exports.getSetting = getSetting;
module.exports.saveSetting = saveSetting;
module.exports.saveFirmInfo = saveFirmInfo;
module.exports.getFirmInfo = getFirmInfo;
module.exports.getCurrencies = getCurrencies;
module.exports.addCurrency = addCurrency;
module.exports.updateCurrency = updateCurrency;
module.exports.deleteCurrency = deleteCurrency;
module.exports.getExchangeRates = getExchangeRates;
module.exports.addExchangeRate = addExchangeRate;
module.exports.updateExchangeRate = updateExchangeRate;
module.exports.deleteExchangeRate = deleteExchangeRate;
module.exports.getExchangeRateForDate = getExchangeRateForDate;
