# Qanuni Project Overview

**Version:** v48.9 (Phase 4 Complete - Production Infrastructure)
**Status:** Production-ready backend, distribution preparation pending
**Last Updated:** February 11, 2026 (Session 11)

## Current State

**Architecture:** Modular, hardened, production-grade
- **Backend:** 21 IPC modules, 163 handlers, fully tested
- **Database:** SQLite with atomic writes, migrations, integrity checks, crash recovery
- **Tests:** 117 integration tests passing (100% pass rate)
- **Scale:** Validated with 26,268 records, 5-508x faster than targets
- **Infrastructure:** Migration versioning, crash recovery, file-based logging

**Completed Phases (QANUNI_HARDENING_STRATEGY.md):**
- ✅ Phase 1: Data Safety (atomic writes, proper IDs, validation)
- ✅ Phase 2: Modular Backend (21 IPC modules, clean separation)
- ✅ Phase 4: Production Infrastructure (migrations, integrity checks, crash recovery)
- ✅ Phase 6: Scale Testing (26K records validated)

**Pending Phases:**
- ⏳ Phase 3: Frontend Hardening (context state, on-demand loading, error boundaries)
- ⏳ Phase 5: Code Cleanup (remove console.logs, dead code)

## Project Purpose

Qanuni is a comprehensive legal practice management system (Legal ERP) built with Electron, React, and SQLite, targeting Lebanese law firms and the broader MENA region. Desktop-first strategy to prove concept before transitioning to web-based SaaS.

**Key Features:**
- Bilingual Arabic/English with RTL layout support
- Client and matter management with conflict checking
- Court scheduling with Lebanese court system integration
- Time tracking and sophisticated billing (hourly, fixed, retainer, success, hybrid)
- Corporate secretary functions (13 Lebanese entity types, share transfers, filings)
- Financial management (invoices, advances, expenses, reports)
- Offline-capable desktop application

## Technical Stack

**Core:**
- Electron 32.2.7 (desktop app framework)
- React 18 (frontend UI)
- SQLite via sql.js (embedded database)
- Tailwind CSS (styling)

**Development:**
- Node.js 20+
- VS Code with PowerShell (Windows)
- Git for version control
- electron-builder for distribution

**Architecture:**
```
qanuni/
├── main.js                      # App lifecycle (150 lines)
├── preload.js                   # IPC bridge
├── electron/
│   ├── database.js              # Atomic writes, transactions, integrity
│   ├── logging.js               # File-based logging (30-day retention)
│   ├── migrations.js            # 16 versioned migrations
│   ├── schema.js                # 27 tables + seed data
│   ├── validation.js            # Input validation schemas
│   ├── crash-recovery.js        # Crash handling + reports (NEW in v48.9)
│   └── ipc/                     # 21 modular IPC handlers
│       ├── clients.js           # 6 handlers
│       ├── lawyers.js           # 7 handlers
│       ├── matters.js           # 6 handlers
│       ├── diary.js             # 4 handlers
│       ├── hearings.js          # 4 handlers
│       ├── judgments.js         # 4 handlers
│       ├── deadlines.js         # 6 handlers
│       ├── tasks.js             # 4 handlers
│       ├── timesheets.js        # 5 handlers
│       ├── expenses.js          # 8 handlers
│       ├── advances.js          # 10 handlers
│       ├── invoices.js          # 8 handlers
│       ├── appointments.js      # 4 handlers
│       ├── lookups.js           # 9 handlers
│       ├── conflict-check.js    # 2 handlers
│       ├── corporate.js         # 24 handlers
│       ├── trash.js             # 5 handlers
│       ├── settings.js          # 22 handlers
│       ├── reports.js           # 12 handlers
│       ├── client-imports.js    # 2 handlers
│       └── license.js           # Fail-closed licensing
├── src/
│   ├── App.js                   # Main React app (~4,000 lines)
│   ├── constants/               # translations.js
│   ├── utils/                   # validators, formatDate, generateId
│   └── components/
│       ├── common/              # Shared components
│       ├── forms/               # ALL 13 form components
│       ├── lists/               # 11 list components
│       ├── modules/             # Full modules (Dashboard, Calendar, Reports)
│       └── corporate/           # Corporate Secretary UI
├── test-integration.js          # 117 integration tests
└── PATTERNS.md                  # Code standards and conventions
```

