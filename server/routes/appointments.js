/**
 * Qanuni SaaS - Appointments CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Optional FKs: client_id, matter_id (validated against firm).
 *
 * @version 1.0.0 (Week 4 Day 19)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/appointments ====================
// List all appointments for the user's firm
// Query params: ?search=term, ?client_id=123, ?matter_id=456, ?status=scheduled, ?appointment_type=client_meeting, ?start_date=2026-01-01, ?end_date=2026-12-31

router.get('/', async (req, res) => {
  try {
    const { search, client_id, matter_id, status, appointment_type, start_date, end_date } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE a.firm_id = @firm_id AND a.is_deleted = 0';

    if (search) {
      where += ` AND (
        a.title LIKE '%' + @search + '%' OR
        a.description LIKE '%' + @search + '%' OR
        a.location_details LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (client_id) {
      const cid = parseInt(client_id);
      if (!isNaN(cid)) {
        where += ' AND a.client_id = @client_id';
        params.client_id = cid;
      }
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND a.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (status) {
      where += ' AND a.status = @status';
      params.status = status;
    }

    if (appointment_type) {
      where += ' AND a.appointment_type = @appointment_type';
      params.appointment_type = appointment_type;
    }

    if (start_date) {
      where += ' AND a.appointment_date >= @start_date';
      params.start_date = start_date;
    }

    if (end_date) {
      where += ' AND a.appointment_date <= @end_date';
      params.end_date = end_date;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM appointments a ${where}`,
      params
    );
    const total = countResult.total;

    const appointments = await db.getAll(
      `SELECT
        a.appointment_id,
        a.firm_id,
        a.appointment_type,
        a.title,
        a.description,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.all_day,
        a.location_type,
        a.location_details,
        a.client_id,
        a.matter_id,
        a.billable,
        a.attendees,
        a.notes,
        a.status,
        a.created_at,
        a.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.client_id
      LEFT JOIN matters m ON a.matter_id = m.matter_id
      ${where}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: appointments,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve appointments'
    });
  }
});

// ==================== GET /api/appointments/:id ====================
// Get single appointment with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID'
      });
    }

    const appointment = await db.getOne(
      `SELECT
        a.appointment_id,
        a.firm_id,
        a.appointment_type,
        a.title,
        a.description,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.all_day,
        a.location_type,
        a.location_details,
        a.client_id,
        a.matter_id,
        a.billable,
        a.attendees,
        a.notes,
        a.status,
        a.created_by,
        a.created_at,
        a.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.client_id
      LEFT JOIN matters m ON a.matter_id = m.matter_id
      WHERE a.appointment_id = @appointment_id
        AND a.firm_id = @firm_id
        AND a.is_deleted = 0`,
      {
        appointment_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment
    });

  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve appointment'
    });
  }
});

// ==================== POST /api/appointments ====================
// Create new appointment (optional client_id, matter_id FK validation)

router.post('/', validateBody('appointment_saas'), async (req, res) => {
  const {
    appointment_type,
    title,
    description,
    appointment_date,
    start_time,
    end_time,
    all_day,
    location_type,
    location_details,
    client_id,
    matter_id,
    billable,
    attendees,
    notes,
    status
  } = req.body;

  try {
    const firm_id = req.user.firm_id;

    // Validate client_id (if provided)
    if (client_id) {
      const client = await db.getOne(
        'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id, firm_id }
      );
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found or does not belong to your firm'
        });
      }
    }

    // Validate matter_id (if provided)
    if (matter_id) {
      const matter = await db.getOne(
        'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
        { matter_id, firm_id }
      );
      if (!matter) {
        return res.status(404).json({
          success: false,
          error: 'Matter not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `INSERT INTO appointments (
        firm_id,
        appointment_type,
        title,
        description,
        appointment_date,
        start_time,
        end_time,
        all_day,
        location_type,
        location_details,
        client_id,
        matter_id,
        billable,
        attendees,
        notes,
        status,
        created_by
      )
      OUTPUT
        INSERTED.appointment_id,
        INSERTED.firm_id,
        INSERTED.appointment_type,
        INSERTED.title,
        INSERTED.description,
        INSERTED.appointment_date,
        INSERTED.start_time,
        INSERTED.end_time,
        INSERTED.all_day,
        INSERTED.location_type,
        INSERTED.location_details,
        INSERTED.client_id,
        INSERTED.matter_id,
        INSERTED.billable,
        INSERTED.attendees,
        INSERTED.notes,
        INSERTED.status,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @appointment_type,
        @title,
        @description,
        @appointment_date,
        @start_time,
        @end_time,
        @all_day,
        @location_type,
        @location_details,
        @client_id,
        @matter_id,
        @billable,
        @attendees,
        @notes,
        @status,
        @created_by
      )`,
      {
        firm_id,
        appointment_type: appointment_type || 'client_meeting',
        title,
        description: description || null,
        appointment_date,
        start_time: start_time || null,
        end_time: end_time || null,
        all_day: all_day === true ? 1 : 0,
        location_type: location_type || 'office',
        location_details: location_details || null,
        client_id: client_id || null,
        matter_id: matter_id || null,
        billable: billable === true ? 1 : 0,
        attendees: attendees || null,
        notes: notes || null,
        status: status || 'scheduled',
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      appointment: result.recordset[0]
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment'
    });
  }
});

// ==================== PUT /api/appointments/:id ====================
// Update appointment (firm-scoped)

router.put('/:id', validateBody('appointment_saas'), async (req, res) => {
  const {
    appointment_type,
    title,
    description,
    appointment_date,
    start_time,
    end_time,
    all_day,
    location_type,
    location_details,
    client_id,
    matter_id,
    billable,
    attendees,
    notes,
    status
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify appointment exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT appointment_id FROM appointments WHERE appointment_id = @appointment_id AND firm_id = @firm_id AND is_deleted = 0',
      { appointment_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Validate client_id (if provided)
    if (client_id) {
      const client = await db.getOne(
        'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
        { client_id, firm_id }
      );
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found or does not belong to your firm'
        });
      }
    }

    // Validate matter_id (if provided)
    if (matter_id) {
      const matter = await db.getOne(
        'SELECT matter_id FROM matters WHERE matter_id = @matter_id AND firm_id = @firm_id AND is_deleted = 0',
        { matter_id, firm_id }
      );
      if (!matter) {
        return res.status(404).json({
          success: false,
          error: 'Matter not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE appointments
      SET
        appointment_type = @appointment_type,
        title = @title,
        description = @description,
        appointment_date = @appointment_date,
        start_time = @start_time,
        end_time = @end_time,
        all_day = @all_day,
        location_type = @location_type,
        location_details = @location_details,
        client_id = @client_id,
        matter_id = @matter_id,
        billable = @billable,
        attendees = @attendees,
        notes = @notes,
        status = @status,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.appointment_id,
        INSERTED.firm_id,
        INSERTED.appointment_type,
        INSERTED.title,
        INSERTED.description,
        INSERTED.appointment_date,
        INSERTED.start_time,
        INSERTED.end_time,
        INSERTED.all_day,
        INSERTED.location_type,
        INSERTED.location_details,
        INSERTED.client_id,
        INSERTED.matter_id,
        INSERTED.billable,
        INSERTED.attendees,
        INSERTED.notes,
        INSERTED.status,
        INSERTED.updated_at
      WHERE appointment_id = @appointment_id AND firm_id = @firm_id`,
      {
        appointment_id: id,
        firm_id,
        appointment_type: appointment_type || 'client_meeting',
        title,
        description: description || null,
        appointment_date,
        start_time: start_time || null,
        end_time: end_time || null,
        all_day: all_day === true ? 1 : 0,
        location_type: location_type || 'office',
        location_details: location_details || null,
        client_id: client_id || null,
        matter_id: matter_id || null,
        billable: billable === true ? 1 : 0,
        attendees: attendees || null,
        notes: notes || null,
        status: status || 'scheduled'
      }
    );

    res.json({
      success: true,
      appointment: result.recordset[0]
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
});

// ==================== DELETE /api/appointments/:id ====================
// Soft delete appointment (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID'
      });
    }

    // Verify appointment exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT appointment_id FROM appointments WHERE appointment_id = @appointment_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        appointment_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    await db.execute(
      `UPDATE appointments
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE appointment_id = @appointment_id AND firm_id = @firm_id`,
      {
        appointment_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete appointment'
    });
  }
});

module.exports = router;
