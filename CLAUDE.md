# Qanuni Project Context

## Current Status
- **Desktop Version:** v1.0.0 (shipped)
- **Desktop Backend:** Fully modularized — 21 IPC modules, 163 handlers
- **Desktop Tests:** 118 integration tests passing (`node test-integration.js`)
- **SaaS Transformation:** Week 1 Day 1 complete (Phase 2: Database layer foundation)
- **SQL Server:** Configured, tested, Windows Auth working via msnodesqlv8
- **Next:** Week 1 Day 2 - First REST endpoint (Express + health check)

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
4. Request the files needed for that phase

**For Desktop work:**
- `App.js` — main React app
- Relevant component files from `src/components/`
- `electron/ipc/<module>.js` — specific module being changed
- `preload.js` — if adding new IPC channels

**For SaaS transformation:**
- SESSION_25_CHECKPOINT.md (or latest session checkpoint)
- WEEK_1_DAY_X_READY.md — tactical execution plan for current day
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
   - Review CREATE TABLE statements in electron/schema.js
   - Confirm column names (especially bilingual fields)
   - Check for foreign key relationships

3. Check validation schema if handling new data:
   - Review shared/validation.js schemas
   - Verify required fields and types match database

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

## Critical Rules

### Testing First
```powershell
# MANDATORY before every commit
node test-integration.js    # Must show 0 failures (currently 118/118)

# For SaaS work, also verify SQL Server connection
node test-mssql-connection.js    # Must show 3/3 passing

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

### Desktop
- `npm run dev` — Development (production DB)
- `npm run dev:test` — Development (test DB)
- `npm run dist:clean` — Build for testing
- `npm run dist` — Build for release
- `node test-integration.js` — Run 118 integration tests (MANDATORY before commit)
- `git checkout preload.js` — Restore after dist if modified

### SaaS (Week 1+)
- `node server/index.js` — Start Express server (after Week 1 Day 2)
- `node test-mssql-connection.js` — Verify SQL Server connection
- `npm test` — Run API tests (after Week 2)

## Project Location
`C:\Projects\qanuni\`

## Architecture

### Desktop (v1.0.0 - Complete)
```
electron/
├── database.js          # SQLite - Atomic writes, safe IDs, transactions
├── logging.js           # File-based logging (%APPDATA%/Qanuni/logs/)
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

### SaaS (Week 1+ - In Progress)
```
shared/                  # ✅ Week 1 Day 1 - Code shared between Desktop & SaaS
├── validation.js        # Input validation (moved from electron/)
└── (future shared utils)

server/                  # ✅ Week 1 Day 1 - SaaS backend (Express + SQL Server)
├── database.js          # SQL Server connection + helpers (msnodesqlv8 + tedious)
├── index.js             # 🔜 Week 1 Day 2 - Express server entry point
├── routes/              # 🔜 Week 1 Day 2+ - REST API endpoints
│   ├── auth.js          # Login, registration, JWT
│   ├── clients.js       # Client CRUD
│   ├── matters.js       # Matter CRUD
│   └── (21 route modules total)
└── middleware/          # 🔜 Week 1 Day 3 - Auth, validation, error handling

test-mssql-connection.js # ✅ Week 1 Day 1 - SQL Server verification script
.env                     # ✅ Week 1 Day 1 - Environment configuration (gitignored)
```

### SQL Server Configuration (Week 1 Day 1)
- **Version:** SQL Server 2025 Express (MSSQL17.SQLEXPRESS)
- **Server:** localhost\SQLEXPRESS
- **Database:** qanuni (created, empty)
- **Authentication:** 
  - Local dev: Windows Auth via msnodesqlv8
  - Production: SQL Auth via tedious (auto-selected by server/database.js)
- **Protocols:** TCP/IP enabled, Named Pipes enabled
- **Connection:** Verified working (3/3 tests passing)

## After Major Changes
- Run `node test-integration.js` — must pass before commit
- Run `node test-mssql-connection.js` — verify SQL Server (SaaS work)
- Update `KNOWN_FIXES.md` for bug fixes
- Update `CLAUDE.md` for structural changes, phase completions
- Update `test-integration.js` when adding new IPC handlers
- Remind user to commit before any dist build

## Safety Rules
- NEVER use PowerShell for file edits — Claude Code Chat handles file operations
- NEVER deliver full JS files containing Arabic text — use Node.js scripts with \uXXXX escapes
- ALWAYS run `node test-integration.js` before committing
- ALWAYS run `node test-mssql-connection.js` before SaaS commits
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
- **RLS decision:** Skip RLS for Phase 1, use explicit `WHERE firm_id = @firmId` clauses
- **Database limitation:** SQLite AUTOINCREMENT accepted for MVP, migrate to sequences in Phase 2
- **Driver architecture:** msnodesqlv8 (local Windows Auth) + tedious (production SQL Auth)

### Known Working Configurations
- **Desktop tests:** 118/118 passing consistently
- **SQL Server tests:** 3/3 passing with msnodesqlv8
- **Environment:** .env file with empty DB_USER/DB_PASSWORD = Windows Auth
- **Validation:** Now in shared/validation.js (imported by 16 IPC files)

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

### 🔜 Day 3 (6 hours)
- Create middleware (auth, validation, error handling)
- Add CORS configuration
- Create login/register endpoints
- Test authentication flow

### 🔜 Day 4 (6 hours)
- Create clients CRUD endpoints
- Test with Postman/Thunder Client
- Verify firm_id isolation working

**Week 1 Status:** 50% complete (Day 2 of 4), ahead of schedule ⚡

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
