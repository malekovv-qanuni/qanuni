/**
 * Settings API Routes
 * 14 data endpoints (backup/restore/export are Electron-only)
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getSettings,
  getSetting,
  saveSetting,
  saveFirmInfo,
  getFirmInfo,
  getCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency,
  getExchangeRates,
  addExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getExchangeRateForDate
} = require('../../electron/ipc/settings');

// -------------------- SETTINGS CRUD --------------------

router.get('/', (req, res, next) => {
  try {
    const settings = getSettings(database);
    res.json(settings);
  } catch (error) {
    logging.error('GET /api/settings', { error: error.message });
    next(error);
  }
});

router.get('/by-key/:key', (req, res, next) => {
  try {
    const setting = getSetting(database, req.params.key);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    logging.error('GET /api/settings/by-key/:key', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { key, value, type, category } = req.body;
    const result = saveSetting(database, key, value, type, category);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/settings', { error: error.message });
    next(error);
  }
});

// -------------------- FIRM INFO --------------------

router.get('/firm-info', (req, res, next) => {
  try {
    const firmInfo = getFirmInfo(database);
    res.json(firmInfo);
  } catch (error) {
    logging.error('GET /api/settings/firm-info', { error: error.message });
    next(error);
  }
});

router.put('/firm-info', (req, res, next) => {
  try {
    const result = saveFirmInfo(database, logging, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/settings/firm-info', { error: error.message });
    next(error);
  }
});

// -------------------- CURRENCIES --------------------

router.get('/currencies', (req, res, next) => {
  try {
    const currencies = getCurrencies(database);
    res.json(currencies);
  } catch (error) {
    logging.error('GET /api/settings/currencies', { error: error.message });
    next(error);
  }
});

router.post('/currencies', (req, res, next) => {
  try {
    const result = addCurrency(database, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/settings/currencies', { error: error.message });
    next(error);
  }
});

router.put('/currencies/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateCurrency(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/settings/currencies/:id', { error: error.message });
    next(error);
  }
});

router.delete('/currencies/:id', (req, res, next) => {
  try {
    const result = deleteCurrency(database, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/settings/currencies/:id', { error: error.message });
    next(error);
  }
});

// -------------------- EXCHANGE RATES --------------------

router.get('/exchange-rates', (req, res, next) => {
  try {
    const rates = getExchangeRates(database);
    res.json(rates);
  } catch (error) {
    logging.error('GET /api/settings/exchange-rates', { error: error.message });
    next(error);
  }
});

router.post('/exchange-rates', (req, res, next) => {
  try {
    const result = addExchangeRate(database, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/settings/exchange-rates', { error: error.message });
    next(error);
  }
});

router.put('/exchange-rates/:rateId', (req, res, next) => {
  try {
    const data = { rate_id: req.params.rateId, ...req.body };
    const result = updateExchangeRate(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/settings/exchange-rates/:rateId', { error: error.message });
    next(error);
  }
});

router.delete('/exchange-rates/:rateId', (req, res, next) => {
  try {
    const result = deleteExchangeRate(database, req.params.rateId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/settings/exchange-rates/:rateId', { error: error.message });
    next(error);
  }
});

router.get('/exchange-rates/for-date', (req, res, next) => {
  try {
    const { from, to, date } = req.query;
    const rate = getExchangeRateForDate(database, from, to, date);
    if (!rate) {
      return res.status(404).json({ success: false, error: 'No exchange rate found' });
    }
    res.json(rate);
  } catch (error) {
    logging.error('GET /api/settings/exchange-rates/for-date', { error: error.message });
    next(error);
  }
});

module.exports = router;
