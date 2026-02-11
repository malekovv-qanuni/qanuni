# Qanuni REST API - Endpoint Reference

**Version:** v48.2-session2-complete
**Base URL:** `http://localhost:3001`
**Total Endpoints:** 137 data endpoints + 1 health check = 138

---

## Architecture

- **137 REST endpoints** for data operations (accessible from web browser)
- **19 Electron-only operations** (file dialogs, PDF generation, XLSX exports)
- All data handlers accessible via **both IPC and REST**
- Desktop mode: Uses IPC (unchanged, fully backward compatible)
- Web mode: Uses REST API (ready for Session 3 frontend)
- License: Electron-only (web auth deferred to Session 3)

---

## Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status, version, timestamp |

---

## Clients (6 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | Get all active clients |
| GET | `/api/clients/:id` | Get client by ID |
| POST | `/api/clients` | Create new client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Soft-delete client |
| POST | `/api/clients/check-reference` | Check if client reference exists |

## Matters (7 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matters` | Get all matters (with client names) |
| GET | `/api/matters/:id` | Get matter by ID |
| POST | `/api/matters` | Create new matter |
| PUT | `/api/matters/:id` | Update matter |
| DELETE | `/api/matters/:id` | Soft-delete matter |
| GET | `/api/matters/:id/related` | Get related data (hearings, tasks, etc.) |
| POST | `/api/matters/check-file-number` | Check if file number exists |

## Hearings (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hearings` | Get all hearings (with matter/client joins) |
| POST | `/api/hearings` | Create new hearing |
| PUT | `/api/hearings/:id` | Update hearing |
| DELETE | `/api/hearings/:id` | Soft-delete hearing |

## Tasks (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Soft-delete task |

## Timesheets (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timesheets` | Get all timesheets |
| GET | `/api/timesheets/unbilled` | Get unbilled timesheets |
| POST | `/api/timesheets` | Create new timesheet entry |
| PUT | `/api/timesheets/:id` | Update timesheet |
| DELETE | `/api/timesheets/:id` | Soft-delete timesheet |

## Expenses (6 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | Get all expenses |
| GET | `/api/expenses/unbilled` | Get unbilled expenses |
| POST | `/api/expenses` | Create new expense |
| POST | `/api/expenses/batch` | Create multiple expenses |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Soft-delete expense |

## Advances (10 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/advances` | Get all advances |
| GET | `/api/advances/client-expense-advance` | Get client expense advances |
| GET | `/api/advances/client-retainer` | Get client retainers |
| GET | `/api/advances/lawyer-advance` | Get lawyer advances |
| POST | `/api/advances` | Create new advance |
| PUT | `/api/advances/:id` | Update advance |
| DELETE | `/api/advances/:id` | Soft-delete advance |
| POST | `/api/advances/deduct` | Deduct from expense advance |
| POST | `/api/advances/deduct-retainer` | Deduct from retainer |
| POST | `/api/advances/expense-with-deduction` | Create expense with advance deduction |

## Invoices (7 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | Get all invoices |
| GET | `/api/invoices/generate-number` | Generate next invoice number |
| GET | `/api/invoices/:id` | Get invoice by ID |
| GET | `/api/invoices/:id/items` | Get invoice line items |
| POST | `/api/invoices` | Create new invoice |
| PUT | `/api/invoices/:id/status` | Update invoice status |
| DELETE | `/api/invoices/:id` | Soft-delete invoice |

## Judgments (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/judgments` | Get all judgments |
| POST | `/api/judgments` | Create new judgment |
| PUT | `/api/judgments/:id` | Update judgment |
| DELETE | `/api/judgments/:id` | Soft-delete judgment |

## Appointments (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/appointments` | Get all appointments |
| POST | `/api/appointments` | Create new appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| DELETE | `/api/appointments/:id` | Soft-delete appointment |

