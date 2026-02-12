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
 * @version 2.0.0 (Phase 2 Hardening — Complete)
 */

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const XLSX = require('xlsx');

// Core modules
const logger = require('./electron/logging');
const database = require('./electron/database');
const migrations = require('./electron/migrations');
const validation = require('./electron/validation');
const { createTables, seedLookupData } = require('./electron/schema');
const licenseManager = require('./licensing/license-manager');
const crashRecovery = require('./electron/crash-recovery');

let mainWindow = null;

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  // 1. Initialize logging FIRST (everything else depends on it)
  logger.init({ level: isDev ? 'debug' : 'info' });
  // Note: crashRecovery.init() is called after database initialization
  // It installs uncaughtException, unhandledRejection, and before-quit handlers
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
      database.saveToDisk();
    }

    // Run pending migrations
    const migrationResult = migrations.runAll(database);
    if (migrationResult.applied > 0) {
      logger.info('Migrations applied', migrationResult);
      database.saveToDisk();
    }
  } catch (error) {
    logger.error('Database initialization FAILED', { error: error.message, stack: error.stack });
    dialog.showErrorBox(
      'Qanuni - Database Error',
      `Failed to initialize database:\n${error.message}\n\nThe application will now close.`
    );
    app.quit();
    return;
  }

  // 4. Install crash recovery handlers (after database is ready)
  crashRecovery.init();

  // 5. Check auto-backup
  try {
    const settingsModule = require('./electron/ipc/settings');
    if (typeof settingsModule.checkBackupOnStartup === 'function') {
      settingsModule.checkBackupOnStartup(database);
    }
  } catch (error) {
    logger.warn('Auto-backup check failed', { error: error.message });
    // Non-fatal — continue startup
  }

  // 6. Register all IPC handlers
  registerAllHandlers();

  // 7. Create window
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
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Qanuni - Legal ERP'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ==================== HELPER ====================

/** Safe getter — modules receive this so they can access mainWindow without tight coupling */
function getMainWindow() {
  return mainWindow;
}

// ==================== IPC HANDLER REGISTRATION ====================

function registerAllHandlers() {
  // Shared dependencies passed to all modules
  const baseDeps = { database, logger, validation };

  // Electron API dependencies (only some modules need these)
  const electronDeps = {
    ...baseDeps,
    getMainWindow,
    dialog,
    shell,
    app,
    fs,
    path,
    BrowserWindow,
    XLSX,
  };

  // Module registration table
  // Each entry: [modulePath, dependencies]
  // Most modules only need baseDeps. Modules that use Electron APIs or XLSX get electronDeps.
  const modules = [
    // --- Core CRUD (baseDeps only) ---
    ['./electron/ipc/clients',          baseDeps],
    ['./electron/ipc/lawyers',          baseDeps],
    ['./electron/ipc/matters',          baseDeps],
    ['./electron/ipc/diary',            baseDeps],
    ['./electron/ipc/hearings',         baseDeps],
    ['./electron/ipc/judgments',        baseDeps],
    ['./electron/ipc/deadlines',        baseDeps],
    ['./electron/ipc/tasks',            baseDeps],
    ['./electron/ipc/timesheets',       baseDeps],
    ['./electron/ipc/expenses',         baseDeps],
    ['./electron/ipc/advances',         baseDeps],
    ['./electron/ipc/appointments',     baseDeps],
    ['./electron/ipc/lookups',          baseDeps],
    ['./electron/ipc/conflict-check',   baseDeps],
    ['./electron/ipc/corporate',        baseDeps],
    ['./electron/ipc/trash',            baseDeps],

    // --- License (needs licenseManager) ---
    ['./electron/ipc/license',          { ...baseDeps, licenseManager, isDev }],

    // --- Modules needing Electron APIs / XLSX ---
    ['./electron/ipc/invoices',         electronDeps],
    ['./electron/ipc/settings',         electronDeps],
    ['./electron/ipc/reports',          electronDeps],
    ['./electron/ipc/client-imports',   electronDeps],
    ['./electron/ipc/matter-timeline', electronDeps],
  ];

  let loaded = 0;
  let failed = 0;

  for (const [modulePath, deps] of modules) {
    try {
      const registerHandlers = require(modulePath);
      registerHandlers(deps);
      loaded++;
      logger.debug(`IPC module loaded: ${modulePath}`);
    } catch (error) {
      failed++;
      logger.error(`Failed to load IPC module: ${modulePath}`, {
        error: error.message,
        stack: error.stack
      });
    }
  }

  logger.info('IPC handler registration complete', { loaded, failed, total: modules.length });
}

// ==================== GRACEFUL SHUTDOWN ====================

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Note: crash-recovery.js handles force save and shutdown logging
  // This handler only runs auto-backup if configured for on_close
  try {
    const settingsModule = require('./electron/ipc/settings');
    if (typeof settingsModule.getAutoBackupSettings === 'function' &&
        typeof settingsModule.performAutoBackup === 'function') {
      const settings = settingsModule.getAutoBackupSettings(database);
      if (settings.enabled && settings.frequency === 'on_close') {
        settingsModule.performAutoBackup(database);
      }
    }
  } catch (error) {
    logger.error('Auto-backup on close failed', { error: error.message });
  }
});
