/**
 * Lookups API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getCourtTypes,
  getRegions,
  getHearingPurposes,
  getTaskTypes,
  getExpenseCategories,
  getEntityTypes,
  addLookupItem,
  updateLookupItem,
  deleteLookupItem
} = require('../../electron/ipc/lookups');

router.get('/court-types', (req, res, next) => {
  try {
    const items = getCourtTypes(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/court-types', { error: error.message });
    next(error);
  }
});

router.get('/regions', (req, res, next) => {
  try {
    const items = getRegions(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/regions', { error: error.message });
    next(error);
  }
});

router.get('/hearing-purposes', (req, res, next) => {
  try {
    const items = getHearingPurposes(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/hearing-purposes', { error: error.message });
    next(error);
  }
});

router.get('/task-types', (req, res, next) => {
  try {
    const items = getTaskTypes(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/task-types', { error: error.message });
    next(error);
  }
});

router.get('/expense-categories', (req, res, next) => {
  try {
    const items = getExpenseCategories(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/expense-categories', { error: error.message });
    next(error);
  }
});

router.get('/entity-types', (req, res, next) => {
  try {
    const items = getEntityTypes(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/lookups/entity-types', { error: error.message });
    next(error);
  }
});

router.post('/:type', (req, res, next) => {
  try {
    const result = addLookupItem(database, logging, req.params.type, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/lookups/:type', { error: error.message });
    next(error);
  }
});

router.put('/:type', (req, res, next) => {
  try {
    const result = updateLookupItem(database, logging, req.params.type, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/lookups/:type', { error: error.message });
    next(error);
  }
});

router.delete('/:type', (req, res, next) => {
  try {
    const result = deleteLookupItem(database, logging, req.params.type, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/lookups/:type', { error: error.message });
    next(error);
  }
});

module.exports = router;
