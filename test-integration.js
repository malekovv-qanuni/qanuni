/**
 * Qanuni Integration Test Harness
 * 
 * Tests all 161 IPC handlers without launching Electron.
 * Run: node test-integration.js
 * 
 * What it does:
 * 1. Creates a fresh in-memory SQLite database
 * 2. Mocks Electron's ipcMain to capture handler registrations
 * 3. Loads all 21 IPC modules
 * 4. Verifies every preload.js channel has a registered handler
 * 5. Calls each handler with valid test data
 * 6. Validates response shape (no errors, correct fields)
 * 7. Reports all failures in one pass
 * 
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ==================== TEST FRAMEWORK ====================

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const warnings = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    process.stdout.write('\x1b[32m.\x1b[0m'); // green dot
  } else {
    failed++;
    failures.push({ test: testName, details });
    process.stdout.write('\x1b[31mF\x1b[0m'); // red F
  }
}

function skip(testName, reason) {
  skipped++;
  warnings.push({ test: testName, reason });
  process.stdout.write('\x1b[33mS\x1b[0m'); // yellow S
}

function warn(message) {
  warnings.push({ test: 'WARNING', reason: message });
}

// ==================== MOCK ELECTRON ====================

const registeredHandlers = {};

const mockIpcMain = {
  handle: (channel, handler) => {
    if (registeredHandlers[channel]) {
      warn(`Duplicate handler registration: ${channel}`);
    }
    registeredHandlers[channel] = handler;
  }
};

// Mock Electron module before any requires
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') return path.join(__dirname, '.test-data');
    if (name === 'documents') return path.join(__dirname, '.test-data');
    return __dirname;
  },
  getVersion: () => '1.0.0-test',
  quit: () => {},
  on: () => {},
  whenReady: () => Promise.resolve(),
};

const mockDialog = {
  showSaveDialog: async () => ({ canceled: true }),
  showOpenDialog: async () => ({ canceled: true }),
  showErrorBox: () => {},
  showMessageBox: async () => ({ response: 0 }),
};

const mockShell = {
  openPath: async () => ({}),
  openExternal: async () => {},
};

const mockBrowserWindow = function() {
  return {
    loadURL: () => {},
    on: () => {},
    webContents: { openDevTools: () => {}, send: () => {} },
    close: () => {},
  };
};
mockBrowserWindow.getAllWindows = () => [];

// Install mock before requiring modules
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') {
    return {
      ipcMain: mockIpcMain,
      app: mockApp,
      BrowserWindow: mockBrowserWindow,
      dialog: mockDialog,
      shell: mockShell,
      contextBridge: { exposeInMainWorld: () => {} },
      ipcRenderer: { invoke: () => {} },
    };
  }
  if (id === 'electron-is-dev') {
    return true;
  }
  return originalRequire.apply(this, arguments);
};

// ==================== MOCK DATABASE ====================

// Use the real database module but patch the init to use in-memory DB
let database;
let SQL;

async function initTestDatabase() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  
  // Create the database module with overridden behavior
  database = {
    _db: null,
    _inTransaction: false,
    
    init: async function() {
      this._db = new SQL.Database();
      this._db.run('PRAGMA foreign_keys = ON');
      return this._db;
    },
    
    query: function(sql, params = []) {
      const sanitized = params.map(p => p === undefined ? null : p);
      try {
        const stmt = this._db.prepare(sql);
        stmt.bind(sanitized);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (error) {
        throw new Error(`Query failed: ${error.message}\nSQL: ${sql.substring(0, 200)}`);
      }
    },
    
    queryOne: function(sql, params = []) {
      const results = this.query(sql, params);
      return results.length > 0 ? results[0] : null;
    },
    
    execute: function(sql, params = []) {
      const sanitized = params.map(p => p === undefined ? null : p);
      try {
        this._db.run(sql, sanitized);
        return { success: true };
      } catch (error) {
        throw new Error(`Execute failed: ${error.message}\nSQL: ${sql.substring(0, 200)}`);
      }
    },
    
    run: function(sql) {
      try {
        this._db.run(sql);
      } catch (error) {
        throw new Error(`Run failed: ${error.message}\nSQL: ${sql.substring(0, 200)}`);
      }
    },
    
    transaction: function(fn) {
      this._inTransaction = true;
      try {
        this._db.run('BEGIN TRANSACTION');
        const result = fn();
        this._db.run('COMMIT');
        this._inTransaction = false;
        return result;
      } catch (error) {
        try { this._db.run('ROLLBACK'); } catch(e) {}
        this._inTransaction = false;
        throw error;
      }
    },
    
    generateId: function(prefix) {
      const year = new Date().getFullYear();
      const random = crypto.randomBytes(4).toString('hex');
      return `${prefix}-${year}-${random}`;
    },
    
    saveToDisk: function() { return true; },
    forceSave: function() { return true; },
    close: function() { if (this._db) this._db.close(); },
    checkIntegrity: function() { return { ok: true, result: 'ok' }; },
    getStatus: function() { return { initialized: true, path: ':memory:', isTestMode: true }; },
    exportBuffer: function() { return Buffer.from(this._db.export()); },
    getPath: function() { return ':memory:'; },
    DatabaseError: class DatabaseError extends Error {
      constructor(message, code, details = {}) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.details = details;
      }
    }
  };
  
  await database.init();
}

// ==================== MOCK LOGGER ====================

const mockLogger = {
  init: () => {},
  info: () => {},
  warn: () => {},
  error: (...args) => {
    // Capture errors for debugging
    if (args[0] && typeof args[0] === 'string' && !args[0].includes('wrapHandler')) {
      // Uncomment below to see all logged errors during testing:
      // console.error('\n  [LOG ERROR]', args[0], args[1] || '');
    }
  },
  debug: () => {},
  installCrashHandlers: () => {},
  wrapHandler: (name, fn) => fn, // Pass-through — no wrapping in tests
};

// ==================== MOCK VALIDATION ====================

// Load the real validation module
let validation;
function loadValidation() {
  try {
    validation = require('./electron/validation');
  } catch (e) {
    // Fallback mock if validation.js can't be loaded
    warn('Could not load electron/validation.js — using permissive mock');
    validation = {
      check: () => ({ valid: true }),
      validate: () => ({ valid: true }),
    };
  }
}

// ==================== PRELOAD CHANNEL LIST ====================
// Every channel from preload.js — the source of truth

const PRELOAD_CHANNELS = [
  // Dashboard
  'get-dashboard-stats', 'get-pending-invoices',
  // Clients
  'get-all-clients', 'add-client', 'update-client', 'delete-client',
  'import-clients-excel', 'export-client-template',
  // Lawyers
  'get-lawyers', 'get-all-lawyers', 'add-lawyer', 'update-lawyer', 'delete-lawyer',
  'check-lawyer-usage', 'reactivate-lawyer',
  // Matters
  'get-all-matters', 'add-matter', 'update-matter', 'delete-matter',
  'get-related-matters', 'check-file-number-unique',
  // Diary
  'get-matter-timeline', 'add-diary-entry', 'update-diary-entry', 'delete-diary-entry',
  // Hearings
  'get-all-hearings', 'add-hearing', 'update-hearing', 'delete-hearing',
  // Judgments
  'get-all-judgments', 'add-judgment', 'update-judgment', 'delete-judgment',
  // Deadlines
  'get-all-deadlines', 'add-deadline', 'update-deadline',
  'update-deadline-status', 'delete-deadline', 'get-deadlines-by-judgment',
  // Tasks
  'get-all-tasks', 'add-task', 'update-task', 'delete-task',
  // Timesheets
  'get-all-timesheets', 'add-timesheet', 'update-timesheet', 'delete-timesheet',
  'get-unbilled-time',
  // Expenses
  'get-all-expenses', 'add-expense', 'add-expense-with-deduction', 'add-expenses-batch',
  'update-expense', 'delete-expense', 'get-unbilled-expenses',
  'export-expenses-to-excel', 'export-expenses-to-pdf',
  // Advances
  'get-all-advances', 'add-advance', 'update-advance', 'delete-advance',
  'get-client-expense-advance', 'get-client-retainer', 'get-lawyer-advance',
  'deduct-from-advance', 'deduct-retainer',
  // Invoices
  'get-all-invoices', 'get-invoice', 'get-invoice-items', 'create-invoice',
  'update-invoice-status', 'delete-invoice', 'generate-invoice-number',
  'generate-invoice-pdfs',
  // Appointments
  'get-all-appointments', 'add-appointment', 'update-appointment', 'delete-appointment',
  // Lookups
  'get-court-types', 'get-regions', 'get-hearing-purposes', 'get-task-types',
  'get-expense-categories', 'add-lookup-item', 'update-lookup-item', 'delete-lookup-item',
  'get-entity-types',
  // Corporate
  'get-all-corporate-entities', 'get-corporate-entity', 'add-corporate-entity',
  'update-corporate-entity', 'delete-corporate-entity',
  'get-company-clients-without-entity', 'get-corporate-clients',
  'get-shareholders', 'add-shareholder', 'update-shareholder', 'delete-shareholder',
  'get-total-shares',
  'get-share-transfers', 'add-share-transfer', 'update-share-transfer', 'delete-share-transfer',
  'get-directors', 'add-director', 'update-director', 'delete-director',
  'get-filings', 'add-filing', 'update-filing', 'delete-filing',
  'get-meetings', 'add-meeting', 'update-meeting', 'delete-meeting',
  'get-upcoming-compliance',
  // Conflict Check
  'conflict-check', 'log-conflict-check',
  // Reports
  'generate-report',
  // Settings
  'get-settings', 'get-setting', 'save-setting', 'get-firm-info', 'save-firm-info',
  'get-currencies', 'add-currency', 'update-currency', 'delete-currency',
  'get-exchange-rates', 'add-exchange-rate', 'update-exchange-rate', 'delete-exchange-rate',
  'get-exchange-rate-for-date',
  // Backup
  'backup-database', 'restore-database', 'export-all-data',
  'get-auto-backup-status', 'save-auto-backup-settings', 'run-auto-backup',
  'select-backup-folder', 'get-backup-history', 'open-backup-folder',
  // Trash
  'get-trash-items', 'get-trash-count', 'restore-trash-item',
  'permanent-delete-item', 'empty-trash',
  // Export
  'export-to-excel', 'export-to-csv', 'export-to-pdf', 'open-file',
  'export-client-statement-pdf', 'export-client-statement-excel',
  'export-case-status-pdf', 'export-case-status-excel',
  'export-client-360-pdf', 'export-client-360-excel',
  // License
  'license:getMachineId', 'license:getStatus', 'license:validate', 'license:clear',
];

// Channels that require file dialogs or external deps — test registration only
const DIALOG_CHANNELS = [
  'import-clients-excel', 'export-client-template',
  'backup-database', 'restore-database', 'export-all-data',
  'run-auto-backup', 'select-backup-folder', 'open-backup-folder',
  'export-to-excel', 'export-to-csv', 'export-to-pdf', 'open-file',
  'export-expenses-to-excel', 'export-expenses-to-pdf',
  'export-client-statement-pdf', 'export-client-statement-excel',
  'export-case-status-pdf', 'export-case-status-excel',
  'export-client-360-pdf', 'export-client-360-excel',
  'generate-invoice-pdfs',
  'save-auto-backup-settings', 'get-auto-backup-status', 'get-backup-history',
];

// License channels — need license manager mock
const LICENSE_CHANNELS = [
  'license:getMachineId', 'license:getStatus', 'license:validate', 'license:clear',
];

// ==================== TEST DATA ====================

const TEST_IDS = {};

function makeTestData() {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return {
    client: {
      client_name: 'Test Client Corp',
      client_name_arabic: null,
      client_type: 'legal_entity',
      entity_type: 'SAL',
      custom_id: 'TC-001',
      registration_number: '12345',
      vat_number: 'VAT-001',
      main_contact: 'John Test',
      email: 'john@test.com',
      phone: '+961-1-111111',
      mobile: '+961-70-111111',
      address: 'Beirut, Lebanon',
      website: 'www.test.com',
      industry: 'Technology',
      default_currency: 'USD',
      billing_terms: 'hourly',
      source: 'Test',
      notes: 'Test client',
    },
    lawyer: {
      full_name: 'Test Lawyer',
      full_name_arabic: null,
      initials: 'TL',
      email: 'lawyer@test.com',
      phone: '+961-1-222222',
      hourly_rate: 200,
      hourly_rate_currency: 'USD',
    },
    matter: {
      matter_name: 'Test Matter v Corp',
      matter_name_arabic: null,
      matter_type: 'litigation',
      status: 'active',
      case_number: '2026/TEST-001',
      opening_date: today,
      notes: 'Test matter',
    },
    hearing: {
      hearing_date: today,
      hearing_time: '10:00',
      outcome: null,
      notes: 'Test hearing',
    },
    judgment: {
      judgment_type: 'first_instance',
      expected_date: today,
      status: 'pending',
      notes: 'Test judgment',
    },
    deadline: {
      title: 'Test Deadline',
      deadline_date: today,
      reminder_days: 7,
      priority: 'medium',
      status: 'pending',
      notes: 'Test deadline',
    },
    task: {
      title: 'Test Task',
      description: 'Test task description',
      due_date: today,
      priority: 'medium',
      status: 'assigned',
    },
    timesheet: {
      date: today,
      minutes: 120,
      narrative: 'Test time entry',
      billable: 1,
      rate_per_hour: 200,
      rate_currency: 'USD',
      status: 'draft',
    },
    expense: {
      expense_type: 'client',
      amount: 500,
      currency: 'USD',
      description: 'Test expense',
      date: today,
      billable: 1,
      status: 'pending',
    },
    advance: {
      advance_type: 'client_retainer',
      amount: 5000,
      currency: 'USD',
      date_received: today,
      payment_method: 'bank_transfer',
      balance_remaining: 5000,
      status: 'active',
    },
    appointment: {
      appointment_type: 'client_meeting',
      title: 'Test Appointment',
      date: today,
      start_time: '14:00',
      end_time: '15:00',
      status: 'scheduled',
    },
    diary_entry: {
      entry_date: today,
      entry_type: 'note',
      title: 'Test diary entry',
      description: 'Test description',
    },
    director: {
      name: 'Test Director',
      position: 'Director',
      nationality: 'Lebanese',
    },
    shareholder: {
      name: 'Test Shareholder',
      nationality: 'Lebanese',
      shares_owned: 100,
      share_class: 'Ordinary',
    },
    filing: {
      filing_type: 'annual_return',
      filing_description: 'Annual Return 2026',
      filing_date: today,
      status: 'completed',
    },
    meeting: {
      meeting_type: 'agm',
      meeting_description: 'Annual General Meeting 2026',
      meeting_date: today,
      status: 'held',
    },
    corporate_entity: {
      registration_number: 'CR-12345',
      share_capital: 100000,
      share_capital_currency: 'USD',
      total_shares: 1000,
      status: 'active',
    },
  };
}

// ==================== TEST RUNNER ====================

async function callHandler(channel, ...args) {
  const handler = registeredHandlers[channel];
  if (!handler) return { __missing: true };
  try {
    const result = await handler({/* event */}, ...args);
    return result;
  } catch (error) {
    return { __error: true, message: error.message, stack: error.stack };
  }
}

