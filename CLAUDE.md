# Qanuni Project Overview

**Version:** v49.8 (License System Production-Ready)
**Status:** Production-ready, installer created
**Last Updated:** February 12, 2026 (Session 19)

## Current State

**Architecture:** Modular, hardened, production-grade, professional codebase
- **Backend:** 21 IPC modules, 163 handlers, fully tested
- **Database:** SQLite with atomic writes, migrations, integrity checks, crash recovery
- **Tests:** 118 integration tests passing (100% pass rate)
- **Scale:** Validated with 26,268 records, 5-508x faster than targets
- **Infrastructure:** Migration versioning, crash recovery, file-based logging
- **Code Quality:** 32,332 lines of dead code removed, zero console.log in production

**Distribution:**
- Windows installer created: `Qanuni Setup 1.0.0.exe` (105 MB)
- NSIS installer with desktop/Start Menu shortcuts
- Tested unpacked build - fully functional
- Ready for end-user installation testing

**Completed Phases (QANUNI_HARDENING_STRATEGY.md):**
- ✅ Phase 1: Data Safety (atomic writes, proper IDs, validation)
- ✅ Phase 2: Modular Backend (21 IPC modules, clean separation)
- ✅ Phase 3: Frontend Hardening (zero useState, context-based, user-friendly errors)
- ✅ Phase 4: Production Infrastructure (migrations, integrity checks, crash recovery)
- ✅ Phase 5: Code Cleanup (removed dead code, console.log statements)
- ✅ Phase 6: Scale Testing (26K records validated)

**All 6 Hardening Phases Complete - Production Ready!**

**Phase 3 Frontend Hardening:** ✅ COMPLETE
- ✅ Error Boundary implemented (wraps main content, Electron logging)
- ✅ AppContext complete (language, module, sidebar)
- ✅ DataContext partial (lawyers, lookups)
- ✅ Financial error handling (v49.5) - all critical ops validate
- ✅ Dead code cleanup (v49.6) - removed 161 lines
- ✅ UI bug fixes (v49.7) - DATE capitalization, dropdown prompts
- ⏸️ Full context migration deferred (performance already 508x targets)
- ⏸️ On-demand loading deferred (not blocking launch)

**Licensing System (Production-Ready):**
The desktop licensing enforcement is fully implemented and tested. License activation flow includes:
- LicenseScreen component with machine ID display and copy button
- Settings > License tab showing status, expiry, machine ID, and deactivation
- Startup license check with fail-closed gate (blocks app if unlicensed)
- Grace period warnings (30/7/1 day alerts, 7-day grace after expiry)
- License persistence verified across restarts (%APPDATA%/qanuni/license.key)
- HTML keygen tool (licensing/keygen.html) for customer license management
- Production LICENSE_SALT implemented (all dev keys invalidated)
- Security: Keygen tools excluded from installer distribution

All license IPC handlers fixed: validateAndActivate() creates keys atomically,
return shapes normalized for frontend compatibility. Integration tests: 118/118 passing.

**Production Readiness:**
- ✅ Licensing system built and enforced (license-manager.js, IPC handlers, UI)
- ✅ Pricing strategy defined (Desktop: $199/year, Web: $10-149/month tiered)
- ✅ Integration models decided (Desktop-first, Web-only, Hybrid options)
- ✅ License enforcement connected to UI (Session 19)
- ✅ Activation UI built (LicenseScreen, Settings tab, warnings)
- ⚠️ Icon assets need verification
- ⚠️ User documentation minimal

