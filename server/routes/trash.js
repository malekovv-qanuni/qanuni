/**
 * Trash API Routes
 * 5 REST endpoints: get items, count, restore, permanent delete, empty all
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getTrashItems,
  getTrashCount,
  restoreTrashItem,
  permanentDeleteItem,
  emptyTrash
} = require('../../electron/ipc/trash');

router.get('/', (req, res, next) => {
  try {
    const items = getTrashItems(database);
    res.json(items);
  } catch (error) {
    logging.error('GET /api/trash', { error: error.message });
    next(error);
  }
});

router.get('/count', (req, res, next) => {
  try {
    const counts = getTrashCount(database);
    res.json(counts);
  } catch (error) {
    logging.error('GET /api/trash/count', { error: error.message });
    next(error);
  }
});

router.post('/restore/:type/:id', (req, res, next) => {
  try {
    const result = restoreTrashItem(database, logging, req.params.type, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/trash/restore/:type/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:type/:id', (req, res, next) => {
  try {
    const result = permanentDeleteItem(database, logging, req.params.type, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/trash/:type/:id', { error: error.message });
    next(error);
  }
});

router.delete('/', (req, res, next) => {
  try {
    const result = emptyTrash(database, logging);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/trash', { error: error.message });
    next(error);
  }
});

module.exports = router;
