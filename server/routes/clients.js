/**
 * Qanuni SaaS - Client CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 *
 * @version 1.0.0 (Week 1 Day 4)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/clients ====================
// List all clients for the user's firm

router.get('/', async (req, res) => {
  try {
    const clients = await db.getAll(
      `SELECT
        client_id,
        firm_id,
        client_name,
        client_name_arabic,
        client_type,
        email,
        phone,
        mobile,
        address,
        address_arabic,
        notes,
        is_active,
        created_at,
        updated_at
      FROM clients
      WHERE firm_id = @firm_id AND is_deleted = 0
      ORDER BY client_name`,
      { firm_id: req.user.firm_id }
    );

    res.json({
      success: true,
      count: clients.length,
      clients
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve clients'
    });
  }
});

// ==================== GET /api/clients/:id ====================
// Get single client (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    // Validate ID is numeric
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }

    const client = await db.getOne(
      `SELECT
        client_id,
        firm_id,
        client_name,
        client_name_arabic,
        client_type,
        email,
        phone,
        mobile,
        address,
        address_arabic,
        notes,
        is_active,
        created_at,
        updated_at
      FROM clients
      WHERE client_id = @client_id
        AND firm_id = @firm_id
        AND is_deleted = 0`,
      {
        client_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      client
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve client'
    });
  }
});

// ==================== POST /api/clients ====================
// Create new client

router.post('/', validateBody('client_saas'), async (req, res) => {
  const {
    client_name,
    client_name_arabic,
    client_type,
    email,
    phone,
    mobile,
    address,
    address_arabic,
    notes
  } = req.body;

  try {
    const result = await db.execute(
      `INSERT INTO clients (
        firm_id,
        client_name,
        client_name_arabic,
        client_type,
        email,
        phone,
        mobile,
        address,
        address_arabic,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.client_id,
        INSERTED.firm_id,
        INSERTED.client_name,
        INSERTED.client_name_arabic,
        INSERTED.client_type,
        INSERTED.email,
        INSERTED.phone,
        INSERTED.mobile,
        INSERTED.address,
        INSERTED.address_arabic,
        INSERTED.notes,
        INSERTED.is_active,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @client_name,
        @client_name_arabic,
        @client_type,
        @email,
        @phone,
        @mobile,
        @address,
        @address_arabic,
        @notes,
        @created_by
      )`,
      {
        firm_id: req.user.firm_id,
        client_name,
        client_name_arabic: client_name_arabic || null,
        client_type: client_type || 'individual',
        email: email || null,
        phone: phone || null,
        mobile: mobile || null,
        address: address || null,
        address_arabic: address_arabic || null,
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      client: result.recordset[0]
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client'
    });
  }
});

// ==================== PUT /api/clients/:id ====================
// Update client (firm-scoped)

router.put('/:id', validateBody('client_saas'), async (req, res) => {
  const {
    client_name,
    client_name_arabic,
    client_type,
    email,
    phone,
    mobile,
    address,
    address_arabic,
    notes,
    is_active
  } = req.body;

  try {
    // Validate ID is numeric
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }

    // Verify client exists and belongs to user's firm (also fetch is_active for safe default)
    const existing = await db.getOne(
      'SELECT client_id, is_active FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        client_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const result = await db.execute(
      `UPDATE clients
      SET
        client_name = @client_name,
        client_name_arabic = @client_name_arabic,
        client_type = @client_type,
        email = @email,
        phone = @phone,
        mobile = @mobile,
        address = @address,
        address_arabic = @address_arabic,
        notes = @notes,
        is_active = @is_active,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.client_id,
        INSERTED.firm_id,
        INSERTED.client_name,
        INSERTED.client_name_arabic,
        INSERTED.client_type,
        INSERTED.email,
        INSERTED.phone,
        INSERTED.mobile,
        INSERTED.address,
        INSERTED.address_arabic,
        INSERTED.notes,
        INSERTED.is_active,
        INSERTED.updated_at
      WHERE client_id = @client_id AND firm_id = @firm_id`,
      {
        client_id: id,
        firm_id: req.user.firm_id,
        client_name,
        client_name_arabic: client_name_arabic || null,
        client_type: client_type || 'individual',
        email: email || null,
        phone: phone || null,
        mobile: mobile || null,
        address: address || null,
        address_arabic: address_arabic || null,
        notes: notes || null,
        // Default to existing value instead of true - prevents accidental reactivation
        is_active: is_active !== undefined ? is_active : existing.is_active
      }
    );

    res.json({
      success: true,
      client: result.recordset[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client'
    });
  }
});

// ==================== DELETE /api/clients/:id ====================
// Soft delete client (firm-scoped)

router.delete('/:id', async (req, res) => {
  try {
    // Validate ID is numeric
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }

    // Verify client exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT client_id FROM clients WHERE client_id = @client_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        client_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    await db.execute(
      `UPDATE clients
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE client_id = @client_id AND firm_id = @firm_id`,
      {
        client_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client'
    });
  }
});

module.exports = router;
