# CHECKPOINT: Qanuni v47.0 — Phase 3 Frontend Hardening Plan

**Date:** February 9, 2026  
**Version:** v47.0 (Phase 2 complete, Phase 3 not started)  
**Created by:** Opus session — detailed plan for Sonnet execution  
**Status:** READY TO EXECUTE — no code changes made yet this session

---

## Prerequisites Before Starting

### Confirm baseline
```powershell
cd C:\Projects\qanuni
node test-integration.js    # Must show 116/116 passing (or 0 failures)
git status                  # Should be clean (v47.0 committed)
```

### Files needed for Phase 3 work
Upload these to the Sonnet session:
- `App.js` — main target (~1,867 lines)
- `MatterForm.js` — needs matter_name_arabic field added
- `src/constants/translations.js` — to verify translation keys exist
- `src/components/common/FormField.js` — reference for ErrorBoundary pattern
- This checkpoint file

---

## Phase 3 Tasks (Priority Order)

### TASK 1: React ErrorBoundary Component
**Priority:** CRITICAL  
**Risk:** Currently one component crash = entire app white screen  
**Files to create:** `src/components/common/ErrorBoundary.js`  
**Files to modify:** `App.js` (wrap main content area)

#### What to build
A class component (ErrorBoundary must be a class — React doesn't support functional error boundaries) that:
- Catches any render error in child components
- Shows a friendly "Something went wrong" UI instead of white screen
- Has a "Retry" button that resets the error state
- Logs the error (console.error for now, later integrate with electron logging)
- Does NOT catch errors in event handlers (React limitation) — only render errors

#### Exact code for ErrorBoundary.js
```javascript
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // If electron logging is available, log there too
    try {
      if (window.electronAPI && window.electronAPI.logError) {
        window.electronAPI.logError({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack
        });
      }
    } catch (e) {
      // Silently fail — logging shouldn't cause more errors
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry
        });
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {this.props.language === 'ar' ? '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {this.props.language === 'ar' 
                ? '\u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645. \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0622\u0645\u0646\u0629.'
                : 'An error occurred in this section. Your data is safe.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {this.props.language === 'ar' ? '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629' : 'Try Again'}
            </button>
            {/* Show technical details in dev mode */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### Where to wrap in App.js
Add import at top of App.js:
```javascript
import ErrorBoundary from './components/common/ErrorBoundary';
```

Wrap the **main content area** (not the whole app — keep sidebar/header always visible).
Find this section (~line 1090):
```javascript
{/* Main Content */}
<div className="flex-1 p-6">
  {currentModule === 'dashboard' && <Dashboard ...
```

Change to:
```javascript
{/* Main Content */}
<div className="flex-1 p-6">
  <ErrorBoundary language={language} onRetry={loadAllData}>
    {currentModule === 'dashboard' && <Dashboard ...
    ...all module renders...
    {currentModule === 'conflict-check' && <ConflictCheckTool ... />}
  </ErrorBoundary>
</div>
```

The closing `</ErrorBoundary>` goes right before the closing `</div>` of the main content area (~line 1451, just before the Modals section).

**Do NOT wrap modals in this boundary** — they render at the root level and have their own close buttons for recovery.

#### Export from common/index.js
If there's a barrel export file for common components, add ErrorBoundary there. If not, the direct import is fine.

---

### TASK 2: Structured Error Handling (API Wrapper)
**Priority:** CRITICAL  
**Risk:** New hardened backend returns `{ success: false, errors: [...] }` but frontend expects raw arrays  
**Files to create:** `src/utils/api.js`  
**Files to modify:** None initially — wrapper is opt-in, forms can adopt gradually

#### The Problem
The new backend handlers (Phase 2) return structured responses:
```javascript
// SUCCESS: add-client returns
{ success: true, clientId: 'CLT-2026-a7f3b9c1' }

// FAILURE: add-client returns  
{ success: false, errors: [{ field: 'client_name', message: 'Required', code: 'REQUIRED' }] }

// GET handlers still return arrays (backward compatible)
[{ client_id: '...', client_name: '...' }, ...]
```

But the frontend (forms, refresh functions) does:
```javascript
// Form submission — expects no structured response, just no error thrown
await window.electronAPI.addClient(clientData);
showToast('Client added!');

// Data loading — expects raw arrays
const clientsData = await window.electronAPI.getAllClients();
setClients(clientsData); // Will break if this is { success: false, errors: [...] }
```

#### Solution: Create `src/utils/api.js`
```javascript
/**
 * API Wrapper for Qanuni Frontend (v47.0 Phase 3)
 * 
 * Handles structured error responses from hardened backend.
 * GET operations: unwrap arrays, handle error objects
 * WRITE operations: check success flag, extract errors
 */

/**
 * Safely call a GET/list API method.
 * Returns the data array, or empty array on failure.
 * Shows toast on error if showToast provided.
 */
export async function apiGet(apiFn, args = [], { showToast, language, fallback = [] } = {}) {
  try {
    const result = await apiFn(...args);
    
    // If result is an array, it's the old format — return as-is
    if (Array.isArray(result)) {
      return result;
    }
    
    // If result is a structured response
    if (result && typeof result === 'object') {
      // Success with data
      if (result.success !== false) {
        // Could be { success: true, data: [...] } or just an object
        if (Array.isArray(result.data)) return result.data;
        return result;
      }
      
      // Error response
      console.error('API error:', result.errors || result.error);
      if (showToast) {
        const msg = result.errors?.[0]?.message || result.error || 'An error occurred';
        showToast(msg, 'error');
      }
      return fallback;
    }
    
    // Null/undefined — return fallback
    return result ?? fallback;
  } catch (error) {
    console.error('API call failed:', error);
    if (showToast) {
      showToast(
        language === 'ar' ? '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644' : 'Connection error',
        'error'
      );
    }
    return fallback;
  }
}

/**
 * Safely call a WRITE API method (add, update, delete).
 * Returns { success: true, ...data } or { success: false, errors: [...] }.
 * Shows toast on error if showToast provided.
 */
export async function apiWrite(apiFn, args = [], { showToast, language } = {}) {
  try {
    const result = await apiFn(...args);
    
    // Old-style handlers that return nothing or just an ID
    if (result === undefined || result === null) {
      return { success: true };
    }
    
    // Already structured
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success && showToast) {
        const errorMessages = result.errors?.map(e => e.message).join(', ') || result.error || 'Operation failed';
        showToast(errorMessages, 'error');
      }
      return result;
    }
    
    // Primitive return (like an ID string) — treat as success
    return { success: true, data: result };
  } catch (error) {
    console.error('API write failed:', error);
    if (showToast) {
      showToast(
        language === 'ar' ? '\u062e\u0637\u0623 \u0641\u064a \u062d\u0641\u0638 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a' : 'Error saving data',
        'error'
      );
    }
    return { success: false, errors: [{ message: error.message }] };
  }
}

/**
 * Extract validation errors into a field-keyed object for form display.
 * Input:  { success: false, errors: [{ field: 'client_name', message: 'Required' }] }
 * Output: { client_name: 'Required' }
 */
export function extractFieldErrors(result) {
  if (!result || result.success !== false || !Array.isArray(result.errors)) {
    return {};
  }
  const fieldErrors = {};
  result.errors.forEach(err => {
    if (err.field) {
      fieldErrors[err.field] = err.message;
    }
  });
  return fieldErrors;
}
```

#### How to adopt gradually in App.js
**Phase 3a (this session):** Create the file. No App.js changes yet.
**Phase 3b (next session):** Update refresh functions one by one:

Example — converting `refreshClients`:
```javascript
// BEFORE (current):
const refreshClients = async () => {
  try {
    const [clientsData, statsData] = await Promise.all([
      window.electronAPI.getAllClients(),
      window.electronAPI.getDashboardStats()
    ]);
    setClients(clientsData);
    setDashboardStats(statsData);
  } catch (error) {
    console.error('Error refreshing clients:', error);
  }
};

// AFTER (with api wrapper):
import { apiGet } from './utils/api';

const refreshClients = async () => {
  const [clientsData, statsData] = await Promise.all([
    apiGet(window.electronAPI.getAllClients),
    apiGet(window.electronAPI.getDashboardStats, [], { fallback: {} })
  ]);
  setClients(clientsData);
  setDashboardStats(statsData);
};
```

Example — converting form submission in a form component:
```javascript
// BEFORE:
await window.electronAPI.addClient(clientData);
showToast('Client added!');

// AFTER:
import { apiWrite, extractFieldErrors } from '../../utils/api';

const result = await apiWrite(
  window.electronAPI.addClient, 
  [clientData], 
  { showToast, language }
);
if (result.success) {
  showToast(language === 'ar' ? '...' : 'Client added!');
  refreshClients();
  setShowClientForm(false);
} else {
  // Show field-level errors on the form
  const fieldErrors = extractFieldErrors(result);
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);
  }
}
```

**Important:** The wrapper is designed to be backward-compatible. It handles both old-style returns (raw arrays, undefined) and new structured returns. This means you can adopt it incrementally without breaking anything.

---

### TASK 3: Fix License Check — Fail-Closed in Frontend
**Priority:** HIGH  
**Risk:** Frontend still allows access on license check error (line 358 of App.js)  
**Files to modify:** `App.js` (lines 340-364)

#### Current code (BROKEN — fail-open):
```javascript
// App.js lines 340-364
useEffect(() => {
  const checkLicense = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getLicenseStatus) {
        const [status, id] = await Promise.all([
          window.electronAPI.getLicenseStatus(),
          window.electronAPI.getMachineId()
        ]);
        setLicenseStatus(status);
        setMachineId(id);
      } else {
        // Development mode without Electron - skip license check
        setLicenseStatus({ isValid: true, status: 'DEV_MODE' });
      }
    } catch (error) {
      console.error('License check error:', error);
      // In case of error, allow app to run (fail-open for now)  ← BUG
      setLicenseStatus({ isValid: true, status: 'ERROR', message: error.message });
    } finally {
      setLicenseChecked(true);
    }
  };
  checkLicense();
}, []);
```

#### Fixed code (fail-closed):
```javascript
useEffect(() => {
  const checkLicense = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getLicenseStatus) {
        const [status, id] = await Promise.all([
          window.electronAPI.getLicenseStatus(),
          window.electronAPI.getMachineId()
        ]);
        setLicenseStatus(status);
        setMachineId(id);
      } else if (process.env.NODE_ENV === 'development' || !window.electronAPI) {
        // Development mode without Electron - skip license check
        setLicenseStatus({ isValid: true, status: 'DEV_MODE' });
      } else {
        // Production but no license API — block
        setLicenseStatus({ isValid: false, status: 'NO_LICENSE_API', message: 'License system unavailable' });
      }
    } catch (error) {
      console.error('License check error:', error);
      // FAIL-CLOSED: block access on error
      setLicenseStatus({ isValid: false, status: 'ERROR', message: error.message });
    } finally {
      setLicenseChecked(true);
    }
  };
  checkLicense();
}, []);
```

**Key change:** The catch block now sets `isValid: false` instead of `true`. Only `npm run dev` (where `window.electronAPI` is undefined) gets a free pass.

**⚠️ IMPORTANT:** Test this carefully with `npm run dev` and `npm run dev:test` before building. If the license check breaks dev mode, developers get locked out. The `!window.electronAPI` guard handles this — in dev mode without Electron, `window.electronAPI` is undefined, so it hits the dev mode branch, not the catch.

---

### TASK 4: MatterForm — Add matter_name_arabic Field
**Priority:** MEDIUM  
**Risk:** Users can't enter Arabic matter names  
**Files to modify:** `MatterForm.js`

#### What's missing
`defaultFormData` (line 28) has `matter_name_arabic: ''` but there's no input field for it in the form. The field should go right after the `matter_name` FormField.

#### Where to add (after line 459 in MatterForm.js)
Current:
```javascript
<FormField label={t[language].matterName} required error={errors.matter_name}>
  <input type="text" value={formData.matter_name}
    onChange={(e) => handleFieldChange('matter_name', e.target.value)}
    onBlur={() => handleBlur('matter_name')}
    className={inputClass(errors.matter_name)} />
