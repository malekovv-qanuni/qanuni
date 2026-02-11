/**
 * Deadlines API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllDeadlines,
  getDeadlinesByJudgment,
  addDeadline,
  updateDeadline,
  updateDeadlineStatus,
  deleteDeadline
} = require('../../electron/ipc/deadlines');

router.get('/', (req, res, next) => {
  try {
    const deadlines = getAllDeadlines(database);
    res.json(deadlines);
  } catch (error) {
    logging.error('GET /api/deadlines', { error: error.message });
    next(error);
  }
});

router.get('/by-judgment/:judgmentId', (req, res, next) => {
  try {
    const deadlines = getDeadlinesByJudgment(database, req.params.judgmentId);
    res.json(deadlines);
  } catch (error) {
    logging.error('GET /api/deadlines/by-judgment/:judgmentId', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addDeadline(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/deadlines', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const deadlineData = { deadline_id: req.params.id, ...req.body };
    const result = updateDeadline(database, logging, deadlineData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/deadlines/:id', { error: error.message });
    next(error);
  }
});

router.put('/:id/status', (req, res, next) => {
  try {
    const result = updateDeadlineStatus(database, logging, req.params.id, req.body.status);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/deadlines/:id/status', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteDeadline(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/deadlines/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
