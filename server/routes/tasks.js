/**
 * Tasks API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getTasks,
  addTask,
  updateTask,
  deleteTask
} = require('../../electron/ipc/tasks');

router.get('/', (req, res, next) => {
  try {
    const tasks = getTasks(database);
    res.json(tasks);
  } catch (error) {
    logging.error('GET /api/tasks', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addTask(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/tasks', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const taskData = { task_id: req.params.id, ...req.body };
    const result = updateTask(database, logging, taskData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/tasks/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteTask(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/tasks/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
