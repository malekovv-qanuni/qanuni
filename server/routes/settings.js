/**
 * Settings API Routes (SaaS)
 * 23 endpoints: settings CRUD, firm info, currencies, exchange rates,
 *               category settings, number generators
 *
 * Electron-only handlers (backup/restore/export) NOT included.
 *
 * @version 2.0.0 (Day 21 - Full rewrite for SaaS)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Apply authentication to all routes
router.use(authenticate);

// ============================================================================
// SETTINGS CRUD
// ============================================================================

// GET /api/settings - Get all settings for firm
router.get('/', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const settings = await db.getAll(
      `SELECT setting_key, setting_value, setting_type, category
       FROM settings
       WHERE firm_id = @firm_id
       ORDER BY category, setting_key`,
      { firm_id: firmId }
    );
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/by-key/:key - Get single setting by key
router.get('/by-key/:key', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const setting = await db.getOne(
      `SELECT setting_key, setting_value, setting_type, category
       FROM settings
       WHERE firm_id = @firm_id AND setting_key = @key`,
      { firm_id: firmId, key: req.params.key }
    );

    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch setting' });
  }
});

// POST /api/settings - Upsert single setting
router.post('/', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const { key, value, type = 'string', category = 'general' } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Setting key is required' });
    }

    await db.execute(
      `MERGE INTO settings AS target
       USING (SELECT @firm_id AS firm_id, @key AS setting_key) AS source
       ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
       WHEN MATCHED THEN
         UPDATE SET setting_value = @value, setting_type = @type, category = @category, updated_at = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
         VALUES (@firm_id, @key, @value, @type, @category, GETUTCDATE(), GETUTCDATE());`,
      { firm_id: firmId, key, value: value != null ? String(value) : null, type, category }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ success: false, error: 'Failed to save setting' });
  }
});

// PUT /api/settings - Batch update multiple settings
router.put('/', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const settings = req.body;

    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ success: false, error: 'Settings must be an object' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.execute(
        `MERGE INTO settings AS target
         USING (SELECT @firm_id AS firm_id, @key AS setting_key) AS source
         ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
         WHEN MATCHED THEN
           UPDATE SET setting_value = @value, updated_at = GETUTCDATE()
         WHEN NOT MATCHED THEN
           INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
           VALUES (@firm_id, @key, @value, 'string', 'general', GETUTCDATE(), GETUTCDATE());`,
        { firm_id: firmId, key, value: value != null ? String(value) : null }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ============================================================================
// FIRM INFO
// ============================================================================

// GET /api/settings/firm-info
router.get('/firm-info', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const settings = await db.getAll(
      `SELECT setting_key, setting_value
       FROM settings
       WHERE firm_id = @firm_id
         AND (category = 'firm'
              OR setting_key LIKE 'firm_%'
              OR setting_key LIKE 'default_%'
              OR setting_key = 'lawyer_advance_min_balance')`,
      { firm_id: firmId }
    );

    // Convert array to object (matches desktop getFirmInfo pattern)
    const firmInfo = {};
    settings.forEach(s => { firmInfo[s.setting_key] = s.setting_value; });

    res.json({ success: true, data: firmInfo });
  } catch (error) {
    console.error('Error fetching firm info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch firm info' });
  }
});

// PUT /api/settings/firm-info
router.put('/firm-info', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const firmInfo = req.body;

    for (const [key, value] of Object.entries(firmInfo)) {
      await db.execute(
        `MERGE INTO settings AS target
         USING (SELECT @firm_id AS firm_id, @key AS setting_key) AS source
         ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
         WHEN MATCHED THEN
           UPDATE SET setting_value = @value, updated_at = GETUTCDATE()
         WHEN NOT MATCHED THEN
           INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
           VALUES (@firm_id, @key, @value, 'string', 'firm', GETUTCDATE(), GETUTCDATE());`,
        { firm_id: firmId, key, value: value != null ? String(value) : null }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating firm info:', error);
    res.status(500).json({ success: false, error: 'Failed to update firm info' });
  }
});

// ============================================================================
// CURRENCIES
// ============================================================================

// GET /api/settings/currencies
router.get('/currencies', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const currencies = await db.getAll(
      `SELECT id, code, name, name_ar, symbol, sort_order, is_active
       FROM firm_currencies
       WHERE (firm_id = @firm_id OR firm_id IS NULL) AND is_active = 1
       ORDER BY sort_order, name`,
      { firm_id: firmId }
    );
    res.json({ success: true, data: currencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch currencies' });
  }
});

// POST /api/settings/currencies
router.post('/currencies', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const { code, name, name_ar, symbol, sort_order } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Code and name are required' });
    }

    // Auto-calculate sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder == null) {
      const maxSort = await db.getOne(
        `SELECT MAX(sort_order) as max_sort FROM firm_currencies WHERE firm_id = @firm_id OR firm_id IS NULL`,
        { firm_id: firmId }
      );
      finalSortOrder = (maxSort?.max_sort || 0) + 1;
    }

    const result = await db.getOne(
      `INSERT INTO firm_currencies (firm_id, code, name, name_ar, symbol, sort_order, created_at, updated_at)
       OUTPUT INSERTED.id
       VALUES (@firm_id, @code, @name, @name_ar, @symbol, @sort_order, GETUTCDATE(), GETUTCDATE())`,
      {
        firm_id: firmId,
        code: code.toUpperCase(),
        name,
        name_ar: name_ar || null,
        symbol: symbol || null,
        sort_order: finalSortOrder
      }
    );

    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating currency:', error);
    if (error.message && error.message.includes('UQ_firm_currencies_code')) {
      return res.status(400).json({ success: false, error: 'Currency code already exists for this firm' });
    }
    res.status(500).json({ success: false, error: 'Failed to create currency' });
  }
});

// PUT /api/settings/currencies/:id
router.put('/currencies/:id', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const id = parseInt(req.params.id);
    const { code, name, name_ar, symbol, sort_order } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Code and name are required' });
    }

    // Only allow updating firm-owned currencies (not system ones where firm_id IS NULL)
    const result = await db.execute(
      `UPDATE firm_currencies
       SET code = @code, name = @name, name_ar = @name_ar, symbol = @symbol,
           sort_order = @sort_order, updated_at = GETUTCDATE()
       WHERE id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: firmId,
        code: code.toUpperCase(),
        name,
        name_ar: name_ar || null,
        symbol: symbol || null,
        sort_order: sort_order != null ? sort_order : 0
      }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Currency not found or is a system currency' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating currency:', error);
    res.status(500).json({ success: false, error: 'Failed to update currency' });
  }
});

// DELETE /api/settings/currencies/:id (soft delete)
router.delete('/currencies/:id', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const id = parseInt(req.params.id);

    // Only allow deleting firm-owned currencies
    const result = await db.execute(
      `UPDATE firm_currencies
       SET is_active = 0, updated_at = GETUTCDATE()
       WHERE id = @id AND firm_id = @firm_id`,
      { id, firm_id: firmId }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Currency not found or is a system currency' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting currency:', error);
    res.status(500).json({ success: false, error: 'Failed to delete currency' });
  }
});

// ============================================================================
// EXCHANGE RATES
// NOTE: /exchange-rates/for-date MUST be defined BEFORE /exchange-rates/:id
//       to prevent Express matching "for-date" as :id
// ============================================================================

// GET /api/settings/exchange-rates/for-date
router.get('/exchange-rates/for-date', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        error: 'from, to, and date query parameters are required'
      });
    }

    const rate = await db.getOne(
      `SELECT TOP 1 rate_id, from_currency, to_currency, rate, effective_date
       FROM exchange_rates
       WHERE firm_id = @firm_id
         AND from_currency = @from
         AND to_currency = @to
         AND effective_date <= @date
       ORDER BY effective_date DESC`,
      { firm_id: firmId, from, to, date }
    );

    if (!rate) {
      return res.status(404).json({
        success: false,
        error: 'No exchange rate found for ' + from + ' to ' + to + ' on or before ' + date
      });
    }

    res.json({ success: true, data: rate });
  } catch (error) {
    console.error('Error fetching exchange rate for date:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rate' });
  }
});

// GET /api/settings/exchange-rates
router.get('/exchange-rates', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const rates = await db.getAll(
      `SELECT rate_id, from_currency, to_currency, rate, effective_date, notes
       FROM exchange_rates
       WHERE firm_id = @firm_id
       ORDER BY effective_date DESC, from_currency, to_currency`,
      { firm_id: firmId }
    );
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rates' });
  }
});

// POST /api/settings/exchange-rates
router.post('/exchange-rates', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const { from_currency, to_currency, rate, effective_date, notes } = req.body;

    if (!from_currency || !to_currency || rate == null || !effective_date) {
      return res.status(400).json({
        success: false,
        error: 'from_currency, to_currency, rate, and effective_date are required'
      });
    }

    const result = await db.getOne(
      `INSERT INTO exchange_rates (firm_id, from_currency, to_currency, rate, effective_date, notes, created_at, updated_at)
       OUTPUT INSERTED.rate_id
       VALUES (@firm_id, @from_currency, @to_currency, @rate, @effective_date, @notes, GETUTCDATE(), GETUTCDATE())`,
      {
        firm_id: firmId,
        from_currency,
        to_currency,
        rate: parseFloat(rate),
        effective_date,
        notes: notes || null
      }
    );

    res.json({ success: true, id: result.rate_id });
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(500).json({ success: false, error: 'Failed to create exchange rate' });
  }
});

// PUT /api/settings/exchange-rates/:id
router.put('/exchange-rates/:id', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const id = parseInt(req.params.id);
    const { from_currency, to_currency, rate, effective_date, notes } = req.body;

    if (!from_currency || !to_currency || rate == null || !effective_date) {
      return res.status(400).json({
        success: false,
        error: 'from_currency, to_currency, rate, and effective_date are required'
      });
    }

    const result = await db.execute(
      `UPDATE exchange_rates
       SET from_currency = @from_currency, to_currency = @to_currency, rate = @rate,
           effective_date = @effective_date, notes = @notes, updated_at = GETUTCDATE()
       WHERE rate_id = @id AND firm_id = @firm_id`,
      {
        id,
        firm_id: firmId,
        from_currency,
        to_currency,
        rate: parseFloat(rate),
        effective_date,
        notes: notes || null
      }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ success: false, error: 'Failed to update exchange rate' });
  }
});

// DELETE /api/settings/exchange-rates/:id (HARD delete - intentional, matches desktop)
router.delete('/exchange-rates/:id', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const id = parseInt(req.params.id);

    const result = await db.execute(
      `DELETE FROM exchange_rates WHERE rate_id = @id AND firm_id = @firm_id`,
      { id, firm_id: firmId }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({ success: false, error: 'Failed to delete exchange rate' });
  }
});

// ============================================================================
// CATEGORY-SPECIFIC SETTINGS (invoice, timesheet)
// ============================================================================

// GET /api/settings/invoice
router.get('/invoice', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const setting = await db.getOne(
      `SELECT setting_value FROM settings
       WHERE firm_id = @firm_id AND setting_key = 'invoice_settings'`,
      { firm_id: firmId }
    );

    const invoiceSettings = setting ? JSON.parse(setting.setting_value) : {};
    res.json({ success: true, data: invoiceSettings });
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice settings' });
  }
});

// PUT /api/settings/invoice
router.put('/invoice', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const invoiceSettings = req.body;

    await db.execute(
      `MERGE INTO settings AS target
       USING (SELECT @firm_id AS firm_id, 'invoice_settings' AS setting_key) AS source
       ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
       WHEN MATCHED THEN
         UPDATE SET setting_value = @value, updated_at = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
         VALUES (@firm_id, 'invoice_settings', @value, 'json', 'invoicing', GETUTCDATE(), GETUTCDATE());`,
      { firm_id: firmId, value: JSON.stringify(invoiceSettings) }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice settings' });
  }
});

// GET /api/settings/timesheet
router.get('/timesheet', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const setting = await db.getOne(
      `SELECT setting_value FROM settings
       WHERE firm_id = @firm_id AND setting_key = 'timesheet_settings'`,
      { firm_id: firmId }
    );

    const timesheetSettings = setting ? JSON.parse(setting.setting_value) : {};
    res.json({ success: true, data: timesheetSettings });
  } catch (error) {
    console.error('Error fetching timesheet settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch timesheet settings' });
  }
});

// PUT /api/settings/timesheet
router.put('/timesheet', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const timesheetSettings = req.body;

    await db.execute(
      `MERGE INTO settings AS target
       USING (SELECT @firm_id AS firm_id, 'timesheet_settings' AS setting_key) AS source
       ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
       WHEN MATCHED THEN
         UPDATE SET setting_value = @value, updated_at = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
         VALUES (@firm_id, 'timesheet_settings', @value, 'json', 'timesheets', GETUTCDATE(), GETUTCDATE());`,
      { firm_id: firmId, value: JSON.stringify(timesheetSettings) }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating timesheet settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update timesheet settings' });
  }
});

// ============================================================================
// NUMBER GENERATORS
// ============================================================================

// GET /api/settings/next-invoice-number (delegates to invoice counting logic)
router.get('/next-invoice-number', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const year = new Date().getFullYear();

    // Count invoices for current year - uses issue_date (verified from schema-invoices.sql)
    const result = await db.getOne(
      `SELECT COUNT(*) as count FROM invoices
       WHERE firm_id = @firm_id AND invoice_number LIKE @pattern`,
      { firm_id: firmId, pattern: 'INV-' + year + '-%' }
    );

    const nextNumber = (result.count || 0) + 1;
    const invoiceNumber = 'INV-' + year + '-' + String(nextNumber).padStart(4, '0');

    res.json({ success: true, number: invoiceNumber });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice number' });
  }
});

// POST /api/settings/increment-invoice-number
router.post('/increment-invoice-number', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const year = new Date().getFullYear();

    // Invoice number auto-increments based on count (no explicit counter needed)
    const result = await db.getOne(
      `SELECT COUNT(*) as count FROM invoices
       WHERE firm_id = @firm_id AND invoice_number LIKE @pattern`,
      { firm_id: firmId, pattern: 'INV-' + year + '-%' }
    );

    const nextNumber = (result.count || 0) + 1;
    const invoiceNumber = 'INV-' + year + '-' + String(nextNumber).padStart(4, '0');

    res.json({ success: true, number: invoiceNumber });
  } catch (error) {
    console.error('Error incrementing invoice number:', error);
    res.status(500).json({ success: false, error: 'Failed to increment invoice number' });
  }
});

// GET /api/settings/next-receipt-number
router.get('/next-receipt-number', async (req, res) => {
  try {
    const firmId = req.user.firm_id;
    const setting = await db.getOne(
      `SELECT setting_value FROM settings
       WHERE firm_id = @firm_id AND setting_key = 'next_receipt_number'`,
      { firm_id: firmId }
    );

    const year = new Date().getFullYear();
    const receiptNumber = setting ? setting.setting_value : 'RCPT-' + year + '-0001';
    res.json({ success: true, number: receiptNumber });
  } catch (error) {
    console.error('Error fetching receipt number:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch receipt number' });
  }
});

// POST /api/settings/increment-receipt-number
router.post('/increment-receipt-number', async (req, res) => {
  try {
    const firmId = req.user.firm_id;

    // Get current receipt number
    const setting = await db.getOne(
      `SELECT setting_value FROM settings
       WHERE firm_id = @firm_id AND setting_key = 'next_receipt_number'`,
      { firm_id: firmId }
    );

    const year = new Date().getFullYear();
    let currentNumber = setting ? setting.setting_value : 'RCPT-' + year + '-0001';

    // Parse and increment
    const match = currentNumber.match(/RCPT-(\d{4})-(\d{4})/);
    let nextNumber;
    if (match) {
      const rcptYear = parseInt(match[1]);
      const num = parseInt(match[2]);
      nextNumber = 'RCPT-' + rcptYear + '-' + String(num + 1).padStart(4, '0');
    } else {
      nextNumber = 'RCPT-' + year + '-0001';
    }

    // Save incremented number
    await db.execute(
      `MERGE INTO settings AS target
       USING (SELECT @firm_id AS firm_id, 'next_receipt_number' AS setting_key) AS source
       ON target.firm_id = source.firm_id AND target.setting_key = source.setting_key
       WHEN MATCHED THEN
         UPDATE SET setting_value = @value, updated_at = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (firm_id, setting_key, setting_value, setting_type, category, created_at, updated_at)
         VALUES (@firm_id, 'next_receipt_number', @value, 'string', 'general', GETUTCDATE(), GETUTCDATE());`,
      { firm_id: firmId, value: nextNumber }
    );

    res.json({ success: true, number: nextNumber });
  } catch (error) {
    console.error('Error incrementing receipt number:', error);
    res.status(500).json({ success: false, error: 'Failed to increment receipt number' });
  }
});

module.exports = router;
