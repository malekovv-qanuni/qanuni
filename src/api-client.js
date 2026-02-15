// src/api-client.js
// Dual-mode API client: works in both Electron (IPC) and Web (REST) modes
// Week 3 Day 9: JWT injection + SaaS response unwrapping

// Environment detection
const isElectron = () => {
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined;
};

// JWT token management (SaaS mode only)
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('saas_auth_token', token);
  } else {
    localStorage.removeItem('saas_auth_token');
  }
};

export const logout = () => {
  authToken = null;
  localStorage.removeItem('saas_auth_token');
  localStorage.removeItem('saas_refresh_token');
};

// Load persisted token on module init (SaaS mode only)
if (typeof window !== 'undefined' && !isElectron()) {
  authToken = localStorage.getItem('saas_auth_token');
}

// Helper: Fetch API wrapper with error handling + JWT
const fetchAPI = async (endpoint, options = {}) => {
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  const url = `${baseURL}${endpoint}`;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
  };

  const config = { ...defaultOptions, ...options };
  // Merge headers if options provides custom headers
  if (options.headers) {
    config.headers = { ...defaultOptions.headers, ...options.headers };
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      setAuthToken(null);
      localStorage.removeItem('saas_refresh_token');
      throw new Error('Authentication required');
    }

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
  // AUTH METHODS (SaaS only) (4)
  // ============================================

  login: async (email, password) => {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      setAuthToken(response.token);
      if (response.refreshToken) {
        localStorage.setItem('saas_refresh_token', response.refreshToken);
      }
    }
    return response;
  },

  register: async (email, password, firm_name, full_name) => {
    const response = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firm_name, full_name }),
    });
    if (response.token) {
      setAuthToken(response.token);
      if (response.refreshToken) {
        localStorage.setItem('saas_refresh_token', response.refreshToken);
      }
    }
    return response;
  },

  refreshAuthToken: async () => {
    const refreshToken = localStorage.getItem('saas_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await fetchAPI('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (response.token) {
      setAuthToken(response.token);
      if (response.refreshToken) {
        localStorage.setItem('saas_refresh_token', response.refreshToken);
      }
    }
    return response;
  },

  getMe: async () => {
    return await fetchAPI('/auth/me');
  },

  // ============================================
  // DASHBOARD METHODS (1)
  // ============================================

  getDashboardStats: async () => {
    if (isElectron()) {
      return await window.electronAPI.getDashboardStats();
    }
    return await fetchAPI('/reports/dashboard-stats');
  },

  // ============================================
  // CLIENT METHODS (6)
  // ============================================

  getClients: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllClients();
    }
    const response = await fetchAPI('/clients');
    return response.data || [];
  },

  getAllClients: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllClients();
    }
    const response = await fetchAPI('/clients');
    return response.data || [];
  },

  getClient: async (clientId) => {
    if (isElectron()) {
      const clients = await window.electronAPI.getAllClients();
      return clients.find(c => c.client_id === clientId) || null;
    }
    return await fetchAPI(`/clients/${clientId}`);
  },

  createClient: async (clientData) => {
    if (isElectron()) {
      return await window.electronAPI.addClient(clientData);
    }
    return await fetchAPI('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  // Alias: preload.js uses addClient
  addClient: async (clientData) => {
    if (isElectron()) {
      return await window.electronAPI.addClient(clientData);
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
      const clients = await window.electronAPI.getAllClients();
      const q = query.toLowerCase();
      return clients.filter(c =>
        (c.client_name || '').toLowerCase().includes(q) ||
        (c.client_name_arabic || '').includes(query) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(query)
      );
    }
    const response = await fetchAPI(`/clients/search?q=${encodeURIComponent(query)}`);
    return response.data || [];
  },

  // ============================================
  // MATTER METHODS (7)
  // ============================================

  getMatters: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllMatters();
    }
    const response = await fetchAPI('/matters');
    return response.data || [];
  },

  getAllMatters: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllMatters();
    }
    const response = await fetchAPI('/matters');
    return response.data || [];
  },

  getMatter: async (matterId) => {
    if (isElectron()) {
      const matters = await window.electronAPI.getAllMatters();
      return matters.find(m => m.matter_id === matterId) || null;
    }
    return await fetchAPI(`/matters/${matterId}`);
  },

  createMatter: async (matterData) => {
    if (isElectron()) {
      return await window.electronAPI.addMatter(matterData);
    }
    return await fetchAPI('/matters', {
      method: 'POST',
      body: JSON.stringify(matterData),
    });
  },

  addMatter: async (matterData) => {
    if (isElectron()) {
      return await window.electronAPI.addMatter(matterData);
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

  exportMatterTimeline: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.exportMatterTimeline({ matter_id: matterId });
    }
    // Web fallback — not supported (requires file dialog)
    return { success: false, error: 'Export not supported in web mode' };
  },

  getMatterFinancials: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('matter-financials', { matterId });
    }
    return await fetchAPI(`/matters/${matterId}/financials`);
  },

  getRelatedMatters: async (matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getRelatedMatters(matterId);
    }
    return await fetchAPI(`/matters/${matterId}/related`);
  },

  checkFileNumberUnique: async (fileNumber, excludeMatterId) => {
    if (isElectron()) {
      return await window.electronAPI.checkFileNumberUnique(fileNumber, excludeMatterId);
    }
    return await fetchAPI('/matters/check-file-number', {
      method: 'POST',
      body: JSON.stringify({ file_number: fileNumber, exclude_matter_id: excludeMatterId }),
    });
  },

  // ============================================
  // HEARING METHODS (4)
  // ============================================

  getHearings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllHearings();
    }
    const response = await fetchAPI('/hearings');
    return response.data || [];
  },

  getAllHearings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllHearings();
    }
    const response = await fetchAPI('/hearings');
    return response.data || [];
  },

  createHearing: async (hearingData) => {
    if (isElectron()) {
      return await window.electronAPI.addHearing(hearingData);
    }
    return await fetchAPI('/hearings', {
      method: 'POST',
      body: JSON.stringify(hearingData),
    });
  },

  // Alias: preload.js uses addHearing
  addHearing: async (hearingData) => {
    if (isElectron()) {
      return await window.electronAPI.addHearing(hearingData);
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
      return await window.electronAPI.getAllTasks();
    }
    const response = await fetchAPI('/tasks');
    return response.data || [];
  },

  getAllTasks: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllTasks();
    }
    const response = await fetchAPI('/tasks');
    return response.data || [];
  },

  createTask: async (taskData) => {
    if (isElectron()) {
      return await window.electronAPI.addTask(taskData);
    }
    return await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  // Alias: preload.js uses addTask
  addTask: async (taskData) => {
    return await apiClient.createTask(taskData);
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
      return await window.electronAPI.getAllTimesheets();
    }
    const response = await fetchAPI('/timesheets');
    return response.data || [];
  },

  getAllTimesheets: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllTimesheets();
    }
    const response = await fetchAPI('/timesheets');
    return response.data || [];
  },

  createTimesheet: async (timesheetData) => {
    if (isElectron()) {
      return await window.electronAPI.addTimesheet(timesheetData);
    }
    return await fetchAPI('/timesheets', {
      method: 'POST',
      body: JSON.stringify(timesheetData),
    });
  },

  // Alias: preload.js uses addTimesheet
  addTimesheet: async (timesheetData) => {
    return await apiClient.createTimesheet(timesheetData);
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
      const timesheets = await window.electronAPI.getAllTimesheets();
      return timesheets.filter(t => t.matter_id === matterId);
    }
    const response = await fetchAPI(`/timesheets/matter/${matterId}`);
    return response.data || [];
  },

  // ============================================
  // EXPENSE METHODS (8)
  // ============================================

  getExpenses: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllExpenses();
    }
    const response = await fetchAPI('/expenses');
    return response.data || [];
  },

  getAllExpenses: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllExpenses();
    }
    const response = await fetchAPI('/expenses');
    return response.data || [];
  },

  createExpense: async (expenseData) => {
    if (isElectron()) {
      return await window.electronAPI.addExpense(expenseData);
    }
    return await fetchAPI('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },

  // Alias: preload.js uses addExpense
  addExpense: async (expenseData) => {
    return await apiClient.createExpense(expenseData);
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
      const expenses = await window.electronAPI.getAllExpenses();
      return expenses.filter(e => e.matter_id === matterId);
    }
    const response = await fetchAPI(`/expenses/matter/${matterId}`);
    return response.data || [];
  },

  getExpenseCategories: async () => {
    if (isElectron()) {
      return await window.electronAPI.getExpenseCategories();
    }
    const response = await fetchAPI('/expenses/categories');
    return response.data || [];
  },

  createExpenseCategory: async (categoryData) => {
    if (isElectron()) {
      return await window.electronAPI.addLookupItem('expense_categories', categoryData);
    }
    return await fetchAPI('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  deleteExpenseCategory: async (categoryId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteLookupItem('expense_categories', categoryId);
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
      return await window.electronAPI.getAllAdvances();
    }
    const response = await fetchAPI('/advances');
    return response.data || [];
  },

  getAllAdvances: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllAdvances();
    }
    const response = await fetchAPI('/advances');
    return response.data || [];
  },

  createAdvance: async (advanceData) => {
    if (isElectron()) {
      return await window.electronAPI.addAdvance(advanceData);
    }
    return await fetchAPI('/advances', {
      method: 'POST',
      body: JSON.stringify(advanceData),
    });
  },

  // Alias: preload.js uses addAdvance
  addAdvance: async (advanceData) => {
    return await apiClient.createAdvance(advanceData);
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
      const advances = await window.electronAPI.getAllAdvances();
      return advances.filter(a => a.matter_id === matterId);
    }
    const response = await fetchAPI(`/advances/matter/${matterId}`);
    return response.data || [];
  },

  getAdvancesByClient: async (clientId) => {
    if (isElectron()) {
      const advances = await window.electronAPI.getAllAdvances();
      return advances.filter(a => a.client_id === clientId);
    }
    const response = await fetchAPI(`/advances/client/${clientId}`);
    return response.data || [];
  },

  allocateAdvance: async (allocationData) => {
    if (isElectron()) {
      return await window.electronAPI.deductFromAdvance(allocationData.advance_id, allocationData.amount);
    }
    return await fetchAPI('/advances/allocate', {
      method: 'POST',
      body: JSON.stringify(allocationData),
    });
  },

  getAllocations: async (advanceId) => {
    if (isElectron()) {
      // No dedicated handler - return empty array
      console.warn('getAllocations: not available in Electron mode');
      return [];
    }
    const response = await fetchAPI(`/advances/${advanceId}/allocations`);
    return response.data || [];
  },

  deleteAllocation: async (allocationId) => {
    if (isElectron()) {
      console.warn('deleteAllocation: not available in Electron mode');
      return { success: false, error: 'Not available in desktop mode' };
    }
    return await fetchAPI(`/advances/allocations/${allocationId}`, {
      method: 'DELETE',
    });
  },

  getClientBalance: async (clientId) => {
    if (isElectron()) {
      // Compute from advances
      const advances = await window.electronAPI.getAllAdvances();
      const clientAdvances = advances.filter(a => a.client_id === clientId);
      const balance = clientAdvances.reduce((sum, a) => sum + (a.remaining_amount || 0), 0);
      return { client_id: clientId, balance };
    }
    return await fetchAPI(`/advances/client/${clientId}/balance`);
  },

  getClientExpenseAdvance: async (clientId, matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getClientExpenseAdvance(clientId, matterId);
    }
    const params = new URLSearchParams({ client_id: clientId });
    if (matterId) params.append('matter_id', matterId);
    return await fetchAPI(`/advances/client-expense-advance?${params}`);
  },

  getLawyerAdvance: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.getLawyerAdvance(lawyerId);
    }
    return await fetchAPI(`/advances/lawyer-advance?lawyer_id=${lawyerId}`);
  },

  addExpenseWithDeduction: async (expenseData) => {
    if (isElectron()) {
      return await window.electronAPI.addExpenseWithDeduction(expenseData);
    }
    return await fetchAPI('/advances/expense-with-deduction', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },

  // ============================================
  // INVOICE METHODS (8)
  // ============================================

  getInvoices: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllInvoices();
    }
    const response = await fetchAPI('/invoices');
    return response.data || [];
  },

  getAllInvoices: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllInvoices();
    }
    const response = await fetchAPI('/invoices');
    return response.data || [];
  },

  createInvoice: async (invoiceData, items) => {
    if (isElectron()) {
      return await window.electronAPI.createInvoice(invoiceData, items);
    }
    return await fetchAPI('/invoices', {
      method: 'POST',
      body: JSON.stringify({ ...invoiceData, items }),
    });
  },

  updateInvoice: async (invoiceData) => {
    if (isElectron()) {
      return await window.electronAPI.updateInvoiceStatus(invoiceData.invoice_id, invoiceData.status);
    }
    return await fetchAPI(`/invoices/${invoiceData.invoice_id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    if (isElectron()) {
      return await window.electronAPI.updateInvoiceStatus(invoiceId, status);
    }
    return await fetchAPI(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ invoice_id: invoiceId, status }),
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
      const invoices = await window.electronAPI.getAllInvoices();
      return invoices.filter(i => i.matter_id === matterId);
    }
    const response = await fetchAPI(`/invoices/matter/${matterId}`);
    return response.data || [];
  },

  getInvoicesByClient: async (clientId) => {
    if (isElectron()) {
      const invoices = await window.electronAPI.getAllInvoices();
      return invoices.filter(i => i.client_id === clientId);
    }
    const response = await fetchAPI(`/invoices/client/${clientId}`);
    return response.data || [];
  },

  recordPayment: async (paymentData) => {
    if (isElectron()) {
      // Record payment as advance of type fee_payment
      return await window.electronAPI.addAdvance({
        ...paymentData,
        advance_type: paymentData.advance_type || 'fee_payment',
      });
    }
    return await fetchAPI('/invoices/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  deletePayment: async (paymentId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteAdvance(paymentId);
    }
    return await fetchAPI(`/invoices/payments/${paymentId}`, {
      method: 'DELETE',
    });
  },

  getInvoiceItems: async (invoiceId) => {
    if (isElectron()) {
      return await window.electronAPI.getInvoiceItems(invoiceId);
    }
    const response = await fetchAPI(`/invoices/${invoiceId}/items`);
    return response.data || [];
  },

  generateInvoiceNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoiceNumber();
    }
    return await fetchAPI('/invoices/generate-number');
  },

  generateInvoicePdfs: async (invoiceId, options) => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoicePdfs(invoiceId, options);
    }
    electronOnlyError('generateInvoicePdfs');
  },

  getUnbilledTime: async (clientId, matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getUnbilledTime(clientId, matterId);
    }
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    if (matterId) params.append('matter_id', matterId);
    const response = await fetchAPI(`/timesheets/unbilled?${params.toString()}`);
    return response.data || [];
  },

  getUnbilledExpenses: async (clientId, matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getUnbilledExpenses(clientId, matterId);
    }
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    if (matterId) params.append('matter_id', matterId);
    const response = await fetchAPI(`/expenses/unbilled?${params.toString()}`);
    return response.data || [];
  },

  getClientRetainer: async (clientId, matterId) => {
    if (isElectron()) {
      return await window.electronAPI.getClientRetainer(clientId, matterId);
    }
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    if (matterId) params.append('matter_id', matterId);
    return await fetchAPI(`/advances/client-retainer?${params.toString()}`);
  },

  deductRetainer: async (clientId, matterId, advanceType, amount) => {
    if (isElectron()) {
      return await window.electronAPI.deductRetainer(clientId, matterId, advanceType, amount);
    }
    return await fetchAPI('/advances/deduct-retainer', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, matter_id: matterId, advance_type: advanceType, amount }),
    });
  },

  // ============================================
  // JUDGMENT METHODS (4)
  // ============================================

  getJudgments: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllJudgments();
    }
    const response = await fetchAPI('/judgments');
    return response.data || [];
  },

  getAllJudgments: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllJudgments();
    }
    const response = await fetchAPI('/judgments');
    return response.data || [];
  },

  createJudgment: async (judgmentData) => {
    if (isElectron()) {
      return await window.electronAPI.addJudgment(judgmentData);
    }
    return await fetchAPI('/judgments', {
      method: 'POST',
      body: JSON.stringify(judgmentData),
    });
  },

  // Alias: preload.js uses addJudgment
  addJudgment: async (judgmentData) => {
    if (isElectron()) {
      return await window.electronAPI.addJudgment(judgmentData);
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
      return await window.electronAPI.getAllDeadlines();
    }
    const response = await fetchAPI('/deadlines');
    return response.data || [];
  },

  getAllDeadlines: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllDeadlines();
    }
    const response = await fetchAPI('/deadlines');
    return response.data || [];
  },

  createDeadline: async (deadlineData) => {
    if (isElectron()) {
      return await window.electronAPI.addDeadline(deadlineData);
    }
    return await fetchAPI('/deadlines', {
      method: 'POST',
      body: JSON.stringify(deadlineData),
    });
  },

  // Alias: preload.js uses addDeadline
  addDeadline: async (deadlineData) => {
    if (isElectron()) {
      return await window.electronAPI.addDeadline(deadlineData);
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

  updateDeadlineStatus: async (deadlineId, newStatus) => {
    if (isElectron()) {
      return await window.electronAPI.updateDeadlineStatus(deadlineId, newStatus);
    }
    return await fetchAPI(`/deadlines/${deadlineId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
  },

  completeDeadline: async (deadlineId) => {
    if (isElectron()) {
      return await window.electronAPI.updateDeadlineStatus(deadlineId, 'completed');
    }
    return await fetchAPI(`/deadlines/${deadlineId}/complete`, {
      method: 'POST',
    });
  },

  uncompleteDeadline: async (deadlineId) => {
    if (isElectron()) {
      return await window.electronAPI.updateDeadlineStatus(deadlineId, 'pending');
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
      return await window.electronAPI.getAllAppointments();
    }
    const response = await fetchAPI('/appointments');
    return response.data || [];
  },

  getAllAppointments: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllAppointments();
    }
    const response = await fetchAPI('/appointments');
    return response.data || [];
  },

  createAppointment: async (appointmentData) => {
    if (isElectron()) {
      return await window.electronAPI.addAppointment(appointmentData);
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

  getDiaryEntries: async (matterId) => {
    if (isElectron()) {
      if (matterId) {
        return await window.electronAPI.getMatterTimeline(matterId);
      }
      // No get-all-diary handler - return empty
      console.warn('getDiaryEntries: requires matterId in Electron mode');
      return [];
    }
    const response = matterId ? await fetchAPI(`/diary/timeline/${matterId}`) : await fetchAPI('/diary');
    return response.data || [];
  },

  createDiaryEntry: async (diaryData) => {
    if (isElectron()) {
      return await window.electronAPI.addDiaryEntry(diaryData);
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
    const response = await fetchAPI('/lawyers');
    return response.data || [];
  },

  createLawyer: async (lawyerData) => {
    if (isElectron()) {
      return await window.electronAPI.addLawyer(lawyerData);
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
      return await window.electronAPI.generateReport('lawyer-productivity', { lawyerId });
    }
    return await fetchAPI(`/lawyers/${lawyerId}/stats`);
  },

  getLawyerMatters: async (lawyerId) => {
    if (isElectron()) {
      const matters = await window.electronAPI.getAllMatters();
      return matters.filter(m => m.lawyer_id === lawyerId);
    }
    const response = await fetchAPI(`/lawyers/${lawyerId}/matters`);
    return response.data || [];
  },

  getLawyerTimesheets: async (lawyerId) => {
    if (isElectron()) {
      const timesheets = await window.electronAPI.getAllTimesheets();
      return timesheets.filter(t => t.lawyer_id === lawyerId);
    }
    const response = await fetchAPI(`/lawyers/${lawyerId}/timesheets`);
    return response.data || [];
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
      // Matter types are hardcoded in the schema
      return ['litigation', 'corporate', 'advisory', 'arbitration', 'enforcement', 'other'];
    }
    return await fetchAPI('/lookups/matter-types');
  },

  getMatterStatuses: async () => {
    if (isElectron()) {
      // Matter statuses are hardcoded in the schema
      return ['active', 'pending', 'closed', 'on_hold', 'archived'];
    }
    return await fetchAPI('/lookups/matter-statuses');
  },

  getTaskTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTaskTypes();
    }
    return await fetchAPI('/lookups/task-types');
  },

  getHearingPurposes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getHearingPurposes();
    }
    return await fetchAPI('/lookups/hearing-purposes');
  },

  getEntityTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getEntityTypes();
    }
    return await fetchAPI('/lookups/entity-types');
  },

  createLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.addLookupItem(lookupData.type, lookupData);
    }
    return await fetchAPI('/lookups', {
      method: 'POST',
      body: JSON.stringify(lookupData),
    });
  },

  updateLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.updateLookupItem(lookupData.type, lookupData);
    }
    return await fetchAPI(`/lookups/${lookupData.id}`, {
      method: 'PUT',
      body: JSON.stringify(lookupData),
    });
  },

  deleteLookup: async (lookupData) => {
    if (isElectron()) {
      return await window.electronAPI.deleteLookupItem(lookupData.table_name, lookupData.id);
    }
    const { table_name, id } = lookupData;
    return await fetchAPI(`/lookups/${table_name}/${id}`, {
      method: 'DELETE',
    });
  },

  getCourts: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCourtTypes();
    }
    return await fetchAPI('/lookups/courts');
  },

  // ============================================
  // CORPORATE METHODS - PART 1 (15 of 29)
  // ============================================

  getEntities: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllCorporateEntities();
    }
    const response = await fetchAPI('/corporate/entities');
    return response.data || [];
  },

  getAllCorporateEntities: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAllCorporateEntities();
    }
    const response = await fetchAPI('/corporate/entities');
    return response.data || [];
  },

  getCorporateClients: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCorporateClients();
    }
    const response = await fetchAPI('/corporate/clients');
    return response.data || [];
  },

  getEntity: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getCorporateEntity(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}`);
  },

  createEntity: async (entityData) => {
    if (isElectron()) {
      return await window.electronAPI.addCorporateEntity(entityData);
    }
    return await fetchAPI('/corporate/entities', {
      method: 'POST',
      body: JSON.stringify(entityData),
    });
  },

  updateEntity: async (entityData) => {
    if (isElectron()) {
      return await window.electronAPI.updateCorporateEntity(entityData);
    }
    return await fetchAPI(`/corporate/entities/${entityData.entity_id}`, {
      method: 'PUT',
      body: JSON.stringify(entityData),
    });
  },

  deleteEntity: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteCorporateEntity(entityId);
    }
    return await fetchAPI(`/corporate/entities/${entityId}`, {
      method: 'DELETE',
    });
  },

  getShareholders: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getShareholders(entityId);
    }
    const response = await fetchAPI(`/corporate/entities/${entityId}/shareholders`);
    return response.data || [];
  },

  createShareholder: async (shareholderData) => {
    if (isElectron()) {
      return await window.electronAPI.addShareholder(shareholderData);
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
    const response = await fetchAPI(`/corporate/entities/${entityId}/directors`);
    return response.data || [];
  },

  createDirector: async (directorData) => {
    if (isElectron()) {
      return await window.electronAPI.addDirector(directorData);
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
      return await window.electronAPI.getMeetings(entityId);
    }
    const response = await fetchAPI(`/corporate/entities/${entityId}/board-meetings`);
    return response.data || [];
  },

  createBoardMeeting: async (meetingData) => {
    if (isElectron()) {
      return await window.electronAPI.addMeeting(meetingData);
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
      return await window.electronAPI.updateMeeting(meetingData);
    }
    return await fetchAPI(`/corporate/board-meetings/${meetingData.meeting_id}`, {
      method: 'PUT',
      body: JSON.stringify(meetingData),
    });
  },

  deleteBoardMeeting: async (meetingId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteMeeting(meetingId);
    }
    return await fetchAPI(`/corporate/board-meetings/${meetingId}`, {
      method: 'DELETE',
    });
  },

  getShareTransfers: async (entityId) => {
    if (isElectron()) {
      return await window.electronAPI.getShareTransfers(entityId);
    }
    const response = await fetchAPI(`/corporate/entities/${entityId}/share-transfers`);
    return response.data || [];
  },

  createShareTransfer: async (transferData) => {
    if (isElectron()) {
      return await window.electronAPI.addShareTransfer(transferData);
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
      return await window.electronAPI.getFilings(entityId);
    }
    const response = await fetchAPI(`/corporate/entities/${entityId}/documents`);
    return response.data || [];
  },

  createCorporateDocument: async (documentData) => {
    if (isElectron()) {
      return await window.electronAPI.addFiling(documentData);
    }
    return await fetchAPI('/corporate/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  },

  updateCorporateDocument: async (documentData) => {
    if (isElectron()) {
      return await window.electronAPI.updateFiling(documentData);
    }
    return await fetchAPI(`/corporate/documents/${documentData.document_id}`, {
      method: 'PUT',
      body: JSON.stringify(documentData),
    });
  },

  deleteCorporateDocument: async (documentId) => {
    if (isElectron()) {
      return await window.electronAPI.deleteFiling(documentId);
    }
    return await fetchAPI(`/corporate/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  getCapTable: async (entityId) => {
    if (isElectron()) {
      // Build cap table from shareholders + share transfers
      const shareholders = await window.electronAPI.getShareholders(entityId);
      const totalShares = await window.electronAPI.getTotalShares(entityId);
      return { shareholders, totalShares };
    }
    return await fetchAPI(`/corporate/entities/${entityId}/cap-table`);
  },

  getEntityTimeline: async (entityId) => {
    if (isElectron()) {
      // Aggregate entity events from meetings, filings, share transfers
      const meetings = await window.electronAPI.getMeetings(entityId);
      const filings = await window.electronAPI.getFilings(entityId);
      const transfers = await window.electronAPI.getShareTransfers(entityId);
      const events = [
        ...meetings.map(m => ({ ...m, event_type: 'meeting' })),
        ...filings.map(f => ({ ...f, event_type: 'filing' })),
        ...transfers.map(t => ({ ...t, event_type: 'share_transfer' })),
      ];
      return events.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return await fetchAPI(`/corporate/entities/${entityId}/timeline`);
  },

  getCompanyTypes: async () => {
    if (isElectron()) {
      return await window.electronAPI.getEntityTypes();
    }
    return await fetchAPI('/corporate/company-types');
  },

  getDirectorRoles: async () => {
    if (isElectron()) {
      // Director roles are hardcoded
      return ['Chairman', 'Managing Director', 'Director', 'Secretary', 'Treasurer'];
    }
    return await fetchAPI('/corporate/director-roles');
  },

  // ============================================
  // CONFLICT CHECK METHODS (2)
  // ============================================

  checkConflicts: async (searchData) => {
    if (isElectron()) {
      return await window.electronAPI.conflictCheck(searchData);
    }
    return await fetchAPI('/conflict-check/search', {
      method: 'POST',
      body: JSON.stringify(searchData),
    });
  },

  conflictCheck: async (searchTerms) => {
    if (isElectron()) {
      return await window.electronAPI.conflictCheck(searchTerms);
    }
    return await fetchAPI('/conflict-check/search', {
      method: 'POST',
      body: JSON.stringify({ searchTerms }),
    });
  },

  logConflictCheck: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.logConflictCheck(data);
    }
    return await fetchAPI('/conflict-check/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getConflictHistory: async () => {
    if (isElectron()) {
      // No dedicated handler for conflict history retrieval
      console.warn('getConflictHistory: not available in Electron mode');
      return [];
    }
    const response = await fetchAPI('/conflict-check/history');
    return response.data || [];
  },

  // ============================================
  // SETTINGS METHODS (10)
  // ============================================

  getFirmInfo: async () => {
    if (isElectron()) {
      return await window.electronAPI.getFirmInfo();
    }
    return await fetchAPI('/settings/firm-info');
  },

  getCurrencies: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCurrencies();
    }
    const response = await fetchAPI('/settings/currencies');
    return response.data || [];
  },

  getSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getSettings();
    }
    return await fetchAPI('/settings');
  },

  updateSettings: async (settings) => {
    if (isElectron()) {
      // Save each setting individually
      const results = [];
      for (const [key, value] of Object.entries(settings)) {
        results.push(await window.electronAPI.saveSetting(key, value, typeof value, 'general'));
      }
      return results;
    }
    return await fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getInvoiceSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getSetting('invoice_settings');
    }
    return await fetchAPI('/settings/invoice');
  },

  updateInvoiceSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.saveSetting('invoice_settings', JSON.stringify(settings), 'json', 'invoicing');
    }
    return await fetchAPI('/settings/invoice', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getTimesheetSettings: async () => {
    if (isElectron()) {
      return await window.electronAPI.getSetting('timesheet_settings');
    }
    return await fetchAPI('/settings/timesheet');
  },

  updateTimesheetSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.saveSetting('timesheet_settings', JSON.stringify(settings), 'json', 'timesheets');
    }
    return await fetchAPI('/settings/timesheet', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getNextInvoiceNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoiceNumber();
    }
    return await fetchAPI('/settings/next-invoice-number');
  },

  getNextReceiptNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.getSetting('next_receipt_number');
    }
    return await fetchAPI('/settings/next-receipt-number');
  },

  incrementInvoiceNumber: async () => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoiceNumber();
    }
    return await fetchAPI('/settings/increment-invoice-number', {
      method: 'POST',
    });
  },

  incrementReceiptNumber: async () => {
    if (isElectron()) {
      const current = await window.electronAPI.getSetting('next_receipt_number');
      const next = (parseInt(current) || 0) + 1;
      await window.electronAPI.saveSetting('next_receipt_number', String(next), 'string', 'invoicing');
      return next;
    }
    return await fetchAPI('/settings/increment-receipt-number', {
      method: 'POST',
    });
  },

  // ============================================
  // REPORTS METHODS (9)
  // ============================================

  generateReport: async (reportType, filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport(reportType, filters);
    }
    return await fetchAPI('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ reportType, ...filters }),
    });
  },

  getAgingReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('aging', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/aging?${params}`);
  },

  getFinancialSummary: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('financial-summary', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/financial-summary?${params}`);
  },

  getTimesheetReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('timesheet', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/timesheet?${params}`);
  },

  getExpenseReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('expense', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/expense?${params}`);
  },

  getLawyerProductivity: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('lawyer-productivity', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/lawyer-productivity?${params}`);
  },

  getMatterStats: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('matter-stats', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/matter-stats?${params}`);
  },

  getClientReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('client', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/client?${params}`);
  },

  getRevenueReport: async (filters) => {
    if (isElectron()) {
      return await window.electronAPI.generateReport('revenue', filters);
    }
    const params = new URLSearchParams(filters);
    return await fetchAPI(`/reports/revenue?${params}`);
  },

  // ============================================
  // TRASH METHODS (2)
  // ============================================

  getTrash: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTrashItems();
    }
    const response = await fetchAPI('/trash');
    return response.data || [];
  },

  restoreItem: async (itemData) => {
    if (isElectron()) {
      return await window.electronAPI.restoreTrashItem(itemData.type, itemData.id);
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

  // Machine ID
  getMachineId: async () => {
    if (isElectron()) {
      return await window.electronAPI.getMachineId();
    }
    electronOnlyError('getMachineId');
  },

  // Report export operations
  exportClientStatementPdf: async (statementData, firmInfo) => {
    if (isElectron()) {
      return await window.electronAPI.exportClientStatementPdf(statementData, firmInfo);
    }
    electronOnlyError('exportClientStatementPdf');
  },

  exportClientStatementExcel: async (statementData) => {
    if (isElectron()) {
      return await window.electronAPI.exportClientStatementExcel(statementData);
    }
    electronOnlyError('exportClientStatementExcel');
  },

  exportCaseStatusPdf: async (reportData, firmInfo) => {
    if (isElectron()) {
      return await window.electronAPI.exportCaseStatusPdf(reportData, firmInfo);
    }
    electronOnlyError('exportCaseStatusPdf');
  },

  exportCaseStatusExcel: async (reportData) => {
    if (isElectron()) {
      return await window.electronAPI.exportCaseStatusExcel(reportData);
    }
    electronOnlyError('exportCaseStatusExcel');
  },

  exportClient360Pdf: async (reportData, firmInfo) => {
    if (isElectron()) {
      return await window.electronAPI.exportClient360Pdf(reportData, firmInfo);
    }
    electronOnlyError('exportClient360Pdf');
  },

  exportClient360Excel: async (reportData) => {
    if (isElectron()) {
      return await window.electronAPI.exportClient360Excel(reportData);
    }
    electronOnlyError('exportClient360Excel');
  },

  // Generic export operations (used by list components)
  exportToExcel: async (data, entityName) => {
    if (isElectron()) {
      return await window.electronAPI.exportToExcel(data, entityName);
    }
    electronOnlyError('exportToExcel');
  },

  exportToPdf: async (data, entityName, columns) => {
    if (isElectron()) {
      return await window.electronAPI.exportToPdf(data, entityName, columns);
    }
    electronOnlyError('exportToPdf');
  },

  // Entity-specific export operations
  exportMattersToExcel: async (matters) => {
    if (isElectron()) {
      return await window.electronAPI.exportToExcel(matters, 'matters');
    }
    electronOnlyError('exportMattersToExcel');
  },

  exportTimesheetsToExcel: async (timesheets) => {
    if (isElectron()) {
      return await window.electronAPI.exportToExcel(timesheets, 'timesheets');
    }
    electronOnlyError('exportTimesheetsToExcel');
  },

  exportExpensesToExcel: async (expenses) => {
    if (isElectron()) {
      return await window.electronAPI.exportExpensesToExcel(expenses);
    }
    electronOnlyError('exportExpensesToExcel');
  },

  exportExpensesToPDF: async (data, options) => {
    if (isElectron()) {
      return await window.electronAPI.exportExpensesToPDF(data, options);
    }
    electronOnlyError('exportExpensesToPDF');
  },

  exportInvoicesToExcel: async (invoices) => {
    if (isElectron()) {
      return await window.electronAPI.exportToExcel(invoices, 'invoices');
    }
    electronOnlyError('exportInvoicesToExcel');
  },

  exportAgingToExcel: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.exportToExcel(data, 'aging-report');
    }
    electronOnlyError('exportAgingToExcel');
  },

  // PDF generation
  generateInvoicePDF: async (invoiceData) => {
    if (isElectron()) {
      return await window.electronAPI.generateInvoicePdfs(invoiceData);
    }
    electronOnlyError('generateInvoicePDF');
  },

  generateReceiptPDF: async (receiptData) => {
    if (isElectron()) {
      // Use invoice PDF generator for receipts
      return await window.electronAPI.generateInvoicePdfs(receiptData.invoice_id, { type: 'receipt' });
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
      return await window.electronAPI.importClientsExcel();
    }
    electronOnlyError('importClientsFromExcel');
  },

  validateClientImport: async (filePath) => {
    if (isElectron()) {
      // Validation happens as part of import process
      return await window.electronAPI.importClientsExcel();
    }
    electronOnlyError('validateClientImport');
  },

  // License operations
  getLicenseStatus: async () => {
    if (isElectron()) {
      return await window.electronAPI.getLicenseStatus();
    }
    electronOnlyError('getLicenseStatus');
  },

  validateLicense: async (licenseKey) => {
    if (isElectron()) {
      if (licenseKey) {
        return await window.electronAPI.validateLicense(licenseKey);
      }
      return await window.electronAPI.validateLicense();
    }
    electronOnlyError('validateLicense');
  },

  activateLicense: async (licenseKey) => {
    if (isElectron()) {
      return await window.electronAPI.validateLicense(licenseKey);
    }
    electronOnlyError('activateLicense');
  },

  deactivateLicense: async () => {
    if (isElectron()) {
      return await window.electronAPI.clearLicense();
    }
    electronOnlyError('deactivateLicense');
  },

  getLicenseInfo: async () => {
    if (isElectron()) {
      return await window.electronAPI.getLicenseStatus();
    }
    electronOnlyError('getLicenseInfo');
  },

  // File dialogs
  showOpenDialog: async (options) => {
    if (isElectron()) {
      return await window.electronAPI.selectBackupFolder();
    }
    electronOnlyError('showOpenDialog');
  },

  showSaveDialog: async (options) => {
    if (isElectron()) {
      return await window.electronAPI.selectBackupFolder();
    }
    electronOnlyError('showSaveDialog');
  },

  // App info
  getAppVersion: async () => {
    if (isElectron()) {
      // App version not exposed via IPC - return from package
      return '48.2';
    }
    electronOnlyError('getAppVersion');
  },

  openExternal: async (url) => {
    if (isElectron()) {
      // Fallback: open in new window
      window.open(url, '_blank');
      return;
    }
    electronOnlyError('openExternal');
  },

  // ============================================
  // ALIASES - Component compatibility layer
  // Maps component-facing names to api-client methods
  // Added in Phase 3 Batch 7 for final migration
  // ============================================

  // Corporate aliases (EntityForm.js uses preload names directly)
  addCorporateEntity: async (data) => apiClient.createEntity(data),
  updateCorporateEntity: async (data) => apiClient.updateEntity(data),
  deleteCorporateEntity: async (id) => apiClient.deleteEntity(id),
  addShareholder: async (data) => apiClient.createShareholder(data),
  addDirector: async (data) => apiClient.createDirector(data),
  getFilings: async (clientId) => apiClient.getCorporateDocuments(clientId),
  addFiling: async (data) => apiClient.createCorporateDocument(data),
  updateFiling: async (data) => apiClient.updateCorporateDocument(data),
  deleteFiling: async (id) => apiClient.deleteCorporateDocument(id),
  getMeetings: async (clientId) => apiClient.getBoardMeetings(clientId),
  addMeeting: async (data) => apiClient.createBoardMeeting(data),
  updateMeeting: async (data) => apiClient.updateBoardMeeting(data),
  deleteMeeting: async (id) => apiClient.deleteBoardMeeting(id),
  addShareTransfer: async (data) => apiClient.createShareTransfer(data),
  getCompanyClientsWithoutEntity: async () => {
    if (isElectron()) {
      return await window.electronAPI.getCompanyClientsWithoutEntity();
    }
    const response = await fetchAPI('/corporate/clients-without-entity');
    return response.data || [];
  },

  // Trash aliases (TrashModule.js uses preload names directly)
  getTrashItems: async () => apiClient.getTrash(),
  restoreTrashItem: async (type, id) => apiClient.restoreItem({ type, id }),
  getTrashCount: async () => {
    if (isElectron()) {
      return await window.electronAPI.getTrashCount();
    }
    return await fetchAPI('/trash/count');
  },
  permanentDeleteItem: async (type, id) => {
    if (isElectron()) {
      return await window.electronAPI.permanentDeleteItem(type, id);
    }
    return await fetchAPI('/trash/permanent-delete', {
      method: 'POST',
      body: JSON.stringify({ type, id }),
    });
  },
  emptyTrash: async () => {
    if (isElectron()) {
      return await window.electronAPI.emptyTrash();
    }
    return await fetchAPI('/trash/empty', { method: 'POST' });
  },

  // Lawyer aliases (SettingsModule.js)
  getAllLawyers: async () => apiClient.getLawyers(),
  deactivateLawyer: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.deactivateLawyer(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}/deactivate`, { method: 'POST' });
  },
  activateLawyer: async (lawyerId) => {
    if (isElectron()) {
      return await window.electronAPI.activateLawyer(lawyerId);
    }
    return await fetchAPI(`/lawyers/${lawyerId}/activate`, { method: 'POST' });
  },

  // Settings aliases (SettingsModule.js)
  updateFirmInfo: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.updateFirmInfo(data);
    }
    return await fetchAPI('/settings/firm-info', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  getExchangeRates: async () => {
    if (isElectron()) {
      return await window.electronAPI.getExchangeRates();
    }
    const response = await fetchAPI('/settings/exchange-rates');
    return response.data || [];
  },
  addCurrency: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.addCurrency(data);
    }
    return await fetchAPI('/settings/currencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCurrency: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.updateCurrency(data);
    }
    return await fetchAPI(`/settings/currencies/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteCurrency: async (id) => {
    if (isElectron()) {
      return await window.electronAPI.deleteCurrency(id);
    }
    return await fetchAPI(`/settings/currencies/${id}`, { method: 'DELETE' });
  },
  addExchangeRate: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.addExchangeRate(data);
    }
    return await fetchAPI('/settings/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateExchangeRate: async (data) => {
    if (isElectron()) {
      return await window.electronAPI.updateExchangeRate(data);
    }
    return await fetchAPI(`/settings/exchange-rates/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteExchangeRate: async (id) => {
    if (isElectron()) {
      return await window.electronAPI.deleteExchangeRate(id);
    }
    return await fetchAPI(`/settings/exchange-rates/${id}`, { method: 'DELETE' });
  },

  // Backup aliases (SettingsModule.js - Electron-only)
  getAutoBackupStatus: async () => {
    if (isElectron()) {
      return await window.electronAPI.getAutoBackupStatus();
    }
    electronOnlyError('getAutoBackupStatus');
  },
  saveAutoBackupSettings: async (settings) => {
    if (isElectron()) {
      return await window.electronAPI.saveAutoBackupSettings(settings);
    }
    electronOnlyError('saveAutoBackupSettings');
  },
  selectBackupFolder: async () => {
    if (isElectron()) {
      return await window.electronAPI.selectBackupFolder();
    }
    electronOnlyError('selectBackupFolder');
  },
  openBackupFolder: async () => {
    if (isElectron()) {
      return await window.electronAPI.openBackupFolder();
    }
    electronOnlyError('openBackupFolder');
  },
  runBackupNow: async () => {
    if (isElectron()) {
      return await window.electronAPI.runBackupNow();
    }
    electronOnlyError('runBackupNow');
  },

  // Lookup aliases (LookupForm.js, SettingsModule.js)
  addLookupItem: async (lookupType, data) => {
    if (isElectron()) {
      return await window.electronAPI.addLookupItem(lookupType, data);
    }
    return await fetchAPI('/lookups', {
      method: 'POST',
      body: JSON.stringify({ type: lookupType, ...data }),
    });
  },
  updateLookupItem: async (lookupType, data) => {
    if (isElectron()) {
      return await window.electronAPI.updateLookupItem(lookupType, data);
    }
    return await fetchAPI(`/lookups/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ type: lookupType, ...data }),
    });
  },
  deleteLookupEntry: async (lookupType, id) => {
    if (isElectron()) {
      return await window.electronAPI.deleteLookupItem(lookupType, id);
    }
    return await fetchAPI(`/lookups/${lookupType}/${id}`, { method: 'DELETE' });
  },

  // Dashboard aliases
  getPendingInvoices: async () => {
    if (isElectron()) {
      if (window.electronAPI.getPendingInvoices) {
        return await window.electronAPI.getPendingInvoices();
      }
      return [];
    }
    const response = await fetchAPI('/invoices?status=pending');
    return response.data || [];
  },
  getUpcomingCompliance: async () => {
    if (isElectron()) {
      if (window.electronAPI.getUpcomingCompliance) {
        return await window.electronAPI.getUpcomingCompliance();
      }
      return [];
    }
    const response = await fetchAPI('/corporate/upcoming-compliance');
    return response.data || [];
  },

  // Diary/Timeline alias (MatterTimeline.js)
  getMatterTimeline: async (matterId) => apiClient.getDiaryEntries(matterId),
  addDiaryEntry: async (data) => apiClient.createDiaryEntry(data),

  // Batch expense (BatchExpenseForm.js)
  addExpensesBatch: async (expenses) => {
    if (isElectron()) {
      return await window.electronAPI.addExpensesBatch(expenses);
    }
    return await fetchAPI('/expenses/batch', {
      method: 'POST',
      body: JSON.stringify(expenses),
    });
  },

  // Export aliases (reports)
  exportToCsv: async (data, name) => {
    if (isElectron()) {
      return await window.electronAPI.exportToCsv(data, name);
    }
    electronOnlyError('exportToCsv');
  },
  openFile: async (filePath) => {
    if (isElectron()) {
      return await window.electronAPI.openFile(filePath);
    }
    electronOnlyError('openFile');
  },

  // Export all data (SettingsModule.js - Electron-only)
  exportAllData: async () => {
    if (isElectron()) {
      return await window.electronAPI.exportAllData();
    }
    electronOnlyError('exportAllData');
  },

  // Error logging (ErrorBoundary.js)
  logError: async (errorData) => {
    if (isElectron()) {
      if (window.electronAPI.logError) {
        return await window.electronAPI.logError(errorData);
      }
    }
    // In web mode, just console.error
    console.error('App error:', errorData);
  },
};

export default apiClient;
