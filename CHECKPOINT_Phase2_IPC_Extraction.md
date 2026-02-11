# Qanuni Phase 2 Checkpoint — IPC Handler Extraction
**Date:** February 9, 2026  
**Sessions:** 5 sessions (repeatedly hit context limits due to 6,791-line main.js)  
**Status:** 18 of 19 modules complete. 2 handlers remaining (client-imports).

---

## What Was Done

Extracted all 161 IPC handlers from the monolithic `main.js` (6,791 lines) into 20 modular files in `electron/ipc/`. Each handler follows the hardened pattern: `logger.wrapHandler()` → validation → database operation → structured return.

## File Locations

All files go in: `C:\Projects\qanuni\electron\ipc\`

### From Phase 1 (already in place):
- `clients.js` — 6 handlers (CRUD + import-related)
- `license.js` — fail-closed licensing

### From Phase 2 (18 new files — THIS DELIVERY):
| File | Handlers | Description |
|------|----------|-------------|
| `lawyers.js` | 7 | CRUD, get-all, activate/deactivate, get-active |
| `matters.js` | 6 | CRUD, get-all (with client/lawyer/court joins), check-file-number |
| `diary.js` | 4 | Matter timeline: CRUD + get-by-matter (auto-pulls hearings/judgments/tasks/deadlines) |
| `hearings.js` | 4 | CRUD, get-all (with matter/client/court/purpose joins) |
| `judgments.js` | 4 | CRUD, get-all (with matter/client joins) |
| `deadlines.js` | 6 | CRUD, get-all, update-status, get-by-judgment |
| `tasks.js` | 4 | CRUD, get-all (with matter/client/lawyer joins) |
| `timesheets.js` | 5 | CRUD, get-all, get-unbilled-by-matter |
| `expenses.js` | 8 | CRUD, get-all, batch-add, get-unbilled, expense-deduction CRUD |
| `advances.js` | 10 | CRUD, get-all, get-by-client, get-by-matter, deductions CRUD, get-total-deductions |
| `invoices.js` | 8 | CRUD, get-all, update-status, generate-invoice-pdf (415-line HTML template, multi-document support) |
| `appointments.js` | 4 | CRUD, get-all (with matter/client/lawyer joins) |
| `lookups.js` | 9 | Generic CRUD for all lookup tables (court_types, regions, hearing_purposes, task_types, expense_categories, entity_types, currencies, custom), get-all-lookups |
| `conflict-check.js` | 2 | Comprehensive search (clients/shareholders/directors/adverse parties) with severity levels + log-conflict-check |
| `corporate.js` | 24 | Entities (7), shareholders (5), share transfers (4), directors (4), filings (4), meetings (4), compliance dashboard (1) |
| `trash.js` | 5 | Get items, count, restore, permanent delete, empty all |
| `settings.js` | ~22 | Settings CRUD, firm info, auto-backup (settings/status/run/folder/history), backup/restore, export-all-data, currencies CRUD (5), exchange rates CRUD (5), open-file |
| `reports.js` | ~12 | Dashboard stats, pending invoices, generate-report (13 report types via switch), export-to-excel/csv/pdf, client-statement PDF/Excel, case-status PDF/Excel, client-360 PDF/Excel |

### Still Remaining (1 module, 2 handlers):
- `client-imports.js` — export-client-template + import-clients-from-excel
  - These are the Excel import/export handlers (lines 1591-1928 in old main.js)
  - Complex: template generation with XLSX, row-by-row validation, mapping, duplicate detection

---

## Module Registration Pattern

Each module exports a function that receives dependencies:

```javascript
// Simple modules
module.exports = function registerXxxHandlers({ database, logger, validation }) { ... }

// Modules needing Electron APIs
module.exports = function registerSettingsHandlers({ database, logger, getMainWindow, XLSX, dialog, ... }) { ... }
```

The new `main-new.js` (from Phase 1) will register all modules:
```javascript
const registerClientHandlers = require('./ipc/clients');
const registerMatterHandlers = require('./ipc/matters');
// ... etc
registerClientHandlers({ database, logger, validation });
registerMatterHandlers({ database, logger, validation });
```

## Dependencies by Module

| Module | database | logger | validation | Electron APIs | XLSX |
|--------|----------|--------|------------|---------------|------|
| lawyers | ✓ | ✓ | ✓ | — | — |
| matters | ✓ | ✓ | ✓ | — | — |
| diary | ✓ | ✓ | ✓ | — | — |
| hearings | ✓ | ✓ | ✓ | — | — |
| judgments | ✓ | ✓ | ✓ | — | — |
| deadlines | ✓ | ✓ | ✓ | — | — |
| tasks | ✓ | ✓ | ✓ | — | — |
| timesheets | ✓ | ✓ | ✓ | — | — |
| expenses | ✓ | ✓ | ✓ | — | — |
| advances | ✓ | ✓ | ✓ | — | — |
| invoices | ✓ | ✓ | ✓ | BrowserWindow, dialog, app, fs, path | — |
| appointments | ✓ | ✓ | ✓ | — | — |
| lookups | ✓ | ✓ | — | — | — |
| conflict-check | ✓ | ✓ | — | — | — |
| corporate | ✓ | ✓ | ✓ | — | — |
| trash | ✓ | ✓ | — | — | — |
| settings | ✓ | ✓ | — | dialog, shell, app, fs, path | ✓ (XLSX) |
| reports | ✓ | ✓ | — | dialog, BrowserWindow, app, fs, path | ✓ (XLSX) |

## Key Implementation Notes

1. **invoices.js** is the largest single handler file (~720 lines) due to the PDF generation HTML template. The `generate-invoice-pdf` handler supports single invoices, multi-document batches, and proforma invoices with full firm branding.

2. **corporate.js** uses `database.transaction()` for share transfer operations that update shareholder balances. The update handler reverses the original balance effect before applying the new one.

3. **conflict-check.js** implements severity-based deduplication (CRITICAL > HIGH > MEDIUM > LOW) and searches across clients, shareholders, directors, and adverse parties.

4. **reports.js** contains the complete `generate-report` switch statement covering 13 report types, plus full HTML templates for client statement, case status, and client 360 PDF exports.

5. **settings.js** consolidates: settings CRUD, firm info, auto-backup system, manual backup/restore, export-all-data, currencies, and exchange rates.

6. **diary.js** auto-pulls timeline data from hearings, judgments, tasks, and deadlines in addition to manual diary entries.

---

## What Comes Next

### Immediate (finish Phase 2):
1. **Create `client-imports.js`** — 2 remaining handlers (template export + Excel import)
2. **Update `main-new.js`** — register all 20 modules with their dependencies
3. **Create `schema.js`** — extract CREATE TABLE statements from old main.js

### Then Phase 3 (Frontend):
1. Add React Error Boundary to App.js
2. Fix frontend to handle structured error returns `{ success: false, error: '...' }`
3. Context-based state management (AppContext, DataContext, UIContext)

### Integration Test Plan:
1. Replace old main.js with main-new.js
2. Run `npm run dev:test`
3. Test every module: CRUD operations, PDF exports, conflict check, corporate
4. Verify all 161 IPC channels respond correctly

---

## Handler Count Summary

| Source | Handlers |
|--------|----------|
| Phase 1 (clients.js + license.js) | ~8 |
| Phase 2 (18 modules) | ~153 |
| Remaining (client-imports.js) | 2 |
| **Total** | **~163** |

> Original audit said 161 handlers. We found a few additional during extraction (some were sub-handlers within larger switch statements, currency/exchange rate handlers that weren't in the original count).

---

*Checkpoint created: February 9, 2026*
