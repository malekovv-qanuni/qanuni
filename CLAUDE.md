# QANUNI - Legal Practice Management System

## Project Overview
Desktop-first legal ERP application for Lebanese law firms and MENA region. Built with Electron, React, SQLite, and Tailwind CSS. English UI with full Unicode support for Arabic data entry.

**Current Version:** v48.2-session3-phase2
**Last Updated:** February 11, 2026
**Status:** Session 3 Phase 2 COMPLETE - App.js migrated to apiClient (testing pending)

**REST API COMPLETE (Feb 10, 2026):** 21/21 modules refactored, 137/163 REST endpoints operational.
Dual-mode architecture (Electron + Web) proven and scaled. Desktop app fully backward compatible.

**Session 2 Complete (Feb 10, 2026):**
- ✅ All 21 IPC modules refactored to dual-mode (IPC + REST)
- ✅ 137 REST endpoints operational (84% complete)
- ✅ Express API server production-ready (port 3001)
- ✅ Integration tests: 117/117 passing
- ✅ Desktop app: Zero regressions
- ✅ Tag: v48.2-session2-complete

**Session 3 Phase 1 Complete (Feb 11, 2026):**
- ✅ Created src/api-client.js (856 lines, 156 methods)
- ✅ 137 dual-mode methods (Electron + Web)
- ✅ 19 Electron-only stubs
- ✅ Tag: v48.2-session3-phase1

**Session 3 Phase 2 Complete (Feb 11, 2026):**
- ✅ Migrated App.js to apiClient (66 calls replaced)
- ✅ Zero window.electronAPI calls remaining
- ✅ Incremental execution (8 steps, ~1 hour)
- ✅ Tag: v48.2-session3-phase2
- ⏳ Desktop testing pending

**Immediate Work:** Session 3 - Testing & Phase 3
- Test desktop mode (verify App.js migration works)
- If tests pass: Phase 3 - Update 30 component files
- Incremental execution (batches of 5-7 files)

**Next Sessions:**
- Session 3 Phases 2-6: Web frontend completion (3-4 hours)
- Session 4: Automated browser testing (2-3 hours)
- Session 5: Bug fixes + finish Phase 3c (3-4 hours)

**Context tracking:** Alert at 75% to create checkpoint

**App.js Lines:** ~1,690 (cleaned in v48)
**App.js useState:** 33 (Phase 3c.7a Step 1 complete, target: 10)

> **Architectural Pattern (v48):** English UI with Unicode data support. Arabic data columns (`client_name_arabic`, `name_arabic`, `matter_name_arabic`) are retained for bilingual data entry – these store real user data, not UI translations. The UI translation layer (`translations.js`, `t[language]`, `language === 'ar'` ternaries, `isRTL` conditionals) has been fully removed.

---

## 🔄 TWO-CHAT WORKFLOW (CRITICAL - READ FIRST)

### Overview
Development uses TWO Claude instances working together:
1. **Claude Web Chat** (this chat) - Strategic planning, breaking down work
2. **Claude Code Chat** (separate tool) - File operations, code execution
3. **Malek** (you) - Bridge between the two

### Role Definitions

**Claude Web Chat (Strategic) - ME:**
- Provides architectural guidance and planning
- Breaks complex tasks into small, executable steps
- **Provides ONE step at a time** (50-100 lines max)
- Waits for user confirmation ("done", "next") before providing next step
- **NEVER** provides multiple steps at once
- **NEVER** tells user to upload files to Code Chat
- Each step must be copy-paste ready for Code Chat

**Claude Code Chat (Execution) - NOT ME:**
- Performs file operations (create, edit, move files)
- Executes code and commands
- Receives instructions FROM user (copied from Web Chat)
- Works on one step at a time

**Malek (Bridge) - YOU:**
- Gets one step from Web Chat (me)
- Copies step to Code Chat for execution
- Returns to Web Chat (me) with "done" or "next"
- Repeats until task complete

### Workflow Pattern

```
WEB CHAT (Planning - You're talking to me now)
    ↓
You: "Ready for next step"
    ↓
Me (Claude Web): Provides Step 1 ONLY (50-100 lines)
    ↓
You: Copy to Code Chat
    ↓
CODE CHAT (Execution - Different tool)
    ↓
Executes Step 1
    ↓
You: Return to Web Chat (me)
    ↓
You: "Done, next"
    ↓
Me (Claude Web): Provides Step 2 ONLY
    ↓
REPEAT until task complete
```

### Critical Rules for Claude Web Chat (Me)

1. **ONE STEP ONLY** - Never provide Steps 1-5 in one response
2. **WAIT FOR CONFIRMATION** - User says "done" before next step
3. **SMALL CHUNKS** - Each step: 50-100 lines maximum
4. **COPY-PASTE READY** - Complete code/command, not references
5. **NO FILE UPLOAD INSTRUCTIONS** - Never tell user to upload docs to Code Chat

### Example Interaction

