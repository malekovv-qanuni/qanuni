/**
 * Client Imports Module - Dual-Mode (IPC + REST)
 *
 * Handles Excel template export and client bulk import.
 *
 * Channels:
 *   export-client-template  — Generate styled XLSX template with dropdowns (Electron-only)
 *   import-clients-excel    — Import clients from XLSX/CSV with validation (Electron dialog + pure logic)
 *
 * Pure function exported for REST API:
 *   importClientsFromRows   — Accepts pre-parsed row data, validates and inserts into DB
 *
 * Dependencies: database, logger, getMainWindow, dialog, app, path
 *
 * @version 2.1.0 (Dual-mode refactor)
 */

const { ipcMain } = require('electron');

// ============================================================================
// SHARED CONFIG
// ============================================================================

// Map friendly headers to DB field names (supports both old and new format)
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

// Map friendly entity type values to DB codes
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

// Map friendly billing terms to DB codes
const BILLING_TERMS_MAP = {
  'hourly': 'hourly',
  'flat fee': 'flat_fee',
  'flat_fee': 'flat_fee',
  'retainer': 'retainer',
  'contingency': 'contingency',
};

const VALID_CLIENT_TYPES = ['individual', 'company'];
const VALID_ENTITY_TYPES = ['SAL', 'SARL', 'HOLDING', 'OFFSHORE', 'PARTNERSHIP', 'LIMITED_PARTNER', 'BRANCH', 'REP_OFFICE', 'SOLE_PROP', 'NGO', 'CIVIL', 'SINGLE_OFFSHORE', 'SINGLE_SARL'];

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Import clients from pre-parsed rows (JSON array).
 * Normalizes headers, validates data, skips duplicates, inserts into DB.
 * @param {object} database - Database instance
 * @param {object} logger - Logger instance
 * @param {Array<object>} rows - Array of row objects (from XLSX or JSON body)
 * @returns {object} { success, imported, skipped, total, errors }
 */
