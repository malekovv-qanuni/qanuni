/**
 * Hearings API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getHearings,
  addHearing,
  updateHearing,
  deleteHearing
} = require('../../electron/ipc/hearings');

router.get('/', (req, res, next) => {
  try {
    const hearings = getHearings(database);
    res.json(hearings);
  } catch (error) {
    logging.error('GET /api/hearings', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addHearing(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/hearings', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const hearingData = { hearing_id: req.params.id, ...req.body };
    const result = updateHearing(database, logging, hearingData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/hearings/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteHearing(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/hearings/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
