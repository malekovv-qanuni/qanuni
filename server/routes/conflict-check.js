/**
 * Qanuni SaaS - Conflict Check Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Searches clients, matters, and matter_clients for potential conflicts.
 *
 * 5 of 8 desktop searches implemented. Deferred:
 * - registration_number (needs ALTER TABLE clients)
 * - vat_number (needs ALTER TABLE clients)
 * - shareholders/directors (needs corporate tables in SaaS)
 * - adverse_parties (needs column on matters)
 *
 * Handles two body formats from api-client.js:
 *   checkConflicts(data) -> body is raw searchData
 *   conflictCheck(terms) -> body is { searchTerms: terms }
 *
 * @version 1.0.0 (Week 4 Day 19)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== POST /api/conflict-check/search ====================
// Check for conflicts across clients, matters, matter_clients

router.post('/search', async (req, res) => {
  try {
    // Handle both body formats from api-client.js
    const searchTerms = req.body.searchTerms || req.body;
    const firm_id = req.user.firm_id;

    const results = [];
    const searchesPerformed = [];
    const searchesDeferred = [
      'registration_number',
      'vat_number',
      'shareholders',
      'directors',
      'adverse_parties'
    ];

    // Extract search fields
    const {
      client_name, name,
      email,
      phone, mobile
    } = searchTerms;

    // Use client_name or name (desktop sends name, some forms send client_name)
    const nameSearch = client_name || name;

    // 1. Client name match
    if (nameSearch) {
      searchesPerformed.push('client_name');
      const clients = await db.getAll(
        `SELECT client_id, client_name, client_name_arabic, email, phone, mobile, client_type
        FROM clients
        WHERE firm_id = @firm_id AND is_deleted = 0 AND is_active = 1
          AND (
            client_name LIKE '%' + @search + '%'
            OR client_name_arabic LIKE '%' + @search + '%'
          )`,
        { firm_id, search: nameSearch }
      );
      for (const c of clients) {
        results.push({
          type: 'client',
          id: c.client_id,
          name: c.client_name,
          name_arabic: c.client_name_arabic,
          match_field: 'client_name',
          details: { email: c.email, phone: c.phone, client_type: c.client_type }
        });
      }
    }

    // 2. Client email match
    if (email) {
      searchesPerformed.push('client_email');
      const clients = await db.getAll(
        `SELECT client_id, client_name, client_name_arabic, email
        FROM clients
        WHERE firm_id = @firm_id AND is_deleted = 0 AND is_active = 1
          AND email LIKE '%' + @search + '%'`,
        { firm_id, search: email }
      );
      for (const c of clients) {
        // Avoid duplicates if already found by name
        if (!results.some(r => r.type === 'client' && r.id === c.client_id)) {
          results.push({
            type: 'client',
            id: c.client_id,
            name: c.client_name,
            name_arabic: c.client_name_arabic,
            match_field: 'client_email',
            details: { email: c.email }
          });
        }
      }
    }

    // 3. Client phone/mobile match
    if (phone || mobile) {
      searchesPerformed.push('client_phone');
      const phoneSearch = phone || mobile;
      const clients = await db.getAll(
        `SELECT client_id, client_name, client_name_arabic, phone, mobile
        FROM clients
        WHERE firm_id = @firm_id AND is_deleted = 0 AND is_active = 1
          AND (
            phone LIKE '%' + @search + '%'
            OR mobile LIKE '%' + @search + '%'
          )`,
        { firm_id, search: phoneSearch }
      );
      for (const c of clients) {
        if (!results.some(r => r.type === 'client' && r.id === c.client_id)) {
          results.push({
            type: 'client',
            id: c.client_id,
            name: c.client_name,
            name_arabic: c.client_name_arabic,
            match_field: 'client_phone',
            details: { phone: c.phone, mobile: c.mobile }
          });
        }
      }
    }

    // 4. Matter client names (via matter_clients junction)
    if (nameSearch) {
      searchesPerformed.push('matter_client_names');
      const matterClients = await db.getAll(
        `SELECT DISTINCT m.matter_id, m.matter_name, m.matter_number, c.client_name
        FROM matter_clients mc
        INNER JOIN matters m ON mc.matter_id = m.matter_id
        INNER JOIN clients c ON mc.client_id = c.client_id
        WHERE m.firm_id = @firm_id AND m.is_deleted = 0
          AND (
            c.client_name LIKE '%' + @search + '%'
            OR c.client_name_arabic LIKE '%' + @search + '%'
          )`,
        { firm_id, search: nameSearch }
      );
      for (const mc of matterClients) {
        results.push({
          type: 'matter_client',
          id: mc.matter_id,
          name: mc.matter_name,
          match_field: 'matter_client_name',
          details: { matter_number: mc.matter_number, client_name: mc.client_name }
        });
      }
    }

    // 5. Matter title match
    if (nameSearch) {
      searchesPerformed.push('matter_names');
      const matters = await db.getAll(
        `SELECT matter_id, matter_name, matter_name_arabic, matter_number
        FROM matters
        WHERE firm_id = @firm_id AND is_deleted = 0
          AND (
            matter_name LIKE '%' + @search + '%'
            OR matter_name_arabic LIKE '%' + @search + '%'
          )`,
        { firm_id, search: nameSearch }
      );
      for (const m of matters) {
        results.push({
          type: 'matter',
          id: m.matter_id,
          name: m.matter_name,
          name_arabic: m.matter_name_arabic,
          match_field: 'matter_name',
          details: { matter_number: m.matter_number }
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        search_terms: searchTerms,
        searches_performed: searchesPerformed,
        searches_deferred: searchesDeferred,
        total_matches: results.length
      }
    });

  } catch (error) {
    console.error('Conflict check search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform conflict check'
    });
  }
});

// ==================== POST /api/conflict-check/log ====================
// Log a conflict check for audit trail

router.post('/log', async (req, res) => {
  try {
    const { search_terms, searchTerms, results_count } = req.body;
    const terms = search_terms || searchTerms;

    if (!terms) {
      return res.status(400).json({
        success: false,
        error: 'search_terms is required'
      });
    }

    const result = await db.execute(
      `INSERT INTO conflict_check_log (
        firm_id,
        search_terms,
        results_count,
        checked_by
      )
      OUTPUT
        INSERTED.log_id,
        INSERTED.firm_id,
        INSERTED.search_terms,
        INSERTED.results_count,
        INSERTED.checked_by,
        INSERTED.checked_at
      VALUES (
        @firm_id,
        @search_terms,
        @results_count,
        @checked_by
      )`,
      {
        firm_id: req.user.firm_id,
        search_terms: typeof terms === 'string' ? terms : JSON.stringify(terms),
        results_count: results_count || 0,
        checked_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      log: result.recordset[0]
    });

  } catch (error) {
    console.error('Log conflict check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log conflict check'
    });
  }
});

// ==================== GET /api/conflict-check/history ====================
// Get conflict check history (SaaS-only feature)

router.get('/history', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const firm_id = req.user.firm_id;

    const countResult = await db.getOne(
      'SELECT COUNT(*) as total FROM conflict_check_log WHERE firm_id = @firm_id',
      { firm_id }
    );
    const total = countResult.total;

    const logs = await db.getAll(
      `SELECT
        cl.log_id,
        cl.firm_id,
        cl.search_terms,
        cl.results_count,
        cl.checked_by,
        cl.checked_at,
        u.full_name as checked_by_name
      FROM conflict_check_log cl
      INNER JOIN users u ON cl.checked_by = u.user_id
      WHERE cl.firm_id = @firm_id
      ORDER BY cl.checked_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { firm_id, offset, limit }
    );

    res.json({
      success: true,
      data: logs,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get conflict check history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conflict check history'
    });
  }
});

module.exports = router;
