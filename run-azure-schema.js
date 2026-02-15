/**
 * Run all schema SQL files against Azure SQL (or any configured SQL Server)
 * Executes in dependency order, splits on GO statements
 *
 * Usage: node run-azure-schema.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 60000,
  }
};

// Schema files in dependency order
const schemaFiles = [
  'schema.sql',            // firms, users (base tables)
  'schema-clients.sql',
  'schema-lawyers.sql',
  'schema-matters.sql',    // depends on clients
  'schema-hearings.sql',   // depends on matters
  'schema-diary.sql',      // depends on matters
  'schema-tasks.sql',      // depends on matters, lawyers
  'schema-judgments.sql',  // depends on matters
  'schema-deadlines.sql',  // depends on matters, judgments
  'schema-timesheets.sql', // depends on matters, lawyers
  'schema-expenses.sql',   // depends on matters, lawyers
  'schema-advances.sql',   // depends on clients, matters, lawyers
  'schema-invoices.sql',   // depends on clients, matters
  'schema-appointments.sql',
  'schema-conflict-check.sql',
  'schema-lookups.sql',
  'schema-settings.sql',
  'schema-corporate.sql',
];

async function runSchema() {
  let pool;
  try {
    console.log(`Connecting to ${process.env.DB_SERVER}/${process.env.DB_DATABASE}...`);
    pool = await sql.connect(config);
    console.log('Connected!\n');

    let totalBatches = 0;
    let totalFiles = 0;

    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, 'server', file);

      if (!fs.existsSync(filePath)) {
        console.log(`  SKIP: ${file} (not found)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Split on GO statements (case-insensitive, standalone line, multiline mode)
      const batches = content
        .split(/^\s*GO\s*$/gim)
        .map(b => b.trim())
        .filter(b => {
          // Remove empty batches and comment-only batches
          const withoutComments = b.replace(/--[^\n]*/g, '').trim();
          return withoutComments.length > 0;
        });

      console.log(`  Running ${file} (${batches.length} batch${batches.length !== 1 ? 'es' : ''})...`);

      for (let i = 0; i < batches.length; i++) {
        try {
          await pool.request().query(batches[i]);
        } catch (err) {
          console.error(`    ERROR in ${file} batch ${i + 1}: ${err.message}`);
          // Continue with next batch (some DROP TABLE may fail if table doesn't exist)
        }
      }

      totalBatches += batches.length;
      totalFiles++;
    }

    // Seed system currencies (firm_id=NULL, needed by settings/currencies endpoint)
    console.log('\n  Seeding system currencies...');
    const currencies = [
      { code: 'USD', name: 'US Dollar',     name_ar: '\u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A', symbol: '$', sort: 1 },
      { code: 'EUR', name: 'Euro',           name_ar: '\u064A\u0648\u0631\u0648', symbol: '\u20AC', sort: 2 },
      { code: 'LBP', name: 'Lebanese Pound', name_ar: '\u0644\u064A\u0631\u0629 \u0644\u0628\u0646\u0627\u0646\u064A\u0629', symbol: '\u0644.\u0644', sort: 3 },
      { code: 'GBP', name: 'British Pound',  name_ar: '\u062C\u0646\u064A\u0647 \u0625\u0633\u062A\u0631\u0644\u064A\u0646\u064A', symbol: '\u00A3', sort: 4 },
      { code: 'AED', name: 'UAE Dirham',     name_ar: '\u062F\u0631\u0647\u0645 \u0625\u0645\u0627\u0631\u0627\u062A\u064A', symbol: '\u062F.\u0625', sort: 5 },
      { code: 'SAR', name: 'Saudi Riyal',    name_ar: '\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A', symbol: '\u0631.\u0633', sort: 6 },
    ];
    const existing = await pool.request().query('SELECT COUNT(*) AS cnt FROM firm_currencies WHERE firm_id IS NULL');
    if (existing.recordset[0].cnt === 0) {
      for (const c of currencies) {
        await pool.request()
          .input('code', c.code).input('name', c.name).input('name_ar', c.name_ar)
          .input('symbol', c.symbol).input('sort_order', c.sort)
          .query('INSERT INTO firm_currencies (firm_id, code, name, name_ar, symbol, sort_order) VALUES (NULL, @code, @name, @name_ar, @symbol, @sort_order)');
      }
      console.log(`  Seeded ${currencies.length} system currencies`);
    } else {
      console.log(`  System currencies already exist (${existing.recordset[0].cnt} rows)`);
    }

    // Verify tables created
    const tables = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log(`\n========================================`);
    console.log(`Schema execution complete!`);
    console.log(`  Files processed: ${totalFiles}/${schemaFiles.length}`);
    console.log(`  SQL batches executed: ${totalBatches}`);
    console.log(`  Tables in database: ${tables.recordset.length}`);
    console.log(`========================================`);
    console.log(`\nTables:`);
    tables.recordset.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

runSchema();
