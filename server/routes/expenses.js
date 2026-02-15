/**
 * Qanuni SaaS - Expenses CRUD Routes
 *
 * All endpoints are firm-scoped via JWT token (req.user.firm_id).
 * Uses soft delete (is_deleted flag) instead of hard delete.
 * Optional FKs: matter_id, lawyer_id, paid_by_lawyer_id.
 * Expense IDs are INT IDENTITY (SaaS pattern).
 *
 * @version 1.0.0 (Week 3 Day 15)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// All routes require authentication
router.use(authenticate);

// ==================== GET /api/expenses ====================
// List all expenses for the user's firm
// Query params: ?matter_id=123, ?lawyer_id=456, ?status=pending, ?expense_type=client, ?billable=true, ?search=term

router.get('/', async (req, res) => {
  try {
    const { search, matter_id, lawyer_id, status, expense_type, billable } = req.query;
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const params = { firm_id: req.user.firm_id };

    // Build WHERE clauses
    let where = 'WHERE e.firm_id = @firm_id AND e.is_deleted = 0';

    if (search) {
      where += ` AND (
        e.description LIKE '%' + @search + '%' OR
        e.notes LIKE '%' + @search + '%' OR
        e.category LIKE '%' + @search + '%'
      )`;
      params.search = search;
    }

    if (matter_id) {
      const mid = parseInt(matter_id);
      if (!isNaN(mid)) {
        where += ' AND e.matter_id = @matter_id';
        params.matter_id = mid;
      }
    }

    if (lawyer_id) {
      const lid = parseInt(lawyer_id);
      if (!isNaN(lid)) {
        where += ' AND e.lawyer_id = @lawyer_id';
        params.lawyer_id = lid;
      }
    }

    if (status) {
      where += ' AND e.status = @status';
      params.status = status;
    }

    if (expense_type) {
      where += ' AND e.expense_type = @expense_type';
      params.expense_type = expense_type;
    }

    if (billable !== undefined) {
      where += ' AND e.billable = @billable';
      params.billable = billable === 'true' ? 1 : 0;
    }

    // Get total count
    const countResult = await db.getOne(
      `SELECT COUNT(*) as total FROM expenses e ${where}`,
      params
    );
    const total = countResult.total;

    const expenses = await db.getAll(
      `SELECT
        e.expense_id,
        e.firm_id,
        e.matter_id,
        e.lawyer_id,
        e.expense_type,
        e.date,
        e.amount,
        e.currency,
        e.description,
        e.category,
        e.billable,
        e.markup_percent,
        e.paid_by_firm,
        e.paid_by_lawyer_id,
        e.status,
        e.notes,
        e.created_at,
        e.updated_at,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM expenses e
      LEFT JOIN matters m ON e.matter_id = m.matter_id
      LEFT JOIN lawyers l ON e.lawyer_id = l.lawyer_id
      ${where}
      ORDER BY e.date DESC, e.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit }
    );

    res.json({
      success: true,
      data: expenses,
      pagination: buildPaginationResponse(page, limit, total)
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve expenses'
    });
  }
});

// ==================== GET /api/expenses/:id ====================
// Get single expense with related details (firm-scoped)

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID'
      });
    }

    const expense = await db.getOne(
      `SELECT
        e.expense_id,
        e.firm_id,
        e.matter_id,
        e.lawyer_id,
        e.expense_type,
        e.date,
        e.amount,
        e.currency,
        e.description,
        e.category,
        e.billable,
        e.markup_percent,
        e.paid_by_firm,
        e.paid_by_lawyer_id,
        e.status,
        e.notes,
        e.created_by,
        e.created_at,
        e.updated_at,
        m.matter_name,
        m.matter_number,
        l.full_name as lawyer_name
      FROM expenses e
      LEFT JOIN matters m ON e.matter_id = m.matter_id
      LEFT JOIN lawyers l ON e.lawyer_id = l.lawyer_id
      WHERE e.expense_id = @expense_id
        AND e.firm_id = @firm_id
        AND e.is_deleted = 0`,
      {
        expense_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve expense'
    });
  }
});

// ==================== POST /api/expenses ====================
// Create new expense (optional matter_id, lawyer_id, paid_by_lawyer_id FK validation)

router.post('/', validateBody('expense_saas'), async (req, res) => {
  const {
    matter_id,
    lawyer_id,
    expense_type,
    date,
    amount,
    currency,
    description,
    category,
    billable,
    markup_percent,
    paid_by_firm,
    paid_by_lawyer_id,
    status,
    notes
  } = req.body;

  try {
    const firm_id = req.user.firm_id;

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

    // Validate lawyer_id (if provided)
    if (lawyer_id) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Lawyer not found or does not belong to your firm'
        });
      }
    }

    // Validate paid_by_lawyer_id (if provided)
    if (paid_by_lawyer_id) {
      const paidByLawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id: paid_by_lawyer_id, firm_id }
      );
      if (!paidByLawyer) {
        return res.status(404).json({
          success: false,
          error: 'Paid-by lawyer not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `INSERT INTO expenses (
        firm_id,
        matter_id,
        lawyer_id,
        expense_type,
        date,
        amount,
        currency,
        description,
        category,
        billable,
        markup_percent,
        paid_by_firm,
        paid_by_lawyer_id,
        status,
        notes,
        created_by
      )
      OUTPUT
        INSERTED.expense_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.expense_type,
        INSERTED.date,
        INSERTED.amount,
        INSERTED.currency,
        INSERTED.description,
        INSERTED.category,
        INSERTED.billable,
        INSERTED.markup_percent,
        INSERTED.paid_by_firm,
        INSERTED.paid_by_lawyer_id,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.created_by,
        INSERTED.created_at
      VALUES (
        @firm_id,
        @matter_id,
        @lawyer_id,
        @expense_type,
        @date,
        @amount,
        @currency,
        @description,
        @category,
        @billable,
        @markup_percent,
        @paid_by_firm,
        @paid_by_lawyer_id,
        @status,
        @notes,
        @created_by
      )`,
      {
        firm_id,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        expense_type: expense_type || 'client',
        date,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description,
        category: category || null,
        billable: billable === false ? 0 : 1,
        markup_percent: markup_percent != null ? parseFloat(markup_percent) : 0,
        paid_by_firm: paid_by_firm === true ? 1 : 0,
        paid_by_lawyer_id: paid_by_lawyer_id || null,
        status: status || 'pending',
        notes: notes || null,
        created_by: req.user.user_id
      }
    );

    res.status(201).json({
      success: true,
      expense: result.recordset[0]
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense'
    });
  }
});

// ==================== PUT /api/expenses/:id ====================
// Update expense (firm-scoped, all editable fields)

router.put('/:id', validateBody('expense_saas'), async (req, res) => {
  const {
    matter_id,
    lawyer_id,
    expense_type,
    date,
    amount,
    currency,
    description,
    category,
    billable,
    markup_percent,
    paid_by_firm,
    paid_by_lawyer_id,
    status,
    notes
  } = req.body;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID'
      });
    }

    const firm_id = req.user.firm_id;

    // Verify expense exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT expense_id FROM expenses WHERE expense_id = @expense_id AND firm_id = @firm_id AND is_deleted = 0',
      { expense_id: id, firm_id }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
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

    // Validate lawyer_id (if provided)
    if (lawyer_id) {
      const lawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id, firm_id }
      );
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          error: 'Lawyer not found or does not belong to your firm'
        });
      }
    }

    // Validate paid_by_lawyer_id (if provided)
    if (paid_by_lawyer_id) {
      const paidByLawyer = await db.getOne(
        'SELECT lawyer_id FROM lawyers WHERE lawyer_id = @lawyer_id AND firm_id = @firm_id AND is_deleted = 0',
        { lawyer_id: paid_by_lawyer_id, firm_id }
      );
      if (!paidByLawyer) {
        return res.status(404).json({
          success: false,
          error: 'Paid-by lawyer not found or does not belong to your firm'
        });
      }
    }

    const result = await db.execute(
      `UPDATE expenses
      SET
        matter_id = @matter_id,
        lawyer_id = @lawyer_id,
        expense_type = @expense_type,
        date = @date,
        amount = @amount,
        currency = @currency,
        description = @description,
        category = @category,
        billable = @billable,
        markup_percent = @markup_percent,
        paid_by_firm = @paid_by_firm,
        paid_by_lawyer_id = @paid_by_lawyer_id,
        status = @status,
        notes = @notes,
        updated_at = GETUTCDATE()
      OUTPUT
        INSERTED.expense_id,
        INSERTED.firm_id,
        INSERTED.matter_id,
        INSERTED.lawyer_id,
        INSERTED.expense_type,
        INSERTED.date,
        INSERTED.amount,
        INSERTED.currency,
        INSERTED.description,
        INSERTED.category,
        INSERTED.billable,
        INSERTED.markup_percent,
        INSERTED.paid_by_firm,
        INSERTED.paid_by_lawyer_id,
        INSERTED.status,
        INSERTED.notes,
        INSERTED.updated_at
      WHERE expense_id = @expense_id AND firm_id = @firm_id`,
      {
        expense_id: id,
        firm_id,
        matter_id: matter_id || null,
        lawyer_id: lawyer_id || null,
        expense_type: expense_type || 'client',
        date,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description,
        category: category || null,
        billable: billable === false ? 0 : 1,
        markup_percent: markup_percent != null ? parseFloat(markup_percent) : 0,
        paid_by_firm: paid_by_firm === true ? 1 : 0,
        paid_by_lawyer_id: paid_by_lawyer_id || null,
        status: status || 'pending',
        notes: notes || null
      }
    );

    res.json({
      success: true,
      expense: result.recordset[0]
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
});

// ==================== DELETE /api/expenses/:id ====================
// Soft delete expense (firm-scoped, sets is_deleted = 1)

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense ID'
      });
    }

    // Verify expense exists and belongs to user's firm
    const existing = await db.getOne(
      'SELECT expense_id FROM expenses WHERE expense_id = @expense_id AND firm_id = @firm_id AND is_deleted = 0',
      {
        expense_id: id,
        firm_id: req.user.firm_id
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    await db.execute(
      `UPDATE expenses
      SET is_deleted = 1, updated_at = GETUTCDATE()
      WHERE expense_id = @expense_id AND firm_id = @firm_id`,
      {
        expense_id: id,
        firm_id: req.user.firm_id
      }
    );

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
});

module.exports = router;
