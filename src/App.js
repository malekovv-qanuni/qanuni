import React, { useEffect, useCallback } from 'react';
import {
  Users, Briefcase, Clock, Calendar, CalendarDays, FileText, BarChart3,
  Menu, X, Search, AlertTriangle,
  Building2, Gavel, ClipboardList, Settings, Trash2, Scale,
  Receipt, Wallet, PieChart,
  Timer, Save
} from 'lucide-react';
import apiClient from './api-client';

// Extracted common components
import Toast from './components/common/Toast';
import ConfirmDialog from './components/common/ConfirmDialog';
import LicenseScreen from './components/common/LicenseScreen';
import LicenseWarningBanner from './components/common/LicenseWarningBanner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useNotification, useTimer, useUI, useReport, useDialog, useApp, useData, useCalendar, useAuth } from './contexts';
import { useUIModal } from './hooks/useUIModal';

// Extracted corporate components (v42.0.3)
import { EntityForm, EntitiesList } from './components/corporate';

// Extracted form components (v42.0.4-v42.0.8, consolidated v46.56)
import { ClientForm, MatterForm, HearingForm, TaskForm, TimesheetForm, JudgmentForm, DeadlineForm, AppointmentForm, ExpenseForm, AdvanceForm, InvoiceForm, LookupForm } from './components/forms';

// Extracted list components (v42.0.5-v42.0.6)
import { ClientsList, MattersList, HearingsList, TimesheetsList, ExpensesList, TasksList, DeadlinesList, InvoicesList, AdvancesList, AppointmentsList, JudgmentsList } from './components/lists';
import MatterTimeline from './components/common/MatterTimeline';

// Extracted module components (v46.9, v46.14-v46.18, v46.34)
import { Dashboard, CalendarModule, ReportsModule, SettingsModule, TimerWidget, InvoiceViewModal, ClientStatementModal, CaseStatusReportModal, Client360ReportModal, AppealMatterDialog, TrashModule, ConflictCheckTool } from './components/modules';

// Corporate report modals (v46.25)
import { Company360ReportModal, ComplianceCalendarReport, ShareholderRegistryReport, DirectorRegistryReport } from './components/reports/corporate';


// Extracted constants (v46.19)
// Translations import removed (v48)
import { formatDate } from './utils';
import PrintStyles from './components/common/PrintStyles';
import GuidedTourSystem from './components/common/GuidedTour';

