# QANUNI - Legal Practice Management System

## Project Overview
Desktop-first legal ERP application for Lebanese law firms and MENA region. Built with Electron, React, SQLite, and Tailwind CSS. English UI with full Unicode support for Arabic data entry.

**Current Version:** v48.2-session2-batch4-complete
**Last Updated:** February 10, 2026
**Status:** Session 2 IN PROGRESS - 81% complete (17/21 modules refactored)

**STRATEGIC SHIFT VALIDATED (Feb 10, 2026):** REST API foundation built successfully.
Dual-mode architecture (Electron + Web) proven with clients module.
Pattern validated, scaling to all 21 modules.

**Session 1 Complete (Feb 10, 2026):**
- ✅ Clients module refactored to dual-mode (IPC + REST)
- ✅ Express API server operational (port 3001)
- ✅ Database init() supports both Electron and Node.js modes
- ✅ Schema auto-loads in REST API mode
- ✅ 6 REST endpoints tested and working
- ✅ Integration tests: 117/117 passing
- ✅ Desktop app: fully backward compatible
- ✅ Tag: v48.2-session1-rest-api

**Session 2 Progress (Feb 10, 2026) - 81% Complete:**
- ✅ Batch 1: matters, hearings, tasks, timesheets, expenses (5 modules, 27 handlers)
- ✅ Batch 2: advances, invoices, judgments, appointments (4 modules, 26 handlers)
- ✅ Batch 3: deadlines, diary, lawyers (3 modules, 17 handlers)
- ✅ Batch 4: lookups, conflict-check, settings, client-imports (4 modules, 26 handlers)
- ✅ 17/21 modules refactored (81%)
- ✅ ~109/163 REST endpoints working (67%)
- ✅ Integration tests: 117/117 passing (0 regressions)
- ✅ 17 commits this session
- ✅ Tag: v48.2-session2-batch4-complete

**Immediate Work:** Session 2 - Batch 5 (FINAL batch, ~2-3 hours)
- corporate.js (24 handlers) - largest remaining module
- reports.js (~12 handlers)
- trash.js (5 handlers)
- license.js (special case - decision needed)

**Next Sessions:**
- Session 3: Web frontend (2-3 hours)
- Session 4: Automated browser testing (2-3 hours)
- Session 5: Bug fixes + finish Phase 3c (3-4 hours)

**Context tracking:** Alert at 75% to create checkpoint

**App.js Lines:** ~1,690 (cleaned in v48)
**App.js useState:** 33 (Phase 3c.7a Step 1 complete, target: 10)

> **Architectural Pattern (v48):** English UI with Unicode data support. Arabic data columns (`client_name_arabic`, `name_arabic`, `matter_name_arabic`) are retained for bilingual data entry – these store real user data, not UI translations. The UI translation layer (`translations.js`, `t[language]`, `language === 'ar'` ternaries, `isRTL` conditionals) has been fully removed.

---

## Tech Stack
- **Frontend:** React 18, Tailwind CSS
- **Backend:** Electron, Node.js
- **REST API:** Express.js (NEW - Sessions 1-2)
- **Database:** SQLite (via sql.js)
- **Icons:** Lucide React
- **Reports:** ExcelJS (spreadsheets), custom PDF generation
- **Testing:** Custom integration test harness (test-integration.js)
- **i18n:** English UI only (v48). Arabic data columns retained for bilingual data entry.

---

## Hardening Strategy (Active)

The codebase was rebuilt layer by layer from a working v46.56 base into production-grade architecture. See `QANUNI_HARDENING_STRATEGY.md` for the full audit and rationale.

### Key Problems Fixed
| Problem | Risk | Status |
|---------|------|--------|
| Debounced DB saves (500ms delay) | Data loss on crash | **Fixed** - Phase 1 |
| `runQuery` returns `[]` on error | Silent failures, missed court dates | **Fixed** - Phase 1 |
| Direct `fs.writeFileSync` (no atomic write) | DB corruption on power loss | **Fixed** - Phase 1 |
| `Math.random() * 10000` IDs | Collisions at scale (~100+ entities) | **Fixed** - Phase 1 |
| No backend input validation | Garbage data in DB | **Fixed** - Phase 1 |
| No transaction support | Partial writes on multi-step ops | **Fixed** - Phase 1 |
| main.js = 6,791 lines | Unmaintainable monolith | **Fixed** - Phase 2 (replaced with 21 modules) |
| No file-based logging | Can't investigate bugs | **Fixed** - Phase 1 |
| No integration tests | Bugs found by UI clicking | **Fixed** - v47.0 (117 automated tests) |
| No error boundaries in React | One crash kills entire app | **Fixed** - v47.1 (ErrorBoundary added) |
| License fail-open on errors | Security risk | **Fixed** - v47.1 (fail-closed) |
| Bilingual UI architecture | Wrong abstraction, 1,500 lines debt | **COMPLETE** - v48: 42 files refactored, -1,913 lines, translations.js deleted |
| Electron-only architecture | Can't test in browser, no web version | **IN PROGRESS** - Session 2: 109/163 endpoints (67%) |
| All data loaded at startup | Slow at scale | **Phase 3c - PAUSED** (resuming after REST API) |
| App.js = 123 useState calls | God component, re-render hell | **Phase 3c - IN PROGRESS** (33 now, target 10) |

