/**
 * Qanuni UI Responsiveness Test
 *
 * Simulates actual user workflows against production-scale data.
 * Unlike the benchmark (isolated queries), this tests sequential
 * workflows that mirror real usage patterns.
 *
 * Workflows:
 *   1. App Startup Simulation (target < 100ms)
 *   2. Module Navigation - all 12 modules (target < 2000ms cumulative)
 *   3. Heavy Workflow - multi-step user task (target < 500ms)
 *   4. Stress Test - rapid module switching x10 (target: no degradation)
 *
 * Run: node test-ui-performance.js
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

function icon(pass) {
  return pass ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
}

// ==================== QUERY RUNNER ====================

function query(db, sql, params = []) {
  const result = db.exec(sql, params);
  return result.length > 0 ? result[0].values : [];
}

function queryOne(db, sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const obj = {};
  cols.forEach((c, i) => { obj[c] = vals[i]; });
  return obj;
}

function timeBlock(fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  return { ms, result };
}

// ==================== MODULE QUERIES (exact app SQL) ====================

const today = new Date().toISOString().split('T')[0];
const firstDayOfMonth = today.substring(0, 7) + '-01';

function loadEssentialData(db) {
  query(db, 'SELECT * FROM lookup_court_types WHERE active = 1 ORDER BY sort_order');
  query(db, 'SELECT * FROM lookup_regions WHERE active = 1 ORDER BY sort_order');
  query(db, 'SELECT * FROM lookup_hearing_purposes WHERE active = 1 ORDER BY sort_order');
  query(db, 'SELECT * FROM lookup_task_types WHERE active = 1 ORDER BY sort_order');
  query(db, 'SELECT * FROM lookup_expense_categories WHERE active = 1 ORDER BY sort_order');
  query(db, 'SELECT * FROM lookup_entity_types WHERE active = 1 ORDER BY sort_order');
  query(db, "SELECT lawyer_id, name as full_name, initials, email, phone, hourly_rate, hourly_rate_currency, active FROM lawyers WHERE active = 1 ORDER BY name");
  // Dashboard stats (10 sub-queries)
  queryOne(db, "SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
  queryOne(db, "SELECT COUNT(*) as count FROM clients WHERE active = 1");
  queryOne(db, "SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
  queryOne(db, "SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
  queryOne(db, `SELECT COUNT(*) as count FROM hearings h LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id WHERE h.hearing_date >= ? AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')`, [today]);
  queryOne(db, "SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'cancelled') AND due_date < ?", [today]);
  queryOne(db, "SELECT SUM(total) as amount FROM invoices WHERE status NOT IN ('paid', 'cancelled', 'written_off')");
  queryOne(db, "SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");
  queryOne(db, `SELECT COALESCE(SUM(amount), 0) as total FROM advances WHERE date_received >= ? AND status IN ('active', 'depleted') AND (advance_type = 'client_retainer' OR advance_type LIKE 'fee_payment%')`, [firstDayOfMonth]);
  queryOne(db, `SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid' AND paid_date >= ?`, [firstDayOfMonth]);
}

const moduleLoaders = {
  dashboard: (db) => {
    // Dashboard reloads stats
    queryOne(db, "SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
    queryOne(db, "SELECT COUNT(*) as count FROM clients WHERE active = 1");
    queryOne(db, "SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
    queryOne(db, "SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
  },
  clients: (db) => {
    query(db, 'SELECT * FROM clients WHERE active = 1 ORDER BY client_name');
  },
  matters: (db) => {
    query(db, `SELECT m.*, c.client_name, c.client_name_arabic as client_name_ar,
      lc.name_en as court_name, lr.name_en as region_name,
      pm.matter_name as parent_matter_name
      FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
      LEFT JOIN lookup_court_types lc ON m.court_type_id = lc.court_type_id
      LEFT JOIN lookup_regions lr ON m.court_region_id = lr.region_id
      LEFT JOIN matters pm ON m.parent_matter_id = pm.matter_id
      WHERE m.deleted_at IS NULL ORDER BY m.created_at DESC`);
  },
  hearings: (db) => {
    query(db, `SELECT h.*, m.matter_name, m.client_id, c.client_name,
      lc.name_en as court_name, lr.name_en as region_name, lp.name_en as purpose_name
      FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
      LEFT JOIN clients c ON m.client_id = c.client_id
      LEFT JOIN lookup_court_types lc ON h.court_type_id = lc.court_type_id
      LEFT JOIN lookup_regions lr ON h.court_region_id = lr.region_id
      LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
      WHERE h.deleted_at IS NULL ORDER BY h.hearing_date DESC`);
  },
  judgments: (db) => {
    query(db, `SELECT j.*, m.matter_name, c.client_name FROM judgments j
      LEFT JOIN matters m ON j.matter_id = m.matter_id
      LEFT JOIN clients c ON m.client_id = c.client_id
      WHERE j.deleted_at IS NULL ORDER BY j.expected_date DESC`);
  },
  tasks: (db) => {
    query(db, `SELECT t.*, m.matter_name, c.client_name, lt.name_en as task_type_name,
      l.name as assigned_lawyer_name
      FROM tasks t LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN clients c ON t.client_id = c.client_id
      LEFT JOIN lookup_task_types lt ON t.task_type_id = lt.task_type_id
      LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
      WHERE t.deleted_at IS NULL ORDER BY t.due_date ASC`);
  },
  timesheets: (db) => {
    query(db, `SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
      FROM timesheets t LEFT JOIN clients c ON t.client_id = c.client_id
      LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
      WHERE t.deleted_at IS NULL ORDER BY t.date DESC`);
  },
  expenses: (db) => {
    query(db, `SELECT e.*, c.client_name, m.matter_name, lec.name_en as category_name
      FROM expenses e LEFT JOIN clients c ON e.client_id = c.client_id
      LEFT JOIN matters m ON e.matter_id = m.matter_id
      LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
      WHERE e.deleted_at IS NULL ORDER BY e.date DESC`);
  },
  advances: (db) => {
    query(db, `SELECT a.*, c.client_name, m.matter_name, l.name as lawyer_name
      FROM advances a LEFT JOIN clients c ON a.client_id = c.client_id
      LEFT JOIN matters m ON a.matter_id = m.matter_id
      LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
      WHERE a.deleted_at IS NULL ORDER BY a.date_received DESC`);
  },
  invoices: (db) => {
    query(db, `SELECT i.*, c.client_name, m.matter_name FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.client_id
      LEFT JOIN matters m ON i.matter_id = m.matter_id
      WHERE i.deleted_at IS NULL ORDER BY i.issue_date DESC`);
  },
  deadlines: (db) => {
    query(db, `SELECT d.*, m.matter_name, c.client_name
      FROM deadlines d LEFT JOIN matters m ON d.matter_id = m.matter_id
      LEFT JOIN clients c ON d.client_id = c.client_id
      WHERE d.deleted_at IS NULL ORDER BY d.deadline_date ASC`);
  },
  corporate: (db) => {
    query(db, `SELECT c.client_id, c.client_name, c.entity_type, ce.entity_id,
      ce.registration_number, ce.share_capital, ce.status as corporate_status,
      let.name_en as entity_type_name
      FROM clients c LEFT JOIN corporate_entities ce ON c.client_id = ce.client_id
      LEFT JOIN lookup_entity_types let ON c.entity_type = let.code
      WHERE c.client_type = 'legal_entity' AND c.deleted_at IS NULL`);
  },
};

// ==================== MAIN ====================

async function main() {
  console.log(`${BOLD}=== Qanuni UI Responsiveness Test ===${RESET}\n`);

  const dbPath = path.join(__dirname, 'qanuni-web.db');
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found: ' + dbPath);
    process.exit(1);
  }

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  let passed = 0;
  let failed = 0;

  // ============================================================
  // WORKFLOW 1: App Startup Simulation
  // ============================================================
  console.log(`${BOLD}[1] App Startup Simulation${RESET}`);
  console.log(`${DIM}Simulates: User opens app → loadEssentialData fires${RESET}`);
  console.log(`${DIM}Target: < 100ms${RESET}\n`);

  const startup = timeBlock(() => loadEssentialData(db));
  const s1Pass = startup.ms < 100;
  s1Pass ? passed++ : failed++;
  console.log(`  ${icon(s1Pass)} Essential data loaded in ${colorTime(startup.ms, 50, 100)}`);
  console.log(`  ${DIM}(6 lookups + lawyers + 10 dashboard stats queries)${RESET}\n`);

  // ============================================================
  // WORKFLOW 2: Module Navigation (all 12 modules)
  // ============================================================
  console.log(`${BOLD}[2] Module Navigation - All 12 Modules${RESET}`);
  console.log(`${DIM}Simulates: User clicks through every module in sidebar${RESET}`);
  console.log(`${DIM}Target: < 2000ms cumulative${RESET}\n`);

  let navTotal = 0;
  const moduleNames = Object.keys(moduleLoaders);
  for (const mod of moduleNames) {
    const t = timeBlock(() => moduleLoaders[mod](db));
    navTotal += t.ms;
    const modIcon = t.ms < 200 ? `${GREEN}\u2713${RESET}` : t.ms < 500 ? `${YELLOW}\u26a0${RESET}` : `${RED}\u2717${RESET}`;
    console.log(`  ${modIcon} ${mod.padEnd(16)} ${colorTime(t.ms, 200, 500)}`);
  }
  const s2Pass = navTotal < 2000;
  s2Pass ? passed++ : failed++;
  console.log(`\n  ${icon(s2Pass)} All 12 modules: ${colorTime(navTotal, 1000, 2000)} cumulative\n`);

  // ============================================================
  // WORKFLOW 3: Heavy Workflow (multi-step user task)
  // ============================================================
  console.log(`${BOLD}[3] Heavy Workflow - Client to Timesheet Report${RESET}`);
  console.log(`${DIM}Simulates: Search client → open matters → view hearings → get timesheets${RESET}`);
  console.log(`${DIM}Target: < 500ms total${RESET}\n`);

  const workflow = timeBlock(() => {
    // Step 1: Search clients
    const clients = query(db, "SELECT * FROM clients WHERE client_name LIKE '%Khoury%' AND active = 1");
    const clientId = clients.length > 0 ? clients[0][0] : null; // client_id is first column

    // Step 2: Load matters for that client
    const matters = clientId
      ? query(db, `SELECT m.*, c.client_name FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id WHERE m.client_id = ? AND m.deleted_at IS NULL ORDER BY m.created_at DESC`, [clientId])
      : [];
    const matterId = matters.length > 0 ? matters[0][0] : null; // matter_id is first column

    // Step 3: Load hearings for that matter
    const hearings = matterId
      ? query(db, `SELECT h.*, m.matter_name FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id WHERE h.matter_id = ? AND h.deleted_at IS NULL ORDER BY h.hearing_date DESC`, [matterId])
      : [];

    // Step 4: Load timesheets for that matter
    const timesheets = matterId
      ? query(db, `SELECT t.*, l.name as lawyer_name FROM timesheets t LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id WHERE t.matter_id = ? AND t.deleted_at IS NULL ORDER BY t.date DESC`, [matterId])
      : [];

    // Step 5: Aggregate timesheet totals (report generation)
    const report = matterId
      ? queryOne(db, `SELECT COUNT(*) as entries, SUM(minutes) as total_minutes, SUM(CASE WHEN billable = 1 THEN minutes * rate_per_hour / 60.0 ELSE 0 END) as total_value FROM timesheets WHERE matter_id = ? AND deleted_at IS NULL`, [matterId])
      : null;

    return {
      clientsFound: clients.length,
      mattersFound: matters.length,
      hearingsFound: hearings.length,
      timesheetsFound: timesheets.length,
      report,
    };
  });

  const s3Pass = workflow.ms < 500;
  s3Pass ? passed++ : failed++;
  const wf = workflow.result;
  console.log(`  Step 1: Search clients          → ${wf.clientsFound} found`);
  console.log(`  Step 2: Load client matters      → ${wf.mattersFound} matters`);
  console.log(`  Step 3: Load matter hearings     → ${wf.hearingsFound} hearings`);
  console.log(`  Step 4: Load matter timesheets   → ${wf.timesheetsFound} timesheets`);
  console.log(`  Step 5: Aggregate report         → ${wf.report ? wf.report.entries + ' entries' : 'n/a'}`);
  console.log(`\n  ${icon(s3Pass)} Total workflow: ${colorTime(workflow.ms, 200, 500)}\n`);

  // ============================================================
  // WORKFLOW 4: Stress Test - Rapid Navigation
  // ============================================================
  console.log(`${BOLD}[4] Stress Test - Rapid Module Switching (x10)${RESET}`);
  console.log(`${DIM}Simulates: User rapidly clicks sidebar modules${RESET}`);
  console.log(`${DIM}Target: No degradation (last switch as fast as first)${RESET}\n`);

  const switchPattern = [
    'dashboard', 'clients', 'matters', 'timesheets', 'dashboard',
    'hearings', 'expenses', 'invoices', 'tasks', 'dashboard',
  ];

  const switchTimes = [];
  for (let i = 0; i < switchPattern.length; i++) {
    const mod = switchPattern[i];
    const t = timeBlock(() => moduleLoaders[mod](db));
    switchTimes.push({ mod, ms: t.ms });
    console.log(`  Switch ${String(i + 1).padStart(2)}: → ${mod.padEnd(16)} ${colorTime(t.ms, 100, 300)}`);
  }

  const firstHalf = switchTimes.slice(0, 5).reduce((s, t) => s + t.ms, 0) / 5;
  const secondHalf = switchTimes.slice(5).reduce((s, t) => s + t.ms, 0) / 5;
  const degradation = secondHalf / firstHalf;
  const s4Pass = degradation < 1.5; // less than 50% slower
  s4Pass ? passed++ : failed++;

  console.log(`\n  Avg first 5:  ${firstHalf.toFixed(1)}ms`);
  console.log(`  Avg last 5:   ${secondHalf.toFixed(1)}ms`);
  console.log(`  Degradation:  ${degradation.toFixed(2)}x ${degradation < 1.2 ? GREEN + '(none)' : degradation < 1.5 ? YELLOW + '(minor)' : RED + '(significant)'}${RESET}`);
  console.log(`  ${icon(s4Pass)} ${s4Pass ? 'No degradation detected' : 'Performance degraded over repeated access'}\n`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`${BOLD}${'='.repeat(56)}${RESET}`);
  console.log(`${BOLD}RESULTS: ${passed}/${passed + failed} workflows passed${RESET}\n`);
  console.log(`  ${icon(s1Pass)} Startup:           ${colorTime(startup.ms, 50, 100).padEnd(30)} ${DIM}< 100ms${RESET}`);
  console.log(`  ${icon(s2Pass)} Module navigation:  ${colorTime(navTotal, 1000, 2000).padEnd(30)} ${DIM}< 2000ms${RESET}`);
  console.log(`  ${icon(s3Pass)} Heavy workflow:     ${colorTime(workflow.ms, 200, 500).padEnd(30)} ${DIM}< 500ms${RESET}`);
  console.log(`  ${icon(s4Pass)} Stress test:        ${(degradation.toFixed(2) + 'x degradation').padEnd(20)} ${DIM}< 1.5x${RESET}`);

  if (passed === passed + failed) {
    console.log(`\n  ${GREEN}${BOLD}ALL WORKFLOWS PASSED${RESET}`);
  } else {
    console.log(`\n  ${RED}${BOLD}${failed} WORKFLOW(S) FAILED${RESET}`);
  }
  console.log(`\n${BOLD}${'='.repeat(56)}${RESET}`);

  db.close();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