const App = () => {
  // Navigation & sidebar (migrated to AppContext)
  const {
    currentModule, setCurrentModule,
    sidebarCollapsed, setSidebarCollapsed,
    loading, setLoading,
    licenseStatus, setLicenseStatus,
    licenseChecked, setLicenseChecked,
    machineId, setMachineId
  } = useApp();
  // Auth state (SaaS mode)
  const { user: authUser, logout: authLogout } = useAuth();
  // Data state (migrated to DataContext)
  const {
    clients, setClients, matters, setMatters, lawyers, setLawyers,
    hearings, setHearings, judgments, setJudgments, tasks, setTasks,
    timesheets, setTimesheets, appointments, setAppointments,
    expenses, setExpenses, advances, setAdvances, invoices, setInvoices,
    deadlines, setDeadlines, corporateEntities, setCorporateEntities,
    courtTypes, setCourtTypes, regions, setRegions,
    hearingPurposes, setHearingPurposes, taskTypes, setTaskTypes,
    expenseCategories, setExpenseCategories, entityTypes, setEntityTypes,
    dashboardStats, setDashboardStats, firmInfo, setFirmInfo
  } = useData();
  // Calendar state (migrated to CalendarContext)
  const { calendarView, setCalendarView, calendarDate, setCalendarDate } = useCalendar();
  // Selected matter (migrated to DialogContext)
  const { selectedMatter, setSelectedMatter } = useDialog('selectedMatter');
  
  // Notification state (migrated to NotificationContext in v48.1)
  const { toast, showToast, hideToast, confirmDialog, showConfirm, hideConfirm } = useNotification();

  // Timer state (migrated to TimerContext in v48.1)
  const { timerExpanded, setTimerExpanded } = useTimer();

  // UI state (migrated to UIContext in v48.1 Phase 3c.4b, Session 13)
  const {
    forms, openForm, closeForm,
    hasUnsavedChanges, setHasUnsavedChanges,
    pendingNavigation, setPendingNavigation,
    markFormDirty, clearFormDirty
  } = useUI();

  // Modal hooks (migrated to UIContext - Phase 3c.4d)
  const company360Modal = useUIModal('company360Report');
  const complianceCalendarModal = useUIModal('complianceCalendar');
  const shareholderRegistryModal = useUIModal('shareholderRegistry');
  const directorRegistryModal = useUIModal('directorRegistry');
  const widgetSettingsModal = useUIModal('widgetSettings');

  // Handle navigation with unsaved changes warning
  const handleModuleChange = useCallback((newModule) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(newModule);
      showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to continue without saving?',
        () => {
          setCurrentModule(newModule);
          setHasUnsavedChanges(false);
          setPendingNavigation(null);
          hideConfirm();
        }
      );
    } else {
      setCurrentModule(newModule);
    }
  }, [hasUnsavedChanges, setPendingNavigation, showConfirm, setCurrentModule, setHasUnsavedChanges, hideConfirm]);
  
  // Data state — migrated to DataContext
  // Lookup data — migrated to DataContext
  
  // Calendar state — migrated to CalendarContext
  
  // Form visibility
  // showClientForm, editingClient, clientFormData — migrated to UIContext (v48.1 Phase 3c.4b)
  // showMatterForm, editingMatter, matterFormData — migrated to UIContext (v48.1 Phase 3c.4c)
  // showHearingForm, editingHearing, hearingFormData — migrated to UIContext (v48.1 Phase 3c.4c)
  // showJudgmentForm, editingJudgment — migrated to UIContext (v48.1 Phase 3c.4c)
  // showTaskForm, editingTask, taskFormData — migrated to UIContext (v48.1 Phase 3c.4c Batch 3)
  // showTimesheetForm, editingTimesheet, timesheetFormData — migrated to UIContext (v48.1 Phase 3c.4c Batch 2)
  // showPartyForm — migrated to UIContext (v48.1 Phase 3c.4c Batch 4)
  // showConflictResults — migrated to DialogContext (Phase 3c.6)
  // showLookupForm — migrated to UIContext (v48.1 Phase 3c.4c Batch 4)
  // showAppointmentForm, editingAppointment — migrated to UIContext (v48.1 Phase 3c.4c Batch 3)
  // showExpenseForm, editingExpense — migrated to UIContext (v48.1 Phase 3c.4c Batch 2)
  // showAdvanceForm, editingAdvance — migrated to UIContext (v48.1 Phase 3c.4c Batch 2)
  // showInvoiceForm, editingInvoice — migrated to UIContext (v48.1 Phase 3c.4c Batch 2)
  // showDeadlineForm, editingDeadline, deadlineFormData — migrated to UIContext (v48.1 Phase 3c.4c Batch 3)
  // showEntityForm, entityFormTab — migrated to UIContext (v48.1 Phase 3c.4c Batch 4)
  // showMatterTimeline, timelineMatter — migrated to DialogContext (Phase 3c.6)
  
  // Report modal states — migrated to ReportContext (Phase 3c.6)
  // showClientStatement, clientStatementData, clientStatementLoading, clientStatementFilters
  // showCaseStatusReport, caseStatusData, caseStatusLoading, caseStatusClientId
  // showClient360Report, client360Data, client360Loading, client360ClientId

  // Corporate Report modals — migrated to UIContext (v48.1 Phase 3c.4d)

  // showAppealMatterDialog, appealMatterData — migrated to DialogContext (Phase 3c.6)

  // Editing state
  // editingMatter, editingHearing, editingJudgment — migrated to UIContext (v48.1 Phase 3c.4c)
  // editingTask, editingAppointment — migrated to UIContext (v48.1 Phase 3c.4c Batch 3)
  // editingEntity — migrated to UIContext (v48.1 Phase 3c.4c Batch 4)

  // Form data (lifted to App level to prevent state loss on re-render)
  // hearingFormData, matterFormData — migrated to UIContext (v48.1 Phase 3c.4c)
  // taskFormData, deadlineFormData, editingDeadline — migrated to UIContext (v48.1 Phase 3c.4c Batch 3)
  // selectedMatter — migrated to DialogContext
  // conflictResults, viewingInvoice — migrated to DialogContext (Phase 3c.6)
  // editingLookup, currentLookupType — migrated to UIContext (v48.1 Phase 3c.4c Batch 4)
  // settingsTab — migrated to SettingsModule (Phase 3c.7a)
  
  // Firm Info — migrated to DataContext
  
  
  // dashboardWidgets, draggedWidget — migrated to Dashboard (Phase 3c.7a)
  // widgetSettings — migrated to UIContext (v48.1 Phase 3c.4d)


  // Timer state migrated to TimerContext (v48.1)
  // isRTL removed (v48)

  // Report contexts (Phase 3c.6)
  const clientStatementReport = useReport('clientStatement');
  const caseStatusReport = useReport('caseStatus');
  const client360Report = useReport('client360');

  // Dialog contexts (Phase 3c.6)
  const appealMatterDialog = useDialog('appealMatter');
  const matterTimelineDialog = useDialog('matterTimeline');
  const invoiceViewerDialog = useDialog('invoiceViewer');
  const { selectedMatter: selectedMatterFromContext, setSelectedMatter: setSelectedMatterContext } = useDialog('selectedMatter');

  // LICENSE CHECK (v46.48)
  useEffect(() => {
    const checkLicense = async () => {
      try {
        // Check if running in Electron
        if (apiClient.isElectron) {
          const [status, id] = await Promise.all([
            apiClient.getLicenseStatus(),
            apiClient.getMachineId()
          ]);
          setLicenseStatus(status);
          setMachineId(id);
        } else {
          // Web mode - skip license check
          setLicenseStatus({ isValid: true, status: 'WEB_MODE' });
        }
      } catch (error) {
        console.error('License check error:', error);
        // FAIL-CLOSED: In case of error, block app access (v47.1 Phase 3)
        setLicenseStatus({ isValid: false, status: 'ERROR', message: error.message });
      } finally {
        setLicenseChecked(true);
      }
    };
    checkLicense();
  }, []);

  // Handle license activation
  const handleLicenseActivated = useCallback(async () => {
    if (apiClient.isElectron) {
      const status = await apiClient.getLicenseStatus();
      setLicenseStatus(status);
    }
  }, []);


  // TRANSLATIONS


  // DATA LOADING

  useEffect(() => {
    loadEssentialData();
  }, []);

  // Load data on-demand when navigating to each module
  useEffect(() => {
    if (currentModule === 'clients' && clients.length === 0) {
      loadClientsData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'matters' && matters.length === 0) {
      loadMattersData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'hearings' && hearings.length === 0) {
      loadHearingsData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'judgments' && judgments.length === 0) {
      loadJudgmentsData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'tasks' && tasks.length === 0) {
      loadTasksData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'timesheets' && timesheets.length === 0) {
      loadTimesheetsData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'calendar' && appointments.length === 0) {
      loadAppointmentsData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'expenses' && expenses.length === 0) {
      loadExpensesData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'advances' && advances.length === 0) {
      loadAdvancesData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'invoices' && invoices.length === 0) {
      loadInvoicesData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'deadlines' && deadlines.length === 0) {
      loadDeadlinesData();
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === 'corporate' && corporateEntities.length === 0) {
      loadCorporateData();
    }
  }, [currentModule]);

  // Load firm info on mount (needed for Invoices)
  useEffect(() => {
    const loadFirmInfo = async () => {
      try {
        const info = await apiClient.getFirmInfo();
        if (info) setFirmInfo(prev => ({ ...prev, ...info }));
      } catch (error) {
        console.error('Error loading firm info:', error);
      }
    };
    loadFirmInfo();
  }, []);


  // KEYBOARD SHORTCUTS

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close any open form
      if (e.key === 'Escape') {
        if (forms.client.isOpen) { closeForm('client'); }
        else if (forms.matter.isOpen) { closeForm('matter'); }
        else if (forms.hearing.isOpen) { closeForm('hearing'); }
        else if (forms.task.isOpen) { closeForm('task'); }
        else if (forms.timesheet.isOpen) { closeForm('timesheet'); }
        else if (forms.judgment.isOpen) { closeForm('judgment'); }
        else if (forms.appointment.isOpen) { closeForm('appointment'); }
        else if (forms.expense.isOpen) { closeForm('expense'); }
        else if (forms.advance.isOpen) { closeForm('advance'); }
        else if (forms.invoice.isOpen) { closeForm('invoice'); }
        else if (forms.deadline.isOpen) { closeForm('deadline'); }
        else if (invoiceViewerDialog.isOpen) invoiceViewerDialog.closeDialog();
        else if (forms.lookup.isOpen) { closeForm('lookup'); }
        else if (confirmDialog.isOpen) hideConfirm();
      }
      
      // Ctrl+N or Cmd+N to open new form for current module
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (currentModule === 'clients') openForm('client');
        else if (currentModule === 'matters') openForm('matter');
        else if (currentModule === 'hearings') openForm('hearing');
        else if (currentModule === 'tasks') openForm('task');
        else if (currentModule === 'timesheets') openForm('timesheet');
        else if (currentModule === 'judgments') openForm('judgment');
        else if (currentModule === 'appointments') openForm('appointment');
        else if (currentModule === 'expenses') openForm('expense');
        else if (currentModule === 'advances') openForm('advance');
        else if (currentModule === 'invoices') openForm('invoice');
        // Deadlines: No manual add - auto-generated from Judgments only
      }
      
      // Ctrl+T or Cmd+T to toggle timer
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setTimerExpanded(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forms.client.isOpen, forms.matter.isOpen, forms.hearing.isOpen, forms.judgment.isOpen,
      forms.timesheet.isOpen, forms.expense.isOpen, forms.advance.isOpen, forms.invoice.isOpen,
      forms.task.isOpen, forms.appointment.isOpen, forms.deadline.isOpen,
      invoiceViewerDialog.isOpen, invoiceViewerDialog.closeDialog, forms.lookup.isOpen, confirmDialog.isOpen, currentModule, hideConfirm, timerExpanded,
      closeForm, openForm]);

  // Load only essential data needed at startup (lookups + lawyers + dashboard)
  const loadEssentialData = async () => {
    setLoading(true);
    try {
      const [
        courtsData,
        regionsData,
        purposesData,
        taskTypesData,
        expenseCatsData,
        entityTypesData,
        lawyersData,
        statsData
      ] = await Promise.all([
        apiClient.getCourtTypes(),
        apiClient.getRegions(),
        apiClient.getHearingPurposes(),
        apiClient.getTaskTypes(),
        apiClient.getExpenseCategories(),
        apiClient.getEntityTypes(),
        apiClient.getLawyers(),
        apiClient.getDashboardStats()
      ]);

      setCourtTypes(courtsData);
      setRegions(regionsData);
      setHearingPurposes(purposesData);
      setTaskTypes(taskTypesData);
      setExpenseCategories(expenseCatsData);
      setEntityTypes(entityTypesData);
      setLawyers(lawyersData);
      setDashboardStats(statsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading essential data:', error);
      setLoading(false);
    }
  };

  // Module-specific data loaders (called when navigating to each module)
  const loadClientsData = async () => {
    try {
      const data = await apiClient.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadMattersData = async () => {
    try {
      const data = await apiClient.getAllMatters();
      setMatters(data);
    } catch (error) {
      console.error('Error loading matters:', error);
    }
  };

  const loadHearingsData = async () => {
    try {
      const data = await apiClient.getAllHearings();
      setHearings(data);
    } catch (error) {
      console.error('Error loading hearings:', error);
    }
  };

  const loadJudgmentsData = async () => {
    try {
      const data = await apiClient.getAllJudgments();
      setJudgments(data);
    } catch (error) {
      console.error('Error loading judgments:', error);
    }
  };

  const loadTasksData = async () => {
    try {
      const data = await apiClient.getAllTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTimesheetsData = async () => {
    try {
      const rawData = await apiClient.getAllTimesheets();
      const mappedData = rawData.map(t => ({
        ...t,
        billable: t.billable === 1
      }));
      setTimesheets(mappedData);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    }
  };

  const loadAppointmentsData = async () => {
    try {
      const data = await apiClient.getAllAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadExpensesData = async () => {
    try {
      const rawData = await apiClient.getAllExpenses();
      const mappedData = rawData.map(e => ({
        ...e,
        billable: e.billable === 1
      }));
      setExpenses(mappedData);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const loadAdvancesData = async () => {
    try {
      const data = await apiClient.getAllAdvances();
      setAdvances(data);
    } catch (error) {
      console.error('Error loading advances:', error);
    }
  };

  const loadInvoicesData = async () => {
    try {
      const data = await apiClient.getAllInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadDeadlinesData = async () => {
    try {
      const data = await apiClient.getAllDeadlines();
      setDeadlines(data);
    } catch (error) {
      console.error('Error loading deadlines:', error);
    }
  };

  const loadCorporateData = async () => {
    try {
      const data = await apiClient.getAllCorporateEntities();
      setCorporateEntities(data);
    } catch (error) {
      console.error('Error loading corporate entities:', error);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        clientsData, mattersData, hearingsData, judgmentsData, tasksData,
        timesheetsData, appointmentsData, expensesData, advancesData, invoicesData,
        courtTypesData, regionsData, purposesData, taskTypesData,
        expenseCategoriesData, entityTypesData, lawyersData, statsData
      ] = await Promise.all([
        apiClient.getAllClients(),
        apiClient.getAllMatters(),
        apiClient.getAllHearings(),
        apiClient.getAllJudgments(),
        apiClient.getAllTasks(),
        apiClient.getAllTimesheets(),
        apiClient.getAllAppointments(),
        apiClient.getAllExpenses(),
        apiClient.getAllAdvances(),
        apiClient.getAllInvoices(),
        apiClient.getCourtTypes(),
        apiClient.getRegions(),
        apiClient.getHearingPurposes(),
        apiClient.getTaskTypes(),
        apiClient.getExpenseCategories(),
        apiClient.getEntityTypes(),
        apiClient.getLawyers(),
        apiClient.getDashboardStats()
      ]);
      
      setClients(clientsData);
      setMatters(mattersData);
      setHearings(hearingsData);
      setJudgments(judgmentsData);
      setTasks(tasksData);
      setTimesheets(timesheetsData.map(ts => ({ ...ts, billable: ts.billable === 1 })));
      setAppointments(appointmentsData);
      setExpenses(expensesData.map(e => ({ ...e, billable: e.billable === 1 })));
      setAdvances(advancesData);
      setInvoices(invoicesData);
      setCourtTypes(courtTypesData);
      setRegions(regionsData);
      setHearingPurposes(purposesData);
      setTaskTypes(taskTypesData);
      setExpenseCategories(expenseCategoriesData);
      setEntityTypes(entityTypesData || []);
      setLawyers(lawyersData);
      setDashboardStats(statsData);
      
      // Load deadlines separately (graceful if API not yet available)
      try {
        const deadlinesData = await apiClient.getAllDeadlines();
        setDeadlines(deadlinesData || []);
      } catch (e) {
        setDeadlines([]);
      }

      // Load corporate entities (v41.1)
      try {
        const corporateData = await apiClient.getAllCorporateEntities();
        setCorporateEntities(corporateData || []);
      } catch (e) {
        setCorporateEntities([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };


  // TARGETED REFRESH FUNCTIONS

  const refreshClients = async () => {
    try {
      const [clientsData, statsData] = await Promise.all([
        apiClient.getAllClients(),
        apiClient.getDashboardStats()
      ]);
      setClients(clientsData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing clients:', error);
    }
  };

  const refreshMatters = async () => {
    try {
      const [mattersData, statsData] = await Promise.all([
        apiClient.getAllMatters(),
        apiClient.getDashboardStats()
      ]);
      setMatters(mattersData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing matters:', error);
    }
  };

  const refreshHearings = async () => {
    try {
      const [hearingsData, statsData] = await Promise.all([
        apiClient.getAllHearings(),
        apiClient.getDashboardStats()
      ]);
      setHearings(hearingsData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing hearings:', error);
    }
  };

  const refreshJudgments = async () => {
    try {
      const judgmentsData = await apiClient.getAllJudgments();
      setJudgments(judgmentsData);
    } catch (error) {
      console.error('Error refreshing judgments:', error);
    }
  };

  // v45: Appeal Matter Workflow Handlers
  const handleJudgmentAppealed = (judgment, matter) => {
    appealMatterDialog.openDialog({ judgment, matter });
  };

  const createAppealMatter = async (appealData) => {
    try {
      const { originalMatter, courtTypeId, newCaseNumber } = appealData;
      
      // Determine the next stage
      const currentStage = originalMatter.matter_stage || 'first_instance';
      const nextStage = currentStage === 'first_instance' ? 'appeal' : 'cassation';
      
      // Create appeal matter name
      const prefix = 'Appeal: ';
      const appealMatterName = prefix + originalMatter.matter_name;
      
      const newMatter = {
        client_id: originalMatter.client_id,
        matter_name: appealMatterName,
        case_number: newCaseNumber || '',
        court_type_id: courtTypeId,
        responsible_lawyer_id: originalMatter.responsible_lawyer_id,
        matter_type: originalMatter.matter_type,
        status: 'active',
        opening_date: new Date().toISOString().split('T')[0],
        parent_matter_id: originalMatter.matter_id,
        matter_stage: nextStage,
        notes: `Appeal of case: \${originalMatter.case_number || originalMatter.matter_name}`
      };
      
      await apiClient.addMatter(newMatter);
      await refreshMatters();
      
      showToast('Appeal matter created successfully');
      appealMatterDialog.closeDialog();
    } catch (error) {
      console.error('Error creating appeal matter:', error);
      showToast('Error creating appeal matter', 'error');
    }
  };

  const refreshTasks = async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        apiClient.getAllTasks(),
        apiClient.getDashboardStats()
      ]);
      setTasks(tasksData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  const refreshTimesheets = async () => {
    try {
      const timesheetsData = await apiClient.getAllTimesheets();
      setTimesheets(timesheetsData.map(ts => ({ ...ts, billable: ts.billable === 1 })));
    } catch (error) {
      console.error('Error refreshing timesheets:', error);
    }
  };

  const refreshAppointments = async () => {
    try {
      const appointmentsData = await apiClient.getAllAppointments();
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  const refreshExpenses = async () => {
    try {
      const expensesData = await apiClient.getAllExpenses();
      setExpenses(expensesData.map(e => ({ ...e, billable: e.billable === 1 })));
    } catch (error) {
      console.error('Error refreshing expenses:', error);
    }
  };

  const refreshAdvances = async () => {
    try {
      const advancesData = await apiClient.getAllAdvances();
      setAdvances(advancesData);
    } catch (error) {
      console.error('Error refreshing advances:', error);
    }
  };

  const refreshInvoices = async () => {
    try {
      const [invoicesData, statsData, advancesData] = await Promise.all([
        apiClient.getAllInvoices(),
        apiClient.getDashboardStats(),
        apiClient.getAllAdvances()
      ]);
      setInvoices(invoicesData);
      setDashboardStats(statsData);
      setAdvances(advancesData);
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
  };

  const refreshDeadlines = async () => {
    try {
      const deadlinesData = await apiClient.getAllDeadlines();
      setDeadlines(deadlinesData || []);
    } catch (error) {
      console.error('Error refreshing deadlines:', error);
    }
  };

  // Update deadline status - for "Mark as Handled" feature (v46.33)
  const handleUpdateDeadlineStatus = async (deadlineId, newStatus) => {
    try {
      const result = await apiClient.updateDeadlineStatus(deadlineId, newStatus);
      await refreshDeadlines();
    } catch (error) {
      console.error('Error updating deadline status:', error);
      showToast('Error updating deadline status', 'error');
    }
  };

  // Generate Client Statement (v44.3)
  const generateClientStatement = async (clientId, dateFrom, dateTo) => {
    if (!clientId) {
      showToast('Please select a client', 'error');
      return;
    }
    
    clientStatementReport.setLoading(true);
    try {
      const data = await apiClient.generateReport('client-statement', {
        clientId,
        dateFrom: dateFrom || '2000-01-01',
        dateTo: dateTo || new Date().toISOString().split('T')[0]
      });

      if (data.error) {
        showToast(data.error, 'error');
        return;
      }

      clientStatementReport.setData(data);
    } catch (error) {
      console.error('Error generating client statement:', error);
      showToast('Error generating statement', 'error');
    } finally {
      clientStatementReport.setLoading(false);
    }
  };

  // Export Client Statement (v44.3)
  const exportClientStatement = async (format) => {
    if (!clientStatementReport.data) return;

    try {
      const firmInfo = await apiClient.getFirmInfo();
      let result;

      if (format === 'pdf') {
        result = await apiClient.exportClientStatementPdf(clientStatementReport.data, firmInfo);
      } else {
        result = await apiClient.exportClientStatementExcel(clientStatementReport.data);
      }
      
      if (result.success) {
        showToast('Statement exported successfully');
      } else if (!result.canceled) {
        showToast(result.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Error exporting statement:', error);
      showToast('Export error', 'error');
    }
  };

  // Generate Case Status Report (v44.3)
  const generateCaseStatusReport = async (clientId) => {
    if (!clientId) {
      showToast('Please select a client', 'error');
      return;
    }
    
    caseStatusReport.setLoading(true);
    try {
      const data = await apiClient.generateReport('case-status-report', { clientId });

      if (data.error) {
        showToast(data.error, 'error');
        return;
      }

      caseStatusReport.setData(data);
    } catch (error) {
      console.error('Error generating case status report:', error);
      showToast('Error generating report', 'error');
    } finally {
      caseStatusReport.setLoading(false);
    }
  };

  // Export Case Status Report (v44.3)
  const exportCaseStatusReport = async (format) => {
    if (!caseStatusReport.data) return;

    try {
      const firmInfo = await apiClient.getFirmInfo();
      let result;

      if (format === 'pdf') {
        result = await apiClient.exportCaseStatusPdf(caseStatusReport.data, firmInfo);
      } else {
        result = await apiClient.exportCaseStatusExcel(caseStatusReport.data);
      }
      
      if (result.success) {
        showToast('Report exported successfully');
      } else if (!result.canceled) {
        showToast(result.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Export error', 'error');
    }
  };

  // Generate Client 360° Report (v44.5)
  const generateClient360Report = async (clientId) => {
    if (!clientId) return;
    
    client360Report.setLoading(true);
    try {
      const data = await apiClient.generateReport('client-360-report', { clientId });

      if (!data || data.error) {
        showToast(data?.error || 'Error generating report', 'error');
        return;
      }

      client360Report.setData(data);
    } catch (error) {
      console.error('Error generating client 360 report:', error);
      showToast('Error generating report', 'error');
    } finally {
      client360Report.setLoading(false);
    }
  };

  // Export Client 360° Report (v44.5)
  const exportClient360Report = async (format) => {
    if (!client360Report.data) return;

    try {
      const firmInfo = await apiClient.getFirmInfo();
      let result;

      if (format === 'pdf') {
        result = await apiClient.exportClient360Pdf(client360Report.data, firmInfo);
      } else {
        result = await apiClient.exportClient360Excel(client360Report.data);
      }
      
      if (result.success) {
        showToast('Report exported successfully');
      } else if (!result.canceled) {
        showToast(result.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Export error', 'error');
    }
  };

  const refreshCorporateEntities = async () => {
    try {
      // Issue #1 fix: Use getCorporateClients to get ALL qualifying clients
      // (not just those with corporate_entities records)
      const data = await apiClient.getCorporateClients();
      setCorporateEntities(data || []);
    } catch (error) {
      console.error('Error refreshing corporate entities:', error);
    }
  };

  const refreshLookups = async () => {
    try {
      const [courtTypesData, regionsData, purposesData, taskTypesData, expenseCategoriesData, entityTypesData, lawyersData] = await Promise.all([
        apiClient.getCourtTypes(),
        apiClient.getRegions(),
        apiClient.getHearingPurposes(),
        apiClient.getTaskTypes(),
        apiClient.getExpenseCategories(),
        apiClient.getEntityTypes(),
        apiClient.getLawyers()
      ]);
      setCourtTypes(courtTypesData);
      setRegions(regionsData);
      setHearingPurposes(purposesData);
      setTaskTypes(taskTypesData);
      setExpenseCategories(expenseCategoriesData);
      setEntityTypes(entityTypesData || []);
      setLawyers(lawyersData);
    } catch (error) {
      console.error('Error refreshing lookups:', error);
    }
  };


  // UTILITY FUNCTIONS


  // CONFLICT CHECK

  const runConflictCheck = async (searchTerms) => {
    try {
      const results = await apiClient.conflictCheck(searchTerms);
      return results;
    } catch (error) {
      console.error('Error running conflict check:', error);
      return [];
    }
  };


  // ============================================
  // LICENSE CHECK SCREEN (v46.48)
  // ============================================
  // Show loading while checking license
  if (!licenseChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{'Verifying license...'}</p>
        </div>
      </div>
    );
  }

  // Show license screen if not valid
  if (!licenseStatus?.isValid) {
    return (
      <LicenseScreen
        machineId={machineId}
        onActivate={handleLicenseActivated}
        error={licenseStatus?.message}
        isArabic={false}
      />
    );
  }

  // ============================================
  // LOADING SCREEN
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-100 ltr" dir="ltr">
      {/* License Warning Banner (v46.48) */}
      {licenseStatus?.warning && (
        <LicenseWarningBanner
          warning={licenseStatus.warning}
          warningLevel={licenseStatus.warningLevel}
          daysUntilExpiry={licenseStatus.details?.daysUntilExpiry}
          isGracePeriod={licenseStatus.status === 'GRACE_PERIOD'}
          expiresAt={licenseStatus.details?.expiresAt}
          isArabic={false}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-md lg:hidden">
              {!sidebarCollapsed ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Qanuni</h1>
          </div>
          {!apiClient.isElectron && authUser && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{authUser.full_name || authUser.email}</span>
              <button
                onClick={authLogout}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div data-tour="sidebar" className={`${!sidebarCollapsed ? 'block' : 'hidden'} lg:block w-64 bg-white shadow-sm min-h-screen`}>
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
              { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
              { id: 'clients', icon: Users, label: 'Clients' },
              { id: 'matters', icon: Briefcase, label: 'Matters' },
              { id: 'hearings', icon: Gavel, label: 'Hearings' },
              { id: 'judgments', icon: Scale, label: 'Judgments' },
              { id: 'deadlines', icon: AlertTriangle, label: 'Deadlines' },
              { id: 'companies', icon: Building2, label: 'Companies' },
              { id: 'tasks', icon: ClipboardList, label: 'Tasks' },
              { id: 'appointments', icon: Calendar, label: 'Appointments' },
              { id: 'timesheets', icon: Clock, label: 'Timesheets' },
              { id: 'expenses', icon: Receipt, label: 'Expenses' },
              { id: 'advances', icon: Wallet, label: 'Advances' },
              { id: 'invoices', icon: FileText, label: 'Invoices' },
              { id: 'reports', icon: PieChart, label: 'Reports' },
              { id: 'conflict-check', icon: Search, label: 'Conflict Check' },
              { id: 'settings', icon: Settings, label: 'Settings' },
              { id: 'trash', icon: Trash2, label: 'Trash' },
            ].map(item => (
              <button key={item.id} data-tour={`nav-${item.id}`} onClick={() => handleModuleChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  currentModule === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <ErrorBoundary onRetry={loadAllData}>
          {currentModule === 'dashboard' && <Dashboard
            hearings={hearings}
            hearingPurposes={hearingPurposes}
            tasks={tasks}
            judgments={judgments}
            deadlines={deadlines}
            matters={matters}
            clients={clients}
            corporateEntities={corporateEntities}
            dashboardStats={dashboardStats}
            showWidgetSettings={widgetSettingsModal.isOpen}
            setShowWidgetSettings={widgetSettingsModal.toggle}
            formatDate={formatDate}
            onNavigate={handleModuleChange}
          />}
          {currentModule === 'calendar' && <CalendarModule
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            hearings={hearings}
            hearingPurposes={hearingPurposes}
            appointments={appointments}
            tasks={tasks}
            judgments={judgments}
            deadlines={deadlines}
            matters={matters}
            clients={clients}
            onAddAppointment={() => openForm('appointment')}
            onViewDeadline={(deadline) => {
              // Navigate to deadlines module when clicking a deadline on calendar
              setCurrentModule('deadlines');
            }}
          />}
          {currentModule === 'clients' && (
            <ClientsList
              clients={clients}
              showConfirm={showConfirm}
              showToast={showToast}
              hideConfirm={hideConfirm}
              refreshClients={refreshClients}

            />
          )}
          {currentModule === 'matters' && (
            <MattersList
              matters={matters}
              clients={clients}
              lawyers={lawyers}
              showConfirm={showConfirm}
              showToast={showToast}
              hideConfirm={hideConfirm}
              refreshMatters={refreshMatters}

              onViewTimeline={(matter) => {
                matterTimelineDialog.openDialog(matter);
              }}
            />
          )}
          {currentModule === 'hearings' && (
            <HearingsList
              hearings={hearings}
              matters={matters}
              clients={clients}
              hearingPurposes={hearingPurposes}
              regions={regions}
              formatDate={formatDate}
              showConfirm={showConfirm}
              showToast={showToast}
              hideConfirm={hideConfirm}
              refreshHearings={refreshHearings}

            />
          )}
          {currentModule === 'judgments' && (
            <JudgmentsList
              judgments={judgments}
              matters={matters}
              clients={clients}
              deadlines={deadlines}
              hearings={hearings}
              formatDate={formatDate}
              showConfirm={showConfirm}
              showToast={showToast}
              hideConfirm={hideConfirm}
              refreshJudgments={refreshJudgments}

            />
          )}
          {currentModule === 'deadlines' && <DeadlinesList
            deadlines={deadlines}
            clients={clients}
            matters={matters}
            judgments={judgments}
            tasks={tasks}
            onViewJudgment={(judgment) => {
              openForm('judgment', judgment);
              setCurrentModule('judgments');
            }}
            onViewTask={(task) => {
              openForm('task', task);
              setCurrentModule('tasks');
            }}
            onViewMatter={(matter) => {
              openForm('matter', matter);
              setCurrentModule('matters');
            }}
            onUpdateDeadlineStatus={handleUpdateDeadlineStatus}
            showToast={showToast}
          />}
          {currentModule === 'companies' && (
            forms.entity.isOpen ? (
              <EntityForm
                showToast={showToast}
                refreshCorporateEntities={refreshCorporateEntities}
                entityTypes={entityTypes}
              />
            ) : (
              <EntitiesList
                corporateEntities={corporateEntities}
                showToast={showToast}
                refreshCorporateEntities={refreshCorporateEntities}
              />
            )
          )}
          {currentModule === 'tasks' && <TasksList
            tasks={tasks}
            clients={clients}
            matters={matters}
            lawyers={lawyers}
            taskTypes={taskTypes}
            regions={regions}
            showConfirm={showConfirm}
            showToast={showToast}
            hideConfirm={hideConfirm}
            refreshTasks={refreshTasks}
          />}
          {currentModule === 'appointments' && <AppointmentsList
            appointments={appointments}
            clients={clients}
            showConfirm={showConfirm}
            hideConfirm={hideConfirm}
            showToast={showToast}
            refreshAppointments={refreshAppointments}
          />}
          {currentModule === 'timesheets' && <TimesheetsList
            timesheets={timesheets}
            clients={clients}
            matters={matters}
            lawyers={lawyers}
            showConfirm={showConfirm}
            showToast={showToast}
            hideConfirm={hideConfirm}
            refreshTimesheets={refreshTimesheets}
          />}
          {currentModule === 'expenses' && <ExpensesList
            expenses={expenses}
            clients={clients}
            matters={matters}
            lawyers={lawyers}
            expenseCategories={expenseCategories}
            showConfirm={showConfirm}
            showToast={showToast}
            hideConfirm={hideConfirm}
            refreshExpenses={refreshExpenses}
          />}
          {currentModule === 'advances' && <AdvancesList
            advances={advances}
            lawyers={lawyers}
            expenses={expenses}
            clients={clients}
            showConfirm={showConfirm}
            hideConfirm={hideConfirm}
            showToast={showToast}
            refreshAdvances={refreshAdvances}
            lawyerAdvanceMinBalance={parseFloat(firmInfo.lawyer_advance_min_balance) || 500}
          />}
          {currentModule === 'invoices' && <InvoicesList
            invoices={invoices}
            clients={clients}
            matters={matters}
            setViewingInvoice={(invoice) => invoice ? invoiceViewerDialog.openDialog(invoice) : invoiceViewerDialog.closeDialog()}
            showConfirm={showConfirm}
            showToast={showToast}
            hideConfirm={hideConfirm}
            refreshInvoices={refreshInvoices}
          />}
          {currentModule === 'reports' && <ReportsModule
            formatDate={formatDate}
            setShowClientStatement={() => clientStatementReport.openReport()}
            setShowCaseStatusReport={() => caseStatusReport.openReport()}
            setShowClient360Report={() => client360Report.openReport()}
            setShowCompany360Report={company360Modal.toggle}
            setShowComplianceCalendar={complianceCalendarModal.toggle}
            setShowShareholderRegistry={shareholderRegistryModal.toggle}
            setShowDirectorRegistry={directorRegistryModal.toggle}
          />}
          {currentModule === 'settings' && <SettingsModule
            firmInfo={firmInfo}
            setFirmInfo={setFirmInfo}

            lawyers={lawyers}
            courtTypes={courtTypes}
            regions={regions}
            hearingPurposes={hearingPurposes}
            taskTypes={taskTypes}
            expenseCategories={expenseCategories}
            showConfirm={showConfirm}
            hideConfirm={hideConfirm}
            showToast={showToast}
            refreshLookups={refreshLookups}
          />}
          {currentModule === 'trash' && <TrashModule
            showConfirm={showConfirm}
            hideConfirm={hideConfirm}
            showToast={showToast}
            onRestore={(type) => {
              // Refresh appropriate data based on restored item type
              const refreshMap = {
                client: refreshClients,
                matter: refreshMatters,
                hearing: refreshHearings,
                judgment: refreshJudgments,
                task: refreshTasks,
                timesheet: refreshTimesheets,
                expense: refreshExpenses,
                advance: refreshAdvances,
                invoice: refreshInvoices,
                appointment: refreshAppointments,
                deadline: refreshDeadlines
              };
              const refreshFn = refreshMap[type];
              if (refreshFn) refreshFn();
            }}
          />}
          {currentModule === 'conflict-check' && <ConflictCheckTool
            showToast={showToast}
          />}
          </ErrorBoundary>
        </div>
      </div>

      {/* Modals */}
      {forms.client.isOpen && <ClientForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshClients={refreshClients}
          refreshCorporateEntities={refreshCorporateEntities}
          entityTypes={entityTypes}

        />}
      {forms.matter.isOpen && <MatterForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshMatters={refreshMatters}
          refreshClients={refreshClients}
          clients={clients}
          matters={matters}
          courtTypes={courtTypes}
          regions={regions}
          lawyers={lawyers}
          onViewMatter={(matter) => openForm('matter', matter)}

        />}
      {forms.hearing.isOpen && <HearingForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshHearings={refreshHearings}
          refreshJudgments={refreshJudgments}
          clients={clients}
          matters={matters}
          courtTypes={courtTypes}
          regions={regions}
          hearingPurposes={hearingPurposes}
          lawyers={lawyers}
          judgments={judgments}
          selectedMatter={selectedMatter}

        />}
      {forms.task.isOpen && <TaskForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshTasks={refreshTasks}
          clients={clients}
          matters={matters}
          taskTypes={taskTypes}
          lawyers={lawyers}
        />}
      {forms.timesheet.isOpen && <TimesheetForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshTimesheets={refreshTimesheets}
          clients={clients}
          matters={matters}
          lawyers={lawyers}
        />}
      {forms.judgment.isOpen && <JudgmentForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshJudgments={refreshJudgments}
          refreshDeadlines={refreshDeadlines}
          refreshHearings={refreshHearings}
          clients={clients}
          matters={matters}
          hearings={hearings}
          hearingPurposes={hearingPurposes}
          onJudgmentAppealed={handleJudgmentAppealed}

        />}
      {forms.appointment.isOpen && <AppointmentForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshAppointments={refreshAppointments}
          clients={clients}
          matters={matters}
          lawyers={lawyers}
        />}
      {forms.expense.isOpen && <ExpenseForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshExpenses={refreshExpenses}
          refreshAdvances={refreshAdvances}
          clients={clients}
          matters={matters}
          expenseCategories={expenseCategories}
          lawyers={lawyers}
          advances={advances}
        />}
      {forms.advance.isOpen && <AdvanceForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshAdvances={refreshAdvances}
          clients={clients}
          matters={matters}
          lawyers={lawyers}
        />}
      {forms.deadline.isOpen && <DeadlineForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshDeadlines={refreshDeadlines}
          clients={clients}
          matters={matters}
          judgments={judgments}
        />}
      {forms.invoice.isOpen && <InvoiceForm
          showToast={showToast}
          markFormDirty={markFormDirty}
          clearFormDirty={clearFormDirty}
          refreshInvoices={refreshInvoices}
          refreshTimesheets={refreshTimesheets}
          refreshExpenses={refreshExpenses}
          refreshAdvances={refreshAdvances}
          clients={clients}
          matters={matters}
          timesheets={timesheets}
          expenses={expenses}
          advances={advances}
          firmInfo={firmInfo}
        />}
      {invoiceViewerDialog.isOpen && <InvoiceViewModal
        clients={clients}
        matters={matters}
        formatDate={formatDate}
        showToast={showToast}
      />}
      
      {/* Client Statement Modal (v44.3) - Extracted v46.15 */}
      <ClientStatementModal
        generateClientStatement={generateClientStatement}
        exportClientStatement={exportClientStatement}
        clients={clients}
        invoices={invoices}
        advances={advances}
      />
      
      {/* Case Status Report Modal (v44.3) - Extracted v46.16 */}
      <CaseStatusReportModal
        generateCaseStatusReport={generateCaseStatusReport}
        exportCaseStatusReport={exportCaseStatusReport}
        clients={clients}
        matters={matters}
        hearings={hearings}
      />
      
      {/* Client 360° Report Modal (v44.5) - Extracted v46.17 */}
      <Client360ReportModal
        generateClient360Report={generateClient360Report}
        exportClient360Report={exportClient360Report}
        clients={clients}
        matters={matters}
        invoices={invoices}
        timesheets={timesheets}
        expenses={expenses}
      />
      
      {/* Corporate Report Modals (v46.25) */}
      {company360Modal.isOpen && (
        <Company360ReportModal
          show={company360Modal.isOpen}
          onClose={() => company360Modal.close()}
        />
      )}
      
      {complianceCalendarModal.isOpen && (
        <ComplianceCalendarReport
          show={complianceCalendarModal.isOpen}
          onClose={() => complianceCalendarModal.close()}
        />
      )}
      
      {shareholderRegistryModal.isOpen && (
        <ShareholderRegistryReport
          show={shareholderRegistryModal.isOpen}
          onClose={() => shareholderRegistryModal.close()}
        />
      )}
      
      {directorRegistryModal.isOpen && (
        <DirectorRegistryReport
          show={directorRegistryModal.isOpen}
          onClose={() => directorRegistryModal.close()}
        />
      )}
      
      {forms.lookup.isOpen && <LookupForm
          showToast={showToast}
          refreshLookups={refreshLookups}
        />}
      
      {/* Time Tracking Timer Widget */}
      <div data-tour="timer-fab">
      <TimerWidget
        clients={clients}
        matters={matters}
        lawyers={lawyers}
        refreshTimesheets={refreshTimesheets}
      />
      </div>
      
      {/* Matter Timeline Modal */}
      <MatterTimeline
        lawyers={lawyers}
        showToast={showToast}
      />
      
      {/* Guided Tour System */}
      <GuidedTourSystem currentModule={currentModule} />
      
      {/* Toast Notifications */}
      <Toast />
      
      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); }}
        onCancel={() => { hideConfirm(); setPendingNavigation(null); }}
        confirmText={
          confirmDialog.confirmText ? confirmDialog.confirmText
            : confirmDialog.title?.includes('Unsaved') || confirmDialog.title?.includes('غير محفوظة')
              ? ('Continue')
              : confirmDialog.title?.includes('Description') || confirmDialog.title?.includes('الوصف')
                ? ('Save Anyway')
                : ('Delete')
        }
        cancelText={'Cancel'}
        danger={
          confirmDialog.danger !== undefined ? confirmDialog.danger
            : !confirmDialog.title?.includes('Unsaved') && 
              !confirmDialog.title?.includes('غير محفوظة') &&
              !confirmDialog.title?.includes('Description') &&
              !confirmDialog.title?.includes('الوصف')
        }
      />
      
      {/* v45: Appeal Matter Dialog - Extracted v46.18 */}
      <AppealMatterDialog
        createAppealMatter={createAppealMatter}
        courtTypes={courtTypes}
        showToast={showToast}
      />
      
      {/* Print Styles */}
      <PrintStyles />
    </div>
  );
};

export default App;