### Phase Status
| Phase | Goal | Status |
|-------|------|--------|
| **Phase 1: Data Layer** | Atomic writes, safe IDs, validation, logging, transactions | **COMPLETE** |
| **Phase 2: Split main.js** | Extract 163 IPC handlers into modular files | **COMPLETE** - 21 modules, 117 tests passing |
| **Phase 3a: Frontend Critical** | Error boundaries, license fix, API wrapper | **COMPLETE** - v47.1 |
| **Phase 3b: Simplification** | Remove bilingual UI architecture (-1,500 lines) | **COMPLETE** - v48: 42 files, -1,913 lines, 8 commits, translations.js deleted |
| **Phase 3c: State & Loading** | Context state, on-demand loading | **PAUSED AT STEP 1** - 33 useState achieved, resuming after REST API |
| **REST API (Option C)** | Web foundation + automated testing | **SESSION 2 IN PROGRESS** - 17/21 modules (81%), 109/163 endpoints (67%) |
| **Phase 4: Production Infra** | Migration versioning, integrity checks, crash recovery | Planned |
| **Phase 5: Clean Up** | Remove console.log, dead code, unused files | Planned |
| **Phase 6: Scale Testing** | 500 clients, 1000 matters, 5000 timesheets benchmark | Planned |

---

## REST API Development - Session 2 IN PROGRESS

### Session 1: Proof of Concept ✅ COMPLETE (Feb 10, 2026)

**Goal:** Validate dual-mode architecture with one module  
**Result:** ✅ PROVEN - Pattern works perfectly

**What was built:**
- Refactored `electron/ipc/clients.js` to dual-mode
- Created `server/api-server.js` (Express server)
- Created `server/routes/clients.js` (REST endpoints)
- Fixed `electron/database.js` for dual-mode init
- Added schema loading to API server

**Files changed:** 6 files (+559/-108 lines)  
**Tag:** v48.2-session1-rest-api

**Test results:**
- Integration tests: 117/117 ✅
- Desktop app: All client CRUD working ✅
- REST API: 6/6 endpoints operational ✅

**Endpoints operational:** 6/163 (4% complete)

### Session 2: Batch Refactoring ⏳ 81% COMPLETE (Feb 10, 2026)

**Goal:** Refactor remaining 20 modules  
**Estimated time:** 6-8 hours total  
**Approach:** 5 batches + route organization + documentation

**Progress:**
- ✅ Batch 0: POC (clients) - 6 handlers
- ✅ Batch 1: Core entities (matters, hearings, tasks, timesheets, expenses) - 27 handlers
- ✅ Batch 2: Financial (advances, invoices, judgments, appointments) - 26 handlers
- ✅ Batch 3: Scheduling (deadlines, diary, lawyers) - 17 handlers
- ✅ Batch 4: Settings (lookups, conflict-check, settings, client-imports) - 26 handlers
- ⏳ Batch 5: Corporate/Reports (corporate, reports, trash, license) - ~41 handlers

**Current status:**
- 17/21 modules refactored (81%)
- ~109/163 REST endpoints working (67%)
- 117/117 integration tests passing
- 17 commits this session
- Zero regressions

**Remaining work (Batch 5):**
- corporate.js (24 handlers) - 1-1.5 hours
- reports.js (~12 handlers) - 30-45 min
- trash.js (5 handlers) - 15-20 min
- license.js (special case) - 15-30 min

**Tag:** v48.2-session2-batch4-complete

**See:** SESSION_2_CHECKPOINT_BATCH4.md for detailed progress

---

## Session History

### Session 1: REST API Backend - Proof of Concept ✅
**Date:** February 10, 2026  
**Duration:** ~4 hours  
**Tag:** v48.2-session1-rest-api

