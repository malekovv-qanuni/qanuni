# Session 3: Web Frontend - Execution Plan

**Date:** February 11, 2026  
**Version:** v48.2-session2-complete  
**Status:** Ready to execute  
**Tool:** Claude Code Chat (file operations required)  
**Estimated Duration:** 4-5 hours

---

## Strategic Context

### Session Progression

| Session | Goal | Status |
|---------|------|--------|
| Session 1 | REST API POC + clients module | ✅ Complete |
| Session 2 | Refactor all 21 IPC modules to dual-mode | ✅ Complete |
| **Session 3** | **Enable React frontend in browser** | ⏳ Current |
| Session 4 | Automated testing + fix bugs + resume Phase 3c | 📋 Planned |

### Why Web Frontend Now?

**Session 2 delivered:**
- 21 IPC modules refactored to dual-mode (IPC + REST)
- 137 REST endpoints operational
- 19 Electron-only handlers documented
- Desktop app fully backward compatible
- 117/117 integration tests passing

**Session 3 enables:**
- React app runs in browser at localhost:3000
- Comprehensive automated testing via browser automation
- Foundation for future web-based subscription model
- Solves "finding bugs weeks later" problem

---

## Architecture Transformation

### Current: Desktop Only
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

**Problem:** Tightly coupled to Electron. Cannot test in browser.

### Target: Dual-Mode (Electron + Web)
```
React Component
  ↓
apiClient.getClients()
  ↓ (environment detection)
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

## Phase 1: Create API Client Layer (1 hour)

### Objective
Create `src/api-client.js` - unified API abstraction that detects environment and routes calls appropriately.

### Key Requirements

**1. Environment Detection:**
```javascript
const isElectron = () => {
  return window && window.electronAPI !== undefined;
};
```

**2. Dual-Mode Methods:**
Every method checks environment and routes accordingly:
```javascript
async getClients() {
  if (isElectron()) {
    return window.electronAPI.getClients();
  }
  const response = await fetch('http://localhost:3001/api/clients');
  return response.json();
}
```

**3. Electron-Only Stubs:**
For 19 Electron-only operations, throw helpful errors in web mode:
```javascript
async exportToExcel(data, filename) {
  if (isElectron()) {
    return window.electronAPI.exportToExcel(data, filename);
  }
  throw new Error('Excel export requires desktop app. Download desktop version at qanuni.app/download');
}
```

### Implementation Checklist

**Total Methods: 156**
- 137 REST endpoints (full dual-mode)
- 19 Electron-only operations (error in web mode)

**Modules to Implement (21):**

1. **Clients (6 methods)**
   - getClients, addClient, updateClient, deleteClient, checkClientReference, getClientById

2. **Matters (6 methods)**
   - getAllMatters, addMatter, updateMatter, deleteMatter, getMattersByClientId, checkFileNumber

3. **Hearings (4 methods)**
   - getHearingsByMatterId, addHearing, updateHearing, deleteHearing

4. **Tasks (4 methods)**
   - getTasks, addTask, updateTask, deleteTask

5. **Timesheets (5 methods)**
   - getTimesheetsByMatterId, addTimesheet, updateTimesheet, deleteTimesheet, getUnbilledTime

6. **Expenses (8 methods)**
   - getExpenses, addExpense, updateExpense, deleteExpense, deductExpenseFromAdvance, getUnbilledExpenses, getBatchExpenses, addBatchExpenses

7. **Advances (10 methods)**
   - getAdvances, addAdvance, updateAdvance, deleteAdvance, deductFromAdvance, getAdvancesByClientId, getAvailableBalance, getAdvanceBalance, getAllAdvances, deductExpensesFromAdvance

8. **Invoices (8 methods)**
   - getInvoices, addInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus, markInvoiceAsPaid, getInvoiceById, getUnbilledItems

9. **Judgments (4 methods)**
   - getJudgments, addJudgment, updateJudgment, deleteJudgment

10. **Deadlines (6 methods)**
    - getDeadlines, addDeadline, updateDeadline, deleteDeadline, getDeadlinesByJudgmentId, updateDeadlineStatus

11. **Appointments (4 methods)**
    - getAppointments, addAppointment, updateAppointment, deleteAppointment

12. **Diary (4 methods)**
    - getDiaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry

13. **Lawyers (7 methods)**
    - getLawyers, addLawyer, updateLawyer, deleteLawyer, getLawyerById, getLawyerStats, getActiveLawyers

14. **Lookups (9 methods)**
    - getCourtTypes, addCourtType, updateCourtType, deleteCourtType, getRegions, getHearingPurposes, getTaskTypes, getExpenseCategories, getEntityTypes

15. **Conflict Check (2 methods)**
    - conflictCheck, getConflictHistory

16. **Corporate (24 methods)**
    - getCorporateEntities, getCorporateEntitiesByClient, addCorporateEntity, updateCorporateEntity, deleteCorporateEntity
    - getShareholdersByEntity, addShareholder, updateShareholder, deleteShareholder
    - getDirectorsByEntity, addDirector, updateDirector, deleteDirector
    - getFilingsByEntity, addFiling, updateFiling, deleteFiling
    - getMeetingsByEntity, addMeeting, updateMeeting, deleteMeeting
    - getShareTransfersByEntity, addShareTransfer, updateShareTransfer, deleteShareTransfer

17. **Trash (5 methods)**
    - getTrashItems, restoreItem, permanentDeleteItem, emptyTrash, getTrashStats

18. **Settings (22 methods)**
    - Data methods: getFirmInfo, updateFirmInfo, getSettings, updateSettings, getCurrencies, addCurrency, updateCurrency, deleteCurrency, getExchangeRates, addExchangeRate, updateExchangeRate, deleteExchangeRate
    - Electron-only: createBackup, restoreBackup, getBackups, deleteBackup, getDbPath, getBackupPath, getDatabaseInfo, verifyDatabaseIntegrity

19. **Reports (3 methods)**
    - getDashboardStats, getPendingInvoices, generateReport
    - Electron-only: exportToExcel, exportToCsv, exportToPdf, exportClientStatementPdf, exportClientStatementExcel, exportCaseStatusPdf, exportCaseStatusExcel, exportClient360Pdf, exportClient360Excel

20. **Client Imports (0 REST methods)**
    - All Electron-only: validateImportFile, importClients

21. **License (0 REST methods)**
    - Electron-only: checkLicense, validateLicenseKey, getLicenseInfo

### Testing After Phase 1

```bash
# Desktop mode - must still work
npm run dev
# Test: Open Clients module, verify list loads

