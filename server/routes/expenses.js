/**
 * Expenses API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getExpenses,
  getUnbilledExpenses,
  addExpense,
  addExpenseBatch,
  updateExpense,
  deleteExpense
} = require('../../electron/ipc/expenses');

router.get('/', (req, res, next) => {
  try {
    const expenses = getExpenses(database);
    res.json(expenses);
  } catch (error) {
    logging.error('GET /api/expenses', { error: error.message });
    next(error);
  }
});

router.get('/unbilled', (req, res, next) => {
  try {
    const { client_id, matter_id } = req.query;
    const result = getUnbilledExpenses(database, client_id, matter_id);
    res.json(result);
  } catch (error) {
    logging.error('GET /api/expenses/unbilled', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addExpense(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/expenses', { error: error.message });
    next(error);
  }
});

router.post('/batch', (req, res, next) => {
  try {
    const result = addExpenseBatch(database, logging, req.body.expenses || req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/expenses/batch', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const expData = { expense_id: req.params.id, ...req.body };
    const result = updateExpense(database, logging, expData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/expenses/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteExpense(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/expenses/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
