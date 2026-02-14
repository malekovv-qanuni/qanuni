/**
 * Qanuni IPC Handlers — Reports & Exports (Dual-Mode: IPC + REST)
 * 3 data handlers (REST-compatible): dashboard stats, pending invoices, generate-report
 * 9 Electron-only handlers: export-to-excel/csv/pdf, client-statement/case-status/client-360 PDF/Excel
 * Dependencies: dialog, BrowserWindow, fs, path, app, XLSX (Electron-only)
 * @version 3.0.0 (Dual-Mode Refactor)
 */

const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');

// ============================================================================
// PURE FUNCTIONS - Data-only handlers (REST-compatible)
// ============================================================================

function getDashboardStats(database) {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = today.substring(0, 7) + '-01';

  const activeMatters = database.queryOne("SELECT COUNT(*) as count FROM matters WHERE status = 'active'");
  const totalClients = database.queryOne("SELECT COUNT(*) as count FROM clients WHERE active = 1");
  const pendingTasks = database.queryOne("SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')");
  const draftInvoices = database.queryOne("SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
  const upcomingHearings = database.queryOne(`
    SELECT COUNT(*) as count FROM hearings h
    LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
    WHERE h.hearing_date >= ?
    AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
    AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')`, [today]);
  const overdueTasks = database.queryOne("SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'cancelled') AND due_date < ?", [today]);
  const outstandingInvoices = database.queryOne("SELECT SUM(total) as amount FROM invoices WHERE status NOT IN ('paid', 'cancelled', 'written_off')");
  const pendingJudgments = database.queryOne("SELECT COUNT(*) as count FROM judgments WHERE status = 'pending'");

  const retainerRevenue = database.queryOne(`
    SELECT COALESCE(SUM(amount), 0) as total FROM advances
    WHERE date_received >= ? AND status IN ('active', 'depleted')
    AND (advance_type = 'client_retainer' OR advance_type LIKE 'fee_payment%')`, [firstDayOfMonth]);
  const invoiceRevenue = database.queryOne(`
    SELECT COALESCE(SUM(total), 0) as total FROM invoices
    WHERE status = 'paid' AND paid_date >= ?`, [firstDayOfMonth]);

  return {
    activeMatters: activeMatters?.count || 0,
    totalClients: totalClients?.count || 0,
    pendingTasks: pendingTasks?.count || 0,
    draftInvoices: draftInvoices?.count || 0,
    upcomingHearings: upcomingHearings?.count || 0,
    overdueTasks: overdueTasks?.count || 0,
    outstandingInvoices: outstandingInvoices?.amount || 0,
    pendingJudgments: pendingJudgments?.count || 0,
    thisMonthRevenue: (retainerRevenue?.total || 0) + (invoiceRevenue?.total || 0)
  };
}

function getPendingInvoices(database) {
  const today = new Date().toISOString().split('T')[0];
  return database.query(`
    SELECT i.invoice_id, i.invoice_number, i.client_id, i.total, i.currency, i.status,
      i.issue_date, i.due_date, c.client_name,
      CASE
        WHEN i.due_date < ? THEN 'overdue'
        WHEN i.due_date <= date(?, '+7 days') THEN 'due_soon'
        ELSE 'pending'
      END as urgency,
      julianday(?) - julianday(i.due_date) as days_overdue
    FROM invoices i LEFT JOIN clients c ON i.client_id = c.client_id
    WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue') AND i.deleted_at IS NULL
    ORDER BY i.due_date ASC LIMIT 10`, [today, today, today]);
}

function generateReport(database, reportType, filters) {
  if (!filters) filters = {};
  const dateFrom = filters?.dateFrom || '2000-01-01';
  const dateTo = filters?.dateTo || '2099-12-31';

  switch (reportType) {
    case 'outstanding-receivables':
      return database.query(`SELECT i.*, c.client_name, julianday('now') - julianday(i.due_date) as days_overdue
        FROM invoices i LEFT JOIN clients c ON i.client_id = c.client_id
        WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue') ORDER BY i.due_date ASC`);

    case 'revenue-by-client':
      return database.query(`
        SELECT c.client_id, c.client_name,
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue,
          COALESCE(adv.fee_payment_revenue, 0) as fee_payment_revenue,
          COALESCE(inv.invoice_revenue, 0) + COALESCE(adv.retainer_revenue, 0) + COALESCE(adv.fee_payment_revenue, 0) as total_revenue,
          COALESCE(inv.invoice_count, 0) as invoice_count
        FROM clients c
        LEFT JOIN (SELECT client_id, SUM(total) as invoice_revenue, COUNT(*) as invoice_count
          FROM invoices WHERE status = 'paid' AND deleted_at IS NULL AND paid_date IS NOT NULL AND paid_date >= ? AND paid_date <= ? GROUP BY client_id) inv ON c.client_id = inv.client_id
        LEFT JOIN (SELECT client_id,
          SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue,
          SUM(CASE WHEN advance_type LIKE 'fee_payment%' THEN amount ELSE 0 END) as fee_payment_revenue
          FROM advances WHERE status IN ('active', 'depleted') AND deleted_at IS NULL AND date_received >= ? AND date_received <= ? GROUP BY client_id) adv ON c.client_id = adv.client_id
        WHERE c.active = 1 AND c.deleted_at IS NULL
        GROUP BY c.client_id ORDER BY total_revenue DESC`, [dateFrom, dateTo, dateFrom, dateTo]);

    case 'revenue-by-matter':
      return database.query(`
        SELECT m.matter_id, m.matter_name, c.client_name,
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue,
          COALESCE(adv.fee_payment_revenue, 0) as fee_payment_revenue,
          COALESCE(inv.invoice_revenue, 0) + COALESCE(adv.retainer_revenue, 0) + COALESCE(adv.fee_payment_revenue, 0) as total_revenue
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN (SELECT matter_id, SUM(total) as invoice_revenue FROM invoices WHERE status = 'paid' AND deleted_at IS NULL AND paid_date IS NOT NULL AND paid_date >= ? AND paid_date <= ? GROUP BY matter_id) inv ON m.matter_id = inv.matter_id
        LEFT JOIN (SELECT matter_id,
          SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue,
          SUM(CASE WHEN advance_type LIKE 'fee_payment%' THEN amount ELSE 0 END) as fee_payment_revenue
          FROM advances WHERE status IN ('active', 'depleted') AND deleted_at IS NULL AND date_received >= ? AND date_received <= ? GROUP BY matter_id) adv ON m.matter_id = adv.matter_id
        WHERE m.deleted_at IS NULL GROUP BY m.matter_id ORDER BY total_revenue DESC`, [dateFrom, dateTo, dateFrom, dateTo]);

    case 'time-by-lawyer':
      return database.query(`SELECT l.lawyer_id, l.name as lawyer_name,
        SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes,
        SUM(CASE WHEN t.billable = 0 THEN t.minutes ELSE 0 END) as non_billable_minutes,
        SUM(t.minutes) as total_minutes
        FROM lawyers l LEFT JOIN timesheets t ON l.lawyer_id = t.lawyer_id AND t.date >= ? AND t.date <= ?
        GROUP BY l.lawyer_id ORDER BY billable_minutes DESC`, [dateFrom, dateTo]);

    case 'time-by-client':
      return database.query(`SELECT c.client_id, c.client_name,
        SUM(t.minutes) as total_minutes,
        SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes
        FROM clients c LEFT JOIN timesheets t ON c.client_id = t.client_id AND t.date >= ? AND t.date <= ?
        GROUP BY c.client_id ORDER BY total_minutes DESC`, [dateFrom, dateTo]);

    case 'unbilled-time':
      return database.query(`SELECT t.*, c.client_name, m.matter_name, l.name as lawyer_name
        FROM timesheets t LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN matters m ON t.matter_id = m.matter_id LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
        WHERE t.status = 'draft' AND t.billable = 1 ORDER BY t.date ASC`);

    case 'active-matters':
      return database.query(`SELECT m.*, c.client_name, l.name as lawyer_name
        FROM matters m LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN lawyers l ON m.responsible_lawyer_id = l.lawyer_id
        WHERE m.status IN ('active', 'engaged') ORDER BY m.created_at DESC`);

    case 'upcoming-hearings': {
      const todayStr = new Date().toISOString().split('T')[0];
      return database.query(`SELECT h.*, m.matter_name, c.client_name, lp.name_en as purpose_name
        FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        WHERE h.hearing_date >= ?
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        AND (h.purpose_custom IS NULL OR h.purpose_custom != 'Judgment Pronouncement')
        ORDER BY h.hearing_date ASC LIMIT 50`, [todayStr]);
    }

    case 'pending-judgments':
      return database.query(`SELECT j.*, m.matter_name, c.client_name
        FROM judgments j LEFT JOIN matters m ON j.matter_id = m.matter_id
        LEFT JOIN clients c ON m.client_id = c.client_id
        WHERE j.status = 'pending' ORDER BY j.expected_date ASC`);

    case 'tasks-overdue': {
      const todayStr2 = new Date().toISOString().split('T')[0];
      return database.query(`SELECT t.*, m.matter_name, c.client_name
        FROM tasks t LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN clients c ON t.client_id = c.client_id
        WHERE t.status NOT IN ('done', 'cancelled') AND t.due_date < ? ORDER BY t.due_date ASC`, [todayStr2]);
    }

    case 'expenses-by-category':
      return database.query(`SELECT ec.name_en as category_name, ec.category_id,
        SUM(e.amount) as total_amount, COUNT(e.expense_id) as expense_count
        FROM lookup_expense_categories ec
        LEFT JOIN expenses e ON ec.category_id = e.category_id AND e.date >= ? AND e.date <= ?
        GROUP BY ec.category_id ORDER BY total_amount DESC`, [dateFrom, dateTo]);

    case 'retainer-balances':
      return database.query(`SELECT a.*, c.client_name, m.matter_name
        FROM advances a LEFT JOIN clients c ON a.client_id = c.client_id
        LEFT JOIN matters m ON a.matter_id = m.matter_id
        WHERE a.advance_type = 'client_retainer' AND a.status = 'active'
        ORDER BY a.balance_remaining ASC`);

    case 'client-statement': {
      const clientId = filters?.clientId;
      if (!clientId) return { success: false, error: 'Client ID required' };
      const client = database.queryOne('SELECT * FROM clients WHERE client_id = ?', [clientId]);
      if (!client) return { success: false, error: 'Client not found' };

      const invoices = database.query(`SELECT i.*, m.matter_name FROM invoices i
        LEFT JOIN matters m ON i.matter_id = m.matter_id
        WHERE i.client_id = ? AND i.issue_date >= ? AND i.issue_date <= ? ORDER BY i.issue_date ASC`, [clientId, dateFrom, dateTo]);
      const payments = database.query(`SELECT a.*, m.matter_name,
        CASE WHEN a.advance_type = 'client_retainer' THEN 'Retainer Payment'
             WHEN a.advance_type LIKE 'fee_payment%' THEN 'Fee Payment' ELSE 'Payment' END as payment_type_label
        FROM advances a LEFT JOIN matters m ON a.matter_id = m.matter_id
        WHERE a.client_id = ? AND a.advance_type IN ('client_retainer', 'fee_payment', 'fee_payment_cash', 'fee_payment_bank')
        AND a.date_received >= ? AND a.date_received <= ? ORDER BY a.date_received ASC`, [clientId, dateFrom, dateTo]);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const outstanding = invoices.filter(inv => !['paid', 'cancelled', 'draft'].includes(inv.status)).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const openingBalanceResult = database.queryOne(`SELECT COALESCE(SUM(total), 0) as opening_balance FROM invoices
        WHERE client_id = ? AND issue_date < ? AND status NOT IN ('paid', 'cancelled', 'draft')`, [clientId, dateFrom]);
      const openingBalance = parseFloat(openingBalanceResult?.opening_balance) || 0;

      return { client, invoices, payments,
        summary: { openingBalance, totalInvoiced, totalPaid, totalPayments, outstanding, closingBalance: openingBalance + totalInvoiced - totalPayments },
        period: { dateFrom, dateTo } };
    }

    case 'invoice-aging': {
      const agingData = database.query(`SELECT i.*, c.client_name, c.client_name_arabic, m.matter_name,
        julianday('now') - julianday(i.due_date) as days_overdue,
        CASE WHEN julianday('now') - julianday(i.due_date) <= 0 THEN 'current'
             WHEN julianday('now') - julianday(i.due_date) <= 30 THEN '1-30'
             WHEN julianday('now') - julianday(i.due_date) <= 60 THEN '31-60'
             WHEN julianday('now') - julianday(i.due_date) <= 90 THEN '61-90'
             ELSE '90+' END as aging_bucket
        FROM invoices i LEFT JOIN clients c ON i.client_id = c.client_id LEFT JOIN matters m ON i.matter_id = m.matter_id
        WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue') ORDER BY days_overdue DESC`);
      const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      agingData.forEach(inv => { buckets[inv.aging_bucket] = (buckets[inv.aging_bucket] || 0) + (parseFloat(inv.total) || 0); });
      return { invoices: agingData, buckets, totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0) };
    }

    case 'case-status-report': {
      const caseClientId = filters?.clientId;
      if (!caseClientId) return { success: false, error: 'Client ID required' };
      const todayStr = new Date().toISOString().split('T')[0];
      const in90Days = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
      const in60Days = new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0];
      const past12M = new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0];

      const caseClient = database.queryOne('SELECT * FROM clients WHERE client_id = ?', [caseClientId]);
      if (!caseClient) return { success: false, error: 'Client not found' };

      const clientMatters = database.query(`SELECT m.*, l.name as lawyer_name FROM matters m
        LEFT JOIN lawyers l ON m.responsible_lawyer_id = l.lawyer_id
        WHERE m.client_id = ? AND m.status IN ('active', 'engaged', 'on_hold') ORDER BY m.created_at DESC`, [caseClientId]);
      const upcomingHearings = database.query(`SELECT h.*, m.matter_name, m.matter_name_arabic, lp.name_en as purpose_name, lp.name_ar as purpose_name_ar,
        ct.name_en as court_name, ct.name_ar as court_name_ar
        FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id
        LEFT JOIN lookup_court_types ct ON h.court_type_id = ct.court_type_id
        WHERE m.client_id = ? AND h.hearing_date >= ? AND h.hearing_date <= ?
        AND (lp.name_en IS NULL OR lp.name_en != 'Judgment Pronouncement')
        ORDER BY h.hearing_date ASC`, [caseClientId, todayStr, in90Days]);
      const recentJudgments = database.query(`SELECT j.*, m.matter_name, m.matter_name_arabic FROM judgments j
        LEFT JOIN matters m ON j.matter_id = m.matter_id WHERE m.client_id = ? AND j.expected_date >= ? ORDER BY j.expected_date DESC`, [caseClientId, past12M]);
      const upcomingDeadlines = database.query(`SELECT d.*, m.matter_name, m.matter_name_arabic FROM deadlines d
        LEFT JOIN matters m ON d.matter_id = m.matter_id WHERE m.client_id = ? AND d.deadline_date >= ? AND d.deadline_date <= ? AND d.status != 'completed'
        ORDER BY d.deadline_date ASC`, [caseClientId, todayStr, in60Days]);

      return { client: caseClient, matters: clientMatters, hearings: upcomingHearings, judgments: recentJudgments, deadlines: upcomingDeadlines,
        summary: { totalMatters: clientMatters.length,
          matterCounts: { active: clientMatters.filter(m => m.status === 'active').length, engaged: clientMatters.filter(m => m.status === 'engaged').length, onHold: clientMatters.filter(m => m.status === 'on_hold').length },
          upcomingHearingsCount: upcomingHearings.length, recentJudgmentsCount: recentJudgments.length, upcomingDeadlinesCount: upcomingDeadlines.length },
        generatedAt: new Date().toISOString() };
    }

    case 'client-360-report': {
      const client360Id = filters?.clientId;
      if (!client360Id) return { success: false, error: 'Client ID required' };
      const client360 = database.queryOne('SELECT * FROM clients WHERE client_id = ?', [client360Id]);
      if (!client360) return { success: false, error: 'Client not found' };

      const allMatters = database.query(`SELECT m.*, l.name as lawyer_name FROM matters m LEFT JOIN lawyers l ON m.responsible_lawyer_id = l.lawyer_id WHERE m.client_id = ? ORDER BY m.opening_date DESC`, [client360Id]);
      const allHearings = database.query(`SELECT h.*, m.matter_name, m.matter_name_arabic, lp.name_en as purpose_name, lp.name_ar as purpose_name_ar FROM hearings h LEFT JOIN matters m ON h.matter_id = m.matter_id LEFT JOIN lookup_hearing_purposes lp ON h.purpose_id = lp.purpose_id WHERE m.client_id = ? ORDER BY h.hearing_date DESC`, [client360Id]);
      const allJudgments = database.query(`SELECT j.*, m.matter_name, m.matter_name_arabic FROM judgments j LEFT JOIN matters m ON j.matter_id = m.matter_id WHERE m.client_id = ? ORDER BY j.expected_date DESC`, [client360Id]);
      const allDeadlines = database.query(`SELECT d.*, m.matter_name, m.matter_name_arabic FROM deadlines d LEFT JOIN matters m ON d.matter_id = m.matter_id WHERE (d.client_id = ? OR m.client_id = ?) ORDER BY d.deadline_date DESC`, [client360Id, client360Id]);
      const allTimesheets = database.query(`SELECT t.*, m.matter_name, m.matter_name_arabic, l.name as lawyer_name FROM timesheets t LEFT JOIN matters m ON t.matter_id = m.matter_id LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id WHERE m.client_id = ? ORDER BY t.date DESC`, [client360Id]);
      const allExpenses = database.query(`SELECT e.*, m.matter_name, m.matter_name_arabic, ec.name_en as category_name FROM expenses e LEFT JOIN matters m ON e.matter_id = m.matter_id LEFT JOIN lookup_expense_categories ec ON e.category_id = ec.category_id WHERE e.client_id = ? OR m.client_id = ? ORDER BY e.date DESC`, [client360Id, client360Id]);
      const allInvoices = database.query(`SELECT i.*, m.matter_name FROM invoices i LEFT JOIN matters m ON i.matter_id = m.matter_id WHERE i.client_id = ? ORDER BY i.issue_date DESC`, [client360Id]);
      const retainerData = database.query(`SELECT * FROM advances WHERE client_id = ? AND advance_type IN ('client_retainer', 'expense_advance') ORDER BY date_received DESC`, [client360Id]);

      const totalInvoiced = allInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = allInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const outstanding = allInvoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const retainerBalance = retainerData.reduce((sum, r) => sum + (parseFloat(r.balance_remaining) || 0), 0);
      const unbilledTimesheets = allTimesheets.filter(ts => ts.status !== 'billed' && ts.billable === 1);
      const unbilledMinutes = unbilledTimesheets.reduce((sum, ts) => sum + (ts.minutes || 0), 0);
      const unbilledValue = unbilledTimesheets.reduce((sum, ts) => sum + ((ts.minutes / 60) * (ts.rate_per_hour || 0)), 0);

      return { client: client360, matters: allMatters, hearings: allHearings, judgments: allJudgments,
        deadlines: allDeadlines, timesheets: allTimesheets, expenses: allExpenses, invoices: allInvoices, advances: retainerData,
        financial: { totalInvoiced, totalPaid, outstanding, retainerBalance, unbilledMinutes, unbilledValue: Math.round(unbilledValue * 100) / 100 },
        summary: { totalMatters: allMatters.length, activeMatters: allMatters.filter(m => ['active', 'engaged'].includes(m.status)).length,
          totalHearings: allHearings.length, totalJudgments: allJudgments.length, totalDeadlines: allDeadlines.length,
          pendingDeadlines: allDeadlines.filter(d => d.status === 'pending').length,
          totalTimesheets: allTimesheets.length, totalExpenses: allExpenses.length, totalInvoices: allInvoices.length },
        generatedAt: new Date().toISOString() };
    }

    default:
      return [];
  }
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerReportsHandlers({ database, logger, getMainWindow, XLSX }) {

  // ==================== DATA HANDLERS (also available via REST) ====================

  ipcMain.handle('get-dashboard-stats', logger.wrapHandler('get-dashboard-stats', () => {
    return getDashboardStats(database);
  }));

  ipcMain.handle('get-pending-invoices', logger.wrapHandler('get-pending-invoices', () => {
    return getPendingInvoices(database);
  }));

  ipcMain.handle('generate-report', logger.wrapHandler('generate-report', (event, reportType, filters) => {
    return generateReport(database, reportType, filters);
  }));

  // ==================== ELECTRON-ONLY HANDLERS (dialog, BrowserWindow, fs) ====================

  ipcMain.handle('export-to-excel', logger.wrapHandler('export-to-excel', async (event, reportData, reportName) => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Excel File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    const colWidths = Object.keys(reportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...reportData.map(row => String(row[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, reportName.substring(0, 31));
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  }));

  ipcMain.handle('export-to-csv', logger.wrapHandler('export-to-csv', async (event, reportData, reportName) => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save CSV File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.csv`),
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, filePath, { bookType: 'csv' });
    return { success: true, filePath };
  }));

  ipcMain.handle('export-to-pdf', logger.wrapHandler('export-to-pdf', async (event, reportData, reportName, columns) => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF File',
      defaultPath: path.join(app.getPath('documents'), `${reportName}-${new Date().toISOString().split('T')[0]}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const firmSettings = database.query("SELECT * FROM settings WHERE setting_key LIKE 'firm_%'");
    const firmInfo = {};
    firmSettings.forEach(s => { firmInfo[s.setting_key] = s.setting_value; });

    const pdfWindow = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    const headers = columns || Object.keys(reportData[0] || {});
    const tableHeaders = headers.map(h => `<th style="border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left;">${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('');
    const tableRows = reportData.map(row =>
      `<tr>${headers.map(h => `<td style="border:1px solid #ddd;padding:8px;">${row[h] !== null && row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:40px;font-size:12px;}
      .header{text-align:center;margin-bottom:30px;}.firm-name{font-size:18px;font-weight:bold;}
      .report-title{font-size:16px;color:#333;margin-top:10px;}.report-date{font-size:10px;color:#666;margin-top:5px;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}
      th{background:#f4f4f4;}tr:nth-child(even){background:#fafafa;}
      .footer{margin-top:30px;text-align:center;font-size:10px;color:#666;}.summary{margin-top:20px;text-align:right;font-weight:bold;}
    </style></head><body>
      <div class="header"><div class="firm-name">${firmInfo.firm_name || 'Qanuni Legal ERP'}</div>
        <div class="report-title">${reportName}</div>
        <div class="report-date">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div></div>
      <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
      <div class="summary">Total Records: ${reportData.length}</div>
      <div class="footer">Generated by Qanuni Legal ERP</div>
    </body></html>`;

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ marginsType: 0, printBackground: true, landscape: headers.length > 5 });
    fs.writeFileSync(filePath, pdfData);
    pdfWindow.close();
    return { success: true, filePath };
  }));

  // ==================== CLIENT STATEMENT EXPORTS (Electron-only) ====================

  ipcMain.handle('export-client-statement-pdf', logger.wrapHandler('export-client-statement-pdf', async (event, statementData, firmInfo) => {
    const { client, invoices, payments, summary, period } = statementData;
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Client Statement',
      defaultPath: path.join(app.getPath('documents'), `Statement-${client.client_name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const pdfWindow = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false } });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
    const formatCurrency = (a, c = 'USD') => `${c} ${(parseFloat(a) || 0).toFixed(2)}`;

    const invoiceRows = invoices.map(inv => `<tr><td>${formatDate(inv.issue_date)}</td><td>${inv.invoice_number}</td><td>${inv.matter_name || '-'}</td><td class="amount">${formatCurrency(inv.total, inv.currency)}</td><td><span class="status status-${inv.status}">${inv.status}</span></td></tr>`).join('');
    const paymentRows = payments.map(p => `<tr><td>${formatDate(p.date_received)}</td><td>${p.reference_number || '-'}</td><td>${p.payment_type_label}</td><td>${p.matter_name || 'General'}</td><td class="amount">${formatCurrency(p.amount, p.currency || 'USD')}</td></tr>`).join('');

    // Using compact but complete HTML template
    const html = buildStatementHtml(firmInfo, client, period, summary, invoiceRows, paymentRows, invoices, payments, formatDate, formatCurrency);
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    fs.writeFileSync(filePath, pdfData);
    pdfWindow.close();
    return { success: true, filePath };
  }));

  ipcMain.handle('export-client-statement-excel', logger.wrapHandler('export-client-statement-excel', async (event, statementData) => {
    const { client, invoices, payments, summary, period } = statementData;
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Client Statement',
      defaultPath: path.join(app.getPath('documents'), `Statement-${client.client_name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    const summaryData = [['CLIENT STATEMENT'], [''], ['Client:', client.client_name], ['Period:', `${period.dateFrom} to ${period.dateTo}`],
      ['Generated:', new Date().toISOString()], [''], ['SUMMARY'], ['Opening Balance:', summary.openingBalance],
      ['Total Invoiced:', summary.totalInvoiced], ['Payments Received:', summary.totalPayments],
      ['Outstanding:', summary.outstanding], ['Closing Balance:', summary.closingBalance]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
    if (invoices.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices.map(inv => ({
      'Date': inv.issue_date, 'Invoice #': inv.invoice_number, 'Matter': inv.matter_name || '-',
      'Amount': parseFloat(inv.total) || 0, 'Currency': inv.currency, 'Status': inv.status, 'Due Date': inv.due_date || '-' }))), 'Invoices');
    if (payments.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments.map(p => ({
      'Date': p.date_received, 'Reference': p.reference_number || '-', 'Type': p.payment_type_label,
      'Matter': p.matter_name || 'General', 'Amount': parseFloat(p.amount) || 0, 'Currency': p.currency || 'USD' }))), 'Payments');
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  }));

  // ==================== CASE STATUS EXPORTS (Electron-only) ====================

  ipcMain.handle('export-case-status-pdf', logger.wrapHandler('export-case-status-pdf', async (event, reportData, firmInfo) => {
    const { client, matters, hearings, judgments, deadlines, summary } = reportData;
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Case Status Report',
      defaultPath: path.join(app.getPath('documents'), `CaseStatus-${client.client_name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const pdfWindow = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false } });
    const html = buildCaseStatusHtml(firmInfo, client, matters, hearings, judgments, deadlines, summary);
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    fs.writeFileSync(filePath, pdfData);
    pdfWindow.close();
    return { success: true, filePath };
  }));

  ipcMain.handle('export-case-status-excel', logger.wrapHandler('export-case-status-excel', async (event, reportData) => {
    const { client, matters, hearings, judgments, deadlines } = reportData;
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Case Status Report',
      defaultPath: path.join(app.getPath('documents'), `CaseStatus-${client.client_name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    if (matters.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matters.map(m => ({
      Matter: m.matter_name, 'Case Number': m.case_number || '-', Status: m.status, Lawyer: m.lawyer_name || '-' }))), 'Matters');
    if (hearings.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hearings.map(h => ({
      Date: h.hearing_date, Matter: h.matter_name, Purpose: h.purpose_name || '-', Court: h.court_name || '-' }))), 'Hearings');
    if (judgments.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(judgments.map(j => ({
      Date: j.expected_date, Matter: j.matter_name, Outcome: j.outcome || '-', Status: j.status }))), 'Judgments');
    if (deadlines.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deadlines.map(d => ({
      Date: d.deadline_date, Title: d.title, Matter: d.matter_name || '-', Status: d.status }))), 'Deadlines');
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  }));

  // ==================== CLIENT 360 EXPORTS (Electron-only) ====================

  ipcMain.handle('export-client-360-excel', logger.wrapHandler('export-client-360-excel', async (event, reportData) => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Client 360 Report',
      defaultPath: path.join(app.getPath('documents'), `Client360-${(reportData.client?.client_name || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    // Summary sheet
    const summaryData = [['CLIENT 360 REPORT'], [''], ['Client:', reportData.client?.client_name], ['Generated:', new Date().toISOString()], [''],
      ['FINANCIAL SUMMARY'], ['Total Invoiced:', reportData.financial?.totalInvoiced],
      ['Total Paid:', reportData.financial?.totalPaid], ['Outstanding:', reportData.financial?.outstanding],
      ['Retainer Balance:', reportData.financial?.retainerBalance], ['Unbilled Value:', reportData.financial?.unbilledValue]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
    if (reportData.matters?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.matters.map(m => ({ Matter: m.matter_name, Status: m.status, Lawyer: m.lawyer_name || '-' }))), 'Matters');
    if (reportData.invoices?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.invoices.map(i => ({ Invoice: i.invoice_number, Date: i.issue_date, Amount: parseFloat(i.total) || 0, Status: i.status }))), 'Invoices');
    if (reportData.timesheets?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.timesheets.map(t => ({ Date: t.date, Lawyer: t.lawyer_name || '-', Minutes: t.minutes, Matter: t.matter_name || '-' }))), 'Timesheets');
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  }));

  ipcMain.handle('export-client-360-pdf', logger.wrapHandler('export-client-360-pdf', async (event, reportData, firmInfo) => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Client 360 Report',
      defaultPath: path.join(app.getPath('documents'), `Client360-${(reportData.client?.client_name || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const pdfWindow = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false } });
    const html = buildClient360Html(firmInfo, reportData);
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    fs.writeFileSync(filePath, pdfData);
    pdfWindow.close();
    return { success: true, filePath };
  }));

};

// ============================================================================
// EXPORTS FOR REST API (data-only functions)
// ============================================================================

module.exports.getDashboardStats = getDashboardStats;
module.exports.getPendingInvoices = getPendingInvoices;
module.exports.generateReport = generateReport;

// ==================== HTML TEMPLATE BUILDERS ====================
// These are extracted to keep handler code readable.
// Templates match the original v46.56 layouts exactly.

function buildStatementHtml(firmInfo, client, period, summary, invoiceRows, paymentRows, invoices, payments, formatDate, formatCurrency) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#333;padding:40px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #1e40af;}
    .firm-info{text-align:left;}.firm-name{font-size:20px;font-weight:bold;color:#1e40af;margin-bottom:5px;}
    .firm-name-ar{font-size:16px;color:#1e40af;direction:rtl;margin-bottom:8px;}.firm-details{font-size:10px;color:#666;line-height:1.5;}
    .statement-title{text-align:center;margin:20px 0;}.statement-title h1{font-size:18px;color:#1e40af;margin-bottom:5px;}
    .statement-period{font-size:11px;color:#666;}
    .client-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:15px;margin-bottom:20px;}
    .client-section h3{font-size:12px;color:#64748b;margin-bottom:8px;text-transform:uppercase;}
    .client-name{font-size:14px;font-weight:bold;color:#1e293b;}.client-details{font-size:10px;color:#64748b;margin-top:5px;}
    .summary-box{display:flex;justify-content:space-between;margin-bottom:25px;}
    .summary-item{text-align:center;padding:12px 20px;background:#f8fafc;border-radius:6px;flex:1;margin:0 5px;}
    .summary-label{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px;}
    .summary-value{font-size:14px;font-weight:bold;}.summary-value.positive{color:#16a34a;}.summary-value.negative{color:#dc2626;}.summary-value.neutral{color:#1e40af;}
    .section{margin-bottom:25px;}.section-title{font-size:12px;font-weight:bold;color:#1e40af;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}
    table{width:100%;border-collapse:collapse;font-size:10px;}th{background:#f1f5f9;color:#475569;font-weight:600;text-align:left;padding:8px 10px;border-bottom:2px solid #e2e8f0;}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;}.amount{text-align:right;font-family:'Consolas',monospace;}
    .status{padding:2px 8px;border-radius:10px;font-size:9px;font-weight:500;}
    .status-paid{background:#dcfce7;color:#166534;}.status-sent,.status-viewed{background:#dbeafe;color:#1e40af;}
    .status-overdue{background:#fee2e2;color:#dc2626;}.status-partial{background:#fef3c7;color:#b45309;}.status-draft{background:#f1f5f9;color:#64748b;}
    .balance-due{background:#1e40af;color:white;padding:15px 20px;border-radius:6px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;}
    .balance-due-label{font-size:14px;}.balance-due-amount{font-size:20px;font-weight:bold;}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;}
    .empty-state{text-align:center;padding:20px;color:#94a3b8;font-style:italic;}
    @media print{body{padding:20px;}.balance-due{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head><body>
    <div class="header"><div class="firm-info"><div class="firm-name">${firmInfo.firm_name || 'Law Firm'}</div>
      ${firmInfo.firm_name_arabic ? `<div class="firm-name-ar">${firmInfo.firm_name_arabic}</div>` : ''}
      <div class="firm-details">${firmInfo.firm_address || ''}<br>${firmInfo.firm_phone ? `Tel: ${firmInfo.firm_phone}` : ''} ${firmInfo.firm_email ? `| ${firmInfo.firm_email}` : ''}<br>${firmInfo.firm_vat_number ? `VAT: ${firmInfo.firm_vat_number}` : ''}</div></div></div>
    <div class="statement-title"><h1>STATEMENT OF ACCOUNT</h1><div class="statement-period">Period: ${formatDate(period.dateFrom)} to ${formatDate(period.dateTo)}</div></div>
    <div class="client-section"><h3>Bill To</h3><div class="client-name">${client.client_name}${client.client_name_ar ? ` / ${client.client_name_ar}` : ''}</div>
      <div class="client-details">${client.address || ''}${client.address ? '<br>' : ''}${client.email || ''}${client.phone ? ` | ${client.phone}` : ''}</div></div>
    <div class="summary-box">
      <div class="summary-item"><div class="summary-label">Opening Balance</div><div class="summary-value neutral">${formatCurrency(summary.openingBalance)}</div></div>
      <div class="summary-item"><div class="summary-label">Total Invoiced</div><div class="summary-value neutral">${formatCurrency(summary.totalInvoiced)}</div></div>
      <div class="summary-item"><div class="summary-label">Payments Received</div><div class="summary-value positive">${formatCurrency(summary.totalPayments)}</div></div>
      <div class="summary-item"><div class="summary-label">Outstanding</div><div class="summary-value negative">${formatCurrency(summary.outstanding)}</div></div></div>
    <div class="section"><div class="section-title">Invoices</div>${invoices.length > 0 ? `<table><thead><tr><th>Date</th><th>Invoice #</th><th>Matter</th><th class="amount">Amount</th><th>Status</th></tr></thead><tbody>${invoiceRows}</tbody></table>` : '<div class="empty-state">No invoices in this period</div>'}</div>
    <div class="section"><div class="section-title">Payments Received</div>${payments.length > 0 ? `<table><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Matter</th><th class="amount">Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>` : '<div class="empty-state">No payments received in this period</div>'}</div>
    <div class="balance-due"><div class="balance-due-label">Balance Due</div><div class="balance-due-amount">${formatCurrency(summary.closingBalance)}</div></div>
    <div class="footer">Statement generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}<br>Thank you for your business</div>
  </body></html>`;
}

function buildCaseStatusHtml(firmInfo, client, matters, hearings, judgments, deadlines, summary) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
  const matterRows = matters.map(m => `<tr><td><strong>${m.matter_name}</strong>${m.matter_name_arabic ? `<br><span style="direction:rtl;font-size:9px;color:#64748b;">${m.matter_name_arabic}</span>` : ''}</td><td>${m.case_number || '-'}</td><td><span class="status status-${m.status}">${m.status}</span></td><td>${m.lawyer_name || '-'}</td></tr>`).join('');
  const hearingRows = hearings.map(h => `<tr><td><strong>${formatDate(h.hearing_date)}</strong></td><td>${h.matter_name}</td><td>${h.purpose_name || h.purpose_custom || '-'}</td><td>${h.court_name || '-'}</td><td>${h.hearing_time || '-'}</td></tr>`).join('');
  const judgmentRows = judgments.map(j => `<tr><td>${formatDate(j.expected_date)}</td><td>${j.matter_name}</td><td>${j.outcome || '-'}</td><td>${j.status}</td></tr>`).join('');
  const deadlineRows = deadlines.map(d => { const dr = Math.ceil((new Date(d.deadline_date) - new Date()) / 86400000); return `<tr${dr <= 7 ? ' style="background:#fef2f2;"' : ''}><td><strong>${formatDate(d.deadline_date)}</strong></td><td>${d.title}</td><td>${d.matter_name || '-'}</td><td>${dr} days</td></tr>`; }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#333;padding:40px;}
    .header{display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #1e40af;}
    .firm-name{font-size:20px;font-weight:bold;color:#1e40af;margin-bottom:5px;}.firm-details{font-size:10px;color:#666;line-height:1.5;}
    .report-title{text-align:center;margin:20px 0;}.report-title h1{font-size:18px;color:#1e40af;}
    .client-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:15px;margin-bottom:20px;}
    .client-name{font-size:14px;font-weight:bold;color:#1e293b;}
    .summary-box{display:flex;justify-content:space-between;margin-bottom:25px;}
    .summary-item{text-align:center;padding:12px 15px;background:#f8fafc;border-radius:6px;flex:1;margin:0 5px;}
    .summary-label{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px;}.summary-value{font-size:16px;font-weight:bold;color:#1e40af;}
    .section{margin-bottom:25px;}.section-title{font-size:12px;font-weight:bold;color:#1e40af;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}
    table{width:100%;border-collapse:collapse;font-size:10px;}th{background:#f1f5f9;color:#475569;font-weight:600;text-align:left;padding:8px 10px;border-bottom:2px solid #e2e8f0;}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;}
    .status{padding:2px 8px;border-radius:10px;font-size:9px;font-weight:500;}
    .status-active{background:#dcfce7;color:#166534;}.status-engaged{background:#dbeafe;color:#1e40af;}.status-on_hold{background:#fef3c7;color:#b45309;}
    .empty-state{text-align:center;padding:15px;color:#94a3b8;font-style:italic;background:#f8fafc;border-radius:4px;}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;}
    @media print{body{padding:20px;}}
  </style></head><body>
    <div class="header"><div><div class="firm-name">${firmInfo.firm_name || 'Law Firm'}</div>${firmInfo.firm_name_arabic ? `<div style="font-size:16px;color:#1e40af;direction:rtl;">${firmInfo.firm_name_arabic}</div>` : ''}<div class="firm-details">${firmInfo.firm_address || ''}<br>${firmInfo.firm_phone ? `Tel: ${firmInfo.firm_phone}` : ''} ${firmInfo.firm_email ? `| ${firmInfo.firm_email}` : ''}</div></div></div>
    <div class="report-title"><h1>CASE STATUS REPORT</h1><div style="font-size:11px;color:#666;">Generated: ${formatDate(new Date().toISOString())}</div></div>
    <div class="client-section"><h3 style="font-size:12px;color:#64748b;margin-bottom:8px;text-transform:uppercase;">Prepared For</h3><div class="client-name">${client.client_name}</div></div>
    <div class="summary-box"><div class="summary-item"><div class="summary-label">Active Matters</div><div class="summary-value">${summary.totalMatters}</div></div><div class="summary-item"><div class="summary-label">Upcoming Hearings</div><div class="summary-value">${summary.upcomingHearingsCount}</div></div><div class="summary-item"><div class="summary-label">Recent Judgments</div><div class="summary-value">${summary.recentJudgmentsCount}</div></div><div class="summary-item"><div class="summary-label">Pending Deadlines</div><div class="summary-value">${summary.upcomingDeadlinesCount}</div></div></div>
    <div class="section"><div class="section-title">Active Matters</div>${matters.length ? `<table><thead><tr><th>Matter</th><th>Case Number</th><th>Status</th><th>Lawyer</th></tr></thead><tbody>${matterRows}</tbody></table>` : '<div class="empty-state">No active matters</div>'}</div>
    <div class="section"><div class="section-title">Upcoming Hearings (Next 90 Days)</div>${hearings.length ? `<table><thead><tr><th>Date</th><th>Matter</th><th>Purpose</th><th>Court</th><th>Time</th></tr></thead><tbody>${hearingRows}</tbody></table>` : '<div class="empty-state">No upcoming hearings</div>'}</div>
    <div class="section"><div class="section-title">Recent Judgments</div>${judgments.length ? `<table><thead><tr><th>Date</th><th>Matter</th><th>Outcome</th><th>Status</th></tr></thead><tbody>${judgmentRows}</tbody></table>` : '<div class="empty-state">No recent judgments</div>'}</div>
    <div class="section"><div class="section-title">Pending Deadlines</div>${deadlines.length ? `<table><thead><tr><th>Date</th><th>Title</th><th>Matter</th><th>Days Left</th></tr></thead><tbody>${deadlineRows}</tbody></table>` : '<div class="empty-state">No pending deadlines</div>'}</div>
    <div class="footer">Generated by Qanuni Legal ERP on ${new Date().toLocaleDateString('en-GB')}</div>
  </body></html>`;
}

function buildClient360Html(firmInfo, reportData) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
  const formatCurrency = (a) => `$${(parseFloat(a) || 0).toFixed(2)}`;
  const client = reportData.client || {};
  const fin = reportData.financial || {};
  const sum = reportData.summary || {};

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#333;padding:40px;}
    .header{display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #1e40af;}
    .firm-name{font-size:20px;font-weight:bold;color:#1e40af;margin-bottom:5px;}.firm-details{font-size:10px;color:#666;line-height:1.5;}
    h1{font-size:18px;color:#1e40af;text-align:center;margin:20px 0;}
    .client-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:15px;margin-bottom:20px;}
    .client-name{font-size:14px;font-weight:bold;color:#1e293b;}
    .summary-box{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:25px;}
    .summary-item{text-align:center;padding:10px;background:#f8fafc;border-radius:6px;flex:1;min-width:80px;}
    .summary-label{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px;}.summary-value{font-size:14px;font-weight:bold;color:#1e40af;}
    .section{margin-bottom:20px;}.section-title{font-size:12px;font-weight:bold;color:#1e40af;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:15px;}
    th{background:#f1f5f9;color:#475569;font-weight:600;text-align:left;padding:6px 8px;border-bottom:2px solid #e2e8f0;}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9;}
    .footer{margin-top:30px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;}
    @media print{body{padding:20px;}}
  </style></head><body>
    <div class="header"><div><div class="firm-name">${firmInfo.firm_name || 'Law Firm'}</div><div class="firm-details">${firmInfo.firm_address || ''}</div></div></div>
    <h1>CLIENT 360\u00B0 REPORT</h1>
    <div class="client-section"><div class="client-name">${client.client_name || 'Unknown'}</div></div>
    <div class="summary-box">
      <div class="summary-item"><div class="summary-label">Matters</div><div class="summary-value">${sum.totalMatters || 0}</div></div>
      <div class="summary-item"><div class="summary-label">Total Invoiced</div><div class="summary-value">${formatCurrency(fin.totalInvoiced)}</div></div>
      <div class="summary-item"><div class="summary-label">Outstanding</div><div class="summary-value" style="color:#dc2626;">${formatCurrency(fin.outstanding)}</div></div>
      <div class="summary-item"><div class="summary-label">Retainer</div><div class="summary-value" style="color:#16a34a;">${formatCurrency(fin.retainerBalance)}</div></div></div>
    <div class="section"><div class="section-title">Matters (${sum.totalMatters || 0})</div>
      <table><thead><tr><th>Matter</th><th>Status</th><th>Lawyer</th></tr></thead><tbody>${(reportData.matters || []).slice(0, 20).map(m => `<tr><td>${m.matter_name}</td><td>${m.status}</td><td>${m.lawyer_name || '-'}</td></tr>`).join('')}</tbody></table></div>
    <div class="section"><div class="section-title">Recent Invoices (${sum.totalInvoices || 0})</div>
      <table><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${(reportData.invoices || []).slice(0, 10).map(i => `<tr><td>${i.invoice_number}</td><td>${formatDate(i.issue_date)}</td><td>${formatCurrency(i.total)}</td><td>${i.status}</td></tr>`).join('')}</tbody></table></div>
    <div class="footer">Generated by Qanuni Legal ERP on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}</div>
  </body></html>`;
}
