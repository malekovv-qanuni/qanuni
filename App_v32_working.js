import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Users, Briefcase, Clock, Calendar, CalendarDays, FileText, BarChart3, 
  Menu, X, Globe, Search, AlertTriangle, CheckCircle, ChevronRight, AlertCircle,
  Phone, Mail, Building, User, Gavel, ClipboardList, Settings, Trash2, Edit3, Scale,
  DollarSign, Receipt, Wallet, CreditCard, PieChart, Download, Upload, Loader2,
  Play, Pause, Square, Timer, Minimize2, Maximize2, Save
} from 'lucide-react';

// ============================================
// TOAST NOTIFICATION COMPONENT
// ============================================
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : AlertCircle;

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[100]`}
      style={{ animation: 'slideUp 0.3s ease-out' }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <Icon className="w-5 h-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================
// CONFIRMATION DIALOG COMPONENT
// ============================================
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel', danger = true }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-50">
            {cancelText}
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// LOADING BUTTON COMPONENT
// ============================================
const LoadingButton = ({ loading, children, className, ...props }) => (
  <button {...props} disabled={loading || props.disabled} 
    className={`${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center gap-2`}>
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

// ============================================
// EMPTY STATE COMPONENT WITH ILLUSTRATIONS
// ============================================
const EmptyState = ({ type, title, description, actionLabel, onAction }) => {
  // SVG illustrations for different types
  const illustrations = {
    clients: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="35" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M20 85 C20 65 35 55 50 55 C65 55 80 65 80 85" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="75" cy="30" r="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M69 30 L81 30 M75 24 L75 36" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    matters: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="50" height="65" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="35" y="15" width="50" height="65" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="45" y1="30" x2="75" y2="30" stroke="currentColor" strokeWidth="2"/>
        <line x1="45" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="45" y1="50" x2="65" y2="50" stroke="currentColor" strokeWidth="2"/>
        <circle cx="78" cy="70" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M72 70 L84 70 M78 64 L78 76" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    hearings: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="55" width="60" height="8" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="35" r="18" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="45" y="65" width="10" height="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M30 35 L40 45 L60 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    ),
    tasks: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="15" width="60" height="70" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="30" y="30" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="36" x2="70" y2="36" stroke="currentColor" strokeWidth="2"/>
        <rect x="30" y="50" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="56" x2="65" y2="56" stroke="currentColor" strokeWidth="2"/>
        <rect x="30" y="70" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M33 76 L39 82 M39 76 L33 82" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      </svg>
    ),
    timesheets: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="50" r="3" fill="currentColor"/>
        <line x1="50" y1="50" x2="50" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="68" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="18" x2="50" y2="22" stroke="currentColor" strokeWidth="2"/>
        <line x1="50" y1="78" x2="50" y2="82" stroke="currentColor" strokeWidth="2"/>
        <line x1="18" y1="50" x2="22" y2="50" stroke="currentColor" strokeWidth="2"/>
        <line x1="78" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    invoices: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="60" height="80" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="30" y1="25" x2="70" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="60" x2="50" y2="60" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="75" x2="70" y2="75" stroke="currentColor" strokeWidth="2"/>
        <text x="60" y="78" fontSize="12" fill="currentColor" fontWeight="bold">$</text>
      </svg>
    ),
    expenses: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="30" width="70" height="45" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="15" y="30" width="70" height="15" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="58" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="46" y="63" fontSize="14" fill="currentColor" fontWeight="bold">$</text>
      </svg>
    ),
    appointments: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="70" height="65" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="15" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="15" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="70" y1="15" x2="70" y2="25" stroke="currentColor" strokeWidth="2"/>
        <rect x="25" y="45" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="45" y="45" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/>
        <rect x="25" y="65" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    judgments: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 15 L50 40" stroke="currentColor" strokeWidth="2"/>
        <path d="M30 40 L70 40" stroke="currentColor" strokeWidth="3"/>
        <path d="M20 45 L40 45 L35 65 L25 65 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M60 45 L80 45 L75 65 L65 65 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="42" y="70" width="16" height="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="35" y="88" width="30" height="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    ),
    advances: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="25" width="60" height="50" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="44" y="56" fontSize="18" fill="currentColor" fontWeight="bold">$</text>
        <path d="M50 20 L50 10 L60 17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    default: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="60" height="60" rx="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="35" x2="50" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="50" cy="65" r="3" fill="currentColor"/>
      </svg>
    )
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {illustrations[type] || illustrations.default}
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// ============================================
// FORM FIELD WITH INLINE VALIDATION
// ============================================
const FormField = ({ 
  label, 
  required, 
  error, 
  children, 
  hint,
  className = '' 
}) => (
  <div className={className}>
    <label className="block text-sm font-medium mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="mt-1 text-sm text-gray-500">{hint}</p>
    )}
  </div>
);

// ============================================
// VALIDATION UTILITIES
// ============================================
const validators = {
  required: (value, message) => (!value || (typeof value === 'string' && !value.trim())) ? message : null,
  email: (value, message) => {
    if (!value) return null; // Not required check, just format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? message : null;
  },
  phone: (value, message) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
    return !phoneRegex.test(value) ? message : null;
  },
  minLength: (value, min, message) => {
    if (!value) return null;
    return value.length < min ? message.replace('{min}', min) : null;
  },
  maxLength: (value, max, message) => {
    if (!value) return null;
    return value.length > max ? message.replace('{max}', max) : null;
  }
};

// Hook for form validation
const useFormValidation = (initialValues, validationRules, translations, language) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      let error = null;
      if (rule.type === 'required') {
        error = validators.required(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'email') {
        error = validators.email(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'phone') {
        error = validators.phone(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'minLength') {
        error = validators.minLength(value, rule.min, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'maxLength') {
        error = validators.maxLength(value, rule.max, translations[language][rule.message] || rule.message);
      }
      if (error) return error;
    }
    return null;
  }, [validationRules, translations, language]);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error on change if field was touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  }, [values, validationRules, validateField]);

  const resetForm = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    setValues
  };
};

// ============================================
// PRINT STYLES COMPONENT
// ============================================
const PrintStyles = () => (
  <style>{`
    @media print {
      /* Hide non-printable elements */
      .no-print, 
      button, 
      nav, 
      .sidebar,
      [class*="fixed inset-0 bg-black"] {
        display: none !important;
      }
      
      /* Reset modal for print */
      .print-invoice {
        position: static !important;
        background: white !important;
        box-shadow: none !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 0 !important;
      }
      
      .print-invoice > div {
        max-width: 100% !important;
        max-height: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      
      /* Invoice styling for print */
      .invoice-header {
        border-bottom: 2px solid #333 !important;
        padding-bottom: 1rem !important;
        margin-bottom: 1rem !important;
      }
      
      .invoice-table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      
      .invoice-table th,
      .invoice-table td {
        border: 1px solid #ddd !important;
        padding: 8px !important;
      }
      
      .invoice-table th {
        background-color: #f5f5f5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Page settings */
      @page {
        margin: 1cm;
        size: A4;
      }
      
      body {
        font-size: 12pt !important;
        line-height: 1.4 !important;
      }
      
      /* Ensure proper page breaks */
      .page-break-before {
        page-break-before: always;
      }
      
      .avoid-break {
        page-break-inside: avoid;
      }
    }
  `}</style>
);

// ============================================
// MAIN APP COMPONENT
// ============================================
const App = () => {
  const [language, setLanguage] = useState('en');
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  }, []);
  const hideConfirm = useCallback(() => setConfirmDialog({ isOpen: false }), []);
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Track form dirty state
  const markFormDirty = useCallback(() => setHasUnsavedChanges(true), []);
  const clearFormDirty = useCallback(() => setHasUnsavedChanges(false), []);
  
  // Handle navigation with unsaved changes warning
  const handleModuleChange = useCallback((newModule) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(newModule);
      showConfirm(
        language === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved Changes',
        language === 'ar' ? 'لديك تغييرات غير محفوظة. هل تريد المتابعة بدون حفظ؟' : 'You have unsaved changes. Do you want to continue without saving?',
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
  }, [hasUnsavedChanges, language, showConfirm, hideConfirm]);
  
  // Data state
  const [clients, setClients] = useState([]);
  const [matters, setMatters] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  
  // Lookup data
  const [courtTypes, setCourtTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [hearingPurposes, setHearingPurposes] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  
  // Calendar state
  const [calendarView, setCalendarView] = useState('weekly');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Form visibility
  const [showClientForm, setShowClientForm] = useState(false);
  const [showMatterForm, setShowMatterForm] = useState(false);
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showConflictResults, setShowConflictResults] = useState(false);
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [showJudgmentForm, setShowJudgmentForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  
  // Editing state
  const [editingClient, setEditingClient] = useState(null);
  const [editingMatter, setEditingMatter] = useState(null);
  const [editingHearing, setEditingHearing] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [editingJudgment, setEditingJudgment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [conflictResults, setConflictResults] = useState([]);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingLookup, setEditingLookup] = useState(null);
  const [currentLookupType, setCurrentLookupType] = useState('courtTypes');
  
  // Phase 2: Search and filter state
  const [clientSearch, setClientSearch] = useState('');
  const [matterSearch, setMatterSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  
  // Phase 2.5: Dashboard widget configuration
  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    const saved = localStorage.getItem('qanuni_dashboard_widgets');
    return saved ? JSON.parse(saved) : {
      order: ['stats', 'todaySchedule', 'upcomingDeadlines', 'tasksDue', 'upcomingHearings', 'pendingJudgments'],
      visible: {
        stats: true,
        todaySchedule: true,
        upcomingDeadlines: true,
        tasksDue: true,
        upcomingHearings: true,
        pendingJudgments: true
      }
    };
  });
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);

  // ============================================
  // TIME TRACKING TIMER STATE
  // ============================================
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerClientId, setTimerClientId] = useState('');
  const [timerMatterId, setTimerMatterId] = useState('');
  const [timerNarrative, setTimerNarrative] = useState('');
  const [timerLawyerId, setTimerLawyerId] = useState('');
  const timerIntervalRef = useRef(null);
  
  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('qanuni_timer');
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        setTimerClientId(parsed.clientId || '');
        setTimerMatterId(parsed.matterId || '');
        setTimerNarrative(parsed.narrative || '');
        setTimerLawyerId(parsed.lawyerId || '');
        
        // If timer was running, calculate elapsed time since startTime
        if (parsed.running && parsed.startTime) {
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000) + (parsed.pausedSeconds || 0);
          setTimerSeconds(elapsed);
          setTimerRunning(true);
          setTimerExpanded(true);
        } else {
          setTimerSeconds(parsed.pausedSeconds || 0);
        }
      } catch (e) {
        console.error('Error loading timer state:', e);
      }
    }
  }, []);
  
  // Save timer state to localStorage
  const saveTimerState = useCallback((running, seconds, startTime = null) => {
    const timerState = {
      clientId: timerClientId,
      matterId: timerMatterId,
      narrative: timerNarrative,
      lawyerId: timerLawyerId,
      running,
      startTime: running ? (startTime || Date.now()) : null,
      pausedSeconds: running ? 0 : seconds
    };
    localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
  }, [timerClientId, timerMatterId, timerNarrative, timerLawyerId]);
  
  // Timer interval effect
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning]);

  const isRTL = language === 'ar';

  // ============================================
  // TRANSLATIONS
  // ============================================
  const t = {
    en: {
      appName: 'Qanuni', dashboard: 'Dashboard', clients: 'Clients', contacts: 'Contacts',
      matters: 'Matters', hearings: 'Hearings', tasks: 'Tasks', timesheets: 'Timesheets',
      calendar: 'Calendar', reports: 'Reports', settings: 'Settings',
      addClient: 'Add Client', addContact: 'Add Contact', addMatter: 'Add Matter',
      addHearing: 'Add Hearing', addTask: 'Add Task', addTimesheet: 'Add Timesheet',
      addParty: 'Add Party', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
      view: 'View', close: 'Close', search: 'Search', filter: 'Filter',
      loading: 'Loading...', noData: 'No data available',
      // Client fields
      clientName: 'Client Name', clientNameArabic: 'Client Name (Arabic)', clientType: 'Client Type',
      individual: 'Individual', legalEntity: 'Legal Entity', clientID: 'Client ID',
      customID: 'Custom ID', registrationNumber: 'Registration Number', vatNumber: 'VAT Number',
      mainContact: 'Main Contact', email: 'Email', phone: 'Phone', mobile: 'Mobile',
      address: 'Address', website: 'Website', industry: 'Industry',
      billingTerms: 'Billing Terms', retainer: 'Retainer', fixedFee: 'Fixed Fee',
      successFee: 'Success Fee', hourly: 'Hourly', custom: 'Custom', customType: 'Custom Type',
      currency: 'Currency', source: 'Source', notes: 'Notes',
      // Contact fields
      contactType: 'Contact Type', clientContact: 'Client Contact', opposingCounsel: 'Opposing Counsel',
      judge: 'Judge', expert: 'Expert', courtClerk: 'Court Clerk', other: 'Other',
      title: 'Title', organization: 'Organization', name: 'Name',
      // Matter fields
      matterName: 'Matter Name', matterType: 'Matter Type', litigation: 'Litigation',
      arbitration: 'Arbitration', advisory: 'Advisory', transactional: 'Transactional',
      status: 'Status', active: 'Active', pending: 'Pending', closed: 'Closed',
      onHold: 'On Hold', consultation: 'Consultation', engaged: 'Engaged', archived: 'Archived',
      caseNumber: 'Case Number', courtType: 'Court Type', region: 'Region',
      judgeName: 'Judge Name', responsibleLawyer: 'Responsible Lawyer', openingDate: 'Opening Date',
      parties: 'Parties', selectClient: 'Select Client',
      // Party fields
      partyName: 'Party Name', partyRole: 'Party Role', partyType: 'Party Type',
      partyPosition: 'Party Position', plaintiff: 'Plaintiff', defendant: 'Defendant',
      petitioner: 'Petitioner', respondent: 'Respondent', appellant: 'Appellant',
      claimant: 'Claimant', witness: 'Witness', thirdParty: 'Third Party',
      ourClient: 'Our Client', opposing: 'Opposing', neutral: 'Neutral',
      // Hearing fields
      hearingDate: 'Hearing Date', hearingTime: 'Time', purpose: 'Purpose',
      outcome: 'Outcome', adjourned: 'Adjourned', takenForJudgment: 'Taken for Judgment',
      settled: 'Settled', dismissed: 'Dismissed', completed: 'Completed',
      nextHearing: 'Next Hearing', attendedBy: 'Attended By',
      // Task fields
      taskNumber: 'Task Number', taskType: 'Task Type', taskTitle: 'Title',
      description: 'Description', instructions: 'Instructions', dueDate: 'Due Date',
      priority: 'Priority', high: 'High', medium: 'Medium', low: 'Low',
      assigned: 'Assigned', inProgress: 'In Progress', review: 'Review', done: 'Done',
      assignedTo: 'Assigned To', assignedBy: 'Assigned By',
      // Timesheet fields
      lawyer: 'Lawyer', client: 'Client', matter: 'Matter', date: 'Date',
      minutes: 'Minutes', hours: 'Hours', narrative: 'Narrative',
      billable: 'Billable', nonBillable: 'Non-Billable', ratePerHour: 'Rate/Hour', amount: 'Amount',
      // Dashboard
      totalClients: 'Total Clients', activeMatters: 'Active Matters',
      pendingTasks: 'Pending Tasks', upcomingHearings: 'Upcoming Hearings',
      thisMonth: 'This Month Revenue', todaySchedule: "Today's Schedule",
      overdue: 'Overdue', dueToday: 'Due Today', thisWeek: 'This Week',
      // Conflict Check
      conflictCheck: 'Conflict Check', potentialConflict: 'Potential Conflict Detected',
      noConflicts: 'No conflicts found', proceedAnyway: 'Proceed Anyway',
      runConflictCheck: 'Run Conflict Check', conflictWarning: 'Review potential conflicts before proceeding',
      // Additional UI
      select: 'Select', selectMatter: 'Select Matter', selectClientFirst: 'Select client first',
      customRegion: 'Custom Region', customPurpose: 'Custom Purpose', endTime: 'End Time',
      outcomeNotes: 'Outcome Notes',
      // Settings
      settings: 'Settings', lookups: 'Lookups', courtTypes: 'Court Types', regions: 'Regions',
      hearingPurposes: 'Hearing Purposes', taskTypes: 'Task Types', expenseCategories: 'Expense Categories',
      lawyers: 'Lawyers', addNew: 'Add New', nameEn: 'Name (English)', nameAr: 'Name (Arabic)',
      initials: 'Initials', hourlyRate: 'Hourly Rate', isActive: 'Active', icon: 'Icon',
      systemDefault: 'System Default', userDefined: 'User Defined', confirmDelete: 'Are you sure you want to delete this item?',
      cannotDeleteSystem: 'Cannot delete system default items', addLawyer: 'Add Lawyer', addCourtType: 'Add Court Type',
      addRegion: 'Add Region', addPurpose: 'Add Purpose', addTaskType: 'Add Task Type', addCategory: 'Add Category',
      // Calendar
      today: 'Today', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
      previousWeek: 'Previous', nextWeek: 'Next', noEvents: 'No events',
      // Judgments
      judgments: 'Judgments', addJudgment: 'Add Judgment', judgmentType: 'Judgment Type',
      firstInstance: 'First Instance', appeal: 'Appeal', cassation: 'Cassation', arbitralAward: 'Arbitral Award',
      expectedDate: 'Expected Date', actualDate: 'Actual Date', reminderDays: 'Reminder Days',
      judgmentOutcome: 'Outcome', won: 'Won', lost: 'Lost', partialWin: 'Partial Win',
      inFavorOf: 'In Favor Of', ourClient: 'Our Client', opposing: 'Opposing', partial: 'Partial',
      appealPossible: 'Appeal Possible', appealDeadline: 'Appeal Deadline', appealed: 'Appealed',
      judgmentSummary: 'Summary', amountAwarded: 'Amount Awarded', judgmentStatus: 'Status',
      issued: 'Issued', final: 'Final',
      // Appointments
      appointments: 'Appointments', addAppointment: 'Add Appointment', appointmentType: 'Type',
      clientMeeting: 'Client Meeting', internalMeeting: 'Internal Meeting', call: 'Call',
      courtVisit: 'Court Visit', consultation: 'Consultation', personal: 'Personal',
      startTime: 'Start Time', locationType: 'Location Type', office: 'Office',
      external: 'External', virtual: 'Virtual', court: 'Court', locationDetails: 'Location Details',
      virtualLink: 'Virtual Link', attendees: 'Attendees', allDay: 'All Day',
      // Expenses
      expenses: 'Expenses', addExpense: 'Add Expense', expenseType: 'Expense Type',
      clientExpense: 'Client Expense', firmExpense: 'Firm Expense', category: 'Category',
      receipt: 'Receipt', markup: 'Markup %', deductFromAdvance: 'Deduct from Advance',
      approved: 'Approved', rejected: 'Rejected', reimbursed: 'Reimbursed', billed: 'Billed',
      // Advances
      advances: 'Advances', addAdvance: 'Add Advance', advanceType: 'Advance Type',
      clientRetainer: 'Client Retainer', clientExpenseAdvance: 'Client Expense Advance',
      lawyerAdvance: 'Lawyer Advance', dateReceived: 'Date Received', paymentMethod: 'Payment Method',
      referenceNumber: 'Reference Number', balanceRemaining: 'Balance Remaining',
      minimumBalanceAlert: 'Minimum Balance Alert', depleted: 'Depleted', refunded: 'Refunded',
      bankTransfer: 'Bank Transfer', check: 'Check', cash: 'Cash', creditCard: 'Credit Card',
      // Invoices
      invoices: 'Invoices', addInvoice: 'Add Invoice', createInvoice: 'Create Invoice',
      invoiceNumber: 'Invoice Number', periodStart: 'Period Start', periodEnd: 'Period End',
      issueDate: 'Issue Date', dueDate: 'Due Date', subtotal: 'Subtotal',
      discount: 'Discount', discountType: 'Discount Type', percentage: 'Percentage', fixed: 'Fixed',
      taxableAmount: 'Taxable Amount', vatRate: 'VAT Rate', vatAmount: 'VAT Amount',
      total: 'Total', invoiceStatus: 'Status', draft: 'Draft', sent: 'Sent', viewed: 'Viewed',
      partialPaid: 'Partial', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled', writtenOff: 'Written Off',
      unbilledTime: 'Unbilled Time', unbilledExpenses: 'Unbilled Expenses', fixedFeeItem: 'Fixed Fee Item',
      generateInvoice: 'Generate Invoice', selectItems: 'Select Items', invoicePreview: 'Invoice Preview',
      markAsSent: 'Mark as Sent', markAsPaid: 'Mark as Paid', paymentTerms: 'Payment Terms',
      notesToClient: 'Notes to Client', internalNotes: 'Internal Notes',
      // v12 - New translations
      paidBy: 'Paid By', firmDirect: 'Firm (Direct)', balanceWarning: 'Balance will go negative',
      negative: 'negative', selectLawyer: 'Select Lawyer', lawyerName: 'Lawyer',
      viewInvoice: 'View', professionalFees: 'Professional Fees', lessRetainer: 'Less: Retainer Applied',
      netFees: 'Net Professional Fees', disbursements: 'Disbursements/Expenses',
      availableBalance: 'Available Balance', applyRetainer: 'Apply Retainer', amountToApply: 'Amount to Apply',
      applyMax: 'Apply Max', retainerAppliedToFeesOnly: 'Note: Retainer is applied to professional fees only, not expenses',
      billingPeriod: 'Billing Period', fixedFee: 'Fixed Fee',
      // Phase 2 - New translations
      searchClients: 'Search clients...', searchMatters: 'Search matters...',
      allStatuses: 'All Statuses', allPriorities: 'All Priorities',
      nextHearingDate: 'Next Hearing Date', nextHearingPurpose: 'Next Hearing Purpose',
      createFollowupTask: 'Create Follow-up Task', taskTitle: 'Task Title',
      adjournedWorkflow: 'Adjourned - Schedule Next Hearing',
      showingOf: 'Showing', of: 'of',
      pendingJudgmentsWidget: 'Pending Judgments', outstandingBalance: 'Outstanding Balance',
      // Phase 3 - Hearing/Judgment Workflow (Simplified)
      notFinal: 'Not Final',
      notFinalWorkflow: 'Not Final - Schedule Next Hearing',
      fromHearing: 'From Hearing',
      // v14 - Export and Backup translations
      backupRestore: 'Backup & Restore', backup: 'Backup Database', restore: 'Restore Database',
      createBackup: 'Create Backup', restoreBackup: 'Restore from Backup',
      exportAll: 'Export All Data', exportToExcel: 'Export to Excel',
      // Phase 2 v19 - Empty States & Validation
      emptyClients: 'No clients yet', emptyClientsDesc: 'Add your first client to get started with managing your practice.',
      emptyMatters: 'No matters yet', emptyMattersDesc: 'Create a matter to start tracking cases and legal work.',
      emptyHearings: 'No hearings scheduled', emptyHearingsDesc: 'Schedule hearings to track court appearances.',
      emptyTasks: 'No tasks yet', emptyTasksDesc: 'Create tasks to manage your work and deadlines.',
      emptyTimesheets: 'No time entries', emptyTimesheetsDesc: 'Log time to track billable hours.',
      emptyInvoices: 'No invoices yet', emptyInvoicesDesc: 'Create invoices to bill your clients.',
      emptyExpenses: 'No expenses recorded', emptyExpensesDesc: 'Record expenses to track costs and disbursements.',
      emptyAppointments: 'No appointments', emptyAppointmentsDesc: 'Schedule appointments to manage your calendar.',
      emptyJudgments: 'No pending judgments', emptyJudgmentsDesc: 'Judgments will appear here when cases are taken for judgment.',
      emptyAdvances: 'No advances received', emptyAdvancesDesc: 'Record client retainers and advances here.',
      // Validation messages
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email address',
      invalidPhone: 'Please enter a valid phone number',
      invalidDate: 'Please enter a valid date',
      minLength: 'Must be at least {min} characters',
      maxLength: 'Must be no more than {max} characters',
      selectRequired: 'Please select an option',
      // Print
      print: 'Print', printInvoice: 'Print Invoice',
      // Dashboard widgets
      customizeDashboard: 'Customize Dashboard', showWidget: 'Show', hideWidget: 'Hide',
      dragToReorder: 'Drag to reorder', statsWidget: 'Statistics Cards',
      todayScheduleWidget: 'Today\'s Schedule', tasksDueWidget: 'Tasks Due',
      upcomingHearingsWidget: 'Upcoming Hearings', pendingJudgmentsWidgetLabel: 'Pending Judgments',
      resetLayout: 'Reset Layout', closeSettings: 'Close',
      // Time Tracking Timer
      timer: 'Timer', startTimer: 'Start', stopTimer: 'Stop', pauseTimer: 'Pause',
      resumeTimer: 'Resume', saveTime: 'Save Time', discardTimer: 'Discard',
      timerRunning: 'Timer Running', noMatterSelected: 'No matter selected',
      confirmDiscardTimer: 'Are you sure you want to discard this time entry?',
      timerSaved: 'Time entry saved successfully', selectMatterForTimer: 'Select a matter to track time',
      logTime: 'Log Time', quickTimer: 'Quick Timer', timerPaused: 'Paused',
      workDescription: 'Work description...',
      // Deadlines
      deadlines: 'Deadlines', addDeadline: 'Add Deadline', deadlineTitle: 'Deadline Title',
      deadlineDate: 'Deadline Date', reminderDays: 'Reminder (days before)',
      deadlineStatus: 'Status', deadlinePending: 'Pending', deadlineCompleted: 'Completed',
      deadlineMissed: 'Missed', markComplete: 'Mark Complete', markPending: 'Mark Pending',
      overdueDeadlines: 'Overdue', upcomingDeadlines: 'Upcoming Deadlines',
      daysRemaining: 'days remaining', daysOverdue: 'days overdue', dueToday: 'Due Today',
      emptyDeadlines: 'No deadlines', emptyDeadlinesDesc: 'Add deadlines to track important dates and never miss a filing.',
      deadlineSaved: 'Deadline saved successfully', deadlineDeleted: 'Deadline deleted',
      createReminderTask: 'Create reminder task', linkedToMatter: 'Linked to Matter',
      allDeadlines: 'All', deadlineNotes: 'Notes',
      // Deadline-Judgment Integration (v24)
      linkedToJudgment: 'Linked to Judgment', createAppealDeadline: 'Create Appeal Deadline',
      appealDeadlineCreated: 'Appeal deadline created automatically', addDeadlineToJudgment: 'Add Deadline',
      judgmentDeadlines: 'Judgment Deadlines', noLinkedDeadlines: 'No linked deadlines',
      selectClientForDeadline: 'Select client first', selectMatterForDeadline: 'Select matter first'
    },
    ar: {
      appName: 'قانوني', dashboard: 'لوحة التحكم', clients: 'العملاء', contacts: 'جهات الاتصال',
      matters: 'القضايا', hearings: 'الجلسات', tasks: 'المهام', timesheets: 'سجل الوقت',
      calendar: 'التقويم', reports: 'التقارير', settings: 'الإعدادات',
      addClient: 'إضافة عميل', addContact: 'إضافة جهة اتصال', addMatter: 'إضافة قضية',
      addHearing: 'إضافة جلسة', addTask: 'إضافة مهمة', addTimesheet: 'إضافة سجل وقت',
      addParty: 'إضافة طرف', save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف',
      view: 'عرض', close: 'إغلاق', search: 'بحث', filter: 'تصفية',
      loading: 'جاري التحميل...', noData: 'لا توجد بيانات',
      clientName: 'اسم العميل', clientNameArabic: 'اسم العميل (عربي)', clientType: 'نوع العميل',
      individual: 'فرد', legalEntity: 'كيان قانوني', clientID: 'رقم العميل',
      customID: 'رقم مخصص', registrationNumber: 'رقم السجل التجاري', vatNumber: 'الرقم الضريبي',
      mainContact: 'جهة الاتصال الرئيسية', email: 'البريد الإلكتروني', phone: 'الهاتف', mobile: 'الجوال',
      address: 'العنوان', website: 'الموقع الإلكتروني', industry: 'القطاع',
      billingTerms: 'شروط الفوترة', retainer: 'أتعاب محجوزة', fixedFee: 'رسوم ثابتة',
      successFee: 'أتعاب نجاح', hourly: 'بالساعة', custom: 'مخصص', customType: 'نوع مخصص',
      currency: 'العملة', source: 'المصدر', notes: 'ملاحظات',
      matterName: 'اسم القضية', matterType: 'نوع القضية', litigation: 'تقاضي',
      arbitration: 'تحكيم', advisory: 'استشارة', transactional: 'معاملات',
      status: 'الحالة', active: 'نشط', pending: 'معلق', closed: 'مغلق',
      onHold: 'موقوف', consultation: 'استشارة', engaged: 'متعاقد', archived: 'مؤرشف',
      caseNumber: 'رقم القضية', courtType: 'نوع المحكمة', region: 'المنطقة',
      judgeName: 'اسم القاضي', responsibleLawyer: 'المحامي المسؤول', openingDate: 'تاريخ الفتح',
      parties: 'الأطراف', selectClient: 'اختر العميل',
      partyName: 'اسم الطرف', partyRole: 'دور الطرف', partyType: 'نوع الطرف',
      partyPosition: 'موقف الطرف', plaintiff: 'مدعي', defendant: 'مدعى عليه',
      petitioner: 'مقدم الطلب', respondent: 'المستجيب', appellant: 'مستأنف',
      claimant: 'مطالب', witness: 'شاهد', thirdParty: 'طرف ثالث',
      ourClient: 'موكلنا', opposing: 'الخصم', neutral: 'محايد',
      totalClients: 'إجمالي العملاء', activeMatters: 'القضايا النشطة',
      pendingTasks: 'المهام المعلقة', upcomingHearings: 'الجلسات القادمة',
      noConflicts: 'لم يتم العثور على تعارضات', potentialConflict: 'تم اكتشاف تعارض محتمل',
      conflictCheck: 'فحص التعارض', conflictWarning: 'راجع التعارضات المحتملة قبل المتابعة',
      runConflictCheck: 'إجراء فحص التعارض', proceedAnyway: 'المتابعة على أي حال',
      select: 'اختر', selectMatter: 'اختر القضية', selectClientFirst: 'اختر العميل أولاً',
      customRegion: 'منطقة مخصصة', customPurpose: 'غرض مخصص',
      endTime: 'وقت الانتهاء', outcomeNotes: 'ملاحظات النتيجة',
      hearingDate: 'تاريخ الجلسة', hearingTime: 'الوقت', purpose: 'الغرض', judge: 'القاضي',
      outcome: 'النتيجة',
      adjourned: 'مؤجلة', takenForJudgment: 'للحكم', settled: 'تسوية', dismissed: 'مرفوض', completed: 'مكتملة',
      other: 'أخرى', client: 'العميل', matter: 'القضية',
      taskTitle: 'عنوان المهمة', taskType: 'نوع المهمة', description: 'الوصف',
      instructions: 'التعليمات', dueDate: 'تاريخ الاستحقاق', assignedTo: 'مسند إلى',
      priority: 'الأولوية', high: 'عالية', medium: 'متوسطة', low: 'منخفضة',
      assigned: 'مسندة', inProgress: 'قيد التنفيذ', review: 'مراجعة', done: 'منجزة',
      assignedBy: 'مسندة من',
      lawyer: 'المحامي', date: 'التاريخ', minutes: 'الدقائق', hours: 'الساعات',
      narrative: 'الوصف', billable: 'قابل للفوترة', nonBillable: 'غير قابل للفوترة',
      ratePerHour: 'السعر/ساعة', amount: 'المبلغ',
      thisMonth: 'إيرادات هذا الشهر', todaySchedule: 'جدول اليوم',
      overdue: 'متأخر', dueToday: 'مستحق اليوم', thisWeek: 'هذا الأسبوع',
      lookups: 'القوائم', courtTypes: 'أنواع المحاكم', regions: 'المناطق',
      hearingPurposes: 'أغراض الجلسات', taskTypes: 'أنواع المهام', expenseCategories: 'فئات المصروفات',
      lawyers: 'المحامون', addNew: 'إضافة جديد', nameEn: 'الاسم (إنجليزي)', nameAr: 'الاسم (عربي)',
      initials: 'الأحرف الأولى', hourlyRate: 'السعر بالساعة', isActive: 'نشط', icon: 'الرمز',
      systemDefault: 'افتراضي النظام', userDefined: 'معرف المستخدم', confirmDelete: 'هل أنت متأكد من حذف هذا العنصر؟',
      cannotDeleteSystem: 'لا يمكن حذف العناصر الافتراضية', addLawyer: 'إضافة محامي', addCourtType: 'إضافة نوع محكمة',
      addRegion: 'إضافة منطقة', addPurpose: 'إضافة غرض', addTaskType: 'إضافة نوع مهمة', addCategory: 'إضافة فئة',
      today: 'اليوم', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
      previousWeek: 'السابق', nextWeek: 'التالي', noEvents: 'لا توجد أحداث',
      judgments: 'الأحكام', addJudgment: 'إضافة حكم', judgmentType: 'نوع الحكم',
      firstInstance: 'ابتدائي', appeal: 'استئناف', cassation: 'تمييز', arbitralAward: 'قرار تحكيمي',
      expectedDate: 'التاريخ المتوقع', actualDate: 'التاريخ الفعلي', reminderDays: 'أيام التذكير',
      judgmentOutcome: 'النتيجة', won: 'ربح', lost: 'خسارة', partialWin: 'ربح جزئي',
      inFavorOf: 'لصالح', partial: 'جزئي',
      appealPossible: 'إمكانية الاستئناف', appealDeadline: 'موعد الاستئناف', appealed: 'تم الاستئناف',
      judgmentSummary: 'الملخص', amountAwarded: 'المبلغ المحكوم', judgmentStatus: 'الحالة',
      issued: 'صادر', final: 'نهائي',
      appointments: 'المواعيد', addAppointment: 'إضافة موعد', appointmentType: 'النوع',
      clientMeeting: 'اجتماع عميل', internalMeeting: 'اجتماع داخلي', call: 'مكالمة',
      courtVisit: 'زيارة محكمة', personal: 'شخصي',
      startTime: 'وقت البدء', locationType: 'نوع الموقع', office: 'المكتب',
      external: 'خارجي', virtual: 'افتراضي', court: 'المحكمة', locationDetails: 'تفاصيل الموقع',
      virtualLink: 'رابط افتراضي', attendees: 'الحضور', allDay: 'طوال اليوم',
      expenses: 'المصروفات', addExpense: 'إضافة مصروف', expenseType: 'نوع المصروف',
      clientExpense: 'مصروف عميل', firmExpense: 'مصروف مكتب', category: 'الفئة',
      receipt: 'الإيصال', markup: 'نسبة الزيادة', deductFromAdvance: 'خصم من السلفة',
      approved: 'موافق عليه', rejected: 'مرفوض', reimbursed: 'مسترد', billed: 'مفوتر',
      advances: 'السلف', addAdvance: 'إضافة سلفة', advanceType: 'نوع السلفة',
      clientRetainer: 'أتعاب محجوزة', clientExpenseAdvance: 'سلفة مصاريف عميل',
      lawyerAdvance: 'سلفة محامي', dateReceived: 'تاريخ الاستلام', paymentMethod: 'طريقة الدفع',
      referenceNumber: 'رقم المرجع', balanceRemaining: 'الرصيد المتبقي',
      minimumBalanceAlert: 'تنبيه الحد الأدنى', depleted: 'مستنفد', refunded: 'مسترد',
      bankTransfer: 'تحويل بنكي', check: 'شيك', cash: 'نقداً', creditCard: 'بطاقة ائتمان',
      invoices: 'الفواتير', addInvoice: 'إضافة فاتورة', createInvoice: 'إنشاء فاتورة',
      invoiceNumber: 'رقم الفاتورة', periodStart: 'بداية الفترة', periodEnd: 'نهاية الفترة',
      issueDate: 'تاريخ الإصدار', dueDate: 'تاريخ الاستحقاق', subtotal: 'المجموع الفرعي',
      discount: 'الخصم', discountType: 'نوع الخصم', percentage: 'نسبة مئوية', fixed: 'ثابت',
      taxableAmount: 'المبلغ الخاضع للضريبة', vatRate: 'نسبة الضريبة', vatAmount: 'مبلغ الضريبة',
      total: 'المجموع', invoiceStatus: 'الحالة', draft: 'مسودة', sent: 'مرسلة', viewed: 'مشاهدة',
      partialPaid: 'مدفوعة جزئياً', paid: 'مدفوعة', cancelled: 'ملغاة', writtenOff: 'شطب',
      unbilledTime: 'وقت غير مفوتر', unbilledExpenses: 'مصاريف غير مفوترة', fixedFeeItem: 'بند رسوم ثابتة',
      generateInvoice: 'إنشاء فاتورة', selectItems: 'اختر البنود', invoicePreview: 'معاينة الفاتورة',
      markAsSent: 'تحديد كمرسلة', markAsPaid: 'تحديد كمدفوعة', paymentTerms: 'شروط الدفع',
      notesToClient: 'ملاحظات للعميل', internalNotes: 'ملاحظات داخلية',
      paidBy: 'دفع بواسطة', firmDirect: 'المكتب (مباشر)', balanceWarning: 'الرصيد سيصبح سالب',
      negative: 'سالب', selectLawyer: 'اختر المحامي', lawyerName: 'المحامي',
      viewInvoice: 'عرض', professionalFees: 'الأتعاب المهنية', lessRetainer: 'ناقص: السلفة المستخدمة',
      netFees: 'صافي الأتعاب', disbursements: 'المصاريف والنفقات',
      availableBalance: 'الرصيد المتاح', applyRetainer: 'تطبيق السلفة', amountToApply: 'المبلغ المطبق',
      applyMax: 'تطبيق الحد الأقصى', retainerAppliedToFeesOnly: 'ملاحظة: تُطبق السلفة على الأتعاب المهنية فقط',
      billingPeriod: 'فترة الفوترة',
      searchClients: 'البحث في العملاء...', searchMatters: 'البحث في القضايا...',
      allStatuses: 'جميع الحالات', allPriorities: 'جميع الأولويات',
      nextHearingDate: 'تاريخ الجلسة التالية', nextHearingPurpose: 'غرض الجلسة التالية',
      createFollowupTask: 'إنشاء مهمة متابعة',
      adjournedWorkflow: 'مؤجلة - جدولة الجلسة التالية',
      showingOf: 'عرض', of: 'من',
      pendingJudgmentsWidget: 'الأحكام المعلقة', outstandingBalance: 'الرصيد المستحق',
      notFinal: 'غير نهائي',
      notFinalWorkflow: 'غير نهائي - جدولة الجلسة التالية',
      fromHearing: 'من الجلسة',
      backupRestore: 'النسخ الاحتياطي', backup: 'نسخ احتياطي', restore: 'استعادة',
      createBackup: 'إنشاء نسخة', restoreBackup: 'استعادة من نسخة',
      exportAll: 'تصدير الكل', exportToExcel: 'تصدير Excel',
      totalInvoices: 'إجمالي الفواتير', outstandingAmount: 'المبلغ المستحق',
      pendingJudgments: 'الأحكام المعلقة', overdueTasks: 'المهام المتأخرة',
      tasksDue: 'المهام المستحقة', noHearingsToday: 'لا توجد جلسات اليوم', noTasksDue: 'لا توجد مهام مستحقة',
      time: 'الوقت', firmInfo: 'معلومات المكتب', title: 'العنوان', name: 'الاسم',
      vat: 'الضريبة', nextHearing: 'الجلسة التالية', attendedBy: 'حضرها',
      emptyClients: 'لا يوجد عملاء', emptyClientsDesc: 'أضف أول عميل للبدء في إدارة مكتبك.',
      emptyMatters: 'لا توجد قضايا', emptyMattersDesc: 'أنشئ قضية لبدء تتبع الأعمال القانونية.',
      emptyHearings: 'لا توجد جلسات مجدولة', emptyHearingsDesc: 'جدول جلسات لتتبع المواعيد القضائية.',
      emptyTasks: 'لا توجد مهام', emptyTasksDesc: 'أنشئ مهام لإدارة عملك والمواعيد النهائية.',
      emptyTimesheets: 'لا توجد سجلات وقت', emptyTimesheetsDesc: 'سجل الوقت لتتبع الساعات القابلة للفوترة.',
      emptyInvoices: 'لا توجد فواتير', emptyInvoicesDesc: 'أنشئ فواتير لفوترة عملائك.',
      emptyExpenses: 'لا توجد مصروفات', emptyExpensesDesc: 'سجل المصروفات لتتبع التكاليف.',
      emptyAppointments: 'لا توجد مواعيد', emptyAppointmentsDesc: 'جدول مواعيد لإدارة التقويم.',
      emptyJudgments: 'لا توجد أحكام معلقة', emptyJudgmentsDesc: 'ستظهر الأحكام هنا عند حجز القضايا للحكم.',
      emptyAdvances: 'لا توجد سلف مستلمة', emptyAdvancesDesc: 'سجل سلف العملاء والأتعاب المحجوزة هنا.',
      required: 'هذا الحقل مطلوب',
      invalidEmail: 'الرجاء إدخال بريد إلكتروني صحيح',
      invalidPhone: 'الرجاء إدخال رقم هاتف صحيح',
      invalidDate: 'الرجاء إدخال تاريخ صحيح',
      selectRequired: 'الرجاء اختيار خيار',
      print: 'طباعة', printInvoice: 'طباعة الفاتورة',
      // Dashboard widgets
      customizeDashboard: 'تخصيص لوحة التحكم', showWidget: 'إظهار', hideWidget: 'إخفاء',
      dragToReorder: 'اسحب لإعادة الترتيب', statsWidget: 'بطاقات الإحصائيات',
      todayScheduleWidget: 'جدول اليوم', tasksDueWidget: 'المهام المستحقة',
      upcomingHearingsWidget: 'الجلسات القادمة', pendingJudgmentsWidgetLabel: 'الأحكام المعلقة',
      resetLayout: 'إعادة تعيين', closeSettings: 'إغلاق',
      // Time Tracking Timer
      timer: 'مؤقت', startTimer: 'بدء', stopTimer: 'إيقاف', pauseTimer: 'إيقاف مؤقت',
      resumeTimer: 'استئناف', saveTime: 'حفظ الوقت', discardTimer: 'تجاهل',
      timerRunning: 'المؤقت يعمل', noMatterSelected: 'لم يتم اختيار قضية',
      confirmDiscardTimer: 'هل أنت متأكد من تجاهل سجل الوقت هذا؟',
      timerSaved: 'تم حفظ سجل الوقت بنجاح', selectMatterForTimer: 'اختر قضية لتتبع الوقت',
      logTime: 'تسجيل الوقت', quickTimer: 'مؤقت سريع', timerPaused: 'متوقف',
      workDescription: 'وصف العمل...',
      // Deadlines
      deadlines: 'المواعيد النهائية', addDeadline: 'إضافة موعد نهائي', deadlineTitle: 'عنوان الموعد',
      deadlineDate: 'تاريخ الموعد النهائي', reminderDays: 'تذكير (أيام قبل)',
      deadlineStatus: 'الحالة', deadlinePending: 'معلق', deadlineCompleted: 'مكتمل',
      deadlineMissed: 'فائت', markComplete: 'تحديد كمكتمل', markPending: 'تحديد كمعلق',
      overdueDeadlines: 'متأخرة', upcomingDeadlines: 'المواعيد القادمة',
      daysRemaining: 'أيام متبقية', daysOverdue: 'أيام متأخرة', dueToday: 'مستحق اليوم',
      emptyDeadlines: 'لا توجد مواعيد نهائية', emptyDeadlinesDesc: 'أضف مواعيد نهائية لتتبع التواريخ المهمة.',
      deadlineSaved: 'تم حفظ الموعد النهائي بنجاح', deadlineDeleted: 'تم حذف الموعد النهائي',
      createReminderTask: 'إنشاء مهمة تذكير', linkedToMatter: 'مرتبط بالقضية',
      allDeadlines: 'الكل', deadlineNotes: 'ملاحظات',
      // Deadline-Judgment Integration (v24)
      linkedToJudgment: 'مرتبط بالحكم', createAppealDeadline: 'إنشاء موعد استئناف',
      appealDeadlineCreated: 'تم إنشاء موعد الاستئناف تلقائياً', addDeadlineToJudgment: 'إضافة موعد',
      judgmentDeadlines: 'مواعيد الحكم', noLinkedDeadlines: 'لا توجد مواعيد مرتبطة',
      selectClientForDeadline: 'اختر العميل أولاً', selectMatterForDeadline: 'اختر القضية أولاً'
    }
  };

  // ============================================
  // DATA LOADING
  // ============================================
  useEffect(() => {
    loadAllData();
  }, []);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close any open form
      if (e.key === 'Escape') {
        if (showClientForm) { setShowClientForm(false); setEditingClient(null); }
        else if (showMatterForm) { setShowMatterForm(false); setEditingMatter(null); }
        else if (showHearingForm) { setShowHearingForm(false); setEditingHearing(null); }
        else if (showTaskForm) { setShowTaskForm(false); setEditingTask(null); }
        else if (showTimesheetForm) { setShowTimesheetForm(false); setEditingTimesheet(null); }
        else if (showJudgmentForm) { setShowJudgmentForm(false); setEditingJudgment(null); }
        else if (showAppointmentForm) { setShowAppointmentForm(false); setEditingAppointment(null); }
        else if (showExpenseForm) { setShowExpenseForm(false); setEditingExpense(null); }
        else if (showAdvanceForm) { setShowAdvanceForm(false); setEditingAdvance(null); }
        else if (showInvoiceForm) setShowInvoiceForm(false);
        else if (showDeadlineForm) { setShowDeadlineForm(false); setEditingDeadline(null); }
        else if (viewingInvoice) setViewingInvoice(null);
        else if (showLookupForm) { setShowLookupForm(false); setEditingLookup(null); }
        else if (confirmDialog.isOpen) hideConfirm();
      }
      
      // Ctrl+N or Cmd+N to open new form for current module
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (currentModule === 'clients') setShowClientForm(true);
        else if (currentModule === 'matters') setShowMatterForm(true);
        else if (currentModule === 'hearings') setShowHearingForm(true);
        else if (currentModule === 'tasks') setShowTaskForm(true);
        else if (currentModule === 'timesheets') setShowTimesheetForm(true);
        else if (currentModule === 'judgments') setShowJudgmentForm(true);
        else if (currentModule === 'appointments') setShowAppointmentForm(true);
        else if (currentModule === 'expenses') setShowExpenseForm(true);
        else if (currentModule === 'advances') setShowAdvanceForm(true);
        else if (currentModule === 'invoices') setShowInvoiceForm(true);
        else if (currentModule === 'deadlines') setShowDeadlineForm(true);
      }
      
      // Ctrl+T or Cmd+T to toggle timer
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setTimerExpanded(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClientForm, showMatterForm, showHearingForm, showTaskForm, showTimesheetForm, 
      showJudgmentForm, showAppointmentForm, showExpenseForm, showAdvanceForm, showInvoiceForm,
      showDeadlineForm, viewingInvoice, showLookupForm, confirmDialog.isOpen, currentModule, hideConfirm, timerExpanded]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        clientsData, mattersData, hearingsData, judgmentsData, tasksData, 
        timesheetsData, appointmentsData, expensesData, advancesData, invoicesData,
        courtTypesData, regionsData, purposesData, taskTypesData,
        expenseCategoriesData, lawyersData, statsData
      ] = await Promise.all([
        window.electronAPI.getAllClients(),
        window.electronAPI.getAllMatters(),
        window.electronAPI.getAllHearings(),
        window.electronAPI.getAllJudgments(),
        window.electronAPI.getAllTasks(),
        window.electronAPI.getAllTimesheets(),
        window.electronAPI.getAllAppointments(),
        window.electronAPI.getAllExpenses(),
        window.electronAPI.getAllAdvances(),
        window.electronAPI.getAllInvoices(),
        window.electronAPI.getCourtTypes(),
        window.electronAPI.getRegions(),
        window.electronAPI.getHearingPurposes(),
        window.electronAPI.getTaskTypes(),
        window.electronAPI.getExpenseCategories(),
        window.electronAPI.getLawyers(),
        window.electronAPI.getDashboardStats()
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
      setLawyers(lawyersData);
      setDashboardStats(statsData);
      
      // Load deadlines separately (graceful if API not yet available)
      try {
        const deadlinesData = await window.electronAPI.getAllDeadlines();
        setDeadlines(deadlinesData || []);
      } catch (e) {
        console.log('Deadlines API not available yet');
        setDeadlines([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TARGETED REFRESH FUNCTIONS
  // ============================================
  const refreshClients = async () => {
    try {
      const [clientsData, statsData] = await Promise.all([
        window.electronAPI.getAllClients(),
        window.electronAPI.getDashboardStats()
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
        window.electronAPI.getAllMatters(),
        window.electronAPI.getDashboardStats()
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
        window.electronAPI.getAllHearings(),
        window.electronAPI.getDashboardStats()
      ]);
      setHearings(hearingsData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing hearings:', error);
    }
  };

  const refreshJudgments = async () => {
    try {
      const judgmentsData = await window.electronAPI.getAllJudgments();
      setJudgments(judgmentsData);
    } catch (error) {
      console.error('Error refreshing judgments:', error);
    }
  };

  const refreshTasks = async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        window.electronAPI.getAllTasks(),
        window.electronAPI.getDashboardStats()
      ]);
      setTasks(tasksData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  const refreshTimesheets = async () => {
    try {
      const timesheetsData = await window.electronAPI.getAllTimesheets();
      setTimesheets(timesheetsData.map(ts => ({ ...ts, billable: ts.billable === 1 })));
    } catch (error) {
      console.error('Error refreshing timesheets:', error);
    }
  };

  const refreshAppointments = async () => {
    try {
      const appointmentsData = await window.electronAPI.getAllAppointments();
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  const refreshExpenses = async () => {
    try {
      const expensesData = await window.electronAPI.getAllExpenses();
      setExpenses(expensesData.map(e => ({ ...e, billable: e.billable === 1 })));
    } catch (error) {
      console.error('Error refreshing expenses:', error);
    }
  };

  const refreshAdvances = async () => {
    try {
      const advancesData = await window.electronAPI.getAllAdvances();
      setAdvances(advancesData);
    } catch (error) {
      console.error('Error refreshing advances:', error);
    }
  };

  const refreshInvoices = async () => {
    try {
      const [invoicesData, statsData, advancesData] = await Promise.all([
        window.electronAPI.getAllInvoices(),
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getAllAdvances()
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
      const deadlinesData = await window.electronAPI.getAllDeadlines();
      setDeadlines(deadlinesData || []);
    } catch (error) {
      console.error('Error refreshing deadlines:', error);
    }
  };

  const refreshLookups = async () => {
    try {
      const [courtTypesData, regionsData, purposesData, taskTypesData, expenseCategoriesData, lawyersData] = await Promise.all([
        window.electronAPI.getCourtTypes(),
        window.electronAPI.getRegions(),
        window.electronAPI.getHearingPurposes(),
        window.electronAPI.getTaskTypes(),
        window.electronAPI.getExpenseCategories(),
        window.electronAPI.getLawyers()
      ]);
      setCourtTypes(courtTypesData);
      setRegions(regionsData);
      setHearingPurposes(purposesData);
      setTaskTypes(taskTypesData);
      setExpenseCategories(expenseCategoriesData);
      setLawyers(lawyersData);
    } catch (error) {
      console.error('Error refreshing lookups:', error);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const generateID = (prefix) => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${year}-${random}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  // ============================================
  // CONFLICT CHECK
  // ============================================
  const runConflictCheck = async (searchTerms) => {
    try {
      const results = await window.electronAPI.conflictCheck(searchTerms);
      setConflictResults(results);
      if (results.length > 0) {
        setShowConflictResults(true);
      }
      return results;
    } catch (error) {
      console.error('Error running conflict check:', error);
      return [];
    }
  };

  // ============================================
  // CLIENT FORM COMPONENT
  // ============================================
  const ClientForm = () => {
    const [formData, setFormData] = useState(editingClient || {
      client_name: '', client_name_arabic: '', client_type: 'individual',
      custom_id: '', registration_number: '', vat_number: '',
      main_contact: '', email: '', phone: '', mobile: '',
      address: '', website: '', industry: '',
      default_currency: 'USD', billing_terms: 'hourly', source: '', notes: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [conflictChecked, setConflictChecked] = useState(!!editingClient);
    const [conflicts, setConflicts] = useState([]);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);

    // Validation rules
    const validateField = (name, value) => {
      switch (name) {
        case 'client_name':
          if (!value || !value.trim()) return t[language].required;
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t[language].invalidEmail;
          break;
        case 'phone':
          if (value && !/^[\d\s\+\-\(\)]{7,}$/.test(value)) return t[language].invalidPhone;
          break;
        case 'mobile':
          if (value && !/^[\d\s\+\-\(\)]{7,}$/.test(value)) return t[language].invalidPhone;
          break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (name === 'client_name') setConflictChecked(false);
      // Clear error if field was touched
      if (touched[name]) {
        setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
      }
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      const fieldsToValidate = ['client_name', 'email', 'phone', 'mobile'];
      fieldsToValidate.forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
      return Object.keys(newErrors).length === 0;
    };

    const handleConflictCheck = async () => {
      if (!validateAll()) return;
      
      setChecking(true);
      try {
        const results = await window.electronAPI.conflictCheck({
          name: formData.client_name,
          registration_number: formData.registration_number,
          vat_number: formData.vat_number,
          email: formData.email,
          phone: formData.phone || formData.mobile
        });
        setConflicts(results || []);
        setConflictChecked(true);
      } catch (error) {
        console.error('Conflict check error:', error);
        setConflicts([]);
        setConflictChecked(true);
      }
      setChecking(false);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Validate all fields first
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      
      // Must run conflict check first for new clients
      if (!conflictChecked && !editingClient) {
        await handleConflictCheck();
        return;
      }
      
      setSaving(true);
      
      try {
        if (!window.electronAPI) {
          alert('Error: App must run in Electron, not browser. Close browser and use the Electron window.');
          setSaving(false);
          return;
        }

        const clientData = {
          ...formData,
          client_id: editingClient?.client_id || generateID('CLT')
        };

        let result;
        if (editingClient) {
          result = await window.electronAPI.updateClient(clientData);
        } else {
          result = await window.electronAPI.addClient(clientData);
          if (window.electronAPI.logConflictCheck) {
            await window.electronAPI.logConflictCheck({
              check_type: 'new_client',
              search_terms: { name: formData.client_name },
              results_found: conflicts,
              decision: 'proceeded',
              entity_type: 'client',
              entity_id: clientData.client_id
            });
          }
        }
        
        if (result && result.success === false) {
          showToast(language === 'ar' ? 'خطأ في حفظ العميل' : 'Error saving client: ' + (result.error || 'Unknown error'), 'error');
          setSaving(false);
          return;
        }
        
        clearFormDirty();
        await refreshClients();
        showToast(editingClient 
          ? (language === 'ar' ? 'تم تحديث العميل بنجاح' : 'Client updated successfully')
          : (language === 'ar' ? 'تم إضافة العميل بنجاح' : 'Client added successfully'));
        setShowClientForm(false);
        setEditingClient(null);
      } catch (error) {
        console.error('Error saving client:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ العميل' : 'Error saving client: ' + error.message, 'error');
      }
      setSaving(false);
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingClient ? t[language].edit : t[language].addClient}</h2>
              <button onClick={() => { setShowClientForm(false); setEditingClient(null); clearFormDirty(); }}
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Check Results */}
            {conflictChecked && conflicts.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t[language].potentialConflict}
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {conflicts.map((c, i) => (
                    <li key={i}>• {c.name} ({c.type}{c.matchedField ? ` - ${c.matchedField}` : ''})</li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-600 mt-2">{t[language].conflictWarning}</p>
              </div>
            )}

            {conflictChecked && conflicts.length === 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  {t[language].noConflicts}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t[language].clientName} required error={errors.client_name}>
                  <input type="text" value={formData.client_name}
                    onChange={(e) => handleFieldChange('client_name', e.target.value)}
                    onBlur={() => handleBlur('client_name')}
                    className={inputClass(errors.client_name)} />
                </FormField>
                
                <FormField label={t[language].clientNameArabic}>
                  <input type="text" value={formData.client_name_arabic} dir="rtl"
                    onChange={(e) => handleFieldChange('client_name_arabic', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].clientType}>
                  <select value={formData.client_type}
                    onChange={(e) => handleFieldChange('client_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="individual">{t[language].individual}</option>
                    <option value="legal_entity">{t[language].legalEntity}</option>
                  </select>
                </FormField>
                
                <FormField label={t[language].customID}>
                  <input type="text" value={formData.custom_id}
                    onChange={(e) => handleFieldChange('custom_id', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].registrationNumber}>
                  <input type="text" value={formData.registration_number}
                    onChange={(e) => handleFieldChange('registration_number', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].vatNumber}>
                  <input type="text" value={formData.vat_number}
                    onChange={(e) => handleFieldChange('vat_number', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].mainContact}>
                  <input type="text" value={formData.main_contact}
                    onChange={(e) => handleFieldChange('main_contact', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].email} error={errors.email}>
                  <input type="email" value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={inputClass(errors.email)} />
                </FormField>
                
                <FormField label={t[language].phone} error={errors.phone}>
                  <input type="tel" value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={inputClass(errors.phone)} />
                </FormField>
                
                <FormField label={t[language].mobile} error={errors.mobile}>
                  <input type="tel" value={formData.mobile}
                    onChange={(e) => handleFieldChange('mobile', e.target.value)}
                    onBlur={() => handleBlur('mobile')}
                    className={inputClass(errors.mobile)} />
                </FormField>
                
                <FormField label={t[language].billingTerms}>
                  <select value={formData.billing_terms}
                    onChange={(e) => handleFieldChange('billing_terms', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="hourly">{t[language].hourly}</option>
                    <option value="retainer">{t[language].retainer}</option>
                    <option value="fixed">{t[language].fixedFee}</option>
                    <option value="success">{t[language].successFee}</option>
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </FormField>
                
                <FormField label={t[language].currency}>
                  <select value={formData.default_currency}
                    onChange={(e) => handleFieldChange('default_currency', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="LBP">LBP</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                  </select>
                </FormField>
                
                <FormField label={t[language].website}>
                  <input type="url" value={formData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
                
                <FormField label={t[language].industry}>
                  <input type="text" value={formData.industry}
                    onChange={(e) => handleFieldChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
              </div>
              
              <FormField label={t[language].address}>
                <textarea value={formData.address} rows="2"
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              <FormField label={t[language].notes}>
                <textarea value={formData.notes} rows="3"
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowClientForm(false); setEditingClient(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">
                  {t[language].cancel}
                </button>
                {!editingClient && !conflictChecked && (
                  <button type="button" onClick={handleConflictCheck} disabled={checking}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center gap-2 disabled:bg-yellow-400">
                    {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {checking ? 'Checking...' : t[language].runConflictCheck}
                  </button>
                )}
                {(editingClient || conflictChecked) && (
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t[language].save}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CONTACT FORM COMPONENT
  // ============================================
  // ============================================
  // MATTER FORM COMPONENT
  // ============================================
  const MatterForm = () => {
    const [formData, setFormData] = useState(editingMatter || {
      client_id: '', matter_name: '', matter_name_arabic: '', matter_type: 'litigation',
      custom_matter_type: '', status: 'active', custom_matter_number: '', case_number: '',
      court_type_id: '', court_type_custom: '', court_region_id: '', region_custom: '', judge_name: '',
      responsible_lawyer_id: '', opening_date: new Date().toISOString().split('T')[0], notes: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = (name, value) => {
      switch (name) {
        case 'client_id':
          if (!value) return t[language].selectRequired;
          break;
        case 'matter_name':
          if (!value || !value.trim()) return t[language].required;
          break;
        case 'custom_matter_type':
          if (formData.matter_type === 'custom' && (!value || !value.trim())) return t[language].required;
          break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      const fieldsToValidate = ['client_id', 'matter_name'];
      if (formData.matter_type === 'custom') fieldsToValidate.push('custom_matter_type');
      fieldsToValidate.forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      try {
        const matterData = {
          ...formData,
          matter_id: formData.matter_id || generateID('MTR'),
          court_type_id: formData.court_type_id === 'custom' ? null : (formData.court_type_id || null),
          court_region_id: formData.court_region_id === 'custom' ? null : (formData.court_region_id || null),
          responsible_lawyer_id: formData.responsible_lawyer_id || null
        };

        if (editingMatter) {
          await window.electronAPI.updateMatter(matterData);
        } else {
          await window.electronAPI.addMatter(matterData);
        }
        clearFormDirty();
        await refreshMatters();
        showToast(editingMatter 
          ? (language === 'ar' ? 'تم تحديث القضية بنجاح' : 'Matter updated successfully')
          : (language === 'ar' ? 'تم إضافة القضية بنجاح' : 'Matter added successfully'));
        setShowMatterForm(false);
        setEditingMatter(null);
      } catch (error) {
        console.error('Error saving matter:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ القضية' : 'Error saving matter', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingMatter ? t[language].edit : t[language].addMatter}</h2>
              <button onClick={() => { setShowMatterForm(false); setEditingMatter(null); clearFormDirty(); }}
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label={t[language].selectClient} required error={errors.client_id}>
                <select value={formData.client_id}
                  onChange={(e) => handleFieldChange('client_id', e.target.value)}
                  onBlur={() => handleBlur('client_id')}
                  className={inputClass(errors.client_id)}>
                  <option value="">{t[language].selectClient}</option>
                  {clients.map(client => (
                    <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t[language].matterName} required error={errors.matter_name}>
                  <input type="text" value={formData.matter_name}
                    onChange={(e) => handleFieldChange('matter_name', e.target.value)}
                    onBlur={() => handleBlur('matter_name')}
                    className={inputClass(errors.matter_name)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matterType}</label>
                  <select value={formData.matter_type?.startsWith('custom:') ? 'custom' : formData.matter_type}
                    onChange={(e) => { handleFieldChange('matter_type', e.target.value); setFormData(prev => ({...prev, custom_matter_type: ''})); }}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="litigation">{t[language].litigation}</option>
                    <option value="arbitration">{t[language].arbitration}</option>
                    <option value="advisory">{t[language].advisory}</option>
                    <option value="transactional">{t[language].transactional}</option>
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {(formData.matter_type === 'custom' || formData.matter_type?.startsWith('custom:')) && (
                  <FormField label={t[language].customType} required error={errors.custom_matter_type}>
                    <input type="text"
                      value={formData.custom_matter_type || formData.matter_type?.replace('custom:', '') || ''}
                      onChange={(e) => { handleFieldChange('custom_matter_type', e.target.value); setFormData(prev => ({...prev, matter_type: 'custom:' + e.target.value})); }}
                      onBlur={() => handleBlur('custom_matter_type')}
                      placeholder={language === 'ar' ? 'أدخل نوع القضية...' : 'Enter matter type...'}
                      className={inputClass(errors.custom_matter_type)} />
                  </FormField>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].status}</label>
                  <select value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="consultation">{t[language].consultation}</option>
                    <option value="engaged">{t[language].engaged}</option>
                    <option value="active">{t[language].active}</option>
                    <option value="on_hold">{t[language].onHold}</option>
                    <option value="closed">{t[language].closed}</option>
                    <option value="archived">{t[language].archived}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].caseNumber}</label>
                  <input type="text" value={formData.case_number}
                    onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                {/* Court Type with Custom Option */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].courtType}</label>
                  <select value={formData.court_type_id}
                    onChange={(e) => setFormData({...formData, court_type_id: e.target.value, court_type_custom: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {courtTypes.map(ct => (
                      <option key={ct.court_type_id} value={ct.court_type_id}>
                        {language === 'ar' ? ct.name_ar : ct.name_en}
                      </option>
                    ))}
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {formData.court_type_id === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customType} *</label>
                    <input type="text" required value={formData.court_type_custom}
                      placeholder={language === 'ar' ? 'أدخل نوع المحكمة...' : 'Enter court type...'}
                      placeholder={language === 'ar' ? 'أدخل نوع المحكمة...' : 'Enter court type...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                {/* Region with Custom Option */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].region}</label>
                  <select value={formData.court_region_id}
                    onChange={(e) => setFormData({...formData, court_region_id: e.target.value, region_custom: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {regions.map(r => (
                      <option key={r.region_id} value={r.region_id}>
                        {language === 'ar' ? r.name_ar : r.name_en}
                      </option>
                    ))}
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {formData.court_region_id === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customRegion} *</label>
                    <input type="text" required value={formData.region_custom}
                      placeholder={language === 'ar' ? 'أدخل المنطقة...' : 'Enter region...'}
                      placeholder={language === 'ar' ? 'أدخل المنطقة...' : 'Enter region...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].judgeName}</label>
                  <input type="text" value={formData.judge_name}
                    onChange={(e) => setFormData({...formData, judge_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].responsibleLawyer}</label>
                  <select value={formData.responsible_lawyer_id || ''}
                    onChange={(e) => setFormData({...formData, responsible_lawyer_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                        {language === 'ar' && lawyer.full_name_arabic ? lawyer.full_name_arabic : lawyer.full_name}
                        {lawyer.initials ? ` (${lawyer.initials})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].openingDate}</label>
                  <input type="date" value={formData.opening_date}
                    onChange={(e) => setFormData({...formData, opening_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].notes}</label>
                <textarea value={formData.notes} rows="3"
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowMatterForm(false); setEditingMatter(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // HEARING FORM COMPONENT
  // ============================================
  const HearingForm = () => {
    const defaultFormData = {
      client_id: selectedMatter ? matters.find(m => m.matter_id === selectedMatter.matter_id)?.client_id : '',
      matter_id: selectedMatter?.matter_id || '', hearing_date: '', hearing_time: '',
      end_time: '', court_type_id: '', court_type_custom: '', court_region_id: '', region_custom: '', 
      judge: '', purpose_id: '', purpose_custom: '', outcome: '', outcome_notes: '', notes: '',
      // Judgment fields (when outcome is taken_for_judgment)
      expected_judgment_date: '', reminder_days: '7', create_pronouncement_hearing: true,
      // Judgment Pronouncement fields (when purpose is Judgment Pronouncement)
      judgment_date: '', // Future date when judgment will be pronounced
      linked_judgment_id: '', judgment_outcome: '', judgment_amount: '', judgment_in_favor: '',
      // Adjourned workflow fields (when outcome is adjourned)
      next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '', 
      create_followup_task: false, followup_task_title: '', followup_task_due_date: ''
    };
    const [formData, setFormData] = useState(editingHearing ? {...defaultFormData, ...editingHearing} : defaultFormData);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Filter matters by selected client
    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    // Check if "Other" purpose is selected
    const isOtherPurpose = formData.purpose_id && 
      hearingPurposes.find(p => p.purpose_id == formData.purpose_id)?.name_en === 'Other';

    // Check if "Judgment Pronouncement" purpose is selected
    const isJudgmentPronouncement = formData.purpose_id && 
      hearingPurposes.find(p => p.purpose_id == formData.purpose_id)?.name_en === 'Judgment Pronouncement';

    // Get pending judgments for this matter
    const pendingJudgments = formData.matter_id 
      ? judgments.filter(j => j.matter_id === formData.matter_id && j.status === 'pending')
      : [];

    const validateField = (name, value) => {
      switch (name) {
        case 'client_id': if (!value) return t[language].selectRequired; break;
        case 'matter_id': if (!value) return t[language].selectRequired; break;
        case 'hearing_date': if (!value) return t[language].required; break;
        case 'hearing_time': if (!value) return t[language].required; break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      ['client_id', 'matter_id', 'hearing_date', 'hearing_time'].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched({ client_id: true, matter_id: true, hearing_date: true, hearing_time: true });
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      try {
        const hearingData = {
          ...formData,
          court_type_id: formData.court_type_id === 'custom' ? null : formData.court_type_id,
          court_region_id: formData.court_region_id === 'custom' ? null : formData.court_region_id,
        };
        
        let hearingId;
        if (editingHearing) {
          await window.electronAPI.updateHearing(hearingData);
          hearingId = editingHearing.hearing_id;
        } else {
          const result = await window.electronAPI.addHearing(hearingData);
          hearingId = result.hearing_id;
        }
        
        // TRIGGER: When purpose is "Judgment Pronouncement" - auto create pending judgment
        // Works for both add and edit (in case user changes purpose to Judgment Pronouncement)
        if (isJudgmentPronouncement && formData.judgment_date) {
          // Check if judgment already exists for this hearing
          const existingJudgment = judgments.find(j => j.hearing_id == hearingId);
          if (!existingJudgment) {
            // Create pending judgment linked to this hearing
            await window.electronAPI.addJudgment({
              matter_id: formData.matter_id,
              hearing_id: hearingId,
              judgment_type: 'first_instance',
              expected_date: formData.judgment_date,
              status: 'pending'
            });
          }
        }
        
        clearFormDirty();
        await Promise.all([refreshHearings(), refreshJudgments()]);
        showToast(editingHearing 
          ? (language === 'ar' ? 'تم تحديث الجلسة بنجاح' : 'Hearing updated successfully')
          : (language === 'ar' ? 'تم إضافة الجلسة بنجاح' : 'Hearing added successfully'));
        setShowHearingForm(false);
        setEditingHearing(null);
      } catch (error) {
        console.error('Error saving hearing:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ الجلسة' : 'Error saving hearing', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingHearing ? t[language].edit : t[language].addHearing}</h2>
              <button onClick={() => { setShowHearingForm(false); setEditingHearing(null); clearFormDirty(); }}
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection First */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t[language].client} required error={errors.client_id}>
                  <select value={formData.client_id}
                    onChange={(e) => { handleFieldChange('client_id', e.target.value); setFormData(prev => ({...prev, matter_id: ''})); }}
                    onBlur={() => handleBlur('client_id')}
                    className={inputClass(errors.client_id)}>
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t[language].matter} required error={errors.matter_id}>
                  <select value={formData.matter_id}
                    onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                    onBlur={() => handleBlur('matter_id')}
                    disabled={!formData.client_id}
                    className={`${inputClass(errors.matter_id)} disabled:bg-gray-100`}>
                    <option value="">{formData.client_id ? t[language].selectMatter : t[language].selectClientFirst}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label={t[language].hearingDate} required error={errors.hearing_date}>
                  <input type="date" value={formData.hearing_date}
                    onChange={(e) => handleFieldChange('hearing_date', e.target.value)}
                    onBlur={() => handleBlur('hearing_date')}
                    className={inputClass(errors.hearing_date)} />
                </FormField>
                <FormField label={t[language].hearingTime} required error={errors.hearing_time}>
                  <input type="time" value={formData.hearing_time}
                    onChange={(e) => handleFieldChange('hearing_time', e.target.value)}
                    onBlur={() => handleBlur('hearing_time')}
                    className={inputClass(errors.hearing_time)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].endTime}</label>
                  <input type="time" value={formData.end_time}
                    onChange={(e) => handleFieldChange('end_time', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Court Type with Custom Option */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].courtType}</label>
                  <select value={formData.court_type_id}
                    onChange={(e) => handleFieldChange('court_type_id', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {courtTypes.map(ct => (
                      <option key={ct.court_type_id} value={ct.court_type_id}>
                        {language === 'ar' ? ct.name_ar : ct.name_en}
                      </option>
                    ))}
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {formData.court_type_id === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customType} *</label>
                    <input type="text" required value={formData.court_type_custom}
                      placeholder={language === 'ar' ? 'أدخل نوع المحكمة...' : 'Enter court type...'}
                      placeholder={language === 'ar' ? 'أدخل نوع المحكمة...' : 'Enter court type...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}

                {/* Region with Custom Option */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].region}</label>
                  <select value={formData.court_region_id}
                    onChange={(e) => setFormData({...formData, court_region_id: e.target.value, region_custom: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {regions.map(r => (
                      <option key={r.region_id} value={r.region_id}>
                        {language === 'ar' ? r.name_ar : r.name_en}
                      </option>
                    ))}
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {formData.court_region_id === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customRegion} *</label>
                    <input type="text" required value={formData.region_custom}
                      placeholder={language === 'ar' ? 'أدخل المنطقة...' : 'Enter region...'}
                      placeholder={language === 'ar' ? 'أدخل المنطقة...' : 'Enter region...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}

                {/* Purpose with Custom Option */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].purpose}</label>
                  <select value={formData.purpose_id}
                    onChange={(e) => setFormData({...formData, purpose_id: e.target.value, purpose_custom: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {hearingPurposes.map(p => (
                      <option key={p.purpose_id} value={p.purpose_id}>
                        {language === 'ar' ? p.name_ar : p.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                {isOtherPurpose && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customPurpose} *</label>
                    <input type="text" required value={formData.purpose_custom}
                      onChange={(e) => setFormData({...formData, purpose_custom: e.target.value})}
                      placeholder={language === 'ar' ? 'أدخل الغرض...' : 'Enter purpose...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].judge}</label>
                  <input type="text" value={formData.judge}
                    onChange={(e) => setFormData({...formData, judge: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              {/* Info message when Purpose is Judgment Pronouncement */}
              {isJudgmentPronouncement && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-800">
                    ⚠️ {language === 'ar' 
                      ? 'أدخل تاريخ النطق بالحكم. سيظهر هذا السجل في قائمة الأحكام بدلاً من قائمة الجلسات.' 
                      : 'Enter the judgment pronouncement date. This record will appear in the Judgments list instead of the Hearings list.'}
                  </p>
                </div>
              )}

              {/* Judgment Date field - only shows when purpose is Judgment Pronouncement */}
              {isJudgmentPronouncement && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === 'ar' ? 'تاريخ النطق بالحكم' : 'Judgment Date'} *
                  </label>
                  <input type="date" required
                    value={formData.judgment_date || ''}
                    onChange={(e) => setFormData({...formData, judgment_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">{t[language].notes}</label>
                <textarea value={formData.notes} rows="3"
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowHearingForm(false); setEditingHearing(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // TASK FORM COMPONENT
  // ============================================
  const TaskForm = () => {
    const [formData, setFormData] = useState(editingTask || {
      client_id: '', matter_id: '', task_type_id: '', task_type_custom: '', title: '', description: '',
      instructions: '', due_date: '', due_time: '', time_budget_minutes: '',
      priority: 'medium', assigned_to_id: '', notes: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Filter matters by selected client
    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    // Check if custom task type selected
    const isCustomTaskType = formData.task_type_id === 'custom';

    const validateField = (name, value) => {
      switch (name) {
        case 'title': if (!value || !value.trim()) return t[language].required; break;
        case 'due_date': if (!value) return t[language].required; break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      ['title', 'due_date'].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched({ title: true, due_date: true });
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      try {
        const taskData = {
          ...formData,
          assigned_by: 'Admin',
          task_type_id: formData.task_type_id === 'custom' ? null : formData.task_type_id,
          assigned_to_id: formData.assigned_to_id || null,
          time_budget_minutes: formData.time_budget_minutes ? parseInt(formData.time_budget_minutes) : null
        };
        
        if (editingTask) {
          await window.electronAPI.updateTask({ ...taskData, task_id: editingTask.task_id });
        } else {
          await window.electronAPI.addTask(taskData);
        }
        clearFormDirty();
        await refreshTasks();
        showToast(editingTask 
          ? (language === 'ar' ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully')
          : (language === 'ar' ? 'تم إضافة المهمة بنجاح' : 'Task added successfully'));
        setShowTaskForm(false);
        setEditingTask(null);
      } catch (error) {
        console.error('Error saving task:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ المهمة' : 'Error saving task', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingTask ? t[language].edit : t[language].addTask}</h2>
              <button onClick={() => { setShowTaskForm(false); setEditingTask(null); clearFormDirty(); }}
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client & Matter Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].client}</label>
                  <select value={formData.client_id}
                    onChange={(e) => { handleFieldChange('client_id', e.target.value); setFormData(prev => ({...prev, matter_id: ''})); }}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].selectClient} --</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                  <select value={formData.matter_id}
                    onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                    disabled={!formData.client_id}
                    className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                    <option value="">{formData.client_id ? '-- ' + t[language].selectMatter + ' --' : t[language].selectClientFirst}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t[language].taskTitle} required error={errors.title}>
                  <input type="text" value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleBlur('title')}
                    className={inputClass(errors.title)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].taskType}</label>
                  <select value={formData.task_type_id}
                    onChange={(e) => handleFieldChange('task_type_id', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {taskTypes.map(tt => (
                      <option key={tt.task_type_id} value={tt.task_type_id}>
                        {tt.icon} {language === 'ar' ? tt.name_ar : tt.name_en}
                      </option>
                    ))}
                    <option value="custom">{t[language].custom}</option>
                  </select>
                </div>
                {isCustomTaskType && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].customType} *</label>
                    <input type="text" required value={formData.task_type_custom}
                      placeholder={language === 'ar' ? 'أدخل نوع المهمة...' : 'Enter task type...'}
                      placeholder={language === 'ar' ? 'أدخل نوع المهمة...' : 'Enter task type...'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].priority}</label>
                  <select value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="high">{t[language].high}</option>
                    <option value="medium">{t[language].medium}</option>
                    <option value="low">{t[language].low}</option>
                  </select>
                </div>
                <FormField label={t[language].dueDate} required error={errors.due_date}>
                  <input type="date" value={formData.due_date}
                    onChange={(e) => handleFieldChange('due_date', e.target.value)}
                    onBlur={() => handleBlur('due_date')}
                    className={inputClass(errors.due_date)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].assignedTo}</label>
                  <select value={formData.assigned_to_id || ''}
                    onChange={(e) => setFormData({...formData, assigned_to_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                        {language === 'ar' && lawyer.full_name_arabic ? lawyer.full_name_arabic : lawyer.full_name}
                        {lawyer.initials ? ` (${lawyer.initials})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].description}</label>
                <textarea value={formData.description} rows="2"
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].instructions}</label>
                <textarea value={formData.instructions} rows="3"
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowTaskForm(false); setEditingTask(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // TIMESHEET FORM COMPONENT
  // ============================================
  const TimesheetForm = () => {
    const [formData, setFormData] = useState(editingTimesheet || {
      date: new Date().toISOString().split('T')[0], lawyer_id: '',
      client_id: '', matter_id: '', minutes: '', narrative: '',
      billable: true, rate_per_hour: '150'
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = (name, value) => {
      switch (name) {
        case 'lawyer_id': if (!value) return t[language].selectRequired; break;
        case 'client_id': if (!value) return t[language].selectRequired; break;
        case 'date': if (!value) return t[language].required; break;
        case 'minutes': if (!value || parseInt(value) < 1) return language === 'ar' ? 'يجب أن يكون أكبر من 0' : 'Must be greater than 0'; break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      ['lawyer_id', 'client_id', 'date', 'minutes'].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched({ lawyer_id: true, client_id: true, date: true, minutes: true });
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    // Auto-populate rate when lawyer selected
    const handleLawyerChange = (lawyerId) => {
      const lawyer = lawyers.find(l => l.lawyer_id == lawyerId);
      handleFieldChange('lawyer_id', lawyerId);
      setFormData(prev => ({
        ...prev, 
        lawyer_id: lawyerId,
        rate_per_hour: lawyer?.hourly_rate || prev.rate_per_hour
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      try {
        const data = {
          ...formData,
          minutes: parseInt(formData.minutes),
          rate_per_hour: parseFloat(formData.rate_per_hour) || 0
        };
        
        if (editingTimesheet) {
          await window.electronAPI.updateTimesheet(data);
        } else {
          await window.electronAPI.addTimesheet(data);
        }
        clearFormDirty();
        await refreshTimesheets();
        showToast(editingTimesheet 
          ? (language === 'ar' ? 'تم تحديث سجل الوقت بنجاح' : 'Timesheet updated successfully')
          : (language === 'ar' ? 'تم إضافة سجل الوقت بنجاح' : 'Timesheet added successfully'));
        setShowTimesheetForm(false);
        setEditingTimesheet(null);
      } catch (error) {
        console.error('Error saving timesheet:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ سجل الوقت' : 'Error saving timesheet', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingTimesheet ? t[language].edit : t[language].addTimesheet}</h2>
              <button onClick={() => { setShowTimesheetForm(false); setEditingTimesheet(null); clearFormDirty(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t[language].date} required error={errors.date}>
                  <input type="date" value={formData.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    onBlur={() => handleBlur('date')}
                    className={inputClass(errors.date)} />
                </FormField>
                <FormField label={t[language].lawyer} required error={errors.lawyer_id}>
                  <select value={formData.lawyer_id}
                    onChange={(e) => handleLawyerChange(e.target.value)}
                    onBlur={() => handleBlur('lawyer_id')}
                    className={inputClass(errors.lawyer_id)}>
                    <option value="">-- {t[language].select} --</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                        {language === 'ar' && lawyer.full_name_arabic ? lawyer.full_name_arabic : lawyer.full_name}
                        {lawyer.initials ? ` (${lawyer.initials})` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t[language].client} required error={errors.client_id}>
                  <select value={formData.client_id}
                    onChange={(e) => { handleFieldChange('client_id', e.target.value); setFormData(prev => ({...prev, matter_id: ''})); }}
                    onBlur={() => handleBlur('client_id')}
                    className={inputClass(errors.client_id)}>
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                  <select value={formData.matter_id}
                    onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                    disabled={!formData.client_id}
                    className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                    <option value="">{formData.client_id ? t[language].selectMatter : t[language].selectClientFirst}</option>
                    {matters.filter(m => m.client_id == formData.client_id).map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </div>
                <FormField label={t[language].minutes} required error={errors.minutes}>
                  <input type="number" value={formData.minutes} min="1"
                    onChange={(e) => handleFieldChange('minutes', e.target.value)}
                    onBlur={() => handleBlur('minutes')}
                    className={inputClass(errors.minutes)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].ratePerHour}</label>
                  <input type="number" value={formData.rate_per_hour}
                    onChange={(e) => handleFieldChange('rate_per_hour', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.billable}
                      onChange={(e) => handleFieldChange('billable', e.target.checked)}
                      className="w-4 h-4" />
                    <span className="font-medium">{t[language].billable}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].narrative}</label>
                <textarea value={formData.narrative} rows="3"
                  onChange={(e) => handleFieldChange('narrative', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Describe the work performed..." />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowTimesheetForm(false); setEditingTimesheet(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // JUDGMENT FORM COMPONENT
  // ============================================
  const JudgmentForm = () => {
    const [formData, setFormData] = useState(editingJudgment ? {
      ...editingJudgment,
      client_id: matters.find(m => m.matter_id === editingJudgment.matter_id)?.client_id || '',
      // Preliminary decision workflow fields
      next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '',
      // Auto-create deadline checkbox
      create_appeal_deadline: false
    } : {
      client_id: '', matter_id: '', hearing_id: '', judgment_type: 'first_instance',
      expected_date: '', actual_date: '', reminder_days: '7',
      judgment_outcome: '', judgment_summary: '', amount_awarded: '',
      currency: 'USD', in_favor_of: '', appeal_possible: false,
      appeal_deadline: '', appealed: false, status: 'pending', notes: '',
      // Preliminary decision workflow fields
      next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '',
      // Auto-create deadline checkbox (default true for new judgments)
      create_appeal_deadline: true
    });

    // Filter matters by selected client
    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    // Filter hearings by selected matter (only those with outcome "taken_for_judgment")
    const filteredHearings = formData.matter_id 
      ? hearings.filter(h => h.matter_id === formData.matter_id)
      : [];

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const judgmentData = { ...formData };
        const clientId = judgmentData.client_id; // Store before deleting
        delete judgmentData.client_id; // Remove client_id before sending
        
        // Remove next hearing fields and deadline checkbox from judgment data
        const nextHearingDate = judgmentData.next_hearing_date;
        const nextHearingTime = judgmentData.next_hearing_time;
        const nextHearingPurposeId = judgmentData.next_hearing_purpose_id;
        const createAppealDeadline = judgmentData.create_appeal_deadline;
        const appealDeadlineDate = judgmentData.appeal_deadline;
        delete judgmentData.next_hearing_date;
        delete judgmentData.next_hearing_time;
        delete judgmentData.next_hearing_purpose_id;
        delete judgmentData.create_appeal_deadline;
        
        // TRIGGER: When outcome is "not_final" and next hearing date is set
        // Mark judgment to be hidden from list (moved to hearings)
        if (formData.judgment_outcome === 'not_final' && nextHearingDate) {
          judgmentData.status = 'moved_to_hearing';
        }
        
        let judgmentId;
        if (editingJudgment) {
          await window.electronAPI.updateJudgment({ ...judgmentData, judgment_id: editingJudgment.judgment_id });
          judgmentId = editingJudgment.judgment_id;
        } else {
          const result = await window.electronAPI.addJudgment(judgmentData);
          judgmentId = result?.lastInsertRowid || result?.judgment_id;
        }
        
        // Create next hearing if "not_final" with date
        if (formData.judgment_outcome === 'not_final' && nextHearingDate) {
          const nextHearingData = {
            matter_id: formData.matter_id,
            hearing_date: nextHearingDate,
            hearing_time: nextHearingTime || '',
            purpose_id: nextHearingPurposeId || '',
            purpose_custom: '',
            court_name: '',
            judge: '',
            notes: language === 'ar' 
              ? 'جلسة ناتجة عن حكم غير نهائي' 
              : 'Hearing created from non-final judgment'
          };
          await window.electronAPI.addHearing(nextHearingData);
        }
        
        // Auto-create appeal deadline if checkbox is checked and appeal_deadline date is set
        if (createAppealDeadline && appealDeadlineDate && !editingJudgment) {
          const deadlineData = {
            client_id: clientId,
            matter_id: formData.matter_id,
            judgment_id: judgmentId,
            title: language === 'ar' ? 'موعد الاستئناف' : 'Appeal Deadline',
            deadline_date: appealDeadlineDate,
            reminder_days: 7,
            priority: 'high',
            status: 'pending',
            notes: language === 'ar' 
              ? 'موعد استئناف تم إنشاؤه تلقائياً من الحكم'
              : 'Appeal deadline auto-created from judgment'
          };
          await window.electronAPI.addDeadline(deadlineData);
          await refreshDeadlines();
        }
        
        await Promise.all([refreshJudgments(), refreshHearings()]);
        showToast(editingJudgment 
          ? (language === 'ar' ? 'تم تحديث الحكم بنجاح' : 'Judgment updated successfully')
          : (createAppealDeadline && appealDeadlineDate 
              ? (language === 'ar' ? 'تم إضافة الحكم وموعد الاستئناف' : 'Judgment and appeal deadline added')
              : (language === 'ar' ? 'تم إضافة الحكم بنجاح' : 'Judgment added successfully')));
        setShowJudgmentForm(false);
        setEditingJudgment(null);
      } catch (error) {
        console.error('Error saving judgment:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ الحكم' : 'Error saving judgment', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingJudgment ? t[language].edit : t[language].addJudgment}</h2>
              <button onClick={() => { setShowJudgmentForm(false); setEditingJudgment(null); }}
                className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client & Matter Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                  <select required value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: '', hearing_id: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter} *</label>
                  <select required value={formData.matter_id}
                    onChange={(e) => setFormData({...formData, matter_id: e.target.value, hearing_id: ''})}
                    disabled={!formData.client_id}
                    className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                    <option value="">{formData.client_id ? t[language].selectMatter : t[language].selectClientFirst}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link to Hearing */}
              {filteredHearings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].hearings} ({language === 'ar' ? 'اختياري' : 'optional'})</label>
                  <select value={formData.hearing_id}
                    onChange={(e) => setFormData({...formData, hearing_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {filteredHearings.map(h => (
                      <option key={h.hearing_id} value={h.hearing_id}>
                        {h.hearing_date} - {hearingPurposes.find(p => p.purpose_id == h.purpose_id)?.name_en || h.purpose_custom || 'Hearing'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].judgmentType}</label>
                  <select value={formData.judgment_type}
                    onChange={(e) => setFormData({...formData, judgment_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="first_instance">{t[language].firstInstance}</option>
                    <option value="appeal">{t[language].appeal}</option>
                    <option value="cassation">{t[language].cassation}</option>
                    <option value="arbitral_award">{t[language].arbitralAward}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].judgmentStatus}</label>
                  <select value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="pending">{t[language].pending}</option>
                    <option value="issued">{t[language].issued}</option>
                    <option value="appealed">{t[language].appealed}</option>
                    <option value="final">{t[language].final}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].expectedDate}</label>
                  <input type="date" value={formData.expected_date}
                    onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].actualDate}</label>
                  <input type="date" value={formData.actual_date}
                    onChange={(e) => setFormData({...formData, actual_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].reminderDays}</label>
                  <input type="number" value={formData.reminder_days}
                    onChange={(e) => setFormData({...formData, reminder_days: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].judgmentOutcome}</label>
                  <select value={formData.judgment_outcome}
                    onChange={(e) => setFormData({...formData, judgment_outcome: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    <option value="won">{t[language].won}</option>
                    <option value="lost">{t[language].lost}</option>
                    <option value="partial_win">{t[language].partialWin}</option>
                    <option value="not_final">{t[language].notFinal || 'Not Final'}</option>
                    <option value="settled">{t[language].settled}</option>
                    <option value="dismissed">{t[language].dismissed}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].inFavorOf}</label>
                  <select value={formData.in_favor_of}
                    onChange={(e) => setFormData({...formData, in_favor_of: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    <option value="our_client">{t[language].ourClient}</option>
                    <option value="opposing">{t[language].opposing}</option>
                    <option value="partial">{t[language].partial}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].amountAwarded}</label>
                  <input type="number" value={formData.amount_awarded}
                    onChange={(e) => setFormData({...formData, amount_awarded: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].appealDeadline}</label>
                  <input type="date" value={formData.appeal_deadline}
                    onChange={(e) => setFormData({...formData, appeal_deadline: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              
              {/* Auto-create appeal deadline checkbox */}
              {formData.appeal_deadline && !editingJudgment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.create_appeal_deadline}
                      onChange={(e) => setFormData({...formData, create_appeal_deadline: e.target.checked})}
                      className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      {t[language].createAppealDeadline || (language === 'ar' ? 'إنشاء موعد استئناف تلقائياً' : 'Automatically create appeal deadline')}
                    </span>
                  </label>
                  {formData.create_appeal_deadline && (
                    <p className="text-xs text-blue-600 mt-1 ml-6">
                      ✓ {language === 'ar' ? 'سيتم إنشاء موعد نهائي للاستئناف في قائمة المواعيد' : 'A deadline will be created in the Deadlines list'}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.appeal_possible}
                    onChange={(e) => setFormData({...formData, appeal_possible: e.target.checked})}
                    className="w-4 h-4" />
                  <span className="text-sm">{t[language].appealPossible}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.appealed}
                    onChange={(e) => setFormData({...formData, appealed: e.target.checked})}
                    className="w-4 h-4" />
                  <span className="text-sm">{t[language].appealed}</span>
                </label>
              </div>

              {/* Not Final Workflow - Schedule Next Hearing */}
              {formData.judgment_outcome === 'not_final' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-indigo-800 mb-3">
                    📋 {t[language].notFinalWorkflow || 'Not Final - Schedule Next Hearing'}
                  </h4>
                  <p className="text-xs text-indigo-600 mb-3">
                    {language === 'ar'
                      ? 'الحكم ليس نهائياً. يمكنك جدولة جلسة جديدة وسيتم نقل هذا السجل إلى قائمة الجلسات.'
                      : 'The judgment is not final. You can schedule a new hearing and this record will move to the Hearings list.'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].nextHearingDate || 'Next Hearing Date'}</label>
                      <input type="date" value={formData.next_hearing_date}
                        onChange={(e) => setFormData({...formData, next_hearing_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].time}</label>
                      <input type="time" value={formData.next_hearing_time}
                        onChange={(e) => setFormData({...formData, next_hearing_time: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].purpose}</label>
                      <select value={formData.next_hearing_purpose_id}
                        onChange={(e) => setFormData({...formData, next_hearing_purpose_id: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md">
                        <option value="">-- {t[language].select} --</option>
                        {hearingPurposes.map(p => (
                          <option key={p.purpose_id} value={p.purpose_id}>
                            {language === 'ar' ? p.name_ar : p.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {formData.next_hearing_date && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ {language === 'ar' ? 'سيتم إنشاء جلسة جديدة وإخفاء هذا الحكم من القائمة' : 'A new hearing will be created and this judgment will be hidden from the list'}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">{t[language].judgmentSummary}</label>
                <textarea value={formData.judgment_summary} rows="3"
                  onChange={(e) => setFormData({...formData, judgment_summary: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowJudgmentForm(false); setEditingJudgment(null); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // APPOINTMENT FORM COMPONENT
  // ============================================
  const AppointmentForm = () => {
    const [formData, setFormData] = useState(editingAppointment || {
      appointment_type: 'client_meeting', title: '', description: '',
      date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00',
      all_day: false, location_type: 'office', location_details: '', virtual_link: '',
      client_id: '', matter_id: '', billable: false, notes: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = (name, value) => {
      switch (name) {
        case 'title': if (!value || !value.trim()) return t[language].required; break;
        case 'date': if (!value) return t[language].required; break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      ['title', 'date'].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched({ title: true, date: true });
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      try {
        if (editingAppointment) {
          await window.electronAPI.updateAppointment({ ...formData, appointment_id: editingAppointment.appointment_id });
        } else {
          await window.electronAPI.addAppointment(formData);
        }
        clearFormDirty();
        await refreshAppointments();
        showToast(editingAppointment 
          ? (language === 'ar' ? 'تم تحديث الموعد بنجاح' : 'Appointment updated successfully')
          : (language === 'ar' ? 'تم إضافة الموعد بنجاح' : 'Appointment added successfully'));
        setShowAppointmentForm(false);
        setEditingAppointment(null);
      } catch (error) {
        console.error('Error saving appointment:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ الموعد' : 'Error saving appointment', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingAppointment ? t[language].edit : t[language].addAppointment}</h2>
              <button onClick={() => { setShowAppointmentForm(false); setEditingAppointment(null); clearFormDirty(); }}
                className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].appointmentType}</label>
                  <select value={formData.appointment_type}
                    onChange={(e) => handleFieldChange('appointment_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="client_meeting">{t[language].clientMeeting}</option>
                    <option value="internal_meeting">{t[language].internalMeeting}</option>
                    <option value="call">{t[language].call}</option>
                    <option value="court_visit">{t[language].courtVisit}</option>
                    <option value="consultation">{t[language].consultation}</option>
                    <option value="personal">{t[language].personal}</option>
                  </select>
                </div>
                <FormField label={t[language].title} required error={errors.title}>
                  <input type="text" value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleBlur('title')}
                    className={inputClass(errors.title)} />
                </FormField>
                <FormField label={t[language].date} required error={errors.date}>
                  <input type="date" value={formData.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    onBlur={() => handleBlur('date')}
                    className={inputClass(errors.date)} />
                </FormField>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.all_day}
                      onChange={(e) => handleFieldChange('all_day', e.target.checked)}
                      className="w-4 h-4" />
                    <span className="text-sm">{t[language].allDay}</span>
                  </label>
                </div>
                {!formData.all_day && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].startTime}</label>
                      <input type="time" value={formData.start_time}
                        onChange={(e) => handleFieldChange('start_time', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].endTime}</label>
                      <input type="time" value={formData.end_time}
                        onChange={(e) => handleFieldChange('end_time', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].locationType}</label>
                  <select value={formData.location_type}
                    onChange={(e) => handleFieldChange('location_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="office">{t[language].office}</option>
                    <option value="external">{t[language].external}</option>
                    <option value="virtual">{t[language].virtual}</option>
                    <option value="court">{t[language].court}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].locationDetails}</label>
                  <input type="text" value={formData.location_details}
                    onChange={(e) => setFormData({...formData, location_details: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                {formData.location_type === 'virtual' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">{t[language].virtualLink}</label>
                    <input type="url" value={formData.virtual_link}
                      onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].client}</label>
                  <select value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                  <select value={formData.matter_id}
                    onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                    disabled={!formData.client_id}
                    className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                    <option value="">-- {t[language].select} --</option>
                    {matters.filter(m => m.client_id == formData.client_id).map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].description}</label>
                <textarea value={formData.description} rows="2"
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAppointmentForm(false); setEditingAppointment(null); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CALENDAR COMPONENT
  // ============================================
  const CalendarModule = () => {
    const [viewMode, setViewMode] = useState('weekly'); // daily, weekly, monthly
    
    // Get week dates
    const getWeekDates = (date) => {
      const start = new Date(date);
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
      return dates;
    };

    // Get month dates (including padding from prev/next months)
    const getMonthDates = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startPadding = firstDay.getDay();
      const dates = [];
      
      for (let i = startPadding - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        dates.push({ date: d, isCurrentMonth: false });
      }
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
        dates.push({ date: new Date(year, month, i), isCurrentMonth: true });
      }
      
      const remaining = 42 - dates.length;
      for (let i = 1; i <= remaining; i++) {
        dates.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
      
      return dates;
    };

    const weekDates = getWeekDates(calendarDate);
    const monthDates = getMonthDates(calendarDate);
    const today = new Date().toISOString().split('T')[0];

    const getEventsForDate = (dateStr) => {
      const events = [];
      
      hearings.filter(h => h.hearing_date === dateStr && h.purpose !== 'Judgment Pronouncement').forEach(h => {
        const matter = matters.find(m => m.matter_id === h.matter_id);
        events.push({
          type: 'hearing', time: h.hearing_time, title: matter?.matter_name || 'Hearing',
          color: 'bg-red-100 text-red-800 border-red-300', id: h.hearing_id
        });
      });
      
      appointments.filter(a => a.date === dateStr).forEach(a => {
        events.push({
          type: 'appointment', time: a.start_time, title: a.title,
          color: 'bg-blue-100 text-blue-800 border-blue-300', id: a.appointment_id
        });
      });
      
      tasks.filter(t => t.due_date === dateStr && t.status !== 'done').forEach(t => {
        events.push({
          type: 'task', time: t.due_time || '', title: t.title,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300', id: t.task_id
        });
      });
      
      judgments.filter(j => j.expected_date === dateStr && j.status === 'pending').forEach(j => {
        const matter = matters.find(m => m.matter_id === j.matter_id);
        events.push({
          type: 'judgment', time: '', title: matter?.matter_name || 'Judgment',
          color: 'bg-purple-100 text-purple-800 border-purple-300', id: j.judgment_id
        });
      });
      
      return events.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    };

    const navigate = (direction) => {
      const newDate = new Date(calendarDate);
      if (viewMode === 'daily') {
        newDate.setDate(newDate.getDate() + direction);
      } else if (viewMode === 'weekly') {
        newDate.setDate(newDate.getDate() + (direction * 7));
      } else {
        newDate.setMonth(newDate.getMonth() + direction);
      }
      setCalendarDate(newDate);
    };

    const goToToday = () => setCalendarDate(new Date());
    const formatDate = (date) => date.toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    const DayView = () => {
      const dateStr = formatDate(calendarDate);
      const events = getEventsForDate(dateStr);
      const isToday = dateStr === today;
      
      return (
        <div className="bg-white rounded-lg border">
          <div className={`text-center py-3 border-b ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
            <div className="text-sm">{language === 'ar' ? dayNamesAr[calendarDate.getDay()] : dayNames[calendarDate.getDay()]}</div>
            <div className="text-2xl font-bold">{calendarDate.getDate()}</div>
            <div className="text-sm">{calendarDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {timeSlots.map(slot => {
              const slotEvents = events.filter(e => e.time && e.time.startsWith(slot.split(':')[0]));
              return (
                <div key={slot} className="flex min-h-[50px]">
                  <div className="w-16 py-2 px-2 text-xs text-gray-500 bg-gray-50 border-r flex-shrink-0">{slot}</div>
                  <div className="flex-1 p-1 space-y-1">
                    {slotEvents.map((event, i) => (
                      <div key={i} className={`text-sm p-2 rounded border ${event.color}`}>
                        <span className="font-medium">{event.time}</span> - {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {events.filter(e => !e.time).length > 0 && (
            <div className="border-t p-3">
              <div className="text-xs text-gray-500 mb-2">{t[language].allDay || 'All Day'}</div>
              <div className="space-y-1">
                {events.filter(e => !e.time).map((event, i) => (
                  <div key={i} className={`text-sm p-2 rounded border ${event.color}`}>{event.title}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    const WeekView = () => (
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, idx) => {
          const dateStr = formatDate(date);
          const events = getEventsForDate(dateStr);
          const isToday = dateStr === today;
          
          return (
            <div key={idx} className={`border rounded-lg min-h-[200px] ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}>
              <div className={`text-center py-2 border-b ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
                <div className="text-xs">{language === 'ar' ? dayNamesAr[idx] : dayNames[idx]}</div>
                <div className="text-lg font-bold">{date.getDate()}</div>
              </div>
              <div className="p-1 space-y-1">
                {events.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-4">{t[language].noEvents}</div>
                ) : (
                  events.slice(0, 5).map((event, i) => (
                    <div key={i} className={`text-xs p-1 rounded border ${event.color} truncate`}>
                      {event.time && <span className="font-medium">{event.time} </span>}
                      {event.title}
                    </div>
                  ))
                )}
                {events.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">+{events.length - 5} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

    const MonthView = () => (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {(language === 'ar' ? dayNamesAr : dayNames).map((day, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {monthDates.map((item, idx) => {
            const dateStr = formatDate(item.date);
            const events = getEventsForDate(dateStr);
            const isToday = dateStr === today;
            
            return (
              <div key={idx} className={`border rounded min-h-[80px] ${
                !item.isCurrentMonth ? 'bg-gray-50 text-gray-400' : isToday ? 'bg-blue-50 border-blue-300' : ''
              }`}>
                <div className={`text-right p-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>{item.date.getDate()}</div>
                <div className="px-1 pb-1 space-y-0.5">
                  {events.slice(0, 3).map((event, i) => (
                    <div key={i} className={`text-xs px-1 rounded truncate ${event.color}`}>{event.title}</div>
                  ))}
                  {events.length > 3 && <div className="text-xs text-gray-500 px-1">+{events.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].calendar}</h2>
          <button onClick={() => setShowAppointmentForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t[language].addAppointment}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="px-3 py-1 border rounded hover:bg-gray-50">
                {t[language].previousWeek || 'Previous'}
              </button>
              <button onClick={goToToday} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                {t[language].today}
              </button>
              <button onClick={() => navigate(1)} className="px-3 py-1 border rounded hover:bg-gray-50">
                {t[language].nextWeek || 'Next'}
              </button>
            </div>
            
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('daily')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'daily' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}>
                {t[language].daily}
              </button>
              <button onClick={() => setViewMode('weekly')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'weekly' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}>
                {t[language].weekly}
              </button>
              <button onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'monthly' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}>
                {t[language].monthly}
              </button>
            </div>
            
            <div className="text-lg font-semibold">
              {viewMode === 'daily' 
                ? calendarDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : calendarDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
              }
            </div>
          </div>

          {viewMode === 'daily' && <DayView />}
          {viewMode === 'weekly' && <WeekView />}
          {viewMode === 'monthly' && <MonthView />}
        </div>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded"></span> {t[language].hearings}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded"></span> {t[language].appointments}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-200 rounded"></span> {t[language].tasks}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-200 rounded"></span> {t[language].judgments}</span>
        </div>
      </div>
    );
  };

  // ============================================
  // JUDGMENTS LIST COMPONENT
  // ============================================
  const JudgmentsList = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Helper to translate judgment type
    const getJudgmentTypeLabel = (type) => {
      const typeMap = {
        'first_instance': t[language].firstInstance,
        'appeal': t[language].appeal,
        'cassation': t[language].cassation,
        'arbitral_award': t[language].arbitralAward
      };
      return typeMap[type] || type;
    };

    // Get linked deadlines for a judgment
    const getJudgmentDeadlines = (judgmentId) => {
      return deadlines.filter(d => d.judgment_id === judgmentId);
    };

    // Get deadline status indicator
    const getDeadlineIndicator = (judgmentId) => {
      const linkedDeadlines = getJudgmentDeadlines(judgmentId);
      if (linkedDeadlines.length === 0) return null;
      
      const pendingDeadlines = linkedDeadlines.filter(d => d.status === 'pending');
      const overdueDeadlines = pendingDeadlines.filter(d => d.deadline_date < today);
      const upcomingDeadlines = pendingDeadlines.filter(d => d.deadline_date >= today && d.deadline_date <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      if (overdueDeadlines.length > 0) {
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 ml-2">⚠️ {overdueDeadlines.length} {t[language].overdueDeadlines}</span>;
      }
      if (upcomingDeadlines.length > 0) {
        return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 ml-2">🕐 {upcomingDeadlines.length} {language === 'ar' ? 'قريب' : 'soon'}</span>;
      }
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 ml-2">✓ {linkedDeadlines.length}</span>;
    };

    // Add deadline for judgment
    const handleAddDeadlineForJudgment = (judgment) => {
      const matter = matters.find(m => m.matter_id === judgment.matter_id);
      setEditingDeadline({
        client_id: matter?.client_id || '',
        matter_id: judgment.matter_id,
        judgment_id: judgment.judgment_id,
        title: '',
        deadline_date: judgment.appeal_deadline || '',
        reminder_days: '7',
        priority: 'high',
        status: 'pending',
        notes: ''
      });
      setShowDeadlineForm(true);
    };

    // Filter out judgments that have been moved to hearings (not_final with follow-up hearing)
    const filteredJudgments = judgments.filter(j => j.status !== 'moved_to_hearing');

    return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t[language].judgments}</h2>
        <button onClick={() => setShowJudgmentForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {t[language].addJudgment}
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matter}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].judgmentType}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].appealDeadline}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].judgmentOutcome}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredJudgments.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
            ) : (
              filteredJudgments.map(j => {
                const matter = matters.find(m => m.matter_id === j.matter_id);
                const client = clients.find(c => c.client_id === matter?.client_id);
                const sourceHearing = j.hearing_id ? hearings.find(h => h.hearing_id === j.hearing_id) : null;
                const deadlineIndicator = getDeadlineIndicator(j.judgment_id);
                const isAppealOverdue = j.appeal_deadline && j.appeal_deadline < today && !j.appealed;
                
                return (
                  <tr key={j.judgment_id} className={`hover:bg-gray-50 ${isAppealOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{matter?.matter_name || '--'}</div>
                      {sourceHearing && (
                        <div className="text-xs text-blue-600 mt-1">
                          📋 {t[language].fromHearing || 'From Hearing'}: {formatDate(sourceHearing.hearing_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client?.client_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">{getJudgmentTypeLabel(j.judgment_type)}</td>
                    <td className="px-6 py-4 text-sm">
                      {j.appeal_deadline ? (
                        <div className="flex items-center">
                          <span className={isAppealOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(j.appeal_deadline)}
                          </span>
                          {deadlineIndicator}
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {j.judgment_outcome ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          j.judgment_outcome === 'won' ? 'bg-green-100 text-green-800' :
                          j.judgment_outcome === 'lost' ? 'bg-red-100 text-red-800' :
                          j.judgment_outcome === 'partial_win' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{t[language][j.judgment_outcome] || j.judgment_outcome}</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">{t[language].pending}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAddDeadlineForJudgment(j)}
                          className="text-orange-600 hover:text-orange-900 text-xs flex items-center gap-1"
                          title={t[language].addDeadlineToJudgment}>
                          <AlertTriangle className="w-3 h-3" /> {t[language].addDeadlineToJudgment || 'Deadline'}
                        </button>
                        <button onClick={() => { setEditingJudgment(j); setShowJudgmentForm(true); }}
                          className="text-blue-600 hover:text-blue-900">{t[language].edit}</button>
                        <button onClick={() => {
                          showConfirm(
                            language === 'ar' ? 'حذف الحكم' : 'Delete Judgment',
                            language === 'ar' ? 'هل أنت متأكد من حذف هذا الحكم؟' : 'Are you sure you want to delete this judgment?',
                            async () => {
                              await window.electronAPI.deleteJudgment(j.judgment_id);
                              await refreshJudgments();
                              showToast(language === 'ar' ? 'تم حذف الحكم' : 'Judgment deleted');
                              hideConfirm();
                            }
                          );
                        }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  // ============================================
  // APPOINTMENTS LIST COMPONENT
  // ============================================
  const AppointmentsList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t[language].appointments}</h2>
        <button onClick={() => setShowAppointmentForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {t[language].addAppointment}
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].date}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].title}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].appointmentType}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].locationType}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
            ) : (
              appointments.map(a => {
                const client = clients.find(c => c.client_id === a.client_id);
                return (
                  <tr key={a.appointment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {a.date} {!a.all_day && a.start_time && `${a.start_time}-${a.end_time}`}
                    </td>
                    <td className="px-6 py-4 font-medium">{a.title}</td>
                    <td className="px-6 py-4 text-sm">{t[language][a.appointment_type?.replace('_', '')] || a.appointment_type}</td>
                    <td className="px-6 py-4 text-sm">{client?.client_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">{t[language][a.location_type] || a.location_type}</td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => { setEditingAppointment(a); setShowAppointmentForm(true); }}
                        className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                      <button onClick={() => {
                        showConfirm(
                          language === 'ar' ? 'حذف الموعد' : 'Delete Appointment',
                          language === 'ar' ? 'هل أنت متأكد من حذف هذا الموعد؟' : 'Are you sure you want to delete this appointment?',
                          async () => {
                            await window.electronAPI.deleteAppointment(a.appointment_id);
                            await refreshAppointments();
                            showToast(language === 'ar' ? 'تم حذف الموعد' : 'Appointment deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // DASHBOARD COMPONENT
  // ============================================
  const Dashboard = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayHearings = hearings.filter(h => h.hearing_date === today);
    const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today);
    const todayTasks = tasks.filter(t => t.status !== 'done' && t.due_date === today);
    const pendingJudgments = judgments.filter(j => j.status === 'pending');
    const upcomingHearingsList = hearings.filter(h => h.hearing_date >= today).sort((a,b) => a.hearing_date.localeCompare(b.hearing_date)).slice(0, 5);
    
    // Deadline calculations
    const overdueDeadlines = deadlines.filter(d => d.status === 'pending' && d.deadline_date < today);
    const upcomingDeadlinesList = deadlines
      .filter(d => d.status === 'pending' && d.deadline_date >= today)
      .sort((a,b) => a.deadline_date.localeCompare(b.deadline_date))
      .slice(0, 5);

    // Widget names mapping
    const widgetNames = {
      stats: t[language].statsWidget || 'Statistics Cards',
      todaySchedule: t[language].todayScheduleWidget || "Today's Schedule",
      tasksDue: t[language].tasksDueWidget || 'Tasks Due',
      upcomingHearings: t[language].upcomingHearingsWidget || 'Upcoming Hearings',
      pendingJudgments: t[language].pendingJudgmentsWidgetLabel || 'Pending Judgments',
      upcomingDeadlines: t[language].upcomingDeadlines || 'Upcoming Deadlines'
    };

    // Save widget preferences to localStorage
    const saveWidgetPrefs = (newConfig) => {
      setDashboardWidgets(newConfig);
      localStorage.setItem('qanuni_dashboard_widgets', JSON.stringify(newConfig));
    };

    // Toggle widget visibility
    const toggleWidget = (widgetId) => {
      const newConfig = {
        ...dashboardWidgets,
        visible: { ...dashboardWidgets.visible, [widgetId]: !dashboardWidgets.visible[widgetId] }
      };
      saveWidgetPrefs(newConfig);
    };

    // Handle drag start
    const handleDragStart = (e, widgetId) => {
      setDraggedWidget(widgetId);
      e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e, widgetId) => {
      e.preventDefault();
      if (draggedWidget === widgetId) return;
    };

    // Handle drop
    const handleDrop = (e, targetId) => {
      e.preventDefault();
      if (!draggedWidget || draggedWidget === targetId) return;
      
      const newOrder = [...dashboardWidgets.order];
      const draggedIndex = newOrder.indexOf(draggedWidget);
      const targetIndex = newOrder.indexOf(targetId);
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedWidget);
      
      saveWidgetPrefs({ ...dashboardWidgets, order: newOrder });
      setDraggedWidget(null);
    };

    // Reset to default layout
    const resetLayout = () => {
      const defaultConfig = {
        order: ['stats', 'todaySchedule', 'upcomingDeadlines', 'tasksDue', 'upcomingHearings', 'pendingJudgments'],
        visible: { stats: true, todaySchedule: true, upcomingDeadlines: true, tasksDue: true, upcomingHearings: true, pendingJudgments: true }
      };
      saveWidgetPrefs(defaultConfig);
    };

    // Widget components
    const widgets = {
      stats: (
        <>
          {/* Stats Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].totalClients}</p>
                  <p className="text-3xl font-bold mt-2">{dashboardStats.totalClients || clients.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].activeMatters}</p>
                  <p className="text-3xl font-bold mt-2">{dashboardStats.activeMatters || matters.filter(m => m.status === 'active').length}</p>
                </div>
                <Briefcase className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].pendingTasks}</p>
                  <p className="text-3xl font-bold mt-2">{dashboardStats.pendingTasks || tasks.filter(t => t.status !== 'done').length}</p>
                </div>
                <ClipboardList className="w-12 h-12 text-orange-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].upcomingHearings}</p>
                  <p className="text-3xl font-bold mt-2">{dashboardStats.upcomingHearings || hearings.filter(h => h.hearing_date >= today).length}</p>
                </div>
                <Gavel className="w-12 h-12 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Stats Cards - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].overdueTasks || 'Overdue Tasks'}</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">{dashboardStats.overdueTasks || overdueTasks.length}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].pendingJudgmentsWidget || 'Pending Judgments'}</p>
                  <p className="text-3xl font-bold mt-2">{dashboardStats.pendingJudgments || pendingJudgments.length}</p>
                </div>
                <Scale className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].outstandingBalance || 'Outstanding Balance'}</p>
                  <p className="text-2xl font-bold mt-2">${(dashboardStats.outstandingInvoices || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t[language].totalInvoices || 'Total Invoices'}</p>
                  <p className="text-3xl font-bold mt-2">{invoices.length}</p>
                </div>
                <FileText className="w-12 h-12 text-gray-500" />
              </div>
            </div>
          </div>
        </>
      ),
      todaySchedule: (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t[language].todaySchedule}</h3>
          {todayHearings.length === 0 ? (
            <p className="text-gray-500">{t[language].noHearingsToday || 'No hearings scheduled for today'}</p>
          ) : (
            <div className="space-y-3">
              {todayHearings.map(h => {
                const matter = matters.find(m => m.matter_id === h.matter_id);
                return (
                  <div key={h.hearing_id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Gavel className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{matter?.matter_name}</p>
                      <p className="text-sm text-gray-600">{h.hearing_time} - {h.purpose_custom}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
      tasksDue: (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t[language].tasks}</h3>
          {overdueTasks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-600 mb-2">{t[language].overdue} ({overdueTasks.length})</h4>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map(task => (
                  <div key={task.task_id} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                    <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {todayTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-orange-600 mb-2">{t[language].dueToday} ({todayTasks.length})</h4>
              <div className="space-y-2">
                {todayTasks.slice(0, 3).map(task => (
                  <div key={task.task_id} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                    <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {overdueTasks.length === 0 && todayTasks.length === 0 && (
            <p className="text-gray-500">{t[language].noTasksDue || 'No tasks due'}</p>
          )}
        </div>
      ),
      upcomingHearings: (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t[language].upcomingHearings}</h3>
          {upcomingHearingsList.length === 0 ? (
            <p className="text-gray-500">{t[language].noData}</p>
          ) : (
            <div className="space-y-3">
              {upcomingHearingsList.map(h => {
                const matter = matters.find(m => m.matter_id === h.matter_id);
                const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
                return (
                  <div key={h.hearing_id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">{matter?.matter_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{client?.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(h.hearing_date)}</p>
                      <p className="text-xs text-gray-500">{h.hearing_time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
      pendingJudgments: (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t[language].pendingJudgments}</h3>
          {pendingJudgments.length === 0 ? (
            <p className="text-gray-500">{t[language].noData}</p>
          ) : (
            <div className="space-y-3">
              {pendingJudgments.slice(0, 5).map(j => {
                const matter = matters.find(m => m.matter_id === j.matter_id);
                return (
                  <div key={j.judgment_id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Scale className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium">{matter?.matter_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{j.judgment_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{j.expected_date ? formatDate(j.expected_date) : 'TBD'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
      upcomingDeadlines: (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t[language].upcomingDeadlines}</h3>
            {overdueDeadlines.length > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                {overdueDeadlines.length} {t[language].overdueDeadlines}
              </span>
            )}
          </div>
          {upcomingDeadlinesList.length === 0 && overdueDeadlines.length === 0 ? (
            <p className="text-gray-500">{t[language].noData}</p>
          ) : (
            <div className="space-y-3">
              {/* Show overdue first */}
              {overdueDeadlines.slice(0, 3).map(d => {
                const matter = matters.find(m => m.matter_id === d.matter_id);
                const daysOver = Math.ceil((new Date() - new Date(d.deadline_date)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={d.deadline_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">{d.title}</p>
                        <p className="text-sm text-red-600">{matter?.matter_name || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{daysOver} {t[language].daysOverdue}</p>
                    </div>
                  </div>
                );
              })}
              {/* Show upcoming */}
              {upcomingDeadlinesList.map(d => {
                const matter = matters.find(m => m.matter_id === d.matter_id);
                const daysUntil = Math.ceil((new Date(d.deadline_date) - new Date()) / (1000 * 60 * 60 * 24));
                const bgColor = daysUntil === 0 ? 'bg-orange-50' : daysUntil <= 7 ? 'bg-yellow-50' : 'bg-gray-50';
                const textColor = daysUntil === 0 ? 'text-orange-600' : daysUntil <= 7 ? 'text-yellow-700' : 'text-gray-600';
                return (
                  <div key={d.deadline_id} className={`flex items-center justify-between p-3 ${bgColor} rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${textColor}`} />
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-sm text-gray-600">{matter?.matter_name || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(d.deadline_date)}</p>
                      <p className={`text-xs ${textColor}`}>
                        {daysUntil === 0 ? t[language].dueToday : `${daysUntil} ${t[language].daysRemaining}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button 
            onClick={() => handleModuleChange('deadlines')}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            {t[language].view} {t[language].allDeadlines} →
          </button>
        </div>
      )
    };

    // Render widgets in order, respecting visibility
    const renderWidgets = () => {
      return dashboardWidgets.order.map((widgetId, index) => {
        if (!dashboardWidgets.visible[widgetId]) return null;
        
        // Special layout handling for stats (full width) vs others (2 columns)
        if (widgetId === 'stats') {
          return <div key={widgetId}>{widgets[widgetId]}</div>;
        }
        
        return widgets[widgetId];
      }).filter(Boolean);
    };

    // Group non-stats widgets for 2-column layout
    const nonStatsWidgets = dashboardWidgets.order
      .filter(id => id !== 'stats' && dashboardWidgets.visible[id])
      .map(id => widgets[id]);

    return (
      <div className="space-y-6">
        {/* Header with Customize button */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].dashboard}</h2>
          <button 
            onClick={() => setShowWidgetSettings(!showWidgetSettings)}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            {t[language].customizeDashboard || 'Customize'}
          </button>
        </div>

        {/* Widget Settings Panel */}
        {showWidgetSettings && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{t[language].customizeDashboard || 'Customize Dashboard'}</h3>
              <button onClick={() => setShowWidgetSettings(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t[language].dragToReorder || 'Drag to reorder widgets'}</p>
            
            <div className="space-y-2">
              {dashboardWidgets.order.map((widgetId) => (
                <div 
                  key={widgetId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widgetId)}
                  onDragOver={(e) => handleDragOver(e, widgetId)}
                  onDrop={(e) => handleDrop(e, widgetId)}
                  className={`flex items-center justify-between p-3 border rounded-md cursor-move ${
                    draggedWidget === widgetId ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Menu className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{widgetNames[widgetId]}</span>
                  </div>
                  <button 
                    onClick={() => toggleWidget(widgetId)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      dashboardWidgets.visible[widgetId] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {dashboardWidgets.visible[widgetId] ? (t[language].showWidget || 'Show') : (t[language].hideWidget || 'Hide')}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button 
                onClick={resetLayout}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                {t[language].resetLayout || 'Reset Layout'}
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards (always at top if visible) */}
        {dashboardWidgets.visible.stats && widgets.stats}

        {/* Other Widgets in 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboardWidgets.order
            .filter(id => id !== 'stats' && dashboardWidgets.visible[id])
            .map(id => <div key={id}>{widgets[id]}</div>)
          }
        </div>
      </div>
    );
  };

  // ============================================
  // CLIENTS LIST COMPONENT
  // ============================================
  const ClientsList = () => {
    // Filter clients based on search
    const filteredClients = clientSearch.trim() === '' 
      ? clients 
      : clients.filter(c => 
          (c.client_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.client_name_arabic || '').includes(clientSearch) ||
          (c.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.phone || '').includes(clientSearch) ||
          (c.mobile || '').includes(clientSearch)
        );

    // Show empty state when no clients exist
    if (clients.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t[language].clients}</h2>
          </div>
          <div className="bg-white rounded-lg shadow">
            <EmptyState
              type="clients"
              title={t[language].emptyClients}
              description={t[language].emptyClientsDesc}
              actionLabel={t[language].addClient}
              onAction={() => setShowClientForm(true)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].clients}</h2>
          <button onClick={() => setShowClientForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].addClient}
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder={t[language].searchClients || 'Search clients...'}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {clientSearch && (
            <p className="text-sm text-gray-500 mt-2">
              {t[language].showingOf || 'Showing'} {filteredClients.length} {t[language].of || 'of'} {clients.length} {t[language].clients}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].clientName}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].clientType}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].email}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].phone}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.client_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{client.client_name}</div>
                      {client.client_name_arabic && <div className="text-sm text-gray-500" dir="rtl">{client.client_name_arabic}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${client.client_type === 'legal_entity' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {client.client_type === 'legal_entity' ? t[language].legalEntity : t[language].individual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.phone || client.mobile}</td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => { setEditingClient(client); setShowClientForm(true); }}
                        className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                      <button onClick={() => {
                        showConfirm(
                          language === 'ar' ? 'حذف العميل' : 'Delete Client',
                          language === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this client?',
                          async () => {
                            await window.electronAPI.deleteClient(client.client_id);
                            await refreshClients();
                            showToast(language === 'ar' ? 'تم حذف العميل' : 'Client deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // CONTACTS LIST COMPONENT
  // ============================================
  // ============================================
  // MATTERS LIST COMPONENT
  // ============================================
  const MattersList = () => {
    // Filter matters based on search
    const filteredMatters = matterSearch.trim() === '' 
      ? matters 
      : matters.filter(m => {
          const client = clients.find(c => c.client_id === m.client_id);
          return (
            (m.matter_name || '').toLowerCase().includes(matterSearch.toLowerCase()) ||
            (m.matter_name_arabic || '').includes(matterSearch) ||
            (m.case_number || '').toLowerCase().includes(matterSearch.toLowerCase()) ||
            (client?.client_name || '').toLowerCase().includes(matterSearch.toLowerCase())
          );
        });

    // Show empty state when no matters exist
    if (matters.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t[language].matters}</h2>
          </div>
          <div className="bg-white rounded-lg shadow">
            <EmptyState
              type="matters"
              title={t[language].emptyMatters}
              description={t[language].emptyMattersDesc}
              actionLabel={t[language].addMatter}
              onAction={() => setShowMatterForm(true)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].matters}</h2>
          <button onClick={() => setShowMatterForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].addMatter}
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={matterSearch}
              onChange={(e) => setMatterSearch(e.target.value)}
              placeholder={t[language].searchMatters || 'Search matters...'}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {matterSearch && (
            <p className="text-sm text-gray-500 mt-2">
              {t[language].showingOf || 'Showing'} {filteredMatters.length} {t[language].of || 'of'} {matters.length} {t[language].matters}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matterName}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matterType}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMatters.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
              ) : (
                filteredMatters.map(matter => {
                  const client = clients.find(c => c.client_id === matter.client_id);
                  return (
                    <tr key={matter.matter_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{matter.matter_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{client?.client_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{matter.matter_type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          matter.status === 'active' ? 'bg-green-100 text-green-800' :
                          matter.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          matter.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{matter.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button onClick={() => { setEditingMatter(matter); setShowMatterForm(true); }}
                          className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                        <button onClick={() => {
                          showConfirm(
                            language === 'ar' ? 'حذف القضية' : 'Delete Matter',
                            language === 'ar' ? 'هل أنت متأكد من حذف هذه القضية؟' : 'Are you sure you want to delete this matter?',
                            async () => {
                              await window.electronAPI.deleteMatter(matter.matter_id);
                              await refreshMatters();
                              showToast(language === 'ar' ? 'تم حذف القضية' : 'Matter deleted');
                              hideConfirm();
                            }
                          );
                        }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // HEARINGS LIST COMPONENT
  // ============================================
  const HearingsList = () => {
    // Find the "Judgment Pronouncement" purpose ID
    const judgmentPronouncementPurpose = hearingPurposes.find(p => p.name_en === 'Judgment Pronouncement');
    
    // Filter out hearings with "Judgment Pronouncement" purpose - they appear in Judgments instead
    const filteredHearings = hearings.filter(h => {
      if (judgmentPronouncementPurpose && h.purpose_id === judgmentPronouncementPurpose.purpose_id) {
        return false; // Hide from Hearings list
      }
      if (h.purpose_custom === 'Judgment Pronouncement') {
        return false; // Also check custom purpose text
      }
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].hearings}</h2>
          <button onClick={() => setShowHearingForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].addHearing}
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].hearingDate}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matter}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].purpose}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].judge}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredHearings.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
              ) : (
                filteredHearings.map(hearing => {
                  const matter = matters.find(m => m.matter_id === hearing.matter_id);
                  const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
                  const purpose = hearingPurposes.find(p => p.purpose_id === hearing.purpose_id);
                  return (
                    <tr key={hearing.hearing_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{formatDate(hearing.hearing_date)}</div>
                        <div className="text-sm text-gray-500">{hearing.hearing_time}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{client?.client_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{matter?.matter_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{language === 'ar' ? purpose?.name_ar : purpose?.name_en || hearing.purpose_custom}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{hearing.judge || '--'}</td>
                      <td className="px-6 py-4 text-sm">
                        <button onClick={() => { setEditingHearing(hearing); setShowHearingForm(true); }}
                          className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                        <button onClick={() => {
                          showConfirm(
                            language === 'ar' ? 'حذف الجلسة' : 'Delete Hearing',
                            language === 'ar' ? 'هل أنت متأكد من حذف هذه الجلسة؟' : 'Are you sure you want to delete this hearing?',
                            async () => {
                              await window.electronAPI.deleteHearing(hearing.hearing_id);
                              await refreshHearings();
                              showToast(language === 'ar' ? 'تم حذف الجلسة' : 'Hearing deleted');
                              hideConfirm();
                            }
                          );
                        }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // TASKS LIST COMPONENT
  // ============================================
  const TasksList = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Apply status and priority filters first
    const filteredTasks = tasks.filter(task => {
      const statusMatch = taskStatusFilter === 'all' || task.status === taskStatusFilter;
      const priorityMatch = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;
      return statusMatch && priorityMatch;
    });

    const overdue = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_date && t.due_date < today);
    const dueToday = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_date === today);
    const upcoming = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_date && t.due_date > today);
    const completed = filteredTasks.filter(t => t.status === 'done');

    const TaskRow = ({ task }) => {
      const matter = matters.find(m => m.matter_id === task.matter_id);
      const taskType = taskTypes.find(tt => tt.task_type_id === task.task_type_id);
      return (
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                task.priority === 'high' ? 'bg-red-500' :
                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></span>
              <span className="font-medium">{task.title}</span>
            </div>
            <div className="text-sm text-gray-500">{task.task_number}</div>
          </td>
          <td className="px-6 py-4 text-sm">{taskType?.icon} {taskType?.name_en}</td>
          <td className="px-6 py-4 text-sm text-gray-500">{matter?.matter_name || '--'}</td>
          <td className="px-6 py-4 text-sm">{formatDate(task.due_date)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs rounded-full ${
              task.status === 'done' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              task.status === 'review' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>{task.status}</span>
          </td>
          <td className="px-6 py-4 text-sm">
            <button onClick={() => { setEditingTask(task); setShowTaskForm(true); }}
              className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
          </td>
        </tr>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].tasks}</h2>
          <button onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].addTask}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t[language].status}:</label>
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t[language].allStatuses || 'All Statuses'}</option>
                <option value="assigned">{t[language].assigned}</option>
                <option value="in_progress">{t[language].inProgress}</option>
                <option value="review">{t[language].review}</option>
                <option value="done">{t[language].done}</option>
                <option value="cancelled">{t[language].cancelled}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t[language].priority}:</label>
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t[language].allPriorities || 'All Priorities'}</option>
                <option value="high">{t[language].high}</option>
                <option value="medium">{t[language].medium}</option>
                <option value="low">{t[language].low}</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {t[language].showingOf || 'Showing'} {filteredTasks.length} {t[language].of || 'of'} {tasks.length} {t[language].tasks}
            </div>
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-50 px-6 py-3 border-b border-red-100">
              <h3 className="font-semibold text-red-800">{t[language].overdue} ({overdue.length})</h3>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                {overdue.map(task => <TaskRow key={task.task_id} task={task} />)}
              </tbody>
            </table>
          </div>
        )}

        {dueToday.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-orange-50 px-6 py-3 border-b border-orange-100">
              <h3 className="font-semibold text-orange-800">{t[language].dueToday} ({dueToday.length})</h3>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                {dueToday.map(task => <TaskRow key={task.task_id} task={task} />)}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <h3 className="font-semibold">{t[language].thisWeek} & Later ({upcoming.length})</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].taskTitle}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].taskType}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matter}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].dueDate}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {upcoming.length === 0 && overdue.length === 0 && dueToday.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
              ) : (
                upcoming.map(task => <TaskRow key={task.task_id} task={task} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // TIMESHEETS LIST COMPONENT
  // ============================================
  const TimesheetsList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t[language].timesheets}</h2>
        <button onClick={() => { setEditingTimesheet(null); setShowTimesheetForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {t[language].addTimesheet}
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].date}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].lawyer}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].matter}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].hours}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].billable}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].amount}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {timesheets.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
            ) : (
              timesheets.map(ts => {
                const client = clients.find(c => c.client_id === ts.client_id);
                const matter = matters.find(m => m.matter_id === ts.matter_id);
                const lawyer = lawyers.find(l => l.lawyer_id === ts.lawyer_id);
                const hours = (ts.minutes / 60).toFixed(2);
                const amount = ts.rate_per_hour ? (hours * ts.rate_per_hour).toFixed(2) : '0.00';
                return (
                  <tr key={ts.timesheet_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{formatDate(ts.date)}</td>
                    <td className="px-6 py-4 text-sm">{lawyer?.full_name || ts.lawyer_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">{client?.client_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{matter?.matter_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">{hours}h</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${ts.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ts.billable ? t[language].billable : t[language].nonBillable}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">${amount}</td>
                    <td className="px-6 py-4 text-sm">
                      {ts.status !== 'billed' && (
                        <>
                          <button onClick={() => { setEditingTimesheet(ts); setShowTimesheetForm(true); }}
                            className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                          <button onClick={() => {
                            showConfirm(
                              language === 'ar' ? 'حذف سجل الوقت' : 'Delete Timesheet',
                              language === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this timesheet?',
                              async () => {
                                await window.electronAPI.deleteTimesheet(ts.timesheet_id);
                                await refreshTimesheets();
                                showToast(language === 'ar' ? 'تم حذف سجل الوقت' : 'Timesheet deleted');
                                hideConfirm();
                              }
                            );
                          }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                        </>
                      )}
                      {ts.status === 'billed' && <span className="text-gray-400">Billed</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // EXPENSE FORM COMPONENT
  // ============================================
  const ExpenseForm = () => {
    const [formData, setFormData] = useState(editingExpense || {
      client_id: '', matter_id: '', category_id: '', paid_by_lawyer_id: '',
      amount: '', currency: 'USD', description: '', date: new Date().toISOString().split('T')[0],
      billable: true, markup_percent: '', notes: ''
    });
    const [balanceWarning, setBalanceWarning] = useState(null);

    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    // Check advance balances when client/amount changes
    const checkBalances = async () => {
      if (!formData.client_id || !formData.amount) {
        setBalanceWarning(null);
        return;
      }
      const amount = parseFloat(formData.amount) || 0;
      const warnings = [];
      
      // Check client expense advance
      try {
        const clientAdv = await window.electronAPI.getClientExpenseAdvance(formData.client_id, formData.matter_id);
        if (clientAdv) {
          const newBalance = parseFloat(clientAdv.balance_remaining) - amount;
          if (newBalance < 0) {
            warnings.push(`${t[language].clientExpenseAdvance}: ${clientAdv.currency} ${clientAdv.balance_remaining} → ${newBalance.toFixed(2)} (${t[language].negative})`);
          }
        }
      } catch (e) { console.log('No client expense advance'); }
      
      // Check lawyer advance if paid by lawyer
      if (formData.paid_by_lawyer_id) {
        try {
          const lawyerAdv = await window.electronAPI.getLawyerAdvance(formData.paid_by_lawyer_id);
          if (lawyerAdv) {
            const newBalance = parseFloat(lawyerAdv.balance_remaining) - amount;
            if (newBalance < 0) {
              warnings.push(`${t[language].lawyerAdvance}: ${lawyerAdv.currency} ${lawyerAdv.balance_remaining} → ${newBalance.toFixed(2)} (${t[language].negative})`);
            }
          }
        } catch (e) { console.log('No lawyer advance'); }
      }
      
      setBalanceWarning(warnings.length > 0 ? warnings : null);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (editingExpense) {
          await window.electronAPI.updateExpense(formData);
        } else {
          // Use new API with auto-deduction
          await window.electronAPI.addExpenseWithDeduction({
            ...formData,
            expense_type: 'client' // All expenses are client expenses now
          });
        }
        await Promise.all([refreshExpenses(), refreshAdvances()]);
        showToast(editingExpense 
          ? (language === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully')
          : (language === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully'));
        setShowExpenseForm(false);
        setEditingExpense(null);
      } catch (error) {
        console.error('Error saving expense:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ المصروف' : 'Error saving expense', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{editingExpense ? t[language].edit : t[language].addExpense}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                  <select required value={formData.client_id}
                    onChange={(e) => { setFormData({...formData, client_id: e.target.value, matter_id: ''}); setTimeout(checkBalances, 100); }}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                  <select value={formData.matter_id}
                    onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t[language].selectMatter}</option>
                    {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].date} *</label>
                  <input type="date" required value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].paidBy}</label>
                  <select value={formData.paid_by_lawyer_id || ''}
                    onChange={(e) => { setFormData({...formData, paid_by_lawyer_id: e.target.value}); setTimeout(checkBalances, 100); }}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t[language].firmDirect}</option>
                    {lawyers.map(l => <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].category} *</label>
                  <select required value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">-- {t[language].select} --</option>
                    {expenseCategories.map(c => (
                      <option key={c.category_id} value={c.category_id}>
                        {language === 'ar' ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].amount} *</label>
                  <div className="flex gap-2">
                    <input type="number" required step="0.01" value={formData.amount}
                      onChange={(e) => { setFormData({...formData, amount: e.target.value}); setTimeout(checkBalances, 100); }}
                      className="flex-1 px-3 py-2 border rounded-md" />
                    <select value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-24 px-3 py-2 border rounded-md">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="LBP">LBP</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Balance Warning */}
              {balanceWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ {t[language].balanceWarning}:</p>
                  {balanceWarning.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-700 ml-4">• {w}</p>
                  ))}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].description} *</label>
                <textarea required value={formData.description} rows="2"
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.billable}
                      onChange={(e) => setFormData({...formData, billable: e.target.checked})}
                      className="w-4 h-4" />
                    <span className="text-sm font-medium">{t[language].billable}</span>
                  </label>
                </div>
                {formData.billable && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].markup} %</label>
                    <input type="number" value={formData.markup_percent}
                      onChange={(e) => setFormData({...formData, markup_percent: e.target.value})}
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].notes}</label>
                <textarea value={formData.notes || ''} rows="2"
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // EXPENSES LIST COMPONENT
  // ============================================
  const ExpensesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t[language].expenses}</h2>
        <button onClick={() => setShowExpenseForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {t[language].addExpense}
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].date}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].category}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].description}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].amount}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
            ) : (
              expenses.map(exp => {
                const client = clients.find(c => c.client_id === exp.client_id);
                const category = expenseCategories.find(c => c.category_id === exp.category_id);
                return (
                  <tr key={exp.expense_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{formatDate(exp.date)}</td>
                    <td className="px-6 py-4 text-sm">{client?.client_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">{language === 'ar' ? category?.name_ar : category?.name_en}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{exp.description}</td>
                    <td className="px-6 py-4 text-sm font-medium">{exp.currency} {parseFloat(exp.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        exp.status === 'approved' ? 'bg-green-100 text-green-800' :
                        exp.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                        exp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}`}>
                        {t[language][exp.status] || exp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => { setEditingExpense(exp); setShowExpenseForm(true); }}
                        className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                      <button onClick={() => {
                        showConfirm(
                          language === 'ar' ? 'حذف المصروف' : 'Delete Expense',
                          language === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?',
                          async () => {
                            await window.electronAPI.deleteExpense(exp.expense_id);
                            await refreshExpenses();
                            showToast(language === 'ar' ? 'تم حذف المصروف' : 'Expense deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // ADVANCE FORM COMPONENT
  // ============================================
  const AdvanceForm = () => {
    const [formData, setFormData] = useState(editingAdvance || {
      advance_type: 'client_retainer', client_id: '', matter_id: '', lawyer_id: '',
      amount: '', currency: 'USD', date_received: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer', reference_number: '', balance_remaining: '',
      minimum_balance_alert: '', notes: ''
    });

    const isLawyerAdvance = formData.advance_type === 'lawyer_advance';

    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const advanceData = {
          ...formData,
          // Clear irrelevant fields based on type
          client_id: isLawyerAdvance ? null : formData.client_id,
          matter_id: isLawyerAdvance ? null : formData.matter_id,
          lawyer_id: isLawyerAdvance ? formData.lawyer_id : null,
          balance_remaining: formData.balance_remaining || formData.amount
        };
        let result;
        if (editingAdvance) {
          result = await window.electronAPI.updateAdvance(advanceData);
        } else {
          result = await window.electronAPI.addAdvance(advanceData);
        }
        if (result && result.success === false) {
          showToast(language === 'ar' ? 'خطأ في حفظ السلفة' : 'Save failed: ' + (result.error || 'Unknown error'), 'error');
          return;
        }
        await refreshAdvances();
        showToast(editingAdvance 
          ? (language === 'ar' ? 'تم تحديث السلفة بنجاح' : 'Advance updated successfully')
          : (language === 'ar' ? 'تم إضافة السلفة بنجاح' : 'Advance added successfully'));
        setShowAdvanceForm(false);
        setEditingAdvance(null);
      } catch (error) {
        console.error('Error saving advance:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ السلفة' : 'Error saving advance: ' + error.message, 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{editingAdvance ? t[language].edit : t[language].addAdvance}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].advanceType}</label>
                  <select value={formData.advance_type}
                    onChange={(e) => setFormData({...formData, advance_type: e.target.value, client_id: '', matter_id: '', lawyer_id: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="client_retainer">{t[language].clientRetainer}</option>
                    <option value="client_expense_advance">{t[language].clientExpenseAdvance}</option>
                    <option value="lawyer_advance">{t[language].lawyerAdvance}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].dateReceived} *</label>
                  <input type="date" required value={formData.date_received}
                    onChange={(e) => setFormData({...formData, date_received: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                
                {/* Show Lawyer dropdown for lawyer_advance */}
                {isLawyerAdvance ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].lawyer} *</label>
                    <select required value={formData.lawyer_id}
                      onChange={(e) => setFormData({...formData, lawyer_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">{t[language].selectLawyer}</option>
                      {lawyers.map(l => <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                      <select required value={formData.client_id}
                        onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                        className="w-full px-3 py-2 border rounded-md">
                        <option value="">{t[language].selectClient}</option>
                        {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                      <select value={formData.matter_id}
                        onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md">
                        <option value="">{t[language].selectMatter}</option>
                        {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].amount} *</label>
                  <div className="flex gap-2">
                    <input type="number" required step="0.01" value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value, balance_remaining: editingAdvance ? formData.balance_remaining : e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-md" />
                    <select value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-24 px-3 py-2 border rounded-md">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="LBP">LBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].paymentMethod}</label>
                  <select value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="bank_transfer">{t[language].bankTransfer}</option>
                    <option value="check">{t[language].check}</option>
                    <option value="cash">{t[language].cash}</option>
                    <option value="credit_card">{t[language].creditCard}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].referenceNumber}</label>
                  <input type="text" value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                {editingAdvance && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].balanceRemaining}</label>
                    <input type="number" step="0.01" value={formData.balance_remaining}
                      onChange={(e) => setFormData({...formData, balance_remaining: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].minimumBalanceAlert}</label>
                  <input type="number" step="0.01" value={formData.minimum_balance_alert}
                    onChange={(e) => setFormData({...formData, minimum_balance_alert: e.target.value})}
                    placeholder="500"
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].notes}</label>
                <textarea value={formData.notes || ''} rows="2"
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAdvanceForm(false); setEditingAdvance(null); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ADVANCES LIST COMPONENT
  // ============================================
  const AdvancesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t[language].advances}</h2>
        <button onClick={() => setShowAdvanceForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {t[language].addAdvance}
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].dateReceived}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client} / {t[language].lawyer}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].advanceType}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].amount}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].balanceRemaining}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {advances.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
            ) : (
              advances.map(adv => {
                const client = clients.find(c => c.client_id === adv.client_id);
                const typeLabel = adv.advance_type === 'client_retainer' ? t[language].clientRetainer :
                                 adv.advance_type === 'client_expense_advance' ? t[language].clientExpenseAdvance :
                                 t[language].lawyerAdvance;
                const usedPercent = adv.amount > 0 ? ((adv.amount - adv.balance_remaining) / adv.amount * 100).toFixed(0) : 0;
                // For lawyer_advance, show lawyer name; otherwise show client name
                const displayName = adv.advance_type === 'lawyer_advance' 
                  ? (adv.lawyer_name || 'N/A')
                  : (client?.client_name || 'N/A');
                return (
                  <tr key={adv.advance_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{formatDate(adv.date_received)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{displayName}</td>
                    <td className="px-6 py-4 text-sm">{typeLabel}</td>
                    <td className="px-6 py-4 text-sm">{adv.currency} {parseFloat(adv.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${parseFloat(adv.balance_remaining) < 0 ? 'text-red-600' : adv.balance_remaining < (adv.minimum_balance_alert || 0) ? 'text-orange-600' : 'text-green-600'}`}>
                          {adv.currency} {parseFloat(adv.balance_remaining).toFixed(2)}
                        </span>
                        {parseFloat(adv.balance_remaining) >= 0 && (
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{width: `${100 - usedPercent}%`}}></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        adv.status === 'active' ? 'bg-green-100 text-green-800' :
                        adv.status === 'depleted' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}`}>
                        {t[language][adv.status] || adv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => { setEditingAdvance(adv); setShowAdvanceForm(true); }}
                        className="text-blue-600 hover:text-blue-900 mr-3">{t[language].edit}</button>
                      <button onClick={() => {
                        showConfirm(
                          language === 'ar' ? 'حذف السلفة' : 'Delete Advance',
                          language === 'ar' ? 'هل أنت متأكد من حذف هذه السلفة؟' : 'Are you sure you want to delete this advance?',
                          async () => {
                            await window.electronAPI.deleteAdvance(adv.advance_id);
                            await refreshAdvances();
                            showToast(language === 'ar' ? 'تم حذف السلفة' : 'Advance deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // DEADLINE FORM COMPONENT
  // ============================================
  const DeadlineForm = () => {
    const [formData, setFormData] = useState(editingDeadline ? {
      ...editingDeadline,
      client_id: editingDeadline.client_id || matters.find(m => m.matter_id === editingDeadline.matter_id)?.client_id || ''
    } : {
      client_id: '', matter_id: '', judgment_id: '', title: '', deadline_date: '', reminder_days: '7',
      priority: 'medium', status: 'pending', notes: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [saving, setSaving] = useState(false);

    // Filter matters by selected client
    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id && m.status === 'active')
      : [];

    // Filter judgments by selected matter
    const filteredJudgments = formData.matter_id 
      ? judgments.filter(j => j.matter_id === formData.matter_id && j.status !== 'moved_to_hearing')
      : [];

    const validateField = (name, value) => {
      switch (name) {
        case 'client_id':
          if (!value) return t[language].required;
          break;
        case 'matter_id':
          if (!value) return t[language].required;
          break;
        case 'title':
          if (!value || !value.trim()) return t[language].required;
          break;
        case 'deadline_date':
          if (!value) return t[language].required;
          break;
      }
      return null;
    };

    const handleFieldChange = (name, value) => {
      let updates = { [name]: value };
      
      // Reset dependent fields when parent changes
      if (name === 'client_id') {
        updates.matter_id = '';
        updates.judgment_id = '';
      } else if (name === 'matter_id') {
        updates.judgment_id = '';
      }
      
      setFormData(prev => ({ ...prev, ...updates }));
      markFormDirty();
      if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (name) => {
      setTouched(prev => ({ ...prev, [name]: true }));
      setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
    };

    const validateAll = () => {
      const newErrors = {};
      ['client_id', 'matter_id', 'title', 'deadline_date'].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) newErrors[name] = error;
      });
      setErrors(newErrors);
      setTouched({ client_id: true, matter_id: true, title: true, deadline_date: true });
      return Object.keys(newErrors).length === 0;
    };

    const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAll()) {
        showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
        return;
      }
      
      setSaving(true);
      try {
        const data = {
          ...formData,
          reminder_days: parseInt(formData.reminder_days) || 7
        };
        
        if (editingDeadline) {
          await window.electronAPI.updateDeadline(data);
        } else {
          await window.electronAPI.addDeadline(data);
        }
        
        clearFormDirty();
        await refreshDeadlines();
        showToast(t[language].deadlineSaved);
        setShowDeadlineForm(false);
        setEditingDeadline(null);
      } catch (error) {
        console.error('Error saving deadline:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ الموعد النهائي' : 'Error saving deadline', 'error');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-lg ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingDeadline ? t[language].edit : t[language].addDeadline}</h2>
              <button onClick={() => { setShowDeadlineForm(false); setEditingDeadline(null); clearFormDirty(); }} 
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client & Matter Selection (Required) */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t[language].client} required error={errors.client_id}>
                  <select value={formData.client_id}
                    onChange={(e) => handleFieldChange('client_id', e.target.value)}
                    onBlur={() => handleBlur('client_id')}
                    className={inputClass(errors.client_id)}>
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                </FormField>
                
                <FormField label={t[language].matter} required error={errors.matter_id}>
                  <select value={formData.matter_id}
                    onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                    onBlur={() => handleBlur('matter_id')}
                    disabled={!formData.client_id}
                    className={`${inputClass(errors.matter_id)} disabled:bg-gray-100`}>
                    <option value="">{formData.client_id ? t[language].selectMatter : t[language].selectClientFirst}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label={t[language].deadlineTitle} required error={errors.title}>
                <input type="text" value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  placeholder={language === 'ar' ? 'مثال: موعد الاستئناف' : 'e.g., Appeal Deadline'}
                  className={inputClass(errors.title)} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t[language].deadlineDate} required error={errors.deadline_date}>
                  <input type="date" value={formData.deadline_date}
                    onChange={(e) => handleFieldChange('deadline_date', e.target.value)}
                    onBlur={() => handleBlur('deadline_date')}
                    className={inputClass(errors.deadline_date)} />
                </FormField>
                
                <FormField label={t[language].reminderDays}>
                  <input type="number" value={formData.reminder_days} min="0" max="90"
                    onChange={(e) => handleFieldChange('reminder_days', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t[language].priority}>
                  <select value={formData.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="high">{t[language].high}</option>
                    <option value="medium">{t[language].medium}</option>
                    <option value="low">{t[language].low}</option>
                  </select>
                </FormField>
                
                <FormField label={t[language].linkedToJudgment}>
                  <select value={formData.judgment_id}
                    onChange={(e) => handleFieldChange('judgment_id', e.target.value)}
                    disabled={!formData.matter_id}
                    className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                    <option value="">-- {t[language].select} ({language === 'ar' ? 'اختياري' : 'optional'}) --</option>
                    {filteredJudgments.map(j => (
                      <option key={j.judgment_id} value={j.judgment_id}>
                        {j.judgment_type} - {j.expected_date || j.actual_date || 'Pending'}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label={t[language].deadlineNotes}>
                <textarea value={formData.notes} rows="2"
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowDeadlineForm(false); setEditingDeadline(null); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <LoadingButton type="submit" loading={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // DEADLINES LIST COMPONENT
  // ============================================
  const DeadlinesList = () => {
    const [filter, setFilter] = useState('all'); // all, pending, overdue, completed
    const today = new Date().toISOString().split('T')[0];

    // Calculate days difference
    const getDaysUntil = (dateStr) => {
      const deadline = new Date(dateStr);
      const now = new Date();
      const diffTime = deadline - now;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Filter and sort deadlines
    const filteredDeadlines = deadlines
      .filter(d => {
        if (filter === 'all') return true;
        if (filter === 'pending') return d.status === 'pending' && d.deadline_date >= today;
        if (filter === 'overdue') return d.status === 'pending' && d.deadline_date < today;
        if (filter === 'completed') return d.status === 'completed';
        return true;
      })
      .sort((a, b) => new Date(a.deadline_date) - new Date(b.deadline_date));

    // Get status badge
    const getStatusBadge = (deadline) => {
      const days = getDaysUntil(deadline.deadline_date);
      
      if (deadline.status === 'completed') {
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{t[language].deadlineCompleted}</span>;
      }
      if (days < 0) {
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">{Math.abs(days)} {t[language].daysOverdue}</span>;
      }
      if (days === 0) {
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">{t[language].dueToday}</span>;
      }
      if (days <= 7) {
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">{days} {t[language].daysRemaining}</span>;
      }
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{days} {t[language].daysRemaining}</span>;
    };

    // Get priority badge
    const getPriorityBadge = (priority) => {
      const colors = {
        high: 'bg-red-500',
        medium: 'bg-yellow-500',
        low: 'bg-blue-500'
      };
      return <span className={`w-2 h-2 rounded-full ${colors[priority] || colors.medium}`}></span>;
    };

    // Toggle completion
    const toggleComplete = async (deadline) => {
      try {
        const newStatus = deadline.status === 'completed' ? 'pending' : 'completed';
        await window.electronAPI.updateDeadline({ ...deadline, status: newStatus });
        await refreshDeadlines();
        showToast(newStatus === 'completed' 
          ? (language === 'ar' ? 'تم تحديد كمكتمل' : 'Marked as complete')
          : (language === 'ar' ? 'تم تحديد كمعلق' : 'Marked as pending'));
      } catch (error) {
        console.error('Error updating deadline:', error);
      }
    };

    // Delete deadline
    const handleDelete = (deadline) => {
      showConfirm(
        t[language].delete,
        t[language].confirmDelete,
        async () => {
          try {
            await window.electronAPI.deleteDeadline(deadline.deadline_id);
            await refreshDeadlines();
            showToast(t[language].deadlineDeleted);
          } catch (error) {
            console.error('Error deleting deadline:', error);
          }
          hideConfirm();
        }
      );
    };

    // Count badges
    const overdueCount = deadlines.filter(d => d.status === 'pending' && d.deadline_date < today).length;
    const pendingCount = deadlines.filter(d => d.status === 'pending' && d.deadline_date >= today).length;

    if (deadlines.length === 0) {
      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{t[language].deadlines}</h2>
            <button onClick={() => setShowDeadlineForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="w-5 h-5" /> {t[language].addDeadline}
            </button>
          </div>
          <EmptyState
            type="tasks"
            title={t[language].emptyDeadlines}
            description={t[language].emptyDeadlinesDesc}
            actionLabel={t[language].addDeadline}
            onAction={() => setShowDeadlineForm(true)}
          />
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t[language].deadlines}</h2>
          <button onClick={() => setShowDeadlineForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].addDeadline}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {t[language].allDeadlines} ({deadlines.length})
          </button>
          <button onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-md text-sm ${filter === 'overdue' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
            {t[language].overdueDeadlines} ({overdueCount})
          </button>
          <button onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-md text-sm ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
            {t[language].deadlinePending} ({pendingCount})
          </button>
          <button onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-md text-sm ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
            {t[language].deadlineCompleted} ({deadlines.filter(d => d.status === 'completed').length})
          </button>
        </div>

        {/* Deadlines Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-10"></th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t[language].deadlineTitle}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t[language].client}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t[language].matter}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t[language].deadlineDate}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t[language].status}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t[language].edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDeadlines.map(deadline => {
                const matter = matters.find(m => m.matter_id === deadline.matter_id);
                const client = deadline.client_name || clients.find(c => c.client_id === deadline.client_id)?.client_name;
                const linkedJudgment = deadline.judgment_id ? judgments.find(j => j.judgment_id === deadline.judgment_id) : null;
                const isOverdue = deadline.status === 'pending' && deadline.deadline_date < today;
                
                return (
                  <tr key={deadline.deadline_id} 
                    className={`hover:bg-gray-50 ${deadline.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleComplete(deadline)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          deadline.status === 'completed' 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-green-500'
                        }`}>
                        {deadline.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(deadline.priority)}
                        <span className={deadline.status === 'completed' ? 'line-through' : ''}>{deadline.title}</span>
                      </div>
                      {linkedJudgment && (
                        <p className="text-xs text-purple-600 mt-1">
                          ⚖️ {t[language].linkedToJudgment}: {linkedJudgment.judgment_type}
                        </p>
                      )}
                      {deadline.notes && <p className="text-xs text-gray-500 mt-1">{deadline.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{matter?.matter_name || deadline.matter_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(deadline.deadline_date)}</td>
                    <td className="px-4 py-3">{getStatusBadge(deadline)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingDeadline(deadline); setShowDeadlineForm(true); }}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(deadline)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // INVOICE FORM COMPONENT (Create Invoice Wizard)
  // ============================================
  const InvoiceForm = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
      client_id: '', matter_id: '', period_start: '', period_end: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0], due_date: '',
      discount_type: 'none', discount_value: '', vat_rate: '11',
      notes_to_client: '', internal_notes: ''
    });
    const [unbilledTimeItems, setUnbilledTimeItems] = useState([]);
    const [unbilledExpenseItems, setUnbilledExpenseItems] = useState([]);
    const [selectedTimeIds, setSelectedTimeIds] = useState([]);
    const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
    const [fixedFeeItems, setFixedFeeItems] = useState([]);
    const [retainerBalance, setRetainerBalance] = useState(0);
    const [retainerToApply, setRetainerToApply] = useState(0);
    const [applyRetainer, setApplyRetainer] = useState(false);
    const [errors, setErrors] = useState({});

    const filteredMatters = formData.client_id 
      ? matters.filter(m => m.client_id == formData.client_id)
      : [];

    const handleFieldChange = (name, value) => {
      setFormData(prev => ({ ...prev, [name]: value }));
      markFormDirty();
    };

    // Load retainer balance when client changes
    const loadRetainerBalance = async () => {
      if (formData.client_id) {
        try {
          const retainer = await window.electronAPI.getClientRetainer(formData.client_id, formData.matter_id || null);
          if (retainer && retainer.balance_remaining) {
            setRetainerBalance(parseFloat(retainer.balance_remaining));
          } else {
            setRetainerBalance(0);
          }
        } catch (error) {
          console.error('Error loading retainer:', error);
          setRetainerBalance(0);
        }
      }
    };

    const loadUnbilledItems = async () => {
      if (formData.client_id) {
        const time = await window.electronAPI.getUnbilledTime(formData.client_id, formData.matter_id || null);
        const exp = await window.electronAPI.getUnbilledExpenses(formData.client_id, formData.matter_id || null);
        setUnbilledTimeItems(time);
        setUnbilledExpenseItems(exp);
        setSelectedTimeIds(time.map(t => t.timesheet_id));
        setSelectedExpenseIds(exp.map(e => e.expense_id));
        await loadRetainerBalance();
      }
    };

    const calculateTotals = () => {
      // Calculate fees (time + fixed fees)
      const timeTotal = unbilledTimeItems
        .filter(t => selectedTimeIds.includes(t.timesheet_id))
        .reduce((sum, t) => sum + (t.minutes / 60 * (t.rate_per_hour || 0)), 0);
      const fixedTotal = fixedFeeItems.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
      const feesTotal = timeTotal + fixedTotal;
      
      // Calculate expenses (separate from fees)
      const expenseTotal = unbilledExpenseItems
        .filter(e => selectedExpenseIds.includes(e.expense_id))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      // Retainer applies to FEES ONLY (Option A)
      const retainerApplied = applyRetainer ? Math.min(retainerToApply, feesTotal, retainerBalance) : 0;
      const netFees = feesTotal - retainerApplied;
      
      // Subtotal = Net Fees + Expenses
      const subtotal = netFees + expenseTotal;
      
      // Discount applies after retainer
      let discountAmount = 0;
      if (formData.discount_type === 'percentage') {
        discountAmount = subtotal * (parseFloat(formData.discount_value) || 0) / 100;
      } else if (formData.discount_type === 'fixed') {
        discountAmount = parseFloat(formData.discount_value) || 0;
      }
      
      const taxableAmount = subtotal - discountAmount;
      const vatAmount = taxableAmount * (parseFloat(formData.vat_rate) || 0) / 100;
      const total = taxableAmount + vatAmount;

      return { feesTotal, expenseTotal, retainerApplied, netFees, subtotal, discountAmount, taxableAmount, vatAmount, total };
    };

    const handleSubmit = async () => {
      try {
        const invoiceNumber = await window.electronAPI.generateInvoiceNumber();
        const totals = calculateTotals();
        
        const items = [
          ...unbilledTimeItems
            .filter(t => selectedTimeIds.includes(t.timesheet_id))
            .map(t => ({
              item_type: 'time',
              item_date: t.date,
              description: t.narrative,
              quantity: (t.minutes / 60).toFixed(2),
              unit: 'hours',
              rate: t.rate_per_hour,
              amount: (t.minutes / 60 * t.rate_per_hour).toFixed(2),
              timesheet_id: t.timesheet_id
            })),
          ...unbilledExpenseItems
            .filter(e => selectedExpenseIds.includes(e.expense_id))
            .map(e => ({
              item_type: 'expense',
              item_date: e.date,
              description: e.description,
              quantity: 1,
              unit: 'units',
              rate: e.amount,
              amount: e.amount,
              expense_id: e.expense_id
            })),
          ...fixedFeeItems.map(f => ({
            item_type: 'fixed_fee',
            item_date: formData.issue_date,
            description: f.description,
            quantity: 1,
            unit: 'fixed',
            rate: f.amount,
            amount: f.amount
          }))
        ];

        await window.electronAPI.createInvoice({
          invoice_number: invoiceNumber,
          client_id: formData.client_id,
          matter_id: formData.matter_id || null,
          period_start: formData.period_start || null,
          period_end: formData.period_end,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          subtotal: totals.feesTotal + totals.expenseTotal, // Original subtotal before retainer
          discount_type: formData.discount_type,
          discount_value: formData.discount_value || 0,
          discount_amount: totals.discountAmount,
          retainer_applied: totals.retainerApplied, // Store retainer applied
          taxable_amount: totals.taxableAmount,
          vat_rate: formData.vat_rate || 0,
          vat_amount: totals.vatAmount,
          total: totals.total,
          currency: 'USD',
          notes_to_client: formData.notes_to_client,
          internal_notes: formData.internal_notes
        }, items);

        // Deduct retainer from advance if applied
        if (totals.retainerApplied > 0) {
          try {
            await window.electronAPI.deductRetainer(formData.client_id, formData.matter_id || null, 'client_retainer', totals.retainerApplied);
          } catch (error) {
            console.error('Error deducting retainer:', error);
          }
        }

        await refreshInvoices();
        clearFormDirty();
        showToast(language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
        setShowInvoiceForm(false);
      } catch (error) {
        console.error('Error creating invoice:', error);
        showToast(language === 'ar' ? 'خطأ في إنشاء الفاتورة' : 'Error creating invoice', 'error');
      }
    };

    const totals = calculateTotals();
    const maxRetainer = Math.min(totals.feesTotal, retainerBalance);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{t[language].createInvoice}</h2>
            
            {/* Step Indicator */}
            <div className="flex items-center mb-6">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
            </div>

            {/* Step 1: Select Client & Matter */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                    <select required value={formData.client_id}
                      onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">{t[language].selectClient}</option>
                      {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                    <select value={formData.matter_id}
                      onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">All Matters</option>
                      {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].periodStart}</label>
                    <input type="date" value={formData.period_start}
                      onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].periodEnd}</label>
                    <input type="date" value={formData.period_end}
                      onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowInvoiceForm(false); clearFormDirty(); }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                  <button type="button" onClick={() => { loadUnbilledItems(); setStep(2); }}
                    disabled={!formData.client_id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Items */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Unbilled Time */}
                <div>
                  <h3 className="font-semibold mb-2">{t[language].unbilledTime} ({unbilledTimeItems.length})</h3>
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {unbilledTimeItems.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">{t[language].noData}</p>
                    ) : (
                      unbilledTimeItems.map(t => (
                        <label key={t.timesheet_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                          <input type="checkbox" checked={selectedTimeIds.includes(t.timesheet_id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTimeIds([...selectedTimeIds, t.timesheet_id]);
                              else setSelectedTimeIds(selectedTimeIds.filter(id => id !== t.timesheet_id));
                            }}
                            className="w-4 h-4" />
                          <span className="flex-1 text-sm">{t.date} - {t.narrative}</span>
                          <span className="text-sm text-gray-500">{(t.minutes/60).toFixed(2)}h @ ${t.rate_per_hour}</span>
                          <span className="text-sm font-medium">${(t.minutes/60 * t.rate_per_hour).toFixed(2)}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Unbilled Expenses */}
                <div>
                  <h3 className="font-semibold mb-2">{t[language].unbilledExpenses} ({unbilledExpenseItems.length})</h3>
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {unbilledExpenseItems.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">{t[language].noData}</p>
                    ) : (
                      unbilledExpenseItems.map(e => (
                        <label key={e.expense_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                          <input type="checkbox" checked={selectedExpenseIds.includes(e.expense_id)}
                            onChange={(ev) => {
                              if (ev.target.checked) setSelectedExpenseIds([...selectedExpenseIds, e.expense_id]);
                              else setSelectedExpenseIds(selectedExpenseIds.filter(id => id !== e.expense_id));
                            }}
                            className="w-4 h-4" />
                          <span className="flex-1 text-sm">{e.date} - {e.description}</span>
                          <span className="text-sm font-medium">${parseFloat(e.amount).toFixed(2)}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Fixed Fee Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{t[language].fixedFeeItem}</h3>
                    <button type="button" onClick={() => setFixedFeeItems([...fixedFeeItems, {description: '', amount: ''}])}
                      className="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
                  </div>
                  {fixedFeeItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input type="text" placeholder="Description" value={item.description}
                        onChange={(e) => {
                          const updated = [...fixedFeeItems];
                          updated[index].description = e.target.value;
                          setFixedFeeItems(updated);
                        }}
                        className="flex-1 px-3 py-2 border rounded-md" />
                      <input type="number" placeholder="Amount" value={item.amount}
                        onChange={(e) => {
                          const updated = [...fixedFeeItems];
                          updated[index].amount = e.target.value;
                          setFixedFeeItems(updated);
                        }}
                        className="w-32 px-3 py-2 border rounded-md" />
                      <button type="button" onClick={() => setFixedFeeItems(fixedFeeItems.filter((_, i) => i !== index))}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md">×</button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50">Back</button>
                  <button type="button" onClick={() => setStep(3)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Next</button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Finalize */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].issueDate}</label>
                    <input type="date" value={formData.issue_date}
                      onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].dueDate}</label>
                    <input type="date" value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].discountType}</label>
                    <select value={formData.discount_type}
                      onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="none">None</option>
                      <option value="percentage">{t[language].percentage}</option>
                      <option value="fixed">{t[language].fixed}</option>
                    </select>
                  </div>
                  {formData.discount_type !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].discount} {formData.discount_type === 'percentage' ? '%' : '$'}</label>
                      <input type="number" value={formData.discount_value}
                        onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].vatRate} %</label>
                    <input type="number" value={formData.vat_rate}
                      onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>

                {/* Retainer Application Section */}
                {retainerBalance > 0 && totals.feesTotal > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-green-800">{t[language].clientRetainer}</h4>
                        <p className="text-sm text-green-600">{t[language].availableBalance}: ${retainerBalance.toFixed(2)}</p>
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={applyRetainer}
                          onChange={(e) => {
                            setApplyRetainer(e.target.checked);
                            if (e.target.checked) {
                              setRetainerToApply(maxRetainer);
                            } else {
                              setRetainerToApply(0);
                            }
                          }}
                          className="w-4 h-4" />
                        <span className="text-sm font-medium">{t[language].applyRetainer}</span>
                      </label>
                    </div>
                    {applyRetainer && (
                      <div className="flex items-center gap-3">
                        <label className="text-sm">{t[language].amountToApply}:</label>
                        <input type="number" value={retainerToApply}
                          min="0" max={maxRetainer} step="0.01"
                          onChange={(e) => setRetainerToApply(Math.min(parseFloat(e.target.value) || 0, maxRetainer))}
                          className="w-32 px-3 py-1 border rounded-md" />
                        <button type="button" onClick={() => setRetainerToApply(maxRetainer)}
                          className="text-sm text-blue-600 hover:underline">{t[language].applyMax}</button>
                        <span className="text-sm text-gray-500">(max: ${maxRetainer.toFixed(2)})</span>
                      </div>
                    )}
                    <p className="text-xs text-green-600 mt-2 italic">{t[language].retainerAppliedToFeesOnly}</p>
                  </div>
                )}

                {/* Totals */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between py-1 text-sm">
                    <span>{t[language].professionalFees}:</span>
                    <span>${totals.feesTotal.toFixed(2)}</span>
                  </div>
                  {totals.retainerApplied > 0 && (
                    <div className="flex justify-between py-1 text-sm text-green-600">
                      <span>{t[language].lessRetainer}:</span>
                      <span>-${totals.retainerApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 text-sm border-b">
                    <span>{t[language].netFees}:</span>
                    <span>${totals.netFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>{t[language].disbursements}:</span>
                    <span>${totals.expenseTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-medium border-t">
                    <span>{t[language].subtotal}:</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between py-1 text-red-600">
                      <span>{t[language].discount}:</span>
                      <span>-${totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span>VAT ({formData.vat_rate}%):</span>
                    <span>${totals.vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold border-t-2">
                    <span>{t[language].total}:</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].notesToClient}</label>
                  <textarea value={formData.notes_to_client} rows="2"
                    onChange={(e) => setFormData({...formData, notes_to_client: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setStep(2)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50">Back</button>
                  <button type="button" onClick={handleSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    {t[language].generateInvoice}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // INVOICE VIEW MODAL COMPONENT
  // ============================================
  const InvoiceViewModal = () => {
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const loadItems = async () => {
        if (viewingInvoice) {
          setLoading(true);
          try {
            const items = await window.electronAPI.getInvoiceItems(viewingInvoice.invoice_id);
            setInvoiceItems(items || []);
          } catch (error) {
            console.error('Error loading invoice items:', error);
          }
          setLoading(false);
        }
      };
      loadItems();
    }, [viewingInvoice]);

    if (!viewingInvoice) return null;
    
    const client = clients.find(c => c.client_id === viewingInvoice.client_id);
    const matter = viewingInvoice.matter_id ? matters.find(m => m.matter_id === viewingInvoice.matter_id) : null;
    
    // Separate time entries and expenses
    const timeItems = invoiceItems.filter(item => item.item_type === 'time');
    const expenseItems = invoiceItems.filter(item => item.item_type === 'expense');
    const fixedFeeItems = invoiceItems.filter(item => item.item_type === 'fixed_fee');
    
    const timeTotal = timeItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const fixedTotal = fixedFeeItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const feesTotal = timeTotal + fixedTotal;
    const expenseTotal = expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    // Calculate retainer applied (stored in discount if it was applied)
    const retainerApplied = viewingInvoice.retainer_applied || 0;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-invoice">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 invoice-header">
              <div>
                <h2 className="text-2xl font-bold">{viewingInvoice.invoice_number}</h2>
                <p className="text-gray-500">
                  {t[language].issueDate}: {formatDate(viewingInvoice.issue_date)}
                  {viewingInvoice.due_date && ` | ${t[language].dueDate}: ${formatDate(viewingInvoice.due_date)}`}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                viewingInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                viewingInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                viewingInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>{t[language][viewingInvoice.status] || viewingInvoice.status}</span>
            </div>
            
            {/* Client & Matter Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t[language].client}</p>
                  <p className="font-medium">{client?.client_name || 'N/A'}</p>
                </div>
                {matter && (
                  <div>
                    <p className="text-sm text-gray-500">{t[language].matter}</p>
                    <p className="font-medium">{matter.matter_name}</p>
                  </div>
                )}
              </div>
              {viewingInvoice.period_start && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{t[language].billingPeriod}</p>
                  <p className="font-medium">{formatDate(viewingInvoice.period_start)} - {formatDate(viewingInvoice.period_end)}</p>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8">{t[language].loading}</div>
            ) : (
              <>
                {/* Professional Fees Section */}
                {(timeItems.length > 0 || fixedFeeItems.length > 0) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">{t[language].professionalFees}</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">{t[language].date}</th>
                          <th className="px-3 py-2 text-left">{t[language].description}</th>
                          <th className="px-3 py-2 text-right">{t[language].hours}</th>
                          <th className="px-3 py-2 text-right">{t[language].rate}</th>
                          <th className="px-3 py-2 text-right">{t[language].amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeItems.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{parseFloat(item.rate).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        {fixedFeeItems.map((item, idx) => (
                          <tr key={`ff-${idx}`} className="border-b">
                            <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right">-</td>
                            <td className="px-3 py-2 text-right">{t[language].fixedFee}</td>
                            <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-medium">
                        <tr>
                          <td colSpan="4" className="px-3 py-2 text-right">{t[language].professionalFees} {t[language].subtotal}:</td>
                          <td className="px-3 py-2 text-right">{viewingInvoice.currency} {feesTotal.toFixed(2)}</td>
                        </tr>
                        {retainerApplied > 0 && (
                          <tr className="text-green-700">
                            <td colSpan="4" className="px-3 py-2 text-right">{t[language].lessRetainer}:</td>
                            <td className="px-3 py-2 text-right">({viewingInvoice.currency} {retainerApplied.toFixed(2)})</td>
                          </tr>
                        )}
                        <tr className="border-t-2 border-gray-300">
                          <td colSpan="4" className="px-3 py-2 text-right">{t[language].netFees}:</td>
                          <td className="px-3 py-2 text-right">{viewingInvoice.currency} {(feesTotal - retainerApplied).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                
                {/* Expenses/Disbursements Section */}
                {expenseItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">{t[language].disbursements}</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">{t[language].date}</th>
                          <th className="px-3 py-2 text-left">{t[language].description}</th>
                          <th className="px-3 py-2 text-right">{t[language].amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseItems.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-medium">
                        <tr>
                          <td colSpan="2" className="px-3 py-2 text-right">{t[language].disbursements} {t[language].total}:</td>
                          <td className="px-3 py-2 text-right">{viewingInvoice.currency} {expenseTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                
                {/* Invoice Summary */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center text-lg">
                    <span>{t[language].subtotal}:</span>
                    <span>{viewingInvoice.currency} {parseFloat(viewingInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {viewingInvoice.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-green-700">
                      <span>{t[language].discount} ({viewingInvoice.discount_type === 'percentage' ? `${viewingInvoice.discount_value}%` : t[language].fixedFee}):</span>
                      <span>-{viewingInvoice.currency} {parseFloat(viewingInvoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {viewingInvoice.vat_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <span>{t[language].vat} ({viewingInvoice.vat_rate}%):</span>
                      <span>{viewingInvoice.currency} {parseFloat(viewingInvoice.vat_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 mt-2 pt-2">
                    <span>{t[language].total}:</span>
                    <span>{viewingInvoice.currency} {parseFloat(viewingInvoice.total).toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Notes */}
                {viewingInvoice.notes_to_client && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">{t[language].notes}:</p>
                    <p className="mt-1">{viewingInvoice.notes_to_client}</p>
                  </div>
                )}
              </>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t no-print">
              <button onClick={() => window.print()}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t[language].print || 'Print'}
              </button>
              <button onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">
                {t[language].close}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // INVOICES LIST COMPONENT
  // ============================================
  const InvoicesList = () => {
    // Show empty state when no invoices exist
    if (invoices.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t[language].invoices}</h2>
          </div>
          <div className="bg-white rounded-lg shadow">
            <EmptyState
              type="invoices"
              title={t[language].emptyInvoices}
              description={t[language].emptyInvoicesDesc}
              actionLabel={t[language].createInvoice}
              onAction={() => setShowInvoiceForm(true)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].invoices}</h2>
          <button onClick={() => setShowInvoiceForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {t[language].createInvoice}
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].invoiceNumber}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].client}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].issueDate}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].dueDate}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].total}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map(inv => {
                const client = clients.find(c => c.client_id === inv.client_id);
                const statusColors = {
                  draft: 'bg-gray-100 text-gray-800',
                  sent: 'bg-blue-100 text-blue-800',
                  viewed: 'bg-purple-100 text-purple-800',
                  partial: 'bg-yellow-100 text-yellow-800',
                  paid: 'bg-green-100 text-green-800',
                  overdue: 'bg-red-100 text-red-800',
                  cancelled: 'bg-gray-100 text-gray-800'
                };
                return (
                  <tr key={inv.invoice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">{client?.client_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(inv.issue_date)}</td>
                    <td className="px-6 py-4 text-sm">{inv.due_date ? formatDate(inv.due_date) : '--'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{inv.currency} {parseFloat(inv.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[inv.status] || 'bg-gray-100'}`}>
                        {t[language][inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => setViewingInvoice(inv)}
                        className="text-purple-600 hover:text-purple-900 mr-3">{t[language].viewInvoice}</button>
                      {inv.status === 'draft' && (
                        <button onClick={async () => {
                          await window.electronAPI.updateInvoiceStatus(inv.invoice_id, 'sent');
                          await refreshInvoices();
                          showToast(language === 'ar' ? 'تم وضع علامة مرسلة' : 'Invoice marked as sent');
                        }} className="text-blue-600 hover:text-blue-900 mr-3">{t[language].markAsSent}</button>
                      )}
                      {(inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'partial') && (
                        <button onClick={async () => {
                          await window.electronAPI.updateInvoiceStatus(inv.invoice_id, 'paid');
                          await refreshInvoices();
                          showToast(language === 'ar' ? 'تم وضع علامة مدفوعة' : 'Invoice marked as paid');
                        }} className="text-green-600 hover:text-green-900 mr-3">{t[language].markAsPaid}</button>
                      )}
                      <button onClick={() => {
                        showConfirm(
                          language === 'ar' ? 'حذف الفاتورة' : 'Delete Invoice',
                          language === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة؟' : 'Are you sure you want to delete this invoice?',
                          async () => {
                            await window.electronAPI.deleteInvoice(inv.invoice_id);
                            await refreshInvoices();
                            showToast(language === 'ar' ? 'تم حذف الفاتورة' : 'Invoice deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{t[language].delete}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // REPORTS MODULE COMPONENT
  // ============================================
  const ReportsModule = () => {
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    const reports = [
      { id: 'outstanding-receivables', label: t[language].outstandingReceivables || 'Outstanding Receivables', category: 'financial' },
      { id: 'revenue-by-client', label: t[language].revenueByClient || 'Revenue by Client', category: 'financial' },
      { id: 'revenue-by-matter', label: t[language].revenueByMatter || 'Revenue by Matter', category: 'financial' },
      { id: 'retainer-balances', label: t[language].retainerBalances || 'Retainer Balances', category: 'financial' },
      { id: 'time-by-lawyer', label: t[language].timeByLawyer || 'Time by Lawyer', category: 'time' },
      { id: 'time-by-client', label: t[language].timeByClient || 'Time by Client', category: 'time' },
      { id: 'unbilled-time', label: t[language].unbilledTime || 'Unbilled Time', category: 'time' },
      { id: 'active-matters', label: t[language].activeMatters || 'Active Matters', category: 'matters' },
      { id: 'upcoming-hearings', label: t[language].upcomingHearings || 'Upcoming Hearings', category: 'matters' },
      { id: 'pending-judgments', label: t[language].pendingJudgments || 'Pending Judgments', category: 'matters' },
      { id: 'tasks-overdue', label: t[language].overdueTasks || 'Overdue Tasks', category: 'tasks' },
      { id: 'expenses-by-category', label: t[language].expensesByCategory || 'Expenses by Category', category: 'expenses' },
    ];

    const loadReport = async (reportId) => {
      setLoading(true);
      setSelectedReport(reportId);
      try {
        const data = await window.electronAPI.generateReport(reportId);
        setReportData(data || []);
      } catch (error) {
        console.error('Error loading report:', error);
        setReportData([]);
      } finally {
        setLoading(false);
      }
    };

    const formatMinutes = (mins) => {
      if (!mins) return '0h';
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      return `${hours}h ${minutes}m`;
    };

    // Export handler
    const handleExport = async (format) => {
      if (!selectedReport || reportData.length === 0) return;
      
      const reportName = reports.find(r => r.id === selectedReport)?.label || 'Report';
      
      try {
        let result;
        if (format === 'excel') {
          result = await window.electronAPI.exportToExcel(reportData, reportName);
        } else if (format === 'csv') {
          result = await window.electronAPI.exportToCsv(reportData, reportName);
        } else if (format === 'pdf') {
          // Get column headers based on report type
          const columns = Object.keys(reportData[0] || {});
          result = await window.electronAPI.exportToPdf(reportData, reportName, columns);
        }
        
        if (result?.success) {
          // Optionally open the file
          const openFile = window.confirm(`Export successful!\n\nFile saved to:\n${result.filePath}\n\nWould you like to open it?`);
          if (openFile) {
            await window.electronAPI.openFile(result.filePath);
          }
        } else if (!result?.canceled) {
          alert('Export failed: ' + (result?.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
      }
    };

    const renderReportTable = () => {
      if (loading) return <div className="text-center py-8">{t[language].loading}</div>;
      if (!selectedReport) return <div className="text-center py-8 text-gray-500">Select a report to view</div>;
      if (reportData.length === 0) return <div className="text-center py-8 text-gray-500">{t[language].noData}</div>;

      // Render different tables based on report type
      switch (selectedReport) {
        case 'outstanding-receivables':
          return (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map(row => (
                  <tr key={row.invoice_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.invoice_number}</td>
                    <td className="px-4 py-3">{row.client_name}</td>
                    <td className="px-4 py-3">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.days_overdue > 30 ? 'bg-red-100 text-red-800' : row.days_overdue > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {Math.max(0, Math.round(row.days_overdue))} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${row.total?.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan="4" className="px-4 py-3">Total Outstanding</td>
                  <td className="px-4 py-3 text-right">${reportData.reduce((sum, r) => sum + (r.total || 0), 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          );

        case 'time-by-lawyer':
          return (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lawyer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Non-Billable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map(row => (
                  <tr key={row.lawyer_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.lawyer_name || row.full_name}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatMinutes(row.billable_minutes)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatMinutes(row.non_billable_minutes)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMinutes(row.total_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

        case 'active-matters':
        case 'upcoming-hearings':
        case 'pending-judgments':
        case 'tasks-overdue':
          return (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {selectedReport === 'active-matters' ? 'Matter' : selectedReport === 'upcoming-hearings' ? 'Hearing' : selectedReport === 'pending-judgments' ? 'Judgment' : 'Task'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.matter_name || row.title || row.judgment_summary?.substring(0, 50)}</td>
                    <td className="px-4 py-3">{row.client_name}</td>
                    <td className="px-4 py-3">{formatDate(row.hearing_date || row.expected_date || row.due_date || row.opening_date)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

        default:
          return (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {Object.keys(reportData[0] || {}).slice(0, 5).map(key => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.values(row).slice(0, 5).map((val, vidx) => (
                      <td key={vidx} className="px-4 py-3 text-sm">
                        {typeof val === 'number' ? val.toLocaleString() : String(val || '--')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t[language].reports || 'Reports'}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report Selection */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-4">{t[language].selectReport || 'Select Report'}</h3>
            
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t[language].financial || 'Financial'}</h4>
              {reports.filter(r => r.category === 'financial').map(report => (
                <button key={report.id} onClick={() => loadReport(report.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                  {report.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t[language].time || 'Time'}</h4>
              {reports.filter(r => r.category === 'time').map(report => (
                <button key={report.id} onClick={() => loadReport(report.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                  {report.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t[language].matters || 'Matters'}</h4>
              {reports.filter(r => r.category === 'matters').map(report => (
                <button key={report.id} onClick={() => loadReport(report.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                  {report.label}
                </button>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t[language].other || 'Other'}</h4>
              {reports.filter(r => r.category === 'tasks' || r.category === 'expenses').map(report => (
                <button key={report.id} onClick={() => loadReport(report.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                  {report.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report Results */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">
                {selectedReport ? reports.find(r => r.id === selectedReport)?.label : 'Report Results'}
              </h3>
              <div className="flex items-center gap-2">
                {reportData.length > 0 && (
                  <>
                    <span className="text-sm text-gray-500 mr-2">{reportData.length} records</span>
                    <button
                      onClick={() => handleExport('excel')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      title="Export to Excel"
                    >
                      <Download size={14} />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      title="Export to CSV"
                    >
                      <Download size={14} />
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      title="Export to PDF"
                    >
                      <FileText size={14} />
                      PDF
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              {renderReportTable()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SETTINGS MODULE COMPONENT
  // ============================================
  const SettingsModule = () => {
    const [settingsTab, setSettingsTab] = useState('firmInfo');
    const [firmInfo, setFirmInfo] = useState({
      firm_name: '', firm_name_arabic: '', firm_address: '', firm_phone: '', firm_email: '',
      firm_website: '', firm_vat_number: '', default_currency: 'USD', default_vat_rate: '11'
    });
    const [firmSaving, setFirmSaving] = useState(false);

    // Load firm info on mount
    useEffect(() => {
      const loadFirmInfo = async () => {
        try {
          const info = await window.electronAPI.getFirmInfo();
          if (info) setFirmInfo(prev => ({ ...prev, ...info }));
        } catch (error) {
          console.error('Error loading firm info:', error);
        }
      };
      loadFirmInfo();
    }, []);

    const handleSaveFirmInfo = async () => {
      setFirmSaving(true);
      try {
        await window.electronAPI.saveFirmInfo(firmInfo);
        alert(t[language].saved || 'Saved successfully');
      } catch (error) {
        console.error('Error saving firm info:', error);
      } finally {
        setFirmSaving(false);
      }
    };

    const lookupTabs = [
      { id: 'lawyers', label: t[language].lawyers, addLabel: t[language].addLawyer },
      { id: 'courtTypes', label: t[language].courtTypes, addLabel: t[language].addCourtType },
      { id: 'regions', label: t[language].regions, addLabel: t[language].addRegion },
      { id: 'hearingPurposes', label: t[language].hearingPurposes, addLabel: t[language].addPurpose },
      { id: 'taskTypes', label: t[language].taskTypes, addLabel: t[language].addTaskType },
      { id: 'expenseCategories', label: t[language].expenseCategories, addLabel: t[language].addCategory },
    ];

    const getCurrentData = () => {
      switch (currentLookupType) {
        case 'lawyers': return lawyers;
        case 'courtTypes': return courtTypes;
        case 'regions': return regions;
        case 'hearingPurposes': return hearingPurposes;
        case 'taskTypes': return taskTypes;
        case 'expenseCategories': return expenseCategories;
        default: return [];
      }
    };

    const handleDelete = async (item) => {
      if (item.is_system === 1) {
        showToast(t[language].cannotDeleteSystem, 'error');
        return;
      }
      showConfirm(
        language === 'ar' ? 'حذف العنصر' : 'Delete Item',
        t[language].confirmDelete,
        async () => {
          try {
            await window.electronAPI.deleteLookupItem(currentLookupType, item);
            await refreshLookups();
            showToast(language === 'ar' ? 'تم حذف العنصر' : 'Item deleted');
            hideConfirm();
          } catch (error) {
            console.error('Error deleting item:', error);
            showToast(language === 'ar' ? 'خطأ في الحذف' : 'Error deleting item', 'error');
          }
        }
      );
    };

    const handleEdit = (item) => {
      setEditingLookup(item);
      setShowLookupForm(true);
    };

    const currentTab = lookupTabs.find(tab => tab.id === currentLookupType);
    const data = getCurrentData();

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t[language].settings}</h2>
        
        {/* Main Settings Tabs */}
        <div className="flex gap-4 border-b">
          <button onClick={() => setSettingsTab('firmInfo')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${settingsTab === 'firmInfo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t[language].firmInfo || 'Firm Information'}
          </button>
          <button onClick={() => setSettingsTab('lookups')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${settingsTab === 'lookups' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t[language].lookups || 'Lookups & Lists'}
          </button>
          <button onClick={() => setSettingsTab('backup')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${settingsTab === 'backup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t[language].backupRestore || 'Backup & Restore'}
          </button>
        </div>

        {/* Firm Info Tab */}
        {settingsTab === 'firmInfo' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{t[language].firmInfo || 'Firm Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].firmName || 'Firm Name'}</label>
                <input type="text" value={firmInfo.firm_name}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].firmNameArabic || 'Firm Name (Arabic)'}</label>
                <input type="text" dir="rtl" value={firmInfo.firm_name_arabic}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_name_arabic: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">{t[language].address || 'Address'}</label>
                <textarea value={firmInfo.firm_address} rows="2"
                  onChange={(e) => setFirmInfo({...firmInfo, firm_address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].phone || 'Phone'}</label>
                <input type="tel" value={firmInfo.firm_phone}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].email || 'Email'}</label>
                <input type="email" value={firmInfo.firm_email}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].website || 'Website'}</label>
                <input type="url" value={firmInfo.firm_website}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_website: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].vatNumber || 'VAT Number'}</label>
                <input type="text" value={firmInfo.firm_vat_number}
                  onChange={(e) => setFirmInfo({...firmInfo, firm_vat_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].defaultCurrency || 'Default Currency'}</label>
                <select value={firmInfo.default_currency}
                  onChange={(e) => setFirmInfo({...firmInfo, default_currency: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="LBP">LBP</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].defaultVatRate || 'Default VAT Rate (%)'}</label>
                <input type="number" step="0.01" value={firmInfo.default_vat_rate}
                  onChange={(e) => setFirmInfo({...firmInfo, default_vat_rate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveFirmInfo} disabled={firmSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {firmSaving ? (t[language].saving || 'Saving...') : (t[language].save || 'Save')}
              </button>
            </div>
          </div>
        )}

        {/* Lookups Tab */}
        {settingsTab === 'lookups' && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex flex-wrap gap-1 p-2">
              {lookupTabs.map(tab => (
                <button key={tab.id}
                  onClick={() => setCurrentLookupType(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentLookupType === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{currentTab?.label}</h3>
              <button onClick={() => { setEditingLookup(null); setShowLookupForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="w-4 h-4" /> {currentTab?.addLabel}
              </button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].nameEn}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].nameAr}</th>
                    {currentLookupType === 'lawyers' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].initials}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].hourlyRate}</th>
                      </>
                    )}
                    {currentLookupType === 'taskTypes' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].icon}</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t[language].status}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">{t[language].noData}</td></tr>
                  ) : (
                    data.map((item, index) => {
                      const idField = currentLookupType === 'lawyers' ? 'lawyer_id' :
                                     currentLookupType === 'courtTypes' ? 'court_type_id' :
                                     currentLookupType === 'regions' ? 'region_id' :
                                     currentLookupType === 'hearingPurposes' ? 'purpose_id' :
                                     currentLookupType === 'taskTypes' ? 'task_type_id' :
                                     'category_id';
                      return (
                        <tr key={item[idField] || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{item.name_en || item.full_name}</td>
                          <td className="px-4 py-3 text-sm">{item.name_ar || item.full_name_arabic || '--'}</td>
                          {currentLookupType === 'lawyers' && (
                            <>
                              <td className="px-4 py-3 text-sm">{item.initials || '--'}</td>
                              <td className="px-4 py-3 text-sm">${item.hourly_rate || 0}</td>
                            </>
                          )}
                          {currentLookupType === 'taskTypes' && (
                            <td className="px-4 py-3 text-sm">{item.icon || '📋'}</td>
                          )}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.is_system === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {item.is_system === 1 ? t[language].systemDefault : t[language].userDefined}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(item)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {item.is_system !== 1 && (
                                <button onClick={() => handleDelete(item)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Backup & Restore Tab */}
        {settingsTab === 'backup' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-6">{t[language].backupRestore || 'Backup & Restore'}</h3>
            
            <div className="space-y-6">
              {/* Backup Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{t[language].backup || 'Backup Database'}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create a backup of all your data. You can restore from this backup later.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.backupDatabase();
                      if (result?.success) {
                        alert(`Backup saved successfully to:\n${result.filePath}`);
                      } else if (!result?.canceled) {
                        alert('Backup failed: ' + (result?.error || 'Unknown error'));
                      }
                    } catch (error) {
                      alert('Backup failed: ' + error.message);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Download size={18} />
                  {t[language].createBackup || 'Create Backup'}
                </button>
              </div>

              {/* Restore Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{t[language].restore || 'Restore Database'}</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Restore your data from a previous backup file.
                </p>
                <p className="text-sm text-red-600 mb-4">
                  âš ï¸ Warning: This will replace ALL current data with the backup data.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.restoreDatabase();
                      if (result?.success) {
                        alert(result.message || 'Restore successful. Please restart the application.');
                      } else if (!result?.canceled) {
                        alert('Restore failed: ' + (result?.error || 'Unknown error'));
                      }
                    } catch (error) {
                      alert('Restore failed: ' + error.message);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  <Upload size={18} />
                  {t[language].restoreBackup || 'Restore from Backup'}
                </button>
              </div>

              {/* Export All Data Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{t[language].exportAll || 'Export All Data'}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export all your data to an Excel file with multiple sheets (Clients, Matters, Hearings, etc.).
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.exportAllData();
                      if (result?.success) {
                        const openFile = window.confirm(`Export successful!\n\nFile saved to:\n${result.filePath}\n\nWould you like to open it?`);
                        if (openFile) {
                          await window.electronAPI.openFile(result.filePath);
                        }
                      } else if (!result?.canceled) {
                        alert('Export failed: ' + (result?.error || 'Unknown error'));
                      }
                    } catch (error) {
                      alert('Export failed: ' + error.message);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FileText size={18} />
                  {t[language].exportToExcel || 'Export to Excel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // LOOKUP FORM COMPONENT
  // ============================================
  const LookupForm = () => {
    const isLawyer = currentLookupType === 'lawyers';
    const isTaskType = currentLookupType === 'taskTypes';
    
    const [formData, setFormData] = useState(editingLookup || {
      name_en: '', name_ar: '', full_name: '', full_name_arabic: '',
      initials: '', hourly_rate: '', icon: '📋', active: 1
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (editingLookup) {
          await window.electronAPI.updateLookupItem(currentLookupType, formData);
        } else {
          await window.electronAPI.addLookupItem(currentLookupType, formData);
        }
        await refreshLookups();
        showToast(editingLookup 
          ? (language === 'ar' ? 'تم تحديث العنصر بنجاح' : 'Item updated successfully')
          : (language === 'ar' ? 'تم إضافة العنصر بنجاح' : 'Item added successfully'));
        setShowLookupForm(false);
        setEditingLookup(null);
      } catch (error) {
        console.error('Error saving lookup item:', error);
        showToast(language === 'ar' ? 'خطأ في الحفظ' : 'Error saving: ' + error.message, 'error');
      }
    };

    const currentTab = [
      { id: 'lawyers', label: t[language].lawyers },
      { id: 'courtTypes', label: t[language].courtTypes },
      { id: 'regions', label: t[language].regions },
      { id: 'hearingPurposes', label: t[language].hearingPurposes },
      { id: 'taskTypes', label: t[language].taskTypes },
      { id: 'expenseCategories', label: t[language].expenseCategories },
    ].find(tab => tab.id === currentLookupType);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full max-w-md ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingLookup ? t[language].edit : t[language].addNew} - {currentTab?.label}
              </h2>
              <button onClick={() => { setShowLookupForm(false); setEditingLookup(null); }}
                className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isLawyer ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].nameEn} *</label>
                    <input type="text" required value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].nameAr}</label>
                    <input type="text" value={formData.full_name_arabic}
                      onChange={(e) => setFormData({...formData, full_name_arabic: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].initials}</label>
                      <input type="text" value={formData.initials} maxLength="5"
                        onChange={(e) => setFormData({...formData, initials: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].hourlyRate}</label>
                      <input type="number" value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].nameEn} *</label>
                    <input type="text" required value={formData.name_en}
                      onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].nameAr}</label>
                    <input type="text" value={formData.name_ar}
                      onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  {isTaskType && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t[language].icon}</label>
                      <input type="text" value={formData.icon} maxLength="4"
                        onChange={(e) => setFormData({...formData, icon: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md text-2xl"
                        placeholder="📋" />
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowLookupForm(false); setEditingLookup(null); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t[language].save}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // TIME TRACKING TIMER WIDGET
  // ============================================
  const TimerWidget = () => {
    // Local state for narrative to prevent focus loss while typing
    const [localNarrative, setLocalNarrative] = useState(timerNarrative);
    
    // Sync local narrative when parent changes (e.g., on load from localStorage)
    useEffect(() => {
      setLocalNarrative(timerNarrative);
    }, [timerNarrative]);
    
    // Format seconds as HH:MM:SS
    const formatTime = (totalSeconds) => {
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get filtered matters for selected client
    const filteredMatters = timerClientId 
      ? matters.filter(m => m.client_id === timerClientId)
      : [];

    // Track if currently saving to prevent double-clicks
    const [isSaving, setIsSaving] = useState(false);

    // Start timer
    const handleStart = (e) => {
      e.stopPropagation();
      setTimerRunning(true);
      saveTimerState(true, timerSeconds, Date.now() - (timerSeconds * 1000));
    };

    // Pause timer
    const handlePause = (e) => {
      e.stopPropagation();
      setTimerRunning(false);
      saveTimerState(false, timerSeconds);
    };

    // Discard timer
    const handleDiscard = (e) => {
      e.stopPropagation();
      if (timerSeconds > 0) {
        showConfirm(
          language === 'ar' ? 'تجاهل الوقت' : 'Discard Time',
          t[language].confirmDiscardTimer,
          () => {
            setTimerRunning(false);
            setTimerSeconds(0);
            setTimerClientId('');
            setTimerMatterId('');
            setTimerNarrative('');
            setLocalNarrative('');
            localStorage.removeItem('qanuni_timer');
            hideConfirm();
          }
        );
      } else {
        setTimerExpanded(false);
      }
    };

    // Actually save the timesheet
    const doSave = async () => {
      if (isSaving) return;
      setIsSaving(true);
      
      try {
        const lawyer = lawyers.find(l => l.lawyer_id == timerLawyerId);
        const minutes = Math.ceil(timerSeconds / 60);
        
        const timesheetData = {
          lawyer_id: timerLawyerId || lawyers[0]?.lawyer_id || '',
          client_id: timerClientId,
          matter_id: timerMatterId,
          date: new Date().toISOString().split('T')[0],
          minutes: minutes,
          narrative: localNarrative || '',
          billable: true,
          rate_per_hour: lawyer?.hourly_rate || 0
        };

        await window.electronAPI.addTimesheet(timesheetData);
        await refreshTimesheets();
        
        // Reset timer
        setTimerRunning(false);
        setTimerSeconds(0);
        setTimerClientId('');
        setTimerMatterId('');
        setTimerNarrative('');
        setLocalNarrative('');
        setTimerExpanded(false);
        localStorage.removeItem('qanuni_timer');
        
        showToast(t[language].timerSaved);
      } catch (error) {
        console.error('Error saving timesheet:', error);
        showToast(language === 'ar' ? 'خطأ في حفظ سجل الوقت' : 'Error saving time entry', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    // Save to timesheet with narrative check
    const handleSave = (e) => {
      e.stopPropagation();
      
      if (!timerMatterId) {
        showToast(t[language].selectMatterForTimer, 'error');
        return;
      }
      if (timerSeconds < 60) {
        showToast(language === 'ar' ? 'الحد الأدنى دقيقة واحدة' : 'Minimum 1 minute required', 'error');
        return;
      }
      
      // Check if narrative is empty and prompt user
      if (!localNarrative || !localNarrative.trim()) {
        showConfirm(
          language === 'ar' ? 'الوصف فارغ' : 'No Description',
          language === 'ar' 
            ? 'لم تكتب وصف للعمل. هل تريد الحفظ بدون وصف؟' 
            : 'You haven\'t written a work description. Save without description?',
          () => {
            hideConfirm();
            doSave();
          }
        );
        return;
      }
      
      doSave();
    };

    // Update localStorage when dropdown fields change (not narrative - that would lag)
    useEffect(() => {
      if (timerClientId || timerMatterId || timerLawyerId) {
        const timerState = {
          clientId: timerClientId,
          matterId: timerMatterId,
          narrative: localNarrative,
          lawyerId: timerLawyerId,
          running: timerRunning,
          startTime: timerRunning ? Date.now() - (timerSeconds * 1000) : null,
          pausedSeconds: timerRunning ? 0 : timerSeconds
        };
        localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
      }
    }, [timerClientId, timerMatterId, timerLawyerId, timerRunning]);

    // Save narrative to localStorage and parent state on blur (not on every keystroke)
    const handleNarrativeBlur = () => {
      // Sync to parent state
      setTimerNarrative(localNarrative);
      // Save to localStorage
      const saved = localStorage.getItem('qanuni_timer');
      if (saved) {
        const timerState = JSON.parse(saved);
        timerState.narrative = localNarrative;
        localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
      }
    };

    // Minimized view (floating button)
    if (!timerExpanded) {
      return (
        <button
          onClick={() => setTimerExpanded(true)}
          className={`fixed bottom-20 ${isRTL ? 'left-4' : 'right-4'} z-40 p-4 rounded-full shadow-lg transition-all hover:scale-105 ${
            timerRunning 
              ? 'bg-green-500 text-white animate-pulse' 
              : timerSeconds > 0 
                ? 'bg-yellow-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={timerRunning ? `${t[language].timerRunning}: ${formatTime(timerSeconds)}` : t[language].timer}
        >
          <Timer className="w-6 h-6" />
          {(timerRunning || timerSeconds > 0) && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {formatTime(timerSeconds)}
            </span>
          )}
        </button>
      );
    }

    // Expanded view
    return (
      <div className={`fixed bottom-20 ${isRTL ? 'left-4' : 'right-4'} z-40 w-80 bg-white rounded-lg shadow-2xl border ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b ${timerRunning ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${timerRunning ? 'text-green-600' : 'text-gray-600'}`} />
            <span className="font-semibold">{t[language].quickTimer}</span>
            {timerRunning && (
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                {language === 'ar' ? 'يعمل' : 'RUNNING'}
              </span>
            )}
            {!timerRunning && timerSeconds > 0 && (
              <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                {t[language].timerPaused}
              </span>
            )}
          </div>
          <button onClick={() => setTimerExpanded(false)} className="p-1 hover:bg-gray-200 rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="p-4 text-center bg-gradient-to-b from-gray-50 to-white">
          <div className={`text-4xl font-mono font-bold ${timerRunning ? 'text-green-600' : 'text-gray-800'}`}>
            {formatTime(timerSeconds)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2 p-3 border-t border-b bg-gray-50">
          {!timerRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              {timerSeconds > 0 ? t[language].resumeTimer : t[language].startTimer}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              <Pause className="w-4 h-4" />
              {t[language].pauseTimer}
            </button>
          )}
          {timerSeconds > 0 && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
            >
              <Square className="w-4 h-4" />
              {t[language].discardTimer}
            </button>
          )}
        </div>

        {/* Form Fields */}
        <div className="p-3 space-y-3">
          {/* Lawyer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].lawyer}</label>
            <select
              value={timerLawyerId}
              onChange={(e) => setTimerLawyerId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border rounded-md"
            >
              <option value="">-- {t[language].select} --</option>
              {lawyers.map(lawyer => (
                <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                  {language === 'ar' && lawyer.full_name_arabic ? lawyer.full_name_arabic : lawyer.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].client}</label>
            <select
              value={timerClientId}
              onChange={(e) => { setTimerClientId(e.target.value); setTimerMatterId(''); }}
              className="w-full px-2 py-1.5 text-sm border rounded-md"
            >
              <option value="">-- {t[language].selectClient} --</option>
              {clients.map(client => (
                <option key={client.client_id} value={client.client_id}>
                  {language === 'ar' && client.client_name_arabic ? client.client_name_arabic : client.client_name}
                </option>
              ))}
            </select>
          </div>

          {/* Matter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].matter} *</label>
            <select
              value={timerMatterId}
              onChange={(e) => setTimerMatterId(e.target.value)}
              disabled={!timerClientId}
              className={`w-full px-2 py-1.5 text-sm border rounded-md ${!timerClientId ? 'bg-gray-100' : ''}`}
            >
              <option value="">{timerClientId ? `-- ${t[language].selectMatter} --` : t[language].selectClientFirst}</option>
              {filteredMatters.map(matter => (
                <option key={matter.matter_id} value={matter.matter_id}>
                  {language === 'ar' && matter.matter_name_arabic ? matter.matter_name_arabic : matter.matter_name}
                </option>
              ))}
            </select>
          </div>

          {/* Narrative */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].narrative}</label>
            {timerRunning ? (
              <div className="w-full px-2 py-3 text-sm border rounded-md bg-gray-50 text-gray-400 italic">
                {language === 'ar' 
                  ? 'أوقف المؤقت مؤقتاً لكتابة الوصف...' 
                  : 'Pause timer to write description...'}
              </div>
            ) : (
              <textarea
                value={localNarrative}
                onChange={(e) => setLocalNarrative(e.target.value)}
                onBlur={handleNarrativeBlur}
                placeholder={t[language].workDescription}
                rows="2"
                className="w-full px-2 py-1.5 text-sm border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={!timerMatterId || timerSeconds < 60 || timerRunning || isSaving}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              timerMatterId && timerSeconds >= 60 && !timerRunning && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : timerRunning ? (
              <>
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'أوقف المؤقت أولاً' : 'Pause timer first'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t[language].saveTime} ({Math.ceil(timerSeconds / 60)} {t[language].minutes})
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // LOADING SCREEN
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">{t[language].loading}</div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`min-h-screen bg-gray-100 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-md lg:hidden">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold text-blue-600">{t[language].appName}</h1>
          </div>
          <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50">
            <Globe className="w-5 h-5" />
            {language === 'en' ? 'عربي' : 'English'}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 bg-white shadow-sm min-h-screen`}>
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', icon: BarChart3, label: t[language].dashboard },
              { id: 'calendar', icon: CalendarDays, label: t[language].calendar },
              { id: 'clients', icon: Users, label: t[language].clients },
              { id: 'matters', icon: Briefcase, label: t[language].matters },
              { id: 'hearings', icon: Gavel, label: t[language].hearings },
              { id: 'judgments', icon: Scale, label: t[language].judgments },
              { id: 'deadlines', icon: AlertTriangle, label: t[language].deadlines },
              { id: 'tasks', icon: ClipboardList, label: t[language].tasks },
              { id: 'appointments', icon: Calendar, label: t[language].appointments },
              { id: 'timesheets', icon: Clock, label: t[language].timesheets },
              { id: 'expenses', icon: Receipt, label: t[language].expenses },
              { id: 'advances', icon: Wallet, label: t[language].advances },
              { id: 'invoices', icon: FileText, label: t[language].invoices },
              { id: 'reports', icon: PieChart, label: t[language].reports || 'Reports' },
              { id: 'settings', icon: Settings, label: t[language].settings },
            ].map(item => (
              <button key={item.id} onClick={() => handleModuleChange(item.id)}
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
          {currentModule === 'dashboard' && <Dashboard />}
          {currentModule === 'calendar' && <CalendarModule />}
          {currentModule === 'clients' && <ClientsList />}
          {currentModule === 'matters' && <MattersList />}
          {currentModule === 'hearings' && <HearingsList />}
          {currentModule === 'judgments' && <JudgmentsList />}
          {currentModule === 'deadlines' && <DeadlinesList />}
          {currentModule === 'tasks' && <TasksList />}
          {currentModule === 'appointments' && <AppointmentsList />}
          {currentModule === 'timesheets' && <TimesheetsList />}
          {currentModule === 'expenses' && <ExpensesList />}
          {currentModule === 'advances' && <AdvancesList />}
          {currentModule === 'invoices' && <InvoicesList />}
          {currentModule === 'reports' && <ReportsModule />}
          {currentModule === 'settings' && <SettingsModule />}
        </div>
      </div>

      {/* Modals */}
      {showClientForm && <ClientForm />}
      {showMatterForm && <MatterForm />}
      {showHearingForm && <HearingForm />}
      {showTaskForm && <TaskForm />}
      {showTimesheetForm && <TimesheetForm />}
      {showJudgmentForm && <JudgmentForm />}
      {showAppointmentForm && <AppointmentForm />}
      {showExpenseForm && <ExpenseForm />}
      {showAdvanceForm && <AdvanceForm />}
      {showDeadlineForm && <DeadlineForm />}
      {showInvoiceForm && <InvoiceForm />}
      {viewingInvoice && <InvoiceViewModal />}
      {showLookupForm && <LookupForm />}
      
      {/* Time Tracking Timer Widget */}
      <TimerWidget />
      
      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      
      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); }}
        onCancel={() => { hideConfirm(); setPendingNavigation(null); }}
        confirmText={
          confirmDialog.title?.includes('Unsaved') || confirmDialog.title?.includes('غير محفوظة')
            ? (language === 'ar' ? 'متابعة' : 'Continue')
            : confirmDialog.title?.includes('Description') || confirmDialog.title?.includes('الوصف')
              ? (language === 'ar' ? 'حفظ على أي حال' : 'Save Anyway')
              : (language === 'ar' ? 'حذف' : 'Delete')
        }
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        danger={
          !confirmDialog.title?.includes('Unsaved') && 
          !confirmDialog.title?.includes('غير محفوظة') &&
          !confirmDialog.title?.includes('Description') &&
          !confirmDialog.title?.includes('الوصف')
        }
      />
      
      {/* Print Styles */}
      <PrintStyles />
    </div>
  );
};

export default App;
