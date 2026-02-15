/**
 * Client Imports API Routes (SaaS)
 *
 * POST /api/client-imports — Import clients from JSON rows
 *
 * Ported from electron/ipc/client-imports.js importClientsFromRows()
 * Adapted for SQL Server + firm_id multi-tenancy
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// SHARED CONFIG (copied from desktop module)
// ============================================================================

const HEADER_MAP = {
  'client name': 'client_name',
  'client name (english)': 'client_name',
  'client name *': 'client_name',
  'client name (arabic)': 'client_name_arabic',
  'client type': 'client_type',
  'entity type': 'entity_type',
  'custom id': 'custom_id',
  'registration no.': 'registration_number',
  'registration no': 'registration_number',
  'registration number': 'registration_number',
  'vat number': 'vat_number',
  'main contact': 'main_contact',
  'email': 'email',
  'phone': 'phone',
  'mobile': 'mobile',
  'address': 'address',
  'website': 'website',
  'industry': 'industry',
  'currency': 'default_currency',
  'default currency': 'default_currency',
  'default_currency': 'default_currency',
  'billing terms': 'billing_terms',
  'source': 'source',
  'notes': 'notes',
};

const ENTITY_TYPE_MAP = {
  'joint stock company (sal)': 'SAL',
  'limited liability company (sarl)': 'SARL',
  'holding company (holding)': 'HOLDING',
  'offshore company (offshore)': 'OFFSHORE',
  'general partnership (partnership)': 'PARTNERSHIP',
  'limited partnership (limited_partner)': 'LIMITED_PARTNER',
  'foreign branch (branch)': 'BRANCH',
  'representative office (rep_office)': 'REP_OFFICE',
  'sole proprietorship (sole_prop)': 'SOLE_PROP',
  'non-profit organization (ngo)': 'NGO',
  'civil company (civil)': 'CIVIL',
  'single partner offshore (single_offshore)': 'SINGLE_OFFSHORE',
  'single partner sarl (single_sarl)': 'SINGLE_SARL',
};

const VALID_CLIENT_TYPES = ['individual', 'company', 'legal_entity'];

// ============================================================================
// POST /api/client-imports — Import clients from JSON rows
// Body: { rows: [{ "Client Name *": "...", ... }, ...] }
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const { rows } = req.body;
    const firm_id = req.user.firm_id;
    const created_by = req.user.id;

    if (!rows || !Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ success: false, error: 'No data provided. Send { rows: [...] }' });
    }

    // Normalize headers and map to DB field names
    const normalizedRows = rows.map(row => {
      const clean = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.replace(/\s*\*\s*/g, '').trim();
        const dbField = HEADER_MAP[cleanKey.toLowerCase()] || cleanKey.replace(/\s+/g, '_').toLowerCase();
        clean[dbField] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      });
      return clean;
    });

    // Validate — must have client_name
    const validRows = normalizedRows.filter(r => r.client_name && r.client_name.toString().trim());
    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        error: 'No rows with "Client Name" found. Make sure the column header is "Client Name *".'
      });
    }

    // Get existing client names (for this firm) to skip duplicates
    const existing = await db.getAll(
      'SELECT client_name FROM clients WHERE firm_id = @firm_id AND is_deleted = 0',
      { firm_id }
    );
    const existingNames = new Set(existing.map(c => c.client_name.toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNum = i + 2; // account for header row

      try {
        const name = row.client_name.toString().trim();

        // Skip duplicates
        if (existingNames.has(name.toLowerCase())) {
          skipped++;
          continue;
        }

        // Normalize client_type
        const rawType = row.client_type?.toString().toLowerCase() || '';
        let clientType = 'individual';
        if (rawType === 'company' || rawType === 'legal_entity' || rawType === 'legal entity') {
          clientType = 'legal_entity';
        } else if (VALID_CLIENT_TYPES.includes(rawType)) {
          clientType = rawType;
        }

        // SaaS clients table columns: client_name, client_name_arabic, client_type,
        // email, phone, mobile, address, notes, firm_id, created_by, is_active
        // (No entity_type, custom_id, registration_number, vat_number, main_contact,
        //  website, industry, default_currency, billing_terms, source in SaaS schema)
        await db.execute(`
          INSERT INTO clients (firm_id, client_name, client_name_arabic, client_type,
            email, phone, mobile, address, notes, is_active, created_by)
          VALUES (@firm_id, @client_name, @client_name_arabic, @client_type,
            @email, @phone, @mobile, @address, @notes, 1, @created_by)
        `, {
          firm_id,
          client_name: name,
          client_name_arabic: row.client_name_arabic || null,
          client_type: clientType,
          email: row.email || null,
          phone: row.phone || null,
          mobile: row.mobile || null,
          address: row.address || null,
          notes: row.notes || null,
          created_by
        });

        existingNames.add(name.toLowerCase()); // prevent dupes within same batch
        imported++;
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    const result = {
      success: true,
      imported,
      skipped,
      total: validRows.length,
      errors: errors.length ? errors.slice(0, 10) : []
    };

    res.status(imported > 0 ? 201 : 200).json(result);
  } catch (error) {
    console.error('POST /api/client-imports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
