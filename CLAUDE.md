# Qanuni Project Context

## Current Status
- **Desktop Version:** v1.0.0 (shipped)
- **Desktop Backend:** Fully modularized — 21 IPC modules, 163 handlers
- **Desktop Tests:** 118 integration tests passing (`node test-integration.js`)
- **SaaS Transformation:** Week 5 Day 24 Complete (100%) - 21/21 modules converted
- **SQL Server:** 33 tables created (Azure SQL: `qanuni-sql-server.database.windows.net/qanuni`)
- **API Endpoints:** 171 total (5 auth + 166 business entities)
- **Frontend Bridge:** JWT auth + SaaS response unwrapping (dual-mode ready)
- **Auth UI:** Login, Register, ForgotPassword pages + ProtectedRoute + React Router v6
- **Azure SQL:** Basic tier ($5/mo), UAE North, SQL Auth (user: Malek)
- **Azure App Service:** B1 tier ($13/mo), West Europe, Node.js 20 LTS, Linux, always-on
- **Live URL:** https://qanuni-api.azurewebsites.net (API + frontend, single deployment)
- **Phase 1 Progress:** Week 3 Day 2 Complete — API + frontend deployed, B1 upgraded
- **Next:** Phase 1 Week 3 Day 3 — Browser end-to-end testing of all 21 modules

## Three-Party Workflow

### 1. Claude Web Chat (Strategic Planning & Review)
**Role:**
- Create implementation plans with detailed specifications
- Design data structures, schemas, function signatures
- Define success criteria for each step
- Review outputs from Claude Code Chat for approval
- Update documentation (CLAUDE.md, KNOWN_FIXES.md)
- Make go/no-go decisions before commits

**Does NOT:**
- Write actual code files (Claude Code Chat does this)
- Run terminal commands (Malek does this)
- Edit files directly (to prevent encoding issues)

### 2. Malek (Coordinator & Gatekeeper)
**Role:**
- Run commands requested by Claude Web Chat (tests, git, file searches)
- Act as relay between Claude Web Chat and Claude Code Chat
- Execute git commits when approved
- Alert if something looks wrong before proceeding
- Make final decisions when options presented

**Workflow per task:**
1. Claude Web Chat creates implementation plan
2. You take plan to Claude Code Chat
3. Claude Code Chat implements
4. You run `node test-integration.js`
5. If tests pass (118/118), upload results to Claude Web Chat
6. Claude Web Chat reviews and approves
7. You commit

### 3. Claude Code Chat (Code Execution & Verification)
**Role:**
- Execute file operations based on specifications from Claude Web Chat
- Create new files following provided schemas
- Modify existing files with precise changes
- Run encoding-safe operations for Arabic content
- Has direct root folder access (no upload delays)
- **Second opinion:** Review strategy decisions and planning from Claude Web Chat
- Catch implementation issues Claude Web Chat may have missed by reviewing actual codebase

**Input needed (via Malek):**
- Exact file specifications from Claude Web Chat
- Function signatures
- SQL schemas
- Expected behavior descriptions
- Test cases to validate

**Output provided:**
- Implementation confirmation
- Soundness verification of strategy (can see what Web Chat missed)
- Actual file modifications completed

## Session Start Requirements
At the start of EVERY new chat:
1. Check what phase/day of work we're on
2. Run `node test-integration.js` to confirm baseline (118/118 passing)
3. Run `node test-mssql-connection.js` to verify SQL Server (if SaaS work)
4. Run `node test-integration-saas.js` to verify SaaS baseline (561/561 passing)
5. Request the files needed for that phase

**For Desktop work:**
- `App.js` — main React app
- Relevant component files from `src/components/`
- `electron/ipc/<module>.js` — specific module being changed
- `preload.js` — if adding new IPC channels

**For SaaS transformation:**
- Session_40_Checkpoint.md (or latest session checkpoint)
- WEEK_3_DAY_X_READY.md — tactical execution plan for current day (if exists)
- SESSION_23_SAAS_FINAL_ROADMAP_v2.md — 10/10 verified strategy (reference)

## Before Writing New Code

**Claude Web Chat should request an audit from Claude Code Chat before creating implementation plans.**

### Audit Request Template (via Malek to Claude Code Chat)