# Web mode - API client created but not yet integrated
# No testing needed - just file created
```

**Git Checkpoint:**
```bash
git add src/api-client.js
git commit -m "Phase 1: Created API client layer (156 methods, dual-mode)"
```

---

## Phase 2: Update App.js (1 hour)

### Objective
Replace all `window.electronAPI.*` calls in App.js with `apiClient.*` calls.

### Implementation Strategy

**Step 1: Import apiClient**
```javascript
// src/App.js - top of file
import apiClient from './api-client';
```

**Step 2: Systematic Replacement**

Find all occurrences of `window.electronAPI` in App.js and replace:

**Pattern to find:** `window.electronAPI.functionName`  
**Replace with:** `apiClient.functionName`

**Estimated replacements: ~60-80 calls**

**Example:**
```javascript
// BEFORE
const clients = await window.electronAPI.getClients();

// AFTER
const clients = await apiClient.getClients();
```

**Key Functions in App.js:**

1. **Data Loading (useEffect on mount):**
   - getClients → apiClient.getClients()
   - getAllMatters → apiClient.getAllMatters()
   - getTasks → apiClient.getTasks()
   - getAppointments → apiClient.getAppointments()
   - getInvoices → apiClient.getInvoices()
   - getAdvances → apiClient.getAdvances()
   - getLawyers → apiClient.getLawyers()
   - getFirmInfo → apiClient.getFirmInfo()
   - getSettings → apiClient.getSettings()
   - Lookup tables: getCourtTypes, getRegions, getHearingPurposes, getTaskTypes, getExpenseCategories, getEntityTypes

2. **CRUD Operations:**
   - addClient, updateClient, deleteClient
   - addMatter, updateMatter, deleteMatter
   - addHearing, updateHearing, deleteHearing
   - addTask, updateTask, deleteTask
   - addTimesheet, updateTimesheet, deleteTimesheet
   - addExpense, updateExpense, deleteExpense
   - addAdvance, updateAdvance
   - addInvoice, updateInvoice
   - addJudgment, updateJudgment
   - addDeadline, updateDeadline
   - addAppointment, updateAppointment

3. **Report Generation:**
   - getDashboardStats
   - generateReport
   - Electron-only exports: Leave as-is, will gracefully fail in web mode

4. **Settings & Lookups:**
   - updateFirmInfo
   - updateSettings
   - addCourtType, updateCourtType, deleteCourtType
   - Similar for regions, hearing purposes, task types, expense categories

### Testing After Phase 2

```bash
# Desktop mode - CRITICAL: Must still work perfectly
npm run dev
# Test ALL modules:
# - Dashboard loads stats
# - Clients: view, add, edit, delete
# - Matters: view, add, edit
# - Hearings: add, edit
# - Tasks: add, edit
# - Settings: view firm info
# - Reports: generate a report

