# Session 1: REST API Backend - Execution Plan

**Date:** February 10, 2026  
**Version:** v48.2-phase3c.7a-step1 (pausing context extraction)  
**Decision:** Execute Option C - Web Foundation + Full Automation  
**Total Timeline:** 10-12 hours across 4 sessions  
**Current Session:** 1 of 4

---

## Strategic Context

### Why Now?

**Problem identified:**
- Keep finding UI bugs weeks/months after introduction
- Manual testing is ad-hoc and incomplete
- No systematic verification before each phase
- Bugs from v46.56 (Feb 8) found on Feb 10
- Bugs from Phase 3c.4c found during 3c.7a Step 1

**Solution chosen: Option C**
1. Build REST API backend (wrap all 163 IPC handlers)
2. Enable React frontend in browser
3. Comprehensive automated testing via browser automation
4. Then resume Phase 3c context extraction with confidence

**Why this solves the problem:**
- AI (Claude) can automate browser testing completely
- Tests run in 90 seconds vs hours of manual work
- Catches 90-95% of bugs immediately
- Web version foundation (planned anyway)
- Professional architecture for scale

### What We're Pausing

**Phase 3c.7a Steps 2-4:** (will resume in Session 4)
- Step 2: CalendarContext (2 states: calendarView, calendarDate)
- Step 3: DataContext (8 states: courtTypes, regions, hearingPurposes, taskTypes, expenseCategories, entityTypes, lawyers, firmInfo)
- Step 4: EntityDataContext (13 states: all entity data)

**Current state:**
- App.js: 33 useState (down from 123 baseline)
- 73% reduction achieved
- Target after Session 4: 92% reduction (10 useState)

---

## Architecture Transformation

### Current: Electron-Only

```
React Component
  ↓
window.electronAPI.getClients()
  ↓
IPC Handler in main.js
  ↓
Database Query (SQLite)
  ↓
Return data
```

**Problem:** Tightly coupled to Electron. Can't test in browser.

### Target: Dual-Mode (Electron + Web)

```
React Component
  ↓
apiClient.getClients()
  ↓ (detects environment)
  ├─ DESKTOP MODE:
  │   window.electronAPI.getClients()
  │     ↓
  │   IPC Handler calls clientsModule.getClients()
  │     ↓
  │   Database Query
  │
  └─ WEB MODE:
      fetch('http://localhost:3001/api/clients')
        ↓
      Express Route calls clientsModule.getClients()
        ↓
      Database Query
```

**Key Innovation:** Same business logic functions used by BOTH IPC and REST.

---

## Session 1 Deliverables

### 1. Refactored IPC Modules (21 files)

**Before (electron/ipc/clients.js):**
```javascript
ipcMain.handle('get-clients', logger.wrapHandler('get-clients', (event) => {
  return database.query('SELECT * FROM clients WHERE deleted_at IS NULL');
}));
```

**After:**
```javascript
// Pure function - can be used by IPC OR REST
function getClients() {
  return database.query('SELECT * FROM clients WHERE deleted_at IS NULL');
}

// IPC handler calls the function
ipcMain.handle('get-clients', logger.wrapHandler('get-clients', (event) => {
  return getClients();
}));

// Export for API server
module.exports = {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  // ... all handlers
};
```

**Modules to refactor (21 total, 163 handlers):**
1. clients.js (6 handlers)
2. matters.js (6 handlers)
3. hearings.js (4 handlers)
4. tasks.js (4 handlers)
5. timesheets.js (5 handlers)
6. expenses.js (8 handlers)
7. advances.js (10 handlers)
8. invoices.js (8 handlers)
9. judgments.js (4 handlers)
10. deadlines.js (6 handlers)
11. appointments.js (4 handlers)
12. diary.js (4 handlers)
13. lawyers.js (7 handlers)
14. lookups.js (9 handlers)
15. conflict-check.js (2 handlers)
16. corporate.js (24 handlers)
17. trash.js (5 handlers)
18. settings.js (~22 handlers)
19. reports.js (~12 handlers)
20. client-imports.js (2 handlers)
21. license.js (special case - may not expose via REST)

### 2. Express API Server (server/api-server.js)

