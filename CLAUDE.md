# Qanuni Project Context

## Current Status
- **Desktop Version:** v1.0.0 (shipped)
- **Desktop Backend:** Fully modularized — 21 IPC modules, 163 handlers
- **Desktop Tests:** 118 integration tests passing (`node test-integration.js`)
- **SaaS Transformation:** Week 3 Day 15 Complete (87.5%) - Expenses CRUD Endpoints
- **SQL Server:** 13 tables (firms, users, clients, matters, matter_clients, lawyers, hearings, diary, tasks, judgments, deadlines, timesheets, expenses)
- **API Endpoints:** 59 total (4 auth + 5 clients + 5 matters + 5 lawyers + 5 hearings + 5 diary + 5 tasks + 5 judgments + 5 deadlines + 5 timesheets + 5 expenses)
- **Frontend Bridge:** JWT auth + SaaS response unwrapping (53 methods in api-client.js)
- **Next:** Week 3 Day 16 - Advances CRUD Endpoints

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
4. Run `node test-integration-saas.js` to verify SaaS baseline (266/266 passing)
5. Request the files needed for that phase

**For Desktop work:**
- `App.js` — main React app
- Relevant component files from `src/components/`
- `electron/ipc/<module>.js` — specific module being changed
- `preload.js` — if adding new IPC channels

**For SaaS transformation:**
- SESSION_33_CHECKPOINT.md (or latest session checkpoint)
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
node test-integration-saas.js    # Must show 266/266 passing

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
- `node test-integration-saas.js` — Run 266 SaaS integration tests
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

### Known Working Configurations
- **Desktop tests:** 118/118 passing consistently
- **SQL Server tests:** 3/3 passing with msnodesqlv8
- **SaaS integration tests:** 266/266 passing (was 121/121, +145 assertions from Days 12-15)
- **Diary smoke tests:** 36/36 assertions passing (11 test scenarios)
- **Environment:** .env file with empty DB_USER/DB_PASSWORD = Windows Auth
- **Validation:** Now in shared/validation.js (imported by 16 desktop IPC files + 11 SaaS routes)
- **Total API endpoints:** 59 (4 auth + 5×11 business entities)
- **Total test coverage:** 387 assertions (118 desktop + 266 SaaS integration + 3 connection)

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

**Week 3 Status:** 87.5% complete (Day 15 of 8 days done) - Next: Day 16 (Advances CRUD) 🎯

### 🔜 Remaining Week 3 Days
- Day 16: Advances CRUD

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
