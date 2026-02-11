/**
 * Timesheets API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getTimesheets,
  getUnbilledTime,
  addTimesheet,
  updateTimesheet,
  deleteTimesheet
} = require('../../electron/ipc/timesheets');

router.get('/', (req, res, next) => {
  try {
    const timesheets = getTimesheets(database);
    res.json(timesheets);
  } catch (error) {
    logging.error('GET /api/timesheets', { error: error.message });
    next(error);
  }
});

router.get('/unbilled', (req, res, next) => {
  try {
    const { client_id, matter_id } = req.query;
    const result = getUnbilledTime(database, client_id, matter_id);
    res.json(result);
  } catch (error) {
    logging.error('GET /api/timesheets/unbilled', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addTimesheet(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/timesheets', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const tsData = { timesheet_id: req.params.id, ...req.body };
    const result = updateTimesheet(database, logging, tsData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/timesheets/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteTimesheet(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/timesheets/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
