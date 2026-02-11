/**
 * Qanuni Database Layer
 * 
 * Handles all SQLite operations with:
 * - Atomic writes (temp file + rename) to prevent corruption
 * - Proper ID generation (crypto-based, collision-free)
 * - Transaction support for multi-step operations
 * - Error propagation (never swallows errors silently)
 * - Integrity checks on startup
 * - WAL mode for better concurrent read/write
 * 
 * @version 1.0.0 (Phase 1 Hardening)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');
const logger = require('./logging');

let db = null;
let SQL = null;
let dbPath = '';
let isTestMode = false;

// ==================== INITIALIZATION ====================

/**
 * Initialize the database connection.
 * - Loads existing DB or creates new one
 * - Runs integrity check on existing DBs
 * - Applies pending migrations
 * - Enables WAL mode for crash safety
 */
async function init(options = {}) {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  if (options.dbPath) {
    dbPath = options.dbPath;
    isTestMode = false;
    logger.info('Database initialized (REST API mode)', { path: dbPath });
  } else {
    const userDataPath = app.getPath('userData');
    isTestMode = process.argv.includes('--test-db') || process.env.QANUNI_TEST === '1';
    const dbFileName = isTestMode ? 'qanuni-test.db' : 'qanuni.db';
    dbPath = path.join(userDataPath, dbFileName);
  }

  if (isTestMode) {
    logger.info('Running with TEST database', { path: dbPath });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    logger.info('Database loaded', { path: dbPath, size: fileBuffer.length });

    // Integrity check on existing databases
    const integrity = checkIntegrity();
    if (!integrity.ok) {
      logger.error('Database integrity check FAILED', { result: integrity.result });
      // Don't throw — let the app start but flag the issue
      // The frontend will be notified via getDatabaseStatus()
    }
  } else {
    db = new SQL.Database();
    logger.info('New database created', { path: dbPath });
  }

  // Enable WAL mode for better crash recovery
  // WAL = Write-Ahead Logging: writes go to a separate log file first
  // If the app crashes, the WAL file is replayed on next open
  try {
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    logger.info('Database pragmas set (WAL mode, foreign keys ON)');
  } catch (e) {
    // sql.js may not support WAL in all modes — log but continue
    logger.warn('Could not set WAL mode (sql.js limitation)', { error: e.message });
  }

  // Apply pending migrations
  const migrations = require('./migrations');
  const migrationResult = migrations.runAll(module.exports);
  logger.info('Migration system initialized', migrationResult);

  return db;
}

// ==================== SAFE WRITES ====================

/**
 * Save database to disk using atomic write pattern.
 * 
 * Steps:
 * 1. Export DB to buffer
 * 2. Write to temporary file (dbPath + '.tmp')
 * 3. If write succeeds, rename tmp → actual (atomic on most filesystems)
 * 4. If anything fails, the original file is untouched
 * 
 * This prevents corruption from: power loss, crashes, force-quit, disk full
 */
function saveToDisk() {
  if (!db) {
    logger.error('saveToDisk called with no database');
    return false;
  }

  const tmpPath = dbPath + '.tmp';
  const backupPath = dbPath + '.bak';

  try {
    // Step 1: Export database to buffer
    const data = db.export();
    const buffer = Buffer.from(data);

    // Step 2: Write to temp file
    fs.writeFileSync(tmpPath, buffer);

    // Step 3: Verify the temp file is valid (not zero-length, not truncated)
    const stat = fs.statSync(tmpPath);
    if (stat.size === 0) {
      logger.error('saveToDisk: temp file is empty, aborting', { tmpPath });
      fs.unlinkSync(tmpPath);
      return false;
    }

    // Step 4: Verify the temp file is a valid SQLite database
    try {
      const verifyDb = new SQL.Database(fs.readFileSync(tmpPath));
      verifyDb.exec('SELECT 1'); // Quick sanity check
      verifyDb.close();
    } catch (verifyError) {
      logger.error('saveToDisk: temp file is not a valid database, aborting', {
        error: verifyError.message
      });
      fs.unlinkSync(tmpPath);
      return false;
    }

    // Step 5: Backup current file (safety net)
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, backupPath);
      } catch (backupError) {
        // Non-fatal — we can continue without backup
        logger.warn('saveToDisk: could not create backup', { error: backupError.message });
      }
    }

    // Step 6: Atomic rename (this is the critical moment)
    fs.renameSync(tmpPath, dbPath);

    // Step 7: Clean up backup (keep only the most recent)
    // The .bak file stays until the next successful save

    return true;
  } catch (error) {
    logger.error('saveToDisk FAILED', { error: error.message, stack: error.stack });

    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (cleanupError) {
      // Nothing we can do
    }

    return false;
  }
}

// ==================== QUERY EXECUTION ====================

/**
 * Execute a SELECT query. Returns array of row objects.
 * THROWS on error — never returns empty array to mask failures.
 */
function query(sql, params = []) {
  if (!db) throw new DatabaseError('Database not initialized', 'DB_NOT_INIT');

  const sanitizedParams = params.map(p => p === undefined ? null : p);

  try {
    const stmt = db.prepare(sql);
    stmt.bind(sanitizedParams);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    logger.error('Query failed', { sql: sql.substring(0, 200), params: sanitizedParams, error: error.message });
    throw new DatabaseError(`Query failed: ${error.message}`, 'QUERY_FAILED', { sql, params: sanitizedParams });
  }
}

/**
 * Execute a SELECT query, return first row or null.
 */
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE.
 * Saves to disk immediately (unless inside a transaction, which saves at commit).
 * Returns { success: true } or throws.
 */

