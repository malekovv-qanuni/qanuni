/**
 * Qanuni - Main Process Entry Point
 * 
 * This file handles ONLY:
 * - App lifecycle (startup, quit, window management)
 * - Database initialization
 * - Module loading
 * - Crash safety
 * 
 * All IPC handlers live in electron/ipc/*.js
 * All database operations go through electron/database.js
 * All logging goes through electron/logging.js
 * 
 * @version 2.0.0 (Phase 1 Hardening)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Core modules
const logger = require('./electron/logging');
const database = require('./electron/database');
const migrations = require('./electron/migrations');
const { createTables, seedLookupData } = require('./electron/schema');
const licenseManager = require('./license/license-manager');

let mainWindow = null;

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  // 1. Initialize logging FIRST (everything else depends on it)
  logger.init({ level: isDev ? 'debug' : 'info' });
  logger.installCrashHandlers(database);
  logger.info('Qanuni starting', { version: app.getVersion(), isDev, pid: process.pid });

  // 2. Check license — FAIL CLOSED
  let licenseStatus;
  try {
    licenseStatus = licenseManager.getLicenseStatusSummary();
    logger.info('License check', { status: licenseStatus.status, valid: licenseStatus.isValid });
  } catch (error) {
    logger.error('License check failed', { error: error.message });
    licenseStatus = { isValid: false, status: 'ERROR', message: 'License verification failed' };
  }

  // 3. Initialize database
  try {
    await database.init();

    // Create tables if this is a fresh database
    const tableCheck = database.queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'");
    if (!tableCheck) {
      logger.info('Fresh database — creating tables and seeding lookup data');
      createTables(database);
      seedLookupData(database);
    }

    // Run pending migrations
    const migrationResult = migrations.runAll(database);
    if (migrationResult.applied > 0) {
      logger.info('Migrations applied', migrationResult);
      database.saveToDisk(); // Save after migrations
    }
  } catch (error) {
    logger.error('Database initialization FAILED', { error: error.message, stack: error.stack });
    // Show error dialog and quit — can't run without a database
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Qanuni - Database Error',
      `Failed to initialize database:\n${error.message}\n\nThe application will now close.`
    );
    app.quit();
    return;
  }

  // 4. Check auto-backup
  try {
    const { checkBackupOnStartup } = require('./electron/ipc/settings');
    checkBackupOnStartup(database);
  } catch (error) {
    logger.warn('Auto-backup check failed', { error: error.message });
    // Non-fatal — continue startup
  }

  // 5. Register all IPC handlers
  registerAllHandlers();

  // 6. Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ==================== WINDOW ====================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Qanuni - Legal ERP'
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ==================== IPC HANDLER REGISTRATION ====================

function registerAllHandlers() {
  // Each module registers its own ipcMain.handle calls
  // They receive the database and logger instances
  const modules = [
    './electron/ipc/clients',
    './electron/ipc/matters',
    './electron/ipc/hearings',
    './electron/ipc/timesheets',
    './electron/ipc/expenses',
    './electron/ipc/invoices',
    './electron/ipc/tasks',
    './electron/ipc/judgments',
    './electron/ipc/appointments',
    './electron/ipc/advances',
    './electron/ipc/deadlines',
    './electron/ipc/corporate',
    './electron/ipc/reports',
    './electron/ipc/settings',
    './electron/ipc/lookups',
    './electron/ipc/license',
    './electron/ipc/trash',
    './electron/ipc/diary',
    './electron/ipc/conflict-check',
  ];

  for (const modulePath of modules) {
    try {
      const registerHandlers = require(modulePath);
      registerHandlers({ database, logger, mainWindow: () => mainWindow });
      logger.debug(`IPC module loaded: ${modulePath}`);
    } catch (error) {
      logger.error(`Failed to load IPC module: ${modulePath}`, { error: error.message });
    }
  }

  logger.info('All IPC handlers registered');
}

// ==================== GRACEFUL SHUTDOWN ====================

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  logger.info('App shutting down');

  // Force save database (no debounce, no async)
  database.forceSave();

  // Run auto-backup if configured for on_close
  try {
    const { performAutoBackup, getAutoBackupSettings } = require('./electron/ipc/settings');
    const settings = getAutoBackupSettings(database);
    if (settings.enabled && settings.frequency === 'on_close') {
      performAutoBackup(database);
    }
  } catch (error) {
    logger.error('Auto-backup on close failed', { error: error.message });
  }

  logger.info('Shutdown complete');
});
