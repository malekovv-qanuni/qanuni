# Session 2: Batch Refactoring - Execution Plan

**Date:** February 10, 2026  
**Version:** v48.2-session1-poc-complete  
**Baseline Commit:** d220b19e  
**Tag:** v48.2-session1-poc-complete  
**Session:** 2 of 4  
**Status:** Ready to begin

---

## Executive Summary

**Goal:** Scale proven dual-mode pattern from Session 1 to remaining 19 modules  
**Input:** 1/21 modules complete (clients.js)  
**Output:** 20/21 modules complete (157 additional REST endpoints)  
**Estimated Time:** 6-6.5 hours  
**Risk Level:** LOW (pattern proven, straightforward execution)

---

## Strategic Context

### What We Proved in Session 1

✅ **Dual-mode architecture works**
- Same business logic serves both Electron IPC and Express REST
- Factory function pattern preserved for IPC
- Individual functions exported for REST
- Zero regressions in desktop app
- Integration tests: 116/116 passing

✅ **Pattern is repeatable**
- Created exact preservation refactoring script
- Validated with 6 handlers (clients.js)
- All SQL, validation, logging preserved
- Database dual-mode initialization working

### What We're Doing in Session 2

**Scale the pattern to 19 remaining modules:**
- Core entities: matters, hearings, tasks, timesheets, expenses
- Financial: advances, invoices, judgments, deadlines
- Scheduling: appointments, diary
- Admin: lawyers, lookups, settings, client-imports
- Corporate/Reports: corporate, reports, trash, conflict-check

**NOT refactoring:**
- license.js (Electron-specific, no REST equivalent)

**Expected output:**
- 157 additional REST endpoints
- 19 new route modules in server/routes/
- API documentation (API_ENDPOINTS.md)
- Integration tests: 116/116 maintained
- Desktop app: fully functional

---

## The Proven Pattern (From Session 1)

### Step 1: Analyze Current Module

```powershell
# Count handlers
Select-String -Path "electron\ipc\module.js" -Pattern "ipcMain.handle"

# Review structure
code electron\ipc\module.js
```

**Identify:**
- Number of handlers
- Handler names (channel IDs)
- SQL queries (COPY EXACTLY)
- Dependencies (database, logger, validation)
- Special logic (file operations, reports, etc.)

### Step 2: Refactor to Dual-Mode

**Template (clients.js as reference):**

```javascript
// electron/ipc/clients.js

// ============================================================================
// PURE FUNCTIONS (Used by both IPC and REST)
// ============================================================================

function getClients(database) {
  return database.query(`
    SELECT * FROM clients 
    WHERE deleted_at IS NULL 
    ORDER BY created_at DESC
  `);
}

function addClient(database, logger, client) {
  const check = validation.check(client, 'client');
  if (!check.valid) return check.result;
  
  const id = database.generateId('CLT');
  const now = new Date().toISOString();
  
  database.execute(`
    INSERT INTO clients (
      client_id, client_name, client_type, 
      -- ... all 22 columns
    ) VALUES (?, ?, ?, ...)
  `, [id, client.client_name, client.client_type, /* ... */]);
  
  logger.info('Client created', { clientId: id });
  return { success: true, client_id: id };
}

// ... more functions

// ============================================================================
// IPC HANDLERS (Electron Desktop Mode)
// ============================================================================

module.exports = function registerClientHandlers({ database, logger }) {
  const { ipcMain } = require('electron');
  
  ipcMain.handle('get-clients', logger.wrapHandler('get-clients', (event) => {
    return getClients(database);
  }));
  
  ipcMain.handle('add-client', logger.wrapHandler('add-client', (event, client) => {
    return addClient(database, logger, client);
  }));
  
  // ... more handlers
};

// ============================================================================
// REST API EXPORTS (Web Mode)
// ============================================================================

module.exports.getClients = getClients;
module.exports.addClient = addClient;
module.exports.updateClient = updateClient;
module.exports.deleteClient = deleteClient;
module.exports.checkClientReference = checkClientReference;
module.exports.getClientById = getClientById;
```

