# Qanuni Hardening Strategy: From Project to Product

## What I Found (The Honest Assessment)

After auditing `main.js` (6,791 lines) and `App.js` (1,867 lines), here are the real problems that would stop a law firm from trusting this software with their practice:

### 1. DATA LOSS RISK — The Biggest Problem

**Debounced database saves (line 37-43 of main.js):**
Every database write goes through a 500ms debounce. If the app crashes, loses power, or the user force-closes within that window, the last operation is **silently lost**. For a lawyer who just entered 30 minutes of time entries or a critical hearing date, this is unacceptable.

**`runQuery` silently swallows errors (line 1259-1275):**
```javascript
function runQuery(sql, params = []) {
  try {
    // ... query logic
  } catch (error) {
    console.error('Query error:', sql, error);
    return [];  // ← Silent failure. UI shows "no data" instead of "something broke"
  }
}
```
If a query fails, the app shows empty lists. The user thinks they have no hearings. They actually have hearings — the query just failed. They miss a court date.

**`saveDatabase` writes directly with no safety net (line 692-698):**
```javascript
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);  // ← If this crashes mid-write, DB is corrupted
}
```
No write-ahead log. No temp file + rename. No integrity check. A power outage during a write corrupts the entire database permanently.

### 2. ID COLLISIONS — Will Break at Scale

```javascript
function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
}
```

Only 10,000 possible IDs per entity type per year. With 200 clients, there's a ~87% chance of at least one collision by year-end (birthday problem). A collision means a silent INSERT failure — data the user entered simply vanishes.

### 3. NO ERROR BOUNDARIES — One Bug Kills Everything

Zero React error boundaries in the entire app. If any component throws (a null reference, a bad date format, a missing translation key), the entire application white-screens. The user sees nothing. No recovery. They restart the app and pray their data is intact.

### 4. NO BACKEND VALIDATION — Trusting the Frontend Completely

161 IPC handlers. Only 35 have try/catch. Zero validate input data. The backend trusts that `client_name` exists, that `hearing_date` is a valid date, that `amount` is a number. Any bug in any form can write garbage to the database.

### 5. ALL DATA LOADED INTO MEMORY AT STARTUP

```javascript
const [clientsData, mattersData, hearingsData, ...] = await Promise.all([
  // 18 parallel queries loading EVERYTHING
]);
```

Every client, every matter, every hearing, every timesheet — all loaded into React state on startup. At 500+ matters with 5,000+ timesheets, this will cause:
- Slow startup (seconds)
- High memory usage
- Every CRUD operation re-renders the entire tree

### 6. APP.JS IS STILL A GOD COMPONENT

70+ `useState` calls. Every form's visibility, every editing state, every filter, every pagination cursor — all in one component. Every state change re-renders the sidebar, the header, every list, every form. This is why the app feels sluggish with real data.

### 7. MAIN.JS IS AN UNMAINTAINABLE MONOLITH

6,791 lines. Schema definitions, migrations, seed data, 161 IPC handlers, backup system, licensing, Excel import/export, PDF generation, report queries — all in one file. Adding a column means scrolling through thousands of lines. Finding a bug means searching the entire file.

### 8. NO LOGGING SYSTEM

Everything goes to `console.log` which disappears when the app closes. When a lawyer calls and says "my hearing from yesterday is gone," you have zero way to investigate what happened.

### 9. NO MIGRATION VERSIONING

Migrations run on every startup. No version tracking. No way to know which migrations have already been applied vs which need to run. Adding a column that already exists silently fails. Missing a column silently breaks queries.

---

## The Strategy: Clean Rewrite by Layer

Not a rewrite-from-scratch. A **systematic rebuild** where we take the working business logic and put it into a professional architecture — one layer at a time, tested at each step.

### Phase 1: BULLETPROOF THE DATA LAYER (Priority: CRITICAL)
**Goal:** No data loss, no corruption, no silent failures  
**Timeline:** 2-3 sessions  
**Risk if skipped:** Users lose data, lose trust, never come back

