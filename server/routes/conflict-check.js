/**
 * Conflict Check API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  conflictCheck,
  logConflictCheck
} = require('../../electron/ipc/conflict-check');

router.post('/search', (req, res, next) => {
  try {
    const results = conflictCheck(database, logging, req.body);
    res.json(results);
  } catch (error) {
    logging.error('POST /api/conflict-check/search', { error: error.message });
    next(error);
  }
});

router.post('/log', (req, res, next) => {
  try {
    const result = logConflictCheck(database, req.body);
    res.json(result);
  } catch (error) {
    logging.error('POST /api/conflict-check/log', { error: error.message });
    next(error);
  }
});

module.exports = router;
