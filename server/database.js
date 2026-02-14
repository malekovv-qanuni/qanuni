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
const sql = useWindowsAuth
  ? require('mssql/msnodesqlv8')
  : require('mssql');

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
  // SQL Server Authentication (production) via tedious
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  config.options.instanceName = 'SQLEXPRESS';
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
  close,
  sql // Export sql for advanced usage (e.g., transactions)
};
