/**
 * Qanuni SaaS - Lawyer CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 *
 * NOTE: SaaS uses full_name/full_name_arabic directly in DB.
 * Desktop uses name/name_arabic in DB, aliased to full_name in queries.
 *
 * @version 1.0.0 (Week 2 Day 6)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/lawyers ====================
// List all lawyers for the user's firm
// Query params: ?active_only=true, ?role=partner

router.get('/', async (req, res) => {
  try {
    const { active_only, role } = req.query;

    let query = `
      SELECT
        lawyer_id,
        firm_id,
        full_name,
        full_name_arabic,
        email,
        phone,
        mobile,
        role,
        hourly_rate,
        hourly_rate_currency,
        hire_date,
        is_active,
        user_id,
        notes,
        created_at,
        updated_at
      FROM lawyers
      WHERE firm_id = @firm_id AND is_deleted = 0`;

    const params = { firm_id: req.user.firm_id };

    if (active_only === 'true') {
      query += ' AND is_active = 1';
    }

    if (role) {
      query += ' AND role = @role';
      params.role = role;
    }

    query += ' ORDER BY full_name ASC';

    const lawyers = await db.getAll(query, params);

    res.json({
      success: true,
      count: lawyers.length,
      lawyers
    });

  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve lawyers'
    });
  }
});

// ==================== GET /api/lawyers/:id ====================
// Get single lawyer (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lawyer ID'
      });
    }

    const lawyer = await db.getOne(
      `SELECT
        lawyer_id,
        firm_id,
        full_name,
        full_name_arabic,
        email,
        phone,
        mobile,
        role,
        hourly_rate,
        hourly_rate_currency,
        hire_date,
        is_active,
        user_id,
        notes,
        created_at,
        updated_at
      FROM lawyers
      WHERE lawyer_id = @lawyer_id
        AND firm_id = @firm_id
        AND is_deleted = 0`,
      {
        lawyer_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        error: 'Lawyer not found'
      });
    }

    res.json({
      success: true,
      lawyer
    });

  } catch (error) {
    console.error('Get lawyer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve lawyer'
    });
  }
});

// ==================== POST /api/lawyers ====================
// Create new lawyer

router.post('/', validateBody('lawyer_saas'), async (req, res) => {
  const {
    full_name,
    full_name_arabic,
    email,
    phone,
    mobile,
    role,
    hourly_rate,
    hourly_rate_currency,
    hire_date,
    is_active,
    user_id,
    notes
  } = req.body;

  try {
    const result = await db.execute(
      `INSERT INTO lawyers (
        firm_id,
        full_name,
        full_name_arabic,
        email,
        phone,
        mobile,
        role,
        hourly_rate,
        hourly_rate_currency,
        hire_date,
        is_active,
        user_id,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.lawyer_id,
        INSERTED.firm_id,
        INSERTED.full_name,
        INSERTED.full_name_arabic,
        INSERTED.email,
        INSERTED.phone,
        INSERTED.mobile,
        INSERTED.role,
        INSERTED.hourly_rate,
        INSERTED.hourly_rate_currency,
        INSERTED.hire_date,
        INSERTED.is_active,
        INSERTED.user_id,
        INSERTED.notes,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @full_name,
        @full_name_arabic,
        @email,
        @phone,
        @mobile,
        @role,
        @hourly_rate,
        @hourly_rate_currency,
        @hire_date,
        @is_active,
        @user_id,
        @notes,
        @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        full_name,
        full_name_arabic: full_name_arabic || null,
        email: email || null,
        phone: phone || null,
        mobile: mobile || null,
        role: role || 'associate',
        hourly_rate: hourly_rate != null ? hourly_rate : null,
        hourly_rate_currency: hourly_rate_currency || 'USD',
        hire_date: hire_date || null,
        is_active: is_active !== undefined ? is_active : true,
        user_id: user_id || null,
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      lawyer: result.recordset[0]
    });

  } catch (error) {
    // Handle unique constraint violation (duplicate email within firm)
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        success: false,
        error: 'A lawyer with this email already exists in your firm'
      });
    }
    console.error('Create lawyer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lawyer'
    });
  }
});

// ==================== PUT /api/lawyers/:id ====================
// Update lawyer (firm-scoped)

router.put('/:id', validateBody('lawyer_saas'), async (req, res) => {
  const {
    full_name,
    full_name_arabic,
    email,
    phone,
    mobile,
    role,
    hourly_rate,
    hourly_rate_currency,
    hire_date,
    is_active,
    user_id,
    notes
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lawyer ID'
      });
    }

    // Verify lawyer exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT lawyer_id, is_active, role, hourly_rate_currency FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        lawyer_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lawyer not found'
      });
    }

    const result = await db.execute(
      `UPDATE lawyers
      SET
        full_name = @full_name,
        full_name_arabic = @full_name_arabic,
        email = @email,
        phone = @phone,
        mobile = @mobile,
        role = @role,
        hourly_rate = @hourly_rate,
        hourly_rate_currency = @hourly_rate_currency,
        hire_date = @hire_date,
        is_active = @is_active,
        user_id = @user_id,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.lawyer_id,
        INSERTED.firm_id,
        INSERTED.full_name,
        INSERTED.full_name_arabic,
        INSERTED.email,
        INSERTED.phone,
        INSERTED.mobile,
        INSERTED.role,
        INSERTED.hourly_rate,
        INSERTED.hourly_rate_currency,
        INSERTED.hire_date,
        INSERTED.is_active,
        INSERTED.user_id,
        INSERTED.notes,
        INSERTED.updated_at
      WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id`,
      {
        lawyer_id: id,
        firm_id: req.user.firm_id,
        full_name,
        full_name_arabic: full_name_arabic || null,
        email: email || null,
        phone: phone || null,
        mobile: mobile || null,
        role: role || existing.role,
        hourly_rate: hourly_rate != null ? hourly_rate : null,
        hourly_rate_currency: hourly_rate_currency || existing.hourly_rate_currency,
        hire_date: hire_date || null,
        is_active: is_active !== undefined ? is_active : existing.is_active,
        user_id: user_id || null,
        notes: notes || null
      }
    );

    res.json({
      success: true,
      lawyer: result.recordset[0]
    });

  } catch (error) {
    // Handle unique constraint violation (duplicate email within firm)
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        success: false,
        error: 'A lawyer with this email already exists in your firm'
      });
    }
    console.error('Update lawyer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lawyer'
    });
  }
});

// ==================== DELETE /api/lawyers/:id ====================
// Soft delete lawyer (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lawyer ID'
      });
    }

    // Verify lawyer exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        lawyer_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lawyer not found'
      });
    }

    await db.execute(
      `UPDATE lawyers
      SET is_deleted = 1, is_active = 0, updated_at = GETUTCDATE()
      WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id`,
      {
        lawyer_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Lawyer deleted successfully'
    });

  } catch (error) {
    console.error('Delete lawyer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lawyer'
    });
  }
});

module.exports = router;
