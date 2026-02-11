/**
 * Qanuni Performance Benchmark
 *
 * Measures query performance against production-scale data.
 * Replicates the exact SQL queries used by the app.
 *
 * Categories:
 *   1. Startup Queries (loadEssentialData - 8 queries, target < 3s total)
 *   2. Per-Module Data Loading (12 lazy loaders, target < 1s each)
 *   3. Common Operations (search, filter, joins, target < 300ms)
 *
 * Run: node benchmark-performance.js
 *
 * @version 1.0.0 (Session 10)
 */

const fs = require('fs');
const path = require('path');

// ==================== FORMATTING ====================

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function colorTime(ms, greenMax, yellowMax) {
  const display = ms.toFixed(1) + 'ms';
  if (ms <= greenMax) return `${GREEN}${display}${RESET}`;
  if (ms <= yellowMax) return `${YELLOW}${display}${RESET}`;
  return `${RED}${display}${RESET}`;
}

function statusIcon(ms, greenMax, yellowMax) {
  if (ms <= greenMax) return `${GREEN}\u2713${RESET}`;
  if (ms <= yellowMax) return `${YELLOW}\u26a0${RESET}`;
  return `${RED}\u2717${RESET}`;
}

function padRight(str, len) {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function formatRows(count) {
  return DIM + '(' + count + ' rows)' + RESET;
}

// ==================== BENCHMARK HELPERS ====================

function timeQuery(db, sql, params = []) {
  const start = process.hrtime.bigint();
  let result;
  try {
    result = db.exec(sql, params);
  } catch (e) {
    return { ms: 0, rows: 0, error: e.message };
  }
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  const rows = result.length > 0 ? result[0].values.length : 0;
  return { ms, rows };
}

function timeQueryOne(db, sql, params = []) {
  const start = process.hrtime.bigint();
  try {
    db.exec(sql, params);
  } catch (e) {
    return { ms: 0, error: e.message };
  }
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return { ms, rows: 1 };
}

function runBenchmark(label, fn, iterations = 3) {
  // Warmup
  fn();
  // Measured runs
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();
    times.push({ ms: Number(end - start) / 1_000_000, ...result });
  }
  const avgMs = times.reduce((sum, t) => sum + t.ms, 0) / times.length;
  const minMs = Math.min(...times.map(t => t.ms));
  return { label, avgMs, minMs, rows: times[0].rows || 0 };
}

// ==================== MAIN ====================

