# Qanuni Test Suite v40.3.1

Comprehensive automated tests for Qanuni Legal Practice Management.

## Quick Start

```powershell
# Navigate to tests folder
cd C:\Projects\qanuni\tests

# Install dependencies (first time only)
npm install

# Run all tests
npm test
```

## What's Tested

### Dashboard Statistics
- Total active clients (excludes inactive)
- Active matters count
- Pending tasks (assigned + in_progress)
- Pending judgments
- Outstanding invoices

### This Month Revenue (v40.3)
- ✅ Includes client retainers received this month
- ✅ Includes fee payments received this month
- ✅ Includes paid invoices this month
- ❌ Excludes expense advances
- ❌ Excludes lawyer advances

### Tasks - Assigned Lawyer (v40)
- Shows assigned lawyer name in task list
- Unassigned tasks show null/empty

### Upcoming Hearings Report (v40.3.1)
- Excludes "Judgment Pronouncement" hearings
- Dashboard count matches report count

### Pending Judgments Report (v40.3.1)
- Returns only `status = 'pending'`
- Dashboard count matches report count

### Revenue Reports - Date Filters (v40.3)
- Revenue by Client with date range
- Revenue by Matter with date range
- Time by Lawyer with date range
- Time by Client with date range
- Expenses by Category with date range

### Timer - Under 1 Minute (v40)
- Can save timesheets with < 60 seconds

### Invoice Paid Date Tracking (v40.3)
- Paid invoices have `paid_date` set
- Updating status to paid sets `paid_date`

## Test Output Example

```
PASS  tests/qanuni.test.js
  Qanuni v40.3.1 Test Suite
    Dashboard Statistics
      ✓ Total Clients counts only active clients
      ✓ Active Matters counts only active status
      ✓ Pending Tasks counts assigned and in_progress only
      ✓ Pending Judgments counts only pending status
      ✓ Outstanding Invoices sums unpaid invoices
    This Month Revenue Calculation
      ✓ Includes client retainers received this month
      ✓ Includes fee payments received this month
      ✓ Includes paid invoices this month
      ✓ EXCLUDES expense advances from revenue
      ✓ EXCLUDES lawyer advances from revenue
      ✓ Total this month revenue is correct
    ...

============================================================
QANUNI v40.3.1 TEST SUMMARY
============================================================

Features Tested:
  ✓ Dashboard Statistics
  ✓ This Month Revenue (retainers + fee payments + invoices)
  ✓ Tasks with Assigned Lawyer
  ✓ Upcoming Hearings (excluding Judgment Pronouncement)
  ✓ Pending Judgments Report
  ✓ Revenue Reports with Date Filters
  ✓ Timer - Save Under 1 Minute
  ✓ Invoice Paid Date Tracking

============================================================
```

## File Structure

```
tests/
├── package.json       # Dependencies & scripts
├── db-helper.js       # In-memory SQLite database helper
├── qanuni.test.js     # Main test suite
└── README.md          # This file
```

## Adding New Tests

1. Add test data in `db-helper.js` → `seedTestData()`
2. Add test cases in `qanuni.test.js`
3. Run `npm test` to verify

## Troubleshooting

**Error: Cannot find module 'sql.js'**
```powershell
cd tests
npm install
```

**Tests timing out**
The test timeout is set to 30 seconds. If tests are slow, check database queries.

**Test data not matching**
Dates are calculated dynamically based on "today". Check if your system date is correct.