## Deadlines (6 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deadlines` | Get all deadlines |
| GET | `/api/deadlines/by-judgment/:judgmentId` | Get deadlines for a judgment |
| POST | `/api/deadlines` | Create new deadline |
| PUT | `/api/deadlines/:id` | Update deadline |
| PUT | `/api/deadlines/:id/status` | Update deadline status only |
| DELETE | `/api/deadlines/:id` | Soft-delete deadline |

## Diary (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/diary/timeline/:matterId` | Get diary timeline for a matter |
| POST | `/api/diary` | Create diary entry |
| PUT | `/api/diary/:id` | Update diary entry |
| DELETE | `/api/diary/:id` | Soft-delete diary entry |

## Lawyers (7 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lawyers` | Get active lawyers |
| GET | `/api/lawyers/all` | Get all lawyers (including inactive) |
| GET | `/api/lawyers/:id/usage` | Check if lawyer has associated data |
| POST | `/api/lawyers` | Create new lawyer |
| PUT | `/api/lawyers/:id` | Update lawyer |
| POST | `/api/lawyers/:id/reactivate` | Reactivate deactivated lawyer |
| DELETE | `/api/lawyers/:id` | Soft-delete lawyer |

## Lookups (9 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lookups/court-types` | Get court types |
| GET | `/api/lookups/regions` | Get regions |
| GET | `/api/lookups/hearing-purposes` | Get hearing purposes |
| GET | `/api/lookups/task-types` | Get task types |
| GET | `/api/lookups/expense-categories` | Get expense categories |
| GET | `/api/lookups/entity-types` | Get entity types |
| POST | `/api/lookups/:type` | Add lookup value |
| PUT | `/api/lookups/:type` | Update lookup value |
| DELETE | `/api/lookups/:type` | Delete lookup value |

## Conflict Check (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/conflict-check/search` | Search for conflicts |
| POST | `/api/conflict-check/log` | Log conflict check |

## Settings (14 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get all settings |
| GET | `/api/settings/by-key/:key` | Get setting by key |
| POST | `/api/settings` | Save setting |
| GET | `/api/settings/firm-info` | Get firm information |
| PUT | `/api/settings/firm-info` | Update firm information |
| GET | `/api/settings/currencies` | Get currencies |
| POST | `/api/settings/currencies` | Add currency |
| PUT | `/api/settings/currencies/:id` | Update currency |
| DELETE | `/api/settings/currencies/:id` | Delete currency |
| GET | `/api/settings/exchange-rates` | Get exchange rates |
| POST | `/api/settings/exchange-rates` | Add exchange rate |
| PUT | `/api/settings/exchange-rates/:rateId` | Update exchange rate |
| DELETE | `/api/settings/exchange-rates/:rateId` | Delete exchange rate |
| GET | `/api/settings/exchange-rates/for-date` | Get rate for specific date |

## Client Imports (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/client-imports` | Import clients from data |

## Corporate Secretary (29 endpoints)

### Entities
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/entities` | Get all corporate entities |
| GET | `/api/corporate/entities/without-details` | Get companies without corporate details |
| GET | `/api/corporate/clients` | Get all corporate clients |
| GET | `/api/corporate/entities/:clientId` | Get corporate entity by client ID |
| POST | `/api/corporate/entities` | Create corporate entity |
| PUT | `/api/corporate/entities/:clientId` | Update corporate entity |
| DELETE | `/api/corporate/entities/:clientId` | Soft-delete corporate entity |

### Shareholders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/shareholders/:clientId` | Get shareholders for entity |
| GET | `/api/corporate/shareholders/:clientId/total-shares` | Get total shares |
| POST | `/api/corporate/shareholders` | Add shareholder |
| PUT | `/api/corporate/shareholders/:id` | Update shareholder |
| DELETE | `/api/corporate/shareholders/:id` | Soft-delete shareholder |

### Share Transfers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/transfers/:clientId` | Get transfers for entity |
| POST | `/api/corporate/transfers` | Record share transfer |
| PUT | `/api/corporate/transfers/:id` | Update transfer |
| DELETE | `/api/corporate/transfers/:id` | Soft-delete transfer |

