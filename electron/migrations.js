/**
 * Qanuni Database Migrations
 * 
 * Versioned, trackable migrations that:
 * - Only run once (tracked in schema_versions table)
 * - Run in order
 * - Log what they do
 * - Can't accidentally re-apply
 * 
 * Adding a new migration:
 * 1. Add an entry to MIGRATIONS array with the next version number
 * 2. The `up` function receives the database module
 * 3. Test on a fresh DB AND on an existing DB
 * 
 * @version 1.0.0 (Phase 1 Hardening)
 */

const logger = require('./logging');

// ==================== MIGRATION DEFINITIONS ====================

const MIGRATIONS = [
  {
    version: 1,
    description: 'Create schema_versions tracking table',
    up: (db) => {
      // This is bootstrapped separately — see ensureTrackingTable()
      // Listed here for completeness
    }
  },
  {
    version: 2,
    description: 'Add deleted_at to all entity tables',
    up: (db) => {
      const tables = ['clients', 'matters', 'hearings', 'judgments', 'tasks',
        'timesheets', 'appointments', 'expenses', 'advances', 'invoices'];
      for (const table of tables) {
        addColumnIfMissing(db, table, 'deleted_at', 'TEXT');
      }
    }
  },
  {
    version: 3,
    description: 'Add firm_id to major tables for future multi-tenancy',
    up: (db) => {
      const tables = ['clients', 'matters', 'hearings', 'judgments', 'tasks',
        'timesheets', 'appointments', 'expenses', 'advances', 'invoices',
        'lawyers', 'settings'];
      for (const table of tables) {
        addColumnIfMissing(db, table, 'firm_id', 'TEXT');
      }
    }
  },
  {
    version: 4,
    description: 'Add appeal fields to matters',
    up: (db) => {
      addColumnIfMissing(db, 'matters', 'parent_matter_id', 'TEXT');
      addColumnIfMissing(db, 'matters', 'appeal_type', 'TEXT');
      addColumnIfMissing(db, 'matters', 'matter_stage', "TEXT DEFAULT 'first_instance'");
    }
  },
  {
    version: 5,
    description: 'Add adverse_parties to matters',
    up: (db) => {
      addColumnIfMissing(db, 'matters', 'adverse_parties', 'TEXT');
    }
  },
  {
    version: 6,
    description: 'Add fee structure fields to matters',
    up: (db) => {
      addColumnIfMissing(db, 'matters', 'fee_structure', 'TEXT');
      addColumnIfMissing(db, 'matters', 'hourly_rate', 'REAL');
      addColumnIfMissing(db, 'matters', 'flat_fee_amount', 'REAL');
      addColumnIfMissing(db, 'matters', 'contingency_percentage', 'REAL');
      addColumnIfMissing(db, 'matters', 'retainer_amount', 'REAL');
    }
  },
  {
    version: 7,
    description: 'Add client_reference to clients',
    up: (db) => {
      addColumnIfMissing(db, 'clients', 'client_reference', 'TEXT');
    }
  },
  {
    version: 8,
    description: 'Add adjourned_to_hearing_id to hearings',
    up: (db) => {
      addColumnIfMissing(db, 'hearings', 'adjourned_to_hearing_id', 'TEXT');
    }
  },
  {
    version: 9,
    description: 'Add invoice_content_type to invoices',
    up: (db) => {
      addColumnIfMissing(db, 'invoices', 'invoice_content_type', 'TEXT');
    }
  },
  {
    version: 10,
    description: 'Add attachment_note to expenses',
    up: (db) => {
      addColumnIfMissing(db, 'expenses', 'attachment_note', 'TEXT');
    }
  },
  {
    version: 11,
    description: 'Create deadlines table',
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS deadlines (
          deadline_id TEXT PRIMARY KEY,
          judgment_id TEXT,
          matter_id TEXT,
          client_id TEXT,
          deadline_type TEXT,
          deadline_date TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          firm_id TEXT,
          created_at TEXT,
          updated_at TEXT,
          deleted_at TEXT,
          FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
          FOREIGN KEY (client_id) REFERENCES clients(client_id)
        )
      `);
    }
  },
  {
    version: 12,
    description: 'Create corporate secretary tables',
    up: (db) => {
      db.run(`CREATE TABLE IF NOT EXISTS lookup_entity_types (
        entity_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_en TEXT NOT NULL, name_ar TEXT,
        category TEXT DEFAULT 'company',
        created_at TEXT, updated_at TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS corporate_entities (
        entity_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        entity_type_id INTEGER,
        incorporation_date TEXT, registration_number TEXT, tax_id TEXT,
        registered_address TEXT, share_capital REAL, currency TEXT DEFAULT 'USD',
        number_of_shares INTEGER, par_value REAL,
        fiscal_year_end TEXT, status TEXT DEFAULT 'active',
        notes TEXT, firm_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(client_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS shareholders (
        shareholder_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL, name TEXT NOT NULL, name_arabic TEXT,
        shareholder_type TEXT DEFAULT 'individual',
        nationality TEXT, id_number TEXT,
        shares INTEGER DEFAULT 0, share_percentage REAL DEFAULT 0,
        share_class TEXT DEFAULT 'ordinary',
        acquisition_date TEXT, notes TEXT,
        created_at TEXT, updated_at TEXT, deleted_at TEXT,
        FOREIGN KEY (entity_id) REFERENCES corporate_entities(entity_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS directors (
        director_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL, name TEXT NOT NULL, name_arabic TEXT,
        position TEXT DEFAULT 'director', nationality TEXT, id_number TEXT,
        appointment_date TEXT, term_end_date TEXT,
        is_signatory INTEGER DEFAULT 0, signature_class TEXT,
        notes TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT,
        FOREIGN KEY (entity_id) REFERENCES corporate_entities(entity_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS commercial_register_filings (
        filing_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL, filing_type TEXT, filing_date TEXT,
        reference_number TEXT, description TEXT, status TEXT DEFAULT 'pending',
        notes TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT,
        FOREIGN KEY (entity_id) REFERENCES corporate_entities(entity_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS company_meetings (
        meeting_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL, meeting_type TEXT, meeting_date TEXT,
        location TEXT, agenda TEXT, minutes TEXT, attendees TEXT,
        resolutions TEXT, status TEXT DEFAULT 'scheduled',
        next_meeting_date TEXT, notes TEXT,
        created_at TEXT, updated_at TEXT, deleted_at TEXT,
        FOREIGN KEY (entity_id) REFERENCES corporate_entities(entity_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS share_transfers (
        transfer_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        from_shareholder_id TEXT, to_shareholder_id TEXT,
        shares_transferred INTEGER NOT NULL, transfer_date TEXT NOT NULL,
        price_per_share REAL, total_price REAL,
        board_resolution_date TEXT, board_resolution_number TEXT,
        notarization_date TEXT, notary_name TEXT,
        commercial_register_date TEXT, commercial_register_number TEXT,
        notes TEXT, status TEXT DEFAULT 'completed',
        created_at TEXT, updated_at TEXT,
        FOREIGN KEY (entity_id) REFERENCES corporate_entities(entity_id)
      )`);
    }
  },
  {
    version: 13,
    description: 'Create currency and exchange rate tables',
    up: (db) => {
      db.run(`CREATE TABLE IF NOT EXISTS firm_currencies (
        currency_id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL, name_en TEXT NOT NULL, name_ar TEXT,
        symbol TEXT, is_default INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
        rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_currency TEXT NOT NULL, to_currency TEXT NOT NULL,
        rate REAL NOT NULL, effective_date TEXT NOT NULL,
        created_at TEXT, updated_at TEXT
      )`);
    }
  },
  {
    version: 14,
    description: 'Create matter_diary table',
    up: (db) => {
      db.run(`CREATE TABLE IF NOT EXISTS matter_diary (
        diary_id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        entry_date TEXT NOT NULL,
        entry_type TEXT DEFAULT 'note',
        subtype TEXT,
        title TEXT,
        content TEXT,
        lawyer_id TEXT,
        is_private INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
        FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id)
      )`);
    }
  },
  {
    version: 15,
    description: 'Create conflict_check_log table',
    up: (db) => {
      db.run(`CREATE TABLE IF NOT EXISTS conflict_check_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_terms TEXT,
        results_count INTEGER,
        checked_by TEXT,
        check_date TEXT,
        notes TEXT,
        created_at TEXT
      )`);
    }
  },
  {
    version: 16,
    description: 'Add custom_matter_number to matters',
    up: (db) => {
      addColumnIfMissing(db, 'matters', 'custom_matter_number', 'TEXT');
    }
  }
];

// ==================== MIGRATION RUNNER ====================

/**
 * Run all pending migrations.
 * Returns { applied: number, errors: number }
 */
function runAll(database) {
  ensureTrackingTable(database);

  const applied = getAppliedVersions(database);
  let newlyApplied = 0;
  let errors = 0;

  for (const migration of MIGRATIONS) {
    if (migration.version === 1) continue; // Tracking table handled separately
    if (applied.has(migration.version)) continue;

    try {
      logger.info(`Running migration v${migration.version}: ${migration.description}`);
      migration.up(database);
      recordMigration(database, migration.version, migration.description);
      newlyApplied++;
      logger.info(`Migration v${migration.version} completed`);
    } catch (error) {
      errors++;
      logger.error(`Migration v${migration.version} FAILED`, {
        description: migration.description,
        error: error.message
      });
      // Continue with other migrations — don't halt on one failure
      // The failed migration will be retried on next startup
    }
  }

  if (newlyApplied > 0 || errors > 0) {
    logger.info('Migration run complete', { applied: newlyApplied, errors, total: MIGRATIONS.length });
  }

  return { applied: newlyApplied, errors };
}

// ==================== HELPERS ====================

function ensureTrackingTable(database) {
  try {
    database.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at TEXT NOT NULL
      )
    `);
  } catch (e) {
    logger.error('Failed to create schema_versions table', { error: e.message });
  }
}

function getAppliedVersions(database) {
  const versions = new Set();
  try {
    const rows = database.query('SELECT version FROM schema_versions');
    for (const row of rows) {
      versions.add(row.version);
    }
  } catch (e) {
    // Table might not exist yet on very first run
  }
  return versions;
}

function recordMigration(database, version, description) {
  database.run(
    `INSERT OR REPLACE INTO schema_versions (version, description, applied_at) VALUES (${version}, '${description.replace(/'/g, "''")}', '${new Date().toISOString()}')`
  );
}

/**
 * Safely add a column to a table if it doesn't already exist.
 * SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check PRAGMA first.
 */
function addColumnIfMissing(database, table, column, type) {
  try {
    const columns = database.query(`PRAGMA table_info(${table})`);
    const exists = columns.some(col => col.name === column);
    if (!exists) {
      database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      logger.debug(`Added column ${table}.${column} (${type})`);
    }
  } catch (e) {
    logger.warn(`Could not add column ${table}.${column}`, { error: e.message });
  }
}

/**
 * Get migration status for diagnostics.
 */
function getStatus(database) {
  const applied = getAppliedVersions(database);
  const pending = MIGRATIONS.filter(m => m.version > 1 && !applied.has(m.version));

  return {
    totalMigrations: MIGRATIONS.length - 1, // Exclude the tracking table migration
    applied: applied.size,
    pending: pending.length,
    pendingVersions: pending.map(m => ({ version: m.version, description: m.description })),
    latestApplied: Math.max(...applied, 0)
  };
}

// ==================== EXPORTS ====================

module.exports = {
  runAll,
  getStatus,
  MIGRATIONS
};
