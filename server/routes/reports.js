/**
 * Reports API Routes
 * 3 data endpoints (dashboard stats, pending invoices, generate-report)
 * Export handlers (PDF/Excel/CSV) are Electron-only — not exposed via REST
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getDashboardStats,
  getPendingInvoices,
  generateReport
} = require('../../electron/ipc/reports');

// -------------------- DASHBOARD --------------------

router.get('/dashboard-stats', (req, res, next) => {
  try {
    const stats = getDashboardStats(database);
    res.json(stats);
  } catch (error) {
    logging.error('GET /api/reports/dashboard-stats', { error: error.message });
    next(error);
  }
});

router.get('/pending-invoices', (req, res, next) => {
  try {
    const invoices = getPendingInvoices(database);
    res.json(invoices);
  } catch (error) {
    logging.error('GET /api/reports/pending-invoices', { error: error.message });
    next(error);
  }
});

// -------------------- GENERATE REPORT --------------------

router.post('/generate', (req, res, next) => {
  try {
    const { reportType, filters } = req.body;
    if (!reportType) {
      return res.status(400).json({ success: false, error: 'reportType is required' });
    }
    const result = generateReport(database, reportType, filters);
    if (result?.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json(result);
  } catch (error) {
    logging.error('POST /api/reports/generate', { error: error.message });
    next(error);
  }
});

module.exports = router;
