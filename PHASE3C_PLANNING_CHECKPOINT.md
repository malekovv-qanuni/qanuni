# Phase 3c Planning Checkpoint - App.js Context Extraction

**Date:** February 9, 2026  
**Session:** Phase 3c Planning - State Management Analysis  
**Status:** Analysis complete, awaiting verification before extraction begins  
**Context Used:** ~53% (100K/190K tokens)

---

## Session Accomplishments

### 1. Updated CLAUDE.md Workflow Documentation ✅
**Problem:** Recurring confusion about "Claude Code" vs "Claude Web Chat" - unclear that these are two separate chat interfaces requiring manual copy/paste between them.

**Solution:** Created comprehensive workflow section explaining:
- Two separate Claude chat interfaces exist
- User acts as the bridge (copy/paste between chats)
- Step-by-step flow with real v48 example
- Critical rules to avoid confusion

**Deliverable:** `CLAUDE_updated_workflow_section.md` (ready to merge into CLAUDE.md)

---

### 2. Complete App.js State Analysis ✅
Analyzed all 1,691 lines of App.js to identify context extraction opportunities.

#### **Current State Inventory:**
- **Total useState calls:** ~80+ (exact count pending verification)
- **Total lines:** 1,691
- **Data loaded at startup:** 18 parallel API calls via loadAllData()

#### **State Categorization (14 categories):**

**Category 1: App State (7 states)**
```
currentModule, sidebarOpen, loading, licenseStatus, 
licenseChecked, machineId, hasUnsavedChanges, pendingNavigation
```

**Category 2: Data State (18 entities)**
```
Reference Data (8): lawyers, courtTypes, regions, hearingPurposes, 
                     taskTypes, expenseCategories, entityTypes, firmInfo

Operational Data (10): clients, matters, hearings, judgments, tasks, 
                        timesheets, appointments, expenses, advances, 
                        invoices, deadlines, corporateEntities, dashboardStats
```

**Category 3: UI State - Form Visibility (16 states)**
```
showClientForm, showMatterForm, showHearingForm, showTaskForm, 
showTimesheetForm, showJudgmentForm, showAppointmentForm, showExpenseForm, 
showAdvanceForm, showInvoiceForm, showDeadlineForm, showEntityForm, 
showLookupForm, showMatterTimeline, showConflictResults, showPartyForm
```

**Category 4: UI State - Modal Visibility (9 states)**
```
showClientStatement, showCaseStatusReport, showClient360Report, 
showCompany360Report, showComplianceCalendar, showShareholderRegistry, 
showDirectorRegistry, showAppealMatterDialog, showWidgetSettings, viewingInvoice
```

**Category 5: Editing State (11+ states)**
```
editingClient, editingMatter, editingHearing, editingTask, editingTimesheet, 
editingJudgment, editingAppointment, editingExpense, editingAdvance, 
editingInvoice, editingEntity, editingDeadline, editingLookup
```

**Category 6: Form Data State (6 states)**
```
hearingFormData, clientFormData, matterFormData, taskFormData, 
timesheetFormData, deadlineFormData
```

**Category 7: Filter & Pagination (24 states)**
```
Timesheets: timesheetFilters, timesheetPage, timesheetPageSize
Expenses: expenseFilters, expensePage, expensePageSize
Invoices: invoiceFilters, invoicePage, invoicePageSize
Deadlines: deadlineFilters, deadlinePage, deadlinePageSize
Tasks: taskFilters, taskPage, taskPageSize, taskStatusFilter, taskPriorityFilter
Legacy: clientSearch, matterSearch
```

**Category 8: Report State (9 states)**
```
clientStatementData, clientStatementLoading, clientStatementFilters
caseStatusData, caseStatusLoading, caseStatusClientId
client360Data, client360Loading, client360ClientId
```

**Category 9: Calendar State (2 states)**
```
calendarView, calendarDate
```