# Integration tests
node test-integration.js
# Must pass: 117/117
```

**Git Checkpoint:**
```bash
git add src/App.js
git commit -m "Phase 2: App.js uses apiClient (desktop mode verified)"
```

---

## Phase 3: Update Components (1 hour)

### Objective
Replace all `window.electronAPI.*` calls in form/list/module components with `apiClient.*` calls.

### Components to Update

**Forms (13 files in src/components/forms/):**
1. ClientForm.js
2. MatterForm.js
3. HearingForm.js
4. TaskForm.js
5. TimesheetForm.js
6. ExpenseForm.js
7. AdvanceForm.js
8. InvoiceForm.js
9. JudgmentForm.js
10. DeadlineForm.js
11. AppointmentForm.js
12. LookupForm.js
13. LawyerForm.js

**Lists (11 files in src/components/lists/):**
1. ClientsList.js
2. MattersList.js
3. HearingsList.js
4. TasksList.js
5. TimesheetsList.js
6. ExpensesList.js
7. AdvancesList.js
8. InvoicesList.js
9. JudgmentsList.js
10. DeadlinesList.js
11. AppointmentsList.js

**Modules (5+ files in src/components/modules/):**
1. Dashboard.js
2. Calendar.js
3. SettingsModule.js
4. Reports.js
5. Any others using window.electronAPI

**Corporate (2 files in src/components/corporate/):**
1. EntitiesList.js
2. EntityForm.js

### Implementation Pattern

**Step 1: Add import at top of each file**
```javascript
import apiClient from '../../api-client'; // Adjust path as needed
```

**Step 2: Replace all window.electronAPI calls**
Same pattern as App.js:
```javascript
// BEFORE
await window.electronAPI.addClient(clientData);

// AFTER
await apiClient.addClient(clientData);
```

### Batch Processing Strategy

**Batch 1: Forms (30 min)**
- Update all 13 forms
- Test one form from batch in desktop mode
- Commit

**Batch 2: Lists (20 min)**
- Update all 11 lists
- Test one list from batch in desktop mode
- Commit

**Batch 3: Modules + Corporate (10 min)**
- Update Dashboard, Calendar, Settings, Reports
- Update EntitiesList, EntityForm
- Test dashboard in desktop mode
- Commit

### Testing After Phase 3

```bash
# Desktop mode - Full regression test
npm run dev

# Test each module:
# ✅ Clients: add, edit, delete
# ✅ Matters: add, edit, view timeline
# ✅ Hearings: add, edit
# ✅ Tasks: add, edit, delete
# ✅ Timesheets: add, edit
# ✅ Expenses: add, edit
# ✅ Advances: add
# ✅ Invoices: create (3-step wizard)
# ✅ Judgments: add, edit
# ✅ Deadlines: add, edit
# ✅ Appointments: add, edit
# ✅ Settings: view, edit firm info, add lawyer
# ✅ Dashboard: loads stats
# ✅ Companies: view entities, add shareholder

# Integration tests
node test-integration.js
# Must pass: 117/117
```

**Git Checkpoint:**
```bash
git add src/components/
git commit -m "Phase 3: All components use apiClient (desktop verified)"
```

---

## Phase 4: Web Development Setup (30 min)

### Objective
Configure React app to run standalone in browser.

### Step 1: Install react-scripts

```bash
npm install react-scripts --save-dev
```

### Step 2: Create public/index.html

Create `public/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Qanuni - Legal Practice Management" />
    <title>Qanuni - Legal ERP</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

### Step 3: Create src/index.js

Create `src/index.js`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 4: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "electron .",
    "dev:test": "electron . --test-db",
    "api": "node server/api-server.js",
    "web": "react-scripts start",
    "dev:web": "concurrently \"npm run api\" \"npm run web\"",
    "build:web": "react-scripts build",
    "test": "node test-integration.js",
    "dist": "electron-builder",
    "dist:clean": "electron-builder --dir"
  }
}
```

**Install concurrently:**
```bash
npm install concurrently --save-dev
```

### Step 5: Configure API Base URL

Update `src/api-client.js` to use environment variable:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// In fetch calls:
const response = await fetch(`${API_BASE_URL}/api/clients`);
```