**Achievements:**
- ✅ Dual-mode architecture pattern proven
- ✅ Clients module refactored successfully
- ✅ Express API server operational
- ✅ Database dual-mode init working
- ✅ 6 REST endpoints tested and functional
- ✅ Zero regressions (117/117 tests passing)

**Key learnings:**
- Preserve factory function + dependency injection pattern
- Extract business logic into pure functions
- Use exact SQL from working version (no assumptions)
- Support both environments in database init
- Replicate schema loading logic for API server

**See:** SESSION_1_CHECKPOINT.md for full details

### Session 2: Batch Refactoring ⏳ IN PROGRESS
**Date:** February 10, 2026 (ongoing)  
**Duration:** ~6 hours so far  
**Goal:** Refactor remaining 20 modules to dual-mode

**Progress:**
- ✅ Batches 0-4 complete (17/21 modules, 81%)
- ⏳ Batch 5 remaining (4 modules, 19%)
- ✅ ~109/163 REST endpoints operational
- ✅ 117/117 integration tests passing
- ✅ Zero regressions introduced

**Tag:** v48.2-session2-batch4-complete (current checkpoint)

**See:** SESSION_2_CHECKPOINT_BATCH4.md for detailed status

---

## Project Structure (v48.2-session2-batch4-complete)

```
C:\Projects\qanuni\
├── main.js                         # Electron entry point (~150 lines)
├── preload.js                      # IPC bridge (163 channels)
├── package.json
│
├── electron/
│   ├── database.js                 # Dual-mode DB (Electron + Node.js)
│   ├── logging.js                  # File-based logging
│   ├── validation.js               # Input validation schemas
│   ├── migrations.js               # Versioned DB migrations
│   ├── schema.js                   # 27 CREATE TABLE statements
│   └── ipc/                        # 21 IPC modules (dual-mode)
│       ├── clients.js              ✅ 6 handlers
│       ├── matters.js              ✅ 6 handlers
│       ├── hearings.js             ✅ 4 handlers
│       ├── tasks.js                ✅ 4 handlers
│       ├── timesheets.js           ✅ 5 handlers
│       ├── expenses.js             ✅ 8 handlers
│       ├── advances.js             ✅ 10 handlers
│       ├── invoices.js             ✅ 8 handlers
│       ├── judgments.js            ✅ 4 handlers
│       ├── appointments.js         ✅ 4 handlers
│       ├── deadlines.js            ✅ 6 handlers
│       ├── diary.js                ✅ 4 handlers
│       ├── lawyers.js              ✅ 7 handlers
│       ├── lookups.js              ✅ 9 handlers
│       ├── conflict-check.js       ✅ 2 handlers
│       ├── settings.js             ✅ 14 data handlers (+ 10 Electron-only)
│       ├── client-imports.js       ✅ 1 data handler (+ 1 Electron-only)
│       ├── corporate.js            ⏳ ~24 handlers
│       ├── reports.js              ⏳ ~12 handlers
│       ├── trash.js                ⏳ 5 handlers
│       └── license.js              ⏳ Special case
│
├── server/                         # REST API (NEW - Sessions 1-2)
│   ├── api-server.js               # Express app, ~109 endpoints
│   └── routes/                     # Route modules
│       ├── clients.js              ✅ 6 REST endpoints
│       ├── matters.js              ✅ 6 REST endpoints
│       ├── hearings.js             ✅ 4 REST endpoints
│       ├── tasks.js                ✅ 4 REST endpoints
│       ├── timesheets.js           ✅ 5 REST endpoints
│       ├── expenses.js             ✅ 8 REST endpoints
│       ├── advances.js             ✅ 10 REST endpoints
│       ├── invoices.js             ✅ 8 REST endpoints
│       ├── judgments.js            ✅ 4 REST endpoints
│       ├── appointments.js         ✅ 4 REST endpoints
│       ├── deadlines.js            ✅ 6 REST endpoints
│       ├── diary.js                ✅ 4 REST endpoints
│       ├── lawyers.js              ✅ 7 REST endpoints
│       ├── lookups.js              ✅ 9 REST endpoints
│       ├── conflict-check.js       ✅ 2 REST endpoints
│       ├── settings.js             ✅ 14 REST endpoints
│       └── client-imports.js       ✅ 1 REST endpoint
│
├── src/                            # React frontend
│   ├── App.js                      # ~1,690 lines, 33 useState
│   ├── constants/
│   ├── utils/
│   └── components/
│       ├── common/                 # Shared components
│       ├── forms/                  # 13 form components
│       ├── lists/                  # 11 list components
│       ├── modules/                # Dashboard, Calendar, Reports, etc.
│       ├── corporate/              # Corporate Secretary
│       └── reports/corporate/      # Corporate reports
│
└── test-integration.js             # 117 automated tests
```