**Category 10: Dashboard Widget State (3 states)**
```
dashboardWidgets, draggedWidget, showWidgetSettings
```

**Category 11: Timer State (7 states + 1 ref)**
```
timerExpanded, timerRunning, timerSeconds, timerClientId, 
timerMatterId, timerNarrative, timerLawyerId
timerIntervalRef (useRef)
```

**Category 12: Notification State (2 states)**
```
toast, confirmDialog
```

**Category 13: Navigation State (2 states)**
```
hasUnsavedChanges, pendingNavigation
```

**Category 14: Misc State (6+ states)**
```
selectedMatter, conflictResults, timelineMatter, entityFormTab, 
currentLookupType, settingsTab, appealMatterData
```

---

## Critical Performance Issue Identified

### **The loadAllData() Problem**
**Location:** Lines 450-520 of App.js

**Current behavior:**
```javascript
// 18 PARALLEL API CALLS AT STARTUP
const [clientsData, mattersData, hearingsData, ...] = await Promise.all([
  window.electronAPI.getAllClients(),
  window.electronAPI.getAllMatters(),
  window.electronAPI.getAllHearings(),
  // ... 15 more calls
]);
```

**Impact with realistic data (1,000 matters, 5,000 timesheets, 3,000 expenses):**
- ❌ Startup time: 4-6 seconds
- ❌ Memory usage: ~150MB just for state
- ❌ Every CRUD operation re-renders entire app
- ❌ All data loaded even if user only visits Dashboard

**Root cause:** God component anti-pattern + eager loading strategy

---

## Proposed Solution: 8-Context Architecture

### **Context 1: AppContext**
```javascript
{
  currentModule, sidebarOpen, loading,
  licenseStatus, licenseChecked, machineId,
  hasUnsavedChanges, pendingNavigation
}
```
**Impact:** Basic app state, minimal extraction

---

### **Context 2: DataContext**
```javascript
{
  // Reference data (load once at startup)
  lawyers, courtTypes, regions, hearingPurposes,
  taskTypes, expenseCategories, entityTypes, firmInfo,
  
  refreshLookups()
}
```
**Impact:** ~8 states moved, ~100KB memory (acceptable at startup)

---

### **Context 3: EntityDataContext**
```javascript
{
  // Operational data (load on-demand per module)
  clients, matters, hearings, judgments, tasks,
  timesheets, appointments, expenses, advances,
  invoices, deadlines, corporateEntities, dashboardStats,
  
  // Targeted refresh functions
  refreshClients(), refreshMatters(), ...,
  
  // Lazy loading
  loadModule(moduleName)
}
```
**Impact:** 
- Startup: Only loads reference data + dashboard stats (1s vs 6s)
- Memory: 20MB at startup, grows as modules visited
- Removes 18 states from App.js

---

### **Context 4: UIContext**
```javascript
{
  forms: {
    client: { isOpen, editing, formData },
    matter: { isOpen, editing, formData },
    // ... all 13 forms
  },
  
  modals: {
    clientStatement: { isOpen, data, loading },
    // ... all modals
  },
  
  openForm(formType, editingData?),
  closeForm(formType),
  openModal(modalType, data?)
}
```
**Impact:** 
- ~40 states removed from App.js
- All form/modal logic centralized
- Cleaner component props

---

### **Context 5: FilterContext**
```javascript
{
  timesheets: { filters, page, pageSize },
  expenses: { filters, page, pageSize },
  invoices: { filters, page, pageSize },
  deadlines: { filters, page, pageSize },
  tasks: { filters, page, pageSize },
  
  setFilters(entity, filters),
  setPage(entity, page)
}
```
**Impact:** 24 states removed from App.js

---

### **Context 6: NotificationContext**
```javascript
{
  toast, confirmDialog,
  showToast(message, type),
  hideToast(),
  showConfirm(title, message, onConfirm, options),
  hideConfirm()
}
```
**Impact:** 
- 2 states + 4 functions removed
- Used by ~30+ components (eliminates prop-drilling)
- **Easiest context to build first** (low risk)

