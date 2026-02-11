/**
 * Lawyers API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getLawyers,
  getAllLawyers,
  addLawyer,
  updateLawyer,
  deleteLawyer,
  checkLawyerUsage,
  reactivateLawyer
} = require('../../electron/ipc/lawyers');

router.get('/', (req, res, next) => {
  try {
    const lawyers = getLawyers(database);
    res.json(lawyers);
  } catch (error) {
    logging.error('GET /api/lawyers', { error: error.message });
    next(error);
  }
});

router.get('/all', (req, res, next) => {
  try {
    const lawyers = getAllLawyers(database);
    res.json(lawyers);
  } catch (error) {
    logging.error('GET /api/lawyers/all', { error: error.message });
    next(error);
  }
});

router.get('/:id/usage', (req, res, next) => {
  try {
    const usage = checkLawyerUsage(database, req.params.id);
    res.json(usage);
  } catch (error) {
    logging.error('GET /api/lawyers/:id/usage', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addLawyer(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/lawyers', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const lawyerData = { lawyer_id: req.params.id, ...req.body };
    const result = updateLawyer(database, logging, lawyerData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/lawyers/:id', { error: error.message });
    next(error);
  }
});

router.post('/:id/reactivate', (req, res, next) => {
  try {
    const result = reactivateLawyer(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/lawyers/:id/reactivate', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteLawyer(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/lawyers/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