**✅ CORRECT:**
```
You: "Ready for Phase 1 Step 1"

Me (Claude Web): 
"Step 1: Create src/api-client.js with boilerplate

[50 lines of complete code here]

Copy this to Code Chat. Tell me when done."

You: "Done"

Me (Claude Web): 
"Step 2: Add client methods

[60 lines of complete code here]

Copy this to Code Chat. Tell me when done."
```

**❌ WRONG:**
```
You: "Ready for Phase 1"

Me (Claude Web): 
"Here are Steps 1-10:
Step 1: [code]
Step 2: [code]
Step 3: [code]
..."
```

**❌ WRONG:**
```
Me (Claude Web): 
"Upload these files to Code Chat:
- file1.md
- file2.md
Then execute..."
```

### When to Use Each Chat

**Use Web Chat (me) for:**
- Planning and strategy
- Breaking down complex features
- Architectural decisions
- Getting next step in a sequence
- Creating checkpoints

**Use Code Chat (not me) for:**
- Creating/editing files
- Running commands
- Batch file operations
- Executing the steps I provide

### Checkpoint Workflow

**After major milestones:**
1. You complete several steps in Code Chat
2. You return to Web Chat (me): "Phase X complete, create checkpoint"
3. I create checkpoint document
4. You start fresh Web Chat with checkpoint
5. Continue with next phase

### Integration with Project Files

This workflow is documented in:
- **CLAUDE.md** (this section - permanent reference)
- **Checkpoint files** (SESSION_X_CHECKPOINT.md - session-specific)
- **PATTERNS.md** (code patterns, separate from workflow)

Every new chat should start with this workflow understanding.

---

## Tech Stack
- **Frontend:** React 18, Tailwind CSS
- **Backend:** Electron, Node.js
- **REST API:** Express.js (Sessions 1-2 COMPLETE)
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
| Electron-only architecture | Can't test in browser, no web version | **COMPLETE** - Session 2: 137/163 endpoints (84%) |
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
| **REST API (Option C)** | Web foundation + automated testing | **SESSION 2 COMPLETE** - 21/21 modules, 137/163 endpoints (84%) |
| **Phase 4: Production Infra** | Migration versioning, integrity checks, crash recovery | Planned |
| **Phase 5: Clean Up** | Remove console.log, dead code, unused files | Planned |
| **Phase 6: Scale Testing** | 500 clients, 1000 matters, 5000 timesheets benchmark | Planned |

---

## REST API Development - Session 2 COMPLETE ✅

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

### Session 2: Full Refactoring ✅ COMPLETE (Feb 10-11, 2026)

**Goal:** Refactor all remaining 20 modules  
**Time:** ~8 hours across 5 batches  
**Result:** ✅ COMPLETE - 137/163 endpoints operational (84%)

**Progress:**
- ✅ Batch 0: POC (clients) - 6 handlers
- ✅ Batch 1: Core entities (matters, hearings, tasks, timesheets, expenses) - 27 handlers
- ✅ Batch 2: Financial (advances, invoices, judgments, appointments) - 26 handlers
- ✅ Batch 3: Scheduling (deadlines, diary, lawyers) - 17 handlers
- ✅ Batch 4: Settings (lookups, conflict-check, settings, client-imports) - 26 handlers
- ✅ Batch 5: Corporate/Reports (corporate, reports, trash, license) - 35 handlers

**Final status:**
- 21/21 modules refactored (100%)
- 137/163 REST endpoints operational (84%)
- 117/117 integration tests passing
- 22 commits total
- Zero regressions

**Tag:** v48.2-session2-complete

**See:** SESSION_2_COMPLETE.md for detailed session report

---

## Session History

### Session 2: REST API Backend - Full Scale ✅
**Date:** February 10-11, 2026  
**Duration:** ~8 hours (5 batches)  
**Tag:** v48.2-session2-complete

**Achievements:**
- 21/21 IPC modules refactored to dual-mode (IPC + REST)
- 137/163 REST endpoints operational (84%)
- Express API server production-ready
- server/routes/ organized (11 route modules)
- API_ENDPOINTS.md documentation created
- Integration tests: 117/117 (0 regressions)
- Desktop app: Fully backward compatible

**Files changed:** 44 files  
**Net lines:** +4,500 (all new REST functionality)

**Remaining endpoints (26):**
- 19 Electron-only handlers (export, backup, license)
- 7 report generation endpoints (complex, deferred)

**Decision:** 137/163 is sufficient. Remaining 26 are Electron-specific operations that don't map to web REST API.

**See:** SESSION_2_COMPLETE.md

### Session 1: REST API Backend - Proof of Concept ✅
**Date:** February 10, 2026  
**Duration:** ~5 hours  
**Tag:** v48.2-session1-rest-api

**Achievements:**
- Clients module refactored to dual-mode
- Pattern proven and validated
- Desktop app backward compatible
- 6 REST endpoints working
- Integration tests: 117/117 passing

**See:** SESSION_1_CHECKPOINT.md

---

## Workflow: Claude Web Chat ↔ Claude Code Chat

### Session Start
1. State what to build or fix
2. Upload relevant files to **Claude Web Chat** (checkpoint docs, specific components if needed)
3. Use **Claude Code Chat** to verify baseline: `node test-integration.js`

### During Development (TWO-CHAT WORKFLOW)