**Next:** Session 20 - Installer Testing & Pre-Launch Polish (verify dist build, user docs, icon check)

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
- Electron 28.3.3 (desktop app framework)
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
│   ├── crash-recovery.js        # Crash handling + reports
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
├── licensing/                   # License system (renamed from LICENSE/)
│   ├── license-manager.js      # Runtime validation (ships in installer)
│   ├── keygen.html             # Admin tool - HTML UI (excluded from build)
│   ├── key-generator.js        # Admin tool - CLI (excluded from build)
│   └── issued-licenses.json    # License log (excluded from build)
├── src/
│   ├── App.js                   # Main React app (~4,000 lines)
│   ├── constants/               # translations.js
│   ├── utils/                   # validators, formatDate, generateId
│   └── components/
│       ├── common/              # Shared components
│       │   ├── LicenseScreen.js        # Activation dialog (startup gate)
│       │   └── LicenseWarningBanner.js # Expiry warnings
│       ├── forms/               # ALL 13 form components
│       ├── lists/               # 11 list components
│       ├── modules/             # Full modules (Dashboard, Calendar, Reports)
│       │   └── SettingsModule.js       # Includes License tab (view/deactivate)
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

## Production Infrastructure (Phase 4)

### Migration System
- **File:** `electron/migrations.js`
- **Tracking:** schema_versions table records applied migrations
- **Safety:** Only runs pending migrations, idempotent
- **Logging:** All migration execution logged with timestamps

### Crash Recovery
- **File:** `electron/crash-recovery.js`
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

## Code Quality (Phase 5)

**Cleanup Completed:**
- Removed 20 dead files (32,332 lines of code)
- Deleted duplicate forms directory (`src/forms/`)
- Removed archive directories and old backups
- Deleted one-time migration scripts
- Removed all console.log from production code (5 statements)
- Preserved intentional console.error/warn for error handling
- Professional, distribution-ready codebase

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
npm run dist:clean   # Build unpacked (for testing, faster)
npm run dist         # Build installer (Qanuni-Setup-1.0.0.exe)
npm run dist:win     # Build Windows installer (explicit)

# Note: dist scripts run react-scripts build first, then electron-builder

# Post-distribution cleanup (if needed)
git checkout preload.js main.js   # Restore if modified by build process
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
ALL forms live in `src/components/forms/` (13 forms). The old `src/forms/` directory was removed in v49.0 (Phase 5).

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

## Distribution Files

**Created in Session 14:**
- `LICENSE` - Copyright © 2026 Malek Kallas (placeholder for EULA)
- `README.md` - Complete project documentation  
- `electron-builder.yml` - Build configuration
- `dist/Qanuni Setup 1.0.0.exe` - Windows installer (105 MB)

**Build Process:**
1. `react-scripts build` - Compiles React app to `build/`
2. `electron-builder` - Packages app with whitelisted files only
3. Output: NSIS installer with shortcuts and uninstaller

**Packaged Files (Whitelist):**
- `build/**/*` - React production output
- `main.js`, `preload.js` - Electron entry points
- `electron/**/*` - Backend modules
- `licensing/license-manager.js` - License validation (only runtime file shipped)
- `node_modules/**/*` - Runtime dependencies
- `package.json` - Package metadata

**Excluded from Package:**
- ❌ `src/` - Raw React source (not needed)
- ❌ `public/` - React templates (build/ has compiled version)
- ❌ `server/` - REST API (not needed for desktop)
- ❌ All .md files, test files, backups

## Version History

- **v49.8** (Feb 12, 2026) - Session 19: License system production-ready (activation UI, startup gate, grace periods, HTML keygen, production salt)
- **v49.7** (Feb 12, 2026) - Session 18: UI polish (DATE capitalization, dropdown prompt standardization)
- **v49.6** (Feb 12, 2026) - Session 17: Dead code cleanup (161 lines removed, unused imports)
- **v49.5** (Feb 12, 2026) - Session 16: Financial error handling (6 components hardened against silent failures)
- **v49.3** (Feb 12, 2026) - Session 15: Icon integration (icon.ico created, configs updated, BrowserWindow icon added)
- **v49.2** (Feb 12, 2026) - Session 14: Distribution ready (installer created)
- **v49.1** (Feb 11, 2026) - Phase 3 complete: Frontend hardening (zero useState, context-based state)
- **v49.0** (Feb 11, 2026) - Phase 5 complete: Code cleanup (32K lines removed)
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