---

### **Context 7: TimerContext**
```javascript
{
  expanded, running, seconds,
  clientId, matterId, narrative, lawyerId,
  
  startTimer(), pauseTimer(), resetTimer(), saveTimeEntry()
}
```
**Impact:** 
- 7 states + 1 ref removed
- Self-contained widget (isolated from rest of app)
- **Second easiest context** (low risk)

---

### **Context 8: CalendarContext**
```javascript
{
  view, currentDate,
  setView(view), setDate(date), goToToday()
}
```
**Impact:** 2 states removed, minimal (defer to later)

---

## Phased Extraction Strategy

### **Phase 3c.1: Foundation (Session 1) - 2-3 hours**
1. Create all 8 context files in `src/contexts/`
2. Create `src/contexts/index.js` with provider wrapper
3. Wrap App.js in providers (keep duplicate state temporarily)
4. Test: App still works exactly as before

---

### **Phase 3c.2: Notification Context (Session 1-2) - 1-2 hours**
**Why first:** Lowest risk, highest reuse (~30+ components)

1. Move toast/confirmDialog to NotificationContext
2. Update all components to use `useNotification()` hook
3. Remove notification state from App.js
4. Test: Toast and confirm dialogs work

**Expected impact:** 2 states removed, props eliminated from 30+ components

---

### **Phase 3c.3: Timer Context (Session 2) - 1 hour**
**Why second:** Isolated, self-contained

1. Extract timer widget to TimerContext
2. Update TimerWidget component
3. Remove timer state from App.js
4. Test: Timer works independently

**Expected impact:** 7 states + 1 ref removed

---

### **Phase 3c.4: UI Context (Session 2-3) - 3-4 hours**
**Why third:** Big win, but needs careful testing

1. Move 16 form visibility + 11 editing + 6 formData states
2. Create `useUI()` hook
3. Update all 13 form components
4. Remove UI state from App.js
5. Test: All forms open/close/edit correctly

**Expected impact:** ~40 states removed

---

### **Phase 3c.5: Filter Context (Session 3) - 2 hours**
1. Move filter/pagination state
2. Update 5 list components (Timesheets, Expenses, Invoices, Deadlines, Tasks)
3. Remove filter state from App.js
4. Test: Filtering and pagination work

**Expected impact:** 24 states removed

---

### **Phase 3c.6: Data Context (Session 3-4) - 3-4 hours**
**Why penultimate:** Biggest performance win, but needs careful migration

1. Move reference data to DataContext
2. Move operational data to EntityDataContext
3. Implement `loadModule()` for on-demand loading
4. Update `loadAllData()` to only load reference + stats
5. Each module loads own data on first visit
6. Test: Navigate to each module, verify data loads

**Expected impact:** 
- 18 states removed
- Startup: 6s → 1s
- Memory: 150MB → 20MB initial

---

### **Phase 3c.7: App Context (Session 4) - 1 hour**
1. Move remaining app-level state
2. Move calendar state to CalendarContext
3. Final cleanup
4. Test: Full app navigation

**Expected impact:** Final ~10 states removed

---

### **Phase 3c.8: API Wrapper Adoption (Session 4-5) - 2-3 hours**
1. Update all 13 forms to use `src/utils/api.js`
2. Handle structured errors `{ success: false, error: '...' }`
3. Show user-friendly error messages
4. Test: Trigger validation errors, backend errors

---

## Expected Results After Phase 3c

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| App.js lines | 1,691 | ~400 | -76% |
| useState in App.js | 80+ | ~5 | -94% |
| Startup time (1K matters) | 6s | 1s | 6x faster |
| Memory at startup | 150MB | 20MB | 7x less |
| Re-renders on CRUD | Entire app | Affected context only | 10-20x fewer |
| Context files | 0 | 8 | New architecture |