```
Please audit the following before we proceed with [task description]:

1. Check existing IPC pattern for similar functionality:
   - Search preload.js for: [similar function name]
   - Search electron/ipc/ for: [related handlers]

2. Verify table schema if modifying database:
   - Review CREATE TABLE statements in electron/schema.js (desktop) or server/schema-*.sql (SaaS)
   - Confirm column names (especially bilingual fields)
   - Check for foreign key relationships
   - Verify PK naming ({entity}_id pattern for SaaS)

3. Check validation schema if handling new data:
   - Review shared/validation.js schemas
   - Verify required fields and types match database
   - Confirm format (flat object for SaaS, custom for desktop)

4. Find similar component usage patterns:
   - Search src/components/ for: [similar functionality]
   - Review how existing code handles [specific pattern]

5. Identify potential conflicts or issues:
   - Check for similar bug fixes in KNOWN_FIXES.md
   - Review any related TODO comments in codebase

Please provide:
- Existing patterns found
- Any conflicts or issues discovered
- Recommendations for implementation approach
```

### Workflow
1. Claude Web Chat creates audit request
2. Malek relays to Claude Code Chat
3. Claude Code Chat performs audit (has direct file access)
4. Malek uploads audit report back to Claude Web Chat
5. Claude Web Chat reviews audit and creates implementation plan
6. Implementation proceeds with verified approach

**This prevents:**
- Duplicate implementations
- Column name mismatches
- Breaking existing patterns
- Missing validation schemas
- FK reference errors (e.g., firms(id) vs firms(firm_id))
- Inconsistent timestamp functions (GETDATE vs GETUTCDATE)

## Critical Rules

### Testing First
```powershell
# MANDATORY before every commit
node test-integration.js    # Must show 0 failures (currently 118/118)

# For SaaS work, also verify SQL Server connection
node test-mssql-connection.js    # Must show 3/3 passing

# For SaaS work, verify integration tests
node test-integration-saas.js    # Must show 561/561 passing

# After ANY backend change, run tests before UI testing
# After adding new IPC handlers, add test cases to test-integration.js
```

### IPC Calls (Frontend → Backend)
```javascript
// ✅ CORRECT
const data = await window.electronAPI.functionName(param);

// ❌ WRONG - never use this pattern
const data = await window.electron.invoke('channel-name', param);
```

### Handler Pattern (v47.0)
Every IPC handler follows this structure:
```javascript
ipcMain.handle('channel-name', logger.wrapHandler('channel-name', (event, data) => {
  // 1. Validate input
  const check = validation.check(data, 'entityType');
  if (!check.valid) return check.result;

  // 2. Generate ID (for creates)
  const id = database.generateId('PREFIX');

  // 3. Execute with immediate save
  database.execute('INSERT INTO ...', [...]);

  // 4. Return structured result
  return { success: true, id };
}));
```

### Database Column Names (INCONSISTENT — Check Every Time!)
| Table | English | Arabic |
|-------|---------|--------|
| lawyers | name | name_arabic |
| lookup_* | name_en | name_ar |
| clients | client_name | client_name_arabic |
| matters | matter_name | matter_name_arabic |

**Lawyers special case:** DB stores `name`/`name_arabic`, queries alias to `full_name`/`full_name_arabic`, frontend sends `full_name`/`full_name_arabic`, validation schema uses `full_name`.

> ⚠️ ALWAYS verify against `CREATE TABLE` in `electron/schema.js` before writing queries.

### React Hooks Rule
ALL hooks must be called BEFORE any early return (`if (!isOpen) return null`).

### Bilingual Display (Inline Ternaries — Current Approach)
```javascript
// Lawyers
{language === 'ar' ? (l.full_name_arabic || l.full_name) : l.full_name}

// Lookups
{language === 'ar' ? item.name_ar : item.name_en}
```
> Full Arabic UI is deferred. Do NOT attempt centralized i18n extraction.

### Form Locations (v46.56)
ALL forms live in `src/components/forms/` (13 forms). The old `src/forms/` directory was removed.

## Build Commands
- `npm run dev` — Development (production DB)
- `npm run dev:test` — Development (test DB)
- `npm run dist:clean` — Build for testing
- `npm run dist` — Build for release
- `node test-integration.js` — Run 118 integration tests (MANDATORY before commit)
- `node test-integration-saas.js` — Run 561 SaaS integration tests
- `node test-mssql-connection.js` — Verify SQL Server connection (3 tests)
- `git checkout preload.js` — Restore after dist if modified