### Key Learnings & Principles (Licensing)
- Desktop licensing requires fail-closed design patterns where errors default to blocking access
- Atomic operations (validate + save together) prevent partial activation states
- Return shape normalization ensures frontend compatibility when multiple code paths exist
- HTML keygen tools can achieve full crypto compatibility with Node.js backends using pure JavaScript implementations of MD5/Base64
- LICENSE_SALT must be synchronized across all keygen implementations (license-manager.js, key-generator.js, keygen.html)
- Machine-bound licenses prevent key sharing but require support workflow for hardware changes
- Grace periods (7 days) provide good UX during renewal without compromising security

## Next Steps

**Immediate (Session 20):**
- Installer testing and verification (`npm run dist:clean`)
- Create user documentation (README.txt for end users, KEYGEN_USAGE.md for internal)
- Final pre-launch polish (icon verification, optional code signing)
- First customer activation test (end-to-end keygen -> install -> activate)

**v1.0 Launch Blockers:**
- ✅ Desktop licensing enforcement (Session 19 complete)
- Icon files verified/created
- Basic user documentation (README.txt)
- Test installer generation with licensing
- First customer activation test

**Post-v1.0 (6-12 months):**
- Web version development (after 50+ desktop installations)
- French language support for broader MENA market penetration
- Enhanced corporate secretary functionality
- Integration capabilities (Dropbox/OneDrive)
- Session limits + anomaly detection for password sharing
- Multi-user web tiers ($10-149/month)
- Desktop-web integration (Option A: included web access)

## Success Metrics

**Scale Testing (Session 10):**
- 26,268 records generated
- Startup: 5.9ms (target: 3000ms) - 508x faster
- Module loading: 86.8ms max (target: 1000ms) - 11.5x faster
- All operations < 100ms
- Zero degradation under stress

**Integration Tests:**
- 118/118 passing (100% pass rate)
- Cover all 21 IPC modules + license handlers
- Test database operations, validation, error handling

**Code Quality (Session 12):**
- 32,332 lines of dead code removed
- Zero console.log in production code
- Professional, maintainable codebase
- Distribution-ready

**Production Readiness:**
- ✅ No data loss on crash
- ✅ Database corruption detected
- ✅ All errors logged with context
- ✅ Crash reports generated
- ✅ Handles 10x current scale
- ✅ Sub-second response times
- ✅ Clean, professional codebase
- ✅ Windows installer created

## Resources

- **QANUNI_HARDENING_STRATEGY.md** - 6-phase improvement plan
- **PATTERNS.md** - Code standards and conventions
- **KNOWN_FIXES.md** - Bug fixes and solutions
- **SESSION_XX_SUCCESS_REPORT.md** - Session completion reports
- Lebanese court system documentation - Legal compliance reference

### Licensing Tools
- **licensing/keygen.html** - HTML UI for generating keys, viewing history, search/filter, and JSON export/import
- **licensing/key-generator.js** - CLI backup tool with interactive mode (`-i` flag)
- **licensing/license-manager.js** - Runtime validation: machine fingerprinting (CPU+hostname+MAC+username), checksum validation (MD5), expiry checking with grace periods
- Both keygen tools use same cryptographic salt and algorithms
- License persistence uses `%APPDATA%/qanuni/license.key` for Windows installations

## Session Notes

Proactively report conversation context status (% used) every 5-6 exchanges, alert
at 70% to create checkpoint. At end of sessions with major structural changes,
update CLAUDE.md in project root. When fixing recurring bugs, update KNOWN_FIXES.md
with version, cause, fix, and test case.

Session 19 completed licensing system implementation (v49.8). All keygen tools
excluded from installer for security. Production LICENSE_SALT active - all previous
development keys invalidated.

---

*For detailed session reports, see SESSION_XX_SUCCESS_REPORT.md files in project root.*