function importClientsFromRows(database, logger, rows) {
  if (!rows || !rows.length) return { success: false, error: 'No data provided' };

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
    return { success: false, error: 'No rows with "Client Name" found. Make sure the first column header is "Client Name *".' };
  }

  // Get existing client names to skip duplicates
  const existing = database.query('SELECT client_name FROM clients WHERE deleted_at IS NULL');
  const existingNames = new Set(existing.map(c => c.client_name.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  const errors = [];
  const now = new Date().toISOString();

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const rowNum = i + 2;

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

      // Normalize entity_type: accept both "SAL" and "Joint Stock Company (SAL)"
      let entityType = null;
      if (row.entity_type) {
        const etLower = row.entity_type.toString().toLowerCase();
        if (ENTITY_TYPE_MAP[etLower]) {
          entityType = ENTITY_TYPE_MAP[etLower];
        } else if (VALID_ENTITY_TYPES.includes(row.entity_type.toUpperCase())) {
          entityType = row.entity_type.toUpperCase();
        }
      }

      // Normalize billing_terms: accept both "hourly" and "Flat Fee"
      let billingTerms = 'hourly';
      if (row.billing_terms) {
        const btLower = row.billing_terms.toString().toLowerCase();
        billingTerms = BILLING_TERMS_MAP[btLower] || btLower;
      }

      // Currency
      const currency = row.default_currency || 'USD';

      const id = database.generateId('CLT');
      database.execute(`
        INSERT INTO clients (client_id, client_name, client_name_arabic, client_type, entity_type, custom_id,
          registration_number, vat_number, main_contact, email, phone, mobile, address, website,
          industry, default_currency, billing_terms, source, notes, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [id, name, row.client_name_arabic || null, clientType, entityType,
          row.custom_id || null, row.registration_number || null, row.vat_number || null,
          row.main_contact || null, row.email || null, row.phone || null, row.mobile || null,
          row.address || null, row.website || null, row.industry || null,
          currency, billingTerms,
          row.source || null, row.notes || null, now, now]);

      existingNames.add(name.toLowerCase()); // prevent dupes within same file
      imported++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err.message}`);
      logger.warn('Client import row error', { rowNum, error: err.message });
    }
  }

  logger.info('Client import completed', { imported, skipped, total: validRows.length, errors: errors.length });
  return {
    success: true,
    imported,
    skipped,
    total: validRows.length,
    errors: errors.length ? errors.slice(0, 10) : [] // limit error messages
  };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerClientImportHandlers({ database, logger, getMainWindow, dialog, app, path }) {

  // ==================== EXPORT CLIENT TEMPLATE (Electron-only) ====================

  ipcMain.handle('export-client-template', logger.wrapHandler('export-client-template', async () => {
    const mainWindow = getMainWindow();
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Client Import Template',
      defaultPath: path.join(app.getPath('documents'), 'Qanuni-Client-Import-Template.xlsx'),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Qanuni Legal ERP';
    workbook.created = new Date();

    // ==================== Valid Options Sheet ====================
    const optionsSheet = workbook.addWorksheet('Valid Options', { properties: { tabColor: { argb: 'FF4472C4' } } });

    const clientTypes = ['Individual', 'Company'];
    const entityTypes = [
      'Joint Stock Company (SAL)',
      'Limited Liability Company (SARL)',
      'Holding Company (HOLDING)',
      'Offshore Company (OFFSHORE)',
      'General Partnership (PARTNERSHIP)',
      'Limited Partnership (LIMITED_PARTNER)',
      'Foreign Branch (BRANCH)',
      'Representative Office (REP_OFFICE)',
      'Sole Proprietorship (SOLE_PROP)',
      'Non-Profit Organization (NGO)',
      'Civil Company (CIVIL)',
      'Single Partner Offshore (SINGLE_OFFSHORE)',
      'Single Partner SARL (SINGLE_SARL)'
    ];
    const currencies = ['USD', 'LBP', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'CHF', 'CAD'];
    const billingTerms = ['Hourly', 'Flat Fee', 'Retainer', 'Contingency'];

    const sectionHeaderStyle = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center' }
    };
    const optionCellStyle = {
      font: { size: 11 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } } }
    };

    // Write option lists as columns
    const optionLists = [
      { col: 1, width: 20, title: 'Client Type', values: clientTypes },
      { col: 2, width: 44, title: 'Entity Type', values: entityTypes },
      { col: 3, width: 14, title: 'Currency', values: currencies },
      { col: 4, width: 18, title: 'Billing Terms', values: billingTerms },
    ];
    optionLists.forEach(({ col, width, title, values }) => {
      optionsSheet.getColumn(col).width = width;
      const header = optionsSheet.getCell(1, col);
      header.value = title;
      header.style = sectionHeaderStyle;
      values.forEach((v, i) => {
        const cell = optionsSheet.getCell(i + 2, col);
        cell.value = v;
        cell.style = optionCellStyle;
      });
    });

    // Tips column
    optionsSheet.getColumn(7).width = 60;
    optionsSheet.mergeCells('G1:H1');
    const tipsHeader = optionsSheet.getCell('G1');
    tipsHeader.value = 'Tips & Instructions';
    tipsHeader.style = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } }
    };
    [
      '\u2022 Only "Client Name *" is required \u2014 all other fields are optional',
      '\u2022 Blue columns have dropdown lists \u2014 click the cell to select',
      '\u2022 Entity Type only applies when Client Type is "Company"',
      '\u2022 Delete the 3 example rows in Clients sheet before importing',
      '\u2022 Duplicate client names will be skipped automatically',
      '\u2022 Empty rows are ignored',
      '\u2022 You can add as many rows as needed',
      '\u2022 Arabic names are recommended for bilingual reports'
    ].forEach((tip, i) => { optionsSheet.getCell(`G${i + 2}`).value = tip; });

    // ==================== Clients Sheet ====================
    const clientsSheet = workbook.addWorksheet('Clients', { properties: { tabColor: { argb: 'FF548235' } } });

    const columns = [
      { header: 'Client Name *',        key: 'client_name',         width: 28, required: true },
      { header: 'Client Name (Arabic)',  key: 'client_name_arabic',  width: 24 },
      { header: 'Client Type',           key: 'client_type',         width: 16, dropdown: true },
      { header: 'Entity Type',           key: 'entity_type',         width: 38, dropdown: true },
      { header: 'Custom ID',             key: 'custom_id',           width: 14 },
      { header: 'Registration No.',      key: 'registration_number', width: 18 },
      { header: 'VAT Number',            key: 'vat_number',          width: 16 },
      { header: 'Main Contact',          key: 'main_contact',        width: 20 },
      { header: 'Email',                 key: 'email',               width: 26 },
      { header: 'Phone',                 key: 'phone',               width: 18 },
      { header: 'Mobile',                key: 'mobile',              width: 18 },
      { header: 'Address',               key: 'address',             width: 30 },
      { header: 'Website',               key: 'website',             width: 24 },
      { header: 'Industry',              key: 'industry',            width: 18 },
      { header: 'Currency',              key: 'currency',            width: 12, dropdown: true },
      { header: 'Billing Terms',         key: 'billing_terms',       width: 16, dropdown: true },
      { header: 'Source',                key: 'source',              width: 16 },
      { header: 'Notes',                 key: 'notes',               width: 28 },
    ];

    clientsSheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }));

    // Style header row
    const headerRow = clientsSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell, colNum) => {
      const colDef = columns[colNum - 1];
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: colDef.required ? 'FFC00000' : colDef.dropdown ? 'FF4472C4' : 'FF404040' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
    });

    // Freeze header row
    clientsSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Example rows (using Unicode escapes for Arabic to prevent encoding corruption)
    const exampleData = [
      { client_name: 'Acme Corporation', client_name_arabic: '\u0634\u0631\u0643\u0629 \u0623\u0643\u0645\u064a', client_type: 'Company', entity_type: 'Joint Stock Company (SAL)', custom_id: 'CLT-001', registration_number: '12345', vat_number: 'VAT-001', main_contact: 'John Smith', email: 'john@acme.com', phone: '+961-1-234567', mobile: '+961-70-123456', address: 'Beirut, Lebanon', website: 'www.acme.com', industry: 'Technology', currency: 'USD', billing_terms: 'Hourly', source: 'Referral', notes: '' },
      { client_name: 'Ahmad Khalil', client_name_arabic: '\u0623\u062d\u0645\u062f \u062e\u0644\u064a\u0644', client_type: 'Individual', entity_type: '', custom_id: '', registration_number: '', vat_number: '', main_contact: '', email: 'ahmad@email.com', phone: '+961-1-345678', mobile: '+961-71-234567', address: 'Jounieh, Lebanon', website: '', industry: '', currency: 'USD', billing_terms: 'Hourly', source: '', notes: '' },
      { client_name: 'Beirut Trading Co.', client_name_arabic: '\u0628\u064a\u0631\u0648\u062a \u0644\u0644\u062a\u062c\u0627\u0631\u0629', client_type: 'Company', entity_type: 'Limited Liability Company (SARL)', custom_id: 'CLT-003', registration_number: '67890', vat_number: '', main_contact: 'Sara Haddad', email: 'info@beiruttrading.com', phone: '+961-1-456789', mobile: '', address: 'Ashrafieh, Beirut', website: 'www.beiruttrading.com', industry: 'Trading', currency: 'LBP', billing_terms: 'Retainer', source: 'Website', notes: 'Long-term client' },
    ];
    exampleData.forEach(data => clientsSheet.addRow(data));

    // Style example rows (gray italic = "delete me")
    [2, 3, 4].forEach(rowNum => {
      clientsSheet.getRow(rowNum).eachCell(cell => {
        cell.font = { italic: true, color: { argb: 'FF808080' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
    });

    // Data validation dropdowns (rows 2-1001)
    const dropdownConfig = [
      { col: 3,  formula: `'Valid Options'!$A$2:$A$${clientTypes.length + 1}` },
      { col: 4,  formula: `'Valid Options'!$B$2:$B$${entityTypes.length + 1}` },
      { col: 15, formula: `'Valid Options'!$C$2:$C$${currencies.length + 1}` },
      { col: 16, formula: `'Valid Options'!$D$2:$D$${billingTerms.length + 1}` },
    ];
    for (let row = 2; row <= 1001; row++) {
      dropdownConfig.forEach(({ col, formula }) => {
        clientsSheet.getCell(row, col).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [formula],
          showErrorMessage: true,
          errorTitle: 'Invalid Value',
          error: 'Please select a value from the dropdown list.',
          showInputMessage: true,
          promptTitle: 'Select Value',
          prompt: 'Click the arrow to choose from the list'
        };
      });
    }

    // Make Clients the active/first sheet
    clientsSheet.orderNo = 0;
    optionsSheet.orderNo = 1;

    await workbook.xlsx.writeFile(filePath);
    logger.info('Client template exported', { filePath });
    return { success: true, filePath };
  }));

  // ==================== IMPORT CLIENTS FROM EXCEL ====================

  ipcMain.handle('import-clients-excel', logger.wrapHandler('import-clients-excel', async () => {
    const XLSX = require('xlsx');
    const mainWindow = getMainWindow();

    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Client Import File',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths?.length) return { success: false, canceled: true };

    const wb = XLSX.readFile(filePaths[0]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return { success: false, error: 'File is empty' };

    return importClientsFromRows(database, logger, rows);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.importClientsFromRows = importClientsFromRows;
