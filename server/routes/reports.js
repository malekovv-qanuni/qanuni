/**
 * Reports API Routes - SaaS (SQL Server)
 *
 * 12 endpoints: dashboard stats, pending invoices, generate-report,
 * aging, financial-summary, timesheet, expense, lawyer-productivity,
 * matter-stats, client, revenue, matter financials
 *
 * Query-only module — no new tables needed.
 * Export handlers (PDF/Excel/CSV) are Electron-only — not exposed via REST.
 *
 * @version 2.0.0 (SaaS rewrite from scratch)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// DASHBOARD STATS
// ============================================================================

router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const firmId = req.user.firm_id;
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = today.substring(0, 7) + '-01';

    const [
      activeMatters,
      totalClients,
      pendingTasks,
      draftInvoices,
      upcomingHearings,
      overdueTasks,
      outstandingInvoices,
      pendingJudgments,
      retainerRevenue,
      invoiceRevenue
    ] = await Promise.all([
      db.getOne('SELECT COUNT(*) as count FROM matters WHERE firm_id = @firm_id AND matter_status = \'active\' AND is_deleted = 0', { firm_id: firmId }),
      db.getOne('SELECT COUNT(*) as count FROM clients WHERE firm_id = @firm_id AND is_active = 1 AND is_deleted = 0', { firm_id: firmId }),
      db.getOne('SELECT COUNT(*) as count FROM tasks WHERE firm_id = @firm_id AND status IN (\'assigned\', \'in_progress\') AND is_deleted = 0', { firm_id: firmId }),
      db.getOne('SELECT COUNT(*) as count FROM invoices WHERE firm_id = @firm_id AND status = \'draft\' AND is_deleted = 0', { firm_id: firmId }),
      db.getOne(`SELECT COUNT(*) as count FROM hearings
        WHERE firm_id = @firm_id AND hearing_date >= @today AND is_deleted = 0`, { firm_id: firmId, today }),
      db.getOne('SELECT COUNT(*) as count FROM tasks WHERE firm_id = @firm_id AND status NOT IN (\'done\', \'cancelled\') AND due_date < @today AND is_deleted = 0', { firm_id: firmId, today }),
      db.getOne('SELECT COALESCE(SUM(total), 0) as amount FROM invoices WHERE firm_id = @firm_id AND status NOT IN (\'paid\', \'cancelled\', \'written_off\') AND is_deleted = 0', { firm_id: firmId }),
      db.getOne('SELECT COUNT(*) as count FROM judgments WHERE firm_id = @firm_id AND status = \'pending\' AND is_deleted = 0', { firm_id: firmId }),
      db.getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM advances
        WHERE firm_id = @firm_id AND date_received >= @firstDay AND status IN ('active', 'depleted')
        AND advance_type IN ('client_retainer', 'fee_payment_initial', 'fee_payment_interim', 'fee_payment_final')
        AND is_deleted = 0`, { firm_id: firmId, firstDay: firstDayOfMonth }),
      db.getOne(`SELECT COALESCE(SUM(total), 0) as total FROM invoices
        WHERE firm_id = @firm_id AND status = 'paid' AND paid_date >= @firstDay AND is_deleted = 0`, { firm_id: firmId, firstDay: firstDayOfMonth })
    ]);

    res.json({
      activeMatters: activeMatters?.count || 0,
      totalClients: totalClients?.count || 0,
      pendingTasks: pendingTasks?.count || 0,
      draftInvoices: draftInvoices?.count || 0,
      upcomingHearings: upcomingHearings?.count || 0,
      overdueTasks: overdueTasks?.count || 0,
      outstandingInvoices: outstandingInvoices?.amount || 0,
      pendingJudgments: pendingJudgments?.count || 0,
      thisMonthRevenue: (retainerRevenue?.total || 0) + (invoiceRevenue?.total || 0)
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PENDING INVOICES
// ============================================================================

router.get('/pending-invoices', async (req, res, next) => {
  try {
    const firmId = req.user.firm_id;
    const today = new Date().toISOString().split('T')[0];

    const invoices = await db.getAll(`
      SELECT i.invoice_id, i.invoice_number, i.client_id, i.total, i.currency, i.status,
        i.issue_date, i.due_date, c.client_name,
        CASE
          WHEN i.due_date < @today THEN 'overdue'
          WHEN i.due_date <= DATEADD(day, 7, CAST(@today AS DATE)) THEN 'due_soon'
          ELSE 'pending'
        END as urgency,
        DATEDIFF(day, i.due_date, CAST(@today AS DATE)) as days_overdue
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.client_id AND c.firm_id = @firm_id
      WHERE i.firm_id = @firm_id
        AND i.status IN ('sent', 'viewed', 'partial', 'overdue')
        AND i.is_deleted = 0
      ORDER BY i.due_date ASC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`, { firm_id: firmId, today });

    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GENERATE REPORT (generic POST endpoint)
// ============================================================================

router.post('/generate', async (req, res, next) => {
  try {
    const firmId = req.user.firm_id;
    const { reportType, ...filters } = req.body;

    if (!reportType) {
      return res.status(400).json({ success: false, error: 'reportType is required' });
    }

    const result = await generateReportSaaS(firmId, reportType, filters);
    if (result?.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INDIVIDUAL REPORT GET ENDPOINTS (frontend convenience)
// ============================================================================

router.get('/aging', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'invoice-aging', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/financial-summary', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'revenue-by-client', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/timesheet', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'time-by-lawyer', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/expense', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'expenses-by-category', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/lawyer-productivity', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'time-by-lawyer', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/matter-stats', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'active-matters', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/client', async (req, res, next) => {
  try {
    const reportType = req.query.clientId ? 'client-statement' : 'revenue-by-client';
    const result = await generateReportSaaS(req.user.firm_id, reportType, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/revenue', async (req, res, next) => {
  try {
    const result = await generateReportSaaS(req.user.firm_id, 'revenue-by-client', req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REPORT GENERATION ENGINE (SQL Server)
// ============================================================================

async function generateReportSaaS(firmId, reportType, filters) {
  if (!filters) filters = {};
  const dateFrom = filters.dateFrom || '2000-01-01';
  const dateTo = filters.dateTo || '2099-12-31';

  switch (reportType) {
    // ------------------------------------------------------------------
    // OUTSTANDING RECEIVABLES
    // ------------------------------------------------------------------
    case 'outstanding-receivables': {
      return await db.getAll(`
        SELECT i.*, c.client_name,
          DATEDIFF(day, i.due_date, GETUTCDATE()) as days_overdue
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.client_id AND c.firm_id = @firm_id
        WHERE i.firm_id = @firm_id
          AND i.status IN ('sent', 'viewed', 'partial', 'overdue')
          AND i.is_deleted = 0
        ORDER BY i.due_date ASC`, { firm_id: firmId });
    }

    // ------------------------------------------------------------------
    // REVENUE BY CLIENT
    // ------------------------------------------------------------------
    case 'revenue-by-client': {
      return await db.getAll(`
        SELECT c.client_id, c.client_name,
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue,
          COALESCE(adv.fee_payment_revenue, 0) as fee_payment_revenue,
          COALESCE(inv.invoice_revenue, 0) + COALESCE(adv.retainer_revenue, 0) + COALESCE(adv.fee_payment_revenue, 0) as total_revenue,
          COALESCE(inv.invoice_count, 0) as invoice_count
        FROM clients c
        LEFT JOIN (
          SELECT client_id, SUM(total) as invoice_revenue, COUNT(*) as invoice_count
          FROM invoices
          WHERE firm_id = @firm_id AND status = 'paid' AND is_deleted = 0
            AND paid_date IS NOT NULL AND paid_date >= @dateFrom AND paid_date <= @dateTo
          GROUP BY client_id
        ) inv ON c.client_id = inv.client_id
        LEFT JOIN (
          SELECT client_id,
            SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue,
            SUM(CASE WHEN advance_type IN ('fee_payment_initial', 'fee_payment_interim', 'fee_payment_final') THEN amount ELSE 0 END) as fee_payment_revenue
          FROM advances
          WHERE firm_id = @firm_id AND status IN ('active', 'depleted') AND is_deleted = 0
            AND date_received >= @dateFrom AND date_received <= @dateTo
          GROUP BY client_id
        ) adv ON c.client_id = adv.client_id
        WHERE c.firm_id = @firm_id AND c.is_active = 1 AND c.is_deleted = 0
        ORDER BY total_revenue DESC`, { firm_id: firmId, dateFrom, dateTo });
    }

    // ------------------------------------------------------------------
    // REVENUE BY MATTER
    // ------------------------------------------------------------------
    case 'revenue-by-matter': {
      return await db.getAll(`
        SELECT m.matter_id, m.matter_name,
          mc_top.client_name,
          COALESCE(inv.invoice_revenue, 0) as invoice_revenue,
          COALESCE(adv.retainer_revenue, 0) as retainer_revenue,
          COALESCE(adv.fee_payment_revenue, 0) as fee_payment_revenue,
          COALESCE(inv.invoice_revenue, 0) + COALESCE(adv.retainer_revenue, 0) + COALESCE(adv.fee_payment_revenue, 0) as total_revenue
        FROM matters m
        LEFT JOIN (
          SELECT mc2.matter_id, c2.client_name,
            ROW_NUMBER() OVER (PARTITION BY mc2.matter_id ORDER BY mc2.matter_client_id) as rn
          FROM matter_clients mc2
          JOIN clients c2 ON mc2.client_id = c2.client_id
        ) mc_top ON mc_top.matter_id = m.matter_id AND mc_top.rn = 1
        LEFT JOIN (
          SELECT matter_id, SUM(total) as invoice_revenue
          FROM invoices
          WHERE firm_id = @firm_id AND status = 'paid' AND is_deleted = 0
            AND paid_date IS NOT NULL AND paid_date >= @dateFrom AND paid_date <= @dateTo
          GROUP BY matter_id
        ) inv ON m.matter_id = inv.matter_id
        LEFT JOIN (
          SELECT matter_id,
            SUM(CASE WHEN advance_type = 'client_retainer' THEN amount ELSE 0 END) as retainer_revenue,
            SUM(CASE WHEN advance_type IN ('fee_payment_initial', 'fee_payment_interim', 'fee_payment_final') THEN amount ELSE 0 END) as fee_payment_revenue
          FROM advances
          WHERE firm_id = @firm_id AND status IN ('active', 'depleted') AND is_deleted = 0
            AND date_received >= @dateFrom AND date_received <= @dateTo
          GROUP BY matter_id
        ) adv ON m.matter_id = adv.matter_id
        WHERE m.firm_id = @firm_id AND m.is_deleted = 0
        ORDER BY total_revenue DESC`, { firm_id: firmId, dateFrom, dateTo });
    }

    // ------------------------------------------------------------------
    // TIME BY LAWYER
    // ------------------------------------------------------------------
    case 'time-by-lawyer': {
      return await db.getAll(`
        SELECT l.lawyer_id, l.full_name as lawyer_name,
          SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes,
          SUM(CASE WHEN t.billable = 0 THEN t.minutes ELSE 0 END) as non_billable_minutes,
          SUM(t.minutes) as total_minutes
        FROM lawyers l
        LEFT JOIN timesheets t ON l.lawyer_id = t.lawyer_id
          AND t.entry_date >= @dateFrom AND t.entry_date <= @dateTo
          AND t.is_deleted = 0
        WHERE l.firm_id = @firm_id AND l.is_deleted = 0
        GROUP BY l.lawyer_id, l.full_name
        ORDER BY billable_minutes DESC`, { firm_id: firmId, dateFrom, dateTo });
    }

    // ------------------------------------------------------------------
    // TIME BY CLIENT
    // ------------------------------------------------------------------
    case 'time-by-client': {
      return await db.getAll(`
        SELECT c.client_id, c.client_name,
          SUM(t.minutes) as total_minutes,
          SUM(CASE WHEN t.billable = 1 THEN t.minutes ELSE 0 END) as billable_minutes
        FROM clients c
        LEFT JOIN timesheets t ON c.client_id = t.client_id
          AND t.entry_date >= @dateFrom AND t.entry_date <= @dateTo
          AND t.is_deleted = 0
        WHERE c.firm_id = @firm_id AND c.is_deleted = 0
        GROUP BY c.client_id, c.client_name
        ORDER BY total_minutes DESC`, { firm_id: firmId, dateFrom, dateTo });
    }

    // ------------------------------------------------------------------
    // UNBILLED TIME
    // ------------------------------------------------------------------
    case 'unbilled-time': {
      return await db.getAll(`
        SELECT t.*, c.client_name, m.matter_name, l.full_name as lawyer_name
        FROM timesheets t
        LEFT JOIN clients c ON t.client_id = c.client_id
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
        WHERE t.firm_id = @firm_id AND t.status = 'draft' AND t.billable = 1 AND t.is_deleted = 0
        ORDER BY t.entry_date ASC`, { firm_id: firmId });
    }

    // ------------------------------------------------------------------
    // ACTIVE MATTERS
    // ------------------------------------------------------------------
    case 'active-matters': {
      return await db.getAll(`
        SELECT m.*,
          mc_top.client_name
        FROM matters m
        LEFT JOIN (
          SELECT mc2.matter_id, c2.client_name,
            ROW_NUMBER() OVER (PARTITION BY mc2.matter_id ORDER BY mc2.matter_client_id) as rn
          FROM matter_clients mc2
          JOIN clients c2 ON mc2.client_id = c2.client_id
        ) mc_top ON mc_top.matter_id = m.matter_id AND mc_top.rn = 1
        WHERE m.firm_id = @firm_id AND m.matter_status IN ('active', 'engaged') AND m.is_deleted = 0
        ORDER BY m.created_at DESC`, { firm_id: firmId });
    }

    // ------------------------------------------------------------------
    // UPCOMING HEARINGS
    // ------------------------------------------------------------------
    case 'upcoming-hearings': {
      const todayStr = new Date().toISOString().split('T')[0];
      return await db.getAll(`
        SELECT h.*, m.matter_name,
          mc_top.client_name
        FROM hearings h
        LEFT JOIN matters m ON h.matter_id = m.matter_id
        LEFT JOIN (
          SELECT mc2.matter_id, c2.client_name,
            ROW_NUMBER() OVER (PARTITION BY mc2.matter_id ORDER BY mc2.matter_client_id) as rn
          FROM matter_clients mc2
          JOIN clients c2 ON mc2.client_id = c2.client_id
        ) mc_top ON mc_top.matter_id = m.matter_id AND mc_top.rn = 1
        WHERE h.firm_id = @firm_id AND h.hearing_date >= @today AND h.is_deleted = 0
        ORDER BY h.hearing_date ASC
        OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, { firm_id: firmId, today: todayStr });
    }

    // ------------------------------------------------------------------
    // PENDING JUDGMENTS
    // ------------------------------------------------------------------
    case 'pending-judgments': {
      return await db.getAll(`
        SELECT j.*, m.matter_name,
          mc_top.client_name
        FROM judgments j
        LEFT JOIN matters m ON j.matter_id = m.matter_id
        LEFT JOIN (
          SELECT mc2.matter_id, c2.client_name,
            ROW_NUMBER() OVER (PARTITION BY mc2.matter_id ORDER BY mc2.matter_client_id) as rn
          FROM matter_clients mc2
          JOIN clients c2 ON mc2.client_id = c2.client_id
        ) mc_top ON mc_top.matter_id = m.matter_id AND mc_top.rn = 1
        WHERE j.firm_id = @firm_id AND j.status = 'pending' AND j.is_deleted = 0
        ORDER BY j.expected_date ASC`, { firm_id: firmId });
    }

    // ------------------------------------------------------------------
    // TASKS OVERDUE
    // ------------------------------------------------------------------
    case 'tasks-overdue': {
      const todayStr2 = new Date().toISOString().split('T')[0];
      return await db.getAll(`
        SELECT t.*, m.matter_name, c.client_name
        FROM tasks t
        LEFT JOIN matters m ON t.matter_id = m.matter_id
        LEFT JOIN clients c ON t.client_id = c.client_id
        WHERE t.firm_id = @firm_id AND t.status NOT IN ('done', 'cancelled')
          AND t.due_date < @today AND t.is_deleted = 0
        ORDER BY t.due_date ASC`, { firm_id: firmId, today: todayStr2 });
    }

    // ------------------------------------------------------------------
    // EXPENSES BY CATEGORY
    // ------------------------------------------------------------------
    case 'expenses-by-category': {
      return await db.getAll(`
        SELECT e.category as category_name,
          SUM(e.amount) as total_amount,
          COUNT(e.expense_id) as expense_count
        FROM expenses e
        WHERE e.firm_id = @firm_id
          AND e.date >= @dateFrom AND e.date <= @dateTo
          AND e.is_deleted = 0
        GROUP BY e.category
        ORDER BY total_amount DESC`, { firm_id: firmId, dateFrom, dateTo });
    }

    // ------------------------------------------------------------------
    // RETAINER BALANCES
    // ------------------------------------------------------------------
    case 'retainer-balances': {
      return await db.getAll(`
        SELECT a.*, c.client_name, m.matter_name
        FROM advances a
        LEFT JOIN clients c ON a.client_id = c.client_id
        LEFT JOIN matters m ON a.matter_id = m.matter_id
        WHERE a.firm_id = @firm_id AND a.advance_type = 'client_retainer'
          AND a.status = 'active' AND a.is_deleted = 0
        ORDER BY a.balance_remaining ASC`, { firm_id: firmId });
    }

    // ------------------------------------------------------------------
    // CLIENT STATEMENT
    // ------------------------------------------------------------------
    case 'client-statement': {
      const clientId = filters.clientId;
      if (!clientId) return { success: false, error: 'Client ID required' };

      const client = await db.getOne(
        'SELECT * FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id: clientId, firm_id: firmId }
      );
      if (!client) return { success: false, error: 'Client not found' };

      const [invoices, payments, openingBalanceResult] = await Promise.all([
        db.getAll(`
          SELECT i.*, m.matter_name FROM invoices i
          LEFT JOIN matters m ON i.matter_id = m.matter_id
          WHERE i.client_id = @client_id AND i.firm_id = @firm_id
            AND i.issue_date >= @dateFrom AND i.issue_date <= @dateTo
            AND i.is_deleted = 0
          ORDER BY i.issue_date ASC`, { client_id: clientId, firm_id: firmId, dateFrom, dateTo }),
        db.getAll(`
          SELECT a.*, m.matter_name,
            CASE
              WHEN a.advance_type = 'client_retainer' THEN 'Retainer Payment'
              WHEN a.advance_type IN ('fee_payment_initial', 'fee_payment_interim', 'fee_payment_final') THEN 'Fee Payment'
              ELSE 'Payment'
            END as payment_type_label
          FROM advances a
          LEFT JOIN matters m ON a.matter_id = m.matter_id
          WHERE a.client_id = @client_id AND a.firm_id = @firm_id
            AND a.advance_type IN ('client_retainer', 'fee_payment_initial', 'fee_payment_interim', 'fee_payment_final')
            AND a.date_received >= @dateFrom AND a.date_received <= @dateTo
            AND a.is_deleted = 0
          ORDER BY a.date_received ASC`, { client_id: clientId, firm_id: firmId, dateFrom, dateTo }),
        db.getOne(`
          SELECT COALESCE(SUM(total), 0) as opening_balance FROM invoices
          WHERE client_id = @client_id AND firm_id = @firm_id
            AND issue_date < @dateFrom
            AND status NOT IN ('paid', 'cancelled', 'draft')
            AND is_deleted = 0`, { client_id: clientId, firm_id: firmId, dateFrom })
      ]);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const outstanding = invoices.filter(inv => !['paid', 'cancelled', 'draft'].includes(inv.status)).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const openingBalance = parseFloat(openingBalanceResult?.opening_balance) || 0;

      return {
        client, invoices, payments,
        summary: {
          openingBalance, totalInvoiced, totalPaid, totalPayments, outstanding,
          closingBalance: openingBalance + totalInvoiced - totalPayments
        },
        period: { dateFrom, dateTo }
      };
    }

    // ------------------------------------------------------------------
    // INVOICE AGING
    // ------------------------------------------------------------------
    case 'invoice-aging': {
      const agingData = await db.getAll(`
        SELECT i.*, c.client_name, c.client_name_arabic, m.matter_name,
          DATEDIFF(day, i.due_date, GETUTCDATE()) as days_overdue,
          CASE
            WHEN DATEDIFF(day, i.due_date, GETUTCDATE()) <= 0 THEN 'current'
            WHEN DATEDIFF(day, i.due_date, GETUTCDATE()) <= 30 THEN '1-30'
            WHEN DATEDIFF(day, i.due_date, GETUTCDATE()) <= 60 THEN '31-60'
            WHEN DATEDIFF(day, i.due_date, GETUTCDATE()) <= 90 THEN '61-90'
            ELSE '90+'
          END as aging_bucket
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.client_id
        LEFT JOIN matters m ON i.matter_id = m.matter_id
        WHERE i.firm_id = @firm_id
          AND i.status IN ('sent', 'viewed', 'partial', 'overdue')
          AND i.is_deleted = 0
        ORDER BY days_overdue DESC`, { firm_id: firmId });

      const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      agingData.forEach(inv => {
        buckets[inv.aging_bucket] = (buckets[inv.aging_bucket] || 0) + (parseFloat(inv.total) || 0);
      });

      return {
        invoices: agingData,
        buckets,
        totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0)
      };
    }

    // ------------------------------------------------------------------
    // CASE STATUS REPORT
    // ------------------------------------------------------------------
    case 'case-status-report': {
      const caseClientId = filters.clientId;
      if (!caseClientId) return { success: false, error: 'Client ID required' };

      const todayStr = new Date().toISOString().split('T')[0];
      const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const past12M = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const caseClient = await db.getOne(
        'SELECT * FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id: caseClientId, firm_id: firmId }
      );
      if (!caseClient) return { success: false, error: 'Client not found' };

      // Get matters linked to this client via junction table
      const [clientMatters, upcomingHearingsData, recentJudgments, upcomingDeadlines] = await Promise.all([
        db.getAll(`
          SELECT m.*
          FROM matters m
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND m.firm_id = @firm_id
            AND m.matter_status IN ('active', 'engaged', 'on_hold') AND m.is_deleted = 0
          ORDER BY m.created_at DESC`, { client_id: caseClientId, firm_id: firmId }),
        db.getAll(`
          SELECT h.*, m.matter_name, m.matter_name_arabic
          FROM hearings h
          JOIN matters m ON h.matter_id = m.matter_id
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND h.firm_id = @firm_id
            AND h.hearing_date >= @today AND h.hearing_date <= @in90
            AND h.is_deleted = 0
          ORDER BY h.hearing_date ASC`, { client_id: caseClientId, firm_id: firmId, today: todayStr, in90: in90Days }),
        db.getAll(`
          SELECT j.*, m.matter_name, m.matter_name_arabic
          FROM judgments j
          JOIN matters m ON j.matter_id = m.matter_id
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND j.firm_id = @firm_id
            AND j.expected_date >= @past12 AND j.is_deleted = 0
          ORDER BY j.expected_date DESC`, { client_id: caseClientId, firm_id: firmId, past12: past12M }),
        db.getAll(`
          SELECT d.*, m.matter_name, m.matter_name_arabic
          FROM deadlines d
          LEFT JOIN matters m ON d.matter_id = m.matter_id
          LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id
            AND d.firm_id = @firm_id
            AND d.deadline_date >= @today AND d.deadline_date <= @in60
            AND d.status != 'completed' AND d.is_deleted = 0
          ORDER BY d.deadline_date ASC`, { client_id: caseClientId, firm_id: firmId, today: todayStr, in60: in60Days })
      ]);

      return {
        client: caseClient,
        matters: clientMatters,
        hearings: upcomingHearingsData,
        judgments: recentJudgments,
        deadlines: upcomingDeadlines,
        summary: {
          totalMatters: clientMatters.length,
          matterCounts: {
            active: clientMatters.filter(m => m.matter_status === 'active').length,
            engaged: clientMatters.filter(m => m.matter_status === 'engaged').length,
            onHold: clientMatters.filter(m => m.matter_status === 'on_hold').length
          },
          upcomingHearingsCount: upcomingHearingsData.length,
          recentJudgmentsCount: recentJudgments.length,
          upcomingDeadlinesCount: upcomingDeadlines.length
        },
        generatedAt: new Date().toISOString()
      };
    }

    // ------------------------------------------------------------------
    // CLIENT 360 REPORT
    // ------------------------------------------------------------------
    case 'client-360-report': {
      const client360Id = filters.clientId;
      if (!client360Id) return { success: false, error: 'Client ID required' };

      const client360 = await db.getOne(
        'SELECT * FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id: client360Id, firm_id: firmId }
      );
      if (!client360) return { success: false, error: 'Client not found' };

      const [allMatters, allHearings, allJudgments, allDeadlines, allTimesheets, allExpenses, allInvoices, retainerData] = await Promise.all([
        db.getAll(`
          SELECT m.*
          FROM matters m
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND m.firm_id = @firm_id AND m.is_deleted = 0
          ORDER BY m.created_at DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT h.*, m.matter_name, m.matter_name_arabic
          FROM hearings h
          JOIN matters m ON h.matter_id = m.matter_id
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND h.firm_id = @firm_id AND h.is_deleted = 0
          ORDER BY h.hearing_date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT j.*, m.matter_name, m.matter_name_arabic
          FROM judgments j
          JOIN matters m ON j.matter_id = m.matter_id
          JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id AND j.firm_id = @firm_id AND j.is_deleted = 0
          ORDER BY j.expected_date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT d.*, m.matter_name, m.matter_name_arabic
          FROM deadlines d
          LEFT JOIN matters m ON d.matter_id = m.matter_id
          LEFT JOIN matter_clients mc ON m.matter_id = mc.matter_id
          WHERE mc.client_id = @client_id
            AND d.firm_id = @firm_id AND d.is_deleted = 0
          ORDER BY d.deadline_date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT t.*, m.matter_name, m.matter_name_arabic, l.full_name as lawyer_name
          FROM timesheets t
          LEFT JOIN matters m ON t.matter_id = m.matter_id
          LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
          WHERE t.client_id = @client_id AND t.firm_id = @firm_id AND t.is_deleted = 0
          ORDER BY t.entry_date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT e.*, m.matter_name, m.matter_name_arabic
          FROM expenses e
          LEFT JOIN matters m ON e.matter_id = m.matter_id
          WHERE m.matter_id IN (
            SELECT mc3.matter_id FROM matter_clients mc3 WHERE mc3.client_id = @client_id
          )
          AND e.firm_id = @firm_id AND e.is_deleted = 0
          ORDER BY e.date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT i.*, m.matter_name
          FROM invoices i
          LEFT JOIN matters m ON i.matter_id = m.matter_id
          WHERE i.client_id = @client_id AND i.firm_id = @firm_id AND i.is_deleted = 0
          ORDER BY i.issue_date DESC`, { client_id: client360Id, firm_id: firmId }),
        db.getAll(`
          SELECT * FROM advances
          WHERE client_id = @client_id AND firm_id = @firm_id
            AND advance_type IN ('client_retainer', 'client_expense_advance')
            AND is_deleted = 0
          ORDER BY date_received DESC`, { client_id: client360Id, firm_id: firmId })
      ]);

      const totalInvoiced = allInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = allInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const outstanding = allInvoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const retainerBalance = retainerData.reduce((sum, r) => sum + (parseFloat(r.balance_remaining) || 0), 0);
      const unbilledTimesheets = allTimesheets.filter(ts => ts.status !== 'billed' && ts.billable === 1);
      const unbilledMinutes = unbilledTimesheets.reduce((sum, ts) => sum + (ts.minutes || 0), 0);
      const unbilledValue = unbilledTimesheets.reduce((sum, ts) => sum + ((ts.minutes / 60) * (ts.rate_per_hour || 0)), 0);

      return {
        client: client360,
        matters: allMatters,
        hearings: allHearings,
        judgments: allJudgments,
        deadlines: allDeadlines,
        timesheets: allTimesheets,
        expenses: allExpenses,
        invoices: allInvoices,
        advances: retainerData,
        financial: {
          totalInvoiced, totalPaid, outstanding, retainerBalance,
          unbilledMinutes,
          unbilledValue: Math.round(unbilledValue * 100) / 100
        },
        summary: {
          totalMatters: allMatters.length,
          activeMatters: allMatters.filter(m => ['active', 'engaged'].includes(m.matter_status)).length,
          totalHearings: allHearings.length,
          totalJudgments: allJudgments.length,
          totalDeadlines: allDeadlines.length,
          pendingDeadlines: allDeadlines.filter(d => d.status === 'pending').length,
          totalTimesheets: allTimesheets.length,
          totalExpenses: allExpenses.length,
          totalInvoices: allInvoices.length
        },
        generatedAt: new Date().toISOString()
      };
    }

    // ------------------------------------------------------------------
    // MATTER FINANCIALS (linked from /matters/:id/financials)
    // ------------------------------------------------------------------
    case 'matter-financials': {
      const matterId = filters.matterId;
      if (!matterId) return { success: false, error: 'Matter ID required' };

      const matter = await db.getOne(
        'SELECT * FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
        { matter_id: matterId, firm_id: firmId }
      );
      if (!matter) return { success: false, error: 'Matter not found' };

      const [invoices, timesheets, expenses, advances] = await Promise.all([
        db.getAll(`SELECT * FROM invoices WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0
          ORDER BY issue_date DESC`, { matter_id: matterId, firm_id: firmId }),
        db.getAll(`SELECT t.*, l.full_name as lawyer_name FROM timesheets t
          LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
          WHERE t.matter_id = @matter_id AND t.firm_id = @firm_id AND t.is_deleted = 0
          ORDER BY t.entry_date DESC`, { matter_id: matterId, firm_id: firmId }),
        db.getAll(`SELECT * FROM expenses WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0
          ORDER BY date DESC`, { matter_id: matterId, firm_id: firmId }),
        db.getAll(`SELECT * FROM advances WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0
          ORDER BY date_received DESC`, { matter_id: matterId, firm_id: firmId })
      ]);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const billableMinutes = timesheets.filter(t => t.billable).reduce((sum, t) => sum + (t.minutes || 0), 0);

      return {
        matter, invoices, timesheets, expenses, advances,
        financial: { totalInvoiced, totalPaid, totalExpenses, billableMinutes }
      };
    }

    default:
      return [];
  }
}

module.exports = router;
