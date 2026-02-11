# SESSION 8 EXECUTION PLAN
**Phase 1 Core Reliability: Backend Validation & Error Handling**

---

## Session Context

**Version:** v48.5-session7-complete  
**Baseline:** 117/117 integration tests passing  
**Objective:** Prevent data loss and silent failures before production  
**Duration:** 3-4 hours  

---

## Why This Work

Session 7 found: Timesheet form showed "success" but data wasn't saved (validation field mismatch).

Root cause: No backend validation layer.

Current production risks:
- Silent data loss (validation fails, UI shows success)
- Error swallowing (queries fail, UI shows empty lists)
- No debugging capability (no logs when users report bugs)

---

## Package 1: Backend Validation Layer

### Goal
Every IPC handler validates input BEFORE database operations.

### Files to Modify

**1. electron/validation.js** - Expand with all entity schemas

Add schemas for all entity types:
- client
- matter
- lawyer
- hearing
- judgment
- deadline
- task
- timesheet (already has schema)
- expense
- advance
- invoice
- appointment
- corporate_entity

**Schema pattern:**
```javascript
const schemas = {
  client: {
    client_name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
    client_name_arabic: { required: false, type: 'string', maxLength: 200 },
    client_type: { required: true, enum: ['individual', 'legal_entity'] },
    email: { required: false, type: 'email' },
    phone: { required: false, type: 'string', maxLength: 50 },
  },
  // ... add all other entity types
};

function validate(data, entityType) {
  const schema = schemas[entityType];
  if (!schema) {
    return { valid: false, error: `Unknown entity type: ${entityType}` };
  }
  
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    // Check required
    if (rules.required && !data[field]) {
      errors.push({ field, message: `${field} is required` });
    }
    
    if (data[field] !== undefined && data[field] !== null) {
      // Type checking
      if (rules.type === 'string' && typeof data[field] !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
      }
      if (rules.type === 'number' && typeof data[field] !== 'number') {
        errors.push({ field, message: `${field} must be a number` });
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(data[field])) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
      
      // Length validation
      if (rules.minLength && data[field].length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }
      if (rules.maxLength && data[field].length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }
    }
  }
  
  if (errors.length > 0) {
    return { 
      valid: false, 
      errors,
      error: errors[0].message,
      field: errors[0].field
    };
  }
  
  return { valid: true };
}
```

**2. All IPC modules** - Add validation calls to save/update handlers

**Files to modify (21 modules):**
- electron/ipc/clients.js
- electron/ipc/matters.js
- electron/ipc/lawyers.js
- electron/ipc/hearings.js
- electron/ipc/judgments.js
- electron/ipc/deadlines.js
- electron/ipc/tasks.js
- electron/ipc/timesheets.js (verify existing pattern)
- electron/ipc/expenses.js
- electron/ipc/advances.js
- electron/ipc/invoices.js
- electron/ipc/appointments.js
- electron/ipc/corporate.js
- electron/ipc/diary.js
- electron/ipc/lookups.js
- electron/ipc/conflict-check.js
- electron/ipc/trash.js
- electron/ipc/settings.js
- electron/ipc/reports.js
- electron/ipc/client-imports.js
- electron/ipc/license.js

**Pattern to apply:**

Before (no validation):
```javascript
ipcMain.handle('save-client', async (event, client) => {
  const sql = 'INSERT INTO clients ...';
  db.run(sql, [...]);
  return { success: true };
});
```