```javascript
const express = require('express');
const cors = require('cors');
const database = require('../electron/database');
const logging = require('../electron/logging');

// Import all refactored modules
const clientsModule = require('../electron/ipc/clients');
const mattersModule = require('../electron/ipc/matters');
// ... all 21 modules

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database for web mode
database.init('./qanuni-web.db');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v48.2' });
});

// Client routes
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await clientsModule.getClients();
    res.json(clients);
  } catch (error) {
    logging.error('API: GET /api/clients', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ... 162 more routes

app.listen(3001, () => {
  console.log('🚀 Qanuni API: http://localhost:3001');
});
```

### 3. Organized Route Modules (server/routes/)

```
server/
├── api-server.js
└── routes/
    ├── clients.js
    ├── matters.js
    ├── hearings.js
    ├── tasks.js
    ├── timesheets.js
    ├── expenses.js
    ├── invoices.js
    ├── corporate.js
    ├── reports.js
    ├── settings.js
    └── index.js
```

---

## Step-by-Step Execution

### Step 1: Environment Setup (30 min)

**1.1 Create directories:**
```bash
mkdir server
mkdir server/routes
```

**1.2 Install dependencies:**
```bash
npm install express cors body-parser
npm install --save-dev concurrently nodemon
```

**1.3 Update package.json scripts:**
```json
"scripts": {
  "dev": "electron .",
  "dev:test": "electron . --test-db",
  "api": "nodemon server/api-server.js",
  "dev:web": "concurrently \"npm run api\" \"npm run dev\"",
  "test": "node test-integration.js"
}
```

### Step 2: Refactor First Module - Clients (PROOF OF CONCEPT) (1 hour)

**2.1 Analyze current structure:**
```bash
# Show current electron/ipc/clients.js
cat electron/ipc/clients.js

# Count handlers
grep -c "ipcMain.handle" electron/ipc/clients.js
```

**2.2 Refactor clients.js:**
- Extract 6 handler functions
- Keep IPC handlers wrapping functions
- Export all functions
- Test: `node test-integration.js` → 116/116

**2.3 Create first API routes:**
- Create `server/routes/clients.js`
- Import clientsModule
- Define 6 routes (GET, POST, PUT, DELETE, etc.)

**2.4 Test:**
```bash
# Start API server
node server/api-server.js

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/clients
```

**2.5 Verify desktop app:**
```bash
npm run dev
# Test Clients module manually
```

**CHECKPOINT:** If Step 2 succeeds, pattern is proven. Proceed with remaining 20 modules.

### Step 3: Batch Refactor Remaining Modules (3-4 hours)

**Batch 1: Core entities (1.5 hours)**
- matters.js
- hearings.js
- tasks.js
- timesheets.js
- expenses.js

**Batch 2: Financial (1 hour)**
- advances.js
- invoices.js
- judgments.js
- deadlines.js

**Batch 3: Scheduling (30 min)**
- appointments.js
- diary.js

**Batch 4: Admin & Settings (1 hour)**
- lawyers.js
- lookups.js
- settings.js
- client-imports.js

**Batch 5: Corporate & Reports (1 hour)**
- corporate.js (24 handlers - largest)
- reports.js
- trash.js
- conflict-check.js

**After each batch:**
1. Run integration tests: `node test-integration.js`
2. Test desktop app: `npm run dev`
3. Test API endpoints: `curl http://localhost:3001/api/[entity]`
4. Git commit: "Refactored [batch name] modules"

### Step 4: Route Organization (30 min)