#### 1A. Safe Database Writes
- Write to temp file, then atomic rename (prevents corruption on crash)
- Immediate save after every write (remove debounce for data operations, keep for UI preferences)
- WAL mode for SQLite (write-ahead logging)
- Verify write success before returning to frontend

#### 1B. Proper ID Generation
- Replace `Math.random() * 10000` with UUID v4 or timestamp + crypto random
- Format: `CLT-2026-a7f3b9c1` (prefix + year + 8-char hex from crypto)
- Zero collision probability

#### 1C. Backend Validation
- Every IPC handler validates required fields before touching DB
- Return structured errors: `{ success: false, error: 'client_name is required', field: 'client_name' }`
- Type checking: dates are dates, numbers are numbers, IDs exist in referenced tables

#### 1D. Error Propagation (Not Swallowing)
- `runQuery` throws on error instead of returning `[]`
- Every IPC handler has try/catch with meaningful error messages
- Frontend receives errors and shows them (not silent empty lists)

#### 1E. Transaction Support
- Multi-step operations (invoice + invoice_items, matter + appeal) wrapped in BEGIN/COMMIT
- If any step fails, ROLLBACK — no partial writes

### Phase 2: RESTRUCTURE MAIN.JS (Priority: HIGH)
**Goal:** Maintainable, testable backend  
**Timeline:** 2-3 sessions  
**Risk if skipped:** Every change is risky, bugs hide in 7,000 lines

Split into focused modules:
```
electron/
├── main.js              # ~100 lines: window creation, app lifecycle
├── database.js           # Connection, safe writes, transactions, migrations
├── migrations.js         # Versioned, trackable migrations
├── seed-data.js          # Lookup data seeding
├── ipc/
│   ├── clients.js        # Client CRUD handlers
│   ├── matters.js        # Matter CRUD handlers
│   ├── hearings.js       # Hearing handlers
│   ├── timesheets.js     # Timesheet handlers
│   ├── expenses.js       # Expense handlers
│   ├── invoices.js       # Invoice handlers + PDF/Excel export
│   ├── corporate.js      # Corporate secretary handlers
│   ├── reports.js        # Report generation
│   ├── settings.js       # Settings + backup
│   └── lookups.js        # Lookup tables CRUD
├── logging.js            # File-based logging
└── validation.js         # Input validation schemas
```

Each file: 200-500 lines max. Each handler: validated, try/caught, logged.

### Phase 3: RESTRUCTURE APP.JS + STATE MANAGEMENT (Priority: HIGH)
**Goal:** Fast, responsive UI that doesn't re-render everything on every click  
**Timeline:** 2-3 sessions  
**Risk if skipped:** Sluggish with real data, bugs from prop-drilling 30+ values

#### 3A. Context-Based State
Replace 70+ useState calls with focused contexts:
```
contexts/
├── AppContext.js          # Language, theme, sidebar
├── DataContext.js         # Clients, matters, lawyers, lookups (shared reference data)
├── UIContext.js           # Which forms/modals are open, editing state
└── NotificationContext.js # Toast, confirm dialog
```

Benefits:
- Components only re-render when their specific context changes
- No more passing `language`, `lawyers`, `showToast` through 4 levels of props
- Each list/form subscribes to only what it needs

#### 3B. On-Demand Data Loading
Don't load all 5,000 timesheets at startup. Load when the user navigates to timesheets:
```javascript
// Instead of loading everything at startup:
useEffect(() => {
  if (currentModule === 'timesheets') loadTimesheets(filters, page);
}, [currentModule, filters, page]);
```

Dashboard loads only stats (one query). Each module loads its own data with pagination.

#### 3C. Error Boundary
Wrap the main content area in an error boundary:
```javascript
<ErrorBoundary fallback={<CrashRecovery onRetry={loadAllData} />}>
  <MainContent module={currentModule} />
</ErrorBoundary>
```
If a component crashes, the sidebar and header stay. The user sees "Something went wrong" with a Retry button — not a white screen.

### Phase 4: PRODUCTION INFRASTRUCTURE (Priority: HIGH)
**Goal:** Know when things break, recover when they do  
**Timeline:** 1-2 sessions

