/**
 * Expenses Module - Dual-Mode (IPC + REST)
 * 8 handlers: CRUD + batch + Excel export + PDF export + unbilled
 * Refactored to preserve EXACT working logic
 * @version 3.0.0 (Session 2 - Dual-Mode)
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getExpenses(database) {
  return database.query(`SELECT e.*, c.client_name, m.matter_name,
      lec.name_en as category_name, lec.name_ar as category_name_ar
      FROM expenses e LEFT JOIN clients c ON e.client_id = c.client_id
      LEFT JOIN matters m ON e.matter_id = m.matter_id
      LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
      WHERE e.deleted_at IS NULL
      ORDER BY e.date DESC`);
}

function getUnbilledExpenses(database, clientId, matterId) {
  let sql = `SELECT e.*, lec.name_en as category_name FROM expenses e
      LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
      WHERE (e.status IS NULL OR e.status = 'pending' OR e.status = 'approved') AND e.status != 'billed' AND e.billable = 1 AND e.deleted_at IS NULL`;
  const params = [];
  if (clientId) { sql += ' AND e.client_id = ?'; params.push(clientId); }
  if (matterId) { sql += ' AND e.matter_id = ?'; params.push(matterId); }
  sql += ' ORDER BY e.date ASC';
  return database.query(sql, params);
}

function addExpense(database, logger, exp) {
  const check = validation.check(exp, 'expense');
  if (!check.valid) return check.result;

  const id = database.generateId('EXP');
  const now = new Date().toISOString();
  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const lawyerId = exp.lawyer_id || null;
  const paidByLawyerId = exp.paid_by_lawyer_id || null;
  const paidByFirm = paidByLawyerId ? 0 : 1;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const advanceId = exp.advance_id || null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;
  const attachmentNote = exp.attachment_note || null;

  database.execute(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, lawyer_id,
      paid_by_firm, paid_by_lawyer_id, category_id, amount, currency, description, date, billable,
      markup_percent, advance_id, status, notes, attachment_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, exp.expense_type || 'client', clientId, matterId, lawyerId, paidByFirm, paidByLawyerId,
       categoryId, amount, exp.currency || 'USD', exp.description, exp.date,
       exp.billable ? 1 : 0, markupPercent, advanceId, exp.status || 'pending',
       exp.notes || '', attachmentNote, now, now]);

  logger.info('Expense created', { expenseId: id, amount });
  return { success: true, expenseId: id };
}

function addExpenseBatch(database, logger, expenses) {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return { success: false, error: 'No expenses provided' };
  }

  const now = new Date().toISOString();
  const results = [];

  // Use transaction for batch operations
  database.transaction(() => {
    expenses.forEach(exp => {
      const id = database.generateId('EXP');
      const clientId = exp.client_id || null;
      const matterId = exp.matter_id || null;
      const paidByLawyerId = exp.paid_by_lawyer_id || null;
      const paidByFirm = exp.paid_by_firm || (paidByLawyerId ? 0 : 1);
      const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
      const amount = parseFloat(exp.amount) || 0;
      const attachmentNote = exp.attachment_note || null;

      database.execute(`INSERT INTO expenses (expense_id, expense_type, client_id, matter_id, lawyer_id,
          paid_by_firm, paid_by_lawyer_id, category_id, amount, currency, description, date, billable,
          markup_percent, advance_id, status, notes, attachment_note, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, exp.expense_type || 'client', clientId, matterId, null, paidByFirm, paidByLawyerId,
           categoryId, amount, exp.currency || 'USD', exp.description, exp.date,
           exp.billable ? 1 : 0, 0, null, exp.status || 'pending',
           exp.notes || '', attachmentNote, now, now]);

      results.push({ id, success: true });
    });
  });

  logger.info('Batch expenses created', { count: results.length });
  return { success: true, count: results.length, results };
}

function updateExpense(database, logger, exp) {
  if (!exp.expense_id) return { success: false, error: 'expense_id is required' };

  const check = validation.check(exp, 'expense');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  const clientId = exp.client_id || null;
  const matterId = exp.matter_id || null;
  const paidByLawyerId = exp.paid_by_lawyer_id || null;
  const paidByFirm = paidByLawyerId ? 0 : 1;
  const categoryId = exp.category_id ? parseInt(exp.category_id) : null;
  const markupPercent = exp.markup_percent ? parseFloat(exp.markup_percent) : 0;
  const amount = parseFloat(exp.amount) || 0;
  const attachmentNote = exp.attachment_note || null;

  database.execute(`UPDATE expenses SET expense_type=?, client_id=?, matter_id=?,
      paid_by_firm=?, paid_by_lawyer_id=?, category_id=?,
      amount=?, currency=?, description=?, date=?, billable=?, markup_percent=?, status=?,
      notes=?, attachment_note=?, updated_at=? WHERE expense_id=?`,
      [exp.expense_type, clientId, matterId, paidByFirm, paidByLawyerId, categoryId,
       amount, exp.currency, exp.description, exp.date, exp.billable ? 1 : 0,
       markupPercent, exp.status, exp.notes || '', attachmentNote, now, exp.expense_id]);

  logger.info('Expense updated', { expenseId: exp.expense_id });
  return { success: true };
}

function deleteExpense(database, logger, id) {
  if (!id) return { success: false, error: 'expense_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE expenses SET deleted_at = ? WHERE expense_id = ?', [now, id]);

  logger.info('Expense soft-deleted', { expenseId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerExpenseHandlers({ database, logger, mainWindow, XLSX }) {

  ipcMain.handle('get-all-expenses', logger.wrapHandler('get-all-expenses', () => {
    return getExpenses(database);
  }));

  ipcMain.handle('get-unbilled-expenses', logger.wrapHandler('get-unbilled-expenses', (event, clientId, matterId) => {
    return getUnbilledExpenses(database, clientId, matterId);
  }));

  ipcMain.handle('add-expense', logger.wrapHandler('add-expense', (event, exp) => {
    return addExpense(database, logger, exp);
  }));

  ipcMain.handle('add-expenses-batch', logger.wrapHandler('add-expenses-batch', (event, expenses) => {
    return addExpenseBatch(database, logger, expenses);
  }));

  ipcMain.handle('update-expense', logger.wrapHandler('update-expense', (event, exp) => {
    return updateExpense(database, logger, exp);
  }));

  ipcMain.handle('delete-expense', logger.wrapHandler('delete-expense', (event, id) => {
    return deleteExpense(database, logger, id);
  }));

  // ==================== EXPORT TO EXCEL (Electron-only) ====================

  ipcMain.handle('export-expenses-to-excel', logger.wrapHandler('export-expenses-to-excel', async (event, data, options) => {
    const win = mainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: options.language === 'ar' ? '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Export Expenses',
      defaultPath: `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (result.canceled) return { success: false, canceled: true };

    const wb = XLSX.utils.book_new();
    const isAr = options.language === 'ar';

    const headers = isAr
      ? ['\u0627\u0644\u062a\u0627\u0631\u064a\u062e', '\u0627\u0644\u0639\u0645\u064a\u0644', '\u0627\u0644\u0645\u0644\u0641', '\u0627\u0644\u0641\u0626\u0629', '\u0627\u0644\u0648\u0635\u0641', '\u0627\u0644\u0645\u0628\u0644\u063a', '\u0627\u0644\u062f\u0627\u0641\u0639', '\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u0645\u0631\u0641\u0642', '\u0627\u0644\u062d\u0627\u0644\u0629', '\u0642\u0627\u0628\u0644 \u0644\u0644\u0641\u0648\u062a\u0631\u0629']
      : ['Date', 'Client', 'Matter', 'Category', 'Description', 'Amount', 'Paid By', 'Attachment Note', 'Status', 'Billable'];

    const rows = data.map(exp => [
      exp.date, exp.client, exp.matter, exp.category, exp.description,
      exp.amount, exp.paidBy, exp.attachmentNote, exp.status, exp.billable
    ]);

    // Summary rows
    rows.push([]);
    rows.push([isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total', '', '', '', '', `$${options.totals.total.toFixed(2)}`]);
    rows.push([isAr ? '\u0642\u0627\u0628\u0644 \u0644\u0644\u0641\u0648\u062a\u0631\u0629' : 'Billable', '', '', '', '', `$${options.totals.billable.toFixed(2)}`]);
    rows.push([isAr ? '\u063a\u064a\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u0641\u0648\u062a\u0631\u0629' : 'Non-Billable', '', '', '', '', `$${options.totals.nonBillable.toFixed(2)}`]);

    if (options.filters && options.filters !== 'None') {
      rows.push([]);
      rows.push([`${isAr ? '\u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u0637\u0628\u0642\u0629' : 'Applied Filters'}: ${options.filters}`]);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, isAr ? '\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Expenses');
    XLSX.writeFile(wb, result.filePath);

    logger.info('Expenses exported to Excel', { path: result.filePath, count: data.length });
    return { success: true, filePath: result.filePath };
  }));

  // ==================== EXPORT TO PDF (Electron-only) ====================

  ipcMain.handle('export-expenses-to-pdf', logger.wrapHandler('export-expenses-to-pdf', async (event, data, options) => {
    const win = mainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: options.language === 'ar' ? '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Export Expenses',
      defaultPath: `Expenses_${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) return { success: false, canceled: true };

    const isArabic = options.language === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    const textAlign = isArabic ? 'right' : 'left';

    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; direction: ${dir}; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 11px; margin-bottom: 15px; }
        .filters { background: #f5f5f5; padding: 8px; margin-bottom: 15px; border-radius: 4px; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #f0f0f0; padding: 6px 4px; text-align: ${textAlign}; border: 1px solid #ddd; font-size: 9px; }
        td { padding: 5px 4px; border: 1px solid #ddd; font-size: 9px; }
        .amount { text-align: ${isArabic ? 'left' : 'right'}; }
        .summary { margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
        .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .total { font-weight: bold; font-size: 12px; }
        .description { max-width: 200px; word-wrap: break-word; }
      </style></head><body>
        <h1>${isArabic ? '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Expenses Report'}</h1>
        <div class="subtitle">${isArabic ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0635\u062f\u064a\u0631' : 'Export Date'}: ${new Date().toLocaleDateString()}</div>
        ${options.filters && options.filters !== 'None' ? `<div class="filters"><strong>${isArabic ? '\u0627\u0644\u0641\u0644\u0627\u062a\u0631' : 'Filters'}:</strong> ${options.filters}</div>` : ''}
        <table><thead><tr>
          <th>${isArabic ? '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' : 'Date'}</th>
          <th>${isArabic ? '\u0627\u0644\u0639\u0645\u064a\u0644' : 'Client'}</th>
          <th>${isArabic ? '\u0627\u0644\u0645\u0644\u0641' : 'Matter'}</th>
          <th>${isArabic ? '\u0627\u0644\u0641\u0626\u0629' : 'Category'}</th>
          <th>${isArabic ? '\u0627\u0644\u0648\u0635\u0641' : 'Description'}</th>
          <th>${isArabic ? '\u0627\u0644\u0645\u0628\u0644\u063a' : 'Amount'}</th>
          <th>${isArabic ? '\u0627\u0644\u062f\u0627\u0641\u0639' : 'Paid By'}</th>
          <th>${isArabic ? '\u0645\u0631\u0641\u0642' : 'Attach.'}</th>
          <th>${isArabic ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
        </tr></thead><tbody>
          ${data.map(exp => `<tr>
            <td>${exp.date}</td><td>${exp.client}</td><td>${exp.matter}</td>
            <td>${exp.category || ''}</td><td class="description">${exp.description}</td>
            <td class="amount">${exp.amount}</td><td>${exp.paidBy}</td>
            <td>${exp.attachmentNote ? '\u{1f4ce}' : ''}</td><td>${exp.status}</td>
          </tr>`).join('')}
        </tbody></table>
        <div class="summary">
          <div class="summary-row total"><span>${isArabic ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total'}:</span><span>$${options.totals.total.toFixed(2)}</span></div>
          <div class="summary-row"><span>${isArabic ? '\u0642\u0627\u0628\u0644 \u0644\u0644\u0641\u0648\u062a\u0631\u0629' : 'Billable'}:</span><span>$${options.totals.billable.toFixed(2)}</span></div>
          <div class="summary-row"><span>${isArabic ? '\u063a\u064a\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u0641\u0648\u062a\u0631\u0629' : 'Non-Billable'}:</span><span>$${options.totals.nonBillable.toFixed(2)}</span></div>
          <div class="summary-row"><span>${isArabic ? '\u0639\u062f\u062f \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Count'}:</span><span>${data.length}</span></div>
        </div>
      </body></html>`;

    const pdfWindow = new BrowserWindow({ width: 1200, height: 800, show: false, webPreferences: { nodeIntegration: false } });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ marginsType: 1, pageSize: 'A4', landscape: true, printBackground: true });
    fs.writeFileSync(result.filePath, pdfData);
    pdfWindow.close();

    logger.info('Expenses exported to PDF', { path: result.filePath, count: data.length });
    return { success: true, filePath: result.filePath };
  }));

};

// ============================================================================
// EXPORTS FOR REST API (data handlers only; Excel/PDF exports are Electron-only)
// ============================================================================

module.exports.getExpenses = getExpenses;
module.exports.getUnbilledExpenses = getUnbilledExpenses;
module.exports.addExpense = addExpense;
module.exports.addExpenseBatch = addExpenseBatch;
module.exports.updateExpense = updateExpense;
module.exports.deleteExpense = deleteExpense;
