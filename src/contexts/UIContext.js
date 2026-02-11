import React, { createContext, useContext, useState, useCallback, useReducer } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  // ========================================
  // UNSAVED CHANGES TRACKING (Phase 3 - Session 13)
  // ========================================
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Helper functions for form dirty state
  const markFormDirty = useCallback(() => setHasUnsavedChanges(true), []);
  const clearFormDirty = useCallback(() => setHasUnsavedChanges(false), []);

  // ========================================
  // FORMS STATE (14 forms)
  // ========================================

  // Form visibility
  const [showClientForm, setShowClientForm] = useState(false);
  const [showMatterForm, setShowMatterForm] = useState(false);
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [showJudgmentForm, setShowJudgmentForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showEntityForm, setShowEntityForm] = useState(false);

  // Editing state (what record is being edited - null = new)
  const [editingClient, setEditingClient] = useState(null);
  const [editingMatter, setEditingMatter] = useState(null);
  const [editingHearing, setEditingHearing] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [editingJudgment, setEditingJudgment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [editingLookup, setEditingLookup] = useState(null);

  // Form data (lifted state for complex forms)
  const [hearingFormData, setHearingFormData] = useState(null);
  const [clientFormData, setClientFormData] = useState(null);
  const [matterFormData, setMatterFormData] = useState(null);
  const [taskFormData, setTaskFormData] = useState(null);
  const [timesheetFormData, setTimesheetFormData] = useState(null);
  const [deadlineFormData, setDeadlineFormData] = useState(null);

  // Form-specific state
  const [entityFormTab, setEntityFormTab] = useState('details');
  const [currentLookupType, setCurrentLookupType] = useState('courtTypes');

  // ========================================
  // MODALS STATE
  // ========================================

  // Report modals — migrated to ReportContext (Phase 3c.6)
  // Dialog modals — migrated to DialogContext (Phase 3c.6)
  // selectedMatter — migrated to DialogContext (Phase 3c.6)

  // Corporate report modals
  const [showCompany360Report, setShowCompany360Report] = useState(false);
  const [showComplianceCalendar, setShowComplianceCalendar] = useState(false);
  const [showShareholderRegistry, setShowShareholderRegistry] = useState(false);
  const [showDirectorRegistry, setShowDirectorRegistry] = useState(false);

  // Simple toggle modals (useReducer for clean toggling)
  const modalInitialState = {
    client: false,
    matter: false,
    hearing: false,
    timesheet: false,
    expense: false,
    deadline: false,
    task: false,
    judgment: false,
    appointment: false,
    invoice: false,
    advance: false,
    lawyer: false,
    addCurrency: false,
    deleteCurrency: false,
    shareholder: false,
    director: false,
    filing: false,
    meeting: false,
    // Report modals
    company360Report: false,
    complianceCalendar: false,
    shareholderRegistry: false,
    directorRegistry: false,
    // Settings
    widgetSettings: false,
  };

  const modalReducer = (state, action) => {
    switch (action.type) {
      case 'TOGGLE_MODAL':
        return {
          ...state,
          [action.payload]: !state[action.payload]
        };
      default:
        return state;
    }
  };

  const [modalToggles, dispatchModal] = useReducer(modalReducer, modalInitialState);

  const toggleModal = useCallback((modalName) => {
    dispatchModal({ type: 'TOGGLE_MODAL', payload: modalName });
  }, []);

  const [showWidgetSettings, setShowWidgetSettings] = useState(false);

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  const openForm = useCallback((formType, editingData = null, formData = null) => {
    const setters = {
      client: { show: setShowClientForm, editing: setEditingClient, data: setClientFormData },
      matter: { show: setShowMatterForm, editing: setEditingMatter, data: setMatterFormData },
      hearing: { show: setShowHearingForm, editing: setEditingHearing, data: setHearingFormData },
      task: { show: setShowTaskForm, editing: setEditingTask, data: setTaskFormData },
      timesheet: { show: setShowTimesheetForm, editing: setEditingTimesheet, data: setTimesheetFormData },
      judgment: { show: setShowJudgmentForm, editing: setEditingJudgment },
      appointment: { show: setShowAppointmentForm, editing: setEditingAppointment },
      expense: { show: setShowExpenseForm, editing: setEditingExpense },
      advance: { show: setShowAdvanceForm, editing: setEditingAdvance },
      invoice: { show: setShowInvoiceForm, editing: setEditingInvoice },
      deadline: { show: setShowDeadlineForm, editing: setEditingDeadline, data: setDeadlineFormData },
      entity: { show: setShowEntityForm, editing: setEditingEntity },
      lookup: { show: setShowLookupForm, editing: setEditingLookup },
      party: { show: setShowPartyForm }
    };

    const setter = setters[formType];
    if (setter) {
      setter.show(true);
      if (setter.editing) setter.editing(editingData);
      if (setter.data && formData !== undefined) setter.data(formData);
    }
  }, []);

  const closeForm = useCallback((formType) => {
    const setters = {
      client: { show: setShowClientForm, editing: setEditingClient, data: setClientFormData },
      matter: { show: setShowMatterForm, editing: setEditingMatter, data: setMatterFormData },
      hearing: { show: setShowHearingForm, editing: setEditingHearing, data: setHearingFormData },
      task: { show: setShowTaskForm, editing: setEditingTask, data: setTaskFormData },
      timesheet: { show: setShowTimesheetForm, editing: setEditingTimesheet, data: setTimesheetFormData },
      judgment: { show: setShowJudgmentForm, editing: setEditingJudgment },
      appointment: { show: setShowAppointmentForm, editing: setEditingAppointment },
      expense: { show: setShowExpenseForm, editing: setEditingExpense },
      advance: { show: setShowAdvanceForm, editing: setEditingAdvance },
      invoice: { show: setShowInvoiceForm, editing: setEditingInvoice },
      deadline: { show: setShowDeadlineForm, editing: setEditingDeadline, data: setDeadlineFormData },
      entity: { show: setShowEntityForm, editing: setEditingEntity },
      lookup: { show: setShowLookupForm, editing: setEditingLookup },
      party: { show: setShowPartyForm }
    };

    const setter = setters[formType];
    if (setter) {
      setter.show(false);
      if (setter.editing) setter.editing(null);
      if (setter.data) setter.data(null);
    }

    // Reset form-specific state
    if (formType === 'entity') setEntityFormTab('details');
    if (formType === 'lookup') setCurrentLookupType('courtTypes');
  }, []);

  const openModal = useCallback((modalType, data = null) => {
    const modals = {
      company360: setShowCompany360Report,
      complianceCalendar: setShowComplianceCalendar,
      shareholderRegistry: setShowShareholderRegistry,
      directorRegistry: setShowDirectorRegistry,
      widgetSettings: setShowWidgetSettings
    };

    if (modals[modalType]) {
      modals[modalType](true);
    }
  }, []);

  const closeModal = useCallback((modalType) => {
    const modals = {
      company360: setShowCompany360Report,
      complianceCalendar: setShowComplianceCalendar,
      shareholderRegistry: setShowShareholderRegistry,
      directorRegistry: setShowDirectorRegistry,
      widgetSettings: setShowWidgetSettings
    };

    if (modals[modalType]) {
      modals[modalType](false);
    }
  }, []);

  const value = {
    // Unsaved changes (Phase 3 - Session 13)
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingNavigation,
    setPendingNavigation,
    markFormDirty,
    clearFormDirty,

    // Forms - grouped by type
    forms: {
      client: { isOpen: showClientForm, editing: editingClient, formData: clientFormData, setFormData: setClientFormData },
      matter: { isOpen: showMatterForm, editing: editingMatter, formData: matterFormData, setFormData: setMatterFormData },
      hearing: { isOpen: showHearingForm, editing: editingHearing, formData: hearingFormData, setFormData: setHearingFormData },
      task: { isOpen: showTaskForm, editing: editingTask, formData: taskFormData, setFormData: setTaskFormData },
      timesheet: { isOpen: showTimesheetForm, editing: editingTimesheet, formData: timesheetFormData, setFormData: setTimesheetFormData },
      judgment: { isOpen: showJudgmentForm, editing: editingJudgment },
      appointment: { isOpen: showAppointmentForm, editing: editingAppointment },
      expense: { isOpen: showExpenseForm, editing: editingExpense },
      advance: { isOpen: showAdvanceForm, editing: editingAdvance },
      invoice: { isOpen: showInvoiceForm, editing: editingInvoice },
      deadline: { isOpen: showDeadlineForm, editing: editingDeadline, formData: deadlineFormData, setFormData: setDeadlineFormData },
      entity: { isOpen: showEntityForm, editing: editingEntity, tab: entityFormTab, setTab: setEntityFormTab },
      lookup: { isOpen: showLookupForm, editing: editingLookup, currentType: currentLookupType, setCurrentType: setCurrentLookupType },
      party: { isOpen: showPartyForm }
    },

    // Modals - grouped by type
    modals: {
      company360: { isOpen: showCompany360Report },
      complianceCalendar: { isOpen: showComplianceCalendar },
      shareholderRegistry: { isOpen: showShareholderRegistry },
      directorRegistry: { isOpen: showDirectorRegistry },
      widgetSettings: { isOpen: showWidgetSettings }
    },

    // Simple toggle modals
    modalToggles,
    toggleModal,

    // Helper functions
    openForm,
    closeForm,
    openModal,
    closeModal,

    // Legacy setters (for gradual migration)
    setShowClientForm,
    setShowMatterForm,
    setShowHearingForm,
    setShowTaskForm,
    setShowTimesheetForm,
    setShowJudgmentForm,
    setShowAppointmentForm,
    setShowExpenseForm,
    setShowAdvanceForm,
    setShowInvoiceForm,
    setShowDeadlineForm,
    setShowEntityForm,
    setShowPartyForm,
    setShowLookupForm,
    setEditingClient,
    setEditingMatter,
    setEditingHearing,
    setEditingTask,
    setEditingTimesheet,
    setEditingJudgment,
    setEditingAppointment,
    setEditingExpense,
    setEditingAdvance,
    setEditingInvoice,
    setEditingEntity,
    setEditingDeadline,
    setEditingLookup,
    setShowCompany360Report,
    setShowComplianceCalendar,
    setShowShareholderRegistry,
    setShowDirectorRegistry,
    setShowWidgetSettings
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
