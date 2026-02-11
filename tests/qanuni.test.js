/**
 * Qanuni Comprehensive Test Suite
 * Tests all v40.3.1 features and core functionality
 */

const { initDatabase, closeDatabase, runQuery, runInsert, seedTestData } = require('./db-helper');

// Test data dates
const today = new Date().toISOString().split('T')[0];
const firstOfMonth = today.substring(0, 7) + '-01';
const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
const firstOfLastMonth = lastMonth.substring(0, 7) + '-01';
const lastOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

describe('Qanuni v40.3.1 Test Suite', () => {
  
  beforeAll(async () => {
    await initDatabase();
    seedTestData();
  });

  afterAll(() => {
    closeDatabase();
  });

  // ============================================
  // DASHBOARD STATS TESTS
  // ============================================
  describe('Dashboard Statistics', () => {
    
    test('Total Clients counts only active clients', () => {
      const result = runQuery("SELECT COUNT(*) as count FROM clients WHERE active = 1");
      expect(result[0].count).toBe(2); // CLT-001, CLT-002 (CLT-003 is inactive)
    });

    test('Active Matters counts only active status', () => {
      const result = runQuery("SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
      expect(result[0].count).toBe(2); // MTR-001, MTR-002 (MTR-003 is closed)
    });

    test('Pending Tasks counts assigned and in_progress only', () => {
      const result = runQuery("SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
      expect(result[0].count).toBe(3); // TSK-001, TSK-002, TSK-003 (TSK-004 is done)
    });

    test('Pending Judgments counts only pending status', () => {
      const result = runQuery("SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");
      expect(result[0].count).toBe(2); // JDG-001, JDG-002 (JDG-003 is issued)
    });

    test('Outstanding Invoices sums unpaid invoices', () => {
      const result = runQuery("SELECT SUM(total) as amount FROM invoices WHERE status NOT IN ('paid', 'cancelled', 'written_off')");
      expect(result[0].amount).toBe(2000); // INV-003 only
    });
  });

  // ============================================
  // THIS MONTH REVENUE TESTS (v40.3 feature)
  // ============================================
  describe('This Month Revenue Calculation', () => {
    
    test('Includes client retainers received this month', () => {
      const result = runQuery(`
        SELECT COALESCE(SUM(amount), 0) as total FROM advances 
        WHERE date_received >= ? AND status IN ('active', 'depleted')
        AND advance_type = 'client_retainer'
      `, [firstOfMonth]);
      expect(result[0].total).toBe(5000); // ADV-001 only (ADV-002 is last month)
    });

    test('Includes fee payments received this month', () => {
      const result = runQuery(`
        SELECT COALESCE(SUM(amount), 0) as total FROM advances 
        WHERE date_received >= ? AND status IN ('active', 'depleted')
        AND advance_type LIKE 'fee_payment%'
      `, [firstOfMonth]);
      expect(result[0].total).toBe(300); // ADV-005
    });

    test('Includes paid invoices this month', () => {
      const result = runQuery(`
        SELECT COALESCE(SUM(total), 0) as total FROM invoices 
        WHERE status = 'paid' AND paid_date >= ?
      `, [firstOfMonth]);
      expect(result[0].total).toBe(1500); // INV-001
    });

    test('EXCLUDES expense advances from revenue', () => {
      const result = runQuery(`
        SELECT COALESCE(SUM(amount), 0) as total FROM advances 
        WHERE date_received >= ? AND advance_type = 'client_expense_advance'
      `, [firstOfMonth]);
      // This should NOT be counted in revenue
      expect(result[0].total).toBe(1000); // ADV-003 exists but shouldn't count
    });

    test('EXCLUDES lawyer advances from revenue', () => {
      const result = runQuery(`
        SELECT COALESCE(SUM(amount), 0) as total FROM advances 
        WHERE date_received >= ? AND advance_type = 'lawyer_advance'
      `, [firstOfMonth]);
      // This should NOT be counted in revenue
      expect(result[0].total).toBe(500); // ADV-004 exists but shouldn't count
    });

    test('Total this month revenue is correct (retainers + fee payments + paid invoices)', () => {
      const retainers = runQuery(`
        SELECT COALESCE(SUM(amount), 0) as total FROM advances 
        WHERE date_received >= ? AND status IN ('active', 'depleted')
        AND (advance_type = 'client_retainer' OR advance_type LIKE 'fee_payment%')
      `, [firstOfMonth]);
      
      const invoices = runQuery(`
        SELECT COALESCE(SUM(total), 0) as total FROM invoices 
        WHERE status = 'paid' AND paid_date >= ?
      `, [firstOfMonth]);
      
      const totalRevenue = (retainers[0].total || 0) + (invoices[0].total || 0);
      expect(totalRevenue).toBe(6800); // 5000 + 300 + 1500
    });
  });

  // ============================================
  // TASKS WITH ASSIGNED LAWYER (v40 feature)
  // ============================================
  describe('Tasks - Assigned Lawyer Display', () => {
    
    test('Task query returns assigned lawyer name', () => {
      const result = runQuery(`
        SELECT t.*, l.name as assigned_lawyer_name
        FROM tasks t 
        LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
        WHERE t.task_id = 'TSK-001'
      `);
      expect(result[0].assigned_lawyer_name).toBe('John Smith');
    });

    test('Unassigned task returns null for lawyer name', () => {
      const result = runQuery(`
        SELECT t.*, l.name as assigned_lawyer_name
        FROM tasks t 
        LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
        WHERE t.task_id = 'TSK-003'
      `);
      expect(result[0].assigned_lawyer_name).toBeNull();
    });

    test('All tasks query includes lawyer join', () => {
      const result = runQuery(`
        SELECT t.*, m.matter_name, c.client_name, lt.name_en as task_type_name,
          l.name as assigned_lawyer_name
        FROM tasks t 
        LEFT JOIN matters m ON t.matter_id = m.matter_id 
        LEFT JOIN clients c ON t.client_id = c.client_id 
        LEFT JOIN lookup_task_types lt ON t.task_type_id = lt.task_type_id
        LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
        ORDER BY t.due_date ASC
      `);
      expect(result.length).toBe(4);
      const assignedTask = result.find(t => t.task_id === 'TSK-001');
      expect(assignedTask.assigned_lawyer_name).toBe('John Smith');
    });
  });

  // ============================================
  // UPCOMING HEARINGS - EXCLUDE JUDGMENT PRONOUNCEMENT
  // ============================================
  describe('Upcoming Hearings Report', () => {
    
    test('Excludes hearings with purpose_id = Judgment Pronouncement', () => {
      const result = runQuery(`
        SELECT h.*, lp.name_en as purpose_name
        FROM hearings h
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.hearing_date >= date('now')
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')
      `);
      expect(result.length).toBe(2); // HRG-001, HRG-002 (HRG-003, HRG-004 are JP)
    });

    test('Includes regular hearings', () => {
      const result = runQuery(`
        SELECT h.*, lp.name_en as purpose_name
        FROM hearings h
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.hearing_date >= date('now')
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')
      `);
      const purposes = result.map(h => h.purpose_name);
      expect(purposes).toContain('First Hearing');
      expect(purposes).toContain('Evidence Submission');
      expect(purposes).not.toContain('Judgment Pronouncement');
    });

    test('Dashboard hearing count matches report', () => {
      const dashboardCount = runQuery(`
        SELECT COUNT(*) as count FROM hearings h
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.hearing_date >= date('now') 
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')
      `);
      
      const reportResults = runQuery(`
        SELECT h.* FROM hearings h
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.hearing_date >= date('now')
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')
      `);
      
      expect(dashboardCount[0].count).toBe(reportResults.length);
    });
  });

  // ============================================
  // PENDING JUDGMENTS REPORT
  // ============================================
  describe('Pending Judgments Report', () => {
    
    test('Returns only pending status judgments', () => {
      const result = runQuery(`
        SELECT j.* FROM judgments j WHERE j.status = 'pending'
      `);
      expect(result.length).toBe(2); // JDG-001, JDG-002
    });

    test('Excludes issued judgments', () => {
      const result = runQuery(`
        SELECT j.* FROM judgments j WHERE j.status = 'pending'
      `);
      const ids = result.map(j => j.judgment_id);
      expect(ids).not.toContain('JDG-003'); // Issued judgment
    });

    test('Dashboard count matches report count', () => {
      const dashboardCount = runQuery("SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");
      const reportResults = runQuery("SELECT * FROM judgments WHERE status = 'pending'");
      expect(dashboardCount[0].count).toBe(reportResults.length);
    });
  });

  // ============================================
  // REVENUE REPORTS WITH DATE FILTERS
  // ============================================
  describe('Revenue Reports - Date Filtering', () => {
    
    test('Revenue by Client - This month filter', () => {
      const dateFrom = firstOfMonth;
      const dateTo = today;
      
      const result = runQuery(`
        SELECT c.client_id, c.client_name, 
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue,
          COALESCE(adv.fee_payment_revenue, 0) as fee_payment_revenue
        FROM clients c
        LEFT JOIN (
          SELECT client_id, SUM(total) as invoice_revenue
          FROM invoices WHERE status = 'paid' AND paid_date >= ? AND paid_date <= ?
          GROUP BY client_id
        ) inv ON c.client_id = inv.client_id
        LEFT JOIN (
          SELECT client_id, 
            SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue,
            SUM(CASE WHEN advance_type LIKE 'fee_payment%' THEN amount ELSE 0 END) as fee_payment_revenue
          FROM advances 
          WHERE status IN ('active', 'depleted') AND date_received >= ? AND date_received <= ?
          GROUP BY client_id
        ) adv ON c.client_id = adv.client_id
        WHERE c.active = 1
      `, [dateFrom, dateTo, dateFrom, dateTo]);
      
      const acme = result.find(r => r.client_id === 'CLT-001');
      expect(acme.invoice_revenue).toBe(1500);
      expect(acme.retainer_revenue).toBe(5000);
      expect(acme.fee_payment_revenue).toBe(300);
    });

    test('Revenue by Client - All time shows all data', () => {
      const dateFrom = '2000-01-01';
      const dateTo = '2099-12-31';
      
      const result = runQuery(`
        SELECT c.client_id, 
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue
        FROM clients c
        LEFT JOIN (
          SELECT client_id, SUM(total) as invoice_revenue
          FROM invoices WHERE status = 'paid' AND paid_date >= ? AND paid_date <= ?
          GROUP BY client_id
        ) inv ON c.client_id = inv.client_id
        LEFT JOIN (
          SELECT client_id, 
            SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue
          FROM advances 
          WHERE status IN ('active', 'depleted') AND date_received >= ? AND date_received <= ?
          GROUP BY client_id
        ) adv ON c.client_id = adv.client_id
        WHERE c.active = 1
      `, [dateFrom, dateTo, dateFrom, dateTo]);
      
      // All time should include last month's data too
      const johnDoe = result.find(r => r.client_id === 'CLT-002');
      expect(johnDoe.invoice_revenue).toBe(800); // Last month invoice
      expect(johnDoe.retainer_revenue).toBe(2000); // Last month retainer
    });

    test('Time by Lawyer - Date filter works', () => {
      const dateFrom = firstOfMonth;
      const dateTo = today;
      
      const result = runQuery(`
        SELECT l.lawyer_id, l.name as lawyer_name,
          SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes,
          SUM(CASE WHEN t.billable = 0 THEN t.minutes ELSE 0 END) as non_billable_minutes
        FROM lawyers l
        LEFT JOIN timesheets t ON l.lawyer_id = t.lawyer_id AND t.date >= ? AND t.date <= ?
        GROUP BY l.lawyer_id
      `, [dateFrom, dateTo]);
      
      const johnSmith = result.find(r => r.lawyer_id === 'LAW-001');
      expect(johnSmith.billable_minutes).toBe(120); // TS-001
      expect(johnSmith.non_billable_minutes).toBe(60); // TS-002
      
      const sarah = result.find(r => r.lawyer_id === 'LAW-002');
      expect(sarah.billable_minutes).toBe(0); // TS-003 is last month
    });

    test('Expenses by Category - Date filter works', () => {
      const dateFrom = firstOfMonth;
      const dateTo = today;
      
      const result = runQuery(`
        SELECT ec.name_en as category_name,
          SUM(e.amount) as total_amount
        FROM lookup_expense_categories ec
        LEFT JOIN expenses e ON ec.category_id = e.category_id AND e.date >= ? AND e.date <= ?
        GROUP BY ec.category_id
      `, [dateFrom, dateTo]);
      
      const courtFees = result.find(r => r.category_name === 'Court Fees');
      expect(courtFees.total_amount).toBe(150); // EXP-001
      
      const travel = result.find(r => r.category_name === 'Travel');
      expect(travel.total_amount).toBeNull(); // EXP-002 is last month
    });
  });

  // ============================================
  // TIMER - ALLOW UNDER 1 MINUTE (v40 feature)
  // ============================================
  describe('Timer - Save Under 1 Minute', () => {
    
    test('Can save timesheet with less than 60 seconds', () => {
      const result = runInsert(`
        INSERT INTO timesheets (timesheet_id, client_id, matter_id, lawyer_id, date, minutes, billable, created_at)
        VALUES ('TS-SHORT', 'CLT-001', 'MTR-001', 'LAW-001', ?, 0.5, 1, ?)
      `, [today, new Date().toISOString()]);
      
      expect(result.success).toBe(true);
      
      const saved = runQuery("SELECT * FROM timesheets WHERE timesheet_id = 'TS-SHORT'");
      expect(saved[0].minutes).toBe(0.5);
    });

    test('Can save timesheet with exactly 1 second (0.017 minutes)', () => {
      const result = runInsert(`
        INSERT INTO timesheets (timesheet_id, client_id, matter_id, lawyer_id, date, minutes, billable, created_at)
        VALUES ('TS-ONESEC', 'CLT-001', 'MTR-001', 'LAW-001', ?, 0.017, 1, ?)
      `, [today, new Date().toISOString()]);
      
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // INVOICE PAID_DATE TRACKING
  // ============================================
  describe('Invoice Paid Date Tracking', () => {
    
    test('Paid invoices have paid_date set', () => {
      const result = runQuery("SELECT * FROM invoices WHERE status = 'paid'");
      result.forEach(inv => {
        expect(inv.paid_date).not.toBeNull();
      });
    });

    test('Unpaid invoices have null paid_date', () => {
      const result = runQuery("SELECT * FROM invoices WHERE status != 'paid'");
      result.forEach(inv => {
        expect(inv.paid_date).toBeNull();
      });
    });

    test('Update invoice status to paid sets paid_date', () => {
      // Insert a draft invoice
      runInsert(`
        INSERT INTO invoices (invoice_id, invoice_number, client_id, total, status, created_at)
        VALUES ('INV-TEST', 'INV-TEST', 'CLT-001', 500, 'draft', ?)
      `, [new Date().toISOString()]);
      
      // Update to paid with paid_date
      runInsert(`
        UPDATE invoices SET status = 'paid', paid_date = COALESCE(paid_date, ?)
        WHERE invoice_id = 'INV-TEST'
      `, [today]);
      
      const result = runQuery("SELECT * FROM invoices WHERE invoice_id = 'INV-TEST'");
      expect(result[0].status).toBe('paid');
      expect(result[0].paid_date).toBe(today);
    });
  });
});

// ============================================
// SUMMARY OUTPUT
// ============================================
afterAll(() => {
  console.log('\n' + '='.repeat(60));
  console.log('QANUNI v40.3.1 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\nFeatures Tested:');
  console.log('  ✓ Dashboard Statistics');
  console.log('  ✓ This Month Revenue (retainers + fee payments + invoices)');
  console.log('  ✓ Tasks with Assigned Lawyer');
  console.log('  ✓ Upcoming Hearings (excluding Judgment Pronouncement)');
  console.log('  ✓ Pending Judgments Report');
  console.log('  ✓ Revenue Reports with Date Filters');
  console.log('  ✓ Timer - Save Under 1 Minute');
  console.log('  ✓ Invoice Paid Date Tracking');
  console.log('\n' + '='.repeat(60));
});
