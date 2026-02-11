// src/api-client.js
// Dual-mode API client: works in both Electron (IPC) and Web (REST) modes
// Session 3 - Phase 1 - Step 1: Boilerplate

// Environment detection
const isElectron = () => {
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined;
};

// Helper: Fetch API wrapper with error handling
const fetchAPI = async (endpoint, options = {}) => {
  const baseURL = 'http://localhost:3001/api';
  const url = `${baseURL}${endpoint}`;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// Helper: Electron-only error for web mode
const electronOnlyError = (methodName) => {
  throw new Error(`${methodName} is only available in desktop mode`);
};

// API Client object
const apiClient = {
  // Environment info
  isElectron: isElectron(),

  // Methods will be added incrementally in Steps 2-15

  // ============================================
  // CLIENT METHODS (6)
  // ============================================

  getClients: async () => {
    if (isElectron()) {
      return await window.electronAPI.getClients();
    }
    return await fetchAPI('/clients');
  },

  getClient: async (clientId) => {
    if (isElectron()) {
      return await window.electronAPI.getClient(clientId);
    }
    return await fetchAPI(`/clients/${clientId}`);
  },

  createClient: async (clientData) => {
    if (isElectron()) {
      return await window.electronAPI.createClient(clientData);
    }
    return await fetchAPI('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  updateClient: async (clientData) => {
    if (isElectron()) {
      return await window.electronAPI.updateClient(clientData);
    }
    return await fetchAPI(`/clients/${clientData.client_id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  },

  deleteClient: async (clientId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteClient(clientId);
    }
    return await fetchAPI(`/clients/${clientId}`, {
      method: 'DELETE',
    });
  },

  searchClients: async (query) => {
    if (isElectron()) {
      return await window.electronAPI.searchClients(query);
    }
    return await fetchAPI(`/clients/search?q=${encodeURIComponent(query)}`);
  },

  // ============================================
  // MATTER METHODS (7)
  // ============================================

  getMatters: async () => {
    if (isElectron()) {
      return await window.electronAPI.getMatters();
    }
    return await fetchAPI('/matters');
  },

  getMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getMatter(matterId);
    }
    return await fetchAPI(`/matters/${matterId}`);
  },

  createMatter: async (matterData) => {
    if (isElectron()) {
      return await window.electronAPI.createMatter(matterData);
    }
    return await fetchAPI('/matters', {
      method: 'POST',
      body: JSON.stringify(matterData),
    });
  },

  updateMatter: async (matterData) => {
    if (isElectron()) {
      return await window.electronAPI.updateMatter(matterData);
    }
    return await fetchAPI(`/matters/${matterData.matter_id}`, {
      method: 'PUT',
      body: JSON.stringify(matterData),
    });
  },

  deleteMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteMatter(matterId);
    }
    return await fetchAPI(`/matters/${matterId}`, {
      method: 'DELETE',
    });
  },

  getMatterTimeline: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getMatterTimeline(matterId);
    }
    return await fetchAPI(`/matters/${matterId}/timeline`);
  },

  getMatterFinancials: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getMatterFinancials(matterId);
    }
    return await fetchAPI(`/matters/${matterId}/financials`);
  },

  // ============================================
  // HEARING METHODS (4)
  // ============================================

  getHearings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getHearings();
    }
    return await fetchAPI('/hearings');
  },

  createHearing: async (hearingData) => {
    if (isElectron()) {
      return await window.electronAPI.createHearing(hearingData);
    }
    return await fetchAPI('/hearings', {
      method: 'POST',
      body: JSON.stringify(hearingData),
    });
  },

  updateHearing: async (hearingData) => {
    if (isElectron()) {
      return await window.electronAPI.updateHearing(hearingData);
    }
    return await fetchAPI(`/hearings/${hearingData.hearing_id}`, {
      method: 'PUT',
      body: JSON.stringify(hearingData),
    });
  },

  deleteHearing: async (hearingId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteHearing(hearingId);
    }
    return await fetchAPI(`/hearings/${hearingId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // TASK METHODS (4)
  // ============================================

  getTasks: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTasks();
    }
    return await fetchAPI('/tasks');
  },

  createTask: async (taskData) => {
    if (isElectron()) {
      return await window.electronAPI.createTask(taskData);
    }
    return await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  updateTask: async (taskData) => {
    if (isElectron()) {
      return await window.electronAPI.updateTask(taskData);
    }
    return await fetchAPI(`/tasks/${taskData.task_id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  deleteTask: async (taskId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteTask(taskId);
    }
    return await fetchAPI(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // TIMESHEET METHODS (5)
  // ============================================

  getTimesheets: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTimesheets();
    }
    return await fetchAPI('/timesheets');
  },

  createTimesheet: async (timesheetData) => {
    if (isElectron()) {
      return await window.electronAPI.createTimesheet(timesheetData);
    }
    return await fetchAPI('/timesheets', {
      method: 'POST',
      body: JSON.stringify(timesheetData),
    });
  },

  updateTimesheet: async (timesheetData) => {
    if (isElectron()) {
      return await window.electronAPI.updateTimesheet(timesheetData);
    }
    return await fetchAPI(`/timesheets/${timesheetData.timesheet_id}`, {
      method: 'PUT',
      body: JSON.stringify(timesheetData),
    });
  },

  deleteTimesheet: async (timesheetId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteTimesheet(timesheetId);
    }
    return await fetchAPI(`/timesheets/${timesheetId}`, {
      method: 'DELETE',
    });
  },

  getTimesheetsByMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getTimesheetsByMatter(matterId);
    }
    return await fetchAPI(`/timesheets/matter/${matterId}`);
  },

  // ============================================
  // EXPENSE METHODS (8)
  // ============================================

  getExpenses: async () => {
    if (isElectron()) {
      return await window.electronAPI.getExpenses();
    }
    return await fetchAPI('/expenses');
  },

  createExpense: async (expenseData) => {
    if (isElectron()) {
      return await window.electronAPI.createExpense(expenseData);
    }
    return await fetchAPI('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },

  updateExpense: async (expenseData) => {
    if (isElectron()) {
      return await window.electronAPI.updateExpense(expenseData);
    }
    return await fetchAPI(`/expenses/${expenseData.expense_id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  },

  deleteExpense: async (expenseId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteExpense(expenseId);
    }
    return await fetchAPI(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  getExpensesByMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getExpensesByMatter(matterId);
    }
    return await fetchAPI(`/expenses/matter/${matterId}`);
  },

  getExpenseCategories: async () => {
    if (isElectron()) {
      return await window.electronAPI.getExpenseCategories();
    }
    return await fetchAPI('/expenses/categories');
  },

  createExpenseCategory: async (categoryData) => {
    if (isElectron()) {
      return await window.electronAPI.createExpenseCategory(categoryData);
    }
    return await fetchAPI('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  deleteExpenseCategory: async (categoryId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteExpenseCategory(categoryId);
    }
    return await fetchAPI(`/expenses/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // ADVANCE METHODS (10)
  // ============================================

  getAdvances: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAdvances();
    }
    return await fetchAPI('/advances');
  },

  createAdvance: async (advanceData) => {
    if (isElectron()) {
      return await window.electronAPI.createAdvance(advanceData);
    }
    return await fetchAPI('/advances', {
      method: 'POST',
      body: JSON.stringify(advanceData),
    });
  },

  updateAdvance: async (advanceData) => {
    if (isElectron()) {
      return await window.electronAPI.updateAdvance(advanceData);
    }
    return await fetchAPI(`/advances/${advanceData.advance_id}`, {
      method: 'PUT',
      body: JSON.stringify(advanceData),
    });
  },

  deleteAdvance: async (advanceId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteAdvance(advanceId);
    }
    return await fetchAPI(`/advances/${advanceId}`, {
      method: 'DELETE',
    });
  },

  getAdvancesByMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getAdvancesByMatter(matterId);
    }
    return await fetchAPI(`/advances/matter/${matterId}`);
  },

  getAdvancesByClient: async (clientId) => {
    if (isElectron()) {
      return await window.electronAPI.getAdvancesByClient(clientId);
    }
    return await fetchAPI(`/advances/client/${clientId}`);
  },

  allocateAdvance: async (allocationData) => {
    if (isElectron()) {
      return await window.electronAPI.allocateAdvance(allocationData);
    }
    return await fetchAPI('/advances/allocate', {
      method: 'POST',
      body: JSON.stringify(allocationData),
    });
  },

  getAllocations: async (advanceId) => {
    if (isElectron()) {
      return await window.electronAPI.getAllocations(advanceId);
    }
    return await fetchAPI(`/advances/${advanceId}/allocations`);
  },

  deleteAllocation: async (allocationId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteAllocation(allocationId);
    }
    return await fetchAPI(`/advances/allocations/${allocationId}`, {
      method: 'DELETE',
    });
  },

  getClientBalance: async (clientId) => {
    if (isElectron()) {
      return await window.electronAPI.getClientBalance(clientId);
    }
    return await fetchAPI(`/advances/client/${clientId}/balance`);
  },

  // ============================================
  // INVOICE METHODS (8)
  // ============================================

  getInvoices: async () => {
    if (isElectron()) {
      return await window.electronAPI.getInvoices();
    }
    return await fetchAPI('/invoices');
  },

  createInvoice: async (invoiceData) => {
    if (isElectron()) {
      return await window.electronAPI.createInvoice(invoiceData);
    }
    return await fetchAPI('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  updateInvoice: async (invoiceData) => {
    if (isElectron()) {
      return await window.electronAPI.updateInvoice(invoiceData);
    }
    return await fetchAPI(`/invoices/${invoiceData.invoice_id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  deleteInvoice: async (invoiceId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteInvoice(invoiceId);
    }
    return await fetchAPI(`/invoices/${invoiceId}`, {
      method: 'DELETE',
    });
  },

  getInvoicesByMatter: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getInvoicesByMatter(matterId);
    }
    return await fetchAPI(`/invoices/matter/${matterId}`);
  },

  getInvoicesByClient: async (clientId) => {
    if (isElectron()) {
      return await window.electronAPI.getInvoicesByClient(clientId);
    }
    return await fetchAPI(`/invoices/client/${clientId}`);
  },

  recordPayment: async (paymentData) => {
    if (isElectron()) {
      return await window.electronAPI.recordPayment(paymentData);
    }
    return await fetchAPI('/invoices/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  deletePayment: async (paymentId) => {
    if (isElectron()) {
      return await window.electronAPI.deletePayment(paymentId);
    }
    return await fetchAPI(`/invoices/payments/${paymentId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // JUDGMENT METHODS (4)
  // ============================================

  getJudgments: async () => {
    if (isElectron()) {
      return await window.electronAPI.getJudgments();
    }
    return await fetchAPI('/judgments');
  },

  createJudgment: async (judgmentData) => {
    if (isElectron()) {
      return await window.electronAPI.createJudgment(judgmentData);
    }
    return await fetchAPI('/judgments', {
      method: 'POST',
      body: JSON.stringify(judgmentData),
    });
  },

  updateJudgment: async (judgmentData) => {
    if (isElectron()) {
      return await window.electronAPI.updateJudgment(judgmentData);
    }
    return await fetchAPI(`/judgments/${judgmentData.judgment_id}`, {
      method: 'PUT',
      body: JSON.stringify(judgmentData),
    });
  },

  deleteJudgment: async (judgmentId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteJudgment(judgmentId);
    }
    return await fetchAPI(`/judgments/${judgmentId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // DEADLINE METHODS (6)
  // ============================================

  getDeadlines: async () => {
    if (isElectron()) {
      return await window.electronAPI.getDeadlines();
    }
    return await fetchAPI('/deadlines');
  },

  createDeadline: async (deadlineData) => {
    if (isElectron()) {
      return await window.electronAPI.createDeadline(deadlineData);
    }
    return await fetchAPI('/deadlines', {
      method: 'POST',
      body: JSON.stringify(deadlineData),
    });
  },

  updateDeadline: async (deadlineData) => {
    if (isElectron()) {
      return await window.electronAPI.updateDeadline(deadlineData);
    }
    return await fetchAPI(`/deadlines/${deadlineData.deadline_id}`, {
      method: 'PUT',
      body: JSON.stringify(deadlineData),
    });
  },

  deleteDeadline: async (deadlineId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteDeadline(deadlineId);
    }
    return await fetchAPI(`/deadlines/${deadlineId}`, {
      method: 'DELETE',
    });
  },

  completeDeadline: async (deadlineId) => {
    if (isElectron()) {
      return await window.electronAPI.completeDeadline(deadlineId);
    }
    return await fetchAPI(`/deadlines/${deadlineId}/complete`, {
      method: 'POST',
    });
  },

  uncompleteDeadline: async (deadlineId) => {
    if (isElectron()) {
      return await window.electronAPI.uncompleteDeadline(deadlineId);
    }
    return await fetchAPI(`/deadlines/${deadlineId}/uncomplete`, {
      method: 'POST',
    });
  },

  // ============================================
  // APPOINTMENT METHODS (4)
  // ============================================

  getAppointments: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAppointments();
    }
    return await fetchAPI('/appointments');
  },

  createAppointment: async (appointmentData) => {
    if (isElectron()) {
      return await window.electronAPI.createAppointment(appointmentData);
    }
    return await fetchAPI('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  updateAppointment: async (appointmentData) => {
    if (isElectron()) {
      return await window.electronAPI.updateAppointment(appointmentData);
    }
    return await fetchAPI(`/appointments/${appointmentData.appointment_id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  },

  deleteAppointment: async (appointmentId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteAppointment(appointmentId);
    }
    return await fetchAPI(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // DIARY METHODS (4)
  // ============================================

  getDiaryEntries: async () => {
    if (isElectron()) {
      return await window.electronAPI.getDiaryEntries();
    }
    return await fetchAPI('/diary');
  },

  createDiaryEntry: async (diaryData) => {
    if (isElectron()) {
      return await window.electronAPI.createDiaryEntry(diaryData);
    }
    return await fetchAPI('/diary', {
      method: 'POST',
      body: JSON.stringify(diaryData),
    });
  },

  updateDiaryEntry: async (diaryData) => {
    if (isElectron()) {
      return await window.electronAPI.updateDiaryEntry(diaryData);
    }
    return await fetchAPI(`/diary/${diaryData.diary_id}`, {
      method: 'PUT',
      body: JSON.stringify(diaryData),
    });
  },

  deleteDiaryEntry: async (diaryId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteDiaryEntry(diaryId);
    }
    return await fetchAPI(`/diary/${diaryId}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // LAWYER METHODS (7)
  // ============================================

  getLawyers: async () => {
    if (isElectron()) {
      return await window.electronAPI.getLawyers();
    }
    return await fetchAPI('/lawyers');
  },

  createLawyer: async (lawyerData) => {
    if (isElectron()) {
      return await window.electronAPI.createLawyer(lawyerData);
    }
    return await fetchAPI('/lawyers', {
      method: 'POST',
      body: JSON.stringify(lawyerData),
    });
  },

  updateLawyer: async (lawyerData) => {
    if (isElectron()) {
      return await window.electronAPI.updateLawyer(lawyerData);
    }
    return await fetchAPI(`/lawyers/${lawyerData.lawyer_id}`, {
      method: 'PUT',
      body: JSON.stringify(lawyerData),
    });
  },

  deleteLawyer: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteLawyer(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}`, {
      method: 'DELETE',
    });
  },

  getLawyerStats: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.getLawyerStats(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}/stats`);
  },

  getLawyerMatters: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.getLawyerMatters(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}/matters`);
  },

  getLawyerTimesheets: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.getLawyerTimesheets(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}/timesheets`);
  },

  // ============================================
  // LOOKUP METHODS (9)
  // ============================================

  getCourtTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCourtTypes();
    }
    return await fetchAPI('/lookups/court-types');
  },

  getRegions: async () => {
    if (isElectron()) {
      return await window.electronAPI.getRegions();
    }
    return await fetchAPI('/lookups/regions');
  },

  getMatterTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getMatterTypes();
    }
    return await fetchAPI('/lookups/matter-types');
  },

  getMatterStatuses: async () => {
    if (isElectron()) {
      return await window.electronAPI.getMatterStatuses();
    }
    return await fetchAPI('/lookups/matter-statuses');
  },

  getTaskTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTaskTypes();
    }
    return await fetchAPI('/lookups/task-types');
  },

  createLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.createLookup(lookupData);
    }
    return await fetchAPI('/lookups', {
      method: 'POST',
      body: JSON.stringify(lookupData),
    });
  },

  updateLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.updateLookup(lookupData);
    }
    return await fetchAPI(`/lookups/${lookupData.id}`, {
      method: 'PUT',
      body: JSON.stringify(lookupData),
    });
  },

  deleteLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.deleteLookup(lookupData);
    }
    const { table_name, id } = lookupData;
    return await fetchAPI(`/lookups/${table_name}/${id}`, {
      method: 'DELETE',
    });
  },

  getCourts: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCourts();
    }
    return await fetchAPI('/lookups/courts');
  },

  // ============================================
  // CORPORATE METHODS - PART 1 (15 of 29)
  // ============================================

  getEntities: async () => {
    if (isElectron()) {
      return await window.electronAPI.getEntities();
    }
    return await fetchAPI('/corporate/entities');
  },

  getEntity: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getEntity(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}`);
  },

  createEntity: async (entityData) => {
    if (isElectron()) {
      return await window.electronAPI.createEntity(entityData);
    }
    return await fetchAPI('/corporate/entities', {
      method: 'POST',
      body: JSON.stringify(entityData),
    });
  },

  updateEntity: async (entityData) => {
    if (isElectron()) {
      return await window.electronAPI.updateEntity(entityData);
    }
    return await fetchAPI(`/corporate/entities/${entityData.entity_id}`, {
      method: 'PUT',
      body: JSON.stringify(entityData),
    });
  },

  deleteEntity: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteEntity(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}`, {
      method: 'DELETE',
    });
  },

  getShareholders: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getShareholders(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/shareholders`);
  },

  createShareholder: async (shareholderData) => {
    if (isElectron()) {
      return await window.electronAPI.createShareholder(shareholderData);
    }
    return await fetchAPI('/corporate/shareholders', {
      method: 'POST',
      body: JSON.stringify(shareholderData),
    });
  },

  updateShareholder: async (shareholderData) => {
    if (isElectron()) {
      return await window.electronAPI.updateShareholder(shareholderData);
    }
    return await fetchAPI(`/corporate/shareholders/${shareholderData.shareholder_id}`, {
      method: 'PUT',
      body: JSON.stringify(shareholderData),
    });
  },

  deleteShareholder: async (shareholderId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteShareholder(shareholderId);
    }
    return await fetchAPI(`/corporate/shareholders/${shareholderId}`, {
      method: 'DELETE',
    });
  },

  getDirectors: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getDirectors(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/directors`);
  },

  createDirector: async (directorData) => {
    if (isElectron()) {
      return await window.electronAPI.createDirector(directorData);
    }
    return await fetchAPI('/corporate/directors', {
      method: 'POST',
      body: JSON.stringify(directorData),
    });
  },

  updateDirector: async (directorData) => {
    if (isElectron()) {
      return await window.electronAPI.updateDirector(directorData);
    }
    return await fetchAPI(`/corporate/directors/${directorData.director_id}`, {
      method: 'PUT',
      body: JSON.stringify(directorData),
    });
  },

  deleteDirector: async (directorId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteDirector(directorId);
    }
    return await fetchAPI(`/corporate/directors/${directorId}`, {
      method: 'DELETE',
    });
  },

  getBoardMeetings: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getBoardMeetings(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/board-meetings`);
  },

  createBoardMeeting: async (meetingData) => {
    if (isElectron()) {
      return await window.electronAPI.createBoardMeeting(meetingData);
    }
    return await fetchAPI('/corporate/board-meetings', {
      method: 'POST',
      body: JSON.stringify(meetingData),
    });
  },

  // ============================================
  // CORPORATE METHODS - PART 2 (14 of 29)
  // ============================================

  updateBoardMeeting: async (meetingData) => {
    if (isElectron()) {
      return await window.electronAPI.updateBoardMeeting(meetingData);
    }
    return await fetchAPI(`/corporate/board-meetings/${meetingData.meeting_id}`, {
      method: 'PUT',
      body: JSON.stringify(meetingData),
    });
  },

  deleteBoardMeeting: async (meetingId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteBoardMeeting(meetingId);
    }
    return await fetchAPI(`/corporate/board-meetings/${meetingId}`, {
      method: 'DELETE',
    });
  },

  getShareTransfers: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getShareTransfers(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/share-transfers`);
  },

  createShareTransfer: async (transferData) => {
    if (isElectron()) {
      return await window.electronAPI.createShareTransfer(transferData);
    }
    return await fetchAPI('/corporate/share-transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  },

  updateShareTransfer: async (transferData) => {
    if (isElectron()) {
      return await window.electronAPI.updateShareTransfer(transferData);
    }
    return await fetchAPI(`/corporate/share-transfers/${transferData.transfer_id}`, {
      method: 'PUT',
      body: JSON.stringify(transferData),
    });
  },

  deleteShareTransfer: async (transferId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteShareTransfer(transferId);
    }
    return await fetchAPI(`/corporate/share-transfers/${transferId}`, {
      method: 'DELETE',
    });
  },

  getCorporateDocuments: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getCorporateDocuments(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/documents`);
  },

  createCorporateDocument: async (documentData) => {
    if (isElectron()) {
      return await window.electronAPI.createCorporateDocument(documentData);
    }
    return await fetchAPI('/corporate/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  },

  updateCorporateDocument: async (documentData) => {
    if (isElectron()) {
      return await window.electronAPI.updateCorporateDocument(documentData);
    }
    return await fetchAPI(`/corporate/documents/${documentData.document_id}`, {
      method: 'PUT',
      body: JSON.stringify(documentData),
    });
  },

  deleteCorporateDocument: async (documentId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteCorporateDocument(documentId);
    }
    return await fetchAPI(`/corporate/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  getCapTable: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getCapTable(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/cap-table`);
  },

  getEntityTimeline: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getEntityTimeline(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}/timeline`);
  },

  getCompanyTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCompanyTypes();
    }
    return await fetchAPI('/corporate/company-types');
  },

  getDirectorRoles: async () => {
    if (isElectron()) {
      return await window.electronAPI.getDirectorRoles();
    }
    return await fetchAPI('/corporate/director-roles');
  },

  // ============================================
  // CONFLICT CHECK METHODS (2)
  // ============================================

  checkConflicts: async (searchData) => {
    if (isElectron()) {
      return await window.electronAPI.checkConflicts(searchData);
    }
    return await fetchAPI('/conflict-check', {
      method: 'POST',
      body: JSON.stringify(searchData),
    });
  },

  getConflictHistory: async () => {
    if (isElectron()) {
      return await window.electronAPI.getConflictHistory();
    }
    return await fetchAPI('/conflict-check/history');
  },

  // ============================================
  // SETTINGS METHODS (10)
  // ============================================

  getSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getSettings();
    }
    return await fetchAPI('/settings');
  },

  updateSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.updateSettings(settings);
    }
    return await fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getInvoiceSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getInvoiceSettings();
    }
    return await fetchAPI('/settings/invoice');
  },

  updateInvoiceSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.updateInvoiceSettings(settings);
    }
    return await fetchAPI('/settings/invoice', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getTimesheetSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTimesheetSettings();
    }
    return await fetchAPI('/settings/timesheet');
  },

  updateTimesheetSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.updateTimesheetSettings(settings);
    }
    return await fetchAPI('/settings/timesheet', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getNextInvoiceNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.getNextInvoiceNumber();
    }
    return await fetchAPI('/settings/next-invoice-number');
  },

  getNextReceiptNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.getNextReceiptNumber();
    }
    return await fetchAPI('/settings/next-receipt-number');
  },

  incrementInvoiceNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.incrementInvoiceNumber();
    }
    return await fetchAPI('/settings/increment-invoice-number', {
      method: 'POST',
    });
  },

  incrementReceiptNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.incrementReceiptNumber();
    }
    return await fetchAPI('/settings/increment-receipt-number', {
      method: 'POST',
    });
  },

  // ============================================
  // REPORTS METHODS (8)
  // ============================================

  getAgingReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getAgingReport(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/aging?${params}`);
  },

  getFinancialSummary: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getFinancialSummary(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/financial-summary?${params}`);
  },

  getTimesheetReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getTimesheetReport(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/timesheet?${params}`);
  },

  getExpenseReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getExpenseReport(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/expense?${params}`);
  },

  getLawyerProductivity: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getLawyerProductivity(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/lawyer-productivity?${params}`);
  },

  getMatterStats: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getMatterStats(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/matter-stats?${params}`);
  },

  getClientReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getClientReport(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/client?${params}`);
  },

  getRevenueReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.getRevenueReport(filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/revenue?${params}`);
  },

  // ============================================
  // TRASH METHODS (2)
  // ============================================

  getTrash: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTrash();
    }
    return await fetchAPI('/trash');
  },

  restoreItem: async (itemData) => {
    if (isElectron()) {
      return await window.electronAPI.restoreItem(itemData);
    }
    return await fetchAPI('/trash/restore', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  // ============================================
  // ELECTRON-ONLY METHODS (19)
  // These are desktop-only features with no web equivalents
  // ============================================

  // Export operations
  exportMattersToExcel: async (matters) => {
    if (isElectron()) {
      return await window.electronAPI.exportMattersToExcel(matters);
    }
    electronOnlyError('exportMattersToExcel');
  },

  exportTimesheetsToExcel: async (timesheets) => {
    if (isElectron()) {
      return await window.electronAPI.exportTimesheetsToExcel(timesheets);
    }
    electronOnlyError('exportTimesheetsToExcel');
  },

  exportExpensesToExcel: async (expenses) => {
    if (isElectron()) {
      return await window.electronAPI.exportExpensesToExcel(expenses);
    }
    electronOnlyError('exportExpensesToExcel');
  },

  exportInvoicesToExcel: async (invoices) => {
    if (isElectron()) {
      return await window.electronAPI.exportInvoicesToExcel(invoices);
    }
    electronOnlyError('exportInvoicesToExcel');
  },

  exportAgingToExcel: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.exportAgingToExcel(data);
    }
    electronOnlyError('exportAgingToExcel');
  },

  // PDF generation
  generateInvoicePDF: async (invoiceData) => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoicePDF(invoiceData);
    }
    electronOnlyError('generateInvoicePDF');
  },

  generateReceiptPDF: async (receiptData) => {
    if (isElectron()) {
      return await window.electronAPI.generateReceiptPDF(receiptData);
    }
    electronOnlyError('generateReceiptPDF');
  },

  // Database operations
  backupDatabase: async () => {
    if (isElectron()) {
      return await window.electronAPI.backupDatabase();
    }
    electronOnlyError('backupDatabase');
  },

  restoreDatabase: async () => {
    if (isElectron()) {
      return await window.electronAPI.restoreDatabase();
    }
    electronOnlyError('restoreDatabase');
  },

  // Client imports
  importClientsFromExcel: async () => {
    if (isElectron()) {
      return await window.electronAPI.importClientsFromExcel();
    }
    electronOnlyError('importClientsFromExcel');
  },

  validateClientImport: async (filePath) => {
    if (isElectron()) {
      return await window.electronAPI.validateClientImport(filePath);
    }
    electronOnlyError('validateClientImport');
  },

  // License operations
  validateLicense: async () => {
    if (isElectron()) {
      return await window.electronAPI.validateLicense();
    }
    electronOnlyError('validateLicense');
  },

  activateLicense: async (licenseKey) => {
    if (isElectron()) {
      return await window.electronAPI.activateLicense(licenseKey);
    }
    electronOnlyError('activateLicense');
  },

  deactivateLicense: async () => {
    if (isElectron()) {
      return await window.electronAPI.deactivateLicense();
    }
    electronOnlyError('deactivateLicense');
  },

  getLicenseInfo: async () => {
    if (isElectron()) {
      return await window.electronAPI.getLicenseInfo();
    }
    electronOnlyError('getLicenseInfo');
  },

  // File dialogs
  showOpenDialog: async (options) => {
    if (isElectron()) {
      return await window.electronAPI.showOpenDialog(options);
    }
    electronOnlyError('showOpenDialog');
  },

  showSaveDialog: async (options) => {
    if (isElectron()) {
      return await window.electronAPI.showSaveDialog(options);
    }
    electronOnlyError('showSaveDialog');
  },

  // App info
  getAppVersion: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAppVersion();
    }
    electronOnlyError('getAppVersion');
  },

  openExternal: async (url) => {
    if (isElectron()) {
      return await window.electronAPI.openExternal(url);
    }
    electronOnlyError('openExternal');
  },
};

export default apiClient;