After (with validation):
```javascript
const validation = require('../validation');

ipcMain.handle('save-client', async (event, client) => {
  // Validate FIRST
  const check = validation.validate(client, 'client');
  if (!check.valid) {
    return { 
      success: false, 
      error: check.error,
      field: check.field 
    };
  }
  
  // Then save
  try {
    const sql = 'INSERT INTO clients ...';
    db.run(sql, [...]);
    return { success: true, id: client.client_id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Apply to:** All `save-*` and `update-*` handlers (skip `get-*`, `delete-*`, `list-*`)

### Test Package 1
```powershell
node test-integration.js
# Must be 117/117 - validation rejects bad data without breaking valid data
```

---

## Package 2: Fix Error Swallowing

### Goal
Stop hiding errors - propagate them so UI knows what failed.

### Files to Modify

**1. electron/database.js** - Fix runQuery function

Find runQuery (or equivalent). Change from:
```javascript
function runQuery(sql, params = []) {
  try {
    // query logic
  } catch (error) {
    console.error('Query error:', sql, error);
    return [];  // ← PROBLEM: Silent failure
  }
}
```

To:
```javascript
function runQuery(sql, params = []) {
  try {
    // query logic
  } catch (error) {
    console.error('Query error:', sql, error);
    throw error;  // ← Let caller handle error
  }
}
```

**2. All IPC handlers** - Add try/catch with structured errors

Pattern for all handlers:
```javascript
ipcMain.handle('get-clients', async (event) => {
  try {
    const sql = 'SELECT * FROM clients WHERE deleted_at IS NULL';
    const clients = runQuery(sql);
    return { success: true, data: clients };
  } catch (error) {
    return { success: false, error: `Failed to load clients: ${error.message}` };
  }
});
```

Apply to all 163 handlers across 21 modules.

### Test Package 2
```powershell
node test-integration.js
# Must still be 117/117
```

---

## Package 3: Frontend Error Display

### Goal
All forms check result.success before showing success toast.

### Files to Modify (12 forms)

All forms in `src/components/forms/` except TimesheetForm.js (already fixed):

1. ClientForm.js
2. MatterForm.js
3. LawyerForm.js
4. HearingForm.js
5. JudgmentForm.js
6. DeadlineForm.js
7. TaskForm.js
8. ExpenseForm.js
9. AdvanceForm.js
10. InvoiceForm.js
11. AppointmentForm.js
12. EntityForm.js

**Pattern (from TimesheetForm.js Session 7 fix):**

Before (BAD):
```javascript
const handleSave = async () => {
  const result = await window.electronAPI.saveClient(formData);
  showToast('Client saved successfully', 'success');  // Always shows success!
  onClose();
};
```

After (GOOD):
```javascript
const handleSave = async () => {
  const result = await window.electronAPI.saveClient(formData);
  
  if (!result || !result.success) {
    showToast(result?.error || 'Failed to save client', 'error');
    return;
  }
  
  showToast('Client saved successfully', 'success');
  onClose();
};
```

**Bonus improvements:**
- Add loading state: `const [loading, setLoading] = useState(false);`
- Disable save button while loading
- Show field-specific errors if result.field exists

### Test Package 3

Manual UI testing:
1. Open Client form, leave required field empty, click Save → should show error
2. Open Matter form, enter invalid data → should show error
3. Test all 12 forms with invalid data → all should show errors, not success

---

## Package 4: Logging Infrastructure

### Goal
File-based logging for debugging production issues.

### Files to Create/Modify

**1. electron/logging.js** - Implement logging system

```javascript
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Log directory: %APPDATA%/Qanuni/logs/
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Current log file: qanuni-YYYY-MM-DD.log
function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `qanuni-${date}.log`);
}

function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(getLogFilePath(), logLine);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

function info(message, context) {
  log('INFO', message, context);
}

function error(message, context) {
  log('ERROR', message, context);
  console.error(message, context);
}

function warn(message, context) {
  log('WARN', message, context);
}

// Wrapper for IPC handlers - logs all calls
function wrapHandler(handlerName, handler) {
  return async (event, ...args) => {
    info(`IPC: ${handlerName}`, { args });
    
    try {
      const result = await handler(event, ...args);
      
      if (result && !result.success) {
        warn(`IPC ${handlerName} returned error`, { error: result.error });
      }
      
      return result;
    } catch (error) {
      error(`IPC ${handlerName} threw exception`, { 
        error: error.message, 
        stack: error.stack 
      });
      return { success: false, error: error.message };
    }
  };
}

// Clean up old logs (keep 30 days)
function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        info('Deleted old log file', { file });
      }
    });
  } catch (error) {
    error('Failed to cleanup old logs', { error: error.message });
  }
}

app.on('ready', cleanupOldLogs);

module.exports = { info, error, warn, wrapHandler };
```

**2. All IPC modules** - Wrap handlers with logging

Example:
```javascript
const logging = require('../logging');

ipcMain.handle('save-client', logging.wrapHandler('save-client', async (event, client) => {
  // Handler logic
}));
```

Apply to all handlers in all 21 modules.

### Test Package 4

```powershell
# Run app
npm run dev

# Check log file
dir $env:APPDATA\Qanuni\logs
cat $env:APPDATA\Qanuni\logs\qanuni-2026-02-11.log
```

Should see IPC calls and errors logged.

---

## Execution Checklist

### Pre-Work
- [ ] Git commit: `git commit -am "Session 8 baseline - v48.5"`
- [ ] Verify: `node test-integration.js` → 117/117

### Package 1: Validation
- [ ] Expand electron/validation.js with entity schemas
- [ ] Add validation to save/update handlers (21 modules)
- [ ] Test: `node test-integration.js` → 117/117

### Package 2: Error Handling
- [ ] Fix runQuery in electron/database.js
- [ ] Add try/catch to all handlers
- [ ] Test: `node test-integration.js` → 117/117

### Package 3: Frontend
- [ ] Apply result.success pattern to 12 forms
- [ ] Manual test: Invalid data shows errors
- [ ] Test: Valid data still works

### Package 4: Logging
- [ ] Implement electron/logging.js
- [ ] Wrap all handlers with wrapHandler
- [ ] Test: Log file created

### Post-Work
- [ ] Test: `node test-integration.js` → 117/117
- [ ] Git commit: `git commit -am "Session 8: Phase 1 complete"`
- [ ] Update CLAUDE.md
- [ ] Create Session 8 Success Report

---

## Expected Outcomes

✅ No silent validation failures  
✅ Backend validates all inputs  
✅ Errors propagate correctly  
✅ Production debugging via logs  
✅ 117/117 tests passing  

**Safe for beta testing with real law firms.**

---

## Starting Instructions for Claude Code

```
I have Session 8 execution plan. We're implementing Phase 1 Core Reliability:
- Backend validation for all IPC handlers
- Fix error swallowing  
- Frontend error display
- Logging infrastructure

Baseline: 117/117 tests passing (v48.5)

Let's start with Package 1. Show me electron/validation.js
```