**Claude Web Chat (this chat):**
- Provides one step at a time (50-100 lines)
- Waits for "done, next" confirmation
- Never dumps multiple steps at once

**You (Malek):**
- Get step from Web Chat
- Copy to Code Chat for execution
- Return to Web Chat with "done, next"

**Claude Code Chat:**
- Executes the step
- Creates/edits files
- Runs commands

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
- **ONE STEP AT A TIME** - Web Chat provides incremental instructions

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
npm run api          # Start REST API server only
npm run dev:web      # Start API + React (web mode) - Session 3+
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
| **v48.2-session3-planning** | **Feb 11, 2026** | **Session 3 Planning COMPLETE** - 6-phase execution strategy documented. Incremental instruction approach designed. Ready for Phase 1 execution (create api-client.js with 156 dual-mode methods). See SESSION_3_CHECKPOINT_READY.md. |
| **v48.2-session2-complete** | **Feb 10-11, 2026** | **REST API Session 2 COMPLETE** - All 21/21 modules refactored. 137/163 REST endpoints operational (84%). 5 batches executed. server/routes/ organized (11 route modules). API_ENDPOINTS.md created. Integration tests: 117/117. Zero regressions. Desktop fully backward compatible. See SESSION_2_COMPLETE.md. 22 commits. |
| **v48.2-session1-rest-api** | **Feb 10, 2026** | **REST API Session 1 COMPLETE** - Proof of concept successful. Clients module refactored to dual-mode (IPC + REST). Express API server operational with 6 endpoints. Database dual-mode init working. Integration tests: 117/117. Desktop app: fully backward compatible. Pattern proven, ready to scale. See SESSION_1_CHECKPOINT.md. |
| **v48.2-option-c** | **Feb 10, 2026** | **STRATEGIC SHIFT** - Pausing Phase 3c.7a at Step 1 to build REST API foundation. Option C execution: web version infrastructure + comprehensive automated testing. Sessions 1-4 planned (10-12 hours total). Phase 3c.7a Steps 2-4 will resume in Session 5. See SESSION_1_REST_API_PLAN.md. |
| **v48.2-phase3c.6** | **Feb 10, 2026** | Phase 3c.6 COMPLETE - ReportContext + DialogContext migration + 16 backend bugs fixed. App.js: 35 useState (-72% from baseline). Fixed 11 Client 360 bugs, 2 XLSX import bugs, 1 Invoice Aging bug, 2 frontend null safety bugs. See PHASE3C_CHECKPOINT_MODALS_COMPLETE.md. |
| **v48.0** | **Feb 9, 2026** | **COMPLETE** - Bilingual UI removal. 42 files refactored across 8 commits, -1,913 net lines. translations.js deleted. 7 batches: Forms (13), Lists (10), Modules (7), Corporate (2), Common (4), Reports/Corporate (4), Final cleanup (9). Arabic data columns retained (user data, not UI). v48-verify.js: 60/61 clean, 0 errors. See v48_COMPLETION_CHECKPOINT.md. |
| v47.1 | Feb 9, 2026 | PHASE 3 PARTIAL - ErrorBoundary added (prevents white screens), license fail-closed (was fail-open), API wrapper created (not yet adopted), MatterForm Arabic field reverted. Critical architectural decision: v48 will remove bilingual UI (~1,500 lines) and align with industry standards. |
| v47.0 | Feb 9, 2026 | HARDENED BASELINE - Phase 2 complete. Old 6,791-line main.js replaced with 21 modular IPC modules. 163 handlers, 117 integration tests. Validation fix: lawyer schema `name` -> `full_name`. |

---

## Known Issues / TODO

### Session 3: Web Frontend (NEXT - ~4-5 hours)

**Phase 1: Create API Client (1 hour)**
- [ ] Create src/api-client.js (156 dual-mode methods)
- [ ] Environment detection (isElectron)
- [ ] 137 REST methods + 19 Electron-only stubs
- [ ] Incremental execution (15 steps)

**Phase 2: Update App.js (1 hour)**
- [ ] Import apiClient
- [ ] Replace window.electronAPI.* with apiClient.*
- [ ] Test desktop mode (must work)

**Phase 3: Update Components (1 hour)**
- [ ] 13 forms updated
- [ ] 11 lists updated
- [ ] 6 modules/corporate updated

**Phase 4: Web Setup (30 min)**
- [ ] Install react-scripts, concurrently
- [ ] Create public/index.html, src/index.js
- [ ] Update package.json scripts
- [ ] Test localhost:3000

**Phase 5: Testing (1 hour)**
- [ ] Desktop full regression
- [ ] Web functionality test
- [ ] Fix bugs

**Phase 6: Checkpoint (15 min)**
- [ ] Git commit + tag
- [ ] Update CLAUDE.md
- [ ] Create SESSION_3_COMPLETE.md

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
- Web version deployment (after Sessions 3-4)
- Auto-update mechanism for distribution
- Advanced conflict checking

---

*Last updated: February 11, 2026 - v48.2-session3-planning. Session 2 COMPLETE (REST API), Session 3 planning complete, ready for Phase 1 execution.*