#### 4A. File-Based Logging
```javascript
// Every operation logged to %APPDATA%/Qanuni/logs/qanuni-2026-02-09.log
logger.info('Client created', { clientId: 'CLT-2026-a7f3b9c1', name: 'Kallas Law' });
logger.error('Query failed', { sql: 'SELECT...', error: 'no such column' });
```
- Rotate daily, keep 30 days
- On crash: log stack trace before exit
- When a lawyer reports a bug, ask them to send the log file

#### 4B. Migration Versioning
```javascript
const MIGRATIONS = [
  { version: 1, description: 'Initial schema', applied: null },
  { version: 2, description: 'Add deleted_at to clients', applied: null },
  // ...
];
// Track applied migrations in a `schema_version` table
// Only run migrations that haven't been applied yet
```

#### 4C. Database Integrity Check on Startup
```javascript
async function verifyDatabaseIntegrity() {
  const result = runQuery('PRAGMA integrity_check');
  if (result[0]?.integrity_check !== 'ok') {
    // Show: "Database may be damaged. Restore from backup?"
    // Offer: restore from most recent auto-backup
  }
}
```

#### 4D. Crash Recovery
```javascript
process.on('uncaughtException', (error) => {
  logger.error('CRASH', { error: error.stack });
  saveDatabase();  // Force immediate save
  // Show crash dialog with "Send Report" option
});
```

### Phase 5: CLEAN UP DEAD CODE + CONSOLE.LOG (Priority: MEDIUM)
**Goal:** Professional production build  
**Timeline:** 1 session

- Remove all `console.log` debugging (dozens throughout main.js and App.js)
- Remove "moved outside App" comments (30+ lines of dead comments in App.js)
- Remove unused imports
- Remove `seedSampleData()` function
- Remove `TimeDropdown.js` (marked for deletion since v46.57)
- Clean up the i18n situation: keep inline ternaries, delete the broken translations.js extraction, or fix it properly — pick one and commit

### Phase 6: SCALE TESTING (Priority: MEDIUM)
**Goal:** Confidence the app works with real-world data volumes  
**Timeline:** 1 session

Create a test script that generates:
- 500 clients (mix of individual + legal entity)
- 1,000 matters across those clients
- 5,000 hearings
- 10,000 timesheets
- 3,000 expenses
- 500 invoices

Then verify:
- Startup time < 3 seconds
- Module switching is instant
- Filters respond < 200ms
- Search responds < 300ms
- Export works without OOM errors

---

## Execution Order

```
Phase 1 (Data Safety)     ← DO THIS FIRST. Nothing else matters if data is lost.
  ↓
Phase 2 (Split main.js)   ← Makes everything else easier
  ↓
Phase 3 (Split App.js)    ← Performance + maintainability
  ↓
Phase 4 (Logging + Infra) ← Know when things break
  ↓
Phase 5 (Clean up)        ← Professional output
  ↓
Phase 6 (Scale test)      ← Confidence before distribution
```

## What We Keep

All the business logic stays. The 161 IPC handlers, the SQL queries, the form validations, the court inheritance logic, the appeal workflow, the conflict checker — that's the product. It's the architecture around it that needs to be professional-grade.

## What Changes for the User

Nothing visible. Same UI, same features, same workflow. What changes:
- App doesn't lose data on crash
- App doesn't slow down with 1,000+ matters
- When something breaks, you can see why in a log file
- When you need to add a feature, you edit a 300-line file instead of a 7,000-line file

---

## Decision Points for Malek

1. **i18n:** Roll back to inline ternaries (v46.56) and stop? Or fix translations.js properly before moving on? My recommendation: roll back, ship English-first, add proper i18n later as a full feature (not piecemeal extraction).

2. **On-demand loading (Phase 3B):** This changes how every list component gets its data. It's the right thing to do for scale, but it touches every component. Do it now or defer to after initial distribution?

3. **Corporate Secretary module:** It works but hasn't been hardened like the core modules. Prioritize hardening it alongside Phase 1, or defer?

4. **Licensing system:** Currently fail-open (errors = allow access). Intentional for now, or needs hardening?
