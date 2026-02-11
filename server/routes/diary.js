/**
 * Diary / Matter Timeline API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getMatterTimeline,
  addDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry
} = require('../../electron/ipc/diary');

router.get('/timeline/:matterId', (req, res, next) => {
  try {
    const entries = getMatterTimeline(database, req.params.matterId);
    res.json(entries);
  } catch (error) {
    logging.error('GET /api/diary/timeline/:matterId', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addDiaryEntry(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/diary', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const data = { entry_id: req.params.id, ...req.body };
    const result = updateDiaryEntry(database, logging, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/diary/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteDiaryEntry(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/diary/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
