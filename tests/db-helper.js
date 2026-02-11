/**
 * Qanuni Test Database Helper
 * Creates an in-memory SQLite database for testing
 */

const initSqlJs = require('sql.js');

let db = null;
let SQL = null;

// Generate unique IDs
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Initialize database
async function initDatabase() {
  SQL = await initSqlJs();
  db = new SQL.Database();
  createTables();
  return db;
}

// Create all tables (matching main.js schema)
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_name_arabic TEXT,
      client_type TEXT DEFAULT 'individual',
      email TEXT,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matters (
      matter_id TEXT PRIMARY KEY,
      client_id TEXT,
      matter_name TEXT NOT NULL,
      matter_type TEXT DEFAULT 'litigation',
      status TEXT DEFAULT 'active',
      responsible_lawyer_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lawyers (
      lawyer_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_arabic TEXT,
      initials TEXT,
      hourly_rate REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      task_number TEXT,
      matter_id TEXT,
      client_id TEXT,
      task_type_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'assigned',
      assigned_to TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lookup_task_types (
      task_type_id INTEGER PRIMARY KEY,
      name_en TEXT,
      name_ar TEXT,
      icon TEXT,
      is_system INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hearings (
      hearing_id TEXT PRIMARY KEY,
      matter_id TEXT,
      hearing_date TEXT,
      hearing_time TEXT,
      purpose_id INTEGER,
      purpose_custom TEXT,
      outcome TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lookup_hearing_purposes (
      purpose_id INTEGER PRIMARY KEY,
      name_en TEXT,
      name_ar TEXT,
      is_system INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS judgments (
      judgment_id TEXT PRIMARY KEY,
      matter_id TEXT,
      hearing_id TEXT,
      judgment_type TEXT DEFAULT 'first_instance',
      expected_date TEXT,
      actual_date TEXT,
      status TEXT DEFAULT 'pending',
      judgment_outcome TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timesheets (
      timesheet_id TEXT PRIMARY KEY,
      client_id TEXT,
      matter_id TEXT,
      lawyer_id TEXT,
      date TEXT,
      minutes INTEGER DEFAULT 0,
      billable INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      invoice_number TEXT,
      client_id TEXT,
      matter_id TEXT,
      issue_date TEXT,
      due_date TEXT,
      paid_date TEXT,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS advances (
      advance_id TEXT PRIMARY KEY,
      advance_type TEXT DEFAULT 'client_retainer',
      client_id TEXT,
      matter_id TEXT,
      lawyer_id TEXT,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      date_received TEXT,
      balance_remaining REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      expense_id TEXT PRIMARY KEY,
      client_id TEXT,
      matter_id TEXT,
      category_id INTEGER,
      amount REAL DEFAULT 0,
      date TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lookup_expense_categories (
      category_id INTEGER PRIMARY KEY,
      name_en TEXT,
      name_ar TEXT
    )
  `);
}

// Run a SELECT query
function runQuery(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (e) {
    console.error('Query error:', e.message);
    return [];
  }
}

// Run an INSERT/UPDATE query
function runInsert(sql, params = []) {
  try {
    db.run(sql, params);
    return { success: true, changes: db.getRowsModified() };
  } catch (e) {
    console.error('Insert error:', e.message);
    return { success: false, error: e.message };
  }
}

// Close database
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Seed test data
function seedTestData() {
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const thisMonth = today.substring(0, 7) + '-01';
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];

  // Lawyers
  runInsert(`INSERT INTO lawyers (lawyer_id, name, initials, hourly_rate, active, created_at) VALUES 
    ('LAW-001', 'John Smith', 'JS', 200, 1, ?)`, [now]);
  runInsert(`INSERT INTO lawyers (lawyer_id, name, initials, hourly_rate, active, created_at) VALUES 
    ('LAW-002', 'Sarah Johnson', 'SJ', 250, 1, ?)`, [now]);

  // Clients
  runInsert(`INSERT INTO clients (client_id, client_name, client_type, active, created_at) VALUES 
    ('CLT-001', 'Acme Corporation', 'legal_entity', 1, ?)`, [now]);
  runInsert(`INSERT INTO clients (client_id, client_name, client_type, active, created_at) VALUES 
    ('CLT-002', 'John Doe', 'individual', 1, ?)`, [now]);
  runInsert(`INSERT INTO clients (client_id, client_name, client_type, active, created_at) VALUES 
    ('CLT-003', 'Inactive Client', 'individual', 0, ?)`, [now]);

  // Matters
  runInsert(`INSERT INTO matters (matter_id, client_id, matter_name, status, responsible_lawyer_id, created_at) VALUES 
    ('MTR-001', 'CLT-001', 'Contract Dispute', 'active', 'LAW-001', ?)`, [now]);
  runInsert(`INSERT INTO matters (matter_id, client_id, matter_name, status, responsible_lawyer_id, created_at) VALUES 
    ('MTR-002', 'CLT-002', 'Property Case', 'active', 'LAW-002', ?)`, [now]);
  runInsert(`INSERT INTO matters (matter_id, client_id, matter_name, status, created_at) VALUES 
    ('MTR-003', 'CLT-001', 'Closed Matter', 'closed', ?)`, [now]);

  // Task Types
  runInsert(`INSERT INTO lookup_task_types (task_type_id, name_en, icon) VALUES (1, 'Research', '📚')`);
  runInsert(`INSERT INTO lookup_task_types (task_type_id, name_en, icon) VALUES (2, 'Drafting', '✍️')`);

  // Tasks - some assigned, some not
  runInsert(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, task_type_id, title, due_date, priority, status, assigned_to, created_at) VALUES 
    ('TSK-001', 'WA-2026-0001', 'MTR-001', 'CLT-001', 1, 'Research case law', ?, 'high', 'assigned', 'LAW-001', ?)`, [today, now]);
  runInsert(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, task_type_id, title, due_date, priority, status, assigned_to, created_at) VALUES 
    ('TSK-002', 'WA-2026-0002', 'MTR-001', 'CLT-001', 2, 'Draft contract', ?, 'medium', 'in_progress', 'LAW-002', ?)`, [today, now]);
  runInsert(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, task_type_id, title, due_date, priority, status, created_at) VALUES 
    ('TSK-003', 'WA-2026-0003', 'MTR-002', 'CLT-002', 1, 'Unassigned task', ?, 'low', 'assigned', ?)`, [today, now]);
  runInsert(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, title, due_date, status, created_at) VALUES 
    ('TSK-004', 'WA-2026-0004', 'MTR-001', 'CLT-001', 'Completed task', ?, 'done', ?)`, [lastMonth, now]);

  // Hearing Purposes
  runInsert(`INSERT INTO lookup_hearing_purposes (purpose_id, name_en) VALUES (1, 'First Hearing')`);
  runInsert(`INSERT INTO lookup_hearing_purposes (purpose_id, name_en) VALUES (2, 'Evidence Submission')`);
  runInsert(`INSERT INTO lookup_hearing_purposes (purpose_id, name_en) VALUES (3, 'Judgment Pronouncement')`);

  // Hearings - mix of regular and judgment pronouncement
  const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const futureDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  runInsert(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, purpose_id, created_at) VALUES 
    ('HRG-001', 'MTR-001', ?, 1, ?)`, [futureDate1, now]);
  runInsert(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, purpose_id, created_at) VALUES 
    ('HRG-002', 'MTR-002', ?, 2, ?)`, [futureDate2, now]);
  runInsert(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, purpose_id, created_at) VALUES 
    ('HRG-003', 'MTR-001', ?, 3, ?)`, [futureDate1, now]); // Judgment Pronouncement - should be excluded
  runInsert(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, purpose_custom, created_at) VALUES 
    ('HRG-004', 'MTR-002', ?, 'Judgment Pronouncement', ?)`, [futureDate2, now]); // Custom JP - should be excluded

  // Judgments
  runInsert(`INSERT INTO judgments (judgment_id, matter_id, expected_date, status, created_at) VALUES 
    ('JDG-001', 'MTR-001', ?, 'pending', ?)`, [futureDate1, now]);
  runInsert(`INSERT INTO judgments (judgment_id, matter_id, expected_date, status, created_at) VALUES 
    ('JDG-002', 'MTR-002', ?, 'pending', ?)`, [futureDate2, now]);
  runInsert(`INSERT INTO judgments (judgment_id, matter_id, expected_date, actual_date, status, created_at) VALUES 
    ('JDG-003', 'MTR-001', ?, ?, 'issued', ?)`, [lastMonth, lastMonth, now]); // Issued - not pending

  // Timesheets
  runInsert(`INSERT INTO timesheets (timesheet_id, client_id, matter_id, lawyer_id, date, minutes, billable, status, created_at) VALUES 
    ('TS-001', 'CLT-001', 'MTR-001', 'LAW-001', ?, 120, 1, 'draft', ?)`, [today, now]);
  runInsert(`INSERT INTO timesheets (timesheet_id, client_id, matter_id, lawyer_id, date, minutes, billable, status, created_at) VALUES 
    ('TS-002', 'CLT-001', 'MTR-001', 'LAW-001', ?, 60, 0, 'draft', ?)`, [today, now]); // Non-billable
  runInsert(`INSERT INTO timesheets (timesheet_id, client_id, matter_id, lawyer_id, date, minutes, billable, status, created_at) VALUES 
    ('TS-003', 'CLT-002', 'MTR-002', 'LAW-002', ?, 90, 1, 'draft', ?)`, [lastMonth, now]); // Last month

  // Invoices
  runInsert(`INSERT INTO invoices (invoice_id, invoice_number, client_id, matter_id, total, status, paid_date, created_at) VALUES 
    ('INV-001', 'INV-2026-001', 'CLT-001', 'MTR-001', 1500, 'paid', ?, ?)`, [today, now]); // Paid this month
  runInsert(`INSERT INTO invoices (invoice_id, invoice_number, client_id, matter_id, total, status, paid_date, created_at) VALUES 
    ('INV-002', 'INV-2026-002', 'CLT-002', 'MTR-002', 800, 'paid', ?, ?)`, [lastMonth, now]); // Paid last month
  runInsert(`INSERT INTO invoices (invoice_id, invoice_number, client_id, matter_id, total, status, due_date, created_at) VALUES 
    ('INV-003', 'INV-2026-003', 'CLT-001', 'MTR-001', 2000, 'sent', ?, ?)`, [today, now]); // Outstanding

  // Advances
  runInsert(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, amount, date_received, balance_remaining, status, created_at) VALUES 
    ('ADV-001', 'client_retainer', 'CLT-001', 'MTR-001', 5000, ?, 3000, 'active', ?)`, [today, now]); // Retainer this month
  runInsert(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, amount, date_received, balance_remaining, status, created_at) VALUES 
    ('ADV-002', 'client_retainer', 'CLT-002', 'MTR-002', 2000, ?, 2000, 'active', ?)`, [lastMonth, now]); // Retainer last month
  runInsert(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, amount, date_received, status, created_at) VALUES 
    ('ADV-003', 'client_expense_advance', 'CLT-001', 'MTR-001', 1000, ?, 'active', ?)`, [today, now]); // Expense advance - should NOT count as revenue
  runInsert(`INSERT INTO advances (advance_id, advance_type, lawyer_id, amount, date_received, status, created_at) VALUES 
    ('ADV-004', 'lawyer_advance', 'LAW-001', 500, ?, 'active', ?)`, [today, now]); // Lawyer advance - should NOT count as revenue
  runInsert(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, amount, date_received, status, created_at) VALUES 
    ('ADV-005', 'fee_payment_consultation', 'CLT-001', 'MTR-001', 300, ?, 'active', ?)`, [today, now]); // Fee payment this month

  // Expense Categories
  runInsert(`INSERT INTO lookup_expense_categories (category_id, name_en) VALUES (1, 'Court Fees')`);
  runInsert(`INSERT INTO lookup_expense_categories (category_id, name_en) VALUES (2, 'Travel')`);

  // Expenses
  runInsert(`INSERT INTO expenses (expense_id, client_id, matter_id, category_id, amount, date, created_at) VALUES 
    ('EXP-001', 'CLT-001', 'MTR-001', 1, 150, ?, ?)`, [today, now]);
  runInsert(`INSERT INTO expenses (expense_id, client_id, matter_id, category_id, amount, date, created_at) VALUES 
    ('EXP-002', 'CLT-002', 'MTR-002', 2, 200, ?, ?)`, [lastMonth, now]);
}

module.exports = {
  initDatabase,
  closeDatabase,
  runQuery,
  runInsert,
  seedTestData,
  generateId
};