## Project Location
`C:\Projects\qanuni\`

## Architecture (v47.0)
```
electron/
├── database.js          # Atomic writes, safe IDs, transactions, WAL mode, integrity checks
├── logging.js           # File-based logging (%APPDATA%/Qanuni/logs/), crash handlers, IPC wrapper
├── validation.js        # Input validation schemas for 16 entity types
├── migrations.js        # Versioned, trackable migrations (16 migrations)
├── schema.js            # 27 CREATE TABLE statements + seed data
└── ipc/                 # 21 handler modules (all ✓ complete)
    ├── clients.js       # 6 handlers
    ├── license.js       # Fail-closed licensing
    ├── lawyers.js       # 7 handlers
    ├── matters.js       # 6 handlers
    ├── diary.js         # 4 handlers
    ├── hearings.js      # 4 handlers
    ├── judgments.js      # 4 handlers
    ├── deadlines.js     # 6 handlers
    ├── tasks.js         # 4 handlers
    ├── timesheets.js    # 5 handlers
    ├── expenses.js      # 8 handlers
    ├── advances.js      # 10 handlers
    ├── invoices.js      # 8 handlers
    ├── appointments.js  # 4 handlers
    ├── lookups.js       # 9 handlers
    ├── conflict-check.js # 2 handlers
    ├── corporate.js     # 24 handlers
    ├── trash.js         # 5 handlers
    ├── settings.js      # ~22 handlers
    ├── reports.js       # ~12 handlers
    └── client-imports.js # 2 handlers
```

## Frontend Structure (Unchanged During Hardening)
```
src/
├── App.js              # ~4,000 lines — needs Phase 3 restructuring
├── constants/          # translations.js (basic, pre-i18n)
├── utils/              # validators, formatDate, generateId
└── components/
    ├── common/         # Shared components (FormField, ExportButtons, etc.)
    ├── forms/          # ALL 13 form components
    ├── lists/          # 11 list components
    ├── modules/        # Full modules (Dashboard, Calendar, Reports, etc.)
    ├── corporate/      # Corporate Secretary (EntitiesList, EntityForm)
    └── reports/corporate/  # Corporate report modals
