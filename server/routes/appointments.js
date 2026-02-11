/**
 * Appointments API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../../electron/database');
const logging = require('../../electron/logging');

const {
  getAllAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment
} = require('../../electron/ipc/appointments');

router.get('/', (req, res, next) => {
  try {
    const appointments = getAllAppointments(database);
    res.json(appointments);
  } catch (error) {
    logging.error('GET /api/appointments', { error: error.message });
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const result = addAppointment(database, logging, req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('POST /api/appointments', { error: error.message });
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const aptData = { appointment_id: req.params.id, ...req.body };
    const result = updateAppointment(database, logging, aptData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('PUT /api/appointments/:id', { error: error.message });
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteAppointment(database, logging, req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logging.error('DELETE /api/appointments/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
