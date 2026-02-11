/**
 * Corporate Secretary API Routes
 * 25 REST endpoints: entities, shareholders, share transfers, directors, filings, meetings, compliance
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllCorporateEntities,
  getCorporateEntity,
  addCorporateEntity,
  updateCorporateEntity,
  deleteCorporateEntity,
  getCompanyClientsWithoutEntity,
  getCorporateClients,
  getShareholders,
  addShareholder,
  updateShareholder,
  deleteShareholder,
  getTotalShares,
  getShareTransfers,
  addShareTransfer,
  updateShareTransfer,
  deleteShareTransfer,
  getDirectors,
  addDirector,
  updateDirector,
  deleteDirector,
  getFilings,
  addFiling,
  updateFiling,
  deleteFiling,
  getMeetings,
  addMeeting,
  updateMeeting,
  deleteMeeting,
  getUpcomingCompliance
} = require('../../electron/ipc/corporate');

// ==================== CORPORATE ENTITIES ====================

router.get('/entities', (req, res, next) => {
  try {
    const entities = getAllCorporateEntities(database);
    res.json(entities);
  } catch (error) {
    logging.error('GET /api/corporate/entities', { error: error.message });
    next(error);
  }
});

router.get('/entities/without-details', (req, res, next) => {
  try {
    const clients = getCompanyClientsWithoutEntity(database);
    res.json(clients);
  } catch (error) {
    logging.error('GET /api/corporate/entities/without-details', { error: error.message });
    next(error);
  }
});

router.get('/clients', (req, res, next) => {
  try {
    const clients = getCorporateClients(database);
    res.json(clients);
  } catch (error) {
    logging.error('GET /api/corporate/clients', { error: error.message });
    next(error);
  }
});

router.get('/entities/:clientId', (req, res, next) => {
  try {
    const entity = getCorporateEntity(database, req.params.clientId);
    if (!entity) {
      return res.status(404).json({ success: false, error: 'Corporate entity not found' });
    }
    res.json(entity);
  } catch (error) {
    logging.error('GET /api/corporate/entities/:clientId', { error: error.message });
    next(error);
  }
});

router.post('/entities', (req, res, next) => {
  try {
    const result = addCorporateEntity(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/entities', { error: error.message });
    next(error);
  }
});

router.put('/entities/:clientId', (req, res, next) => {
  try {
    const data = { client_id: req.params.clientId, ...req.body };
    const result = updateCorporateEntity(database, logging, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/entities/:clientId', { error: error.message });
    next(error);
  }
});

router.delete('/entities/:clientId', (req, res, next) => {
  try {
    const result = deleteCorporateEntity(database, logging, req.params.clientId);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/entities/:clientId', { error: error.message });
    next(error);
  }
});

// ==================== SHAREHOLDERS ====================

router.get('/shareholders/:clientId', (req, res, next) => {
  try {
    const shareholders = getShareholders(database, req.params.clientId);
    res.json(shareholders);
  } catch (error) {
    logging.error('GET /api/corporate/shareholders/:clientId', { error: error.message });
    next(error);
  }
});

router.get('/shareholders/:clientId/total-shares', (req, res, next) => {
  try {
    const total = getTotalShares(database, req.params.clientId);
    res.json({ total });
  } catch (error) {
    logging.error('GET /api/corporate/shareholders/:clientId/total-shares', { error: error.message });
    next(error);
  }
});

router.post('/shareholders', (req, res, next) => {
  try {
    const result = addShareholder(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/shareholders', { error: error.message });
    next(error);
  }
});

router.put('/shareholders/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateShareholder(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/shareholders/:id', { error: error.message });
    next(error);
  }
});

router.delete('/shareholders/:id', (req, res, next) => {
  try {
    const result = deleteShareholder(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/shareholders/:id', { error: error.message });
    next(error);
  }
});

// ==================== SHARE TRANSFERS ====================

router.get('/transfers/:clientId', (req, res, next) => {
  try {
    const transfers = getShareTransfers(database, req.params.clientId);
    res.json(transfers);
  } catch (error) {
    logging.error('GET /api/corporate/transfers/:clientId', { error: error.message });
    next(error);
  }
});

router.post('/transfers', (req, res, next) => {
  try {
    const result = addShareTransfer(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/transfers', { error: error.message });
    next(error);
  }
});

router.put('/transfers/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateShareTransfer(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/transfers/:id', { error: error.message });
    next(error);
  }
});

router.delete('/transfers/:id', (req, res, next) => {
  try {
    const result = deleteShareTransfer(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/transfers/:id', { error: error.message });
    next(error);
  }
});

// ==================== DIRECTORS ====================

router.get('/directors/:clientId', (req, res, next) => {
  try {
    const directors = getDirectors(database, req.params.clientId);
    res.json(directors);
  } catch (error) {
    logging.error('GET /api/corporate/directors/:clientId', { error: error.message });
    next(error);
  }
});

router.post('/directors', (req, res, next) => {
  try {
    const result = addDirector(database, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/directors', { error: error.message });
    next(error);
  }
});

router.put('/directors/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateDirector(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/directors/:id', { error: error.message });
    next(error);
  }
});

router.delete('/directors/:id', (req, res, next) => {
  try {
    const result = deleteDirector(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/directors/:id', { error: error.message });
    next(error);
  }
});

// ==================== FILINGS ====================

router.get('/filings/:clientId', (req, res, next) => {
  try {
    const filings = getFilings(database, req.params.clientId);
    res.json(filings);
  } catch (error) {
    logging.error('GET /api/corporate/filings/:clientId', { error: error.message });
    next(error);
  }
});

router.post('/filings', (req, res, next) => {
  try {
    const result = addFiling(database, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/filings', { error: error.message });
    next(error);
  }
});

router.put('/filings/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateFiling(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/filings/:id', { error: error.message });
    next(error);
  }
});

router.delete('/filings/:id', (req, res, next) => {
  try {
    const result = deleteFiling(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/filings/:id', { error: error.message });
    next(error);
  }
});

// ==================== MEETINGS ====================

router.get('/meetings/:clientId', (req, res, next) => {
  try {
    const meetings = getMeetings(database, req.params.clientId);
    res.json(meetings);
  } catch (error) {
    logging.error('GET /api/corporate/meetings/:clientId', { error: error.message });
    next(error);
  }
});

router.post('/meetings', (req, res, next) => {
  try {
    const result = addMeeting(database, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/corporate/meetings', { error: error.message });
    next(error);
  }
});

router.put('/meetings/:id', (req, res, next) => {
  try {
    const data = { id: req.params.id, ...req.body };
    const result = updateMeeting(database, data);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/corporate/meetings/:id', { error: error.message });
    next(error);
  }
});

router.delete('/meetings/:id', (req, res, next) => {
  try {
    const result = deleteMeeting(database, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/corporate/meetings/:id', { error: error.message });
    next(error);
  }
});

// ==================== COMPLIANCE DASHBOARD ====================

router.get('/compliance', (req, res, next) => {
  try {
    const daysAhead = req.query.days ? parseInt(req.query.days) : 30;
    const result = getUpcomingCompliance(database, daysAhead);
    res.json(result);
  } catch (error) {
    logging.error('GET /api/corporate/compliance', { error: error.message });
    next(error);
  }
});

module.exports = router;