Create `.env.development`:
```
REACT_APP_API_URL=http://localhost:3001
```

### Testing After Phase 4

```bash
# Start API server + React dev server
npm run dev:web

# Browser should open at localhost:3000
# App should load (though may show errors - expected)
```

**Git Checkpoint:**
```bash
git add public/ src/index.js package.json .env.development
git commit -m "Phase 4: Web development setup (React standalone config)"
```

---

## Phase 5: Testing & Debugging (1 hour)

### Desktop Mode Testing (30 min)

**Full feature regression test:**

```bash
npm run dev
```

**Test checklist:**

**Dashboard:**
- [ ] Stats load correctly
- [ ] Today's hearings display
- [ ] Upcoming tasks display
- [ ] Recent activities display

**Clients:**
- [ ] List loads all clients
- [ ] Add client works
- [ ] Edit client works
- [ ] Delete client works (soft delete)
- [ ] Client 360 view works

**Matters:**
- [ ] List loads all matters with client names
- [ ] Add matter works (inherits court/region)
- [ ] Edit matter works
- [ ] Matter timeline shows diary entries
- [ ] Can add diary entry

**Hearings:**
- [ ] List loads all hearings
- [ ] Add hearing inherits court/region from matter
- [ ] Edit hearing works

**Tasks:**
- [ ] List loads all tasks
- [ ] Add task works
- [ ] Edit task works
- [ ] Status updates work

**Timesheets:**
- [ ] View timesheets for a matter
- [ ] Add timesheet works
- [ ] Edit timesheet works
- [ ] Unbilled timesheets show in invoice wizard

**Expenses:**
- [ ] List loads expenses
- [ ] Add expense works
- [ ] Edit expense works
- [ ] Unbilled expenses show in invoice wizard

**Invoices:**
- [ ] 3-step wizard works
- [ ] Select client → loads matters/timesheets/expenses
- [ ] Select items → adds to invoice
- [ ] Review → shows totals correctly
- [ ] Save invoice works

**Settings:**
- [ ] Firm info displays
- [ ] Edit firm info works
- [ ] Lawyers tab works
- [ ] Add lawyer works
- [ ] Lookup tables work (court types, regions, etc.)

**Integration Tests:**
```bash
node test-integration.js
# Must show: ✅ All tests passed (117/117)
```

### Web Mode Testing (30 min)

**Start web version:**
```bash
npm run dev:web
# Terminal 1: API server starts at localhost:3001
# Terminal 2: React starts at localhost:3000
# Browser opens at localhost:3000
```

**Expected behavior:**

**✅ Should work:**
- App loads without crashing
- Dashboard shows stats
- All modules navigate correctly
- Client list loads
- Matter list loads
- All read operations work
- Add/Edit/Delete operations work for all entities
- Lookup dropdowns populate
- Forms validate correctly

**⚠️ Electron-only features (expected to fail gracefully):**
- Excel/PDF exports → Show error: "Requires desktop app"
- Backup/restore → Show error: "Requires desktop app"
- Import clients from Excel → Show error: "Requires desktop app"
- File system operations → Show error: "Requires desktop app"

**🐛 Debug common issues:**

1. **"Cannot read property X of undefined"**
   - Check: apiClient method exists
   - Check: API endpoint returns data correctly
   - Check: cors() middleware enabled in server

2. **"Network error" / "Failed to fetch"**
   - Check: API server running at localhost:3001
   - Check: API_BASE_URL configured correctly
   - Check: Route exists in server/routes/

3. **"401 Unauthorized"**
   - Web mode bypasses license check (by design)
   - If seeing this, license middleware needs web exception

4. **Empty lists showing when data exists**
   - Check: API endpoint returns array, not { success, data }
   - Check: Component expects raw array vs wrapped object

**Test specific scenarios:**

**Scenario 1: Add Client**
- [ ] Navigate to Clients
- [ ] Click "+ Add Client"
- [ ] Fill form
- [ ] Click Save
- [ ] Client appears in list
- [ ] Check API logs: POST /api/clients succeeded

**Scenario 2: Create Matter**
- [ ] Navigate to Matters
- [ ] Click "+ Add Matter"
- [ ] Select client (dropdown populates)
- [ ] Select court/region (dropdowns populate)
- [ ] Click Save
- [ ] Matter appears in list

