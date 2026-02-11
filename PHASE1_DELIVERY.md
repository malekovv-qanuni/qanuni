# Qanuni Phase 1: Data Layer Hardening — Delivery

## What's Been Built

### New Architecture
```
C:\Projects\qanuni\
├── main.js                    # NEW: ~150 lines, clean entry point
├── preload.js                 # UNCHANGED (for now)
├── electron/
│   ├── database.js            # NEW: Atomic writes, safe IDs, transactions
│   ├── logging.js             # NEW: File-based logging, crash handlers
│   ├── validation.js          # NEW: Input validation schemas for all entities
│   ├── migrations.js          # NEW: Versioned, trackable migrations
│   ├── schema.js              # TO BUILD: CREATE TABLE statements (extracted from old main.js)
│   └── ipc/
│       ├── clients.js         # NEW: Example handler — validated, logged, error-handled
│       ├── license.js         # NEW: Fail-closed licensing
│       ├── matters.js         # TO BUILD (same pattern as clients.js)
│       ├── hearings.js        # TO BUILD
│       ├── timesheets.js      # TO BUILD
│       ├── expenses.js        # TO BUILD
│       ├── invoices.js        # TO BUILD
│       ├── tasks.js           # TO BUILD
│       ├── judgments.js        # TO BUILD
│       ├── appointments.js    # TO BUILD
│       ├── advances.js        # TO BUILD
│       ├── deadlines.js       # TO BUILD
│       ├── corporate.js       # TO BUILD
│       ├── reports.js         # TO BUILD
│       ├── settings.js        # TO BUILD (includes backup system)
│       ├── lookups.js         # TO BUILD
│       ├── trash.js           # TO BUILD
│       ├── diary.js           # TO BUILD
│       └── conflict-check.js  # TO BUILD
└── src/                       # UNCHANGED (frontend stays the same for now)
```

### What Each Module Does

#### database.js — The Foundation
| Old Pattern | New Pattern |
|-------------|-------------|
| `fs.writeFileSync(dbPath, buffer)` | Write to .tmp → verify → atomic rename |
| `Math.random() * 10000` (10K IDs) | `crypto.randomBytes(4)` (4.3 billion IDs) |
| `runQuery` returns `[]` on error | `query()` throws — errors reach the frontend |
| No transactions | `database.transaction(() => { ... })` with ROLLBACK |
| `debouncedSaveDatabase()` (500ms delay) | Immediate save after every write |
| No integrity check | `PRAGMA integrity_check` on startup |
| Console.log only | Structured logging to file |

#### logging.js — Know What Happened
- Writes to `%APPDATA%/Qanuni/logs/qanuni-YYYY-MM-DD.log`
- Auto-rotates: keeps 30 days of logs
- Levels: error, warn, info, debug
- `wrapHandler()` — automatically logs every IPC call with duration
- Crash handlers: logs uncaught exceptions before exit
- Slow operation detection: logs any IPC call > 500ms

#### validation.js — Catch Bad Data Early
- Schemas for all 16 entity types
- Required field checks
- Type checks (string, number, date, datetime)
- Enum validation (status values, client types)
- Pattern matching (email format)
- Range checks (hours: 0.01–24, amounts: > 0)
- Returns structured errors: `{ field, message, code }`

#### migrations.js — Schema Changes That Don't Break
- Each migration has a version number and description
- Tracked in `schema_versions` table — never runs twice
- 16 migrations covering all schema evolution since v1
- `addColumnIfMissing()` — safe ALTER TABLE that checks first
- Reports status: "3 pending, 13 applied"

#### ipc/clients.js — The Handler Pattern
Every IPC handler follows this structure:
```javascript
ipcMain.handle('add-client', logger.wrapHandler('add-client', (event, client) => {
  // 1. Validate input
  const check = validation.check(client, 'client');
  if (!check.valid) return check.result;

  // 2. Generate ID
  const id = database.generateId('CLT');

  // 3. Execute with immediate save
  database.execute('INSERT INTO ...', [...]);

  // 4. Log what happened
  logger.info('Client created', { clientId: id });

  // 5. Return structured result
  return { success: true, clientId: id };
}));
```