---

## Development Workflow

You work with **TWO separate Claude chat interfaces** simultaneously:

#### **1. Claude Web Chat** (claude.ai - where strategic planning happens)
- **What it is:** The main claude.ai web interface
- **What it's for:**
  - Session planning & multi-phase strategy
  - Reviewing architecture decisions and trade-offs
  - Creating complex scripts and documentation
  - Long-form explanations and learning
  - Checkpoint creation and handoff documents
  - Analyzing patterns across multiple sessions
  - Maintaining context across long refactoring efforts (up to 190K tokens)

#### **2. Claude Code Chat** (separate chat for project execution)
- **What it is:** A separate Claude chat interface with direct access to your project filesystem
- **What it's for:**
  - Executing commands directly in project folder
  - Running tests (`node test-integration.js`)
  - File refactoring with real-time diffs
  - Git operations (branch, commit, diff, status)
  - File system verification and batch operations
  - Quick iterations on code changes
  - Viewing file contents without manual upload
  - Running dry-runs and generating reports

#### **How They Work Together (Copy/Paste Between Chats):**

**You act as the bridge** between the two chats by copying/pasting content between them.

---

### Session Start
1. State what to build or fix
2. Upload relevant files to Claude Web Chat (checkpoint docs, specific components if needed)
3. Use Claude Code Chat to verify baseline: `node test-integration.js`

### During Development
- Use **Claude Code Chat** for file editing and script execution (preserves UTF-8 encoding)
- Work incrementally - one module/batch at a time
- Use **Claude Code Chat** to run `node test-integration.js` after backend changes
- Use **Claude Code Chat** to test UI with `npm run dev`
- Return to **Claude Web Chat** for analysis and next steps

### Session End
1. **Claude Code Chat**: Run `node test-integration.js` - must pass
2. **Claude Code Chat**: Git commit with descriptive message and version tag
3. **Claude Web Chat**: Create checkpoint document if major feature/refactoring completed
4. **Claude Web Chat**: Update CLAUDE.md with new status/version info

### Rules
- NEVER use PowerShell for file edits - use Node.js scripts, VS Code, or **Claude Code Chat**
- ALWAYS run `node test-integration.js` before committing (delegate to Claude Code Chat)
- ALWAYS commit before `npm run dist`
- Check KNOWN_FIXES.md before refactoring components
- For Arabic text changes: use Node.js scripts with `\uXXXX` Unicode escapes
- Run `node arabic-scan.js` after any batch file operations (delegate to Claude Code Chat)
- **OUTPUT FILES BEFORE HITTING CONTEXT LIMITS** - don't lose work
- **Use Claude Code Chat for executing scripts** - faster than download/run/upload cycle
- **Use Claude Web Chat for coordinating multi-step refactoring** - better context retention

---

## Testing

### Integration Test Harness
```powershell
node test-integration.js    # Run all 117 tests (~2 seconds)
```

The test harness validates all 163 IPC handlers without launching Electron:
- Creates in-memory SQLite database
- Loads schema.js (27 tables + seed data)
- Loads all 21 IPC modules with mocked Electron APIs
- Verifies all 161 preload channels have registered handlers
- Runs CRUD tests for every entity type
- Validates response shapes (arrays, IDs, joins)
- Checks dialog/export channels are registered

**Rule: Run `node test-integration.js` before every commit. All tests must pass.**

---

## Build Commands

```powershell
npm run dev          # Development (production DB)
npm run dev:test     # Development (test DB via --test-db flag)
npm run api          # Start REST API server (Session 1+)
npm run dev:web      # Start API + desktop app together (Session 2+)
npm run dist:clean   # Build for testing
npm run dist         # Build for release

# MANDATORY before commit:
node test-integration.js  # Must show 0 failures

# After dist builds:
git checkout preload.js   # Restore if modified by build
```

---

## Version History (Recent)

