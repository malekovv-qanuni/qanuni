/**
 * Advances Module - Dual-Mode (IPC + REST)
 * 10 handlers: CRUD + client expense advance + client retainer + lawyer advance
 *              + deduct-from-advance + deduct-retainer + add-expense-with-deduction
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getAllAdvances(database) {
  return database.query(`SELECT a.*, c.client_name, m.matter_name, l.name as lawyer_name
    FROM advances a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN matters m ON a.matter_id = m.matter_id
    LEFT JOIN lawyers l ON a.lawyer_id = l.lawyer_id
    WHERE a.deleted_at IS NULL
    ORDER BY a.date_received DESC`);
}

function getClientExpenseAdvance(database, clientId, matterId) {
  // Try matter-specific first, then general client advance
  let advance = null;
  if (matterId) {
    advance = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
  }
  if (!advance) {
    advance = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId]);
  }
  return advance;
}

function getClientRetainer(database, clientId, matterId) {
  let retainer = null;
  if (matterId) {
    retainer = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_retainer' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
  }
  if (!retainer) {
    retainer = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND advance_type = 'client_retainer' AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId]);
  }
  return retainer;
}

function getLawyerAdvance(database, lawyerId) {
  if (!lawyerId) return null;
  return database.queryOne(`SELECT * FROM advances
    WHERE lawyer_id = ? AND advance_type = 'lawyer_advance' AND status = 'active'
    ORDER BY date_received DESC LIMIT 1`, [lawyerId]);
}

function addAdvance(database, logger, adv) {
  const check = validation.check(adv, 'advance');
  if (!check.valid) return check.result;

  const id = database.generateId('ADV');
  const now = new Date().toISOString();

  // For lawyer_advance, client_id and matter_id should be null
  const clientId = (adv.advance_type === 'lawyer_advance') ? null : (adv.client_id || null);
  const matterId = (adv.advance_type === 'lawyer_advance') ? null : (adv.matter_id || null);
  const lawyerId = adv.lawyer_id || null;
  const amount = parseFloat(adv.amount) || 0;
  // Fee payments don't track balance
  const isFeePayment = adv.advance_type?.startsWith('fee_payment');
  const balanceRemaining = isFeePayment ? amount : (adv.balance_remaining ? parseFloat(adv.balance_remaining) : amount);
  const minBalanceAlert = isFeePayment ? null : (adv.minimum_balance_alert ? parseFloat(adv.minimum_balance_alert) : null);

  database.execute(`INSERT INTO advances (advance_id, advance_type, client_id, matter_id, lawyer_id,
    amount, currency, date_received, payment_method, reference_number, balance_remaining,
    minimum_balance_alert, fee_description, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, adv.advance_type || 'client_retainer', clientId, matterId, lawyerId,
     amount, adv.currency || 'USD', adv.date_received, adv.payment_method || 'bank_transfer',
     adv.reference_number || '', balanceRemaining, minBalanceAlert, adv.fee_description || '',
     adv.notes || '', adv.status || 'active', now, now]);

  logger.info('Advance created', { advanceId: id, type: adv.advance_type, amount });
  return { success: true, advance_id: id };
}

function updateAdvance(database, logger, adv) {
  if (!adv.advance_id) return { success: false, error: 'advance_id is required' };

  const check = validation.check(adv, 'advance');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  const clientId = (adv.advance_type === 'lawyer_advance') ? null : (adv.client_id || null);
  const matterId = (adv.advance_type === 'lawyer_advance') ? null : (adv.matter_id || null);
  const lawyerId = adv.lawyer_id || null;
  const amount = parseFloat(adv.amount) || 0;
  const isFeePayment = adv.advance_type?.startsWith('fee_payment');
  const balanceRemaining = isFeePayment ? amount : (adv.balance_remaining ? parseFloat(adv.balance_remaining) : amount);
  const minBalanceAlert = isFeePayment ? null : (adv.minimum_balance_alert ? parseFloat(adv.minimum_balance_alert) : null);

  database.execute(`UPDATE advances SET advance_type=?, client_id=?, matter_id=?, lawyer_id=?, amount=?,
    currency=?, date_received=?, payment_method=?, reference_number=?, balance_remaining=?,
    minimum_balance_alert=?, fee_description=?, notes=?, status=?, updated_at=? WHERE advance_id=?`,
    [adv.advance_type, clientId, matterId, lawyerId, amount, adv.currency, adv.date_received,
     adv.payment_method, adv.reference_number || '', balanceRemaining, minBalanceAlert,
     adv.fee_description || '', adv.notes || '', adv.status, now, adv.advance_id]);

  logger.info('Advance updated', { advanceId: adv.advance_id });
  return { success: true };
}

function deleteAdvance(database, logger, id) {
  if (!id) return { success: false, error: 'advance_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE advances SET deleted_at = ? WHERE advance_id = ?', [now, id]);

  logger.info('Advance soft-deleted', { advanceId: id });
  return { success: true };
}

function deductFromAdvance(database, logger, advanceId, amount) {
  if (!advanceId) return { success: false, error: 'advanceId is required' };

  const advance = database.queryOne('SELECT * FROM advances WHERE advance_id = ?', [advanceId]);
  if (!advance) return { success: false, error: 'Advance not found' };

  const currentBalance = parseFloat(advance.balance_remaining) || 0;
  const newBalance = currentBalance - parseFloat(amount);
  const now = new Date().toISOString();

  database.execute('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
    [newBalance, now, advanceId]);

  logger.info('Advance deducted', { advanceId, amount: parseFloat(amount), newBalance });
  return { success: true, newBalance, advanceId };
}

function deductRetainer(database, logger, clientId, matterId, advanceType, amount) {
  // Find the appropriate retainer
  let advance = null;
  if (matterId) {
    advance = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND matter_id = ? AND advance_type = ? AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, matterId, advanceType]);
  }
  if (!advance) {
    advance = database.queryOne(`SELECT * FROM advances
      WHERE client_id = ? AND advance_type = ? AND status = 'active'
      ORDER BY date_received DESC LIMIT 1`, [clientId, advanceType]);
  }

  if (!advance) return { success: false, error: 'No active retainer found' };

  const currentBalance = parseFloat(advance.balance_remaining) || 0;
  const newBalance = currentBalance - parseFloat(amount);
  const now = new Date().toISOString();

  database.execute('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
    [newBalance, now, advance.advance_id]);

  logger.info('Retainer deducted', { advanceId: advance.advance_id, amount: parseFloat(amount), newBalance });
  return { success: true, newBalance, advanceId: advance.advance_id };
}

function addExpenseWithDeduction(database, logger, exp) {
  const id = database.generateId('EXP');
  const now = new Date().toISOString();

  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const paidByLawyerId = exp.paid_by_lawyer_id || null;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;

  const deductions = [];
  let appliedAdvanceId = null;

  // Use transaction for multi-step operation
  database.transaction(() => {
    // 1. If paid by lawyer, deduct from lawyer's advance
    if (paidByLawyerId) {
      const lawyerAdvance = database.queryOne(`SELECT * FROM advances
        WHERE lawyer_id = ? AND advance_type = 'lawyer_advance' AND status = 'active'
        ORDER BY date_received DESC LIMIT 1`, [paidByLawyerId]);

      if (lawyerAdvance) {
        const currentBalance = parseFloat(lawyerAdvance.balance_remaining) || 0;
        const newBalance = currentBalance - amount;
        database.execute('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
          [newBalance, now, lawyerAdvance.advance_id]);
        deductions.push({ type: 'lawyer_advance', advanceId: lawyerAdvance.advance_id, amount, newBalance });
      }
    }

    // 2. Auto-deduct from client's expense advance
    if (clientId) {
      let clientAdvance = null;
      if (matterId) {
        clientAdvance = database.queryOne(`SELECT * FROM advances
          WHERE client_id = ? AND matter_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
          ORDER BY date_received DESC LIMIT 1`, [clientId, matterId]);
      }
      if (!clientAdvance) {
        clientAdvance = database.queryOne(`SELECT * FROM advances
          WHERE client_id = ? AND advance_type = 'client_expense_advance' AND status = 'active'
          ORDER BY date_received DESC LIMIT 1`, [clientId]);
      }

      if (clientAdvance) {
        const currentBalance = parseFloat(clientAdvance.balance_remaining) || 0;
        const newBalance = currentBalance - amount;
        database.execute('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
          [newBalance, now, clientAdvance.advance_id]);
        appliedAdvanceId = clientAdvance.advance_id;
        deductions.push({ type: 'client_expense_advance', advanceId: clientAdvance.advance_id, amount, newBalance });
      }
    }

    // 3. Insert the expense
    const paidByFirm = paidByLawyerId ? 0 : 1;
    database.execute(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, lawyer_id,
      paid_by_firm, paid_by_lawyer_id, category_id, amount, currency, description, date, billable,
      markup_percent, advance_id, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'client', clientId, matterId, paidByLawyerId, paidByFirm, paidByLawyerId, categoryId,
       amount, exp.currency || 'USD', exp.description, exp.date, exp.billable ? 1 : 0,
       markupPercent, appliedAdvanceId, 'pending', exp.notes || '', now, now]);
  });

  logger.info('Expense with deduction created', { expenseId: id, deductions: deductions.length });
  return { success: true, expense_id: id, deductions };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerAdvanceHandlers({ database, logger }) {

  ipcMain.handle('get-all-advances', logger.wrapHandler('get-all-advances', () => {
    return getAllAdvances(database);
  }));

  ipcMain.handle('get-client-expense-advance', logger.wrapHandler('get-client-expense-advance', (event, clientId, matterId) => {
    return getClientExpenseAdvance(database, clientId, matterId);
  }));

  ipcMain.handle('get-client-retainer', logger.wrapHandler('get-client-retainer', (event, clientId, matterId) => {
    return getClientRetainer(database, clientId, matterId);
  }));

  ipcMain.handle('get-lawyer-advance', logger.wrapHandler('get-lawyer-advance', (event, lawyerId) => {
    return getLawyerAdvance(database, lawyerId);
  }));

  ipcMain.handle('add-advance', logger.wrapHandler('add-advance', (event, adv) => {
    return addAdvance(database, logger, adv);
  }));

  ipcMain.handle('update-advance', logger.wrapHandler('update-advance', (event, adv) => {
    return updateAdvance(database, logger, adv);
  }));

  ipcMain.handle('delete-advance', logger.wrapHandler('delete-advance', (event, id) => {
    return deleteAdvance(database, logger, id);
  }));

  ipcMain.handle('deduct-from-advance', logger.wrapHandler('deduct-from-advance', (event, advanceId, amount) => {
    return deductFromAdvance(database, logger, advanceId, amount);
  }));

  ipcMain.handle('deduct-retainer', logger.wrapHandler('deduct-retainer', (event, clientId, matterId, advanceType, amount) => {
    return deductRetainer(database, logger, clientId, matterId, advanceType, amount);
  }));

  ipcMain.handle('add-expense-with-deduction', logger.wrapHandler('add-expense-with-deduction', (event, exp) => {
    return addExpenseWithDeduction(database, logger, exp);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllAdvances = getAllAdvances;
module.exports.getClientExpenseAdvance = getClientExpenseAdvance;
module.exports.getClientRetainer = getClientRetainer;
module.exports.getLawyerAdvance = getLawyerAdvance;
module.exports.addAdvance = addAdvance;
module.exports.updateAdvance = updateAdvance;
module.exports.deleteAdvance = deleteAdvance;
module.exports.deductFromAdvance = deductFromAdvance;
module.exports.deductRetainer = deductRetainer;
module.exports.addExpenseWithDeduction = addExpenseWithDeduction;