</FormField>
```

Add after it (still inside the `grid grid-cols-1 md:grid-cols-2 gap-4` div):
```javascript
<div>
  <label className="block text-sm font-medium mb-1">
    {language === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0642\u0636\u064a\u0629 (\u0639\u0631\u0628\u064a)' : 'Matter Name (Arabic)'}
  </label>
  <input type="text" value={formData.matter_name_arabic || ''}
    onChange={(e) => setFormData({...formData, matter_name_arabic: e.target.value})}
    dir="rtl"
    placeholder={language === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0642\u0636\u064a\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Arabic matter name'}
    className="w-full px-3 py-2 border rounded-md" />
</div>
```

**Note:** Uses Unicode escapes for Arabic text per KNOWN_FIXES.md encoding rules. The Arabic strings are:
- `\u0627\u0633\u0645 \u0627\u0644\u0642\u0636\u064a\u0629 (\u0639\u0631\u0628\u064a)` = "اسم القضية (عربي)"
- `\u0627\u0633\u0645 \u0627\u0644\u0642\u0636\u064a\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629` = "اسم القضية بالعربية"

The field already exists in `defaultFormData`, `sanitizeData`, and `handleSubmit`, so no backend changes needed.

---

### TASK 5: Clean Up Dead Comments in App.js
**Priority:** LOW (do last, quick win)  
**Risk:** None — cosmetic only  
**Files to modify:** `App.js`

Remove these dead comments (lines 916-971):
```
// ClientForm moved outside App
// CONTACT FORM COMPONENT
// MatterForm moved outside App
// HearingForm moved outside App
// TaskForm moved outside App
// TimesheetForm moved outside App
// JudgmentForm moved outside App
// AppointmentForm moved outside App
// CalendarModule moved to components/modules/CalendarModule.js (v46.10)
// JudgmentsList moved to components/lists/JudgmentsList.js
// AppointmentsList moved to components/lists/AppointmentsList.js
// Dashboard moved to components/modules/Dashboard.js (v46.9)
// CONTACTS LIST COMPONENT
// ExpenseForm moved outside App
// AdvanceForm moved outside App
// AdvancesList moved to components/lists/AdvancesList.js
// DeadlineForm moved outside App
// InvoiceForm moved outside App
// InvoiceViewModal extracted to ./components/modules/InvoiceViewModal.js (v46.14)
```

Also remove:
- Line 377: `// t moved outside App`
- Line 895: `// generateID moved outside App`
- Line 897: `// formatDate moved outside App`

Also remove `console.log` calls:
- Line 695: `console.log('handleUpdateDeadlineStatus called:', deadlineId, newStatus);`
- Line 698: `console.log('updateDeadlineStatus result:', result);`
- Line 699: `console.log('Deadlines refreshed');`

Also fix duplicate prop on line 1411:
```javascript
// Line 1410-1411 in SettingsModule render:
regions={regions}      // ← appears TWICE
```
Remove the duplicate `regions={regions}` on line 1411.

---

### TASK 6: Delete Unused Files
**Priority:** LOW  
**Files to delete:**
- `src/components/common/TimeDropdown.js` — marked for deletion since v46.57

Verify it's not imported anywhere first:
```powershell
Select-String -Path "C:\Projects\qanuni\src\components\*\*.js" -Pattern "TimeDropdown" -Recurse
```
If no results, safe to delete.

---

## What NOT to Do This Session

1. **Do NOT restructure App.js state into Contexts** — that's a massive refactor touching every component. Defer to Phase 3b or a dedicated session.
2. **Do NOT implement on-demand data loading** — requires changing how every list component gets data. Defer.
3. **Do NOT attempt centralized i18n extraction** — this was rolled back once already (v46.57-61). Keep inline ternaries.
4. **Do NOT modify any `electron/` backend files** — Phase 2 is complete and tested.
5. **Do NOT deliver full files with Arabic text** — use Node.js scripts with `\uXXXX` escapes per KNOWN_FIXES.md.

---

## Execution Order for Sonnet Session

```
Step 1: Create src/components/common/ErrorBoundary.js          (new file)
Step 2: Create src/utils/api.js                                 (new file)  
Step 3: Modify App.js:
        a. Add ErrorBoundary import
        b. Wrap main content area in ErrorBoundary
        c. Fix license check (fail-closed)
        d. Remove dead comments
        e. Remove console.log debug lines
        f. Fix duplicate regions prop
Step 4: Modify MatterForm.js:
        a. Add matter_name_arabic input field
Step 5: Delete src/components/common/TimeDropdown.js            (verify first)
Step 6: Test with npm run dev
Step 7: Run node test-integration.js (backend unchanged, should still pass)
Step 8: Git commit as v47.1
```

---

## Testing After Changes

### Manual testing checklist
- [ ] `npm run dev` launches without errors
- [ ] Dashboard loads and shows stats
- [ ] Switch to each module — no white screens
- [ ] Open and close each form (Ctrl+N to open, Escape to close)
- [ ] Add a test client → should succeed with toast
- [ ] Add a test matter → verify matter_name_arabic field is visible
- [ ] Enter Arabic text in matter_name_arabic → saves correctly
- [ ] Switch language to Arabic → UI doesn't break
- [ ] License check: temporarily break the license API → app should show license screen (not grant access)
- [ ] Force a component error (temporarily add `throw new Error('test')` in Dashboard render) → ErrorBoundary shows friendly UI with Retry button
- [ ] Click Retry → Dashboard loads normally
- [ ] Remove the test error

### Automated tests
```powershell
node test-integration.js    # Backend unchanged — must still pass 116/116
```

---

## Files Modified Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/common/ErrorBoundary.js` | CREATE | React error boundary component |
| `src/utils/api.js` | CREATE | API wrapper for structured errors |
| `App.js` | MODIFY | ErrorBoundary wrap, license fix, dead code removal |
| `MatterForm.js` | MODIFY | Add matter_name_arabic input field |
| `src/components/common/TimeDropdown.js` | DELETE | Unused since v46.57 |

---

## Post-Session Updates

After completing Phase 3 work:
1. Update `CLAUDE.md`:
   - Version → v47.1
   - Phase 3 status → "PARTIAL — ErrorBoundary, API wrapper, license fix done"
   - Move "React error boundaries" from planned to done
   - Add note about api.js wrapper being available but not yet adopted in all forms
2. Update `PATTERNS.md`:
   - Add ErrorBoundary usage pattern
   - Add api.js usage pattern for forms
3. Commit: `git commit -m "v47.1 - Phase 3 partial: ErrorBoundary, API wrapper, license fail-closed, MatterForm arabic name"`

---

## Architecture Context for Sonnet

### Key files and their relationships
```
App.js (1,867 lines)
  ├── Imports 13 forms from src/components/forms/
  ├── Imports 11 lists from src/components/lists/
  ├── Imports modules from src/components/modules/
  ├── Imports corporate from src/components/corporate/
  ├── 70+ useState calls (lines 42-277)
  ├── loadAllData() loads 18 queries at startup (lines 451-521)
  ├── 12 refresh functions (lines 526-705)
  ├── License check (lines 340-364) ← FIX THIS
  ├── Main content area (lines 1090-1451) ← WRAP IN ErrorBoundary
  ├── Modals section (lines 1454-1867) ← DO NOT wrap
  └── Dead comments scattered (lines 916-971) ← CLEAN UP
```

### IPC pattern (don't change)
```javascript
// Frontend always calls:
const data = await window.electronAPI.functionName(params);

// Backend handlers return:
// GET: raw arrays (backward compat)
// WRITE: { success: true, id } or { success: false, errors: [...] }
```

### Database column naming (reference)
| Table | English | Arabic |
|-------|---------|--------|
| lawyers | name | name_arabic |
| lookup_* | name_en | name_ar |
| clients | client_name | client_name_arabic |
| matters | matter_name | matter_name_arabic |

### Arabic text rule
NEVER include raw Arabic in delivered JS files. Always use `\uXXXX` Unicode escapes. See KNOWN_FIXES.md for the full encoding protocol.

---

## Deferred to Future Sessions

### Phase 3b — Context-Based State (Big Refactor)
Replace 70+ useState in App.js with focused React Contexts:
- `AppContext` — language, theme, sidebar state
- `DataContext` — clients, matters, lawyers, lookups (shared reference data)  
- `UIContext` — form visibility, editing state, filters, pagination
- `NotificationContext` — toast, confirm dialog

This touches EVERY component (they all receive props from App.js). Needs a dedicated session.

### Phase 3c — Adopt api.js Wrapper Across All Forms
Go form-by-form and convert:
- ClientForm → use apiWrite for add/update
- MatterForm → use apiWrite
- HearingForm → use apiWrite
- ... all 13 forms
- All refresh functions → use apiGet

### Phase 3d — On-Demand Data Loading
Don't load all 5,000 timesheets at startup. Each module loads its own data when navigated to. This changes how every list component gets data.

### Phase 4-6 — Infrastructure, Cleanup, Scale Testing
See QANUNI_HARDENING_STRATEGY.md for full details.

---

*Checkpoint created: February 9, 2026 — Phase 3 plan ready for Sonnet execution*
