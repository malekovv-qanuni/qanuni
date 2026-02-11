/**
 * Invoices API Routes
 * Note: PDF generation is IPC-only (uses Electron APIs)
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllInvoices,
  getInvoice,
  getInvoiceItems,
  generateInvoiceNumber,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice
} = require('../../electron/ipc/invoices');

router.get('/', (req, res, next) => {
  try {
    const invoices = getAllInvoices(database);
    res.json(invoices);
  } catch (error) {
    logging.error('GET /api/invoices', { error: error.message });
    next(error);
  }
});

router.get('/generate-number', (req, res, next) => {
  try {
    const number = generateInvoiceNumber(database);
    res.json({ invoice_number: number });
  } catch (error) {
    logging.error('GET /api/invoices/generate-number', { error: error.message });
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const invoice = getInvoice(database, req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    logging.error('GET /api/invoices/:id', { error: error.message });
    next(error);
  }
});

router.get('/:id/items', (req, res, next) => {
  try {
    const items = getInvoiceItems(database, req.params.id);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/invoices/:id/items', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { items, ...invoice } = req.body;
    const result = createInvoice(database, logging, invoice, items);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/invoices', { error: error.message });
    next(error);
  }
});

router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    const result = updateInvoiceStatus(database, logging, req.params.id, status);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/invoices/:id/status', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteInvoice(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/invoices/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
