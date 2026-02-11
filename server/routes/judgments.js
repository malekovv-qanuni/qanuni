/**
 * Judgments API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllJudgments,
  addJudgment,
  updateJudgment,
  deleteJudgment
} = require('../../electron/ipc/judgments');

router.get('/', (req, res, next) => {
  try {
    const judgments = getAllJudgments(database);
    res.json(judgments);
  } catch (error) {
    logging.error('GET /api/judgments', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addJudgment(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/judgments', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const judgmentData = { judgment_id: req.params.id, ...req.body };
    const result = updateJudgment(database, logging, judgmentData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/judgments/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteJudgment(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/judgments/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