**Scenario 3: Dashboard Stats**
- [ ] Navigate to Dashboard
- [ ] Stats cards show numbers
- [ ] Today's hearings display
- [ ] Check API logs: GET /api/reports/dashboard-stats succeeded

**Scenario 4: Invoice Wizard**
- [ ] Navigate to Invoices
- [ ] Click "+ New Invoice"
- [ ] Step 1: Select client → matters load
- [ ] Step 2: Select matter → timesheets/expenses load
- [ ] Step 3: Review → totals calculate
- [ ] Save → invoice created

### Known Issues & Workarounds

**Issue 1: Electron-only operations**
- **Expected:** exportToExcel, exportToPdf throw errors in web mode
- **Workaround:** Error messages guide user to download desktop app
- **Future:** Implement web-native export (server-side PDF generation)

**Issue 2: License bypass in web mode**
- **Current:** Web mode has no authentication
- **Security:** API server has no auth middleware (intentional for PoC)
- **Future:** Session 4 will add JWT-based auth

**Issue 3: Database file path**
- **Desktop:** Uses %APPDATA%/Qanuni/qanuni.db
- **Web:** Uses qanuni-web.db in project root
- **Important:** Separate databases for desktop vs web testing

**Issue 4: RTL layout in browser**
- **May need:** Additional CSS for RTL support
- **Test:** Switch to Arabic, verify layout doesn't break

---

## Phase 6: Git Checkpoint & Documentation (15 min)

### Final Testing

**Before committing:**

```bash
# Desktop mode - full test
npm run dev
# Test: All 11 modules work

# Integration tests
node test-integration.js
# Must show: 117/117 passing

# Web mode - smoke test
npm run dev:web
# Test: Dashboard loads, can add client, can create matter
```

### Git Commit

```bash
git add -A
git status  # Review changes

git commit -m "Session 3 complete: React app runs in browser

- Created src/api-client.js with 156 dual-mode methods
- Updated App.js to use apiClient (60+ replacements)
- Updated all components (13 forms, 11 lists, 5+ modules)
- Web development setup (public/index.html, src/index.js)
- Configured npm run dev:web (API + React)
- Desktop mode: Fully backward compatible
- Web mode: localhost:3000 operational
- 19 Electron-only handlers gracefully fail in web mode
- Integration tests: 117/117 passing

Desktop verified: All 11 modules tested
Web verified: Dashboard, Clients, Matters, Invoices tested

Ready for Session 4: Automated testing"

git tag v48.2-session3-web-frontend
git push origin main --tags
```

### Update Documentation

**Update CLAUDE.md:**

Add to "Current Status" section:
```markdown
## Web Version Status (NEW - Session 3)
- ✅ React app runs in browser at localhost:3000
- ✅ API client layer with environment detection
- ✅ 137 REST endpoints operational
- ✅ Desktop mode fully backward compatible
- ✅ Web mode functional (all CRUD operations work)
- ⚠️ 19 Electron-only operations show helpful errors
- ⏳ Authentication pending (Session 4)
```

**Create SESSION_3_COMPLETE.md:**

Document what was delivered, testing results, known issues, and handoff to Session 4.

---

## Success Criteria

Before declaring Session 3 complete, verify ALL:

### Desktop Mode (Backward Compatibility)
- [ ] `npm run dev` starts app without errors
- [ ] All 11 modules load and navigate
- [ ] Dashboard shows stats correctly
- [ ] Can add/edit/delete clients
- [ ] Can create matters with court/region inheritance
- [ ] Can add hearings that inherit from matter
- [ ] Can create timesheets and expenses
- [ ] Invoice wizard completes 3 steps
- [ ] Can add diary entries to matter timeline
- [ ] Settings module works (firm info, lawyers, lookups)
- [ ] Companies module works (entities, shareholders, directors)
- [ ] Integration tests pass: `node test-integration.js` → 117/117
- [ ] No console errors in Electron DevTools
- [ ] No regressions from previous version