## Database Schema

**27 Tables:**
- Core: clients, lawyers, matters, hearings, judgments, deadlines
- Time & Billing: timesheets, expenses, advances, invoices
- Organization: tasks, appointments, matter_diary
- Corporate Secretary: corporate_entities, shareholders, directors, share_transfers, commercial_register_filings, company_meetings
- Lookups: 13 lookup tables for courts, entity types, etc.
- System: settings, schema_versions, conflict_check_log

**Key Features:**
- Foreign key constraints enabled
- Soft deletes (deleted_at column)
- Atomic writes with temp file + rename pattern
- WAL mode for crash safety
- Integrity checks on startup
- 16 versioned migrations tracked in schema_versions

## IPC Architecture (Post-Hardening)

**Pattern (all 21 modules follow this):**
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

**Error Handling:**
- Backend validates all inputs
- Returns `{ success: false, error: 'message' }` on failure
- All handlers wrapped with logging (`logger.wrapHandler`)
- Frontend checks `result.success` before proceeding

## Production Infrastructure (Phase 4 - v48.9)

### Migration System
- **File:** `electron/migrations.js`
- **Tracking:** schema_versions table records applied migrations
- **Safety:** Only runs pending migrations, idempotent
- **Logging:** All migration execution logged with timestamps

### Crash Recovery
- **File:** `electron/crash-recovery.js` (NEW in v48.9)
- **Handlers:** uncaughtException, unhandledRejection, before-quit
- **Actions:** Logs error → Force saves database → Generates crash report → Exits cleanly
- **Reports:** Saved to `%APPDATA%/Qanuni/logs/crash-TIMESTAMP.txt` with full context

### Logging System
- **File:** `electron/logging.js`
- **Location:** `%APPDATA%/Qanuni/logs/qanuni-YYYY-MM-DD.log`
- **Retention:** 30 days (auto-cleanup on startup)
- **Levels:** error, warn, info, debug
- **Features:** IPC wrapper, structured JSON, daily rotation

### Database Safety
- **Atomic Writes:** Temp file + rename (prevents corruption)
- **Integrity Checks:** PRAGMA integrity_check on startup
- **Transactions:** Multi-step operations wrapped in BEGIN/COMMIT
- **Crash Safety:** Force save before exit, WAL mode

## Build Commands
```powershell
# Development
npm run dev          # Production database
npm run dev:test     # Test database (--test-db flag)

# Testing
node test-integration.js              # Run 117 integration tests
node generate-test-data.js            # Generate 26K test records
node benchmark-performance.js         # Performance benchmarks
node test-ui-performance.js           # UI workflow tests

# Distribution
npm run dist:clean   # Clean build for testing
npm run dist         # Production build with obfuscation

# Post-distribution cleanup
git checkout preload.js   # Restore after dist (obfuscation modifies source)
```

## Critical Development Rules

### Testing First
```powershell
# MANDATORY before every commit
node test-integration.js    # Must show 117/117 passing
```

### IPC Pattern (Frontend → Backend)
```javascript
// ✅ CORRECT
const data = await window.electronAPI.functionName(param);

// ❌ WRONG
const data = await window.electron.invoke('channel-name', param);
```

### Database Column Naming (INCONSISTENT!)
| Table | English | Arabic |
|-------|---------|--------|
| lawyers | name | name_arabic |
| lookup_* | name_en | name_ar |
| clients | client_name | client_name_arabic |
| matters | matter_name | matter_name_arabic |

**⚠️ ALWAYS verify against `CREATE TABLE` in `electron/schema.js` before writing queries.**

**Lawyers special case:** DB stores `name`/`name_arabic`, queries alias to `full_name`/`full_name_arabic`, frontend sends `full_name`/`full_name_arabic`, validation uses `full_name`.

### React Hooks Rule
ALL hooks must be called BEFORE any early return (`if (!isOpen) return null`).

### Bilingual Display (Current Approach)
```javascript
// Lawyers
{language === 'ar' ? (l.full_name_arabic || l.full_name) : l.full_name}

// Lookups
{language === 'ar' ? item.name_ar : item.name_en}
```

