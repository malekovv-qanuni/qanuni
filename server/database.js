/**
 * Qanuni SaaS - SQL Server Database Layer
 *
 * Uses msnodesqlv8 for Windows Auth (local dev)
 * Uses tedious for SQL Auth (production)
 *
 * @version 1.0.0 (Week 1 - SaaS Foundation)
 */

require('dotenv').config();

// Determine authentication mode
const useWindowsAuth = !process.env.DB_USER || !process.env.DB_PASSWORD;

// Load the correct driver
// Production (SQL Auth): uses tedious (pure JS, works on Linux/Azure)
// Development (Windows Auth): uses msnodesqlv8 (native, requires ODBC Driver 17)
let sql;
if (useWindowsAuth) {
  try {
    sql = require('mssql/msnodesqlv8');
  } catch (e) {
    console.warn('msnodesqlv8 not available — falling back to tedious driver.');
    console.warn('Set DB_USER and DB_PASSWORD in .env for SQL Auth.');
    sql = require('mssql');
  }
} else {
  sql = require('mssql');
}

// Connection configuration
const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectTimeout: 30000
  }
};

// Configure authentication
if (useWindowsAuth) {
  // Windows Authentication (local development) via msnodesqlv8
  config.options.trustedConnection = true;
  config.options.instanceName = 'SQLEXPRESS';
  config.connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${config.server}\\${config.options.instanceName};Database=${config.database};Trusted_Connection=yes;`;
} else {
  // SQL Server Authentication (production/Azure) via tedious
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  // No instanceName for Azure SQL (only needed for local SQLEXPRESS)
}

// Connection pool (reused across requests)
let pool = null;

/**
 * Get or create connection pool
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log(`SQL Server connection pool established (${useWindowsAuth ? 'Windows Auth via msnodesqlv8' : 'SQL Auth via tedious'})`);
  }
  return pool;
}

/**
 * Execute a query with parameters
 * @param {string} query - SQL query with @param placeholders
 * @param {Object} params - Parameters object { paramName: value }
 * @returns {Promise<sql.IResult>}
 */
async function execute(query, params = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('SQL Server query error:', error);
    throw error;
  }
}

/**
 * Execute a query and return first row
 * @param {string} query - SQL query
 * @param {Object} params - Parameters
 * @returns {Promise<Object|null>}
 */
async function getOne(query, params = {}) {
  const result = await execute(query, params);
  return result.recordset[0] || null;
}

/**
 * Execute a query and return all rows
 * @param {string} query - SQL query
 * @param {Object} params - Parameters
 * @returns {Promise<Array>}
 */
async function getAll(query, params = {}) {
  const result = await execute(query, params);
  return result.recordset || [];
}

/**
 * Execute multiple queries in a transaction
 * Usage:
 *   const result = await database.transaction(async (request) => {
 *     const firm = await request.query('INSERT INTO firms ...; SELECT SCOPE_IDENTITY() AS id');
 *     const user = await request.query('INSERT INTO users ...');
 *     return { firm, user };
 *   });
 *
 * @param {Function} callback - Async function receiving a transaction-bound request factory
 * @returns {Promise} Result from callback
 */
async function transaction(callback) {
  const pool = await getPool();
  const txn = new sql.Transaction(pool);
  await txn.begin();

  try {
    // Provide a factory that creates transaction-bound requests
    const createRequest = () => new sql.Request(txn);
    const result = await callback(createRequest);
    await txn.commit();
    return result;
  } catch (error) {
    await txn.rollback();
    console.error('Transaction error:', error);
    throw error;
  }
}

/**
 * Close connection pool (for graceful shutdown)
 */
async function close() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('SQL Server connection pool closed');
  }
}

module.exports = {
  getPool,
  execute,
  getOne,
  getAll,
  transaction,
  close,
  sql // Export sql for advanced usage (e.g., transactions, typed params)
};
