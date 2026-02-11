const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const XLSX = require('xlsx');

let mainWindow;
let db;
let SQL;

// Database path
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'qanuni.db');

async function initDatabase() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Database loaded from:', dbPath);
    // Run migrations for existing databases
    runMigrations();
  } else {
    db = new SQL.Database();
    console.log('New database created');
    createTables();
    seedLookupData();
    seedSampleData();
  }
}

// Migration function for existing databases
function runMigrations() {
  console.log('Running database migrations...');
  
  // Migration 1: Create settings table if not exists
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        firm_id TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
  } catch (e) {
    console.log('Settings table already exists or error:', e.message);
  }

  // Migration 2: Add setting_type column if missing
  try {
    const tableInfo = runQuery("PRAGMA table_info(settings)");
    const hasSettingType = tableInfo.some(col => col.name === 'setting_type');
    if (!hasSettingType) {
      db.run("ALTER TABLE settings ADD COLUMN setting_type TEXT DEFAULT 'string'");
      console.log('Added setting_type column to settings');
    }
  } catch (e) {
    console.log('setting_type migration error:', e.message);
  }

  // Migration 3: Add firm_id column to major tables (for future multi-tenancy)
  const tablesToMigrate = [
    'clients', 'matters', 'hearings', 'judgments', 'tasks',
    'timesheets', 'appointments', 'expenses', 'advances', 'invoices',
    'settings'
  ];
  
  tablesToMigrate.forEach(table => {
    try {
      const tableInfo = runQuery(`PRAGMA table_info(${table})`);
      const hasFirmId = tableInfo.some(col => col.name === 'firm_id');
      if (!hasFirmId) {
        db.run(`ALTER TABLE ${table} ADD COLUMN firm_id TEXT`);
        console.log(`Added firm_id column to ${table}`);
      }
    } catch (e) {
      console.log(`firm_id migration for ${table} error:`, e.message);
    }
  });

  // Migration 4: Create performance indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_matters_client ON matters(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status)',
    'CREATE INDEX IF NOT EXISTS idx_hearings_matter ON hearings(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_timesheets_matter ON timesheets(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_matter ON expenses(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
  ];

  indexes.forEach(sql => {
    try {
      db.run(sql);
    } catch (e) {
      // Index may already exist
    }
  });

  // Migration 5: Create deadlines table for deadline tracking
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS deadlines (
        deadline_id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        matter_id TEXT,
        judgment_id TEXT,
        title TEXT NOT NULL,
        deadline_date TEXT NOT NULL,
        reminder_days INTEGER DEFAULT 7,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(client_id),
        FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
        FOREIGN KEY (judgment_id) REFERENCES judgments(judgment_id)
      )
    `);
    console.log('Deadlines table created or already exists');
  } catch (e) {
    console.log('Deadlines table migration error:', e.message);
  }

  // Migration 5b: Add client_id and judgment_id columns if they don't exist (for existing databases)
  try {
    const deadlineTableInfo = runQuery("PRAGMA table_info(deadlines)");
    const hasClientId = deadlineTableInfo.some(col => col.name === 'client_id');
    const hasJudgmentId = deadlineTableInfo.some(col => col.name === 'judgment_id');
    
    if (!hasClientId) {
      db.run("ALTER TABLE deadlines ADD COLUMN client_id TEXT");
      console.log('Added client_id column to deadlines');
    }
    if (!hasJudgmentId) {
      db.run("ALTER TABLE deadlines ADD COLUMN judgment_id TEXT");
      console.log('Added judgment_id column to deadlines');
    }
  } catch (e) {
    console.log('Deadlines column migration error:', e.message);
  }

  // Create index for deadlines
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(deadline_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_deadlines_client ON deadlines(client_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_deadlines_judgment ON deadlines(judgment_id)');
  } catch (e) {
    // Index may already exist
  }

  saveDatabase();
  console.log('Migrations complete');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_name_arabic TEXT,
      client_type TEXT DEFAULT 'individual',
      custom_id TEXT,
      registration_number TEXT,
      vat_number TEXT,
      main_contact TEXT,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      address TEXT,
      website TEXT,
      industry TEXT,
      default_currency TEXT DEFAULT 'USD',
      billing_terms TEXT DEFAULT 'hourly',
      source TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lawyers (
      lawyer_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_arabic TEXT,
      initials TEXT,
      email TEXT,
      phone TEXT,
      hourly_rate REAL DEFAULT 0,
      hourly_rate_currency TEXT DEFAULT 'USD',
      active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS matters (
      matter_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      matter_name TEXT NOT NULL,
      matter_name_arabic TEXT,
      matter_type TEXT DEFAULT 'litigation',
      status TEXT DEFAULT 'active',
      custom_matter_number TEXT,
      case_number TEXT,
      court_type_id INTEGER,
      court_region_id INTEGER,
      judge_name TEXT,
      responsible_lawyer_id TEXT,
      opening_date TEXT,
      closing_date TEXT,
      outcome TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id)
    );

    CREATE TABLE IF NOT EXISTS hearings (
      hearing_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      hearing_date TEXT,
      hearing_time TEXT,
      end_time TEXT,
      court_type_id INTEGER,
      court_region_id INTEGER,
      judge TEXT,
      purpose_id INTEGER,
      purpose_custom TEXT,
      outcome TEXT,
      outcome_notes TEXT,
      next_hearing_id TEXT,
      attended_by TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id)
    );

    CREATE TABLE IF NOT EXISTS judgments (
      judgment_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      hearing_id TEXT,
      judgment_type TEXT DEFAULT 'first_instance',
      expected_date TEXT,
      actual_date TEXT,
      reminder_days INTEGER DEFAULT 7,
      judgment_outcome TEXT,
      judgment_summary TEXT,
      amount_awarded REAL,
      currency TEXT DEFAULT 'USD',
      in_favor_of TEXT,
      appeal_deadline TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      task_number TEXT,
      matter_id TEXT,
      client_id TEXT,
      hearing_id TEXT,
      task_type_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      due_date TEXT,
      due_time TEXT,
      time_budget_minutes INTEGER,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'assigned',
      assigned_by TEXT,
      assigned_to TEXT,
      assigned_date TEXT,
      completion_notes TEXT,
      completed_date TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      timesheet_id TEXT PRIMARY KEY,
      lawyer_id TEXT,
      client_id TEXT NOT NULL,
      matter_id TEXT,
      date TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      narrative TEXT NOT NULL,
      billable INTEGER DEFAULT 1,
      rate_per_hour REAL,
      rate_currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'draft',
      invoice_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      expense_id TEXT PRIMARY KEY,
      expense_type TEXT DEFAULT 'client',
      client_id TEXT,
      matter_id TEXT,
      lawyer_id TEXT,
      category_id INTEGER,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      receipt_filename TEXT,
      billable INTEGER DEFAULT 1,
      markup_percent REAL DEFAULT 0,
      advance_id TEXT,
      status TEXT DEFAULT 'pending',
      invoice_id TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS advances (
      advance_id TEXT PRIMARY KEY,
      advance_type TEXT DEFAULT 'client_retainer',
      client_id TEXT,
      matter_id TEXT,
      lawyer_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      date_received TEXT,
      payment_method TEXT,
      reference_number TEXT,
      balance_remaining REAL,
      minimum_balance_alert REAL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      invoice_number TEXT,
      client_id TEXT NOT NULL,
      matter_id TEXT,
      period_start TEXT,
      period_end TEXT,
      issue_date TEXT,
      due_date TEXT,
      subtotal REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      retainer_applied REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      vat_rate REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'draft',
      notes_to_client TEXT,
      internal_notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      item_id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_type TEXT DEFAULT 'time',
      item_date TEXT,
      description TEXT,
      quantity REAL,
      unit TEXT DEFAULT 'hours',
      rate REAL,
      amount REAL,
      timesheet_id TEXT,
      expense_id TEXT,
      sort_order INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id TEXT PRIMARY KEY,
      appointment_type TEXT DEFAULT 'client_meeting',
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      all_day INTEGER DEFAULT 0,
      location_type TEXT DEFAULT 'office',
      location_details TEXT,
      client_id TEXT,
      matter_id TEXT,
      billable INTEGER DEFAULT 0,
      attendees TEXT,
      notes TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conflict_check_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_date TEXT,
      check_type TEXT,
      search_terms TEXT,
      results_found TEXT,
      decision TEXT,
      notes TEXT,
      entity_type TEXT,
      entity_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lookup_court_types (
      court_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lookup_regions (
      region_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lookup_hearing_purposes (
      purpose_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lookup_task_types (
      task_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      icon TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lookup_expense_categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type TEXT DEFAULT 'string',
      category TEXT DEFAULT 'general',
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_matters_client ON matters(client_id);
    CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status);
    CREATE INDEX IF NOT EXISTS idx_hearings_matter ON hearings(matter_id);
    CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_timesheets_matter ON timesheets(matter_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_matter ON expenses(matter_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  `);
  saveDatabase();
}