### Form Locations
ALL forms live in `src/components/forms/` (13 forms). The old `src/forms/` directory was removed in v46.56.

### Encoding Safety
- NEVER use PowerShell for file edits with Arabic content
- Use Node.js scripts or VS Code only
- After batch file modifications, run Arabic integrity scan
- NEVER deliver full JS files containing Arabic text - use Node.js scripts with \uXXXX escapes

## Before Writing New Code

Always verify existing patterns:
```powershell
# Check IPC pattern
Select-String -Path "preload.js" -Pattern "similarFunction"

# Check table schema (MANDATORY)
Select-String -Path "electron\schema.js" -Pattern "CREATE TABLE.*tablename" -Context 0,15

# Check validation
Select-String -Path "electron\validation.js" -Pattern "entityType" -Context 0,10

# Check similar component
Get-ChildItem "src\components" -Recurse -Filter "*.js" | Select-String -Pattern "lawyers.map"
```

## Session Workflow (Claude Web + Claude Code)

### Claude Web Chat (Strategic Planning)
- Creates implementation plans with specs
- Designs data structures, schemas, function signatures
- Reviews outputs from Claude Code Chat
- Updates documentation (CLAUDE.md, KNOWN_FIXES.md)
- Makes go/no-go decisions

### Malek (Coordinator)
- Runs commands and tests
- Uploads files for review
- Relays between Claude Web and Claude Code
- Executes git commits when approved
- Makes final decisions on approach

### Claude Code Chat (Code Execution)
- Executes file operations
- Creates/modifies files per specs
- Runs encoding-safe operations
- Tests implementations locally

## Version History

- **v48.9** (Feb 11, 2026) - Phase 4 complete: Production infrastructure
- **v48.8** (Feb 11, 2026) - Phase 6: Scale testing (26K records validated)
- **v48.2** - Session 9: Context migration, on-demand loading
- **v47.0** - Phase 2 complete: Backend modularization (21 IPC modules)
- **v46.56** - Forms consolidated to src/components/forms/
- Earlier versions - Feature development, initial hardening

## Known Issues & Decisions

### Data Model Discussion Needed
- Multiple clients can be on same matter (needs discussion on data model)
- Currently matters have single client_id FK

### i18n Status
- Currently using inline ternaries for bilingual display
- Full Arabic UI deferred to post-distribution
- translations.js exists but incomplete/unused

### Deferred Features
- French language support (planned for MENA expansion)
- Document management integration
- Legal AI integration with Arabic law databases
- Cloud deployment (after desktop proves market)

## Next Steps

**Immediate (Phase 5 - Code Cleanup):**
- Remove console.log statements
- Delete dead code (TimeDropdown.js, old comments)
- Clean up unused imports
- Professional production build

**Short-term (Phase 3 - Frontend Hardening):**
- Context-based state management (replace 70+ useState)
- On-demand data loading per module
- React error boundaries
- Performance improvements

**Medium-term (Distribution):**
- Production build testing
- Installer creation
- User documentation
- Distribution checklist

## Success Metrics

**Scale Testing (Session 10):**
- 26,268 records generated
- Startup: 5.9ms (target: 3000ms) - 508x faster
- Module loading: 86.8ms max (target: 1000ms) - 11.5x faster
- All operations < 100ms
- Zero degradation under stress

**Integration Tests:**
- 117/117 passing (100% pass rate)
- Cover all 21 IPC modules
- Test database operations, validation, error handling

**Production Readiness:**
- ✅ No data loss on crash
- ✅ Database corruption detected
- ✅ All errors logged with context
- ✅ Crash reports generated
- ✅ Handles 10x current scale
- ✅ Sub-second response times

## Resources

- **QANUNI_HARDENING_STRATEGY.md** - 6-phase improvement plan
- **PATTERNS.md** - Code standards and conventions
- **KNOWN_FIXES.md** - Bug fixes and solutions
- **SESSION_XX_SUCCESS_REPORT.md** - Session completion reports
- Lebanese court system documentation - Legal compliance reference

---

*For detailed session reports, see SESSION_XX_SUCCESS_REPORT.md files in project root.*
