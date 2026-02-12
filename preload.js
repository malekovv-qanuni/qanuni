const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getPendingInvoices: () => ipcRenderer.invoke('get-pending-invoices'), // v46.37 - Dashboard widget #15

  // Clients
  getAllClients: () => ipcRenderer.invoke('get-all-clients'),
  addClient: (data) => ipcRenderer.invoke('add-client', data),
  updateClient: (data) => ipcRenderer.invoke('update-client', data),
  deleteClient: (id) => ipcRenderer.invoke('delete-client', id),
  importClientsExcel: () => ipcRenderer.invoke('import-clients-excel'),       // v46.49
  exportClientTemplate: () => ipcRenderer.invoke('export-client-template'),   // v46.49

  // Lawyers
  getLawyers: () => ipcRenderer.invoke('get-lawyers'),
  getAllLawyers: () => ipcRenderer.invoke('get-all-lawyers'), // v46.44 - includes inactive lawyers
  addLawyer: (data) => ipcRenderer.invoke('add-lawyer', data),
  updateLawyer: (data) => ipcRenderer.invoke('update-lawyer', data),
  deleteLawyer: (id) => ipcRenderer.invoke('delete-lawyer', id),
  checkLawyerUsage: (id) => ipcRenderer.invoke('check-lawyer-usage', id), // v46.44 D11
  reactivateLawyer: (id) => ipcRenderer.invoke('reactivate-lawyer', id), // v46.44 D11

  // Matters
  getAllMatters: () => ipcRenderer.invoke('get-all-matters'),
  addMatter: (data) => ipcRenderer.invoke('add-matter', data),
  updateMatter: (data) => ipcRenderer.invoke('update-matter', data),
  deleteMatter: (id) => ipcRenderer.invoke('delete-matter', id),
  getRelatedMatters: (matterId) => ipcRenderer.invoke('get-related-matters', matterId),
  checkFileNumberUnique: (fileNumber, matterId) => ipcRenderer.invoke('check-file-number-unique', fileNumber, matterId), // v46.55

  // Matter Timeline & Diary (v46.53)
  getMatterTimeline: (matterId) => ipcRenderer.invoke('get-matter-timeline', matterId),
  exportMatterTimeline: (data) => ipcRenderer.invoke('export-matter-timeline', data),  // v49.4
  addDiaryEntry: (data) => ipcRenderer.invoke('add-diary-entry', data),
  updateDiaryEntry: (data) => ipcRenderer.invoke('update-diary-entry', data),
  deleteDiaryEntry: (id) => ipcRenderer.invoke('delete-diary-entry', id),

  // Hearings
  getAllHearings: () => ipcRenderer.invoke('get-all-hearings'),
  addHearing: (data) => ipcRenderer.invoke('add-hearing', data),
  updateHearing: (data) => ipcRenderer.invoke('update-hearing', data),
  deleteHearing: (id) => ipcRenderer.invoke('delete-hearing', id),

  // Judgments
  getAllJudgments: () => ipcRenderer.invoke('get-all-judgments'),
  addJudgment: (data) => ipcRenderer.invoke('add-judgment', data),
  updateJudgment: (data) => ipcRenderer.invoke('update-judgment', data),
  deleteJudgment: (id) => ipcRenderer.invoke('delete-judgment', id),

  // Deadlines (v23, updated v46.33)
  getAllDeadlines: () => ipcRenderer.invoke('get-all-deadlines'),
  addDeadline: (data) => ipcRenderer.invoke('add-deadline', data),
  updateDeadline: (data) => ipcRenderer.invoke('update-deadline', data),
  updateDeadlineStatus: (id, status) => ipcRenderer.invoke('update-deadline-status', id, status), // v46.33
  deleteDeadline: (id) => ipcRenderer.invoke('delete-deadline', id),
  getDeadlinesByJudgment: (judgmentId) => ipcRenderer.invoke('get-deadlines-by-judgment', judgmentId),

  // Tasks
  getAllTasks: () => ipcRenderer.invoke('get-all-tasks'),
  addTask: (data) => ipcRenderer.invoke('add-task', data),
  updateTask: (data) => ipcRenderer.invoke('update-task', data),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),

  // Timesheets
  getAllTimesheets: () => ipcRenderer.invoke('get-all-timesheets'),
  addTimesheet: (data) => ipcRenderer.invoke('add-timesheet', data),
  updateTimesheet: (data) => ipcRenderer.invoke('update-timesheet', data),
  deleteTimesheet: (id) => ipcRenderer.invoke('delete-timesheet', id),
  getUnbilledTime: (clientId, matterId) => ipcRenderer.invoke('get-unbilled-time', clientId, matterId),

  // Expenses
  getAllExpenses: () => ipcRenderer.invoke('get-all-expenses'),
  addExpense: (data) => ipcRenderer.invoke('add-expense', data),
  addExpenseWithDeduction: (data) => ipcRenderer.invoke('add-expense-with-deduction', data),
  addExpensesBatch: (expenses) => ipcRenderer.invoke('add-expenses-batch', expenses), // v46.40
  updateExpense: (data) => ipcRenderer.invoke('update-expense', data),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
  getUnbilledExpenses: (clientId, matterId) => ipcRenderer.invoke('get-unbilled-expenses', clientId, matterId),
  exportExpensesToExcel: (data, options) => ipcRenderer.invoke('export-expenses-to-excel', data, options), // v46.39
  exportExpensesToPDF: (data, options) => ipcRenderer.invoke('export-expenses-to-pdf', data, options), // v46.39

  // Advances
  getAllAdvances: () => ipcRenderer.invoke('get-all-advances'),
  addAdvance: (data) => ipcRenderer.invoke('add-advance', data),
  updateAdvance: (data) => ipcRenderer.invoke('update-advance', data),
  deleteAdvance: (id) => ipcRenderer.invoke('delete-advance', id),
  getClientExpenseAdvance: (clientId, matterId) => ipcRenderer.invoke('get-client-expense-advance', clientId, matterId),
  getClientRetainer: (clientId, matterId) => ipcRenderer.invoke('get-client-retainer', clientId, matterId),
  getLawyerAdvance: (lawyerId) => ipcRenderer.invoke('get-lawyer-advance', lawyerId),
  deductFromAdvance: (advanceId, amount) => ipcRenderer.invoke('deduct-from-advance', advanceId, amount),
  deductRetainer: (clientId, matterId, advanceType, amount) => ipcRenderer.invoke('deduct-retainer', clientId, matterId, advanceType, amount),

  // Invoices
  getAllInvoices: () => ipcRenderer.invoke('get-all-invoices'),
  getInvoice: (id) => ipcRenderer.invoke('get-invoice', id),
  getInvoiceItems: (invoiceId) => ipcRenderer.invoke('get-invoice-items', invoiceId),
  createInvoice: (invoice, items) => ipcRenderer.invoke('create-invoice', invoice, items),
  updateInvoiceStatus: (id, status) => ipcRenderer.invoke('update-invoice-status', id, status),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),
  generateInvoiceNumber: () => ipcRenderer.invoke('generate-invoice-number'),
  generateInvoicePdfs: (invoiceId, options) => ipcRenderer.invoke('generate-invoice-pdfs', invoiceId, options), // v46.43 D9

  // Appointments
  getAllAppointments: () => ipcRenderer.invoke('get-all-appointments'),
  addAppointment: (data) => ipcRenderer.invoke('add-appointment', data),
  updateAppointment: (data) => ipcRenderer.invoke('update-appointment', data),
  deleteAppointment: (id) => ipcRenderer.invoke('delete-appointment', id),

  // Lookups
  getCourtTypes: () => ipcRenderer.invoke('get-court-types'),
  getRegions: () => ipcRenderer.invoke('get-regions'),
  getHearingPurposes: () => ipcRenderer.invoke('get-hearing-purposes'),
  getTaskTypes: () => ipcRenderer.invoke('get-task-types'),
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  addLookupItem: (type, data) => ipcRenderer.invoke('add-lookup-item', type, data),
  updateLookupItem: (type, data) => ipcRenderer.invoke('update-lookup-item', type, data),
  deleteLookupItem: (type, id) => ipcRenderer.invoke('delete-lookup-item', type, id),

  // Entity Types (v41)
  getEntityTypes: () => ipcRenderer.invoke('get-entity-types'),

  // Corporate Entities (v41.1)
  getAllCorporateEntities: () => ipcRenderer.invoke('get-all-corporate-entities'),
  getCorporateEntity: (clientId) => ipcRenderer.invoke('get-corporate-entity', clientId),
  addCorporateEntity: (data) => ipcRenderer.invoke('add-corporate-entity', data),
  updateCorporateEntity: (data) => ipcRenderer.invoke('update-corporate-entity', data),
  deleteCorporateEntity: (clientId) => ipcRenderer.invoke('delete-corporate-entity', clientId),
  getCompanyClientsWithoutEntity: () => ipcRenderer.invoke('get-company-clients-without-entity'),
  getCorporateClients: () => ipcRenderer.invoke('get-corporate-clients'),

  // Shareholders (v41.7)
  getShareholders: (clientId) => ipcRenderer.invoke('get-shareholders', clientId),
  addShareholder: (data) => ipcRenderer.invoke('add-shareholder', data),
  updateShareholder: (data) => ipcRenderer.invoke('update-shareholder', data),
  deleteShareholder: (id) => ipcRenderer.invoke('delete-shareholder', id),
  getTotalShares: (clientId) => ipcRenderer.invoke('get-total-shares', clientId),

  // Share Transfers (v46.27)
  getShareTransfers: (clientId) => ipcRenderer.invoke('get-share-transfers', clientId),
  addShareTransfer: (data) => ipcRenderer.invoke('add-share-transfer', data),
  updateShareTransfer: (data) => ipcRenderer.invoke('update-share-transfer', data),
  deleteShareTransfer: (id) => ipcRenderer.invoke('delete-share-transfer', id),

  // Directors (v41.8)
  getDirectors: (clientId) => ipcRenderer.invoke('get-directors', clientId),
  addDirector: (data) => ipcRenderer.invoke('add-director', data),
  updateDirector: (data) => ipcRenderer.invoke('update-director', data),
  deleteDirector: (id) => ipcRenderer.invoke('delete-director', id),

  // Commercial Register Filings (v41.9)
  getFilings: (clientId) => ipcRenderer.invoke('get-filings', clientId),
  addFiling: (data) => ipcRenderer.invoke('add-filing', data),
  updateFiling: (data) => ipcRenderer.invoke('update-filing', data),
  deleteFiling: (id) => ipcRenderer.invoke('delete-filing', id),

  // Company Meetings (v41.9)
  getMeetings: (clientId) => ipcRenderer.invoke('get-meetings', clientId),
  addMeeting: (data) => ipcRenderer.invoke('add-meeting', data),
  updateMeeting: (data) => ipcRenderer.invoke('update-meeting', data),
  deleteMeeting: (id) => ipcRenderer.invoke('delete-meeting', id),

  // Dashboard Compliance (v41.9)
  getUpcomingCompliance: (daysAhead) => ipcRenderer.invoke('get-upcoming-compliance', daysAhead),

  // Conflict Check
  conflictCheck: (searchTerms) => ipcRenderer.invoke('conflict-check', searchTerms),
  logConflictCheck: (data) => ipcRenderer.invoke('log-conflict-check', data),
  
  // Reports
  generateReport: (reportType, filters) => ipcRenderer.invoke('generate-report', reportType, filters),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key, value, type, category) => ipcRenderer.invoke('save-setting', key, value, type, category),
  getFirmInfo: () => ipcRenderer.invoke('get-firm-info'),
  saveFirmInfo: (data) => ipcRenderer.invoke('save-firm-info', data),
  updateFirmInfo: (data) => ipcRenderer.invoke('save-firm-info', data),

  // Currency Management (v46.52)
  getCurrencies: () => ipcRenderer.invoke('get-currencies'),
  addCurrency: (data) => ipcRenderer.invoke('add-currency', data),
  updateCurrency: (data) => ipcRenderer.invoke('update-currency', data),
  deleteCurrency: (id) => ipcRenderer.invoke('delete-currency', id),

  // Exchange Rates (v46.52)
  getExchangeRates: () => ipcRenderer.invoke('get-exchange-rates'),
  addExchangeRate: (data) => ipcRenderer.invoke('add-exchange-rate', data),
  updateExchangeRate: (data) => ipcRenderer.invoke('update-exchange-rate', data),
  deleteExchangeRate: (id) => ipcRenderer.invoke('delete-exchange-rate', id),
  getExchangeRateForDate: (from, to, date) => ipcRenderer.invoke('get-exchange-rate-for-date', from, to, date),

  // Backup & Restore (v14)
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: (filePath) => ipcRenderer.invoke('restore-database', filePath),
  exportAllData: () => ipcRenderer.invoke('export-all-data'),

  // Auto-Backup (v46.22)
  getAutoBackupStatus: () => ipcRenderer.invoke('get-auto-backup-status'),
  saveAutoBackupSettings: (settings) => ipcRenderer.invoke('save-auto-backup-settings', settings),
  runAutoBackup: () => ipcRenderer.invoke('run-auto-backup'),
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  getBackupHistory: () => ipcRenderer.invoke('get-backup-history'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),

  // Trash / Soft Delete (v46.23)
  getTrashItems: () => ipcRenderer.invoke('get-trash-items'),
  getTrashCount: () => ipcRenderer.invoke('get-trash-count'),
  restoreTrashItem: (type, id) => ipcRenderer.invoke('restore-trash-item', type, id),
  permanentDeleteItem: (type, id) => ipcRenderer.invoke('permanent-delete-item', type, id),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),

  // Export (v14)
  exportToExcel: (data, filename) => ipcRenderer.invoke('export-to-excel', data, filename),
  exportToCsv: (data, filename) => ipcRenderer.invoke('export-to-csv', data, filename),
  exportToPdf: (reportType, data, filename) => ipcRenderer.invoke('export-to-pdf', reportType, data, filename),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Client Statement exports (v44.3)
  exportClientStatementPdf: (statementData, firmInfo) => ipcRenderer.invoke('export-client-statement-pdf', statementData, firmInfo),
  exportClientStatementExcel: (statementData) => ipcRenderer.invoke('export-client-statement-excel', statementData),

  // Case Status Report exports (v44.3)
  exportCaseStatusPdf: (reportData, firmInfo) => ipcRenderer.invoke('export-case-status-pdf', reportData, firmInfo),
  exportCaseStatusExcel: (reportData) => ipcRenderer.invoke('export-case-status-excel', reportData),

  // Client 360° Report exports (v44.5)
  exportClient360Pdf: (reportData, firmInfo) => ipcRenderer.invoke('export-client-360-pdf', reportData, firmInfo),
  exportClient360Excel: (reportData) => ipcRenderer.invoke('export-client-360-excel', reportData),

  // License Management (v46.48)
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  validateLicense: (licenseKey) => ipcRenderer.invoke('license:validate', licenseKey),
  clearLicense: () => ipcRenderer.invoke('license:clear'),
});

console.log('Preload script loaded - v46.55 with Office File No. uniqueness check');