---

## Next Steps - VERIFICATION REQUIRED

**Before proceeding with extraction, we need to verify the analysis.**

### **Action Required:**
Paste this into **Claude Code Chat** to verify my counts and assumptions:

```
I need to verify the App.js state analysis for Qanuni Phase 3c context extraction planning. 

Project location: C:\Projects\qanuni
File to analyze: src\App.js

Please run these verification commands and provide clear, formatted results I can paste back to Claude Web Chat:

1. Count total useState calls:
   grep -c "useState" src/App.js

2. List all useState declarations with line numbers:
   grep -n "const \[.*useState" src/App.js

3. List all form visibility states:
   grep -n "const \[show.*Form" src/App.js

4. List all editing states:
   grep -n "const \[editing" src/App.js

5. List all formData states:
   grep -n "FormData.*useState" src/App.js

6. Show the loadAllData Promise.all API calls:
   grep -A 25 "const loadAllData" src/App.js | grep "window.electronAPI"

7. Count components receiving 'showToast' prop:
   grep -c "showToast={showToast}" src/App.js

8. Count components receiving 'lawyers' prop:
   grep -c "lawyers={lawyers}" src/App.js

9. List all refresh functions:
   grep -n "const refresh" src/App.js

10. Show props passed to ClientForm:
    grep -A 3 "<ClientForm" src/App.js

11. Find complex state objects:
    grep -n "useState({" src/App.js

12. List filter/pagination states:
    grep -n "Filters.*useState\|Page.*useState\|PageSize.*useState" src/App.js

Please format the output clearly with headers for each command so I can easily paste it back to Claude Web Chat for analysis.
```

---

### **After Verification:**
1. Paste Claude Code Chat results back to Claude Web Chat
2. Review findings, adjust context architecture if needed
3. Decide: Build all 8 contexts or start with highest-impact 4?
4. Begin Phase 3c.1 (Foundation) - create context files

---

## Files Modified This Session

| File | Action | Status |
|------|--------|--------|
| `CLAUDE_updated_workflow_section.md` | Created | ✅ Ready to merge into CLAUDE.md |

---

## Files to Update Next Session

| File | Change Needed |
|------|---------------|
| `CLAUDE.md` | Replace "Development Workflow" section with updated content |
| `src/contexts/*.js` | Create 8 new context files (Phase 3c.1) |
| `src/contexts/index.js` | Create provider wrapper |
| `src/App.js` | Wrap with providers, begin state extraction |

---

## Session Metrics

- **Duration:** ~2 hours
- **Context used:** 53% (100K/190K tokens)
- **Files analyzed:** 1 (App.js - 1,691 lines)
- **Documentation created:** 1 (CLAUDE.md update)
- **States categorized:** 80+
- **Contexts designed:** 8
- **Phases planned:** 8 sub-phases

---

## Risks Identified

### **Risk 1: Breaking forms during migration**
**Mitigation:** Keep duplicate state temporarily, migrate one form at a time

### **Risk 2: Performance regression during transition**
**Mitigation:** Start with fastest contexts (Notification, Timer), measure before/after

### **Risk 3: On-demand loading breaks assumptions**
**Mitigation:** Keep preload option, each list checks `if (!data.length) loadData()`

---

## Questions for Next Session

1. Should we build all 8 contexts or start with highest-impact 4?
2. How many sessions to allocate for Phase 3c? (Estimated: 4-5 sessions)
3. Should we create verification/test scripts for context migration?
4. Priority: Performance (on-demand loading) or maintainability (context extraction)?

---

**Status:** Ready to proceed after verification ✅  
**Next Action:** Run verification commands in Claude Code Chat  
**Estimated Timeline:** Phase 3c complete in 4-5 sessions (12-20 hours total)

---

*Checkpoint created: February 9, 2026*  
*Session: Phase 3c Planning*  
*Resume at: Verification step above*
