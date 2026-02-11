/**
 * Clients API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  checkClientReference,
  getClientById
} = require('../../electron/ipc/clients');

router.get('/', (req, res, next) => {
  try {
    const clients = getClients(database);
    res.json(clients);
  } catch (error) {
    logging.error('GET /api/clients', { error: error.message });
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const client = getClientById(database, req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    logging.error('GET /api/clients/:id', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addClient(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/clients', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const clientData = { client_id: req.params.id, ...req.body };
    const result = updateClient(database, logging, clientData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/clients/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteClient(database, logging, req.params.id);
    res.json(result);
  } catch (error) {
    logging.error('DELETE /api/clients/:id', { error: error.message });
    next(error);
  }
});

router.post('/check-reference', (req, res, next) => {
  try {
    const { custom_id, exclude_client_id } = req.body;
    const result = checkClientReference(database, custom_id, exclude_client_id);
    res.json(result);
  } catch (error) {
    logging.error('POST /api/clients/check-reference', { error: error.message });
    next(error);
  }
});

module.exports = router;