#### ipc/license.js — No Loose Ends
| Scenario | Old Behavior | New Behavior |
|----------|-------------|-------------|
| License check succeeds | Allow access | Allow access |
| License check fails | Allow access | **Block access** |
| License check errors | Allow access ("fail-open") | **Block access** |
| No license manager in production | Allow access | **Block access** |
| Dev mode (`npm run dev`) | Allow access | Allow access (only exception) |

---

## What Happens Next

### Session 2: Extract Remaining IPC Handlers
Take the 161 handlers from old main.js and put them into the new modules:
- `ipc/matters.js` — CRUD + appeal workflow + file number check
- `ipc/hearings.js` — CRUD
- `ipc/timesheets.js` — CRUD
- `ipc/expenses.js` — CRUD + batch + deduction
- `ipc/invoices.js` — CRUD + status + PDF generation + unbilled time/expenses
- `ipc/tasks.js` — CRUD
- `ipc/judgments.js` — CRUD + deadlines by judgment
- `ipc/appointments.js` — CRUD
- `ipc/advances.js` — CRUD + deduction
- `ipc/deadlines.js` — CRUD + status update
- `ipc/corporate.js` — Entities, shareholders, directors, filings, meetings, share transfers
- `ipc/reports.js` — Dashboard stats, client statement, case status, client 360, exports
- `ipc/settings.js` — Firm info, settings, backup/restore, currencies, exchange rates
- `ipc/lookups.js` — Court types, regions, hearing purposes, task types, expense categories
- `ipc/trash.js` — Trash list, restore, permanent delete, empty
- `ipc/diary.js` — Matter timeline entries
- `ipc/conflict-check.js` — Conflict search + logging

Each handler gets: validation, try/catch, logging, structured errors.

### Session 3: schema.js + Frontend Error Handling
1. Extract CREATE TABLE statements into `electron/schema.js`
2. Add React Error Boundary to App.js
3. Fix frontend license check (fail-closed)
4. Add frontend error handling for IPC calls (show errors, not empty lists)

### Session 4: Phase 2 — App.js State Management
- Context-based state (AppContext, DataContext, UIContext)
- On-demand data loading per module
- Remove 70+ useState calls from App.js

### Session 5: Phase 3 — Testing + Scale
- Generate test data (500 clients, 1000 matters, 5000 timesheets)
- Performance benchmarks
- Clean up dead code and console.log
- Production build test

---

## How to Integrate (When Ready)

This is NOT a "replace everything at once" operation. The integration path:

1. **Create `electron/` directory** in project root
2. **Copy the 6 new files** into `electron/`
3. **Build remaining IPC handlers** (sessions 2-3)
4. **Replace main.js** with the new entry point
5. **Test with `npm run dev:test`** — every module, every CRUD operation
6. **Once stable:** commit as v47.0 — the hardened foundation

The frontend (App.js, all components) stays exactly the same initially.
The preload.js stays exactly the same — the IPC channel names haven't changed.
Only the backend implementation changes.

---

## Files Delivered This Session

| File | Lines | Purpose |
|------|-------|---------|
| `electron/database.js` | ~310 | Atomic writes, safe IDs, transactions, integrity |
| `electron/logging.js` | ~210 | File-based logging, crash handlers, IPC wrapper |
| `electron/validation.js` | ~380 | Input validation schemas for all 16 entity types |
| `electron/migrations.js` | ~280 | Versioned migration system (16 migrations) |
| `electron/main-new.js` | ~160 | Clean entry point (replaces 6,791-line main.js) |
| `electron/ipc/clients.js` | ~120 | Example handler module (validated, logged) |
| `electron/ipc/license.js` | ~110 | Fail-closed license handling |
| **Total** | **~1,570** | Replaces core of 6,791-line monolith |