**4.1 Create route modules:**
- Move routes from api-server.js into server/routes/*.js
- Create server/routes/index.js to aggregate all routes

**4.2 Clean up api-server.js:**
```javascript
const routes = require('./routes');
app.use('/api', routes);
```

### Step 5: Comprehensive Testing (1 hour)

**5.1 Integration tests:**
```bash
node test-integration.js
# Must show: ✅ 116/116 passing
```

**5.2 Desktop app (manual):**
```bash
npm run dev
# Test all 11 modules:
# - Clients, Matters, Hearings, Tasks, Calendar
# - Timesheets, Expenses, Invoices, Companies
# - Settings, Reports
```

**5.3 API endpoints (sample):**
```bash
# Test one endpoint from each module
curl http://localhost:3001/api/clients
curl http://localhost:3001/api/matters
curl http://localhost:3001/api/hearings
curl http://localhost:3001/api/tasks
curl http://localhost:3001/api/timesheets
curl http://localhost:3001/api/expenses
curl http://localhost:3001/api/invoices
curl http://localhost:3001/api/lawyers
curl http://localhost:3001/api/lookups/court-types
```

**5.4 Document endpoints:**
Create `API_ENDPOINTS.md` listing all 163 routes.

### Step 6: Git Checkpoint (15 min)

```bash
git add -A
git commit -m "Session 1 complete: REST API backend foundation

- Refactored 21 IPC modules (163 handlers)
- Created Express API server with 163 REST endpoints
- Dual-mode architecture (Electron + Web)
- Desktop app backward compatible
- Integration tests: 116/116 passing
- Ready for Session 2 (web frontend)"

git tag v48.2-session1-rest-api
```

---

## Success Criteria

Before declaring Session 1 complete, verify ALL:

- [ ] All 21 electron/ipc/*.js modules refactored
- [ ] All handlers extracted into pure functions
- [ ] All handlers exported from modules
- [ ] server/api-server.js created and runs without errors
- [ ] server/routes/*.js created (organized route modules)
- [ ] All 163 REST endpoints respond correctly
- [ ] Integration tests pass: 116/116
- [ ] Desktop app works: all 11 modules tested manually
- [ ] API tested: sample endpoints from each module
- [ ] No regressions introduced
- [ ] Git committed with tag v48.2-session1-rest-api
- [ ] API_ENDPOINTS.md created (documentation)

---

## Known Risks & Mitigations

### Risk 1: Database initialization differs
**Problem:** electron/database.js might not have init() method  
**Solution:** Add init(dbPath) method if needed, use separate DB for web

### Risk 2: Handlers coupled to Electron APIs
**Problem:** Some handlers might use Electron-specific APIs (dialog, etc.)  
**Solution:** Identify early, create web-compatible alternatives

### Risk 3: Async/Promise inconsistencies
**Problem:** Some handlers might not be async  
**Solution:** Wrap in Promise.resolve() where needed

### Risk 4: Time overrun
**Problem:** 163 handlers is a lot to refactor  
**Solution:** Work in batches, checkpoint frequently, can extend to 2 sessions if needed

---

## Session 2 Preview

**Goal:** Enable React frontend in browser

**Deliverables:**
1. src/api-client.js (unified API layer)
2. Environment detection (Electron vs Web)
3. App.js uses apiClient instead of window.electronAPI
4. React app runs at localhost:3000
5. Web version functional (all features work)

**Time:** 2-3 hours

---

## Session 3 Preview

**Goal:** Comprehensive automated testing via browser

**Claude will:**
1. Navigate to localhost:3000
2. Test all 11 modules systematically
3. Click every button, test every form
4. Take 100+ screenshots documenting results
5. Generate test report with bug list

**Time:** 2-3 hours

---

## Session 4 Preview

**Goal:** Fix bugs + complete Phase 3c.7a

**Steps:**
1. Fix all bugs from Session 3 (1-2 hours)
2. Resume Phase 3c.7a Step 2: CalendarContext (30 min)
3. Resume Phase 3c.7a Step 3: DataContext (1 hour)
4. Resume Phase 3c.7a Step 4: EntityDataContext (1-2 hours)
5. Final verification

**Result:** App.js with ~10 useState (92% reduction achieved)

**Time:** 3-4 hours

---

## Context for Next Session

**Bring these files:**
1. This checkpoint (SESSION_1_REST_API_PLAN.md)
2. CLAUDE.md (project overview)
3. PATTERNS.md (code conventions)
4. Any errors/issues encountered in Session 1

**First request:**
"Session 1 complete. Ready for Session 2: Web Frontend. See SESSION_1_REST_API_PLAN.md for context."

---

*Session 1 planned: February 10, 2026*  
*Estimated duration: 5-6 hours*  
*Status: Ready to begin*