```

## After Major Changes
- Run `node test-integration.js` — must pass before commit
- Run `node test-integration-saas.js` — must pass before SaaS commits
- Update `KNOWN_FIXES.md` for bug fixes
- Update `CLAUDE.md` for structural changes, phase completions
- Update `test-integration.js` when adding new handlers
- Update `test-integration-saas.js` when adding new SaaS endpoints
- Remind user to commit before any dist build

## Safety Rules
- NEVER use PowerShell for file edits — Claude Code Chat handles file operations
- NEVER deliver full JS files containing Arabic text — use Node.js scripts with \uXXXX escapes
- ALWAYS run `node test-integration.js` before committing
- ALWAYS run `node test-mssql-connection.js` before SaaS commits
- ALWAYS run `node test-integration-saas.js` before SaaS commits
- ALWAYS commit before `npm run dist`
- After ANY batch file modification, run Arabic integrity scan before proceeding
- Check `KNOWN_FIXES.md` before refactoring existing components
- NEVER commit .env file (already gitignored ✅)

## Context Management
- Proactively report conversation context status (% used) every 5-6 exchanges
- Alert at 75% to create checkpoint
- At end of sessions with major structural changes, remind to update CLAUDE.md

## Known Issues

### Desktop v1.0.0
- **Invoice delete bug:** Doesn't restore advance balance (fix in v1.0.1 or during SaaS Week 5-6)

### SaaS Decisions
- **RLS decision:** Skip RLS for Phase 1, use explicit `WHERE firm_id = @firm_id` clauses
- **Database limitation:** SQLite AUTOINCREMENT accepted for MVP, migrate to sequences in Phase 2
- **Driver architecture:** msnodesqlv8 (local Windows Auth) + tedious (production SQL Auth)

### SaaS Learnings (Week 2)
- **Pre-implementation audits are critical:** Day 7 audit caught 8 issues before implementation (FK refs, PK naming, timestamp functions, missing columns, broken JOINs, validation format)
- **Desktop ≠ SaaS schema:** Desktop matters has client_id, SaaS uses matter_clients junction - can't assume 1:1 field mapping
- **Validation format matters:** Desktop uses custom validation.check(), SaaS uses flat object format - never mix schema formats
- **Always verify FK references:** Column names vary between tables (firms.firm_id, users.user_id, clients.client_id) - never assume

### SaaS Learnings (Week 3)
- **Architecture audit prevents mistakes:** Claude Code audit revealed 98% shareability - splitting repos would have created unnecessary maintenance burden
- **Response normalization direction matters:** Unwrap SaaS responses to match Desktop format (not vice versa) to avoid breaking 55 components
- **Per-method unwrapping > global wrapper:** Not all endpoints return `{ data, pagination }` - per-method handling is more explicit and type-safe
- **JWT token persistence is critical:** localStorage persistence prevents re-login on page refresh
- **401 auto-logout prevents confusion:** Auto-clear token on 401 provides clear "Authentication required" error vs generic failure
- **Audit-first approach is gold standard:** Day 10 audit caught 13 issues before any code written - zero runtime failures, all tests green on first run
- **Template-based development works:** "Use hearings.js as direct template" instruction prevented all API surface mismatches (db.query vs db.execute, etc.)
- **HTTP smoke tests > raw SQL tests:** HTTP tests validate auth, middleware, business logic - not just database layer
- **Column name drift between Desktop/SaaS:** Desktop lawyers.name vs SaaS lawyers.full_name caused runtime failure in timesheets JOIN - always verify column names against actual SaaS schema, not desktop
- **Template-based acceleration:** Using judgments.js as template delivered 4 CRUD modules (Deadlines, Timesheets, Expenses) with 145 new assertions in a single session with zero-failure quality
- **3 FK validation pattern:** Expenses introduced 3 optional FK validations (matter_id, lawyer_id, paid_by_lawyer_id) - reusable pattern for complex entities

### SaaS Learnings (Week 4)
- **Audit-then-implement is mandatory:** Day 20 instructions had wrong seed data for 4/6 lookup tables — Claude Code audit caught all before implementation
- **Multi-row INSERT with Unicode fails in SQL Server:** Must use individual INSERTs via Node.js runner with \uXXXX escapes
- **Express route ordering matters:** `/exchange-rates/for-date` must be defined BEFORE `/exchange-rates/:id` or Express matches "for-date" as :id parameter
- **Broken stubs need full rewrite:** Settings stub imported Electron modules directly — faster to rewrite from scratch than patch 8 issues
- **Test re-runnability requires care:** Soft-deleted rows still block UNIQUE constraints; use timestamp-based codes and reset state for idempotent tests
- **sqlcmd unreliable for schema execution:** ODBC Driver 18 connection issues; Node.js runner via server/database.js (ODBC 17 + msnodesqlv8) is the reliable path
- **Verify column names against actual schema:** invoice_date vs issue_date caught by reading schema-invoices.sql, not by trusting instructions

### Known Working Configurations
- **Desktop tests:** 118/118 passing consistently
- **SQL Server tests:** 3/3 passing with msnodesqlv8
- **SaaS integration tests:** 739/739 passing (against Azure SQL)
- **Diary smoke tests:** 36/36 assertions passing (11 test scenarios)
- **Environment (local dev):** .env file with empty DB_USER/DB_PASSWORD = Windows Auth
- **Environment (Azure):** .env with DB_SERVER=qanuni-sql-server.database.windows.net, DB_USER=Malek, DB_ENCRYPT=true
- **Validation:** Now in shared/validation.js (imported by 16 desktop IPC files + 21 SaaS routes)
- **Total API endpoints:** 171 (5 auth + 166 business entities)
- **Total SQL Server tables:** 33 (Azure SQL)
- **Total route modules:** 21 (all registered in server/index.js)
- **Total test coverage:** 860 assertions (118 desktop + 739 SaaS integration + 3 connection)
- **Auth UI:** react-router-dom v6, AuthContext, LoginPage, RegisterPage, ForgotPasswordPage, ProtectedRoute
- **Web build:** 196KB gzipped (npm run build:web)
- **Schema deployment:** run-azure-schema.js (18 files + 6 system currencies seed)
- **Azure App Service:** B1 tier, West Europe, Node.js 20 LTS, always-on enabled
- **Live URL:** https://qanuni-api.azurewebsites.net (health check + registration + login verified)
- **Production response times:** ~0.6s health, ~2.5s login, ~11s registration (cross-region DB)
- **Deployment method:** Code-only zip via Azure Management API + remote `npm install` via Kudu command API
- **Monthly cost:** ~$18 (B1 App Service $13 + Basic SQL $5)

## Week 1 Progress Tracker

### ✅ Day 1 Complete (5 hours)
- Phase 1: Shared code foundation
  - Created shared/ directory
  - Moved validation.js from electron/ to shared/
  - Updated 16 IPC files to import from ../../shared/validation
  - Tests: 118/118 passing
- Phase 2: Database layer foundation
  - Installed SQL Server 2025 Express
  - Enabled TCP/IP protocol
  - Created .env with JWT secrets + SQL Server config
  - Installed mssql, dotenv, msnodesqlv8 packages
  - Created server/database.js (dual-driver architecture)
  - Created test-mssql-connection.js
  - Tests: 3/3 passing

### ✅ Day 2 Complete (2.5 hours)
- Install Express + middleware packages
- Create server/index.js (Express app)
- Create server/routes/auth.js (health check endpoint)
- Test first API call: GET /health
- Commit: 423b800a (pushed)

### ✅ Day 3 Complete (6 hours)
- Created server/middleware/auth.js (JWT verification + generation)
- Created server/middleware/validate.js (request validation)
- Added transaction support to server/database.js
- Added minLength validation to shared/validation.js
- Implemented POST /api/auth/register (firm + user creation)
- Implemented POST /api/auth/login (credential verification)
- Implemented POST /api/auth/refresh (token refresh)
- Implemented GET /api/auth/me (protected endpoint demo)
- Created SQL Server tables: firms, users
- Tests: 14/14 API endpoints passing
- Commit: c1762e47 (pushed)

### ✅ Day 4 Complete (4 hours, ahead of schedule)
- Created server/schema-clients.sql (standalone SQL table)
- Created server/routes/clients.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (client_saas schema, separate from desktop)
- Modified server/index.js (registered /api/clients routes)
- Features: Firm isolation, JWT auth, soft deletes, bilingual support, client_type
- Tests: 4/4 smoke tests passing
- Commit: 7791a2f8 (pushed)

**Week 1 Status:** 100% complete (4 days in ~13 hours), ahead of schedule ⚡

## Week 2 Progress Tracker

### ✅ Day 5 Complete (6 hours)
- Created server/schema-matters.sql (matters + matter_clients tables)
- Created server/routes/matters.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (matter_saas schema, 18 fields)
- Modified server/index.js (registered /api/matters routes)
- Features: Multi-client support, firm isolation, transaction safety, embedded clients via FOR JSON PATH
- Tests: 6/6 smoke tests passing
- Commit: 850e794c (pushed)

### ✅ Day 6 Complete (6 hours)
- Created server/schema-lawyers.sql (lawyers table, 18 columns)
- Created server/routes/lawyers.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (lawyer_saas schema, 12 fields)
- Modified server/index.js (registered /api/lawyers routes)
- Features: Role-based filtering, hourly_rate with currency, filtered unique email index
- Tests: 25/25 assertions (7 smoke tests) passing
- Commit: 2b51ae54 (pushed)

### ✅ Day 7 Complete (6 hours)
- Created server/schema-hearings.sql (hearings table, 17 columns)
- Created server/routes/hearings.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (hearing_saas schema, 11 fields)
- Modified server/index.js (registered /api/hearings routes)
- Features: Matter linkage, date/time tracking, court details, outcome tracking, calendar integration, audit trail
- **Audit fixes applied:** 8 issues caught before implementation (FK refs, PK naming, GETUTCDATE, created_by, broken JOIN, validation format, outcome default, index pattern)
- Tests: 28/28 assertions (7 smoke tests) passing
- Commit: dd60367a (pushed)

### ✅ Day 8 Complete (6 hours)
- Created server/utils/pagination.js (shared pagination helpers)
- Created test-integration-saas.js (27 tests, 70 assertions)
- Modified server/routes/clients.js (pagination + search + filters)
- Modified server/routes/matters.js (pagination + search + filters)
- Modified server/routes/lawyers.js (pagination + search + filters)
- Modified server/routes/hearings.js (pagination + search + filters)
- Modified test-lawyers-smoke.js (updated for new response format)
- Modified test-hearings-smoke.js (updated for new response format)
- **Breaking change:** List endpoints now return `{ data: [...], pagination: {...} }` instead of `{ count, <entity>: [...] }`
- Tests: 70/70 SaaS integration tests passing, 118/118 desktop tests passing
- Commit: 0b81afcb (pushed)

**Week 2 Status:** 100% complete (Days 5-8 done) - Complete ✅

## Week 3 Progress Tracker

### ✅ Day 9 Complete (4 hours)
- **Architecture Decision:** Single repository confirmed (98% shareability, 0 Electron-locked components)
- **Claude Code Audit:** Analyzed 2,215-line api-client.js, identified response format mismatch
- Modified src/api-client.js (JWT injection + SaaS response unwrapping)
  - Added authToken with localStorage persistence
  - Added setAuthToken() export for login flow
  - Updated fetchAPI() with Authorization header injection
  - 401 auto-clear mechanism
  - Unwrapped response.data from 53 list methods
- Modified package.json (added cross-env, dev:saas, build:web scripts)
- **Bridge Layer:** All 55 React components now work in both Desktop (IPC) and SaaS (REST) modes with zero rewrites
- Tests: 118/118 desktop + 70/70 SaaS passing (188 total assertions)
- Commit: 9f8a8e5b (pushed)

### ✅ Day 10 Complete (3 hours)
- Created server/schema-diary.sql (diary table, 11 columns, 3 FKs, CHECK constraint)
- Created server/routes/diary.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (diary_saas schema, 5 fields)
- Modified server/index.js (registered /api/diary routes)
- Created test-diary-smoke.js (11 tests, 36 assertions)
- Modified test-integration-saas.js (added 9 diary tests, 23 assertions)
- **Audit-First Success:** Claude Code audit caught 13 issues before implementation
- Features: Matter linkage, entry type validation (7 types), date/time tracking, search filter
- Tests: 36/36 smoke tests + 93/93 integration tests passing (was 70/70)
- Commit: b25155e8 (pushed)

### ✅ Day 11 Complete (3 hours)
- Created server/schema-tasks.sql (tasks table, 25 columns, 7 FKs, 2 CHECK constraints)
- Created server/routes/tasks.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (task_saas schema, 14 fields)
- Modified server/index.js (registered /api/tasks routes)
- Modified test-integration-saas.js (added 9 task tests, 28 assertions)
- **Audit-First Success:** Claude Code audit caught 13 issues before implementation
- Features: Optional FK validation, task_number auto-gen (WA-YYYY-NNNN), comprehensive field handling
- Tests: 121/121 SaaS integration tests passing (was 93/93)
- Commit: f8716230 (pushed)

### ✅ Day 12 Complete (3 hours)
- Created server/schema-judgments.sql (judgments table, 15 columns, 3 FKs, 2 CHECK constraints)
- Created server/routes/judgments.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (judgment_saas schema, 9 fields)
- Modified server/index.js (registered /api/judgments routes)
- Modified test-integration-saas.js (added 12 judgment tests, 33 assertions)
- Features: Matter linkage, judgment_type/status enums, date tracking, appeal support
- Tests: 154/154 SaaS integration tests passing (was 121/121)
- Commit: c7406236 (pushed)

### ✅ Day 13 Complete (3 hours)
- Created server/schema-deadlines.sql (deadlines table, 14 columns, 3 FKs, 2 CHECK constraints)
- Created server/routes/deadlines.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (deadline_saas schema, 8 fields)
- Modified server/index.js (registered /api/deadlines routes)
- Modified test-integration-saas.js (added 12 deadline tests, 36 assertions)
- Features: Matter/judgment linkage, priority/status enums, reminder_days, deadline_date ASC ordering
- Tests: 190/190 SaaS integration tests passing (was 154/154)
- Commit: 78bad2c8 (pushed)

### ✅ Day 14 Complete (3 hours)
- Created server/schema-timesheets.sql (timesheets table, 15 columns, 4 FKs, 2 CHECK constraints)
- Created server/routes/timesheets.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (timesheet_saas schema, 9 fields)
- Modified server/index.js (registered /api/timesheets routes)
- Modified test-integration-saas.js (added 12 timesheet tests, 37 assertions)
- **Bug fix:** SaaS lawyers table uses `full_name` not `name` — caught by integration test
- Features: Matter/lawyer linkage, billable tracking, rate/currency, status workflow (draft→submitted→approved→billed)
- Tests: 227/227 SaaS integration tests passing (was 190/190)
- Commit: d31c0966 (pushed)

### ✅ Day 15 Complete (3 hours)
- Created server/schema-expenses.sql (expenses table, 20 columns, 5 FKs, 4 CHECK constraints)
- Created server/routes/expenses.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (expense_saas schema, 14 fields)
- Modified server/index.js (registered /api/expenses routes)
- Modified test-integration-saas.js (added 12 expense tests, 39 assertions)
- Features: expense_type/status enums, markup_percent, paid_by_firm/paid_by_lawyer, category, billable, 3 optional FK validations
- Tests: 266/266 SaaS integration tests passing (was 227/227)
- Commit: 3b2b83f3 (pushed)

### ✅ Day 16 Complete (3 hours)
- Created server/schema-advances.sql (advances table, 20 columns, 5 FKs, 3 CHECK constraints)
- Rewrote server/routes/advances.js (5 endpoints: GET, GET/:id, POST, PUT, DELETE)
- Modified shared/validation.js (advance_saas schema, 13 fields)
- Modified server/index.js (registered /api/advances routes)
- Modified test-integration-saas.js (added 15 advance tests, 47 assertions)
- **Audit-First Success:** Full codebase audit caught broken legacy routes file (imported Electron modules), rewrote from scratch
- **Business rule enforcement:** lawyer_advance requires lawyer_id (no client/matter), client types require client_id
- **Balance auto-tracking:** balance_remaining = amount for retainers/advances, NULL for fee payments
- Features: 3 advance categories, conditional FK validation, 6 query filters, balance tracking
- Tests: 313/313 SaaS integration tests passing (was 266/266)
- Commit: 268fdb36 (pushed)

**Week 3 Status:** 100% complete (Days 9-16 done) ✅

## Week 4 Progress Tracker

### ✅ Day 17 Complete (4 hours)
- Created server/schema-invoices.sql (2 tables: invoices + invoice_items)
- Created server/routes/invoices.js (6 endpoints: 5 CRUD + next-number)
- Modified shared/validation.js (invoice_saas schema, 22 fields)
- Modified server/index.js (registered /api/invoices routes)
- Modified test-integration-saas.js (added 12 invoice tests, 45 assertions)
- Features: 1:many relationship, auto-numbering (INV-YYYY-NNNN), transactional creates/updates
- Tests: 358/358 SaaS integration tests passing (was 313/313)
- Commit: 40fb5f0a (pushed)

### ✅ Day 18 Complete (4 hours)
- Created server/schema-timesheets.sql (timesheets table, client_id column)
- Rewrote server/routes/timesheets.js (8 endpoints: 5 CRUD + unbilled + matter + lawyer routes)
- Modified shared/validation.js (updated timesheet_saas with client_id)
- Modified server/routes/lawyers.js (added GET /api/lawyers/:id/timesheets)
- Modified test-integration-saas.js (added 4 timesheet tests, 16 assertions)
- Features: Gap closure (3 missing endpoints from api-client.js), unbilled time query for invoicing
- Tests: 374/374 SaaS integration tests passing (was 358/358)
- Commit: 87946341 (pushed)

### ✅ Day 19 Complete (9 hours - batch implementation)
- Created server/schema-appointments.sql (appointments table, 21 columns)
- Created server/schema-conflict-check.sql (conflict_check_log table)
- Created server/routes/appointments.js (5 endpoints: full CRUD)
- Created server/routes/conflict-check.js (3 endpoints: search, log, history)
- Created server/routes/trash.js (5 endpoints: list, count, restore, permanent-delete, empty)
- Modified shared/validation.js (appointment_saas schema, 15 fields)
- Modified server/index.js (registered 3 new route modules)
- Modified test-integration-saas.js (added 71 assertions across 3 modules)
- Features: Appointments with JSON attendees, partial conflict check (5/8 searches), trash with 13 entity types
- Deferred: 3 conflict searches (need corporate tables), 2 searches (need client schema updates)
- Tests: 446/446 SaaS integration tests passing (was 374/374)
- Commit: 0e50e6ea (pushed)

### ✅ Day 20 Complete (4 hours)
- Created server/schema-lookups.sql (6 tables, 73 seed rows)
- Rewrote server/routes/lookups.js (347 lines, 12 endpoints)
- Modified shared/validation.js (expanded lookup_item: name_fr, icon, code, sort_order)
- Modified server/index.js (registered /api/lookups routes)
- Modified test-integration-saas.js (added 23 tests, 62 assertions)
- **Audit-First Success:** Caught wrong seed data in 4/6 tables, wrong imports, wrong DB API, wrong auth pattern
- Features: Hybrid firm scoping (system + user items), TYPE_MAP with camelCase + kebab-case, lawyer rejection
- Tables: lookup_court_types(17), lookup_regions(12), lookup_hearing_purposes(10), lookup_task_types(11), lookup_expense_categories(10), lookup_entity_types(13)
- Tests: 508/508 SaaS integration tests passing (was 446/446)
- Commit: 6ffc0d26, Tag: v-saas-day20-lookups

### ✅ Day 21 Complete (4 hours)
- Created server/schema-settings.sql (3 tables: settings, firm_currencies, exchange_rates)
- Rewrote server/routes/settings.js (675 lines, 23 endpoints — full rewrite from broken stub)
- Modified shared/validation.js (added name_ar, symbol, sort_order to currency schema)
- Modified server/index.js (registered /api/settings routes)
- Modified test-integration-saas.js (added 38 tests, 53 assertions)
- **Full stub rewrite:** Existing stub imported Electron modules (8 issues found), rewrote from scratch
- Features: MERGE INTO upsert, JSON category settings, invoice/receipt number generators, exchange rate date lookup
- Seed: 6 system currencies (USD, EUR, LBP, GBP, AED, SAR) with Arabic names
- Tests: 561/561 SaaS integration tests passing (was 508/508)
- Commit: e816ee3f, Tag: v-saas-day21-settings

**Week 4 Status:** 100% complete (Days 17-21 done) ✅

## Week 5 Progress Tracker

### ✅ Day 22 Complete (4 hours)
- Created server/schema-corporate.sql (7 tables: corporate_entities, shareholders, directors, share_transfers, commercial_register_filings, company_meetings + entity_sequence)
- Rewrote server/routes/corporate.js (1400+ lines, 32 endpoints)
- Modified shared/validation.js (6 SaaS schemas: corporate_entity, shareholder, director, share_transfer, filing, meeting)
- Modified server/index.js (registered /api/corporate routes)
- Modified test-integration-saas.js (added 27 tests, 67 assertions)
- Features: Cap table, timeline, compliance tracking, share transfers with balance updates, company types/director roles lookups
- Tests: 628/628 SaaS integration tests passing (was 561/561)
- Commit: 05c16e67

### ✅ Day 23 Complete (4 hours)
- Rewrote server/routes/reports.js (780 lines, full rewrite from broken 59-line stub)
- 11 route endpoints + internal generateReportSaaS() handling 19 report types
- Modified server/index.js (registered /api/reports routes)
- Modified test-integration-saas.js (added 31 tests, 87 assertions)
- Features: Dashboard stats (10 parallel queries), invoice aging with buckets, client statement, case-status-report, client-360-report, matter-financials
- Column fixes: matter_status (not status), no client_id on deadlines/expenses, created_at (not opening_date)
- Tests: 715/715 SaaS integration tests passing (was 628/628)

### ✅ Day 24 Complete (2 hours)
- Rewrote server/routes/client-imports.js (179 lines, replaced broken stub importing Electron modules)
- Modified server/index.js (registered /api/client-imports routes)
- Modified test-integration-saas.js (added 9 tests, 24 assertions)
- Features: Header normalization (HEADER_MAP), duplicate detection, client_type normalization, firm_id scoping
- SaaS adaptations: SQLite→SQL Server syntax, is_deleted=0 (not deleted_at IS NULL), INT IDENTITY (not generateId), removed 10 columns not in SaaS schema
- Tests: 739/739 SaaS integration tests passing (was 715/715)
- Commit: 6436607b

**Week 5 Status:** 100% complete (Days 22-24 done) ✅
**SaaS Transformation: 21/21 modules converted — 100% COMPLETE** 🎉

## Phase 1 Week 3 Progress Tracker (Deployment)

### ✅ Day 1-2 Complete
- Created Azure App Service: `qanuni-api` (Node.js 20 LTS, Linux)
- Changed `npm start` from React dev server to Express API (`node server/index.js`)
- Added CORS origin restriction (ALLOWED_ORIGINS env var, origin-based filtering)
- Added body-parser size limits (5mb) + static file serving + SPA fallback
- Configured 10 environment variables (DB creds, JWT secrets, NODE_ENV, ALLOWED_ORIGINS)
- Added Azure SQL firewall rule for Azure services (0.0.0.0)
- Built React frontend: `npm run build:web` (196KB gzipped)
- Deployed code-only zip via Azure Management API zipdeploy
- Ran `npm install --omit=dev` remotely via Kudu command API (243 packages)
- Verified health check: `{"status":"ok","database":"connected"}`
- Upgraded F1 → B1 ($13/mo) for dedicated CPU
- Enabled always-on (prevents cold starts)
- Tested registration (HTTP 201, ~11s) and login (HTTP 200, ~2.5s)
- Cleaned up 34 temp deployment helper scripts
- **Deployment approach:** Single-deployment model (Express serves API at /api/* and React build at /*)
- **Key learnings:** F1 free tier unusable (125s responses), PowerShell Compress-Archive unreliable for large zips, Oryx build (SCM_DO_BUILD_DURING_DEPLOYMENT) didn't trigger — manual npm install via Kudu API is the reliable path
- Tests: 118/118 desktop passing
- Commits: 2e60e7cc

**Phase 1 Week 3 Status:** Day 2 complete, Day 3 (browser E2E testing) remaining

### Quick Reference
**Start Server:**
```powershell
npm run server              # Development (auto-restart)
npm run server:prod         # Production (no auto-restart)
```

**Test Endpoints:**
```powershell
curl.exe http://localhost:3001/health
curl.exe http://localhost:3001/api/auth/test
curl.exe -X POST http://localhost:3001/api/auth/login
```

**Stop Server:** Press Ctrl+C in server window

**Azure Production:**
```powershell
# Health check
curl.exe https://qanuni-api.azurewebsites.net/health

# View logs
az webapp log tail --name qanuni-api --resource-group qanuni-rg

# Restart app
az webapp restart --name qanuni-api --resource-group qanuni-rg

# SSH into container
az webapp ssh --name qanuni-api --resource-group qanuni-rg
```
