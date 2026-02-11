/**
 * Client Imports API Routes
 * 1 REST endpoint (template export is Electron-only)
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const { importClientsFromRows } = require('../../electron/ipc/client-imports');

// POST /api/client-imports — Import clients from JSON rows
// Body: { rows: [{ "Client Name *": "...", ... }, ...] }
router.post('/', (req, res, next) => {
  try {
    const { rows } = req.body;
    const result = importClientsFromRows(database, logging, rows);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/client-imports', { error: error.message });
    next(error);
  }
});

module.exports = router;
