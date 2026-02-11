/**
 * Matters API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getMatters,
  addMatter,
  updateMatter,
  deleteMatter,
  getRelatedMatters,
  checkFileNumberUnique
} = require('../../electron/ipc/matters');

router.get('/', (req, res, next) => {
  try {
    const matters = getMatters(database);
    res.json(matters);
  } catch (error) {
    logging.error('GET /api/matters', { error: error.message });
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    // Use getMatters and filter, since there's no dedicated getMatterById
    const allMatters = getMatters(database);
    const matter = allMatters.find(m => m.matter_id === req.params.id);
    if (!matter) {
      return res.status(404).json({ success: false, error: 'Matter not found' });
    }
    res.json(matter);
  } catch (error) {
    logging.error('GET /api/matters/:id', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addMatter(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/matters', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const matterData = { matter_id: req.params.id, ...req.body };
    const result = updateMatter(database, logging, matterData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/matters/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteMatter(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/matters/:id', { error: error.message });
    next(error);
  }
});

router.get('/:id/related', (req, res, next) => {
  try {
    const result = getRelatedMatters(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('GET /api/matters/:id/related', { error: error.message });
    next(error);
  }
});

router.post('/check-file-number', (req, res, next) => {
  try {
    const { file_number, exclude_matter_id } = req.body;
    const result = checkFileNumberUnique(database, file_number, exclude_matter_id);
    res.json(result);
  } catch (error) {
    logging.error('POST /api/matters/check-file-number', { error: error.message });
    next(error);
  }
});

module.exports = router;