| Version | Date | Changes |
|---------|------|---------|
| **v48.2-session2-batch4-complete** | **Feb 10, 2026** | **REST API Session 2 - 81% COMPLETE** - Batches 0-4 complete (17/21 modules refactored). 109/163 REST endpoints operational (67%). Integration tests: 117/117. Zero regressions. Modules: clients, matters, hearings, tasks, timesheets, expenses, advances, invoices, judgments, appointments, deadlines, diary, lawyers, lookups, conflict-check, settings, client-imports. See SESSION_2_CHECKPOINT_BATCH4.md. 17 commits this session. |
| **v48.2-session1-rest-api** | **Feb 10, 2026** | **REST API Session 1 COMPLETE** - Proof of concept successful. Clients module refactored to dual-mode (IPC + REST). Express API server operational with 6 endpoints. Database dual-mode init working. Integration tests: 117/117. Desktop app: fully backward compatible. Pattern proven, ready to scale. See SESSION_1_CHECKPOINT.md. |
| **v48.2-option-c** | **Feb 10, 2026** | **STRATEGIC SHIFT** - Pausing Phase 3c.7a at Step 1 to build REST API foundation. Option C execution: web version infrastructure + comprehensive automated testing. Sessions 1-4 planned (10-12 hours total). Phase 3c.7a Steps 2-4 will resume in Session 5. See SESSION_1_REST_API_PLAN.md. |
| **v48.2-phase3c.6** | **Feb 10, 2026** | Phase 3c.6 COMPLETE - ReportContext + DialogContext migration + 16 backend bugs fixed. App.js: 35 useState (-72% from baseline). Fixed 11 Client 360 bugs, 2 XLSX import bugs, 1 Invoice Aging bug, 2 frontend null safety bugs. See PHASE3C_CHECKPOINT_MODALS_COMPLETE.md. |
| **v48.0** | **Feb 9, 2026** | **COMPLETE** - Bilingual UI removal. 42 files refactored across 8 commits, -1,913 net lines. translations.js deleted. 7 batches: Forms (13), Lists (10), Modules (7), Corporate (2), Common (4), Reports/Corporate (4), Final cleanup (9). Arabic data columns retained (user data, not UI). v48-verify.js: 60/61 clean, 0 errors. See v48_COMPLETION_CHECKPOINT.md. |
| v47.1 | Feb 9, 2026 | PHASE 3 PARTIAL - ErrorBoundary added (prevents white screens), license fail-closed (was fail-open), API wrapper created (not yet adopted), MatterForm Arabic field reverted. Critical architectural decision: v48 will remove bilingual UI (~1,500 lines) and align with industry standards. |
| v47.0 | Feb 9, 2026 | HARDENED BASELINE - Phase 2 complete. Old 6,791-line main.js replaced with 21 modular IPC modules. 163 handlers, 117 integration tests. Validation fix: lawyer schema `name` -> `full_name`. |

---

## Known Issues / TODO

### REST API Development (ACTIVE - Session 2 Batch 5 Next)

**Session 2: Batch 5 - FINAL BATCH (~2-3 hours)**
- [ ] corporate.js (24 handlers) - 1-1.5h
- [ ] reports.js (~12 handlers) - 30-45min
- [ ] trash.js (5 handlers) - 15-20min
- [ ] license.js (special case) - 15-30min
- [ ] API_ENDPOINTS.md documentation
- [ ] Final: 163 REST endpoints operational

**Session 3: Web Frontend (2-3 hours)**
- [ ] Create src/api-client.js (unified API layer)
- [ ] Environment detection (Electron vs Browser)
- [ ] Modify App.js to use apiClient
- [ ] React app runs in browser (localhost:3000)
- [ ] Test all 11 modules in web version

**Session 4: Automated Testing (2-3 hours)**
- [ ] Claude automates browser testing (all modules)
- [ ] Generate comprehensive test report
- [ ] Document all bugs found

**Session 5: Bug Fixes + Complete Phase 3c (3-4 hours)**
- [ ] Fix bugs from Session 4
- [ ] Resume Phase 3c.7a Steps 2-4
- [ ] CalendarContext (2 states)
- [ ] DataContext (8 states)
- [ ] EntityDataContext (13 states)
- [ ] Target: 10 useState in App.js (92% reduction)

---

### Phase 4-6 (Infrastructure + Polish) - After REST API

- Migration versioning with schema_versions table
- DB integrity checks on startup
- Crash recovery
- Remove dead code, console.log
- Scale testing (500 clients, 1000 matters, 5000 timesheets)
- Delete unused TimeDropdown.js

### Future (Post-Hardening)

- Proper i18n framework (react-i18next) IF expanding to Francophone markets
- French language support (but keep single data fields!)
- Document management integration
- AI integration (Qanuni AI - Arabic legal document processing)
- Web version deployment (after Sessions 1-4)
- Auto-update mechanism for distribution
- Advanced conflict checking

---

*Last updated: February 10, 2026 - v48.2-session2-batch4-complete. REST API Session 2 - 81% complete, Batch 5 (final) next.*