async function main() {
  console.log(`${BOLD}=== Qanuni Performance Benchmark ===${RESET}\n`);

  // 1. Load database
  const dbPath = path.join(__dirname, 'qanuni-web.db');
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found: ' + dbPath);
    process.exit(1);
  }

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const dbSize = (fileBuffer.length / 1024 / 1024).toFixed(1);
  const db = new SQL.Database(fileBuffer);
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Print data summary
  const tables = ['clients', 'lawyers', 'matters', 'hearings', 'tasks', 'timesheets', 'expenses', 'advances', 'invoices', 'appointments', 'deadlines'];
  let totalRows = 0;
  const counts = {};
  for (const t of tables) {
    const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
    counts[t] = r[0].values[0][0];
    totalRows += counts[t];
  }
  console.log(`${DIM}Database: ${dbSize} MB | ${totalRows} total records${RESET}`);
  console.log(`${DIM}${tables.map(t => `${t}: ${counts[t]}`).join(' | ')}${RESET}\n`);

  const allResults = [];
  let sectionTotal = 0;

  // ============================================================
  // SECTION 1: Startup Queries (loadEssentialData)
  // Target: < 3 seconds total for all 8 queries
  // ============================================================
  console.log(`${BOLD}[1] Startup Queries (loadEssentialData)${RESET}`);
  console.log(`${DIM}Target: < 3000ms total (all 8 queries combined)${RESET}\n`);

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = today.substring(0, 7) + '-01';

  const startupQueries = [
    { name: 'getCourtTypes', sql: 'SELECT * FROM lookup_court_types WHERE active = 1 ORDER BY sort_order' },
    { name: 'getRegions', sql: 'SELECT * FROM lookup_regions WHERE active = 1 ORDER BY sort_order' },
    { name: 'getHearingPurposes', sql: 'SELECT * FROM lookup_hearing_purposes WHERE active = 1 ORDER BY sort_order' },
    { name: 'getTaskTypes', sql: 'SELECT * FROM lookup_task_types WHERE active = 1 ORDER BY sort_order' },
    { name: 'getExpenseCategories', sql: 'SELECT * FROM lookup_expense_categories WHERE active = 1 ORDER BY sort_order' },
    { name: 'getEntityTypes', sql: 'SELECT * FROM lookup_entity_types WHERE active = 1 ORDER BY sort_order' },
    { name: 'getLawyers', sql: "SELECT lawyer_id, name as full_name, name_arabic as full_name_arabic, initials, email, phone, hourly_rate, hourly_rate_currency, active FROM lawyers WHERE active = 1 ORDER BY name" },
    {
      name: 'getDashboardStats',
      fn: () => {
        const r1 = timeQueryOne(db, "SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
        const r2 = timeQueryOne(db, "SELECT COUNT(*) as count FROM clients WHERE active = 1");
        const r3 = timeQueryOne(db, "SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
        const r4 = timeQueryOne(db, "SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
        const r5 = timeQueryOne(db, `SELECT COUNT(*) as count FROM hearings h LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id WHERE h.hearing_date >= ? AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement') AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')`, [today]);
        const r6 = timeQueryOne(db, "SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'cancelled') AND due_date < ?", [today]);
        const r7 = timeQueryOne(db, "SELECT SUM(total) as amount FROM invoices WHERE status NOT IN ('paid', 'cancelled', 'written_off')");
        const r8 = timeQueryOne(db, "SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");
        const r9 = timeQueryOne(db, `SELECT COALESCE(SUM(amount), 0) as total FROM advances WHERE date_received >= ? AND status IN ('active', 'depleted') AND (advance_type = 'client_retainer' OR advance_type LIKE 'fee_payment%')`, [firstDayOfMonth]);
        const r10 = timeQueryOne(db, `SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid' AND paid_date >= ?`, [firstDayOfMonth]);
        return { ms: r1.ms + r2.ms + r3.ms + r4.ms + r5.ms + r6.ms + r7.ms + r8.ms + r9.ms + r10.ms, rows: 10 };
      }
    },
  ];

  sectionTotal = 0;
  for (const q of startupQueries) {
    let result;
    if (q.fn) {
      result = runBenchmark(q.name, q.fn);
    } else {
      result = runBenchmark(q.name, () => timeQuery(db, q.sql));
    }
    const icon = statusIcon(result.avgMs, 100, 500);
    console.log(`  ${icon} ${padRight(result.label, 28)} ${colorTime(result.avgMs, 100, 500)}  ${formatRows(result.rows)}`);
    sectionTotal += result.avgMs;
    allResults.push({ section: 'startup', ...result });
  }
  const startupIcon = statusIcon(sectionTotal, 3000, 5000);
  console.log(`\n  ${startupIcon} ${BOLD}Startup Total: ${colorTime(sectionTotal, 3000, 5000)}${RESET}  (target: < 3000ms)\n`);

  // ============================================================
  // SECTION 2: Per-Module Data Loading (12 lazy loaders)
  // Target: < 1000ms each
  // ============================================================
  console.log(`${BOLD}[2] Per-Module Data Loading (lazy loaders)${RESET}`);
  console.log(`${DIM}Target: < 1000ms each${RESET}\n`);

  const moduleQueries = [
    {
      name: 'loadClientsData',
      sql: 'SELECT * FROM clients WHERE active = 1 ORDER BY client_name'
    },
    {
      name: 'loadMattersData',
      sql: `SELECT m.*, c.client_name, c.client_name_arabic as client_name_ar,
        lc.name_en as court_name, lc.name_ar as court_name_ar,
        lr.name_en as region_name, lr.name_ar as region_name_ar,
        pm.matter_name as parent_matter_name, pm.case_number as parent_case_number
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN lookup_court_types lc ON m.court_type_id = lc.court_type_id
        LEFT JOIN lookup_regions lr ON m.court_region_id = lr.region_id
        LEFT JOIN matters pm ON m.parent_matter_id = pm.matter_id
        WHERE m.deleted_at IS NULL
        ORDER BY m.created_at DESC`
    },
    {
      name: 'loadHearingsData',
      sql: `SELECT h.*, m.matter_name, m.client_id, c.client_name,
        lc.name_en as court_name, lc.name_ar as court_name_ar,
        lr.name_en as region_name, lr.name_ar as region_name_ar,
        lp.name_en as purpose_name, lp.name_ar as purpose_name_ar
        FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN lookup_court_types lc ON h.court_type_id = lc.court_type_id
        LEFT JOIN lookup_regions lr ON h.court_region_id = lr.region_id
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.deleted_at IS NULL
        ORDER BY h.hearing_date DESC`
    },
    {
      name: 'loadJudgmentsData',
      sql: `SELECT j.*, m.matter_name, c.client_name FROM judgments j
        LEFT JOIN matters m ON j.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE j.deleted_at IS NULL ORDER BY j.expected_date DESC`
    },
    {
      name: 'loadTasksData',
      sql: `SELECT t.*, m.matter_name, c.client_name, lt.name_en as task_type_name, lt.icon as task_type_icon,
        l.name as assigned_lawyer_name
        FROM tasks t LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN lookup_task_types lt ON t.task_type_id = lt.task_type_id
        LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.due_date ASC`
    },
    {
      name: 'loadTimesheetsData',
      sql: `SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
        FROM timesheets t LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.date DESC`
    },
    {
      name: 'loadAppointmentsData',
      sql: `SELECT a.*, c.client_name, m.matter_name FROM appointments a
        LEFT JOIN clients c ON a.client_id = c.client_id
        LEFT JOIN matters m ON a.matter_id = m.matter_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.date DESC`
    },
    {
      name: 'loadExpensesData',
      sql: `SELECT e.*, c.client_name, m.matter_name,
        lec.name_en as category_name, lec.name_ar as category_name_ar
        FROM expenses e LEFT JOIN clients c ON e.client_id = c.client_id
        LEFT JOIN matters m ON e.matter_id = m.matter_id
        LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
        WHERE e.deleted_at IS NULL
        ORDER BY e.date DESC`
    },
    {
      name: 'loadAdvancesData',
      sql: `SELECT a.*, c.client_name, m.matter_name, l.name as lawyer_name
        FROM advances a
        LEFT JOIN clients c ON a.client_id = c.client_id
        LEFT JOIN matters m ON a.matter_id = m.matter_id
        LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.date_received DESC`
    },
    {
      name: 'loadInvoicesData',
      sql: `SELECT i.*, c.client_name, m.matter_name FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.client_id
        LEFT JOIN matters m ON i.matter_id = m.matter_id
        WHERE i.deleted_at IS NULL
        ORDER BY i.issue_date DESC`
    },
    {
      name: 'loadDeadlinesData',
      sql: `SELECT d.*, m.matter_name, c.client_name, j.judgment_type, j.appeal_deadline as judgment_appeal_deadline
        FROM deadlines d
        LEFT JOIN matters m ON d.matter_id = m.matter_id
        LEFT JOIN clients c ON d.client_id = c.client_id
        LEFT JOIN judgments j ON d.judgment_id = j.judgment_id
        WHERE d.deleted_at IS NULL
        ORDER BY d.deadline_date ASC`
    },
    {
      name: 'loadCorporateData',
      sql: `SELECT c.client_id, c.client_name, c.client_name_arabic, c.client_type, c.entity_type,
        c.email, c.phone, ce.entity_id, ce.registration_number, ce.registration_date,
        ce.registered_address, ce.share_capital, ce.share_capital_currency, ce.total_shares,
        ce.fiscal_year_end, ce.tax_id, ce.commercial_register, ce.status as corporate_status,
        ce.notes as corporate_notes,
        CASE WHEN ce.entity_id IS NOT NULL THEN 1 ELSE 0 END as has_corporate_details,
        let.name_en as entity_type_name, let.name_ar as entity_type_name_ar
        FROM clients c
        LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id
        LEFT JOIN lookup_entity_types let ON c.entity_type = let.code
        WHERE c.client_type = 'legal_entity' AND c.deleted_at IS NULL`
    },
  ];

  let moduleMax = 0;
  for (const q of moduleQueries) {
    const result = runBenchmark(q.name, () => timeQuery(db, q.sql));
    const icon = statusIcon(result.avgMs, 500, 1000);
    console.log(`  ${icon} ${padRight(result.label, 28)} ${colorTime(result.avgMs, 500, 1000)}  ${formatRows(result.rows)}`);
    if (result.avgMs > moduleMax) moduleMax = result.avgMs;
    allResults.push({ section: 'module', ...result });
  }
  const moduleIcon = statusIcon(moduleMax, 500, 1000);
  console.log(`\n  ${moduleIcon} ${BOLD}Slowest Module: ${colorTime(moduleMax, 500, 1000)}${RESET}  (target: < 1000ms)\n`);

  // ============================================================
  // SECTION 3: Common Operations
  // Target: < 300ms each
  // ============================================================
  console.log(`${BOLD}[3] Common Operations${RESET}`);
  console.log(`${DIM}Target: < 300ms each${RESET}\n`);

  const commonQueries = [
    {
      name: 'Client search (LIKE)',
      sql: "SELECT * FROM clients WHERE client_name LIKE '%Khoury%' AND active = 1 ORDER BY client_name"
    },
    {
      name: 'Matter search (LIKE)',
      sql: "SELECT m.*, c.client_name FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id WHERE m.matter_name LIKE '%Breach%' AND m.deleted_at IS NULL"
    },
    {
      name: 'Timesheets by lawyer',
      sql: `SELECT t.*, c.client_name, m.matter_name FROM timesheets t
        LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        WHERE t.lawyer_id = (SELECT lawyer_id FROM lawyers LIMIT 1)
        AND t.deleted_at IS NULL ORDER BY t.date DESC`
    },
    {
      name: 'Matters by client',
      sql: `SELECT m.*, c.client_name FROM matters m
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE m.client_id = (SELECT client_id FROM clients LIMIT 1)
        AND m.deleted_at IS NULL ORDER BY m.created_at DESC`
    },
    {
      name: 'Unbilled time (filtered)',
      sql: `SELECT * FROM timesheets WHERE status != 'billed' AND billable = 1 AND deleted_at IS NULL ORDER BY date ASC`
    },
    {
      name: 'Unbilled expenses (filtered)',
      sql: `SELECT e.*, lec.name_en as category_name FROM expenses e
        LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
        WHERE (e.status IS NULL OR e.status = 'pending' OR e.status = 'approved')
        AND e.status != 'billed' AND e.billable = 1 AND e.deleted_at IS NULL`
    },
    {
      name: 'Pending invoices (top 10)',
      sql: `SELECT i.invoice_id, i.invoice_number, i.client_id, i.total, i.currency, i.status,
        i.issue_date, i.due_date, c.client_name
        FROM invoices i LEFT JOIN clients c ON i.client_id = c.client_id
        WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue') AND i.deleted_at IS NULL
        ORDER BY i.due_date ASC LIMIT 10`
    },
    {
      name: 'Hearings this month',
      sql: `SELECT h.*, m.matter_name, c.client_name FROM hearings h
        LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE h.hearing_date >= ? AND h.hearing_date <= ?
        AND h.deleted_at IS NULL ORDER BY h.hearing_date ASC`,
      params: [firstDayOfMonth, today]
    },
    {
      name: 'Overdue deadlines',
      sql: `SELECT d.*, m.matter_name, c.client_name FROM deadlines d
        LEFT JOIN matters m ON d.matter_id = m.matter_id
        LEFT JOIN clients c ON d.client_id = c.client_id
        WHERE d.status = 'pending' AND d.deadline_date < ?
        AND d.deleted_at IS NULL ORDER BY d.deadline_date ASC`,
      params: [today]
    },
    {
      name: 'Conflict check (name)',
      sql: `SELECT c.client_id, c.client_name, m.matter_id, m.matter_name, m.adverse_parties
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE (c.client_name LIKE '%Hassan%' OR m.adverse_parties LIKE '%Hassan%')
        AND m.deleted_at IS NULL`
    },
  ];

  for (const q of commonQueries) {
    const result = runBenchmark(q.name, () => timeQuery(db, q.sql, q.params || []));
    const icon = statusIcon(result.avgMs, 100, 300);
    console.log(`  ${icon} ${padRight(result.label, 28)} ${colorTime(result.avgMs, 100, 300)}  ${formatRows(result.rows)}`);
    allResults.push({ section: 'common', ...result });
  }
  console.log('');

  // ============================================================
  // SECTION 4: Memory Estimates
  // ============================================================
  console.log(`${BOLD}[4] Memory Estimates${RESET}\n`);

  // Rough estimate: each row ~500 bytes in JS objects
  const bytesPerRow = 500;
  const moduleResults = allResults.filter(r => r.section === 'module');
  let totalMemory = 0;
  for (const r of moduleResults) {
    const memMB = (r.rows * bytesPerRow / 1024 / 1024).toFixed(1);
    totalMemory += r.rows * bytesPerRow;
    console.log(`  ${padRight(r.label, 28)} ${r.rows} rows  ~${memMB} MB`);
  }
  const totalMemMB = (totalMemory / 1024 / 1024).toFixed(1);
  console.log(`\n  ${BOLD}Total in-memory (all modules): ~${totalMemMB} MB${RESET}`);
  console.log(`  ${DIM}(On-demand loading means only active module is loaded at once)${RESET}\n`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}SUMMARY${RESET}\n`);

  const startupResults = allResults.filter(r => r.section === 'startup');
  const startupTotalMs = startupResults.reduce((sum, r) => sum + r.avgMs, 0);
  const moduleSlowest = Math.max(...moduleResults.map(r => r.avgMs));
  const commonResults = allResults.filter(r => r.section === 'common');
  const commonSlowest = Math.max(...commonResults.map(r => r.avgMs));

  const s1 = statusIcon(startupTotalMs, 3000, 5000);
  const s2 = statusIcon(moduleSlowest, 500, 1000);
  const s3 = statusIcon(commonSlowest, 100, 300);

  console.log(`  ${s1} Startup (8 queries):      ${colorTime(startupTotalMs, 3000, 5000)}  ${DIM}target < 3000ms${RESET}`);
  console.log(`  ${s2} Module loading (slowest):  ${colorTime(moduleSlowest, 500, 1000)}  ${DIM}target < 1000ms${RESET}`);
  console.log(`  ${s3} Common ops (slowest):      ${colorTime(commonSlowest, 100, 300)}  ${DIM}target < 300ms${RESET}`);
  console.log(`  ${DIM}  Database: ${dbSize} MB | ${totalRows} records | In-memory: ~${totalMemMB} MB${RESET}`);

  // Pass/fail
  const allPassed = startupTotalMs < 3000 && moduleSlowest < 1000 && commonSlowest < 300;
  if (allPassed) {
    console.log(`\n  ${GREEN}${BOLD}ALL TARGETS MET${RESET}`);
  } else {
    console.log(`\n  ${RED}${BOLD}SOME TARGETS EXCEEDED — see above for details${RESET}`);
  }
  console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);

  db.close();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