function seedLookupData() {
  const courtTypes = [
    ['Single Judge Civil', 'Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ', 'Juge Unique Civil'],
    ['Single Judge Criminal', 'Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â±ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â ', 'Juge Unique PÃƒÆ’Ã‚Â©nal'],
    ['Urgent Matters', 'Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©', 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s'],
    ['First Instance', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'PremiÃƒÆ’Ã‚Â¨re Instance'],
    ['Investigating Judge', 'Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¡', "Juge d'Instruction"],
    ['Indictment Chamber', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Chambre Accusatoire'],
    ['Criminal Court', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª', 'Chambre Criminelle'],
    ['Execution Judge', 'Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â ÃƒËœÃ‚Â°', "Juge de l'ExÃƒÆ’Ã‚Â©cution"],
    ['Civil Appeal', 'ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ', "Cour d'Appel Civil"],
    ['Criminal Appeal', 'ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â ', "Cour d'Appel PÃƒÆ’Ã‚Â©nal"],
    ['Civil Cassation', 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â² Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ', 'Cour de Cassation Civile'],
    ['Criminal Cassation', 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â² ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â ', 'Cour de Cassation PÃƒÆ’Ã‚Â©nale'],
    ['Labor Tribunal', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ', "Conseil de Prud'hommes"],
    ['Plenary Assembly', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©', 'AssemblÃƒÆ’Ã‚Â©e PlÃƒÆ’Ã‚Â©niÃƒÆ’Ã‚Â¨re'],
    ['Council of State', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â©', "Conseil d'ÃƒÆ’Ã¢â‚¬Â°tat"],
    ['Arbitrator', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦', 'Arbitre'],
    ['Arbitration Panel', 'Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Tribunal Arbitral']
  ];
  courtTypes.forEach((ct, i) => {
    db.run(`INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)`, [ct[0], ct[1], ct[2], i + 1]);
  });

  const regions = [
    ['Beirut', 'ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Âª', 'Beyrouth'],
    ['Mount Lebanon', 'ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ', 'Mont-Liban'],
    ['Metn', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â ', 'Metn'],
    ['Batroun', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â ', 'Batroun'],
    ['Jbeil', 'ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾', 'Jbeil'],
    ['Jounieh', 'ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Jounieh'],
    ['North Lebanon', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾', 'Liban-Nord'],
    ['South Lebanon', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨', 'Liban-Sud'],
    ['Bekaa', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹', 'BÃƒÆ’Ã‚Â©kaa'],
    ['Nabatieh', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â·Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Nabatieh'],
    ['Akkar', 'ÃƒËœÃ‚Â¹Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±', 'Akkar'],
    ['Baalbek', 'ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨Ãƒâ„¢Ã†â€™', 'Baalbek']
  ];
  regions.forEach((r, i) => {
    db.run(`INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)`, [r[0], r[1], r[2], i + 1]);
  });

  const purposes = [
    ['First Session', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â°', 'PremiÃƒÆ’Ã‚Â¨re audience'],
    ['Pleadings Exchange', 'ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦ÃƒËœÃ‚Â­', 'ÃƒÆ’Ã¢â‚¬Â°change de conclusions'],
    ['Evidence Submission', 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª', 'Production de preuves'],
    ['Witness Hearing', 'ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯', 'Audition de tÃƒÆ’Ã‚Â©moins'],
    ['Expert Report Discussion', 'Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â´ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±', "Discussion du rapport d'expert"],
    ['Final Arguments', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Plaidoiries finales'],
    ['Judgment Pronouncement', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¡ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦', 'PrononcÃƒÆ’Ã‚Â© du jugement'],
    ['Procedural', 'ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'ProcÃƒÆ’Ã‚Â©durale'],
    ['Settlement Discussion', 'Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â´ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Discussion de rÃƒÆ’Ã‚Â¨glement'],
    ['Other', 'ÃƒËœÃ‚Â£ÃƒËœÃ‚Â®ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â°', 'Autre']
  ];
  purposes.forEach((p, i) => {
    db.run(`INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)`, [p[0], p[1], p[2], i + 1]);
  });

  const taskTypes = [
    ['Memo', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â°Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©', 'MÃƒÆ’Ã‚Â©mo', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â'],
    ['Document Preparation', 'ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¯', 'PrÃƒÆ’Ã‚Â©paration de document', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Å¾'],
    ['Filing', 'ÃƒËœÃ‚Â¥Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹', 'DÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â´t', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â'],
    ['Follow-up', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â©', 'Suivi', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾'],
    ['Research', 'ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â«', 'Recherche', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â'],
    ['Review', 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â©', 'RÃƒÆ’Ã‚Â©vision', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â'],
    ['Client Communication', 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾', 'Communication client', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥'],
    ['Court Attendance', 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¶Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©', 'PrÃƒÆ’Ã‚Â©sence au tribunal', 'ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â'],
    ['Meeting', 'ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹', 'RÃƒÆ’Ã‚Â©union', 'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã‚Â'],
    ['Call', 'Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©', 'Appel', 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¾'],
    ['General', 'ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦', 'GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ral', 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“']
  ];
  taskTypes.forEach((t, i) => {
    db.run(`INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (?, ?, ?, ?, 1, ?)`, [t[0], t[1], t[2], t[3], i + 1]);
  });

  const expenseCategories = [
    ['Court Fees', 'ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©', 'Frais de justice'],
    ['Filing Fees', 'ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹', 'Frais de dÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â´t'],
    ['Travel', 'ÃƒËœÃ‚Â³Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â±', 'DÃƒÆ’Ã‚Â©placement'],
    ['Expert Fees', 'ÃƒËœÃ‚Â£ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±', "Honoraires d'expert"],
    ['Translation', 'ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â©', 'Traduction'],
    ['Courier', 'ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹', 'Courrier'],
    ['Notary Fees', 'ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¾', 'Frais de notaire'],
    ['Government Fees', 'ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â­Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©', 'Frais gouvernementaux'],
    ['Photocopying', 'ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±', 'Photocopie'],
    ['Other', 'ÃƒËœÃ‚Â£ÃƒËœÃ‚Â®ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â°', 'Autre']
  ];
  expenseCategories.forEach((e, i) => {
    db.run(`INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)`, [e[0], e[1], e[2], i + 1]);
  });

  saveDatabase();
}

function seedSampleData() {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  
  // Sample Lawyers
  db.run(`INSERT INTO lawyers (lawyer_id, name, name_arabic, initials, hourly_rate, active, created_at) VALUES 
    ('LAW-001', 'Ahmad Khalil', 'ÃƒËœÃ‚Â£ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾', 'AK', 200, 1, ?),
    ('LAW-002', 'Sarah Nassar', 'ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â±', 'SN', 150, 1, ?)`, [now, now]);

  // Sample Clients
  db.run(`INSERT INTO clients (client_id, client_name, client_name_arabic, client_type, email, phone, billing_terms, active, created_at) VALUES 
    ('CLT-2026-0001', 'ABC Trading Co.', 'ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ABC Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©', 'legal_entity', 'info@abctrading.com', '+961 1 234567', 'hourly', 1, ?),
    ('CLT-2026-0002', 'Nadia El-Hassan', 'Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â ', 'individual', 'nadia@email.com', '+961 3 456789', 'retainer', 1, ?),
    ('CLT-2026-0003', 'Mediterranean Real Estate', 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â³ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª', 'legal_entity', 'contact@medre.com', '+961 1 987654', 'fixed', 1, ?)`, [now, now, now]);

  // Sample Matters
  db.run(`INSERT INTO matters (matter_id, client_id, matter_name, matter_type, status, case_number, court_type_id, court_region_id, responsible_lawyer_id, opening_date, created_at) VALUES 
    ('MTR-2026-0001', 'CLT-2026-0001', 'ABC vs XYZ Corp - Contract Dispute', 'litigation', 'active', '2026/123', 4, 1, 'LAW-001', '2026-01-05', ?),
    ('MTR-2026-0002', 'CLT-2026-0002', 'El-Hassan Inheritance', 'litigation', 'active', '2026/456', 4, 1, 'LAW-001', '2026-01-10', ?),
    ('MTR-2026-0003', 'CLT-2026-0003', 'Property Acquisition Advisory', 'advisory', 'active', NULL, NULL, NULL, 'LAW-002', '2026-01-12', ?)`, [now, now, now]);

  // Sample Hearings
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  db.run(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time, court_type_id, court_region_id, purpose_id, outcome, created_at) VALUES 
    ('HRG-001', 'MTR-2026-0001', '2026-01-08', '10:00', 4, 1, 1, 'adjourned', ?),
    ('HRG-002', 'MTR-2026-0001', '${nextWeek}', '09:30', 4, 1, 2, NULL, ?)`, [now, now]);

  // Sample Tasks
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  db.run(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, task_type_id, title, due_date, priority, status, assigned_to, created_at) VALUES 
    ('TSK-001', 'WA-2026-0001', 'MTR-2026-0001', 'CLT-2026-0001', 1, 'Prepare Reply Memo', '${tomorrow}', 'high', 'in_progress', 'LAW-001', ?),
    ('TSK-002', 'WA-2026-0002', 'MTR-2026-0001', 'CLT-2026-0001', 5, 'Research Case Law', '${nextWeek}', 'medium', 'assigned', 'LAW-002', ?)`, [now, now]);

  // Sample Timesheets
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  db.run(`INSERT INTO timesheets (timesheet_id, lawyer_id, client_id, matter_id, date, minutes, narrative, billable, rate_per_hour, status, created_at) VALUES 
    ('TS-001', 'LAW-001', 'CLT-2026-0001', 'MTR-2026-0001', '${yesterday}', 120, 'Reviewed case files and prepared initial strategy', 1, 200, 'draft', ?),
    ('TS-002', 'LAW-001', 'CLT-2026-0001', 'MTR-2026-0001', '${today}', 90, 'Drafted reply memo to defendant motion', 1, 200, 'draft', ?)`, [now, now]);

  // Sample Expenses
  db.run(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, category_id, amount, currency, description, date, billable, status, created_at) VALUES 
    ('EXP-001', 'client', 'CLT-2026-0001', 'MTR-2026-0001', 1, 250, 'USD', 'Court filing fees', '${yesterday}', 1, 'pending', ?),
    ('EXP-002', 'client', 'CLT-2026-0001', 'MTR-2026-0001', 3, 75, 'USD', 'Travel to courthouse', '${today}', 1, 'pending', ?)`, [now, now]);

  // Sample Advances
  db.run(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, amount, currency, date_received, payment_method, balance_remaining, status, created_at) VALUES 
    ('ADV-001', 'client_retainer', 'CLT-2026-0001', 'MTR-2026-0001', 5000, 'USD', '2026-01-05', 'bank_transfer', 5000, 'active', ?)`, [now]);

  saveDatabase();
  console.log('Sample data seeded');
}

// Helper functions
function runQuery(sql, params = []) {
  try {
    // Convert undefined values to null for sql.js compatibility
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    stmt.bind(sanitizedParams);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Query error:', sql, error);
    return [];
  }
}

function runInsert(sql, params = []) {
  try {
    // Convert undefined values to null for sql.js compatibility
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    db.run(sql, sanitizedParams);
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('Insert error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    return { success: false, error: error?.message || String(error) };
  }
}

function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
}

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

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== IPC HANDLERS ====================

// Dashboard
ipcMain.handle('get-dashboard-stats', () => {
  const today = new Date().toISOString().split('T')[0];
  const activeMatters = runQuery("SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
  const totalClients = runQuery("SELECT COUNT(*) as count FROM clients WHERE active = 1");
  const pendingTasks = runQuery("SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
  const draftInvoices = runQuery("SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
  const upcomingHearings = runQuery("SELECT COUNT(*) as count FROM hearings WHERE hearing_date >= ?", [today]);
  const overdueTasks = runQuery("SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'cancelled') AND due_date < ?", [today]);
  const outstandingInvoices = runQuery("SELECT SUM(total) as amount FROM invoices WHERE status NOT IN ('paid', 'cancelled', 'written_off')");
  const pendingJudgments = runQuery("SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");
  return {
    activeMatters: activeMatters[0]?.count || 0,
    totalClients: totalClients[0]?.count || 0,
    pendingTasks: pendingTasks[0]?.count || 0,
    draftInvoices: draftInvoices[0]?.count || 0,
    upcomingHearings: upcomingHearings[0]?.count || 0,
    overdueTasks: overdueTasks[0]?.count || 0,
    outstandingInvoices: outstandingInvoices[0]?.amount || 0,
    pendingJudgments: pendingJudgments[0]?.count || 0
  };
});

// Clients
ipcMain.handle('get-all-clients', () => {
  return runQuery('SELECT * FROM clients WHERE active = 1 ORDER BY client_name');
});

ipcMain.handle('add-client', (event, client) => {
  const id = client.client_id || generateId('CLT');
  const now = new Date().toISOString();
  return runInsert(`
    INSERT INTO clients (client_id, client_name, client_name_arabic, client_type, custom_id, 
      registration_number, vat_number, main_contact, email, phone, mobile, address, website, 
      industry, default_currency, billing_terms, source, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [id, client.client_name, client.client_name_arabic, client.client_type, client.custom_id,
      client.registration_number, client.vat_number, client.main_contact, client.email, 
      client.phone, client.mobile, client.address, client.website, client.industry,
      client.default_currency || 'USD', client.billing_terms || 'hourly', client.source, 
      client.notes, now, now]);
});

ipcMain.handle('update-client', (event, client) => {
  const now = new Date().toISOString();
  return runInsert(`UPDATE clients SET client_name=?, client_name_arabic=?, client_type=?, 
    registration_number=?, vat_number=?, main_contact=?, email=?, phone=?, address=?, 
    billing_terms=?, notes=?, updated_at=? WHERE client_id=?`,
    [client.client_name, client.client_name_arabic, client.client_type, client.registration_number,
     client.vat_number, client.main_contact, client.email, client.phone, client.address,
     client.billing_terms, client.notes, now, client.client_id]);
});

ipcMain.handle('delete-client', (event, id) => {
  return runInsert('UPDATE clients SET active = 0 WHERE client_id = ?', [id]);
});

// Lawyers
ipcMain.handle('get-lawyers', () => {
  return runQuery('SELECT lawyer_id, name as full_name, name_arabic as full_name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active FROM lawyers WHERE active = 1 ORDER BY name');
});

ipcMain.handle('add-lawyer', (event, lawyer) => {
  const id = generateId('LAW');
  const now = new Date().toISOString();
  return runInsert(`INSERT INTO lawyers (lawyer_id, name, name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, lawyer.full_name, lawyer.full_name_arabic, lawyer.initials, lawyer.email, lawyer.phone, 
     lawyer.hourly_rate || 0, lawyer.hourly_rate_currency || 'USD', now]);
});

ipcMain.handle('update-lawyer', (event, lawyer) => {
  return runInsert(`UPDATE lawyers SET name=?, name_arabic=?, initials=?, email=?, phone=?, hourly_rate=?, hourly_rate_currency=? WHERE lawyer_id=?`,
    [lawyer.full_name, lawyer.full_name_arabic, lawyer.initials, lawyer.email, lawyer.phone,
     lawyer.hourly_rate || 0, lawyer.hourly_rate_currency || 'USD', lawyer.lawyer_id]);
});

ipcMain.handle('delete-lawyer', (event, id) => {
  return runInsert('UPDATE lawyers SET active = 0 WHERE lawyer_id = ?', [id]);
});

// Matters
ipcMain.handle('get-all-matters', () => {
  return runQuery(`SELECT m.*, c.client_name, lc.name_en as court_name, lr.name_en as region_name
    FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id 
    LEFT JOIN lookup_court_types lc ON m.court_type_id = lc.court_type_id
    LEFT JOIN lookup_regions lr ON m.court_region_id = lr.region_id
    ORDER BY m.created_at DESC`);
});

ipcMain.handle('add-matter', (event, matter) => {
  const id = matter.matter_id || generateId('MTR');
  const now = new Date().toISOString();
  return runInsert(`INSERT INTO matters (matter_id, client_id, matter_name, matter_name_arabic, 
    matter_type, status, case_number, court_type_id, court_region_id, judge_name, 
    responsible_lawyer_id, opening_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, matter.client_id, matter.matter_name, matter.matter_name_arabic, matter.matter_type || 'litigation',
     matter.status || 'active', matter.case_number, matter.court_type_id, matter.court_region_id,
     matter.judge_name, matter.responsible_lawyer_id, matter.opening_date, matter.notes, now, now]);
});

ipcMain.handle('update-matter', (event, matter) => {
  const now = new Date().toISOString();
  return runInsert(`UPDATE matters SET client_id=?, matter_name=?, matter_type=?, status=?,
    case_number=?, court_type_id=?, court_region_id=?, judge_name=?, responsible_lawyer_id=?,
    opening_date=?, notes=?, updated_at=? WHERE matter_id=?`,
    [matter.client_id, matter.matter_name, matter.matter_type, matter.status, matter.case_number,
     matter.court_type_id, matter.court_region_id, matter.judge_name, matter.responsible_lawyer_id,
     matter.opening_date, matter.notes, now, matter.matter_id]);
});

ipcMain.handle('delete-matter', (event, id) => {
  return runInsert('DELETE FROM matters WHERE matter_id = ?', [id]);
});

// Hearings
ipcMain.handle('get-all-hearings', () => {
  return runQuery(`SELECT h.*, m.matter_name, m.client_id, c.client_name, 
    lc.name_en as court_name, lr.name_en as region_name, lp.name_en as purpose_name
    FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id 
    LEFT JOIN clients c ON m.client_id = c.client_id 
    LEFT JOIN lookup_court_types lc ON h.court_type_id = lc.court_type_id
    LEFT JOIN lookup_regions lr ON h.court_region_id = lr.region_id
    LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
    ORDER BY h.hearing_date DESC`);
});

ipcMain.handle('add-hearing', (event, hearing) => {
  const id = generateId('HRG');
  const now = new Date().toISOString();
  const result = runInsert(`INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time, 
    end_time, court_type_id, court_region_id, judge, purpose_id, purpose_custom, outcome, 
    outcome_notes, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, hearing.matter_id, hearing.hearing_date, hearing.hearing_time, hearing.end_time,
     hearing.court_type_id, hearing.court_region_id, hearing.judge, hearing.purpose_id,
     hearing.purpose_custom, hearing.outcome, hearing.outcome_notes, hearing.notes, now, now]);
  // Return the hearing_id so it can be used for creating linked judgments
  return { ...result, hearing_id: id };
});

ipcMain.handle('update-hearing', (event, hearing) => {
  const now = new Date().toISOString();
  return runInsert(`UPDATE hearings SET matter_id=?, hearing_date=?, hearing_time=?, end_time=?,
    court_type_id=?, court_region_id=?, judge=?, purpose_id=?, purpose_custom=?, outcome=?,
    outcome_notes=?, notes=?, updated_at=? WHERE hearing_id=?`,
    [hearing.matter_id, hearing.hearing_date, hearing.hearing_time, hearing.end_time,
     hearing.court_type_id, hearing.court_region_id, hearing.judge, hearing.purpose_id,
     hearing.purpose_custom, hearing.outcome, hearing.outcome_notes, hearing.notes, now, hearing.hearing_id]);
});

ipcMain.handle('delete-hearing', (event, id) => {
  return runInsert('DELETE FROM hearings WHERE hearing_id = ?', [id]);
});

// Judgments
ipcMain.handle('get-all-judgments', () => {
  return runQuery(`SELECT j.*, m.matter_name, c.client_name FROM judgments j 
    LEFT JOIN matters m ON j.matter_id = m.matter_id 
    LEFT JOIN clients c ON m.client_id = c.client_id ORDER BY j.expected_date DESC`);
});

ipcMain.handle('add-judgment', (event, judgment) => {
  const id = generateId('JDG');
  const now = new Date().toISOString();
  const result = runInsert(`INSERT INTO judgments (judgment_id, matter_id, hearing_id, judgment_type, 
    expected_date, actual_date, reminder_days, judgment_outcome, judgment_summary, amount_awarded,
    currency, in_favor_of, appeal_deadline, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, judgment.matter_id, judgment.hearing_id, judgment.judgment_type || 'first_instance',
     judgment.expected_date, judgment.actual_date, judgment.reminder_days || 7, judgment.judgment_outcome,
     judgment.judgment_summary, judgment.amount_awarded, judgment.currency || 'USD', judgment.in_favor_of,
     judgment.appeal_deadline, judgment.status || 'pending', judgment.notes, now, now]);
  // Return the judgment_id for reference
  return { ...result, judgment_id: id };
});

ipcMain.handle('update-judgment', (event, judgment) => {
  const now = new Date().toISOString();
  return runInsert(`UPDATE judgments SET matter_id=?, hearing_id=?, judgment_type=?, expected_date=?,
    actual_date=?, judgment_outcome=?, judgment_summary=?, amount_awarded=?, in_favor_of=?,
    appeal_deadline=?, status=?, notes=?, updated_at=? WHERE judgment_id=?`,
    [judgment.matter_id, judgment.hearing_id, judgment.judgment_type, judgment.expected_date,
     judgment.actual_date, judgment.judgment_outcome, judgment.judgment_summary, judgment.amount_awarded,
     judgment.in_favor_of, judgment.appeal_deadline, judgment.status, judgment.notes, now, judgment.judgment_id]);
});

ipcMain.handle('delete-judgment', (event, id) => {
  return runInsert('DELETE FROM judgments WHERE judgment_id = ?', [id]);
});

// Deadlines
ipcMain.handle('get-all-deadlines', () => {
  return runQuery(`SELECT d.*, m.matter_name, c.client_name, j.judgment_type, j.appeal_deadline as judgment_appeal_deadline
    FROM deadlines d 
    LEFT JOIN matters m ON d.matter_id = m.matter_id 
    LEFT JOIN clients c ON d.client_id = c.client_id
    LEFT JOIN judgments j ON d.judgment_id = j.judgment_id
    ORDER BY d.deadline_date ASC`);
});

ipcMain.handle('add-deadline', (event, deadline) => {
  const now = new Date().toISOString();
  return runInsert(`INSERT INTO deadlines (client_id, matter_id, judgment_id, title, deadline_date, reminder_days, priority, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [deadline.client_id || null, deadline.matter_id || null, deadline.judgment_id || null,
     deadline.title, deadline.deadline_date, 
     deadline.reminder_days || 7, deadline.priority || 'medium', 
     deadline.status || 'pending', deadline.notes || '', now]);
});

ipcMain.handle('update-deadline', (event, deadline) => {
  return runInsert(`UPDATE deadlines SET client_id=?, matter_id=?, judgment_id=?, title=?, deadline_date=?, reminder_days=?,
    priority=?, status=?, notes=? WHERE deadline_id=?`,
    [deadline.client_id || null, deadline.matter_id || null, deadline.judgment_id || null,
     deadline.title, deadline.deadline_date, 
     deadline.reminder_days || 7, deadline.priority || 'medium',
     deadline.status || 'pending', deadline.notes || '', deadline.deadline_id]);
});

ipcMain.handle('delete-deadline', (event, id) => {
  return runInsert('DELETE FROM deadlines WHERE deadline_id = ?', [id]);
});

// Get deadlines by judgment (for showing linked deadlines in judgment list)
ipcMain.handle('get-deadlines-by-judgment', (event, judgmentId) => {
  return runQuery('SELECT * FROM deadlines WHERE judgment_id = ? ORDER BY deadline_date ASC', [judgmentId]);
});

// Tasks
ipcMain.handle('get-all-tasks', () => {
  return runQuery(`SELECT t.*, m.matter_name, c.client_name, lt.name_en as task_type_name, lt.icon as task_type_icon
    FROM tasks t LEFT JOIN matters m ON t.matter_id = m.matter_id 
    LEFT JOIN clients c ON t.client_id = c.client_id 
    LEFT JOIN lookup_task_types lt ON t.task_type_id = lt.task_type_id
    ORDER BY t.due_date ASC`);
});

ipcMain.handle('add-task', (event, task) => {
  const id = generateId('TSK');
  const year = new Date().getFullYear();
  const countResult = runQuery('SELECT COUNT(*) as count FROM tasks WHERE task_number LIKE ?', [`WA-${year}-%`]);
  const num = (countResult[0]?.count || 0) + 1;
  const taskNumber = `WA-${year}-${num.toString().padStart(4, '0')}`;
  const now = new Date().toISOString();
  
  // Handle field name mapping (form sends assigned_to_id, we store as assigned_to)
  const assignedTo = task.assigned_to_id || task.assigned_to || null;
  const matterId = task.matter_id || null;
  const clientId = task.client_id || null;
  const hearingId = task.hearing_id || null;
  const taskTypeId = task.task_type_id ? parseInt(task.task_type_id) : null;
  const timeBudget = task.time_budget_minutes ? parseInt(task.time_budget_minutes) : null;
  
  return runInsert(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, hearing_id, 
    task_type_id, title, description, instructions, due_date, due_time, time_budget_minutes, 
    priority, status, assigned_by, assigned_to, assigned_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, taskNumber, matterId, clientId, hearingId, taskTypeId, task.title,
     task.description || '', task.instructions || '', task.due_date || null, task.due_time || null, timeBudget,
     task.priority || 'medium', task.status || 'assigned', task.assigned_by || 'Admin', assignedTo,
     task.assigned_date || now, task.notes || '', now, now]);
});

ipcMain.handle('update-task', (event, task) => {
  const now = new Date().toISOString();
  const assignedTo = task.assigned_to_id || task.assigned_to || null;
  const matterId = task.matter_id || null;
  const clientId = task.client_id || null;
  const taskTypeId = task.task_type_id ? parseInt(task.task_type_id) : null;
  
  return runInsert(`UPDATE tasks SET matter_id=?, client_id=?, task_type_id=?, title=?, description=?,
    instructions=?, due_date=?, priority=?, status=?, assigned_to=?, completion_notes=?, 
    completed_date=?, notes=?, updated_at=? WHERE task_id=?`,
    [matterId, clientId, taskTypeId, task.title, task.description || '', task.instructions || '',
     task.due_date || null, task.priority, task.status, assignedTo, task.completion_notes || '',
     task.completed_date || null, task.notes || '', now, task.task_id]);
});

// Timesheets
ipcMain.handle('get-all-timesheets', () => {
  return runQuery(`SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
    FROM timesheets t LEFT JOIN clients c ON t.client_id = c.client_id 
    LEFT JOIN matters m ON t.matter_id = m.matter_id
    LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
    ORDER BY t.date DESC`);
});

ipcMain.handle('add-timesheet', (event, ts) => {
  const id = generateId('TS');
  const now = new Date().toISOString();
  // Handle empty strings as null
  const lawyerId = ts.lawyer_id || null;
  const matterId = ts.matter_id || null;
  const minutes = parseInt(ts.minutes) || 0;
  const ratePerHour = ts.rate_per_hour ? parseFloat(ts.rate_per_hour) : null;
  
  return runInsert(`INSERT INTO timesheets (timesheet_id, lawyer_id, client_id, matter_id, date, 
    minutes, narrative, billable, rate_per_hour, rate_currency, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, lawyerId, ts.client_id, matterId, ts.date, minutes, ts.narrative,
     ts.billable ? 1 : 0, ratePerHour, ts.rate_currency || 'USD', ts.status || 'draft', now, now]);
});

ipcMain.handle('get-unbilled-time', (event, clientId, matterId) => {
  let sql = `SELECT * FROM timesheets WHERE status != 'billed' AND billable = 1`;
  const params = [];
  if (clientId) { sql += ' AND client_id = ?'; params.push(clientId); }
  if (matterId) { sql += ' AND matter_id = ?'; params.push(matterId); }
  sql += ' ORDER BY date ASC';
  return runQuery(sql, params);
});

ipcMain.handle('update-timesheet', (event, ts) => {
  const now = new Date().toISOString();
  const matterId = ts.matter_id || null;
  const minutes = parseInt(ts.minutes) || 0;
  const ratePerHour = ts.rate_per_hour ? parseFloat(ts.rate_per_hour) : null;
  
  return runInsert(`UPDATE timesheets SET lawyer_id=?, client_id=?, matter_id=?, date=?, 
    minutes=?, narrative=?, billable=?, rate_per_hour=?, rate_currency=?, status=?, updated_at=? 
    WHERE timesheet_id=?`,
    [ts.lawyer_id || null, ts.client_id, matterId, ts.date, minutes, ts.narrative,
     ts.billable ? 1 : 0, ratePerHour, ts.rate_currency || 'USD', ts.status || 'draft', now, ts.timesheet_id]);
});

ipcMain.handle('delete-timesheet', (event, id) => {
  return runInsert('DELETE FROM timesheets WHERE timesheet_id = ?', [id]);
});

// Expenses
ipcMain.handle('get-all-expenses', () => {
  return runQuery(`SELECT e.*, c.client_name, m.matter_name, lec.name_en as category_name
    FROM expenses e LEFT JOIN clients c ON e.client_id = c.client_id 
    LEFT JOIN matters m ON e.matter_id = m.matter_id
    LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
    ORDER BY e.date DESC`);
});

ipcMain.handle('add-expense', (event, exp) => {
  const id = generateId('EXP');
  const now = new Date().toISOString();
  // Handle empty strings as null
  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const lawyerId = exp.lawyer_id || null;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const advanceId = exp.advance_id || null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;
  
  return runInsert(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, lawyer_id,
    category_id, amount, currency, description, date, billable, markup_percent, advance_id, status,
    notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, exp.expense_type || 'client', clientId, matterId, lawyerId, categoryId,
     amount, exp.currency || 'USD', exp.description, exp.date, exp.billable ? 1 : 0,
     markupPercent, advanceId, exp.status || 'pending', exp.notes || '', now, now]);
});

ipcMain.handle('update-expense', (event, exp) => {
  const now = new Date().toISOString();
  // Handle empty strings as null
  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;
  
  return runInsert(`UPDATE expenses SET expense_type=?, client_id=?, matter_id=?, category_id=?,
    amount=?, currency=?, description=?, date=?, billable=?, markup_percent=?, status=?, 
    notes=?, updated_at=? WHERE expense_id=?`,
    [exp.expense_type, clientId, matterId, categoryId, amount, exp.currency,
     exp.description, exp.date, exp.billable ? 1 : 0, markupPercent, exp.status, exp.notes || '',
     now, exp.expense_id]);
});

ipcMain.handle('delete-expense', (event, id) => {
  return runInsert('DELETE FROM expenses WHERE expense_id = ?', [id]);
});

ipcMain.handle('get-unbilled-expenses', (event, clientId, matterId) => {
  let sql = `SELECT e.*, lec.name_en as category_name FROM expenses e 
    LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
    WHERE e.status != 'billed' AND e.billable = 1`;
  const params = [];
  if (clientId) { sql += ' AND e.client_id = ?'; params.push(clientId); }
  if (matterId) { sql += ' AND e.matter_id = ?'; params.push(matterId); }
  sql += ' ORDER BY e.date ASC';
  return runQuery(sql, params);
});

// Advances
ipcMain.handle('get-all-advances', () => {
  return runQuery(`SELECT a.*, c.client_name, m.matter_name, l.name as lawyer_name
    FROM advances a 
    LEFT JOIN clients c ON a.client_id = c.client_id 
    LEFT JOIN matters m ON a.matter_id = m.matter_id
    LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
    ORDER BY a.date_received DESC`);
});

ipcMain.handle('add-advance', (event, adv) => {
  const id = generateId('ADV');
  const now = new Date().toISOString();
  
  // Handle empty strings as null
  // For lawyer_advance, client_id should be null
  const clientId = (adv.advance_type === 'lawyer_advance') ? null : (adv.client_id || null);
  const matterId = (adv.advance_type === 'lawyer_advance') ? null : (adv.matter_id || null);
  const lawyerId = adv.lawyer_id || null;
  const amount = parseFloat(adv.amount) || 0;
  const balanceRemaining = adv.balance_remaining ? parseFloat(adv.balance_remaining) : amount;
  const minBalanceAlert = adv.minimum_balance_alert ? parseFloat(adv.minimum_balance_alert) : null;
  
  const result = runInsert(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, lawyer_id,
    amount, currency, date_received, payment_method, reference_number, balance_remaining,
    minimum_balance_alert, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, adv.advance_type || 'client_retainer', clientId, matterId, lawyerId,
     amount, adv.currency || 'USD', adv.date_received, adv.payment_method || 'bank_transfer', 
     adv.reference_number || '', balanceRemaining, minBalanceAlert, adv.notes || '', 
     adv.status || 'active', now, now]);
  
  return { ...result, advance_id: id };
});

ipcMain.handle('update-advance', (event, adv) => {
  const now = new Date().toISOString();
  // For lawyer_advance, client_id should be null
  const clientId = (adv.advance_type === 'lawyer_advance') ? null : (adv.client_id || null);
  const matterId = (adv.advance_type === 'lawyer_advance') ? null : (adv.matter_id || null);
  const lawyerId = adv.lawyer_id || null;
  const amount = parseFloat(adv.amount) || 0;
  const balanceRemaining = adv.balance_remaining ? parseFloat(adv.balance_remaining) : amount;
  const minBalanceAlert = adv.minimum_balance_alert ? parseFloat(adv.minimum_balance_alert) : null;
  
  return runInsert(`UPDATE advances SET advance_type=?, client_id=?, matter_id=?, lawyer_id=?, amount=?,
    currency=?, date_received=?, payment_method=?, reference_number=?, balance_remaining=?,
    minimum_balance_alert=?, notes=?, status=?, updated_at=? WHERE advance_id=?`,
    [adv.advance_type, clientId, matterId, lawyerId, amount, adv.currency, adv.date_received,
     adv.payment_method, adv.reference_number || '', balanceRemaining, minBalanceAlert,
     adv.notes || '', adv.status, now, adv.advance_id]);
});

ipcMain.handle('delete-advance', (event, id) => {
  return runInsert('DELETE FROM advances WHERE advance_id = ?', [id]);
});

// Get client's active expense advance
ipcMain.handle('get-client-expense-advance', (event, clientId, matterId) => {
  // First try to find matter-specific advance, then general client advance
  let advance = null;
  if (matterId) {
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
    if (result.length > 0) advance = result[0];
  }
  if (!advance) {
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId]);
    if (result.length > 0) advance = result[0];
  }
  return advance;
});

// Get client's active retainer
ipcMain.handle('get-client-retainer', (event, clientId, matterId) => {
  // First try to find matter-specific retainer, then general client retainer
  let retainer = null;
  if (matterId) {
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_retainer' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
    if (result.length > 0) retainer = result[0];
  }
  if (!retainer) {
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND advance_type = 'client_retainer' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId]);
    if (result.length > 0) retainer = result[0];
  }
  return retainer;
});

// Get lawyer's active advance
ipcMain.handle('get-lawyer-advance', (event, lawyerId) => {
  const result = runQuery(`SELECT * FROM advances 
    WHERE lawyer_id = ? AND advance_type = 'lawyer_advance' AND status = 'active'
    ORDER BY date_received DESC LIMIT 1`, [lawyerId]);
  return result.length > 0 ? result[0] : null;
});

// Deduct from advance and return new balance
ipcMain.handle('deduct-from-advance', (event, advanceId, amount) => {
  const advance = runQuery('SELECT * FROM advances WHERE advance_id = ?', [advanceId]);
  if (advance.length === 0) return { success: false, error: 'Advance not found' };
  
  const currentBalance = parseFloat(advance[0].balance_remaining) || 0;
  const newBalance = currentBalance - parseFloat(amount);
  const now = new Date().toISOString();
  
  runInsert('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
    [newBalance, now, advanceId]);
  
  return { success: true, newBalance, advanceId };
});

// Deduct from retainer by client/matter/type
ipcMain.handle('deduct-retainer', (event, clientId, matterId, advanceType, amount) => {
  // Find the appropriate retainer
  let advance = null;
  if (matterId) {
    // Try matter-specific first
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND matter_id = ? AND advance_type = ? AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId, advanceType]);
    if (result.length > 0) advance = result[0];
  }
  if (!advance) {
    // Try general (no matter)
    const result = runQuery(`SELECT * FROM advances 
      WHERE client_id = ? AND advance_type = ? AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, advanceType]);
    if (result.length > 0) advance = result[0];
  }
  
  if (!advance) return { success: false, error: 'No active retainer found' };
  
  const currentBalance = parseFloat(advance.balance_remaining) || 0;
  const newBalance = currentBalance - parseFloat(amount);
  const now = new Date().toISOString();
  
  runInsert('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
    [newBalance, now, advance.advance_id]);
  
  return { success: true, newBalance, advanceId: advance.advance_id };
});

// Add expense with auto-deduction from advances
ipcMain.handle('add-expense-with-deduction', (event, exp) => {
  const id = generateId('EXP');
  const now = new Date().toISOString();
  
  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const paidByLawyerId = exp.paid_by_lawyer_id || null;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;
  
  const deductions = [];
  let appliedAdvanceId = null;
  
  // 1. If paid by lawyer, deduct from lawyer's advance
  if (paidByLawyerId) {
    const lawyerAdvance = runQuery(`SELECT * FROM advances 
      WHERE lawyer_id = ? AND advance_type = 'lawyer_advance' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [paidByLawyerId]);
    
    if (lawyerAdvance.length > 0) {
      const adv = lawyerAdvance[0];
      const currentBalance = parseFloat(adv.balance_remaining) || 0;
      const newBalance = currentBalance - amount;
      runInsert('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
        [newBalance, now, adv.advance_id]);
      deductions.push({ type: 'lawyer_advance', advanceId: adv.advance_id, amount, newBalance });
    }
  }
  
  // 2. Auto-deduct from client's expense advance
  if (clientId) {
    // Try matter-specific first
    let clientAdvance = null;
    if (matterId) {
      const result = runQuery(`SELECT * FROM advances 
        WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
        ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
      if (result.length > 0) clientAdvance = result[0];
    }
    if (!clientAdvance) {
      const result = runQuery(`SELECT * FROM advances 
        WHERE client_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
        ORDER BY date_received DESC LIMIT 1`, [clientId]);
      if (result.length > 0) clientAdvance = result[0];
    }
    
    if (clientAdvance) {
      const currentBalance = parseFloat(clientAdvance.balance_remaining) || 0;
      const newBalance = currentBalance - amount;
      runInsert('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
        [newBalance, now, clientAdvance.advance_id]);
      appliedAdvanceId = clientAdvance.advance_id;
      deductions.push({ type: 'client_expense_advance', advanceId: clientAdvance.advance_id, amount, newBalance });
    }
  }
  
  // 3. Insert the expense
  runInsert(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, lawyer_id,
    category_id, amount, currency, description, date, billable, markup_percent, advance_id, status,
    notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, 'client', clientId, matterId, paidByLawyerId, categoryId,
     amount, exp.currency || 'USD', exp.description, exp.date, exp.billable ? 1 : 0,
     markupPercent, appliedAdvanceId, 'pending', exp.notes || '', now, now]);
  
  return { success: true, expense_id: id, deductions };
});

// Invoices
ipcMain.handle('get-all-invoices', () => {
  return runQuery(`SELECT i.*, c.client_name, m.matter_name FROM invoices i 
    LEFT JOIN clients c ON i.client_id = c.client_id 
    LEFT JOIN matters m ON i.matter_id = m.matter_id
    ORDER BY i.issue_date DESC`);
});

ipcMain.handle('generate-invoice-number', () => {
  const year = new Date().getFullYear();
  const countResult = runQuery('SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?', [`INV-${year}-%`]);
  const num = (countResult[0]?.count || 0) + 1;
  return `INV-${year}-${num.toString().padStart(4, '0')}`;
});

ipcMain.handle('create-invoice', (event, invoice, items) => {
  const id = generateId('INV');
  const now = new Date().toISOString();
  
  // Handle items passed separately (legacy) or in invoice object
  const invoiceItems = items || invoice.items || [];
  
  runInsert(`INSERT INTO invoices (invoice_id, invoice_number, client_id, matter_id, period_start,
    period_end, issue_date, due_date, subtotal, discount_type, discount_value, discount_amount,
    retainer_applied, taxable_amount, vat_rate, vat_amount, total, currency, status, notes_to_client, internal_notes,
    created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, invoice.invoice_number, invoice.client_id, invoice.matter_id || null, invoice.period_start || null,
     invoice.period_end, invoice.issue_date, invoice.due_date || null, invoice.subtotal || 0,
     invoice.discount_type || 'none', invoice.discount_value || 0, invoice.discount_amount || 0,
     invoice.retainer_applied || 0, invoice.taxable_amount || invoice.subtotal || 0, 
     invoice.vat_rate || 0, invoice.vat_amount || 0, 
     invoice.total || 0, invoice.currency || 'USD', invoice.status || 'draft', 
     invoice.notes_to_client || '', invoice.internal_notes || '', now, now]);

  // Add invoice items
  if (invoiceItems.length > 0) {
    invoiceItems.forEach((item, index) => {
      const itemId = generateId('ITM');
      runInsert(`INSERT INTO invoice_items (item_id, invoice_id, item_type, item_date, description,
        quantity, unit, rate, amount, timesheet_id, expense_id, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.item_type, item.item_date, item.description, item.quantity, item.unit,
         item.rate, item.amount, item.timesheet_id || null, item.expense_id || null, index, now]);
      
      if (item.timesheet_id) {
        runInsert('UPDATE timesheets SET status = ?, invoice_id = ? WHERE timesheet_id = ?', ['billed', id, item.timesheet_id]);
      }
      if (item.expense_id) {
        runInsert('UPDATE expenses SET status = ?, invoice_id = ? WHERE expense_id = ?', ['billed', id, item.expense_id]);
      }
    });
  }

  // If retainer was applied, deduct from retainer balance
  if (invoice.retainer_applied && invoice.retainer_applied > 0 && invoice.retainer_advance_id) {
    const retainer = runQuery('SELECT * FROM advances WHERE advance_id = ?', [invoice.retainer_advance_id]);
    if (retainer.length > 0) {
      const currentBalance = parseFloat(retainer[0].balance_remaining) || 0;
      const newBalance = currentBalance - parseFloat(invoice.retainer_applied);
      runInsert('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
        [newBalance, now, invoice.retainer_advance_id]);
    }
  }

  return { success: true, invoice_id: id, invoice_number: invoice.invoice_number };
});

ipcMain.handle('update-invoice-status', (event, id, status) => {
  const now = new Date().toISOString();
  return runInsert('UPDATE invoices SET status = ?, updated_at = ? WHERE invoice_id = ?', [status, now, id]);
});

ipcMain.handle('get-invoice', (event, id) => {
  const invoice = runQuery('SELECT * FROM invoices WHERE invoice_id = ?', [id]);
  if (invoice.length === 0) return null;
  const items = runQuery('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [id]);
  return { ...invoice[0], items };
});

ipcMain.handle('get-invoice-items', (event, invoiceId) => {
  return runQuery('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [invoiceId]);
});

ipcMain.handle('delete-invoice', (event, id) => {
  runInsert('UPDATE timesheets SET status = ?, invoice_id = NULL WHERE invoice_id = ?', ['draft', id]);
  runInsert('UPDATE expenses SET status = ?, invoice_id = NULL WHERE invoice_id = ?', ['pending', id]);
  runInsert('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
  return runInsert('DELETE FROM invoices WHERE invoice_id = ?', [id]);
});

// Appointments
ipcMain.handle('get-all-appointments', () => {
  return runQuery(`SELECT a.*, c.client_name, m.matter_name FROM appointments a 
    LEFT JOIN clients c ON a.client_id = c.client_id 
    LEFT JOIN matters m ON a.matter_id = m.matter_id
    ORDER BY a.date DESC`);
});

ipcMain.handle('add-appointment', (event, apt) => {
  const id = generateId('APT');
  const now = new Date().toISOString();
  return runInsert(`INSERT INTO appointments (appointment_id, appointment_type, title, description,
    date, start_time, end_time, all_day, location_type, location_details, client_id, matter_id,
    billable, attendees, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, apt.appointment_type, apt.title, apt.description, apt.date, apt.start_time, apt.end_time,
     apt.all_day ? 1 : 0, apt.location_type, apt.location_details, apt.client_id, apt.matter_id,
     apt.billable ? 1 : 0, JSON.stringify(apt.attendees || []), apt.notes, apt.status || 'scheduled', now, now]);
});

ipcMain.handle('update-appointment', (event, apt) => {
  const now = new Date().toISOString();
  return runInsert(`UPDATE appointments SET appointment_type=?, title=?, description=?, date=?,
    start_time=?, end_time=?, all_day=?, location_type=?, location_details=?, client_id=?,
    matter_id=?, billable=?, attendees=?, notes=?, status=?, updated_at=? WHERE appointment_id=?`,
    [apt.appointment_type, apt.title, apt.description, apt.date, apt.start_time, apt.end_time,
     apt.all_day ? 1 : 0, apt.location_type, apt.location_details, apt.client_id, apt.matter_id,
     apt.billable ? 1 : 0, JSON.stringify(apt.attendees || []), apt.notes, apt.status, now, apt.appointment_id]);
});

ipcMain.handle('delete-appointment', (event, id) => {
  return runInsert('DELETE FROM appointments WHERE appointment_id = ?', [id]);
});

// Lookups
ipcMain.handle('get-court-types', () => {
  return runQuery('SELECT * FROM lookup_court_types WHERE active = 1 ORDER BY sort_order');
});

ipcMain.handle('get-regions', () => {
  return runQuery('SELECT * FROM lookup_regions WHERE active = 1 ORDER BY sort_order');
});

ipcMain.handle('get-hearing-purposes', () => {
  return runQuery('SELECT * FROM lookup_hearing_purposes WHERE active = 1 ORDER BY sort_order');
});

ipcMain.handle('get-task-types', () => {
  return runQuery('SELECT * FROM lookup_task_types WHERE active = 1 ORDER BY sort_order');
});

ipcMain.handle('get-expense-categories', () => {
  return runQuery('SELECT * FROM lookup_expense_categories WHERE active = 1 ORDER BY sort_order');
});

ipcMain.handle('add-lookup-item', (event, type, data) => {
  // Support both camelCase and kebab-case
  const typeMap = {
    'courtTypes': 'court-types', 'court-types': 'court-types',
    'regions': 'regions',
    'hearingPurposes': 'hearing-purposes', 'hearing-purposes': 'hearing-purposes',
    'taskTypes': 'task-types', 'task-types': 'task-types',
    'expenseCategories': 'expense-categories', 'expense-categories': 'expense-categories',
    'lawyers': 'lawyers'
  };
  const normalizedType = typeMap[type];
  
  // Handle lawyers separately
  if (normalizedType === 'lawyers') {
    const id = generateId('LAW');
    const now = new Date().toISOString();
    return runInsert(`INSERT INTO lawyers (lawyer_id, name, name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, data.full_name, data.full_name_arabic, data.initials, data.email, data.phone, 
       data.hourly_rate || 0, data.hourly_rate_currency || 'USD', now]);
  }
  
  const tables = {
    'court-types': 'lookup_court_types',
    'regions': 'lookup_regions', 
    'hearing-purposes': 'lookup_hearing_purposes',
    'task-types': 'lookup_task_types',
    'expense-categories': 'lookup_expense_categories'
  };
  const table = tables[normalizedType];
  if (!table) return { success: false, error: 'Invalid type: ' + type };
  
  if (normalizedType === 'task-types') {
    return runInsert(`INSERT INTO ${table} (name_en, name_ar, name_fr, icon, is_system, sort_order, active) VALUES (?, ?, ?, ?, 0, 999, 1)`,
      [data.name_en, data.name_ar, data.name_fr, data.icon || 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“']);
  }
  return runInsert(`INSERT INTO ${table} (name_en, name_ar, name_fr, is_system, sort_order, active) VALUES (?, ?, ?, 0, 999, 1)`,
    [data.name_en, data.name_ar, data.name_fr]);
});

ipcMain.handle('update-lookup-item', (event, type, data) => {
  // Support both camelCase and kebab-case
  const typeMap = {
    'courtTypes': 'court-types', 'court-types': 'court-types',
    'regions': 'regions',
    'hearingPurposes': 'hearing-purposes', 'hearing-purposes': 'hearing-purposes',
    'taskTypes': 'task-types', 'task-types': 'task-types',
    'expenseCategories': 'expense-categories', 'expense-categories': 'expense-categories',
    'lawyers': 'lawyers'
  };
  const normalizedType = typeMap[type];
  
  // Handle lawyers separately
  if (normalizedType === 'lawyers') {
    return runInsert(`UPDATE lawyers SET name=?, name_arabic=?, initials=?, email=?, phone=?, hourly_rate=?, hourly_rate_currency=? WHERE lawyer_id=?`,
      [data.full_name, data.full_name_arabic, data.initials, data.email, data.phone,
       data.hourly_rate || 0, data.hourly_rate_currency || 'USD', data.lawyer_id]);
  }
  
  const configs = {
    'court-types': { table: 'lookup_court_types', id: 'court_type_id' },
    'regions': { table: 'lookup_regions', id: 'region_id' },
    'hearing-purposes': { table: 'lookup_hearing_purposes', id: 'purpose_id' },
    'task-types': { table: 'lookup_task_types', id: 'task_type_id' },
    'expense-categories': { table: 'lookup_expense_categories', id: 'category_id' }
  };
  const cfg = configs[normalizedType];
  if (!cfg) return { success: false, error: 'Invalid type: ' + type };
  
  if (normalizedType === 'task-types') {
    return runInsert(`UPDATE ${cfg.table} SET name_en=?, name_ar=?, name_fr=?, icon=? WHERE ${cfg.id}=?`,
      [data.name_en, data.name_ar, data.name_fr, data.icon, data[cfg.id]]);
  }
  return runInsert(`UPDATE ${cfg.table} SET name_en=?, name_ar=?, name_fr=? WHERE ${cfg.id}=?`,
    [data.name_en, data.name_ar, data.name_fr, data[cfg.id]]);
});

ipcMain.handle('delete-lookup-item', (event, type, item) => {
  // Support both camelCase and kebab-case
  const typeMap = {
    'courtTypes': 'court-types', 'court-types': 'court-types',
    'regions': 'regions',
    'hearingPurposes': 'hearing-purposes', 'hearing-purposes': 'hearing-purposes',
    'taskTypes': 'task-types', 'task-types': 'task-types',
    'expenseCategories': 'expense-categories', 'expense-categories': 'expense-categories',
    'lawyers': 'lawyers'
  };
  const normalizedType = typeMap[type];
  
  // Handle lawyers separately
  if (normalizedType === 'lawyers') {
    return runInsert('UPDATE lawyers SET active = 0 WHERE lawyer_id = ?', [item.lawyer_id || item]);
  }
  
  const configs = {
    'court-types': { table: 'lookup_court_types', id: 'court_type_id' },
    'regions': { table: 'lookup_regions', id: 'region_id' },
    'hearing-purposes': { table: 'lookup_hearing_purposes', id: 'purpose_id' },
    'task-types': { table: 'lookup_task_types', id: 'task_type_id' },
    'expense-categories': { table: 'lookup_expense_categories', id: 'category_id' }
  };
  const cfg = configs[normalizedType];
  if (!cfg) return { success: false, error: 'Invalid type: ' + type };
  
  // Get ID from item object or use item directly
  const id = item[cfg.id] || item;
  return runInsert(`DELETE FROM ${cfg.table} WHERE ${cfg.id} = ? AND is_system = 0`, [id]);
});

// Conflict Check
ipcMain.handle('conflict-check', (event, searchTerms) => {
  const results = [];
  if (searchTerms.name) {
    const clients = runQuery(`SELECT client_id, client_name, client_name_arabic, 'client' as match_type 
      FROM clients WHERE client_name LIKE ? OR client_name_arabic LIKE ?`,
      [`%${searchTerms.name}%`, `%${searchTerms.name}%`]);
    results.push(...clients);
  }
  return results;
});

ipcMain.handle('log-conflict-check', (event, data) => {
  const now = new Date().toISOString();
  return runInsert(`INSERT INTO conflict_check_log (check_date, check_type, search_terms, results_found, 
    decision, notes, entity_type, entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [now, data.check_type, JSON.stringify(data.search_terms), JSON.stringify(data.results_found),
     data.decision, data.notes, data.entity_type, data.entity_id, now]);
});

// Report Generation
ipcMain.handle('generate-report', (event, reportType, filters) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  switch (reportType) {
    case 'outstanding-receivables':
      return runQuery(`
        SELECT i.*, c.client_name, 
          julianday('now') - julianday(i.due_date) as days_overdue
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.client_id
        WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue')
        ORDER BY i.due_date ASC`);
        
    case 'revenue-by-client':
      return runQuery(`
        SELECT c.client_id, c.client_name, 
          SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as total_revenue,
          COUNT(i.invoice_id) as invoice_count
        FROM clients c
        LEFT JOIN invoices i ON c.client_id = i.client_id
        GROUP BY c.client_id ORDER BY total_revenue DESC`);
        
    case 'revenue-by-matter':
      return runQuery(`
        SELECT m.matter_id, m.matter_name, c.client_name,
          SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as total_revenue
        FROM matters m
        LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN invoices i ON m.matter_id = i.matter_id
        GROUP BY m.matter_id ORDER BY total_revenue DESC`);
        
    case 'time-by-lawyer':
      return runQuery(`
        SELECT l.lawyer_id, l.name as lawyer_name,
          SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes,
          SUM(CASE WHEN t.billable = 0 THEN t.minutes ELSE 0 END) as non_billable_minutes,
          SUM(t.minutes) as total_minutes
        FROM lawyers l
        LEFT JOIN timesheets t ON l.lawyer_id = t.lawyer_id
        GROUP BY l.lawyer_id ORDER BY billable_minutes DESC`);
        
    case 'time-by-client':
      return runQuery(`
        SELECT c.client_id, c.client_name,
          SUM(t.minutes) as total_minutes,
          SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes
        FROM clients c
        LEFT JOIN timesheets t ON c.client_id = t.client_id
        GROUP BY c.client_id ORDER BY total_minutes DESC`);
        
    case 'unbilled-time':
      return runQuery(`
        SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
        FROM timesheets t
        LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
        WHERE t.status = 'draft' AND t.billable = 1
        ORDER BY t.date ASC`);
        
    case 'active-matters':
      return runQuery(`
        SELECT m.*, c.client_name, l.name as lawyer_name
        FROM matters m
        LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN lawyers l ON m.responsible_lawyer_id = l.lawyer_id
        WHERE m.status IN ('active', 'engaged')
        ORDER BY m.created_at DESC`);
        
    case 'upcoming-hearings':
      return runQuery(`
        SELECT h.*, m.matter_name, c.client_name
        FROM hearings h
        LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC LIMIT 50`);
        
    case 'pending-judgments':
      return runQuery(`
        SELECT j.*, m.matter_name, c.client_name
        FROM judgments j
        LEFT JOIN matters m ON j.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE j.actual_date IS NULL AND j.status = 'pending'
        ORDER BY j.expected_date ASC`);
        
    case 'tasks-overdue':
      return runQuery(`
        SELECT t.*, m.matter_name, c.client_name
        FROM tasks t
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN clients c ON t.client_id = c.client_id
        WHERE t.status NOT IN ('done', 'cancelled') AND t.due_date < date('now')
        ORDER BY t.due_date ASC`);
        
    case 'expenses-by-category':
      return runQuery(`
        SELECT ec.name_en as category_name, ec.category_id,
          SUM(e.amount) as total_amount,
          COUNT(e.expense_id) as expense_count
        FROM lookup_expense_categories ec
        LEFT JOIN expenses e ON ec.category_id = e.category_id
        GROUP BY ec.category_id ORDER BY total_amount DESC`);
        
    case 'retainer-balances':
      return runQuery(`
        SELECT a.*, c.client_name, m.matter_name
        FROM advances a
        LEFT JOIN clients c ON a.client_id = c.client_id
        LEFT JOIN matters m ON a.matter_id = m.matter_id
        WHERE a.advance_type = 'client_retainer' AND a.status = 'active'
        ORDER BY a.balance_remaining ASC`);
        
    default:
      return [];
  }
});

// Settings Management
ipcMain.handle('get-settings', () => {
  return runQuery('SELECT * FROM settings');
});

ipcMain.handle('get-setting', (event, key) => {
  return runQuerySingle('SELECT * FROM settings WHERE setting_key = ?', [key]);
});

ipcMain.handle('save-setting', (event, key, value, type = 'string', category = 'general') => {
  const now = new Date().toISOString();
  const existing = runQuerySingle('SELECT * FROM settings WHERE setting_key = ?', [key]);
  if (existing) {
    return runInsert('UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?',
      [value, now, key]);
  } else {
    return runInsert('INSERT INTO settings (setting_key, setting_value, setting_type, category, updated_at) VALUES (?, ?, ?, ?, ?)',
      [key, value, type, category, now]);
  }
});

ipcMain.handle('save-firm-info', async (event, firmInfo) => {
  const now = new Date().toISOString();
  const keys = ['firm_name', 'firm_name_arabic', 'firm_address', 'firm_phone', 'firm_email', 
                'firm_website', 'firm_vat_number', 'default_currency', 'default_vat_rate'];
  
  for (const key of keys) {
    if (firmInfo[key] !== undefined) {
      const existing = runQuerySingle('SELECT * FROM settings WHERE setting_key = ?', [key]);
      if (existing) {
        runInsert('UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?',
          [firmInfo[key], now, key]);
      } else {
        runInsert('INSERT INTO settings (setting_key, setting_value, setting_type, category, updated_at) VALUES (?, ?, ?, ?, ?)',
          [key, firmInfo[key], 'string', 'firm', now]);
      }
    }
  }
  return { success: true };
});

ipcMain.handle('get-firm-info', () => {
  const settings = runQuery("SELECT * FROM settings WHERE category = 'firm' OR setting_key LIKE 'firm_%' OR setting_key LIKE 'default_%'");
  const firmInfo = {};
  settings.forEach(s => {
    firmInfo[s.setting_key] = s.setting_value;
  });
  return firmInfo;
});

// ==================== EXPORT HANDLERS ====================

// Export report to Excel
ipcMain.handle('export-to-excel', async (event, reportData, reportName) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Excel File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    
    // Auto-size columns
    const colWidths = Object.keys(reportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...reportData.map(row => String(row[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, reportName.substring(0, 31));
    XLSX.writeFile(wb, filePath);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, error: error.message };
  }
});

// Export report to CSV
ipcMain.handle('export-to-csv', async (event, reportData, reportName) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save CSV File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.csv`),
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, filePath, { bookType: 'csv' });
    
    return { success: true, filePath };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, error: error.message };
  }
});

// Export report to PDF (simple HTML-to-PDF approach)
ipcMain.handle('export-to-pdf', async (event, reportData, reportName, columns) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    // Get firm info for header
    const firmSettings = runQuery("SELECT * FROM settings WHERE setting_key LIKE 'firm_%'");
    const firmInfo = {};
    firmSettings.forEach(s => { firmInfo[s.setting_key] = s.setting_value; });
    
    // Create hidden window for PDF generation
    const pdfWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    
    // Generate HTML content
    const headers = columns || Object.keys(reportData[0] || {});
    const tableHeaders = headers.map(h => `<th style="border: 1px solid #ddd; padding: 8px; background: #f4f4f4; text-align: left;">${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('');
    const tableRows = reportData.map(row => 
      `<tr>${headers.map(h => `<td style="border: 1px solid #ddd; padding: 8px;">${row[h] !== null && row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
    ).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; }
          .firm-name { font-size: 18px; font-weight: bold; }
          .report-title { font-size: 16px; color: #333; margin-top: 10px; }
          .report-date { font-size: 10px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f4f4; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
          .summary { margin-top: 20px; text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="firm-name">${firmInfo.firm_name || 'Qanuni Legal ERP'}</div>
          <div class="report-title">${reportName}</div>
          <div class="report-date">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        </div>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="summary">Total Records: ${reportData.length}</div>
        <div class="footer">
          Generated by Qanuni Legal ERP
        </div>
      </body>
      </html>
    `;
    
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    const pdfData = await pdfWindow.webContents.printToPDF({
      marginsType: 0,
      printBackground: true,
      landscape: headers.length > 5
    });
    
    fs.writeFileSync(filePath, pdfData);
    pdfWindow.close();
    
    return { success: true, filePath };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, error: error.message };
  }
});

// Open file in default application
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== BACKUP & RESTORE ====================

// Backup database
ipcMain.handle('backup-database', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Database Backup',
      defaultPath: path.join(app.getPath('documents'), `qanuni-backup-${new Date().toISOString().split('T')[0]}.db`),
      filters: [{ name: 'Database Files', extensions: ['db'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  }
});

// Restore database
ipcMain.handle('restore-database', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File to Restore',
      filters: [{ name: 'Database Files', extensions: ['db'] }],
      properties: ['openFile']
    });
    
    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const backupPath = filePaths[0];
    
    // Confirm with user
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Restore'],
      defaultId: 0,
      title: 'Confirm Restore',
      message: 'This will replace all current data with the backup. This cannot be undone.',
      detail: `Restoring from: ${backupPath}`
    });
    
    if (response === 0) {
      return { success: false, canceled: true };
    }
    
    // Create backup of current database first
    const currentBackupPath = path.join(userDataPath, `qanuni-pre-restore-${Date.now()}.db`);
    const currentData = db.export();
    fs.writeFileSync(currentBackupPath, Buffer.from(currentData));
    
    // Load backup file
    const fileBuffer = fs.readFileSync(backupPath);
    db = new SQL.Database(fileBuffer);
    saveDatabase();
    
    return { success: true, message: 'Database restored successfully. Please restart the application.' };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
});

// Export all data to Excel (multiple sheets)
ipcMain.handle('export-all-data', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export All Data',
      defaultPath: path.join(app.getPath('documents'), `qanuni-export-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    const wb = XLSX.utils.book_new();
    
    // Export each table
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
      const data = runQuery(table.query);
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, table.name);
      }
    }
    
    XLSX.writeFile(wb, filePath);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Export all error:', error);
    return { success: false, error: error.message };
  }
});

console.log('Qanuni main process initialized - v15 FINAL MVP');
