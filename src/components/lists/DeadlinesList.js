import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, ExternalLink, Calendar, Clock, Gavel, FileText, 
  ClipboardList, ChevronDown, ChevronRight, Search, X,
  Check, RotateCcw
} from 'lucide-react';
import { EmptyState } from '../common';
import ExportButtons from '../common/ExportButtons';
import { useFilters } from '../../hooks/useFilters';
/**
 * DeadlinesList Component - v46.33
 * 
 * v46.33 Changes:
 * - Added progress bar (visual countdown)
 * - Added "Go to Source" prominent button
 * - Added "Mark as Handled" toggle (replaces "Complete")
 * - Added Export dropdown (Excel, PDF, Print)
 * - Updated terminology: "Completed" → "Handled"
 * - Removed edit/delete buttons (deadlines are derived, edit at source)
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
};

// Filter Chip component
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

// Progress Bar Component
const DeadlineProgressBar = ({ daysRemaining, totalDays = 30, isHandled }) => {
  if (isHandled) return null;
  
  // Calculate progress (how much time has elapsed)
  const elapsed = Math.max(0, totalDays - daysRemaining);
  const percentElapsed = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  
  // Color based on urgency
  const getBarColor = () => {
    if (daysRemaining < 0) return 'bg-red-500'; // Overdue
    if (daysRemaining <= 3) return 'bg-red-500'; // Critical
    if (daysRemaining <= 7) return 'bg-yellow-500'; // Warning
    return 'bg-green-500'; // OK
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
      <div 
        className={`h-1.5 rounded-full transition-all ${getBarColor()}`}
        style={{ width: `${percentElapsed}%` }}
      />
    </div>
  );
};


// Date Filter Dropdown with presets
const DateFilterDropdown = ({ value, dateFrom, dateTo, onPresetChange, onCustomChange, isOpen, onToggle, onClose }) => {
  const dropdownRef = useRef(null);
  const [showCustom, setShowCustom] = useState(value === 'custom');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const isFiltered = value && value !== 'all';
  const presets = [
    { value: 'all', label: 'All Dates' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month Revenue' },
    { value: 'next30', label: 'Next 30 Days' },
    { value: 'custom', label: 'Custom Range...' }
  ];

  const getPresetLabel = () => {
    if (value === 'custom' && (dateFrom || dateTo)) {
      if (dateFrom && dateTo) return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
      if (dateFrom) return `From ${formatDate(dateFrom)}`;
      if (dateTo) return `Until ${formatDate(dateTo)}`;
    }
    return presets.find(p => p.value === value)?.label || ('Date Range');
  };

  const handlePresetClick = (preset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onPresetChange(preset);
      onClose();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md transition w-full justify-between
          ${isFiltered ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
      >
        <span className="truncate">{getPresetLabel()}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[220px]">
          {presets.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePresetClick(opt.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${value === opt.value ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              {opt.label}
            </button>
          ))}
          {showCustom && (
            <div className="border-t p-3 space-y-2">
              <div>
                <label className="text-xs text-gray-500">{'From *'}</label>
                <input
                  type="date"
                  value={dateFrom || ''}
                  onChange={(e) => onCustomChange('dateFrom', e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{'To *'}</label>
                <input
                  type="date"
                  value={dateTo || ''}
                  onChange={(e) => onCustomChange('dateTo', e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <button
                onClick={() => { onPresetChange('custom'); onClose(); }}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {'Apply'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Dropdown Filter component for column-style filtering
const FilterDropdown = ({ label, value, options, onChange, isOpen, onToggle, onClose, disabled }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const isFiltered = value && value !== '' && value !== 'all';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition w-full justify-between
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
          ${isFiltered ? 'border-blue-500 text-blue-600' : 'border-gray-300'}`}
      >
        <span className="truncate">{options.find(o => o.value === value)?.label || label}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-full max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); onClose(); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${value === opt.value ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DeadlinesList = ({
  deadlines,
  clients,
  matters,
  judgments,
  tasks,
  onViewJudgment,
  onViewTask,
  onViewMatter,
  onUpdateDeadlineStatus,
  showToast
}) => {
  const { filters: deadlineFilters, page: deadlinePage, pageSize: deadlinePageSize, setFilter: _dlSetFilter, setPage: setDeadlinePage, setPageSize: setDeadlinePageSize } = useFilters('deadlines');
  const setDeadlineFilters = (updaterOrValue) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(deadlineFilters) : updaterOrValue;
    Object.keys(next).forEach(k => _dlSetFilter(k, next[k]));
  };
  const [statusFilter, setStatusFilter] = useState('active');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'judgment', 'task', 'matter'
  const [collapsedSections, setCollapsedSections] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const [datePreset, setDatePreset] = useState('all');
  
  const today = new Date().toISOString().split('T')[0];

  // Get date range based on preset
  const getDateRange = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    switch (preset) {
      case 'overdue':
        return { dateFrom: '', dateTo: new Date(now.getTime() - 86400000).toISOString().split('T')[0] };
      case 'today':
        return { dateFrom: todayStr, dateTo: todayStr };
      case 'thisWeek': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { dateFrom: weekStart.toISOString().split('T')[0], dateTo: weekEnd.toISOString().split('T')[0] };
      }
      case 'thisMonth': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { dateFrom: monthStart.toISOString().split('T')[0], dateTo: monthEnd.toISOString().split('T')[0] };
      }
      case 'next30': {
        const future = new Date(now);
        future.setDate(now.getDate() + 30);
        return { dateFrom: todayStr, dateTo: future.toISOString().split('T')[0] };
      }
      default:
        return { dateFrom: '', dateTo: '' };
    }
  };

  const getDaysUntil = (dateStr) => {
    const deadline = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  };

  const getWeekEnd = () => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return end.toISOString().split('T')[0];
  };

  const weekEnd = getWeekEnd();

  // Determine source type
  const getSourceType = (deadline) => {
    if (deadline.judgment_id) return 'judgment';
    if (deadline.task_id) return 'task';
    return 'matter';
  };

  // Source info with styling
  const sourceConfig = {
    judgment: {
      icon: Gavel,
      label: 'Judgment',
      labelFull: 'From Judgments',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-300',
      hoverBg: 'hover:bg-purple-200'
    },
    task: {
      icon: ClipboardList,
      label: 'Task',
      labelFull: 'From Tasks',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      hoverBg: 'hover:bg-blue-200'
    },
    matter: {
      icon: FileText,
      label: 'Matter',
      labelFull: 'From Matters',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      hoverBg: 'hover:bg-green-200'
    }
  };

  const getSourceInfo = (deadline) => {
    const sourceType = getSourceType(deadline);
    const config = sourceConfig[sourceType];
    
    if (sourceType === 'judgment') {
      const judgment = judgments?.find(j => j.judgment_id === deadline.judgment_id);
      return { ...config, source: judgment, title: judgment?.judgment_type || deadline.title, 
               onClick: () => judgment && onViewJudgment?.(judgment) };
    }
    if (sourceType === 'task') {
      const task = tasks?.find(t => t.task_id === deadline.task_id);
      return { ...config, source: task, title: task?.title || deadline.title,
               onClick: () => task && onViewTask?.(task) };
    }
    const matter = matters?.find(m => m.matter_id === deadline.matter_id);
    return { ...config, source: matter, title: matter?.matter_name || deadline.title,
             onClick: () => matter && onViewMatter?.(matter) };
  };

  // SMART SEARCH: Search across Client, Matter, and Title
  const matchesSearch = (deadline, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Check title
    if (deadline.title?.toLowerCase().includes(term)) return true;
    
    // Check client name
    const client = deadline.client_name || clients.find(c => c.client_id === deadline.client_id)?.client_name;
    if (client?.toLowerCase().includes(term)) return true;
    
    // Check matter name
    const matter = deadline.matter_name || matters.find(m => m.matter_id === deadline.matter_id)?.matter_name;
    if (matter?.toLowerCase().includes(term)) return true;
    
    // Check notes
    if (deadline.notes?.toLowerCase().includes(term)) return true;
    
    return false;
  };

  // Filter deadlines
  const filteredDeadlines = useMemo(() => {
    return deadlines
      .filter(d => {
        // Status filter (updated: 'completed' → 'handled')
        if (statusFilter === 'active') return d.status !== 'handled' && d.status !== 'completed';
        if (statusFilter === 'overdue') return d.status !== 'handled' && d.status !== 'completed' && d.deadline_date < today;
        if (statusFilter === 'thisWeek') return d.status !== 'handled' && d.status !== 'completed' && d.deadline_date >= today && d.deadline_date <= weekEnd;
        if (statusFilter === 'handled') return d.status === 'handled' || d.status === 'completed';
        return true;
      })
      .filter(d => {
        // Source filter
        if (sourceFilter === 'all') return true;
        return getSourceType(d) === sourceFilter;
      })
      .filter(d => {
        // Additional filters
        if (deadlineFilters.clientId && String(d.client_id) !== String(deadlineFilters.clientId)) return false;
        if (deadlineFilters.matterId && String(d.matter_id) !== String(deadlineFilters.matterId)) return false;
        if (deadlineFilters.priority && d.priority !== deadlineFilters.priority) return false;
        if (deadlineFilters.dateFrom && d.deadline_date < deadlineFilters.dateFrom) return false;
        if (deadlineFilters.dateTo && d.deadline_date > deadlineFilters.dateTo) return false;
        
        // Smart search
        if (deadlineFilters.search && !matchesSearch(d, deadlineFilters.search)) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort: overdue first, then by date
        const aOverdue = (a.status !== 'handled' && a.status !== 'completed') && a.deadline_date < today;
        const bOverdue = (b.status !== 'handled' && b.status !== 'completed') && b.deadline_date < today;
        if (aOverdue && !bOverdue) return -1;
        if (bOverdue && !aOverdue) return 1;
        return new Date(a.deadline_date) - new Date(b.deadline_date);
      });
  }, [deadlines, statusFilter, sourceFilter, deadlineFilters, today, weekEnd, clients, matters]);

  // Group by source type
  const groupedDeadlines = useMemo(() => {
    const groups = { judgment: [], task: [], matter: [] };
    filteredDeadlines.forEach(d => {
      groups[getSourceType(d)].push(d);
    });
    return groups;
  }, [filteredDeadlines]);

  // Counts (unfiltered for summary cards) - updated terminology
  const overdueCount = deadlines.filter(d => d.status !== 'handled' && d.status !== 'completed' && d.deadline_date < today).length;
  const thisWeekCount = deadlines.filter(d => d.status !== 'handled' && d.status !== 'completed' && d.deadline_date >= today && d.deadline_date <= weekEnd).length;
  const activeCount = deadlines.filter(d => d.status !== 'handled' && d.status !== 'completed').length;
  const handledCount = deadlines.filter(d => d.status === 'handled' || d.status === 'completed').length;

  // Source counts
  const sourceCounts = {
    judgment: deadlines.filter(d => d.judgment_id).length,
    task: deadlines.filter(d => d.task_id).length,
    matter: deadlines.filter(d => !d.judgment_id && !d.task_id).length
  };

  // Cascading: Filtered matters based on client selection
  const availableMatters = deadlineFilters.clientId 
    ? matters.filter(m => String(m.client_id) === String(deadlineFilters.clientId))
    : [];

  const handleFilterChange = (field, value) => {
    setDeadlineFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      if (field === 'clientId') newFilters.matterId = '';
      return newFilters;
    });
    setDeadlinePage(1);
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setDeadlineFilters(prev => ({ ...prev, ...range }));
    }
    setDeadlinePage(1);
  };

  const handleCustomDateChange = (field, value) => {
    setDeadlineFilters(prev => ({ ...prev, [field]: value }));
    setDatePreset('custom');
  };

  const clearAllFilters = () => {
    setDeadlineFilters({ clientId: '', matterId: '', priority: '', dateFrom: '', dateTo: '', search: '' });
    setStatusFilter('active');
    setSourceFilter('all');
    setDatePreset('all');
    setDeadlinePage(1);
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'status':
        setStatusFilter('active');
        break;
      case 'source':
        setSourceFilter('all');
        break;
      case 'client':
        handleFilterChange('clientId', '');
        break;
      case 'matter':
        handleFilterChange('matterId', '');
        break;
      case 'priority':
        handleFilterChange('priority', '');
        break;
      case 'date':
        setDatePreset('all');
        setDeadlineFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        break;
      case 'search':
        handleFilterChange('search', '');
        break;
    }
  };

  // Build active filter chips - updated terminology
  const getActiveFilters = () => {
    const chips = [];
    
    // Status (only if not default 'active')
    if (statusFilter !== 'active') {
      const statusLabels = { 
        overdue: 'Overdue', 
        thisWeek: 'This Week', 
        handled: 'Handled', 
        all: 'All' 
      };
      chips.push({ key: 'status', label: `${'Status'}: ${statusLabels[statusFilter]}` });
    }
    
    // Source (only if not 'all')
    if (sourceFilter !== 'all') {
      chips.push({ key: 'source', label: `${'Source'}: ${sourceConfig[sourceFilter].label}` });
    }
    
    if (deadlineFilters.clientId) {
      const client = clients.find(c => String(c.client_id) === String(deadlineFilters.clientId));
      chips.push({ key: 'client', label: `${'Client'}: ${client?.client_name}` });
    }
    if (deadlineFilters.matterId) {
      const matter = matters.find(m => String(m.matter_id) === String(deadlineFilters.matterId));
      chips.push({ key: 'matter', label: `${'Matter'}: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (deadlineFilters.priority) {
      const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };
      chips.push({ key: 'priority', label: `${'Priority'}: ${priorityLabels[deadlineFilters.priority]}` });
    }
    
    // Date filter (as single chip with preset label)
    if (datePreset !== 'all' || deadlineFilters.dateFrom || deadlineFilters.dateTo) {
      const presetLabels = { overdue: 'Overdue', today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', next30: 'Next 30 Days' };
      let label = presetLabels[datePreset];
      if (!label && (deadlineFilters.dateFrom || deadlineFilters.dateTo)) {
        label = deadlineFilters.dateFrom && deadlineFilters.dateTo 
          ? `${formatDate(deadlineFilters.dateFrom)} - ${formatDate(deadlineFilters.dateTo)}`
          : deadlineFilters.dateFrom ? `From ${formatDate(deadlineFilters.dateFrom)}` : `Until ${formatDate(deadlineFilters.dateTo)}`;
      }
      if (label) chips.push({ key: 'date', label: `${'DATE'}: ${label}` });
    }
    
    if (deadlineFilters.search) {
      chips.push({ key: 'search', label: `${'Search'}: "${deadlineFilters.search}"` });
    }
    return chips;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPriorityBadge = (priority) => {
    const config = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-blue-500' };
    return <span className={`w-2 h-2 rounded-full ${config[priority] || config.medium}`}></span>;
  };

  const getStatusIcon = (deadline) => {
    const days = getDaysUntil(deadline.deadline_date);
    const isHandled = deadline.status === 'handled' || deadline.status === 'completed';
    if (isHandled) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (days < 0) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (days <= 7) return <Clock className="w-5 h-5 text-orange-500" />;
    return <Calendar className="w-5 h-5 text-gray-400" />;
  };

  const getDaysLabel = (deadline) => {
    const days = getDaysUntil(deadline.deadline_date);
    const isHandled = deadline.status === 'handled' || deadline.status === 'completed';
    if (isHandled) return <span className="text-green-600">✓ {'Handled'}</span>;
    if (days < 0) return <span className="text-red-600 font-semibold">{Math.abs(days)} {'days overdue'}</span>;
    if (days === 0) return <span className="text-orange-600 font-semibold">{'Due today'}</span>;
    if (days <= 7) return <span className="text-yellow-600">{days} {'days'}</span>;
    return <span className="text-gray-600">{days} {'days'}</span>;
  };

  // Get border color based on urgency
  const getBorderColor = (deadline) => {
    const days = getDaysUntil(deadline.deadline_date);
    const isHandled = deadline.status === 'handled' || deadline.status === 'completed';
    if (isHandled) return 'border-l-green-500';
    if (days < 0) return 'border-l-red-500'; // Overdue
    if (days <= 3) return 'border-l-red-500'; // Critical
    if (days <= 7) return 'border-l-yellow-500'; // Warning
    return 'border-l-green-500'; // OK
  };

  // Handle status toggle
  const handleToggleHandled = async (deadline) => {
    if (!onUpdateDeadlineStatus) {
      console.warn('onUpdateDeadlineStatus not provided');
      return;
    }
    
    const isCurrentlyHandled = deadline.status === 'handled' || deadline.status === 'completed';
    const newStatus = isCurrentlyHandled ? 'pending' : 'handled';
    
    try {
      await onUpdateDeadlineStatus(deadline.deadline_id, newStatus);
      if (showToast) {
        showToast(
          newStatus === 'handled' 
            ? ('Deadline marked as handled')
            : ('Deadline reactivated')
        );
      }
    } catch (error) {
      console.error('Error updating deadline status:', error);
      if (showToast) {
        showToast('Error updating status', 'error');
      }
    }
  };

  // Export handlers
  const handleExport = async (type) => {
    const dataToExport = filteredDeadlines.map(d => {
      const matter = matters.find(m => m.matter_id === d.matter_id);
      const client = d.client_name || clients.find(c => c.client_id === d.client_id)?.client_name;
      const sourceInfo = getSourceInfo(d);
      const days = getDaysUntil(d.deadline_date);
      const isHandled = d.status === 'handled' || d.status === 'completed';
      
      return {
        title: d.title || ('Deadline'),
        source: sourceInfo.label,
        sourceDetail: sourceInfo.title,
        client: client || '-',
        matter: `${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || d.matter_name || '-'}${matter?.case_number ? ' — ' + matter.case_number : ''}`,
        dueDate: d.deadline_date,
        dueDateFormatted: formatDateLong(d.deadline_date),
        daysRemaining: isHandled ? '-' : (days < 0 ? `${Math.abs(days)} overdue` : `${days} days`),
        priority: d.priority || 'medium',
        status: isHandled ? ('Handled') : ('Active'),
        notes: d.notes || ''
      };
    });

    switch (type) {
      case 'excel':
        exportToExcel(dataToExport);
        break;
      case 'pdf':
        exportToPDF(dataToExport);
        break;
      case 'print':
        handlePrint(dataToExport);
        break;
    }
  };

  const exportToExcel = async (data) => {
    try {
      // Use electronAPI if available, otherwise fallback to CSV
      if (window.electronAPI?.exportToExcel) {
        await window.electronAPI.exportToExcel({
          filename: `Deadlines_${new Date().toISOString().split('T')[0]}.xlsx`,
          sheetName: 'Deadlines',
          columns: [
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Source', key: 'source', width: 15 },
            { header: 'Client', key: 'client', width: 25 },
            { header: 'Matter', key: 'matter', width: 25 },
            { header: 'Due Date', key: 'dueDateFormatted', width: 15 },
            { header: 'days remaining', key: 'daysRemaining', width: 15 },
            { header: 'Priority', key: 'priority', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Notes', key: 'notes', width: 40 }
          ],
          data: data
        });
        if (showToast) showToast('Excel exported successfully');
      } else {
        // Fallback: CSV download
        const csvContent = [
          ['Title', 'Source', 'Client', 'Matter', 'Due Date', 'Days Remaining', 'Priority', 'Status', 'Notes'].join(','),
          ...data.map(row => [
            `"${row.title}"`, `"${row.source}"`, `"${row.client}"`, `"${row.matter}"`,
            `"${row.dueDateFormatted}"`, `"${row.daysRemaining}"`, `"${row.priority}"`, 
            `"${row.status}"`, `"${row.notes.replace(/"/g, '""')}"`
          ].join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Deadlines_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        if (showToast) showToast('CSV exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      if (showToast) showToast('Export error', 'error');
    }
  };

  const exportToPDF = async (data) => {
    try {
      if (window.electronAPI?.exportToPDF) {
        await window.electronAPI.exportToPDF({
          filename: `Deadlines_${new Date().toISOString().split('T')[0]}.pdf`,
          title: 'Deadlines Report - Qanuni',
          subtitle: `${'Generated'}: ${formatDateLong(new Date().toISOString())}`,
          data: data,
          columns: ['title', 'source', 'client', 'matter', 'dueDateFormatted', 'daysRemaining', 'status']
        });
        if (showToast) showToast('PDF exported successfully');
      } else {
        // Fallback: Open print dialog with PDF styling
        handlePrint(data, true);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      if (showToast) showToast('PDF export error', 'error');
    }
  };

  const handlePrint = (data, isPDF = false) => {
    const printWindow = window.open('', '_blank');
    const title = 'Deadlines Report - Qanuni';
    const generatedDate = formatDateLong(new Date().toISOString());
    
    const html = `
      <!DOCTYPE html>
      <html dir="${'ltr'}">
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            max-width: 1000px; 
            margin: 0 auto;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .header h1 { margin: 0 0 5px 0; font-size: 24px; }
          .header p { margin: 0; color: #666; font-size: 14px; }
          .summary { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px; 
            justify-content: center;
          }
          .summary-card { 
            padding: 10px 20px; 
            border: 1px solid #ddd; 
            border-radius: 8px;
            text-align: center;
          }
          .summary-card .count { font-size: 24px; font-weight: bold; }
          .summary-card .label { font-size: 12px; color: #666; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 12px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: ${'left'}; 
          }
          th { background: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
          .overdue { color: #dc2626; font-weight: bold; }
          .warning { color: #d97706; }
          .handled { color: #16a34a; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>${'Generated'}: ${generatedDate}</p>
          ${hasActiveFilters ? `<p style="margin-top:5px;">${'Active filters'}: ${activeFilters.map(f => f.label).join(', ')}</p>` : ''}
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="count" style="color:#dc2626;">${overdueCount}</div>
            <div class="label">${'Overdue'}</div>
          </div>
          <div class="summary-card">
            <div class="count" style="color:#d97706;">${thisWeekCount}</div>
            <div class="label">${'This Week'}</div>
          </div>
          <div class="summary-card">
            <div class="count" style="color:#2563eb;">${activeCount}</div>
            <div class="label">${'Active'}</div>
          </div>
          <div class="summary-card">
            <div class="count" style="color:#16a34a;">${handledCount}</div>
            <div class="label">${'Handled'}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${'Title'}</th>
              <th>${'Source'}</th>
              <th>${'Client'}</th>
              <th>${'Matter'}</th>
              <th>${'Due Date'}</th>
              <th>${'Remaining'}</th>
              <th>${'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(row => {
              const isOverdue = row.daysRemaining.includes('overdue');
              const isHandled = row.status === 'Handled' || row.status === 'تمت المعالجة';
              const rowClass = isHandled ? 'handled' : (isOverdue ? 'overdue' : '');
              return `
                <tr>
                  <td>${row.title}</td>
                  <td>${row.source}</td>
                  <td>${row.client}</td>
                  <td>${row.matter}</td>
                  <td>${row.dueDateFormatted}</td>
                  <td class="${rowClass}">${row.daysRemaining}</td>
                  <td class="${isHandled ? 'handled' : ''}">${row.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          ${'Total'}: ${data.length} ${'Deadlines'}
          &nbsp;|&nbsp; 
          Qanuni Legal Practice Management
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Dropdown options
  const clientOptions = [
    { value: '', label: 'All Clients' }, 
    ...clients.map(c => ({ value: String(c.client_id), label: c.client_name }))
  ];
  
  const matterOptions = deadlineFilters.clientId 
    ? [{ value: '', label: 'All Matters' }, ...availableMatters.map(m => ({ value: String(m.matter_id), label: `${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}` }))]
    : [{ value: '', label: 'Select Client First' }];
  
  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  // Render a single deadline row - ENHANCED with progress bar and action buttons
  const renderDeadlineRow = (deadline) => {
    const matter = matters.find(m => m.matter_id === deadline.matter_id);
    const client = deadline.client_name || clients.find(c => c.client_id === deadline.client_id)?.client_name;
    const sourceInfo = getSourceInfo(deadline);
    const days = getDaysUntil(deadline.deadline_date);
    const isHandled = deadline.status === 'handled' || deadline.status === 'completed';
    const isOverdue = !isHandled && deadline.deadline_date < today;
    const SourceIcon = sourceInfo.icon;

    return (
      <div 
        key={deadline.deadline_id} 
        className={`group bg-white rounded-lg shadow-sm p-4 border-l-4 ${getBorderColor(deadline)} ${isHandled ? 'opacity-70' : ''} hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon(deadline)}
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                {getPriorityBadge(deadline.priority)}
                <span className={`font-medium ${isHandled ? 'line-through text-gray-500' : ''}`}>
                  {deadline.title || ('Deadline')}
                </span>
                {/* Source Badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full ${sourceInfo.bgColor} ${sourceInfo.textColor}`}>
                  {sourceInfo.label}
                </span>
              </div>
              
              {/* Matter & Client */}
              <div className="text-sm text-gray-600 mt-1">
                {matter?.matter_name || deadline.matter_name || '-'} • {client || '-'}
              </div>
              {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                <div className="text-xs text-gray-400 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
              )}
              
              {/* Progress Bar */}
              <DeadlineProgressBar 
                daysRemaining={days} 
                totalDays={30} 
                isHandled={isHandled} 
              />
              
              {/* Notes */}
              {deadline.notes && <p className="text-xs text-gray-500 mt-2">{deadline.notes}</p>}
              
              {/* Action Buttons - Always visible on mobile, hover on desktop */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {/* Go to Source Button */}
                {sourceInfo.source && sourceInfo.onClick && (
                  <button 
                    onClick={sourceInfo.onClick}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition
                      ${sourceInfo.bgColor} ${sourceInfo.textColor} ${sourceInfo.borderColor} ${sourceInfo.hoverBg}`}
                  >
                    <SourceIcon className="w-3.5 h-3.5" />
                    {'Go to'} {sourceInfo.label}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                
                {/* Mark as Handled / Reactivate Button */}
                {onUpdateDeadlineStatus && (
                  <button 
                    onClick={() => handleToggleHandled(deadline)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition
                      ${isHandled 
                        ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200' 
                        : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'}`}
                  >
                    {isHandled ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        {'Reactivate'}
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {'Mark Handled'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side: Date & Days */}
          <div className="text-right ml-4 flex-shrink-0">
            <div className="font-medium">{formatDate(deadline.deadline_date)}</div>
            <div className="text-sm mt-1">{getDaysLabel(deadline)}</div>
          </div>
        </div>
      </div>
    );
  };

  // Render a section with header
  const renderSection = (sourceType, items) => {
    if (items.length === 0) return null;
    const config = sourceConfig[sourceType];
    const isCollapsed = collapsedSections[sourceType];
    const Icon = config.icon;

    return (
      <div key={sourceType} className="mb-6">
        {/* Section Header */}
        <button 
          onClick={() => toggleSection(sourceType)}
          className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 ${config.bgColor} hover:opacity-90 transition`}>
          <div className="flex items-center gap-2">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <Icon className={`w-5 h-5 ${config.textColor}`} />
            <span className={`font-semibold ${config.textColor}`}>
              {config.labelFull}
            </span>
            <span className={`text-sm px-2 py-0.5 rounded-full bg-white ${config.textColor}`}>
              {items.length}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {isCollapsed ? ('Show') : ('Hide')}
          </span>
        </button>
        
        {/* Section Content */}
        {!isCollapsed && (
          <div className="space-y-2 ml-2">
            {items.map(deadline => renderDeadlineRow(deadline))}
          </div>
        )}
      </div>
    );
  };

  // Empty state
  if (deadlines.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{'Deadlines'}</h2>
        </div>
        <EmptyState
          type="tasks"
          title={'No deadlines'}
          description={'Deadlines are auto-generated from Judgments.'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{'Deadlines'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {'Click on a source row to edit the deadline'}
          </p>
        </div>
      </div>

      {/* Summary Cards Row 1: Status - Updated: Completed → Handled */}
      <div className="grid grid-cols-4 gap-4">
        <div onClick={() => { setStatusFilter('overdue'); setDeadlinePage(1); }}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${statusFilter === 'overdue' 
            ? 'bg-red-100 border-red-400 text-red-800' 
            : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${statusFilter === 'overdue' ? '' : 'text-red-500'}`} />
            <span className="text-sm opacity-75">{'Overdue'}</span>
          </div>
          <div className={`text-2xl font-bold mt-1 ${statusFilter !== 'overdue' ? 'text-red-600' : ''}`}>{overdueCount}</div>
        </div>
        <div onClick={() => { setStatusFilter('thisWeek'); setDeadlinePage(1); }}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${statusFilter === 'thisWeek' 
            ? 'bg-orange-100 border-orange-400 text-orange-800' 
            : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${statusFilter === 'thisWeek' ? '' : 'text-orange-500'}`} />
            <span className="text-sm opacity-75">{'This Week'}</span>
          </div>
          <div className={`text-2xl font-bold mt-1 ${statusFilter !== 'thisWeek' ? 'text-orange-600' : ''}`}>{thisWeekCount}</div>
        </div>
        <div onClick={() => { setStatusFilter('active'); setDeadlinePage(1); }}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${statusFilter === 'active' 
            ? 'bg-blue-100 border-blue-400 text-blue-800' 
            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${statusFilter === 'active' ? '' : 'text-blue-500'}`} />
            <span className="text-sm opacity-75">{'Active'}</span>
          </div>
          <div className={`text-2xl font-bold mt-1 ${statusFilter !== 'active' ? 'text-blue-600' : ''}`}>{activeCount}</div>
        </div>
        <div onClick={() => { setStatusFilter('handled'); setDeadlinePage(1); }}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${statusFilter === 'handled' 
            ? 'bg-green-100 border-green-400 text-green-800' 
            : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${statusFilter === 'handled' ? '' : 'text-green-500'}`} />
            <span className="text-sm opacity-75">{'Handled'}</span>
          </div>
          <div className={`text-2xl font-bold mt-1 ${statusFilter !== 'handled' ? 'text-green-600' : ''}`}>{handledCount}</div>
        </div>
      </div>

      {/* Summary Cards Row 2: Source Type Filter */}
      <div className="grid grid-cols-4 gap-4">
        <div onClick={() => setSourceFilter('all')}
          className={`rounded-lg border-2 p-3 cursor-pointer transition ${sourceFilter === 'all' 
            ? 'bg-slate-100 border-slate-400 text-slate-800' 
            : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{'All Sources'}</span>
            <span className="text-lg font-bold">{deadlines.length}</span>
          </div>
        </div>
        <div onClick={() => setSourceFilter('judgment')}
          className={`rounded-lg border-2 p-3 cursor-pointer transition ${sourceFilter === 'judgment' 
            ? 'bg-purple-100 border-purple-400 text-purple-800' 
            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className={`w-4 h-4 ${sourceFilter === 'judgment' ? '' : 'text-purple-500'}`} />
              <span className="text-sm font-medium">{sourceConfig.judgment.label}</span>
            </div>
            <span className="text-lg font-bold">{sourceCounts.judgment}</span>
          </div>
        </div>
        <div onClick={() => setSourceFilter('task')}
          className={`rounded-lg border-2 p-3 cursor-pointer transition ${sourceFilter === 'task' 
            ? 'bg-blue-100 border-blue-400 text-blue-800' 
            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className={`w-4 h-4 ${sourceFilter === 'task' ? '' : 'text-blue-500'}`} />
              <span className="text-sm font-medium">{sourceConfig.task.label}</span>
            </div>
            <span className="text-lg font-bold">{sourceCounts.task}</span>
          </div>
        </div>
        <div onClick={() => setSourceFilter('matter')}
          className={`rounded-lg border-2 p-3 cursor-pointer transition ${sourceFilter === 'matter' 
            ? 'bg-green-100 border-green-400 text-green-800' 
            : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${sourceFilter === 'matter' ? '' : 'text-green-500'}`} />
              <span className="text-sm font-medium">{sourceConfig.matter.label}</span>
            </div>
            <span className="text-lg font-bold">{sourceCounts.matter}</span>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">{'Filters'}</span>
          {activeFilters.map(f => (
            <FilterChip key={f.key} label={f.label} onRemove={() => removeFilter(f.key)} />
          ))}
          <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline ml-2">
            {'Clear All'}
          </button>
        </div>
      )}

      {/* Smart Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={deadlineFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder={'Search by client, matter, or title...'}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ExportButtons onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} disabled={!filteredDeadlines.length} />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FilterDropdown
            label={'All Clients'}
            value={deadlineFilters.clientId}
            options={clientOptions}
            onChange={(v) => handleFilterChange('clientId', v)}
            isOpen={openDropdown === 'client'}
            onToggle={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')}
            onClose={() => setOpenDropdown(null)}
          />
          
          <FilterDropdown
            label={'All Matters'}
            value={deadlineFilters.matterId}
            options={matterOptions}
            onChange={(v) => handleFilterChange('matterId', v)}
            isOpen={openDropdown === 'matter'}
            onToggle={() => setOpenDropdown(openDropdown === 'matter' ? null : 'matter')}
            onClose={() => setOpenDropdown(null)}
            disabled={!deadlineFilters.clientId}
          />
          
          <FilterDropdown
            label={'All Priorities'}
            value={deadlineFilters.priority}
            options={priorityOptions}
            onChange={(v) => handleFilterChange('priority', v)}
            isOpen={openDropdown === 'priority'}
            onToggle={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
            onClose={() => setOpenDropdown(null)}
          />
          
          <DateFilterDropdown
            value={datePreset}
            dateFrom={deadlineFilters.dateFrom}
            dateTo={deadlineFilters.dateTo}
            onPresetChange={handleDatePreset}
            onCustomChange={handleCustomDateChange}
            isOpen={openDropdown === 'date'}
            onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
            onClose={() => setOpenDropdown(null)}
                     />
        </div>
      </div>

      {/* Grouped Deadlines List */}
      <div>
        {filteredDeadlines.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {hasActiveFilters 
              ? ('No results match filters') 
              : ('No data')}
          </div>
        ) : sourceFilter === 'all' ? (
          // Grouped view when showing all
          <>
            {renderSection('judgment', groupedDeadlines.judgment)}
            {renderSection('task', groupedDeadlines.task)}
            {renderSection('matter', groupedDeadlines.matter)}
          </>
        ) : (
          // Flat view when filtering by source
          <div className="space-y-2">
            {filteredDeadlines.map(deadline => renderDeadlineRow(deadline))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 text-center">
        {'Showing'}: {filteredDeadlines.length} {'Deadlines'}
        {filteredDeadlines.length !== deadlines.length && ` (${'of'} ${deadlines.length})`}
      </div>
    </div>
  );
};

export default DeadlinesList;
