/**
 * Advances API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllAdvances,
  getClientExpenseAdvance,
  getClientRetainer,
  getLawyerAdvance,
  addAdvance,
  updateAdvance,
  deleteAdvance,
  deductFromAdvance,
  deductRetainer,
  addExpenseWithDeduction
} = require('../../electron/ipc/advances');

router.get('/', (req, res, next) => {
  try {
    const advances = getAllAdvances(database);
    res.json(advances);
  } catch (error) {
    logging.error('GET /api/advances', { error: error.message });
    next(error);
  }
});

router.get('/client-expense-advance', (req, res, next) => {
  try {
    const { client_id, matter_id } = req.query;
    const result = getClientExpenseAdvance(database, client_id, matter_id);
    res.json(result || null);
  } catch (error) {
    logging.error('GET /api/advances/client-expense-advance', { error: error.message });
    next(error);
  }
});

router.get('/client-retainer', (req, res, next) => {
  try {
    const { client_id, matter_id } = req.query;
    const result = getClientRetainer(database, client_id, matter_id);
    res.json(result || null);
  } catch (error) {
    logging.error('GET /api/advances/client-retainer', { error: error.message });
    next(error);
  }
});

router.get('/lawyer-advance', (req, res, next) => {
  try {
    const { lawyer_id } = req.query;
    const result = getLawyerAdvance(database, lawyer_id);
    res.json(result || null);
  } catch (error) {
    logging.error('GET /api/advances/lawyer-advance', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addAdvance(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/advances', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const advData = { advance_id: req.params.id, ...req.body };
    const result = updateAdvance(database, logging, advData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/advances/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteAdvance(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/advances/:id', { error: error.message });
    next(error);
  }
});

router.post('/deduct', (req, res, next) => {
  try {
    const { advance_id, amount } = req.body;
    const result = deductFromAdvance(database, logging, advance_id, amount);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/advances/deduct', { error: error.message });
    next(error);
  }
});

router.post('/deduct-retainer', (req, res, next) => {
  try {
    const { client_id, matter_id, advance_type, amount } = req.body;
    const result = deductRetainer(database, logging, client_id, matter_id, advance_type, amount);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/advances/deduct-retainer', { error: error.message });
    next(error);
  }
});

router.post('/expense-with-deduction', (req, res, next) => {
  try {
    const result = addExpenseWithDeduction(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/advances/expense-with-deduction', { error: error.message });
    next(error);
  }
});

module.exports = router;
