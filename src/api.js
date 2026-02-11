// ============================================
// QANUNI API ABSTRACTION LAYER
// ============================================
// This layer abstracts all data operations.
// Desktop version uses window.electronAPI
// Web version will swap to fetch() calls
// ============================================

// Environment detection
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// Base API implementation for Electron (Desktop)
const electronAPI = {
  // ============================================
  // CLIENTS
  // ============================================
  clients: {
    getAll: () => window.electronAPI.getAllClients(),
    add: (data) => window.electronAPI.addClient(data),
    update: (data) => window.electronAPI.updateClient(data),
    delete: (id) => window.electronAPI.deleteClient(id),
  },

  // ============================================
  // MATTERS
  // ============================================
  matters: {
    getAll: () => window.electronAPI.getAllMatters(),
    add: (data) => window.electronAPI.addMatter(data),
    update: (data) => window.electronAPI.updateMatter(data),
    delete: (id) => window.electronAPI.deleteMatter(id),
  },

  // ============================================
  // HEARINGS
  // ============================================
  hearings: {
    getAll: () => window.electronAPI.getAllHearings(),
    add: (data) => window.electronAPI.addHearing(data),
    update: (data) => window.electronAPI.updateHearing(data),
    delete: (id) => window.electronAPI.deleteHearing(id),
  },

  // ============================================
  // JUDGMENTS
  // ============================================
  judgments: {
    getAll: () => window.electronAPI.getAllJudgments(),
    add: (data) => window.electronAPI.addJudgment(data),
    update: (data) => window.electronAPI.updateJudgment(data),
    delete: (id) => window.electronAPI.deleteJudgment(id),
  },

  // ============================================
  // DEADLINES
  // ============================================
  deadlines: {
    getAll: () => window.electronAPI.getAllDeadlines(),
    add: (data) => window.electronAPI.addDeadline(data),
    update: (data) => window.electronAPI.updateDeadline(data),
    delete: (id) => window.electronAPI.deleteDeadline(id),
  },

  // ============================================
  // TASKS
  // ============================================
  tasks: {
    getAll: () => window.electronAPI.getAllTasks(),
    add: (data) => window.electronAPI.addTask(data),
    update: (data) => window.electronAPI.updateTask(data),
    delete: (id) => window.electronAPI.deleteTask(id),
  },

  // ============================================
  // TIMESHEETS
  // ============================================
  timesheets: {
    getAll: () => window.electronAPI.getAllTimesheets(),
    add: (data) => window.electronAPI.addTimesheet(data),
    update: (data) => window.electronAPI.updateTimesheet(data),
    delete: (id) => window.electronAPI.deleteTimesheet(id),
    getUnbilled: (clientId, matterId) => window.electronAPI.getUnbilledTime(clientId, matterId),
  },

  // ============================================
  // APPOINTMENTS
  // ============================================
  appointments: {
    getAll: () => window.electronAPI.getAllAppointments(),
    add: (data) => window.electronAPI.addAppointment(data),
    update: (data) => window.electronAPI.updateAppointment(data),
    delete: (id) => window.electronAPI.deleteAppointment(id),
  },

  // ============================================
  // EXPENSES
  // ============================================
  expenses: {
    getAll: () => window.electronAPI.getAllExpenses(),
    add: (data) => window.electronAPI.addExpenseWithDeduction(data),
    update: (data) => window.electronAPI.updateExpense(data),
    delete: (id) => window.electronAPI.deleteExpense(id),
    getUnbilled: (clientId, matterId) => window.electronAPI.getUnbilledExpenses(clientId, matterId),
  },

  // ============================================
  // ADVANCES
  // ============================================
  advances: {
    getAll: () => window.electronAPI.getAllAdvances(),
    add: (data) => window.electronAPI.addAdvance(data),
    update: (data) => window.electronAPI.updateAdvance(data),
    delete: (id) => window.electronAPI.deleteAdvance(id),
    getClientRetainer: (clientId) => window.electronAPI.getClientRetainer(clientId),
    getClientExpenseAdvance: (clientId) => window.electronAPI.getClientExpenseAdvance(clientId),
    getLawyerAdvance: (lawyerId) => window.electronAPI.getLawyerAdvance(lawyerId),
    deductRetainer: (clientId, amount) => window.electronAPI.deductRetainer(clientId, amount),
  },

  // ============================================
  // INVOICES
  // ============================================
  invoices: {
    getAll: () => window.electronAPI.getAllInvoices(),
    create: (data) => window.electronAPI.createInvoice(data),
    updateStatus: (id, status) => window.electronAPI.updateInvoiceStatus(id, status),
    delete: (id) => window.electronAPI.deleteInvoice(id),
    getItems: (invoiceId) => window.electronAPI.getInvoiceItems(invoiceId),
    generateNumber: () => window.electronAPI.generateInvoiceNumber(),
  },

  // ============================================
  // LOOKUPS
  // ============================================
  lookups: {
    getCourtTypes: () => window.electronAPI.getCourtTypes(),
    getRegions: () => window.electronAPI.getRegions(),
    getHearingPurposes: () => window.electronAPI.getHearingPurposes(),
    getTaskTypes: () => window.electronAPI.getTaskTypes(),
    getExpenseCategories: () => window.electronAPI.getExpenseCategories(),
    getLawyers: () => window.electronAPI.getLawyers(),
    addItem: (type, data) => window.electronAPI.addLookupItem(type, data),
    updateItem: (type, data) => window.electronAPI.updateLookupItem(type, data),
    deleteItem: (type, id) => window.electronAPI.deleteLookupItem(type, id),
  },

  // ============================================
  // DASHBOARD & REPORTS
  // ============================================
  dashboard: {
    getStats: () => window.electronAPI.getDashboardStats(),
  },

  reports: {
    generate: (type, params) => window.electronAPI.generateReport(type, params),
    exportToExcel: (data, filename) => window.electronAPI.exportToExcel(data, filename),
    exportToCsv: (data, filename) => window.electronAPI.exportToCsv(data, filename),
    exportToPdf: (data, filename, title) => window.electronAPI.exportToPdf(data, filename, title),
  },

  // ============================================
  // SETTINGS & FIRM INFO
  // ============================================
  settings: {
    getFirmInfo: () => window.electronAPI.getFirmInfo(),
    saveFirmInfo: (data) => window.electronAPI.saveFirmInfo(data),
  },

  // ============================================
  // BACKUP & RESTORE
  // ============================================
  backup: {
    create: () => window.electronAPI.backupDatabase(),
    restore: () => window.electronAPI.restoreDatabase(),
    exportAll: () => window.electronAPI.exportAllData(),
  },

  // ============================================
  // CONFLICT CHECK
  // ============================================
  conflicts: {
    check: (name, matterId) => window.electronAPI.conflictCheck(name, matterId),
    log: (data) => window.electronAPI.logConflictCheck(data),
  },

  // ============================================
  // FILE OPERATIONS
  // ============================================
  files: {
    open: (filepath) => window.electronAPI.openFile(filepath),
  },
};

// ============================================
// WEB API IMPLEMENTATION (Future)
// ============================================
const webAPI = {
  // Will be implemented when building web version
  // Same structure as electronAPI but using fetch()
  //
  // Example:
  // clients: {
  //   getAll: async () => {
  //     const response = await fetch('/api/clients', {
  //       headers: { 'Authorization': `Bearer ${getToken()}` }
  //     });
  //     return response.json();
  //   },
  //   add: async (data) => {
  //     const response = await fetch('/api/clients', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${getToken()}`
  //       },
  //       body: JSON.stringify(data)
  //     });
  //     return response.json();
  //   },
  //   // ... etc
  // },
};

// ============================================
// EXPORT THE APPROPRIATE API
// ============================================
const api = isElectron() ? electronAPI : webAPI;

export default api;

// ============================================
// CONVENIENCE EXPORTS
// ============================================
export const {
  clients,
  matters,
  hearings,
  judgments,
  deadlines,
  tasks,
  timesheets,
  appointments,
  expenses,
  advances,
  invoices,
  lookups,
  dashboard,
  reports,
  settings,
  backup,
  conflicts,
  files,
} = api;