### Directors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/directors/:clientId` | Get directors for entity |
| POST | `/api/corporate/directors` | Add director |
| PUT | `/api/corporate/directors/:id` | Update director |
| DELETE | `/api/corporate/directors/:id` | Soft-delete director |

### Filings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/filings/:clientId` | Get filings for entity |
| POST | `/api/corporate/filings` | Add filing |
| PUT | `/api/corporate/filings/:id` | Update filing |
| DELETE | `/api/corporate/filings/:id` | Soft-delete filing |

### Meetings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/meetings/:clientId` | Get meetings for entity |
| POST | `/api/corporate/meetings` | Add meeting |
| PUT | `/api/corporate/meetings/:id` | Update meeting |
| DELETE | `/api/corporate/meetings/:id` | Soft-delete meeting |

### Compliance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/corporate/compliance` | Get upcoming compliance items (query: `?days=30`) |

## Reports (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/dashboard-stats` | Dashboard statistics |
| GET | `/api/reports/pending-invoices` | Top 10 pending/overdue invoices |
| POST | `/api/reports/generate` | Generate report (body: `{reportType, filters}`) |

### Available Report Types (via POST /generate)
- `outstanding-receivables` - Outstanding invoices
- `revenue-by-client` - Revenue breakdown by client
- `revenue-by-matter` - Revenue breakdown by matter
- `time-by-lawyer` - Time entries by lawyer
- `time-by-client` - Time entries by client
- `unbilled-time` - All unbilled time entries
- `active-matters` - Active/engaged matters
- `upcoming-hearings` - Upcoming hearings (next 50)
- `pending-judgments` - Pending judgments
- `tasks-overdue` - Overdue tasks
- `expenses-by-category` - Expense breakdown
- `retainer-balances` - Active retainer balances
- `client-statement` - Client statement (requires `filters.clientId`)
- `invoice-aging` - Invoice aging analysis
- `case-status-report` - Case status (requires `filters.clientId`)
- `client-360-report` - Full client 360 (requires `filters.clientId`)

## Trash (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trash` | Get all trash items (grouped by type) |
| GET | `/api/trash/count` | Get trash counts per type + total |
| POST | `/api/trash/restore/:type/:id` | Restore soft-deleted item |
| DELETE | `/api/trash/:type/:id` | Permanently delete item |
| DELETE | `/api/trash` | Empty all trash |

### Supported Trash Types
`client`, `matter`, `hearing`, `judgment`, `task`, `timesheet`, `expense`, `invoice`, `appointment`, `advance`, `deadline`, `lawyer`

---

## Electron-Only Operations (19 handlers)

These operations require Electron APIs (file dialogs, BrowserWindow for PDF, XLSX library) and are **not exposed via REST**. The web version will handle exports differently (browser download, client-side PDF).

### Generic Exports (3)
- `export-to-excel` - Save data as XLSX via file dialog
- `export-to-csv` - Save data as CSV via file dialog
- `export-to-pdf` - Generate PDF via BrowserWindow.printToPDF

### Client Statement Exports (2)
- `export-client-statement-pdf` - Styled PDF statement
- `export-client-statement-excel` - Multi-sheet XLSX statement

### Case Status Exports (2)
- `export-case-status-pdf` - Styled PDF case report
- `export-case-status-excel` - Multi-sheet XLSX case report

### Client 360 Exports (2)
- `export-client-360-pdf` - Styled PDF 360 report
- `export-client-360-excel` - Multi-sheet XLSX 360 report

### Settings (Electron-specific) (6)
- `get-backup-path` / `set-backup-path` - Backup directory
- `create-backup` / `restore-backup` - Database backup/restore
- `export-all-data` / `import-data` - Full data export/import

### Client Imports (Electron-specific) (1)
- `import-clients-xlsx` - XLSX file import via file dialog

### License (4)
- `license:getStatus` - Check license status
- `license:getMachineId` - Get machine fingerprint
- `license:validate` - Activate license key
- `license:clear` - Clear license (support use)

---

*Generated: Session 2 Complete - v48.2-session2-complete*
