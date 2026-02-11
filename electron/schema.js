/**
 * Qanuni Database Schema
 * 
 * Contains all CREATE TABLE statements and seed data for a fresh database.
 * Extracted from the monolithic main.js as part of Phase 2 hardening.
 * 
 * IMPORTANT: This file must contain ALL columns for ALL tables.
 * Migrations (migrations.js) handle adding columns to EXISTING databases.
 * This file handles creating tables for FRESH databases.
 * If you add a migration that adds a column, also add it here.
 * 
 * @version 2.0.0 (Phase 2 Hardening)
 */

/**
 * Create all database tables for a fresh install.
 * Uses IF NOT EXISTS so it's safe to call multiple times.
 */
function createTables(database) {

  // ==================== CORE TABLES ====================

  database.run(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_name_arabic TEXT,
      client_type TEXT DEFAULT 'individual',
      entity_type TEXT,
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
      parent_matter_id TEXT REFERENCES matters(matter_id),
      matter_stage TEXT DEFAULT 'first_instance',
      fee_arrangement TEXT,
      agreed_fee_amount REAL,
      agreed_fee_currency TEXT DEFAULT 'USD',
      success_fee_type TEXT DEFAULT 'percentage',
      success_fee_percentage REAL,
      success_fee_fixed_amount REAL,
      success_fee_currency TEXT DEFAULT 'USD',
      custom_hourly_rate REAL,
      custom_hourly_currency TEXT DEFAULT 'USD',
      adverse_parties TEXT,
      notes TEXT,
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id)
    )
  `);

  database.run(`
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id)
    )
  `);

  database.run(`
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id)
    )
  `);

  database.run(`
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
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id),
      FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
      FOREIGN KEY (judgment_id) REFERENCES judgments(judgment_id)
    )
  `);

  database.run(`
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      expense_id TEXT PRIMARY KEY,
      expense_type TEXT DEFAULT 'client',
      client_id TEXT,
      matter_id TEXT,
      lawyer_id TEXT,
      paid_by_firm INTEGER DEFAULT 0,
      paid_by_lawyer_id TEXT,
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
      attachment_note TEXT,
      notes TEXT,
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
      fee_description TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
      paid_date TEXT,
      client_reference TEXT,
      invoice_content_type TEXT DEFAULT 'combined',
      notes_to_client TEXT,
      internal_notes TEXT,
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  database.run(`
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
    )
  `);

  database.run(`
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
      firm_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    )
  `);

  // ==================== CORPORATE SECRETARY TABLES ====================

  database.run(`
    CREATE TABLE IF NOT EXISTS corporate_entities (
      entity_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      registration_number TEXT,
      registration_date TEXT,
      registered_address TEXT,
      share_capital REAL,
      share_capital_currency TEXT DEFAULT 'USD',
      total_shares INTEGER,
      fiscal_year_end TEXT,
      tax_id TEXT,
      commercial_register TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS shareholders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      id_number TEXT,
      nationality TEXT,
      shares_owned INTEGER DEFAULT 0,
      share_class TEXT DEFAULT 'Ordinary',
      date_acquired DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS directors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      id_number TEXT,
      nationality TEXT,
      position TEXT DEFAULT 'Director',
      date_appointed DATE,
      date_resigned DATE,
      is_signatory INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS commercial_register_filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      filing_type TEXT NOT NULL,
      filing_description TEXT,
      filing_date DATE,
      filing_reference TEXT,
      next_due_date DATE,
      reminder_days INTEGER DEFAULT 30,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS company_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      meeting_type TEXT NOT NULL,
      meeting_description TEXT,
      meeting_date DATE,
      meeting_notes TEXT,
      attendees TEXT,
      next_meeting_date DATE,
      next_meeting_agenda TEXT,
      reminder_days INTEGER DEFAULT 14,
      status TEXT DEFAULT 'held',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS share_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      transfer_type TEXT NOT NULL,
      transfer_date TEXT NOT NULL,
      from_shareholder_id INTEGER,
      to_shareholder_id INTEGER,
      from_shareholder_name TEXT,
      to_shareholder_name TEXT,
      shares_transferred INTEGER NOT NULL,
      price_per_share REAL,
      total_consideration REAL,
      share_class TEXT DEFAULT 'Ordinary',
      board_resolution TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
      FOREIGN KEY (from_shareholder_id) REFERENCES shareholders(id),
      FOREIGN KEY (to_shareholder_id) REFERENCES shareholders(id)
    )
  `);

  // ==================== LOOKUP TABLES ====================

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_court_types (
      court_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_regions (
      region_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_hearing_purposes (
      purpose_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_task_types (
      task_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      icon TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_expense_categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS lookup_entity_types (
      entity_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      is_system INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      sort_order INTEGER
    )
  `);

  // ==================== SYSTEM TABLES ====================

  database.run(`
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

  database.run(`
    CREATE TABLE IF NOT EXISTS firm_currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      symbol TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      rate_id TEXT PRIMARY KEY,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      effective_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS matter_diary (
      entry_id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      entry_type TEXT DEFAULT 'note',
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      deleted_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  database.run(`
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

    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT
    )
  `);

  // ==================== INDEXES ====================

  const indexes = [
    // Core entity indexes
    'CREATE INDEX IF NOT EXISTS idx_matters_client ON matters(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status)',
    'CREATE INDEX IF NOT EXISTS idx_matters_parent ON matters(parent_matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_hearings_matter ON hearings(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_timesheets_matter ON timesheets(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_matter ON expenses(matter_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(deadline_date)',
    'CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status)',
    'CREATE INDEX IF NOT EXISTS idx_deadlines_client ON deadlines(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_deadlines_judgment ON deadlines(judgment_id)',
    'CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency, effective_date)',
    'CREATE INDEX IF NOT EXISTS idx_matter_diary_matter ON matter_diary(matter_id)',

    // Soft delete indexes (for WHERE deleted_at IS NULL queries)
    'CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_matters_deleted ON matters(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_hearings_deleted ON hearings(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_judgments_deleted ON judgments(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_deadlines_deleted ON deadlines(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_timesheets_deleted ON timesheets(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_advances_deleted ON advances(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_appointments_deleted ON appointments(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_lawyers_deleted ON lawyers(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_shareholders_deleted ON shareholders(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_directors_deleted ON directors(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_commercial_register_filings_deleted ON commercial_register_filings(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_company_meetings_deleted ON company_meetings(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_corporate_entities_deleted ON corporate_entities(deleted_at)',
  ];

  indexes.forEach(sql => {
    try {
      database.run(sql);
    } catch (e) {
      // Index may already exist — safe to ignore
    }
  });
}


/**
 * Seed lookup data for a fresh database.
 * Only runs on fresh install (empty lookup tables).
 * 
 * NOTE: Arabic text uses Unicode escapes to prevent encoding corruption.
 * See KNOWN_FIXES.md for details on the Arabic encoding issue.
 */
function seedLookupData(database) {
  const now = new Date().toISOString();

  // ==================== COURT TYPES (Lebanese courts) ====================
  const courtTypes = [
    ['Single Judge Civil',    '\u0627\u0644\u0642\u0627\u0636\u064a \u0627\u0644\u0645\u0646\u0641\u0631\u062f \u0627\u0644\u0645\u062f\u0646\u064a',     'Juge Unique Civil'],
    ['Single Judge Criminal', '\u0627\u0644\u0642\u0627\u0636\u064a \u0627\u0644\u0645\u0646\u0641\u0631\u062f \u0627\u0644\u062c\u0632\u0627\u0626\u064a',     'Juge Unique P\u00e9nal'],
    ['Urgent Matters',        '\u0627\u0644\u0623\u0645\u0648\u0631 \u0627\u0644\u0645\u0633\u062a\u0639\u062c\u0644\u0629',                           'R\u00e9f\u00e9r\u00e9s'],
    ['First Instance',        '\u0627\u0644\u0645\u062d\u0643\u0645\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629',                       'Premi\u00e8re Instance'],
    ['Investigating Judge',   '\u0642\u0627\u0636\u064a \u0627\u0644\u062a\u062d\u0642\u064a\u0642',                                 "Juge d'Instruction"],
    ['Indictment Chamber',    '\u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u0627\u062a\u0647\u0627\u0645\u064a\u0629',                             'Chambre Accusatoire'],
    ['Criminal Court',        '\u0645\u062d\u0643\u0645\u0629 \u0627\u0644\u062c\u0646\u0627\u064a\u0627\u062a',                               'Chambre Criminelle'],
    ['Execution Judge',       '\u0642\u0627\u0636\u064a \u0627\u0644\u062a\u0646\u0641\u064a\u0630',                                   "Juge de l'Ex\u00e9cution"],
    ['Civil Appeal',          '\u0627\u0633\u062a\u0626\u0646\u0627\u0641 \u0645\u062f\u0646\u064a',                                   "Cour d'Appel Civil"],
    ['Criminal Appeal',       '\u0627\u0633\u062a\u0626\u0646\u0627\u0641 \u062c\u0632\u0627\u0626\u064a',                                   "Cour d'Appel P\u00e9nal"],
    ['Civil Cassation',       '\u062a\u0645\u064a\u064a\u0632 \u0645\u062f\u0646\u064a',                                     'Cour de Cassation Civile'],
    ['Criminal Cassation',    '\u062a\u0645\u064a\u064a\u0632 \u062c\u0632\u0627\u0626\u064a',                                     'Cour de Cassation P\u00e9nale'],
    ['Labor Tribunal',        '\u0645\u062c\u0644\u0633 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u062a\u062d\u0643\u064a\u0645\u064a',                         "Conseil de Prud'hommes"],
    ['Plenary Assembly',      '\u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u0639\u0627\u0645\u0629',                                   'Assembl\u00e9e Pl\u00e9ni\u00e8re'],
    ['Council of State',      '\u0645\u062c\u0644\u0633 \u0634\u0648\u0631\u0649 \u0627\u0644\u062f\u0648\u0644\u0629',                             "Conseil d'\u00c9tat"],
    ['Arbitrator',            '\u0645\u062d\u0643\u0651\u0645',                                                     'Arbitre'],
    ['Arbitration Panel',     '\u0647\u064a\u0626\u0629 \u062a\u062d\u0643\u064a\u0645\u064a\u0629',                                   'Tribunal Arbitral'],
  ];
  courtTypes.forEach((ct, i) => {
    database.execute(
      'INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)',
      [ct[0], ct[1], ct[2], i + 1]
    );
  });

  // ==================== REGIONS (Lebanese judicial districts) ====================
  const regions = [
    ['Beirut',         '\u0628\u064a\u0631\u0648\u062a',       'Beyrouth'],
    ['Mount Lebanon',  '\u062c\u0628\u0644 \u0644\u0628\u0646\u0627\u0646',   'Mont-Liban'],
    ['Metn',           '\u0627\u0644\u0645\u062a\u0646',       'Metn'],
    ['Batroun',        '\u0627\u0644\u0628\u062a\u0631\u0648\u0646',     'Batroun'],
    ['Jbeil',          '\u062c\u0628\u064a\u0644',       'Jbeil'],
    ['Jounieh',        '\u062c\u0648\u0646\u064a\u0629',     'Jounieh'],
    ['North Lebanon',  '\u0627\u0644\u0634\u0645\u0627\u0644',     'Liban-Nord'],
    ['South Lebanon',  '\u0627\u0644\u062c\u0646\u0648\u0628',     'Liban-Sud'],
    ['Bekaa',          '\u0627\u0644\u0628\u0642\u0627\u0639',     'B\u00e9kaa'],
    ['Nabatieh',       '\u0627\u0644\u0646\u0628\u0637\u064a\u0629',   'Nabatieh'],
    ['Akkar',          '\u0639\u0643\u0627\u0631',       'Akkar'],
    ['Baalbek',        '\u0628\u0639\u0644\u0628\u0643',     'Baalbek'],
  ];
  regions.forEach((r, i) => {
    database.execute(
      'INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)',
      [r[0], r[1], r[2], i + 1]
    );
  });

  // ==================== HEARING PURPOSES ====================
  const purposes = [
    ['First Session',              '\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0623\u0648\u0644\u0649',               'Premi\u00e8re audience'],
    ['Pleadings Exchange',         '\u062a\u0628\u0627\u062f\u0644 \u0627\u0644\u0644\u0648\u0627\u0626\u062d',               '\u00c9change de conclusions'],
    ['Evidence Submission',        '\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a',             'Production de preuves'],
    ['Witness Hearing',            '\u0633\u0645\u0627\u0639 \u0627\u0644\u0634\u0647\u0648\u062f',                   'Audition de t\u00e9moins'],
    ['Expert Report Discussion',   '\u0645\u0646\u0627\u0642\u0634\u0629 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062e\u0628\u064a\u0631',       "Discussion du rapport d'expert"],
    ['Final Arguments',            '\u0627\u0644\u0645\u0631\u0627\u0641\u0639\u0627\u062a \u0627\u0644\u062e\u062a\u0627\u0645\u064a\u0629',           'Plaidoiries finales'],
    ['Judgment Pronouncement',     '\u0627\u0644\u0646\u0637\u0642 \u0628\u0627\u0644\u062d\u0643\u0645',                 'Prononc\u00e9 du jugement'],
    ['Procedural',                 '\u0625\u062c\u0631\u0627\u0626\u064a\u0629',                         'Proc\u00e9durale'],
    ['Settlement Discussion',      '\u0645\u0646\u0627\u0642\u0634\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629',             'Discussion de r\u00e8glement'],
    ['Other',                      '\u0623\u062e\u0631\u0649',                           'Autre'],
  ];
  purposes.forEach((p, i) => {
    database.execute(
      'INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)',
      [p[0], p[1], p[2], i + 1]
    );
  });

  // ==================== TASK TYPES ====================
  const taskTypes = [
    ['Memo',                   '\u0645\u0630\u0643\u0631\u0629',                   'M\u00e9mo',                       '\ud83d\udcdd'],
    ['Document Preparation',   '\u0625\u0639\u062f\u0627\u062f \u0645\u0633\u062a\u0646\u062f',           'Pr\u00e9paration de document',    '\ud83d\udcc4'],
    ['Filing',                 '\u0625\u064a\u062f\u0627\u0639',                     'D\u00e9p\u00f4t',                       '\ud83d\udcc1'],
    ['Follow-up',              '\u0645\u062a\u0627\u0628\u0639\u0629',                   'Suivi',                       '\ud83d\udd04'],
    ['Research',               '\u0628\u062d\u062b',                       'Recherche',                   '\ud83d\udd0d'],
    ['Review',                 '\u0645\u0631\u0627\u062c\u0639\u0629',                   'R\u00e9vision',                   '\ud83d\udc41'],
    ['Client Communication',   '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0639\u0645\u064a\u0644',       'Communication client',        '\ud83d\udcac'],
    ['Court Attendance',       '\u062d\u0636\u0648\u0631 \u0627\u0644\u0645\u062d\u0643\u0645\u0629',           'Pr\u00e9sence au tribunal',       '\u2696\ufe0f'],
    ['Meeting',                '\u0627\u062c\u062a\u0645\u0627\u0639',                   'R\u00e9union',                    '\ud83e\udd1d'],
    ['Call',                   '\u0645\u0643\u0627\u0644\u0645\u0629',                   'Appel',                       '\ud83d\udcde'],
    ['General',                '\u0639\u0627\u0645',                         'G\u00e9n\u00e9ral',                    '\u2705'],
  ];
  taskTypes.forEach((t, i) => {
    database.execute(
      'INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
      [t[0], t[1], t[2], t[3], i + 1]
    );
  });

  // ==================== EXPENSE CATEGORIES ====================
  const expenseCategories = [
    ['Court Fees',       '\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u062d\u0643\u0645\u0629',     'Frais de justice'],
    ['Filing Fees',      '\u0631\u0633\u0648\u0645 \u0627\u0644\u0625\u064a\u062f\u0627\u0639',       'Frais de d\u00e9p\u00f4t'],
    ['Travel',           '\u0633\u0641\u0631',                 'D\u00e9placement'],
    ['Expert Fees',      '\u0623\u062a\u0639\u0627\u0628 \u0627\u0644\u062e\u0628\u064a\u0631',     "Honoraires d'expert"],
    ['Translation',      '\u062a\u0631\u062c\u0645\u0629',               'Traduction'],
    ['Courier',          '\u0628\u0631\u064a\u062f \u0633\u0631\u064a\u0639',         'Courrier'],
    ['Notary Fees',      '\u0631\u0633\u0648\u0645 \u0643\u0627\u062a\u0628 \u0627\u0644\u0639\u062f\u0644', 'Frais de notaire'],
    ['Government Fees',  '\u0631\u0633\u0648\u0645 \u062d\u0643\u0648\u0645\u064a\u0629',       'Frais gouvernementaux'],
    ['Photocopying',     '\u062a\u0635\u0648\u064a\u0631',               'Photocopie'],
    ['Other',            '\u0623\u062e\u0631\u0649',               'Autre'],
  ];
  expenseCategories.forEach((e, i) => {
    database.execute(
      'INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, 1, ?)',
      [e[0], e[1], e[2], i + 1]
    );
  });

  // ==================== ENTITY TYPES (Lebanese company types) ====================
  const entityTypes = [
    ['SAL',              'Joint Stock Company',         '\u0634\u0631\u0643\u0629 \u0645\u0633\u0627\u0647\u0645\u0629 \u0644\u0628\u0646\u0627\u0646\u064a\u0629',             'Soci\u00e9t\u00e9 Anonyme Libanaise'],
    ['SARL',             'Limited Liability Company',   '\u0634\u0631\u0643\u0629 \u0645\u062d\u062f\u0648\u062f\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629',           'SARL'],
    ['HOLDING',          'Holding Company',             '\u0634\u0631\u0643\u0629 \u0642\u0627\u0628\u0636\u0629',                             'Soci\u00e9t\u00e9 Holding'],
    ['OFFSHORE',         'Offshore Company',            '\u0634\u0631\u0643\u0629 \u0623\u0648\u0641\u0634\u0648\u0631',                           'Soci\u00e9t\u00e9 Offshore'],
    ['PARTNERSHIP',      'General Partnership',         '\u0634\u0631\u0643\u0629 \u062a\u0636\u0627\u0645\u0646',                             'Soci\u00e9t\u00e9 en Nom Collectif'],
    ['LIMITED_PARTNER',  'Limited Partnership',         '\u0634\u0631\u0643\u0629 \u062a\u0648\u0635\u064a\u0629 \u0628\u0633\u064a\u0637\u0629',                   'Soci\u00e9t\u00e9 en Commandite Simple'],
    ['BRANCH',           'Foreign Branch',              '\u0641\u0631\u0639 \u0634\u0631\u0643\u0629 \u0623\u062c\u0646\u0628\u064a\u0629',                     'Succursale \u00c9trang\u00e8re'],
    ['REP_OFFICE',       'Representative Office',       '\u0645\u0643\u062a\u0628 \u062a\u0645\u062b\u064a\u0644\u064a',                           'Bureau de Repr\u00e9sentation'],
    ['SOLE_PROP',        'Sole Proprietorship',         '\u0645\u0624\u0633\u0633\u0629 \u0641\u0631\u062f\u064a\u0629',                           'Entreprise Individuelle'],
    ['NGO',              'Non-Profit Organization',     '\u062c\u0645\u0639\u064a\u0629',                                     'Association'],
    ['CIVIL',            'Civil Company',               '\u0634\u0631\u0643\u0629 \u0645\u062f\u0646\u064a\u0629',                             'Soci\u00e9t\u00e9 Civile'],
    ['SINGLE_OFFSHORE',  'Single Partner Offshore',     '\u0634\u0631\u0643\u0629 \u0623\u0648\u0641\u0634\u0648\u0631 \u0634\u0631\u064a\u0643 \u0648\u0627\u062d\u062f',         'Offshore \u00e0 Associ\u00e9 Unique'],
    ['SINGLE_SARL',      'Single Partner SARL',         '\u0634\u0631\u0643\u0629 \u0645\u062d\u062f\u0648\u062f\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0634\u0631\u064a\u0643 \u0648\u0627\u062d\u062f', 'SARL \u00e0 Associ\u00e9 Unique'],
  ];
  entityTypes.forEach((et, i) => {
    database.execute(
      'INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
      [et[0], et[1], et[2], et[3], i + 1]
    );
  });

  // ==================== DEFAULT CURRENCIES ====================
  const defaultCurrencies = [
    { code: 'USD', name: 'US Dollar',        name_ar: '\u062f\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064a\u0643\u064a',   symbol: '$',      sort: 1 },
    { code: 'EUR', name: 'Euro',              name_ar: '\u064a\u0648\u0631\u0648',               symbol: '\u20ac',      sort: 2 },
    { code: 'LBP', name: 'Lebanese Pound',    name_ar: '\u0644\u064a\u0631\u0629 \u0644\u0628\u0646\u0627\u0646\u064a\u0629',   symbol: '\u0644.\u0644',   sort: 3 },
    { code: 'GBP', name: 'British Pound',     name_ar: '\u062c\u0646\u064a\u0647 \u0625\u0633\u062a\u0631\u0644\u064a\u0646\u064a', symbol: '\u00a3',      sort: 4 },
    { code: 'AED', name: 'UAE Dirham',         name_ar: '\u062f\u0631\u0647\u0645 \u0625\u0645\u0627\u0631\u0627\u062a\u064a',   symbol: '\u062f.\u0625',   sort: 5 },
    { code: 'SAR', name: 'Saudi Riyal',        name_ar: '\u0631\u064a\u0627\u0644 \u0633\u0639\u0648\u062f\u064a',     symbol: '\u0631.\u0633',   sort: 6 },
  ];
  defaultCurrencies.forEach(c => {
    database.execute(
      'INSERT OR IGNORE INTO firm_currencies (code, name, name_ar, symbol, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [c.code, c.name, c.name_ar, c.symbol, c.sort, now, now]
    );
  });
}


module.exports = { createTables, seedLookupData };
