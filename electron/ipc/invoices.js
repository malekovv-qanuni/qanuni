/**
 * Invoices Module - Dual-Mode (IPC + REST)
 * 8 handlers: 7 data handlers + 1 IPC-only (PDF generation)
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getAllInvoices(database) {
  return database.query(`SELECT i.*, c.client_name, m.matter_name FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.client_id
    LEFT JOIN matters m ON i.matter_id = m.matter_id
    WHERE i.deleted_at IS NULL
    ORDER BY i.issue_date DESC`);
}

function getInvoice(database, id) {
  if (!id) return null;
  const invoice = database.queryOne('SELECT * FROM invoices WHERE invoice_id = ?', [id]);
  if (!invoice) return null;
  const items = database.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [id]);
  return { ...invoice, items };
}

function getInvoiceItems(database, invoiceId) {
  if (!invoiceId) return [];
  return database.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [invoiceId]);
}

function generateInvoiceNumber(database) {
  const year = new Date().getFullYear();
  const countResult = database.query('SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?', [`INV-${year}-%`]);
  const num = (countResult[0]?.count || 0) + 1;
  return `INV-${year}-${num.toString().padStart(4, '0')}`;
}

function createInvoice(database, logger, invoice, items) {
  const check = validation.check(invoice, 'invoice');
  if (!check.valid) return check.result;

  const id = database.generateId('INV');
  const now = new Date().toISOString();
  const invoiceItems = items || invoice.items || [];

  database.transaction(() => {
    // Insert invoice
    database.execute(`INSERT INTO invoices (invoice_id, invoice_number, client_id, matter_id, period_start,
      period_end, issue_date, due_date, subtotal, discount_type, discount_value, discount_amount,
      retainer_applied, taxable_amount, vat_rate, vat_amount, total, currency, status, notes_to_client, internal_notes,
      client_reference, invoice_content_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, invoice.invoice_number, invoice.client_id, invoice.matter_id || null,
       invoice.period_start || null, invoice.period_end, invoice.issue_date,
       invoice.due_date || null, invoice.subtotal || 0,
       invoice.discount_type || 'none', invoice.discount_value || 0, invoice.discount_amount || 0,
       invoice.retainer_applied || 0, invoice.taxable_amount || invoice.subtotal || 0,
       invoice.vat_rate || 0, invoice.vat_amount || 0,
       invoice.total || 0, invoice.currency || 'USD', invoice.status || 'draft',
       invoice.notes_to_client || '', invoice.internal_notes || '',
       invoice.client_reference || null, invoice.invoice_content_type || 'combined', now, now]);

    // Insert items + mark timesheets/expenses as billed
    invoiceItems.forEach((item, index) => {
      const itemId = database.generateId('ITM');
      database.execute(`INSERT INTO invoice_items (item_id, invoice_id, item_type, item_date, description,
        quantity, unit, rate, amount, timesheet_id, expense_id, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.item_type, item.item_date, item.description, item.quantity, item.unit,
         item.rate, item.amount, item.timesheet_id || null, item.expense_id || null, index, now]);

      if (item.timesheet_id) {
        database.execute('UPDATE timesheets SET status = ?, invoice_id = ? WHERE timesheet_id = ?',
          ['billed', id, item.timesheet_id]);
      }
      if (item.expense_id) {
        database.execute('UPDATE expenses SET status = ?, invoice_id = ? WHERE expense_id = ?',
          ['billed', id, item.expense_id]);
      }
    });

    // Deduct retainer if applied
    if (invoice.retainer_applied && invoice.retainer_applied > 0 && invoice.retainer_advance_id) {
      const retainer = database.queryOne('SELECT * FROM advances WHERE advance_id = ?', [invoice.retainer_advance_id]);
      if (retainer) {
        const currentBalance = parseFloat(retainer.balance_remaining) || 0;
        const newBalance = currentBalance - parseFloat(invoice.retainer_applied);
        database.execute('UPDATE advances SET balance_remaining = ?, updated_at = ? WHERE advance_id = ?',
          [newBalance, now, invoice.retainer_advance_id]);
      }
    }
  });

  logger.info('Invoice created', { invoiceId: id, number: invoice.invoice_number, total: invoice.total });
  return { success: true, invoice_id: id, invoice_number: invoice.invoice_number };
}

function updateInvoiceStatus(database, logger, id, status) {
  if (!id) return { success: false, error: 'invoice_id is required' };
  if (!status) return { success: false, error: 'status is required' };

  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const paidDate = status === 'paid' ? today : null;

  database.execute('UPDATE invoices SET status = ?, paid_date = COALESCE(paid_date, ?), updated_at = ? WHERE invoice_id = ?',
    [status, paidDate, now, id]);

  logger.info('Invoice status updated', { invoiceId: id, status });
  return { success: true };
}

function deleteInvoice(database, logger, id) {
  if (!id) return { success: false, error: 'invoice_id is required' };

  database.transaction(() => {
    // Unlink timesheets and expenses
    database.execute('UPDATE timesheets SET status = ?, invoice_id = NULL WHERE invoice_id = ?', ['draft', id]);
    database.execute('UPDATE expenses SET status = ?, invoice_id = NULL WHERE invoice_id = ?', ['pending', id]);
    // Delete items
    database.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    // Soft-delete invoice
    const now = new Date().toISOString();
    database.execute('UPDATE invoices SET deleted_at = ? WHERE invoice_id = ?', [now, id]);
  });

  logger.info('Invoice deleted', { invoiceId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerInvoiceHandlers({ database, logger, mainWindow }) {

  ipcMain.handle('get-all-invoices', logger.wrapHandler('get-all-invoices', () => {
    return getAllInvoices(database);
  }));

  ipcMain.handle('get-invoice', logger.wrapHandler('get-invoice', (event, id) => {
    return getInvoice(database, id);
  }));

  ipcMain.handle('get-invoice-items', logger.wrapHandler('get-invoice-items', (event, invoiceId) => {
    return getInvoiceItems(database, invoiceId);
  }));

  ipcMain.handle('generate-invoice-number', logger.wrapHandler('generate-invoice-number', () => {
    return generateInvoiceNumber(database);
  }));

  ipcMain.handle('create-invoice', logger.wrapHandler('create-invoice', (event, invoice, items) => {
    return createInvoice(database, logger, invoice, items);
  }));

  ipcMain.handle('update-invoice-status', logger.wrapHandler('update-invoice-status', (event, id, status) => {
    return updateInvoiceStatus(database, logger, id, status);
  }));

  ipcMain.handle('delete-invoice', logger.wrapHandler('delete-invoice', (event, id) => {
    return deleteInvoice(database, logger, id);
  }));

  // ==================== PDF GENERATION (IPC-ONLY - uses Electron APIs) ====================

  ipcMain.handle('generate-invoice-pdfs', logger.wrapHandler('generate-invoice-pdfs', async (event, invoiceId, options = {}) => {
    // Fetch invoice data
    const invoice = database.queryOne('SELECT * FROM invoices WHERE invoice_id = ?', [invoiceId]);
    if (!invoice) return { success: false, error: 'Invoice not found' };

    const items = database.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [invoiceId]);
    const client = database.queryOne('SELECT * FROM clients WHERE client_id = ?', [invoice.client_id]);
    const matter = invoice.matter_id ? database.queryOne('SELECT * FROM matters WHERE matter_id = ?', [invoice.matter_id]) : null;

    // Get firm info
    const firmSettings = database.query("SELECT * FROM settings WHERE category = 'firm' OR setting_key LIKE 'firm_%' OR setting_key LIKE 'default_%'");
    const firmInfo = {};
    firmSettings.forEach(s => { firmInfo[s.setting_key] = s.setting_value; });

    // Separate items by type
    const timeItems = items.filter(i => i.item_type === 'time');
    const expenseItems = items.filter(i => i.item_type === 'expense');
    const fixedFeeItems = items.filter(i => i.item_type === 'fixed_fee');

    // Get lawyer names for time entries
    const timesheetIds = timeItems.map(t => t.timesheet_id).filter(Boolean);
    const timesheetData = timesheetIds.length > 0
      ? database.query(`SELECT t.*, l.name as lawyer_name FROM timesheets t
          LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
          WHERE t.timesheet_id IN (${timesheetIds.map(() => '?').join(',')})`, timesheetIds)
      : [];

    const enrichedTimeItems = timeItems.map(item => {
      const ts = timesheetData.find(t => t.timesheet_id === item.timesheet_id);
      return { ...item, lawyer_name: ts?.lawyer_name || 'N/A' };
    });

    // Enrich expense items with matter_name
    const expenseIds = expenseItems.map(e => e.expense_id).filter(Boolean);
    const expenseData = expenseIds.length > 0
      ? database.query(`SELECT e.expense_id, m.matter_name FROM expenses e
          LEFT JOIN matters m ON e.matter_id = m.matter_id
          WHERE e.expense_id IN (${expenseIds.map(() => '?').join(',')})`, expenseIds)
      : [];

    let enrichedExpenseItems = expenseItems.map(item => {
      const exp = expenseData.find(e => e.expense_id === item.expense_id);
      return { ...item, matter_name: exp?.matter_name || '-' };
    });

    const isAllMatters = !invoice.matter_id;

    // Let user choose save folder
    const win = mainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Select folder to save invoice documents',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, canceled: true };
    }

    const outputFolder = result.filePaths[0];
    const baseFilename = invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, '_');
    const generatedFiles = [];

    // Helper: generate PDF from HTML
    const generatePdf = async (html, filename) => {
      const pdfWindow = new BrowserWindow({
        width: 1200, height: 800, show: false,
        webPreferences: { nodeIntegration: false }
      });
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdfData = await pdfWindow.webContents.printToPDF({
        marginsType: 1, pageSize: 'A4', printBackground: true
      });
      const filePath = path.join(outputFolder, filename);
      fs.writeFileSync(filePath, pdfData);
      pdfWindow.close();
      return filePath;
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-GB');
    };

    // ---- 1. Main Invoice PDF ----
    const invoiceHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; font-size: 11px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .firm-name { font-size: 20px; font-weight: bold; color: #333; }
        .firm-details { font-size: 10px; color: #666; margin-top: 5px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { margin: 0; font-size: 24px; color: #333; }
        .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
        .client-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .bill-to { background: #f5f5f5; padding: 15px; border-radius: 5px; width: 48%; }
        .bill-to h3 { margin: 0 0 10px 0; font-size: 12px; color: #666; }
        .invoice-details { width: 48%; }
        .invoice-details table { width: 100%; }
        .invoice-details td { padding: 5px 0; }
        .invoice-details td:first-child { color: #666; }
        .invoice-details td:last-child { text-align: right; font-weight: 500; }
        table.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table.items th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-size: 10px; }
        table.items td { padding: 10px; border-bottom: 1px solid #eee; }
        table.items .amount { text-align: right; }
        .totals { width: 300px; margin-left: auto; margin-top: 20px; }
        .totals table { width: 100%; }
        .totals td { padding: 8px 0; }
        .totals td:last-child { text-align: right; }
        .totals .grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
        .notes { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .section-title { font-size: 12px; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
      </style></head><body>
        <div class="header">
          <div class="firm-info">
            <div class="firm-name">${firmInfo.firm_name || 'Law Firm'}</div>
            <div class="firm-details">
              ${firmInfo.firm_address || ''}<br/>
              ${firmInfo.firm_phone ? 'Tel: ' + firmInfo.firm_phone : ''} ${firmInfo.firm_email ? '| ' + firmInfo.firm_email : ''}
              ${firmInfo.firm_vat_number ? '<br/>VAT: ' + firmInfo.firm_vat_number : ''}
            </div>
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <div class="invoice-number">${invoice.invoice_number}</div>
            ${invoice.client_reference ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Ref: ${invoice.client_reference}</div>` : ''}
          </div>
        </div>
        <div class="client-section">
          <div class="bill-to">
            <h3>BILL TO</h3>
            <strong>${client?.client_name || 'N/A'}</strong><br/>
            ${client?.address || ''}
            ${client?.email ? '<br/>' + client.email : ''}
          </div>
          <div class="invoice-details"><table>
            <tr><td>Issue Date:</td><td>${formatDate(invoice.issue_date)}</td></tr>
            ${invoice.due_date ? `<tr><td>Due Date:</td><td>${formatDate(invoice.due_date)}</td></tr>` : ''}
            ${invoice.period_start ? `<tr><td>Period:</td><td>${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}</td></tr>` : ''}
            ${matter ? `<tr><td>Matter:</td><td>${matter.matter_name}</td></tr>` : ''}
          </table></div>
        </div>
        ${(enrichedTimeItems.length > 0 || fixedFeeItems.length > 0) ? `
          <div class="section-title">Professional Fees</div>
          <table class="items"><thead><tr>
            <th>Date</th><th>Description</th><th>Hours</th><th>Rate</th><th class="amount">Amount</th>
          </tr></thead><tbody>
            ${enrichedTimeItems.map(item => `<tr>
              <td>${formatDate(item.item_date)}</td><td>${item.description}</td>
              <td>${parseFloat(item.quantity).toFixed(2)}</td>
              <td>${invoice.currency} ${parseFloat(item.rate).toFixed(2)}</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('')}
            ${fixedFeeItems.map(item => `<tr>
              <td>${formatDate(item.item_date)}</td><td>${item.description}</td>
              <td>-</td><td>Fixed</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody></table>` : ''}
        ${enrichedExpenseItems.length > 0 ? `
          <div class="section-title">Disbursements</div>
          <table class="items"><thead><tr>
            <th>Date</th><th>${isAllMatters ? 'Matter' : 'Description'}</th><th class="amount">Amount</th>
          </tr></thead><tbody>
            ${enrichedExpenseItems.map(item => `<tr>
              <td>${formatDate(item.item_date)}</td>
              <td>${isAllMatters ? item.matter_name : item.description}</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody></table>` : ''}
        <div class="totals"><table>
          <tr><td>Subtotal:</td><td>${invoice.currency} ${parseFloat(invoice.subtotal).toFixed(2)}</td></tr>
          ${parseFloat(invoice.retainer_applied || 0) > 0 ? `<tr style="color: green;"><td>Less Retainer:</td><td>-${invoice.currency} ${parseFloat(invoice.retainer_applied).toFixed(2)}</td></tr>` : ''}
          ${parseFloat(invoice.discount_amount || 0) > 0 ? `<tr style="color: green;"><td>Discount:</td><td>-${invoice.currency} ${parseFloat(invoice.discount_amount).toFixed(2)}</td></tr>` : ''}
          ${parseFloat(invoice.vat_amount || 0) > 0 ? `<tr><td>VAT (${invoice.vat_rate}%):</td><td>${invoice.currency} ${parseFloat(invoice.vat_amount).toFixed(2)}</td></tr>` : ''}
          <tr class="grand-total"><td>TOTAL DUE:</td><td>${invoice.currency} ${parseFloat(invoice.total).toFixed(2)}</td></tr>
        </table></div>
        ${invoice.notes_to_client ? `<div class="notes"><strong>Notes:</strong><br/>${invoice.notes_to_client}</div>` : ''}
      </body></html>`;

    const invoicePath = await generatePdf(invoiceHtml, `${baseFilename}.pdf`);
    generatedFiles.push({ type: 'invoice', path: invoicePath });

    // ---- 2. Timesheet Detail PDF ----
    if (options.generateTimesheet && enrichedTimeItems.length > 0) {
      const totalHours = enrichedTimeItems.reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0);
      const totalAmount = enrichedTimeItems.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const timesheetHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; font-size: 10px; }
          h1 { font-size: 16px; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 9px; }
          td { padding: 8px; border: 1px solid #ddd; }
          .amount { text-align: right; }
          .totals { margin-top: 15px; background: #f9f9f9; padding: 10px; border-radius: 5px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-label { font-weight: bold; }
        </style></head><body>
          <h1>Timesheet Detail Report</h1>
          <div class="subtitle">Supporting document for Invoice ${invoice.invoice_number}</div>
          <div class="info-box">
            <strong>Client:</strong> ${client?.client_name || 'N/A'}<br/>
            ${matter ? `<strong>Matter:</strong> ${matter.matter_name}<br/>` : ''}
            <strong>Period:</strong> ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}
          </div>
          <table><thead><tr>
            <th>Date</th><th>Lawyer</th><th>Description</th>
            <th class="amount">Hours</th><th class="amount">Rate</th><th class="amount">Amount</th>
          </tr></thead><tbody>
            ${enrichedTimeItems.map(item => `<tr>
              <td>${formatDate(item.item_date)}</td><td>${item.lawyer_name}</td><td>${item.description}</td>
              <td class="amount">${parseFloat(item.quantity).toFixed(2)}</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.rate).toFixed(2)}</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody></table>
          <div class="totals">
            <div class="totals-row"><span class="total-label">Total Hours:</span><span>${totalHours.toFixed(2)}</span></div>
            <div class="totals-row"><span class="total-label">Total Amount:</span><span>${invoice.currency} ${totalAmount.toFixed(2)}</span></div>
          </div>
        </body></html>`;

      const timesheetPath = await generatePdf(timesheetHtml, `${baseFilename}-Timesheet.pdf`);
      generatedFiles.push({ type: 'timesheet', path: timesheetPath });
    }

    // ---- 3. Expense Detail PDF ----
    if (options.generateExpenses && expenseItems.length > 0) {
      const totalExpenses = expenseItems.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const expIds = expenseItems.map(e => e.expense_id).filter(Boolean);
      const expenseDetails = expIds.length > 0
        ? database.query(`SELECT e.*, lec.name_en as category_name, m.matter_name
            FROM expenses e
            LEFT JOIN lookup_expense_categories lec ON e.category_id = lec.category_id
            LEFT JOIN matters m ON e.matter_id = m.matter_id
            WHERE e.expense_id IN (${expIds.map(() => '?').join(',')})`, expIds)
        : [];

      const enrichedExpItems = expenseItems.map(item => {
        const detail = expenseDetails.find(d => d.expense_id === item.expense_id);
        return {
          ...item,
          category_name: detail?.category_name || 'Other',
          attachment_note: detail?.attachment_note || '',
          matter_name: detail?.matter_name || '-'
        };
      });

      const showMatterColumn = !invoice.matter_id;

      const expenseHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; font-size: 10px; }
          h1 { font-size: 16px; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 9px; }
          td { padding: 8px; border: 1px solid #ddd; }
          .amount { text-align: right; }
          .totals { margin-top: 15px; background: #f9f9f9; padding: 10px; border-radius: 5px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-label { font-weight: bold; }
        </style></head><body>
          <h1>Expense Detail Report</h1>
          <div class="subtitle">Supporting document for Invoice ${invoice.invoice_number}</div>
          <div class="info-box">
            <strong>Client:</strong> ${client?.client_name || 'N/A'}<br/>
            ${matter ? `<strong>Matter:</strong> ${matter.matter_name}<br/>` : '<strong>Matters:</strong> All<br/>'}
            <strong>Period:</strong> ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}
          </div>
          <table><thead><tr>
            <th>Date</th>${showMatterColumn ? '<th>Matter</th>' : ''}
            <th>Category</th><th>Description</th><th>Receipt Ref</th><th class="amount">Amount</th>
          </tr></thead><tbody>
            ${enrichedExpItems.map(item => `<tr>
              <td>${formatDate(item.item_date)}</td>
              ${showMatterColumn ? `<td>${item.matter_name}</td>` : ''}
              <td>${item.category_name}</td><td>${item.description}</td>
              <td>${item.attachment_note || '-'}</td>
              <td class="amount">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody></table>
          <div class="totals">
            <div class="totals-row"><span class="total-label">Total Expenses:</span><span>${invoice.currency} ${totalExpenses.toFixed(2)}</span></div>
            <div class="totals-row"><span>Number of Items:</span><span>${expenseItems.length}</span></div>
          </div>
        </body></html>`;

      const expensePath = await generatePdf(expenseHtml, `${baseFilename}-Expenses.pdf`);
      generatedFiles.push({ type: 'expenses', path: expensePath });
    }

    logger.info('Invoice PDFs generated', { invoiceId, files: generatedFiles.length });
    return { success: true, files: generatedFiles, folder: outputFolder };
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getAllInvoices = getAllInvoices;
module.exports.getInvoice = getInvoice;
module.exports.getInvoiceItems = getInvoiceItems;
module.exports.generateInvoiceNumber = generateInvoiceNumber;
module.exports.createInvoice = createInvoice;
module.exports.updateInvoiceStatus = updateInvoiceStatus;
module.exports.deleteInvoice = deleteInvoice;