### Web Mode (New Functionality)
- [ ] `npm run dev:web` starts both API and React without errors
- [ ] Browser opens at localhost:3000 automatically
- [ ] App loads without white screen or crash
- [ ] Dashboard displays stats (not zeros)
- [ ] Client list loads with data
- [ ] Matter list loads with client names
- [ ] Can navigate between all modules
- [ ] Can add a new client (form validation works)
- [ ] Can create a new matter (dropdowns populate)
- [ ] Can add hearing (inherits court/region from matter)
- [ ] Can create timesheet for a matter
- [ ] Can generate a report (e.g., Client 360)
- [ ] Lookup dropdowns work (court types, regions, etc.)
- [ ] Arabic toggle works (RTL layout doesn't break)
- [ ] Electron-only operations show helpful errors (not crashes)

### Code Quality
- [ ] No `window.electronAPI` calls remain in components
- [ ] All components import and use apiClient
- [ ] src/api-client.js has all 156 methods
- [ ] Environment detection works correctly
- [ ] API_BASE_URL uses environment variable
- [ ] No hardcoded localhost:3001 in components
- [ ] Consistent error handling across all methods

### Documentation
- [ ] CLAUDE.md updated with web version status
- [ ] SESSION_3_COMPLETE.md created with full context
- [ ] Git commit has comprehensive message
- [ ] Git tag v48.2-session3-web-frontend created
- [ ] Changes pushed to GitHub

---

## Common Issues & Solutions

### Issue 1: "window.electronAPI is not defined"
**Cause:** Component calling window.electronAPI in web mode  
**Fix:** Replace with apiClient call  
**Verify:** Search codebase: `grep -r "window.electronAPI" src/`

### Issue 2: "Failed to fetch http://localhost:3001/api/..."
**Cause:** API server not running  
**Fix:** Run `npm run dev:web` (starts both API and React)  
**Verify:** Check terminal - should see "Qanuni API: http://localhost:3001"

### Issue 3: CORS errors in browser console
**Cause:** API server missing cors() middleware  
**Fix:** Ensure `server/api-server.js` has:
```javascript
const cors = require('cors');
app.use(cors());
```

### Issue 4: Empty lists in web mode (but data exists)
**Cause:** API returns wrapped object `{ success, data }` but component expects array  
**Fix:** Check API endpoint returns format component expects  
**Debug:** Log response in apiClient method

### Issue 5: Forms don't submit in web mode
**Cause:** Validation errors not displayed, or API not receiving data  
**Fix:** Check browser DevTools Network tab → POST request → payload  
**Verify:** API logs show request received

### Issue 6: Dropdown menus empty in web mode
**Cause:** Lookup data not loading on mount  
**Fix:** Ensure App.js loads lookups via apiClient in useEffect  
**Verify:** Check API logs for GET /api/lookups/* calls

### Issue 7: React build errors after adding web setup
**Cause:** Missing dependencies or incorrect import paths  
**Fix:** Run `npm install` to ensure all deps installed  
**Verify:** Check src/index.js imports match actual file locations

---

## Handoff to Session 4

**After Session 3 is complete, Session 4 will:**

1. **Automated Testing (2-3 hours)**
   - Claude navigates to localhost:3000 in browser
   - Tests all 11 modules systematically
   - Clicks every button, tests every form
   - Takes 100+ screenshots documenting results
   - Generates comprehensive test report with bug list

2. **Bug Fixes (1-2 hours)**
   - Fix all bugs discovered by automated testing
   - Priority: Data accuracy bugs (wrong totals, missing data)
   - Then: UI bugs (layout, validation, error messages)
   - Finally: Polish (loading states, empty states)

3. **Resume Phase 3c.7a (2-3 hours)**
   - Step 2: CalendarContext (2 states)
   - Step 3: DataContext (8 states)
   - Step 4: EntityDataContext (13 states)
   - Target: App.js with ~10 useState (92% reduction achieved)

**Session 4 deliverables:**
- Web app fully tested and debugged
- App.js refactored to ~10 useState
- Production-ready for both desktop and web
- Foundation for future features (auth, multi-user, etc.)

---

## Context for New Session

**Files to upload:**
1. SESSION_3_WEB_FRONTEND_PLAN.md (this file)
2. SESSION_2_COMPLETE.md (Session 2 context)
3. CLAUDE.md (project overview)
4. PATTERNS.md (code conventions)
5. API_ENDPOINTS.md (REST API reference)

**First request:**
```
Ready to execute Session 3: Web Frontend.

Context:
- Session 2 COMPLETE: 21 modules dual-mode, 137 REST endpoints operational
- Desktop app fully functional (v48.2-session2-complete)
- Integration tests: 117/117 passing

Goal: Enable React app in browser (localhost:3000)

See SESSION_3_WEB_FRONTEND_PLAN.md for detailed execution strategy.

Start with Phase 1: Create src/api-client.js (156 methods, dual-mode).
```

---

*Session 3 plan created: February 11, 2026*  
*Estimated duration: 4-5 hours*  
*Tool: Claude Code Chat*  
*Status: Ready to execute*