**Key Rules:**
1. ✅ Pure functions accept dependencies as parameters
2. ✅ Preserve exact SQL (don't modify queries)
3. ✅ Keep validation logic intact
4. ✅ Keep logger calls intact
5. ✅ Factory function exports for IPC
6. ✅ Individual function exports for REST
7. ✅ Never change handler signatures

### Step 3: Create REST Routes

**Template (server/routes/clients.js):**

```javascript
const express = require('express');
const router = express.Router();

module.exports = function(clientsModule) {
  
  // GET /api/clients
  router.get('/', async (req, res) => {
    try {
      const clients = await clientsModule.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // POST /api/clients
  router.post('/', async (req, res) => {
    try {
      const result = await clientsModule.addClient(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ... more routes
  
  return router;
};
```

### Step 4: Mount Routes in API Server

```javascript
// server/api-server.js

const clientsModule = require('../electron/ipc/clients');
const clientsRoutes = require('./routes/clients')(clientsModule);

app.use('/api/clients', clientsRoutes);
```

### Step 5: Test Everything

```powershell
# 1. Integration tests
node test-integration.js
# Must show: ✅ 116/116

# 2. Desktop app
npm run dev
# Manual test: navigate to module, test CRUD

# 3. REST API
npm run api
curl http://localhost:3001/api/[entity]
```

---

## Batch Breakdown

### Batch 1: Core Entities (1.5 hours)
**Modules:** matters.js, hearings.js, tasks.js, timesheets.js, expenses.js  
**Handlers:** ~27 total  
**Complexity:** Medium (standard CRUD with some business logic)

**matters.js (6 handlers):**
- get-all-matters
- add-matter
- update-matter
- delete-matter
- check-file-number
- get-matter-by-id

**hearings.js (4 handlers):**
- get-all-hearings
- add-hearing
- update-hearing
- delete-hearing

**tasks.js (4 handlers):**
- get-all-tasks
- add-task
- update-task
- delete-task

**timesheets.js (5 handlers):**
- get-all-timesheets
- add-timesheet
- update-timesheet
- delete-timesheet
- get-unbilled-timesheets

**expenses.js (8 handlers):**
- get-all-expenses
- add-expense
- update-expense
- delete-expense
- get-unbilled-expenses
- add-expense-batch
- check-expense-deduction
- update-expense-deduction

**Special considerations:**
- matters.js: file number uniqueness check
- expenses.js: batch operations, deduction tracking
- timesheets.js: unbilled entries query

**Test checkpoint:**
```bash
node test-integration.js  # Must pass 116/116
curl http://localhost:3001/api/matters
curl http://localhost:3001/api/hearings
curl http://localhost:3001/api/tasks
curl http://localhost:3001/api/timesheets
curl http://localhost:3001/api/expenses
```

### Batch 2: Financial (1 hour)
**Modules:** advances.js, invoices.js, judgments.js, deadlines.js  
**Handlers:** ~28 total  
**Complexity:** Medium-High (complex queries, PDF generation)

**advances.js (10 handlers):**
- get-all-advances
- add-advance
- update-advance
- delete-advance
- get-client-advances
- get-matter-advances
- check-advance-deduction
- update-advance-deduction
- get-retainer-balance
- get-retainer-history

**invoices.js (8 handlers):**
- get-all-invoices
- add-invoice
- update-invoice
- delete-invoice
- update-invoice-status
- generate-invoice-pdf
- get-invoice-content
- mark-invoice-paid

**judgments.js (4 handlers):**
- get-all-judgments
- add-judgment
- update-judgment
- delete-judgment

**deadlines.js (6 handlers):**
- get-all-deadlines
- add-deadline
- update-deadline
- delete-deadline
- update-deadline-status
- get-deadlines-by-judgment

**Special considerations:**
- advances.js: retainer balance calculations, deduction tracking
- invoices.js: PDF generation (might need separate endpoint)
- deadlines.js: status tracking, judgment relationships

**Test checkpoint:**
```bash
curl http://localhost:3001/api/advances
curl http://localhost:3001/api/invoices
curl http://localhost:3001/api/judgments
curl http://localhost:3001/api/deadlines
```

### Batch 3: Scheduling (30 minutes)
**Modules:** appointments.js, diary.js  
**Handlers:** ~8 total  
**Complexity:** Low (straightforward CRUD)

**appointments.js (4 handlers):**
- get-all-appointments
- add-appointment
- update-appointment
- delete-appointment

**diary.js (4 handlers):**
- get-matter-diary
- add-diary-entry
- update-diary-entry
- delete-diary-entry

**Special considerations:**
- diary.js: matter timeline feature, chronological ordering

**Test checkpoint:**
```bash
curl http://localhost:3001/api/appointments
curl http://localhost:3001/api/diary/[matter-id]
```

### Batch 4: Admin & Settings (1 hour)
**Modules:** lawyers.js, lookups.js, settings.js, client-imports.js  
**Handlers:** ~40 total  
**Complexity:** Medium (lots of lookup tables, settings, imports)

**lawyers.js (7 handlers):**
- get-all-lawyers
- add-lawyer
- update-lawyer
- delete-lawyer
- get-lawyer-by-id
- get-active-lawyers
- check-lawyer-reference

**lookups.js (9 handlers):**
- get-court-types
- get-regions
- get-hearing-purposes
- get-task-types
- get-expense-categories
- get-entity-types
- add-lookup
- update-lookup
- delete-lookup

**settings.js (~22 handlers):**
- get-firm-info
- update-firm-info
- get-settings
- update-settings
- backup-database
- restore-database
- get-currencies
- add-currency
- update-currency
- delete-currency
- get-exchange-rates
- add-exchange-rate
- update-exchange-rate
- delete-exchange-rate
- export-clients-excel
- export-matters-excel
- export-timesheets-excel
- export-expenses-excel
- export-invoices-excel
- import-clients-excel
- get-import-template
- validate-import-data

**client-imports.js (2 handlers):**
- import-clients
- validate-import-file

**Special considerations:**
- settings.js: File operations (backup/restore, Excel), might need multipart
- lookups.js: Multiple lookup tables, generic CRUD
- lawyers.js: Reference checking for uniqueness

**Test checkpoint:**
```bash
curl http://localhost:3001/api/lawyers
curl http://localhost:3001/api/lookups/court-types
curl http://localhost:3001/api/settings/firm-info
```

### Batch 5: Corporate & Reports (1 hour)
**Modules:** corporate.js, reports.js, trash.js, conflict-check.js  
**Handlers:** ~54 total  
**Complexity:** High (complex queries, multiple entities, reports)

**corporate.js (24 handlers):**
- get-all-entities
- add-entity
- update-entity
- delete-entity
- get-entity-by-id
- get-entity-shareholders
- add-shareholder
- update-shareholder
- delete-shareholder
- get-entity-directors
- add-director
- update-director
- delete-director
- get-entity-filings
- add-filing
- update-filing
- delete-filing
- get-entity-meetings
- add-meeting
- update-meeting
- delete-meeting
- get-share-transfers
- add-share-transfer
- delete-share-transfer

**reports.js (~12 handlers):**
- get-dashboard-stats
- get-client-statement
- get-case-status-report
- get-client-360
- get-billing-report
- get-timesheet-report
- get-expense-report
- get-invoice-aging
- get-revenue-report
- export-report-pdf
- export-report-excel
- get-corporate-entity-report

**trash.js (5 handlers):**
- get-trash-items
- restore-item
- permanent-delete
- empty-trash
- get-trash-stats

**conflict-check.js (2 handlers):**
- search-conflicts
- log-conflict-search

**Special considerations:**
- corporate.js: Multiple related entities, complex relationships
- reports.js: Heavy queries, data aggregation, export operations
- trash.js: Multi-entity soft delete system
- conflict-check.js: Full-text search, logging

**Test checkpoint:**
```bash
curl http://localhost:3001/api/corporate/entities
curl http://localhost:3001/api/reports/dashboard
curl http://localhost:3001/api/trash
curl http://localhost:3001/api/conflict-check -X POST -d '{"query":"test"}'
```

---

## Step-by-Step Execution

### Pre-Flight Check

Before starting ANY batch:
```powershell
# 1. Verify clean baseline
git status
# Should show: nothing to commit, working tree clean

# 2. Verify integration tests passing
node test-integration.js
# Must show: ✅ 116/116

# 3. Verify desktop app working
npm run dev
# Manual test: Clients module (already refactored)

# 4. Verify REST API working
npm run api
curl http://localhost:3001/api/health
curl http://localhost:3001/api/clients
# Both should return valid responses
```

**Only proceed if ALL checks pass.**

### Execution Loop (Repeat for Each Module)

**Step 1: Create backup (2 min)**
```powershell
cp electron\ipc\module.js electron\ipc\module.js.backup
```

**Step 2: Analyze module (5 min)**
```powershell
# Count handlers
Select-String -Path "electron\ipc\module.js" -Pattern "ipcMain.handle" | Measure-Object

# Review code
code electron\ipc\module.js
```

**Take notes:**
- Handler count: X
- Special features: (file ops, complex queries, etc.)
- Dependencies: (database, logger, validation, fs, etc.)

**Step 3: Refactor to dual-mode (15-30 min per module)**

**3a. Extract pure functions:**
```javascript
// At top of file, after requires
function getEntities(database) {
  return database.query(`SELECT * FROM table WHERE deleted_at IS NULL`);
}

function addEntity(database, logger, data) {
  const check = validation.check(data, 'entityType');
  if (!check.valid) return check.result;
  
  // ... exact preservation of existing logic
  
  return { success: true, id };
}

// ... all handler functions
```

**3b. Wrap IPC handlers:**
```javascript
module.exports = function registerHandlers({ database, logger }) {
  const { ipcMain } = require('electron');
  
  ipcMain.handle('get-entities', logger.wrapHandler('get-entities', (event) => {
    return getEntities(database);
  }));
  
  ipcMain.handle('add-entity', logger.wrapHandler('add-entity', (event, data) => {
    return addEntity(database, logger, data);
  }));
  
  // ... all handlers
};
```

**3c. Export functions:**
```javascript
module.exports.getEntities = getEntities;
module.exports.addEntity = addEntity;
module.exports.updateEntity = updateEntity;
// ... all functions
```

**Step 4: Create REST routes (10-15 min per module)**

**4a. Create route file:**
```powershell
# server/routes/module.js
```

**4b. Define routes:**
```javascript
const express = require('express');
const router = express.Router();

module.exports = function(moduleHandlers) {
  
  router.get('/', async (req, res) => {
    try {
      const data = await moduleHandlers.getEntities();
      res.json(data);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.post('/', async (req, res) => {
    try {
      const result = await moduleHandlers.addEntity(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ... more routes
  
  return router;
};
```

**Step 5: Mount in API server (2 min)**

```javascript
// server/api-server.js

const moduleHandlers = require('../electron/ipc/module');
const moduleRoutes = require('./routes/module')(moduleHandlers);

app.use('/api/module', moduleRoutes);
```

**Step 6: Test (5 min)**
```powershell
# Integration tests
node test-integration.js
# Must still show 116/116

# Desktop app
npm run dev
# Navigate to module, test one CRUD operation

# REST API
curl http://localhost:3001/api/module
curl -X POST http://localhost:3001/api/module -H "Content-Type: application/json" -d '{"field":"value"}'
```

**Step 7: Commit (2 min)**
```powershell
git add -A
git commit -m "Refactored module.js to dual-mode (X handlers, X endpoints)"
```

**Total per module:** 40-60 minutes  
**Total for 19 modules:** ~6-6.5 hours

### After Each Batch

**Checkpoint validation:**
```powershell
# 1. Run full integration tests
node test-integration.js

# 2. Test all desktop modules in batch
npm run dev
# Manual: Test each module CRUD

# 3. Test all REST endpoints in batch
npm run api
# Test one GET endpoint per module

# 4. Git status check
git log --oneline -n5
# Should show one commit per module

# 5. Create batch checkpoint commit
git tag v48.2-session2-batch[N]-complete
```

---

## Testing Strategy

### Automated Testing (MANDATORY)

**After EVERY module refactoring:**
```powershell
node test-integration.js
```

**Expected output:**
```
=== Qanuni Integration Test ===
[Phase 1] Loading IPC modules
  Loaded: 21/21 ✅
[Phase 2] Channel coverage check
  Preload channels:    161
  Registered handlers: 161
  ✓ All preload channels have handlers
[Phase 3] CRUD handler tests
  Passed: 116
  Failed: 0
  
✅ All tests passed (116/116)
```

**If ANY test fails:**
1. STOP immediately
2. Review the refactored module
3. Compare against backup
4. Fix the issue
5. Re-test until 116/116
6. Only then proceed to next module

### Manual Desktop Testing

**After each batch (not each module):**
1. Launch desktop app: `npm run dev`
2. Navigate to each module in the batch
3. Perform one CRUD operation per module
4. Verify data displays correctly
5. Check for console errors

**Example for Batch 1:**
- Matters: Add new matter
- Hearings: Add new hearing
- Tasks: Add new task
- Timesheets: Add timesheet entry
- Expenses: Add expense

**Time: ~10 minutes per batch**

### REST API Testing

**After each batch:**
```powershell
npm run api
```

**Test one endpoint per module:**
```bash
# Batch 1
curl http://localhost:3001/api/matters
curl http://localhost:3001/api/hearings
curl http://localhost:3001/api/tasks
curl http://localhost:3001/api/timesheets
curl http://localhost:3001/api/expenses

# Batch 2
curl http://localhost:3001/api/advances
curl http://localhost:3001/api/invoices
curl http://localhost:3001/api/judgments
curl http://localhost:3001/api/deadlines

# Batch 3
curl http://localhost:3001/api/appointments
curl http://localhost:3001/api/diary

# Batch 4
curl http://localhost:3001/api/lawyers
curl http://localhost:3001/api/lookups/court-types
curl http://localhost:3001/api/settings/firm-info

# Batch 5
curl http://localhost:3001/api/corporate/entities
curl http://localhost:3001/api/reports/dashboard
curl http://localhost:3001/api/trash
```

**Expected:** HTTP 200, valid JSON response

**Time: ~5 minutes per batch**

---

## Success Criteria

### Module-Level Success

For EACH module, verify:
- [ ] Pure functions extracted (accept dependencies as params)
- [ ] Factory function preserved for IPC
- [ ] All handlers wrapped with logger.wrapHandler
- [ ] Individual functions exported for REST
- [ ] Exact SQL preserved (no query modifications)
- [ ] Validation logic intact
- [ ] Logger calls intact
- [ ] Integration tests pass: 116/116
- [ ] Desktop app: module works (manual test)
- [ ] REST API: GET endpoint responds (curl test)
- [ ] Git committed

### Batch-Level Success

For EACH batch, verify:
- [ ] All modules in batch completed
- [ ] Integration tests: 116/116
- [ ] Desktop app: all modules in batch tested
- [ ] REST API: all endpoints in batch tested
- [ ] Git tag created: v48.2-session2-batch[N]-complete

### Session-Level Success

At end of Session 2, verify:
- [ ] 20/21 modules refactored (license.js skipped)
- [ ] 157 REST endpoints operational
- [ ] Integration tests: 116/116
- [ ] Desktop app: fully functional (all 11 modules)
- [ ] REST API: comprehensive testing complete
- [ ] API_ENDPOINTS.md created
- [ ] server/routes/index.js created (organized route aggregation)
- [ ] Git committed: "Session 2 complete: 20 modules dual-mode"
- [ ] Git tagged: v48.2-session2-complete
- [ ] Clean baseline for Session 3

---

## Known Risks & Mitigations

### Risk 1: Time Overrun
**Problem:** 19 modules × 60 min = 19 hours (not 6.5 hours)  
**Mitigation:** 
- Batch similar modules together (efficiency gains)
- Use exact preservation script (reduces debugging)
- Skip detailed testing per module (test per batch)
- Realistic estimate: 30-40 min per module average

**Fallback:** If time overruns, break into 2 sessions:
- Session 2a: Batches 1-3 (14 modules, 4 hours)
- Session 2b: Batches 4-5 (5 modules, 2.5 hours)

### Risk 2: Complex Module Refactoring
**Problem:** Some modules have file operations, PDF generation, complex queries  
**Mitigation:**
- Identify complex modules early (settings.js, reports.js, corporate.js)
- Allocate extra time (45-60 min instead of 30)
- Focus on pure function extraction, leave file ops intact
- Test thoroughly before proceeding

**Complex modules:**
- settings.js: Backup/restore, Excel imports/exports
- reports.js: Heavy aggregations, PDF/Excel generation
- corporate.js: 24 handlers, multiple entity types
- invoices.js: PDF generation

### Risk 3: Regression in Desktop App
**Problem:** Refactoring breaks existing functionality  
**Mitigation:**
- Run integration tests after EVERY module (catches backend breaks)
- Test desktop app after EVERY batch (catches frontend breaks)
- Keep backups (.backup files)
- Commit frequently (easy rollback)

**If regression found:**
1. Identify which module caused it
2. Revert that module: `git checkout HEAD~1 electron/ipc/module.js`
3. Restore from backup: `cp electron/ipc/module.js.backup electron/ipc/module.js`
4. Re-refactor carefully
5. Test before proceeding

### Risk 4: REST API Doesn't Match IPC Behavior
**Problem:** Pure function behaves differently than original handler  
**Mitigation:**
- Exact preservation of SQL queries
- Copy-paste validation logic
- Copy-paste logging calls
- Never modify business logic

**If behavior mismatch found:**
1. Compare refactored vs backup
2. Identify difference
3. Restore exact logic
4. Test both modes (desktop + REST)

### Risk 5: Missing Dependencies
**Problem:** Module uses dependencies not passed as parameters  
**Mitigation:**
- Analyze module dependencies before refactoring
- Add required dependencies to function signatures
- Common dependencies: database, logger, validation, fs, path
- Pass through from factory function

**Example:**
```javascript
// If module uses fs
const fs = require('fs');

function exportData(database, logger, outputPath) {
  // ... use fs here
}

module.exports = function registerHandlers({ database, logger }) {
  // fs is available in closure
  ipcMain.handle('export-data', logger.wrapHandler('export-data', (event, path) => {
    return exportData(database, logger, path);
  }));
};
```

---

## API Documentation

### Create API_ENDPOINTS.md

At end of Session 2, create comprehensive API documentation:

**Structure:**
```markdown
# Qanuni REST API Endpoints

## Base URL
`http://localhost:3001/api`

## Authentication
None (for now - local development only)

## Endpoints

### Clients
- `GET /api/clients` - Get all active clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client (soft)
- `POST /api/clients/check-reference` - Validate unique reference

### Matters
- `GET /api/matters` - Get all matters
- ...

[Continue for all 163 endpoints]

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "field": "field_name"
}
```

## Status Codes
- 200: Success (GET, PUT, DELETE)
- 201: Created (POST)
- 400: Bad Request (validation error)
- 404: Not Found
- 500: Server Error
```