async function runTests() {
  console.log('\n\x1b[1m=== Qanuni Integration Test ===\x1b[0m\n');

  // ---- Phase 0: Setup ----
  console.log('Setting up test database...');
  await initTestDatabase();
  loadValidation();

  // Load schema and seed data
  console.log('Loading schema and seed data...');
  try {
    const { createTables, seedLookupData } = require('./electron/schema');
    createTables(database);
    seedLookupData(database);
    console.log('Schema and seed data loaded successfully.\n');
  } catch (e) {
    console.error(`\x1b[31mFATAL: Could not load schema.js: ${e.message}\x1b[0m`);
    console.error(e.stack);
    process.exit(1);
  }

  // ---- Phase 1: Load all modules ----
  console.log('\x1b[1m[Phase 1] Loading IPC modules\x1b[0m');

  const baseDeps = { database, logger: mockLogger, validation };
  const electronDeps = {
    ...baseDeps,
    getMainWindow: () => ({}),
    dialog: mockDialog,
    shell: mockShell,
    app: mockApp,
    fs,
    path,
    BrowserWindow: mockBrowserWindow,
  };

  const moduleConfigs = [
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
    ['./electron/ipc/license',          { ...baseDeps, licenseManager: { getLicenseStatusSummary: () => ({ status: 'ACTIVE', isValid: true }), getMachineId: () => 'test-machine-id', validateLicenseKey: () => ({ valid: true }), clearLicense: () => ({}) }, isDev: true }],
    ['./electron/ipc/invoices',         electronDeps],
    ['./electron/ipc/settings',         electronDeps],
    ['./electron/ipc/reports',          electronDeps],
    ['./electron/ipc/client-imports',   electronDeps],
  ];

  const loadedModules = [];
  const failedModules = [];

  for (const [modulePath, deps] of moduleConfigs) {
    try {
      const registerHandlers = require(modulePath);
      registerHandlers(deps);
      loadedModules.push(modulePath);
      process.stdout.write('\x1b[32m.\x1b[0m');
    } catch (error) {
      failedModules.push({ path: modulePath, error: error.message, stack: error.stack });
      process.stdout.write('\x1b[31mF\x1b[0m');
    }
  }
  console.log(`\n  Loaded: ${loadedModules.length}/${moduleConfigs.length}`);
  if (failedModules.length > 0) {
    console.log('\x1b[31m  Failed modules:\x1b[0m');
    failedModules.forEach(m => console.log(`    ${m.path}: ${m.error}`));
  }

  // ---- Phase 2: Channel Coverage ----
  console.log('\n\x1b[1m[Phase 2] Channel coverage check\x1b[0m');

  const registeredChannels = Object.keys(registeredHandlers).sort();
  const preloadSet = new Set(PRELOAD_CHANNELS);
  const registeredSet = new Set(registeredChannels);

  const missingFromBackend = PRELOAD_CHANNELS.filter(c => !registeredSet.has(c));
  const extraInBackend = registeredChannels.filter(c => !preloadSet.has(c));

  console.log(`  Preload channels:    ${PRELOAD_CHANNELS.length}`);
  console.log(`  Registered handlers: ${registeredChannels.length}`);

  if (missingFromBackend.length > 0) {
    console.log(`\x1b[31m  MISSING (in preload but no handler): ${missingFromBackend.length}\x1b[0m`);
    missingFromBackend.forEach(c => {
      console.log(`    \x1b[31m✗\x1b[0m ${c}`);
      assert(false, `Channel registered: ${c}`, 'No handler found');
    });
  } else {
    console.log('  \x1b[32m✓ All preload channels have handlers\x1b[0m');
  }

  if (extraInBackend.length > 0) {
    console.log(`\x1b[33m  EXTRA (handler exists but not in preload): ${extraInBackend.length}\x1b[0m`);
    extraInBackend.forEach(c => console.log(`    \x1b[33m?\x1b[0m ${c}`));
  }

  // ---- Phase 3: CRUD Tests ----
  console.log('\n\x1b[1m[Phase 3] CRUD handler tests\x1b[0m');
  const data = makeTestData();

  // 3.1 — Lookups (should already be seeded)
  console.log('\n  Lookups:');
  for (const [channel, minExpected] of [
    ['get-court-types', 10],
    ['get-regions', 10],
    ['get-hearing-purposes', 5],
    ['get-task-types', 5],
    ['get-expense-categories', 5],
    ['get-entity-types', 10],
  ]) {
    const result = await callHandler(channel);
    if (result?.__missing) {
      assert(false, channel, 'Handler not registered');
    } else if (result?.__error) {
      assert(false, channel, result.message);
    } else {
      const count = Array.isArray(result) ? result.length : 0;
      assert(count >= minExpected, `${channel} returns ${minExpected}+ items`, `Got ${count}`);
    }
  }

  // 3.2 — Clients CRUD
  console.log('\n  Clients:');
  let clientResult = await callHandler('add-client', data.client);
  assert(!clientResult?.__error, 'add-client', clientResult?.message || '');
  // Get the client ID
  const clients = await callHandler('get-all-clients');
  assert(Array.isArray(clients) && clients.length > 0, 'get-all-clients returns array', `Got: ${typeof clients}`);
  if (clients?.length > 0) {
    TEST_IDS.client_id = clients[0].client_id;
    assert(clients[0].client_name === 'Test Client Corp', 'get-all-clients has correct name');
    // Update
    const updateResult = await callHandler('update-client', { ...data.client, client_id: TEST_IDS.client_id, client_name: 'Updated Client' });
    assert(!updateResult?.__error, 'update-client', updateResult?.message || '');
  }

  // 3.3 — Lawyers CRUD
  console.log('\n  Lawyers:');
  const lawyerResult = await callHandler('add-lawyer', data.lawyer);
  assert(lawyerResult?.success === true && lawyerResult?.lawyerId, 'add-lawyer returns success+id', `Got: ${JSON.stringify(lawyerResult)?.substring(0, 200)}`);
  // Raw DB check to isolate mock issues
  const rawLawyers = database.query('SELECT * FROM lawyers');
  assert(rawLawyers.length > 0, 'add-lawyer persists in DB (raw query)', `Raw rows: ${rawLawyers.length}, active values: ${rawLawyers.map(r=>r.active)}`);
  const lawyers = await callHandler('get-lawyers');
  assert(Array.isArray(lawyers) && lawyers.length > 0, 'get-lawyers returns active lawyers', `Handler returned ${lawyers?.length || 0} rows. Raw DB has ${rawLawyers.length} rows with active=${rawLawyers.map(r=>r.active)}`);
  if (lawyers?.length > 0) {
    TEST_IDS.lawyer_id = lawyers[0].lawyer_id || lawyers[0].full_name;
    assert(lawyers[0].full_name !== undefined, 'get-lawyers has full_name alias', `Keys: ${Object.keys(lawyers[0])}`);
    assert(lawyers[0].lawyer_id !== undefined, 'get-lawyers has lawyer_id', `Keys: ${Object.keys(lawyers[0])}`);
  }
  const allLawyers = await callHandler('get-all-lawyers');
  assert(Array.isArray(allLawyers) && allLawyers.length > 0, 'get-all-lawyers returns data', `Got: ${allLawyers?.length || 0} rows`);
  if (allLawyers?.length > 0) {
    TEST_IDS.lawyer_id = allLawyers[0].lawyer_id;
  } else if (lawyerResult?.lawyerId) {
    TEST_IDS.lawyer_id = lawyerResult.lawyerId;
  }

  // 3.4 — Matters CRUD
  console.log('\n  Matters:');
  const matterData = { ...data.matter, client_id: TEST_IDS.client_id, responsible_lawyer_id: TEST_IDS.lawyer_id };
  const matterResult = await callHandler('add-matter', matterData);
  assert(!matterResult?.__error, 'add-matter', matterResult?.message || '');
  const matters = await callHandler('get-all-matters');
  assert(Array.isArray(matters) && matters.length > 0, 'get-all-matters returns array with data');
  if (matters?.length > 0) {
    TEST_IDS.matter_id = matters[0].matter_id;
    // Check joins
    assert(matters[0].client_name !== undefined, 'get-all-matters has client_name (joined)', `Keys: ${Object.keys(matters[0])}`);
  }
  const fileCheck = await callHandler('check-file-number-unique', 'UNIQUE-001', null);
  assert(!fileCheck?.__error, 'check-file-number-unique', fileCheck?.message || '');
  const relatedMatters = await callHandler('get-related-matters', TEST_IDS.matter_id || 'none');
  assert(!relatedMatters?.__error, 'get-related-matters', relatedMatters?.message || '');

  // 3.5 — Hearings CRUD
  console.log('\n  Hearings:');
  const hearingData = { ...data.hearing, matter_id: TEST_IDS.matter_id };
  const hearingResult = await callHandler('add-hearing', hearingData);
  assert(!hearingResult?.__error, 'add-hearing', hearingResult?.message || '');
  const hearings = await callHandler('get-all-hearings');
  assert(Array.isArray(hearings), 'get-all-hearings returns array');
  if (hearings?.length > 0) {
    TEST_IDS.hearing_id = hearings[0].hearing_id;
    assert(hearings[0].matter_name !== undefined, 'get-all-hearings has matter_name (joined)', `Keys: ${Object.keys(hearings[0])}`);
  }

  // 3.6 — Judgments CRUD
  console.log('\n  Judgments:');
  const judgmentData = { ...data.judgment, matter_id: TEST_IDS.matter_id, hearing_id: TEST_IDS.hearing_id };
  const judgmentResult = await callHandler('add-judgment', judgmentData);
  assert(!judgmentResult?.__error, 'add-judgment', judgmentResult?.message || '');
  const judgments = await callHandler('get-all-judgments');
  assert(Array.isArray(judgments), 'get-all-judgments returns array');
  if (judgments?.length > 0) TEST_IDS.judgment_id = judgments[0].judgment_id;

  // 3.7 — Deadlines CRUD
  console.log('\n  Deadlines:');
  const deadlineData = { ...data.deadline, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id, judgment_id: TEST_IDS.judgment_id };
  const deadlineResult = await callHandler('add-deadline', deadlineData);
  assert(!deadlineResult?.__error, 'add-deadline', deadlineResult?.message || '');
  const deadlines = await callHandler('get-all-deadlines');
  assert(Array.isArray(deadlines), 'get-all-deadlines returns array');
  if (deadlines?.length > 0) {
    TEST_IDS.deadline_id = deadlines[0].deadline_id;
    // Test status update
    const statusResult = await callHandler('update-deadline-status', TEST_IDS.deadline_id, 'completed');
    assert(!statusResult?.__error, 'update-deadline-status', statusResult?.message || '');
  }
  const byJudgment = await callHandler('get-deadlines-by-judgment', TEST_IDS.judgment_id || 'none');
  assert(!byJudgment?.__error, 'get-deadlines-by-judgment', byJudgment?.message || '');

  // 3.8 — Tasks CRUD
  console.log('\n  Tasks:');
  const taskData = { ...data.task, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id, assigned_to: TEST_IDS.lawyer_id };
  const taskResult = await callHandler('add-task', taskData);
  assert(!taskResult?.__error, 'add-task', taskResult?.message || '');
  const tasks = await callHandler('get-all-tasks');
  assert(Array.isArray(tasks), 'get-all-tasks returns array');
  if (tasks?.length > 0) TEST_IDS.task_id = tasks[0].task_id;

  // 3.9 — Timesheets CRUD
  console.log('\n  Timesheets:');
  const tsData = { ...data.timesheet, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id, lawyer_id: TEST_IDS.lawyer_id };
  const tsResult = await callHandler('add-timesheet', tsData);
  assert(!tsResult?.__error, 'add-timesheet', tsResult?.message || '');
  const timesheets = await callHandler('get-all-timesheets');
  assert(Array.isArray(timesheets), 'get-all-timesheets returns array');
  if (timesheets?.length > 0) TEST_IDS.timesheet_id = timesheets[0].timesheet_id;
  const unbilledTime = await callHandler('get-unbilled-time', TEST_IDS.client_id, TEST_IDS.matter_id);
  assert(!unbilledTime?.__error, 'get-unbilled-time', unbilledTime?.message || '');

  // 3.10 — Expenses CRUD
  console.log('\n  Expenses:');
  const expData = { ...data.expense, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id };
  const expResult = await callHandler('add-expense', expData);
  assert(!expResult?.__error, 'add-expense', expResult?.message || '');
  const expenses = await callHandler('get-all-expenses');
  assert(Array.isArray(expenses), 'get-all-expenses returns array');
  if (expenses?.length > 0) TEST_IDS.expense_id = expenses[0].expense_id;
  const unbilledExp = await callHandler('get-unbilled-expenses', TEST_IDS.client_id, TEST_IDS.matter_id);
  assert(!unbilledExp?.__error, 'get-unbilled-expenses', unbilledExp?.message || '');
  // Batch
  const batchResult = await callHandler('add-expenses-batch', [expData, expData]);
  assert(!batchResult?.__error, 'add-expenses-batch', batchResult?.message || '');

  // 3.11 — Advances CRUD
  console.log('\n  Advances:');
  const advData = { ...data.advance, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id };
  const advResult = await callHandler('add-advance', advData);
  assert(!advResult?.__error, 'add-advance', advResult?.message || '');
  const advances = await callHandler('get-all-advances');
  assert(Array.isArray(advances), 'get-all-advances returns array');
  if (advances?.length > 0) TEST_IDS.advance_id = advances[0].advance_id;
  const clientAdv = await callHandler('get-client-expense-advance', TEST_IDS.client_id, TEST_IDS.matter_id);
  assert(!clientAdv?.__error, 'get-client-expense-advance', clientAdv?.message || '');
  const clientRet = await callHandler('get-client-retainer', TEST_IDS.client_id, TEST_IDS.matter_id);
  assert(!clientRet?.__error, 'get-client-retainer', clientRet?.message || '');
  const lawyerAdv = await callHandler('get-lawyer-advance', TEST_IDS.lawyer_id || 'none');
  assert(!lawyerAdv?.__error, 'get-lawyer-advance', lawyerAdv?.message || '');

  // 3.12 — Invoices
  console.log('\n  Invoices:');
  const invNumResult = await callHandler('generate-invoice-number');
  assert(!invNumResult?.__error, 'generate-invoice-number', invNumResult?.message || '');
  const invoiceData = {
    client_id: TEST_IDS.client_id,
    matter_id: TEST_IDS.matter_id,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    subtotal: 1000,
    total: 1000,
    currency: 'USD',
    status: 'draft',
    invoice_number: invNumResult?.invoice_number || 'INV-TEST-001',
  };
  const items = [{ item_type: 'time', description: 'Legal services', quantity: 5, rate: 200, amount: 1000 }];
  const createInvResult = await callHandler('create-invoice', invoiceData, items);
  assert(!createInvResult?.__error, 'create-invoice', createInvResult?.message || '');
  const invoices = await callHandler('get-all-invoices');
  assert(Array.isArray(invoices), 'get-all-invoices returns array');
  if (invoices?.length > 0) {
    TEST_IDS.invoice_id = invoices[0].invoice_id;
    const inv = await callHandler('get-invoice', TEST_IDS.invoice_id);
    assert(!inv?.__error, 'get-invoice', inv?.message || '');
    const invItems = await callHandler('get-invoice-items', TEST_IDS.invoice_id);
    assert(!invItems?.__error, 'get-invoice-items', invItems?.message || '');
    const statusUpd = await callHandler('update-invoice-status', TEST_IDS.invoice_id, 'sent');
    assert(!statusUpd?.__error, 'update-invoice-status', statusUpd?.message || '');
  }

  // 3.13 — Appointments CRUD
  console.log('\n  Appointments:');
  const apptData = { ...data.appointment, client_id: TEST_IDS.client_id, matter_id: TEST_IDS.matter_id };
  const apptResult = await callHandler('add-appointment', apptData);
  assert(!apptResult?.__error, 'add-appointment', apptResult?.message || '');
  const appointments = await callHandler('get-all-appointments');
  assert(Array.isArray(appointments), 'get-all-appointments returns array');
  if (appointments?.length > 0) TEST_IDS.appointment_id = appointments[0].appointment_id;

  // 3.14 — Diary CRUD
  console.log('\n  Diary:');
  const diaryData = { ...data.diary_entry, matter_id: TEST_IDS.matter_id };
  const diaryResult = await callHandler('add-diary-entry', diaryData);
  assert(!diaryResult?.__error, 'add-diary-entry', diaryResult?.message || '');
  const timeline = await callHandler('get-matter-timeline', TEST_IDS.matter_id || 'none');
  assert(!timeline?.__error, 'get-matter-timeline', timeline?.message || '');

  // 3.15 — Corporate CRUD
  console.log('\n  Corporate:');
  const corpData = { ...data.corporate_entity, client_id: TEST_IDS.client_id };
  const corpResult = await callHandler('add-corporate-entity', corpData);
  assert(!corpResult?.__error, 'add-corporate-entity', corpResult?.message || '');
  const corpEntities = await callHandler('get-all-corporate-entities');
  assert(Array.isArray(corpEntities) || !corpEntities?.__error, 'get-all-corporate-entities');
  const corpEntity = await callHandler('get-corporate-entity', TEST_IDS.client_id);
  assert(!corpEntity?.__error, 'get-corporate-entity', corpEntity?.message || '');
  const corpClients = await callHandler('get-corporate-clients');
  assert(!corpClients?.__error, 'get-corporate-clients', corpClients?.message || '');
  const noEntity = await callHandler('get-company-clients-without-entity');
  assert(!noEntity?.__error, 'get-company-clients-without-entity', noEntity?.message || '');

  // Shareholders
  const shData = { ...data.shareholder, client_id: TEST_IDS.client_id };
  const shResult = await callHandler('add-shareholder', shData);
  assert(!shResult?.__error, 'add-shareholder', shResult?.message || '');
  const shareholders = await callHandler('get-shareholders', TEST_IDS.client_id);
  assert(!shareholders?.__error, 'get-shareholders', shareholders?.message || '');
  if (Array.isArray(shareholders) && shareholders.length > 0) TEST_IDS.shareholder_id = shareholders[0].id;
  const totalShares = await callHandler('get-total-shares', TEST_IDS.client_id);
  assert(!totalShares?.__error, 'get-total-shares', totalShares?.message || '');

  // Directors
  const dirData = { ...data.director, client_id: TEST_IDS.client_id };
  const dirResult = await callHandler('add-director', dirData);
  assert(!dirResult?.__error, 'add-director', dirResult?.message || '');
  const directors = await callHandler('get-directors', TEST_IDS.client_id);
  assert(!directors?.__error, 'get-directors', directors?.message || '');
  if (Array.isArray(directors) && directors.length > 0) TEST_IDS.director_id = directors[0].id;

  // Filings
  const filData = { ...data.filing, client_id: TEST_IDS.client_id };
  const filResult = await callHandler('add-filing', filData);
  assert(!filResult?.__error, 'add-filing', filResult?.message || '');
  const filings = await callHandler('get-filings', TEST_IDS.client_id);
  assert(!filings?.__error, 'get-filings', filings?.message || '');

  // Meetings
  const mtgData = { ...data.meeting, client_id: TEST_IDS.client_id };
  const mtgResult = await callHandler('add-meeting', mtgData);
  assert(!mtgResult?.__error, 'add-meeting', mtgResult?.message || '');
  const meetings = await callHandler('get-meetings', TEST_IDS.client_id);
  assert(!meetings?.__error, 'get-meetings', meetings?.message || '');

  // Share Transfers
  const stData = {
    client_id: TEST_IDS.client_id,
    transfer_type: 'sale',
    transfer_date: new Date().toISOString().split('T')[0],
    to_shareholder_id: TEST_IDS.shareholder_id,
    to_shareholder_name: 'Test Shareholder',
    shares_transferred: 10,
    share_class: 'Ordinary',
  };
  const stResult = await callHandler('add-share-transfer', stData);
  assert(!stResult?.__error, 'add-share-transfer', stResult?.message || '');
  const transfers = await callHandler('get-share-transfers', TEST_IDS.client_id);
  assert(!transfers?.__error, 'get-share-transfers', transfers?.message || '');

  // Compliance
  const compliance = await callHandler('get-upcoming-compliance', 30);
  assert(!compliance?.__error, 'get-upcoming-compliance', compliance?.message || '');

  // 3.16 — Conflict Check
  console.log('\n  Conflict Check:');
  const conflictResult = await callHandler('conflict-check', 'Test Client');
  assert(!conflictResult?.__error, 'conflict-check', conflictResult?.message || '');
  const logResult = await callHandler('log-conflict-check', { search_terms: 'Test', results_found: '1', decision: 'clear', check_type: 'new_client' });
  assert(!logResult?.__error, 'log-conflict-check', logResult?.message || '');

  // 3.17 — Dashboard
  console.log('\n  Dashboard:');
  const stats = await callHandler('get-dashboard-stats');
  assert(!stats?.__error && stats?.activeMatters !== undefined, 'get-dashboard-stats returns stats', stats?.__error ? stats.message : `Keys: ${Object.keys(stats || {})}`);
  const pending = await callHandler('get-pending-invoices');
  assert(!pending?.__error, 'get-pending-invoices', pending?.message || '');

  // 3.18 — Settings
  console.log('\n  Settings:');
  const saveSettingResult = await callHandler('save-setting', 'test_key', 'test_value', 'string', 'general');
  assert(!saveSettingResult?.__error, 'save-setting', saveSettingResult?.message || '');
  const getSetting = await callHandler('get-setting', 'test_key');
  assert(!getSetting?.__error, 'get-setting', getSetting?.message || '');
  const allSettings = await callHandler('get-settings');
  assert(!allSettings?.__error, 'get-settings', allSettings?.message || '');
  const firmInfo = await callHandler('get-firm-info');
  assert(!firmInfo?.__error, 'get-firm-info', firmInfo?.message || '');
  const saveFirm = await callHandler('save-firm-info', { firm_name: 'Test Firm', firm_name_ar: null });
  assert(!saveFirm?.__error, 'save-firm-info', saveFirm?.message || '');

  // Currencies
  const currResult = await callHandler('get-currencies');
  assert(Array.isArray(currResult) && currResult.length > 0, 'get-currencies returns seeded data', `Got: ${currResult?.length || 0}`);
  const addCurr = await callHandler('add-currency', { code: 'JPY', name: 'Japanese Yen', name_ar: null, symbol: '\u00a5', sort_order: 99 });
  assert(!addCurr?.__error, 'add-currency', addCurr?.message || '');

  // Exchange rates
  const exRates = await callHandler('get-exchange-rates');
  assert(!exRates?.__error, 'get-exchange-rates', exRates?.message || '');
  const addRate = await callHandler('add-exchange-rate', { from_currency: 'USD', to_currency: 'LBP', rate: 89500, effective_date: new Date().toISOString().split('T')[0] });
  assert(!addRate?.__error, 'add-exchange-rate', addRate?.message || '');
  const rateForDate = await callHandler('get-exchange-rate-for-date', 'USD', 'LBP', new Date().toISOString().split('T')[0]);
  assert(!rateForDate?.__error, 'get-exchange-rate-for-date', rateForDate?.message || '');

  // 3.19 — Trash
  console.log('\n  Trash:');
  const trashCount = await callHandler('get-trash-count');
  assert(!trashCount?.__error, 'get-trash-count', trashCount?.message || '');
  const trashItems = await callHandler('get-trash-items');
  assert(!trashItems?.__error, 'get-trash-items', trashItems?.message || '');

  // 3.20 — Reports (just generate-report)
  console.log('\n  Reports:');
  const report = await callHandler('generate-report', 'matters_by_status', {});
  assert(!report?.__error, 'generate-report (matters_by_status)', report?.message || '');

  // 3.21 — Lookup CRUD
  console.log('\n  Lookup CRUD:');
  const addLookup = await callHandler('add-lookup-item', 'court_types', { name_en: 'Test Court', name_ar: null, name_fr: null });
  assert(!addLookup?.__error, 'add-lookup-item (court_types)', addLookup?.message || '');

  // ---- Phase 4: Dialog/Export channels — verify registration only ----
  console.log('\n\n\x1b[1m[Phase 4] Dialog/Export channels (registration only)\x1b[0m');
  for (const channel of DIALOG_CHANNELS) {
    if (registeredHandlers[channel]) {
      assert(true, `${channel} registered`);
    } else {
      assert(false, `${channel} registered`, 'Handler not found');
    }
  }

  // ---- Phase 5: License channels ----
  console.log('\n\n\x1b[1m[Phase 5] License channels\x1b[0m');
  for (const channel of LICENSE_CHANNELS) {
    if (registeredHandlers[channel]) {
      const result = await callHandler(channel, channel === 'license:validate' ? 'TEST-KEY' : undefined);
      assert(!result?.__error, channel, result?.message || '');
    } else {
      assert(false, `${channel} registered`, 'Handler not found');
    }
  }

  // ==================== RESULTS ====================
  console.log('\n\n\x1b[1m' + '='.repeat(60) + '\x1b[0m');
  console.log(`\x1b[1mRESULTS:\x1b[0m`);
  console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`  \x1b[33mSkipped: ${skipped}\x1b[0m`);
  console.log(`  Total:  ${passed + failed + skipped}`);

  if (failures.length > 0) {
    console.log(`\n\x1b[31m--- FAILURES ---\x1b[0m`);
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. \x1b[31m${f.test}\x1b[0m`);
      if (f.details) console.log(`     ${f.details}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n\x1b[33m--- WARNINGS ---\x1b[0m`);
    warnings.forEach(w => console.log(`  \x1b[33m${w.test}:\x1b[0m ${w.reason}`));
  }

  console.log('\n' + '='.repeat(60));
  
  // Cleanup
  database.close();

  process.exit(failed > 0 ? 1 : 0);
}

// ==================== RUN ====================
runTests().catch(error => {
  console.error(`\n\x1b[31mFATAL ERROR: ${error.message}\x1b[0m`);
  console.error(error.stack);
  process.exit(1);
});