/**
 * Run a raw SQL statement (for DDL like CREATE TABLE, ALTER TABLE).
 * No disk save — used for schema operations during init.
 */
function run(sql) {
  if (!db) throw new DatabaseError('Database not initialized', 'DB_NOT_INIT');
  try {
    db.run(sql);
  } catch (error) {
    logger.error('Run failed', { sql: sql.substring(0, 200), error: error.message });
    throw new DatabaseError(`Run failed: ${error.message}`, 'RUN_FAILED', { sql });
  }
}

// ==================== TRANSACTIONS ====================

/**
 * Execute multiple operations in a transaction.
 * If any operation fails, ALL changes are rolled back.
 * 
 * Usage:
 *   const result = database.transaction(() => {
 *     database.execute('INSERT INTO invoices ...', [...]);
 *     database.execute('INSERT INTO invoice_items ...', [...]);
 *     database.execute('INSERT INTO invoice_items ...', [...]);
 *     return { invoiceId: id };
 *   });
 * 
 * Note: Inside a transaction, execute() does NOT save to disk.
 * Disk save happens once at the end of a successful transaction.
 */
let inTransaction = false;

function transaction(fn) {
  if (!db) throw new DatabaseError('Database not initialized', 'DB_NOT_INIT');
  if (inTransaction) throw new DatabaseError('Nested transactions not supported', 'NESTED_TXN');

  inTransaction = true;

  try {
    db.run('BEGIN TRANSACTION');
    const result = fn();
    db.run('COMMIT');

    // Save to disk after successful commit
    const saved = saveToDisk();
    if (!saved) {
      logger.error('Transaction committed but disk save failed');
    }

    inTransaction = false;
    return result;
  } catch (error) {
    try {
      db.run('ROLLBACK');
    } catch (rollbackError) {
      logger.error('ROLLBACK failed after transaction error', {
        originalError: error.message,
        rollbackError: rollbackError.message
      });
    }
    inTransaction = false;
    throw error;
  }
}

// Override execute behavior inside transactions (no individual disk saves)
function execute(sql, params = []) {
  if (!db) throw new DatabaseError('Database not initialized', 'DB_NOT_INIT');

  const sanitizedParams = params.map(p => p === undefined ? null : p);

  try {
    db.run(sql, sanitizedParams);

    // Only save to disk if NOT in a transaction
    // Transactions save once at commit
    if (!inTransaction) {
      const saved = saveToDisk();
      if (!saved) {
        logger.error('Data written to memory but disk save failed', { sql: sql.substring(0, 200) });
        throw new DatabaseError('Data written to memory but disk save failed', 'SAVE_FAILED', { sql });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Execute failed', { sql: sql.substring(0, 200), params: sanitizedParams, error: error.message });
    throw new DatabaseError(`Execute failed: ${error.message}`, 'EXECUTE_FAILED', { sql });
  }
}
// ==================== ID GENERATION ====================

/**
 * Generate a collision-resistant unique ID.
 * Format: PREFIX-YYYY-xxxxxxxx (8 hex chars from crypto.randomBytes)
 * 
 * Probability space: 16^8 = 4,294,967,296 possible values per prefix per year.
 * Birthday problem threshold: ~65,536 IDs before 50% collision chance.
 * That's more IDs than any single law firm will ever create.
 * 
 * Previous implementation used Math.random() * 10000 = only 10,000 values.
 */
function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex'); // 8 hex chars
  return `${prefix}-${year}-${random}`;
}

// ==================== INTEGRITY ====================

/**
 * Run SQLite integrity check.
 * Returns { ok: boolean, result: string }
 */
function checkIntegrity() {
  try {
    const result = query('PRAGMA integrity_check');
    const status = result[0]?.integrity_check;
    const ok = status === 'ok';
    if (ok) {
      logger.info('Database integrity check passed');
    } else {
      logger.error('Database integrity check failed', { status });
    }
    return { ok, result: status };
  } catch (error) {
    logger.error('Integrity check threw', { error: error.message });
    return { ok: false, result: error.message };
  }
}

/**
 * Get database status for frontend reporting.
 */
function getStatus() {
  if (!db) return { initialized: false };

  const integrity = checkIntegrity();
  let sizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) {
      sizeBytes = fs.statSync(dbPath).size;
    }
  } catch (e) { /* ignore */ }

  return {
    initialized: true,
    path: dbPath,
    isTestMode,
    sizeBytes,
    sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
    integrityOk: integrity.ok,
    integrityResult: integrity.result
  };
}

// ==================== EXPORT / BACKUP ====================

/**
 * Export database as a Buffer (for backup operations).
 */
function exportBuffer() {
  if (!db) throw new DatabaseError('Database not initialized', 'DB_NOT_INIT');
  return Buffer.from(db.export());
}

/**
 * Get the database file path.
 */
function getPath() {
  return dbPath;
}

/**
 * Force save — used on app quit to ensure nothing is lost.
 */
function forceSave() {
  if (db) {
    const saved = saveToDisk();
    if (saved) {
      logger.info('Force save completed');
    } else {
      logger.error('Force save FAILED');
    }
    return saved;
  }
  return false;
}

/**
 * Close the database connection.
 */
function close() {
  if (db) {
    forceSave();
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

// ==================== ERROR CLASS ====================

class DatabaseError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

// ==================== EXPORTS ====================

module.exports = {
  init,
  query,
  queryOne,
  execute,  // Transaction-aware version
  run,
  transaction,
  generateId,
  saveToDisk,
  forceSave,
  close,
  checkIntegrity,
  getStatus,
  exportBuffer,
  getPath,
  DatabaseError
};