### Route Organization

Create `server/routes/index.js`:
```javascript
const express = require('express');
const router = express.Router();

const clientsModule = require('../../electron/ipc/clients');
const mattersModule = require('../../electron/ipc/matters');
// ... all modules

const clientsRoutes = require('./clients')(clientsModule);
const mattersRoutes = require('./matters')(mattersModule);
// ... all routes

router.use('/clients', clientsRoutes);
router.use('/matters', mattersRoutes);
router.use('/hearings', hearingsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/timesheets', timesheetsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/advances', advancesRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/judgments', judgmentsRoutes);
router.use('/deadlines', deadlinesRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/diary', diaryRoutes);
router.use('/lawyers', lawyersRoutes);
router.use('/lookups', lookupsRoutes);
router.use('/settings', settingsRoutes);
router.use('/corporate', corporateRoutes);
router.use('/reports', reportsRoutes);
router.use('/trash', trashRoutes);
router.use('/conflict-check', conflictCheckRoutes);

module.exports = router;
```

Update `server/api-server.js`:
```javascript
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);
```

---

## Final Deliverables Checklist

At end of Session 2, verify ALL items:

### Code
- [ ] 20 electron/ipc/*.js modules refactored (license.js skipped)
- [ ] 19 server/routes/*.js files created
- [ ] server/routes/index.js created (route aggregation)
- [ ] server/api-server.js updated (uses routes/index.js)
- [ ] All modules export factory function + individual functions
- [ ] All routes handle errors properly

### Testing
- [ ] Integration tests: 116/116 passing
- [ ] Desktop app: all 11 modules tested manually
- [ ] REST API: all 19 endpoint groups tested with curl
- [ ] Zero regressions introduced

### Documentation
- [ ] API_ENDPOINTS.md created (lists all 163 endpoints)
- [ ] Comments added to complex functions
- [ ] Route parameters documented

### Git
- [ ] 19 commits (one per module)
- [ ] 5 batch tags (v48.2-session2-batch1-complete, etc.)
- [ ] 1 session tag (v48.2-session2-complete)
- [ ] Clean working tree

### Ready for Session 3
- [ ] Baseline verified clean
- [ ] All tests passing
- [ ] All endpoints responding
- [ ] Documentation complete

---

## Session 3 Preview

**Goal:** Enable React frontend in browser (web client)

**Approach:**
1. Create `src/api-client.js` (unified API layer)
2. Add environment detection (Electron vs Browser)
3. Replace `window.electronAPI.*` with `apiClient.*` in all components
4. Configure React to run in browser (localhost:3000)
5. Test web version with all features

**Deliverables:**
- Web version functional at localhost:3000
- All 11 modules working in browser
- Same codebase serves both desktop and web
- Zero functionality loss

**Time:** 2-3 hours

---

## Context for Session 2

**Start Session 2 with these files:**
1. CLAUDE.md (project overview)
2. SESSION_2_BATCH_REFACTORING.md (this file)
3. SESSION_1_CHECKPOINT.md (proof of concept)
4. PATTERNS.md (code conventions)
5. KNOWN_FIXES.md (recurring bugs)

**First request:**
"Ready to begin Session 2: Batch Refactoring. Baseline verified clean at commit d220b19e. See SESSION_2_BATCH_REFACTORING.md for detailed execution plan. Starting with Batch 1: Core Entities (matters, hearings, tasks, timesheets, expenses)."

---

## Session End Checklist

Before concluding Session 2:

- [ ] All 5 batches complete
- [ ] All deliverables verified
- [ ] API_ENDPOINTS.md created
- [ ] Git tagged v48.2-session2-complete
- [ ] CLAUDE.md updated with Session 2 completion
- [ ] SESSION_2_CHECKPOINT.md created (summary of what was done)
- [ ] Clean baseline confirmed for Session 3

---

*Session 2 execution plan created: February 10, 2026*  
*Estimated duration: 6-6.5 hours*  
*Pattern: PROVEN in Session 1*  
*Risk level: LOW*  
*Success rate: HIGH (straightforward scaling)*
