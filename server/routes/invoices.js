/**
 * Qanuni SaaS - Invoices CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Invoices have 1:many invoice_items (embedded in create/update).
 * Totals are client-provided (frontend calculates).
 * Invoice number: auto-generated INV-YYYY-NNNN or user-provided custom.
 *
 * Note: PDF generation is IPC-only (uses Electron APIs) - not available in SaaS.
 *
 * @version 1.0.0 (Week 4 Day 17)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/invoices/next-number ====================
// Generate next invoice number (INV-YYYY-NNNN pattern)
// MUST be defined before /:id route to avoid matching "next-number" as :id

router.get('/next-number', async (req, res) => {
  try {
    const firm_id = req.user.firm_id;
    const year = new Date().getFullYear();
    const pattern = `INV-${year}-%`;

    const countResult = await db.getOne(
      `SELECT COUNT(*) as count FROM invoices
       WHERE firm_id = @firm_id AND invoice_number LIKE @pattern`,
      { firm_id, pattern }
    );
    const num = (countResult.count || 0) + 1;
    const invoice_number = `INV-${year}-${num.toString().padStart(4, '0')}`;

    res.json({
      success: true,
      invoice_number
    });

  } catch (error) {
    console.error('Generate invoice number error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice number'
    });
  }
});

// ==================== GET /api/invoices ====================
// List all invoices for the user's firm
// Query params: ?client_id=123, ?matter_id=456, ?status=draft, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, client_id, matter_id, status } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE i.firm_id = @firm_id AND i.is_deleted = 0';

    if (search) {
      where += ` AND (
        i.invoice_number LIKE '%' + @search + '%' OR
        i.client_reference LIKE '%' + @search + '%' OR
        i.notes_to_client LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (client_id) {
      const cid = parseInt(client_id);
      if (!isNaN(cid)) {
        where += ' AND i.client_id = @client_id';
        params.client_id = cid;
      }
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND i.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (status) {
      where += ' AND i.status = @status';
      params.status = status;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM invoices i ${where}`,
      params
    );
    const total = countResult.total;

    const invoices = await db.getAll(
      `SELECT
        i.invoice_id,
        i.firm_id,
        i.client_id,
        i.matter_id,
        i.invoice_number,
        i.invoice_content_type,
        i.issue_date,
        i.due_date,
        i.period_start,
        i.period_end,
        i.paid_date,
        i.subtotal,
        i.discount_type,
        i.discount_value,
        i.discount_amount,
        i.retainer_applied,
        i.taxable_amount,
        i.vat_rate,
        i.vat_amount,
        i.total,
        i.currency,
        i.status,
        i.client_reference,
        i.notes_to_client,
        i.internal_notes,
        i.created_at,
        i.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.client_id
      LEFT JOIN matters m ON i.matter_id = m.matter_id
      ${where}
      ORDER BY i.issue_date DESC, i.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: invoices,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoices'
    });
  }
});

// ==================== GET /api/invoices/:id ====================
// Get single invoice with embedded items (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const invoice = await db.getOne(
      `SELECT
        i.invoice_id,
        i.firm_id,
        i.client_id,
        i.matter_id,
        i.invoice_number,
        i.invoice_content_type,
        i.issue_date,
        i.due_date,
        i.period_start,
        i.period_end,
        i.paid_date,
        i.subtotal,
        i.discount_type,
        i.discount_value,
        i.discount_amount,
        i.retainer_applied,
        i.taxable_amount,
        i.vat_rate,
        i.vat_amount,
        i.total,
        i.currency,
        i.status,
        i.client_reference,
        i.retainer_advance_id,
        i.notes_to_client,
        i.internal_notes,
        i.created_by,
        i.created_at,
        i.updated_at,
        c.client_name,
        m.matter_name,
        m.matter_number
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.client_id
      LEFT JOIN matters m ON i.matter_id = m.matter_id
      WHERE i.invoice_id = @invoice_id
        AND i.firm_id = @firm_id
        AND i.is_deleted = 0`,
      {
        invoice_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Fetch embedded items
    const items = await db.getAll(
      `SELECT
        item_id,
        invoice_id,
        item_type,
        item_date,
        description,
        quantity,
        unit,
        rate,
        amount,
        timesheet_id,
        expense_id,
        sort_order,
        created_at
      FROM invoice_items
      WHERE invoice_id = @invoice_id AND firm_id = @firm_id
      ORDER BY sort_order`,
      { invoice_id: id, firm_id: req.user.firm_id }
    );

    res.json({
      success: true,
      invoice: { ...invoice, items }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoice'
    });
  }
});

// ==================== POST /api/invoices ====================
// Create invoice + items in transaction
// Body: { ...invoiceFields, items: [...] }

router.post('/', validateBody('invoice_saas'), async (req, res) => {
  const {
    client_id,
    matter_id,
    invoice_number,
    invoice_content_type,
    issue_date,
    due_date,
    period_start,
    period_end,
    subtotal,
    discount_type,
    discount_value,
    discount_amount,
    retainer_applied,
    taxable_amount,
    vat_rate,
    vat_amount,
    total,
    currency,
    status,
    client_reference,
    retainer_advance_id,
    notes_to_client,
    internal_notes,
    items
  } = req.body;

  try {
    const firm_id = req.user.firm_id;

    // Validate client_id FK
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

    // Validate matter_id FK (if provided)
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

    // Auto-generate invoice number if not provided
    let finalInvoiceNumber = invoice_number;
    if (!finalInvoiceNumber) {
      const year = new Date().getFullYear();
      const pattern = `INV-${year}-%`;
      const countResult = await db.getOne(
        `SELECT COUNT(*) as count FROM invoices
         WHERE firm_id = @firm_id AND invoice_number LIKE @pattern`,
        { firm_id, pattern }
      );
      const num = (countResult.count || 0) + 1;
      finalInvoiceNumber = `INV-${year}-${num.toString().padStart(4, '0')}`;
    }

    // Use transaction for invoice + items
    const pool = await db.getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insert invoice
      const invoiceResult = await transaction.request()
        .input('firm_id', firm_id)
        .input('client_id', client_id)
        .input('matter_id', matter_id || null)
        .input('invoice_number', finalInvoiceNumber)
        .input('invoice_content_type', invoice_content_type || 'combined')
        .input('issue_date', issue_date)
        .input('due_date', due_date || null)
        .input('period_start', period_start || null)
        .input('period_end', period_end || null)
        .input('subtotal', subtotal || 0)
        .input('discount_type', discount_type || 'none')
        .input('discount_value', discount_value || 0)
        .input('discount_amount', discount_amount || 0)
        .input('retainer_applied', retainer_applied || 0)
        .input('taxable_amount', taxable_amount || subtotal || 0)
        .input('vat_rate', vat_rate || 0)
        .input('vat_amount', vat_amount || 0)
        .input('total', total || 0)
        .input('currency', currency || 'USD')
        .input('status', status || 'draft')
        .input('client_reference', client_reference || null)
        .input('retainer_advance_id', retainer_advance_id || null)
        .input('notes_to_client', notes_to_client || null)
        .input('internal_notes', internal_notes || null)
        .input('created_by', req.user.user_id)
        .query(`INSERT INTO invoices (
          firm_id, client_id, matter_id, invoice_number, invoice_content_type,
          issue_date, due_date, period_start, period_end,
          subtotal, discount_type, discount_value, discount_amount,
          retainer_applied, taxable_amount, vat_rate, vat_amount, total, currency,
          status, client_reference, retainer_advance_id,
          notes_to_client, internal_notes, created_by
        )
        OUTPUT
          INSERTED.invoice_id,
          INSERTED.firm_id,
          INSERTED.client_id,
          INSERTED.matter_id,
          INSERTED.invoice_number,
          INSERTED.invoice_content_type,
          INSERTED.issue_date,
          INSERTED.due_date,
          INSERTED.subtotal,
          INSERTED.discount_type,
          INSERTED.discount_value,
          INSERTED.discount_amount,
          INSERTED.retainer_applied,
          INSERTED.vat_rate,
          INSERTED.vat_amount,
          INSERTED.total,
          INSERTED.currency,
          INSERTED.status,
          INSERTED.client_reference,
          INSERTED.created_at
        VALUES (
          @firm_id, @client_id, @matter_id, @invoice_number, @invoice_content_type,
          @issue_date, @due_date, @period_start, @period_end,
          @subtotal, @discount_type, @discount_value, @discount_amount,
          @retainer_applied, @taxable_amount, @vat_rate, @vat_amount, @total, @currency,
          @status, @client_reference, @retainer_advance_id,
          @notes_to_client, @internal_notes, @created_by
        )`);

      const newInvoice = invoiceResult.recordset[0];
      const invoiceId = newInvoice.invoice_id;

      // Insert line items (if any)
      const invoiceItems = items || [];
      for (let i = 0; i < invoiceItems.length; i++) {
        const item = invoiceItems[i];
        await transaction.request()
          .input('invoice_id', invoiceId)
          .input('firm_id', firm_id)
          .input('item_type', item.item_type || 'time')
          .input('item_date', item.item_date || null)
          .input('description', item.description || null)
          .input('quantity', item.quantity != null ? parseFloat(item.quantity) : null)
          .input('unit', item.unit || 'hours')
          .input('rate', item.rate != null ? parseFloat(item.rate) : null)
          .input('amount', parseFloat(item.amount) || 0)
          .input('timesheet_id', item.timesheet_id || null)
          .input('expense_id', item.expense_id || null)
          .input('sort_order', i)
          .query(`INSERT INTO invoice_items (
            invoice_id, firm_id, item_type, item_date, description,
            quantity, unit, rate, amount, timesheet_id, expense_id, sort_order
          ) VALUES (
            @invoice_id, @firm_id, @item_type, @item_date, @description,
            @quantity, @unit, @rate, @amount, @timesheet_id, @expense_id, @sort_order
          )`);
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        invoice: newInvoice
      });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice'
    });
  }
});

// ==================== PUT /api/invoices/:id ====================
// Update invoice + replace items in transaction

router.put('/:id', validateBody('invoice_saas'), async (req, res) => {
  const {
    client_id,
    matter_id,
    invoice_number,
    invoice_content_type,
    issue_date,
    due_date,
    period_start,
    period_end,
    subtotal,
    discount_type,
    discount_value,
    discount_amount,
    retainer_applied,
    taxable_amount,
    vat_rate,
    vat_amount,
    total,
    currency,
    status,
    client_reference,
    retainer_advance_id,
    notes_to_client,
    internal_notes,
    items
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify invoice exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT invoice_id FROM invoices WHERE invoice_id = @invoice_id AND firm_id = @firm_id AND is_deleted = 0',
      { invoice_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Validate client_id FK
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

    // Validate matter_id FK (if provided)
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

    // Use transaction for update + item replacement
    const pool = await db.getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Update invoice
      const updateResult = await transaction.request()
        .input('invoice_id', id)
        .input('firm_id', firm_id)
        .input('client_id', client_id)
        .input('matter_id', matter_id || null)
        .input('invoice_number', invoice_number)
        .input('invoice_content_type', invoice_content_type || 'combined')
        .input('issue_date', issue_date)
        .input('due_date', due_date || null)
        .input('period_start', period_start || null)
        .input('period_end', period_end || null)
        .input('subtotal', subtotal || 0)
        .input('discount_type', discount_type || 'none')
        .input('discount_value', discount_value || 0)
        .input('discount_amount', discount_amount || 0)
        .input('retainer_applied', retainer_applied || 0)
        .input('taxable_amount', taxable_amount || subtotal || 0)
        .input('vat_rate', vat_rate || 0)
        .input('vat_amount', vat_amount || 0)
        .input('total', total || 0)
        .input('currency', currency || 'USD')
        .input('status', status || 'draft')
        .input('client_reference', client_reference || null)
        .input('retainer_advance_id', retainer_advance_id || null)
        .input('notes_to_client', notes_to_client || null)
        .input('internal_notes', internal_notes || null)
        .query(`UPDATE invoices SET
          client_id = @client_id,
          matter_id = @matter_id,
          invoice_number = @invoice_number,
          invoice_content_type = @invoice_content_type,
          issue_date = @issue_date,
          due_date = @due_date,
          period_start = @period_start,
          period_end = @period_end,
          subtotal = @subtotal,
          discount_type = @discount_type,
          discount_value = @discount_value,
          discount_amount = @discount_amount,
          retainer_applied = @retainer_applied,
          taxable_amount = @taxable_amount,
          vat_rate = @vat_rate,
          vat_amount = @vat_amount,
          total = @total,
          currency = @currency,
          status = @status,
          client_reference = @client_reference,
          retainer_advance_id = @retainer_advance_id,
          notes_to_client = @notes_to_client,
          internal_notes = @internal_notes,
          updated_at = GETUTCDATE()
        OUTPUT
          INSERTED.invoice_id,
          INSERTED.firm_id,
          INSERTED.client_id,
          INSERTED.matter_id,
          INSERTED.invoice_number,
          INSERTED.issue_date,
          INSERTED.subtotal,
          INSERTED.discount_amount,
          INSERTED.vat_rate,
          INSERTED.vat_amount,
          INSERTED.total,
          INSERTED.currency,
          INSERTED.status,
          INSERTED.updated_at
        WHERE invoice_id = @invoice_id AND firm_id = @firm_id`);

      // Replace items if provided
      if (items !== undefined) {
        // Delete existing items
        await transaction.request()
          .input('invoice_id', id)
          .input('firm_id', firm_id)
          .query('DELETE FROM invoice_items WHERE invoice_id = @invoice_id AND firm_id = @firm_id');

        // Insert new items
        const invoiceItems = items || [];
        for (let i = 0; i < invoiceItems.length; i++) {
          const item = invoiceItems[i];
          await transaction.request()
            .input('invoice_id', id)
            .input('firm_id', firm_id)
            .input('item_type', item.item_type || 'time')
            .input('item_date', item.item_date || null)
            .input('description', item.description || null)
            .input('quantity', item.quantity != null ? parseFloat(item.quantity) : null)
            .input('unit', item.unit || 'hours')
            .input('rate', item.rate != null ? parseFloat(item.rate) : null)
            .input('amount', parseFloat(item.amount) || 0)
            .input('timesheet_id', item.timesheet_id || null)
            .input('expense_id', item.expense_id || null)
            .input('sort_order', i)
            .query(`INSERT INTO invoice_items (
              invoice_id, firm_id, item_type, item_date, description,
              quantity, unit, rate, amount, timesheet_id, expense_id, sort_order
            ) VALUES (
              @invoice_id, @firm_id, @item_type, @item_date, @description,
              @quantity, @unit, @rate, @amount, @timesheet_id, @expense_id, @sort_order
            )`);
        }
      }

      await transaction.commit();

      res.json({
        success: true,
        invoice: updateResult.recordset[0]
      });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice'
    });
  }
});

// ==================== DELETE /api/invoices/:id ====================
// Soft delete invoice (firm-scoped, sets is_deleted = 1)
// Items are preserved (not deleted) — they reference the invoice FK

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    // Verify invoice exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT invoice_id FROM invoices WHERE invoice_id = @invoice_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        invoice_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    await db.execute(
      `UPDATE invoices
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE invoice_id = @invoice_id AND firm_id = @firm_id`,
      {
        invoice_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice'
    });
  }
});

module.exports = router;
