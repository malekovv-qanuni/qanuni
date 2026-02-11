/**
 * Appointments Module - Dual-Mode (IPC + REST)
 * 4 handlers: CRUD
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getAllAppointments(database) {
  return database.query(`SELECT a.*, c.client_name, m.matter_name FROM appointments a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN matters m ON a.matter_id = m.matter_id
    WHERE a.deleted_at IS NULL
    ORDER BY a.date DESC`);
}

function addAppointment(database, logger, apt) {
  const check = validation.check(apt, 'appointment');
  if (!check.valid) return check.result;

  const id = database.generateId('APT');
  const now = new Date().toISOString();

  database.execute(`INSERT INTO appointments (appointment_id, appointment_type, title, description,
    date, start_time, end_time, all_day, location_type, location_details, client_id, matter_id,
    billable, attendees, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, apt.appointment_type || null, apt.title, apt.description || null,
     apt.date, apt.start_time || null, apt.end_time || null,
     apt.all_day ? 1 : 0, apt.location_type || null, apt.location_details || null,
     apt.client_id || null, apt.matter_id || null,
     apt.billable ? 1 : 0, JSON.stringify(apt.attendees || []),
     apt.notes || null, apt.status || 'scheduled', now, now]);

  logger.info('Appointment created', { appointmentId: id });
  return { success: true, appointmentId: id };
}

function updateAppointment(database, logger, apt) {
  if (!apt.appointment_id) return { success: false, error: 'appointment_id is required' };

  const now = new Date().toISOString();
  database.execute(`UPDATE appointments SET appointment_type=?, title=?, description=?, date=?,
    start_time=?, end_time=?, all_day=?, location_type=?, location_details=?, client_id=?,
    matter_id=?, billable=?, attendees=?, notes=?, status=?, updated_at=? WHERE appointment_id=?`,
    [apt.appointment_type || null, apt.title, apt.description || null,
     apt.date, apt.start_time || null, apt.end_time || null,
     apt.all_day ? 1 : 0, apt.location_type || null, apt.location_details || null,
     apt.client_id || null, apt.matter_id || null,
     apt.billable ? 1 : 0, JSON.stringify(apt.attendees || []),
     apt.notes || null, apt.status, now, apt.appointment_id]);

  logger.info('Appointment updated', { appointmentId: apt.appointment_id });
  return { success: true };
}

function deleteAppointment(database, logger, id) {
  if (!id) return { success: false, error: 'appointment_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE appointments SET deleted_at = ? WHERE appointment_id = ?', [now, id]);

  logger.info('Appointment soft-deleted', { appointmentId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerAppointmentHandlers({ database, logger }) {

  ipcMain.handle('get-all-appointments', logger.wrapHandler('get-all-appointments', () => {
    return getAllAppointments(database);
  }));

  ipcMain.handle('add-appointment', logger.wrapHandler('add-appointment', (event, apt) => {
    return addAppointment(database, logger, apt);
  }));

  ipcMain.handle('update-appointment', logger.wrapHandler('update-appointment', (event, apt) => {
    return updateAppointment(database, logger, apt);
  }));

  ipcMain.handle('delete-appointment', logger.wrapHandler('delete-appointment', (event, id) => {
    return deleteAppointment(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllAppointments = getAllAppointments;
module.exports.addAppointment = addAppointment;
module.exports.updateAppointment = updateAppointment;
module.exports.deleteAppointment = deleteAppointment;
