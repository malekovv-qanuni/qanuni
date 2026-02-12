import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, Search } from 'lucide-react';
import ExportButtons from '../common/ExportButtons';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';
import apiClient from '../../api-client';
/**
 * TasksList Component - v46.7
 * 
 * Features:
 * - Summary cards with colored background active states (matches HearingsList)
 * - Upcoming card now shows active state when clicked
 * - Smart search: searches Client, Matter, AND Title
 * - Date presets with Custom option showing date pickers
 * - Cascading filters: Matter restricted to selected Client
 * - Column header dropdown filters
 * - Filter chips with Clear All
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
};

// Dropdown component for column header filters
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
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded transition
          ${disabled ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}
          ${isFiltered ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[180px] max-h-60 overflow-y-auto">
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

// Date Filter Dropdown with Custom option
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
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Range...' }
  ];

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
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded hover:bg-gray-200 transition ${isFiltered ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
      >
        Due Date
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[200px]">
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
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={dateFrom || ''}
                  onChange={(e) => onCustomChange('dateFrom', e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">To</label>
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
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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

const TasksList = ({
  tasks,
  clients,
  matters,
  lawyers,
  taskTypes,
  regions,
  showConfirm,
  showToast,
  hideConfirm,
  refreshTasks
}) => {
  const { openForm } = useUI();
  const {
    filters: taskFilters,
    page: taskPage,
    pageSize: taskPageSize,
    statusFilter: taskStatusFilter,
    priorityFilter: taskPriorityFilter,
    setFilter: _taskSetFilter,
    setPage: setTaskPage,
    setPageSize: setTaskPageSize,
    setStatusFilter: setTaskStatusFilter,
    setPriorityFilter: setTaskPriorityFilter
  } = useFilters('tasks');
  const setTaskFilters = (updaterOrValue) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(taskFilters) : updaterOrValue;
    Object.keys(next).forEach(k => _taskSetFilter(k, next[k]));
  };

  const today = new Date().toISOString().split('T')[0];
  
  const [openDropdown, setOpenDropdown] = useState(null);
  const [datePreset, setDatePreset] = useState('all');
  const [activeSummaryCard, setActiveSummaryCard] = useState('total'); // 'total', 'overdue', 'dueToday', 'upcoming', 'completed'

  // Get date range based on preset
  const getDateRange = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    switch (preset) {
      case 'overdue':
        return { dateFrom: '', dateTo: new Date(now.getTime() - 86400000).toISOString().split('T')[0] };
      case 'today':
        return { dateFrom: todayStr, dateTo: todayStr };
      case 'upcoming':
        return { dateFrom: todayStr, dateTo: '' };
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
      default:
        return { dateFrom: '', dateTo: '' };
    }
  };

  // CASCADING: Filter matters by selected client
  const availableMatters = useMemo(() => {
    if (!taskFilters.clientId) return []; // No client = no matters to show
    return matters.filter(m => String(m.client_id) === String(taskFilters.clientId));
  }, [taskFilters.clientId, matters]);

  // Get client for a task (via matter)
  const getTaskClient = (task) => {
    const matter = matters.find(m => m.matter_id === task.matter_id);
    if (!matter) return null;
    return clients.find(c => c.client_id === matter.client_id);
  };

  // SMART SEARCH: Search across Client, Matter, and Title
  const matchesSearch = (task, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Check title
    if (task.title?.toLowerCase().includes(term)) return true;
    
    // Check client name
    const client = getTaskClient(task);
    if (client?.client_name?.toLowerCase().includes(term)) return true;
    
    // Check matter name
    const matter = matters.find(m => m.matter_id === task.matter_id);
    if (matter?.matter_name?.toLowerCase().includes(term)) return true;
    
    return false;
  };

  // Apply all filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (taskStatusFilter !== 'all' && task.status !== taskStatusFilter) return false;
      
      // Priority filter
      if (taskPriorityFilter !== 'all' && task.priority !== taskPriorityFilter) return false;
      
      // Client filter (cascading)
      if (taskFilters.clientId) {
        const matter = matters.find(m => m.matter_id === task.matter_id);
        if (!matter || String(matter.client_id) !== String(taskFilters.clientId)) return false;
      }
      
      // Matter filter (depends on client)
      if (taskFilters.matterId && String(task.matter_id) !== String(taskFilters.matterId)) return false;
      
      // Lawyer filter
      if (taskFilters.lawyerId && String(task.assigned_to) !== String(taskFilters.lawyerId)) return false;
      
      // Type filter
      if (taskFilters.taskTypeId && String(task.task_type_id) !== String(taskFilters.taskTypeId)) return false;
      
      // Region filter (via matter's court_region_id)
      if (taskFilters.regionId) {
        const matter = matters.find(m => m.matter_id === task.matter_id);
        if (!matter || String(matter.court_region_id) !== String(taskFilters.regionId)) return false;
      }
      
      // Date filter
      if (taskFilters.dateFrom && task.due_date && task.due_date < taskFilters.dateFrom) return false;
      if (taskFilters.dateTo && task.due_date && task.due_date > taskFilters.dateTo) return false;
      
      // Smart search (client, matter, title)
      if (taskFilters.search && !matchesSearch(task, taskFilters.search)) return false;
      
      return true;
    });
  }, [tasks, taskStatusFilter, taskPriorityFilter, taskFilters, matters, clients]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / taskPageSize);
  const startIdx = (taskPage - 1) * taskPageSize;
  const paginatedTasks = filteredTasks.slice(startIdx, startIdx + taskPageSize);

  // Summary counts (unfiltered)
  // Note: "Upcoming" = all open tasks (pending work), includes overdue + due today + future
  const counts = {
    total: tasks.length,
    overdue: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_date && t.due_date < today).length,
    dueToday: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_date === today).length,
    upcoming: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
    completed: tasks.filter(t => t.status === 'done').length
  };

  const handleFilterChange = (field, value) => {
    setTaskFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      // CASCADING: Clear matter when client changes
      if (field === 'clientId') {
        newFilters.matterId = '';
      }
      return newFilters;
    });
    setTaskPage(1);
  };

  // Export helpers - v46.55
  const prepareExportData = () => {
    const statusLabels = { assigned: 'Assigned', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' };
    return filteredTasks.map(task => {
      const matter = matters.find(m => m.matter_id === task.matter_id);
      const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
      const lawyer = lawyers.find(l => l.lawyer_id === task.assigned_to);
      return {
        'Client': client?.client_name || '',
        'Matter': (matter?.matter_name || ''),
        'File No.': matter?.custom_matter_number || '',
        'Title': task.title || '',
        'Assigned To': lawyer ? (lawyer.full_name) : '',
        'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        'Priority': (task.priority || '').replace(/^\w/, c => c.toUpperCase()),
        'Status': statusLabels[task.status] || task.status || ''
      };
    });
  };

  const handleExportExcel = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const result = await apiClient.exportToExcel(data, 'Tasks');
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleExportPdf = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const columns = ['Client', 'Matter', 'File No.', 'Title', 'Assigned To', 'Due Date', 'Priority', 'Status'];
    const result = await apiClient.exportToPdf(data, 'Tasks', columns);
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setTaskFilters(prev => ({ ...prev, ...range }));
    }
    setTaskPage(1);
  };

  const handleCustomDateChange = (field, value) => {
    setTaskFilters(prev => ({ ...prev, [field]: value }));
    setDatePreset('custom');
  };

  const handleSummaryCardClick = (type) => {
    setActiveSummaryCard(type);
    clearAllFilters();
    
    switch (type) {
      case 'overdue':
        setDatePreset('overdue');
        const overdueRange = getDateRange('overdue');
        setTaskFilters(prev => ({ ...prev, ...overdueRange }));
        break;
      case 'dueToday':
        setDatePreset('today');
        const todayRange = getDateRange('today');
        setTaskFilters(prev => ({ ...prev, ...todayRange }));
        break;
      case 'upcoming':
        // Show all open/pending tasks - clear all filters
        setDatePreset('all');
        break;
      case 'completed':
        setTaskStatusFilter('done');
        break;
      case 'total':
      default:
        // Clear all filters, show everything
        break;
    }
  };

  const clearAllFilters = () => {
    setTaskStatusFilter('all');
    setTaskPriorityFilter('all');
    setTaskFilters({ clientId: '', matterId: '', lawyerId: '', taskTypeId: '', regionId: '', dateFrom: '', dateTo: '', search: '' });
    setDatePreset('all');
    setTaskPage(1);
    setActiveSummaryCard('total');
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'client':
        handleFilterChange('clientId', '');
        break;
      case 'matter':
        handleFilterChange('matterId', '');
        break;
      case 'type':
        handleFilterChange('taskTypeId', '');
        break;
      case 'region':
        handleFilterChange('regionId', '');
        break;
      case 'assigned':
        handleFilterChange('lawyerId', '');
        break;
      case 'date':
        setDatePreset('all');
        setTaskFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        break;
      case 'priority':
        setTaskPriorityFilter('all');
        break;
      case 'status':
        setTaskStatusFilter('all');
        break;
      case 'search':
        handleFilterChange('search', '');
        break;
    }
  };

  // Build active filter chips
  const getActiveFilters = () => {
    const chips = [];
    if (taskFilters.clientId) {
      const client = clients.find(c => String(c.client_id) === String(taskFilters.clientId));
      chips.push({ key: 'client', label: `Client: ${client?.client_name}` });
    }
    if (taskFilters.matterId) {
      const matter = matters.find(m => String(m.matter_id) === String(taskFilters.matterId));
      chips.push({ key: 'matter', label: `Matter: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (taskFilters.taskTypeId) {
      const type = taskTypes.find(tt => String(tt.task_type_id) === String(taskFilters.taskTypeId));
      chips.push({ key: 'type', label: `Type: ${type?.name_en}` });
    }
    if (taskFilters.regionId) {
      const region = (regions || []).find(r => String(r.region_id) === String(taskFilters.regionId));
      chips.push({ key: 'region', label: `${'Region'}: ${region ? (region.name_en) : taskFilters.regionId}` });
    }
    if (taskFilters.lawyerId) {
      const lawyer = lawyers.find(l => String(l.lawyer_id) === String(taskFilters.lawyerId));
      chips.push({ key: 'assigned', label: `Assigned: ${lawyer?.full_name || lawyer?.name}` });
    }
    if (datePreset !== 'all' || taskFilters.dateFrom || taskFilters.dateTo) {
      const presetLabels = { overdue: 'Overdue', today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', upcoming: 'Upcoming' };
      let label = presetLabels[datePreset];
      if (!label && (taskFilters.dateFrom || taskFilters.dateTo)) {
        label = taskFilters.dateFrom && taskFilters.dateTo 
          ? `${formatDate(taskFilters.dateFrom)} - ${formatDate(taskFilters.dateTo)}`
          : taskFilters.dateFrom ? `From ${formatDate(taskFilters.dateFrom)}` : `Until ${formatDate(taskFilters.dateTo)}`;
      }
      if (label) chips.push({ key: 'date', label: `Due: ${label}` });
    }
    if (taskPriorityFilter !== 'all') {
      chips.push({ key: 'priority', label: `Priority: ${taskPriorityFilter.charAt(0).toUpperCase() + taskPriorityFilter.slice(1)}` });
    }
    if (taskStatusFilter !== 'all') {
      const statusLabels = { assigned: 'Assigned', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' };
      chips.push({ key: 'status', label: `Status: ${statusLabels[taskStatusFilter]}` });
    }
    if (taskFilters.search) {
      chips.push({ key: 'search', label: `Search: "${taskFilters.search}"` });
    }
    return chips;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  const getStatusBadge = (status) => {
    const config = {
      done: { bg: 'bg-green-100', text: 'text-green-800', label: 'Done' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      review: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Review' },
      assigned: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Assigned' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    const c = config[status] || config.assigned;
    return <span className={`px-2 py-1 text-xs rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const config = {
      high: { bg: 'bg-red-100', text: 'text-red-800', label: 'High' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' }
    };
    const c = config[priority] || config.medium;
    return <span className={`px-2 py-1 text-xs rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const isOverdue = (task) => task.status !== 'done' && task.status !== 'cancelled' && task.due_date && task.due_date < today;

  // Dropdown options
  const clientOptions = [{ value: '', label: 'All Clients' }, ...clients.map(c => ({ value: String(c.client_id), label: c.client_name }))];
  
  // CASCADING: Matter options depend on selected client
  const matterOptions = taskFilters.clientId 
    ? [{ value: '', label: 'All Matters' }, ...availableMatters.map(m => ({ value: String(m.matter_id), label: `${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}` }))]
    : [{ value: '', label: 'Select Client First' }];
  
  const typeOptions = [{ value: '', label: 'All Types' }, ...taskTypes.map(tt => ({ value: String(tt.task_type_id), label: tt.name_en }))];
  const regionOptions = [{ value: '', label: 'All Regions' }, ...(regions || []).map(r => ({ value: String(r.region_id), label: r.name_en}))];
  const lawyerOptions = [{ value: '', label: 'All Lawyers' }, ...lawyers.map(l => ({ value: String(l.lawyer_id), label: l.full_name || l.name }))];
  const priorityOptions = [{ value: 'all', label: 'All Priorities' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];
  const statusOptions = [{ value: 'all', label: 'All Statuses' }, { value: 'assigned', label: 'Assigned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' }, { value: 'cancelled', label: 'Cancelled' }];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Tasks'}</h2>
        <button onClick={() => openForm('task')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {'Add Task'}
        </button>
      </div>

      {/* Clickable Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div onClick={() => handleSummaryCardClick('total')}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${activeSummaryCard === 'total'
            ? 'bg-slate-100 border-slate-400 text-slate-800' 
            : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50'}`}>
          <div className="text-sm opacity-75">Total</div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </div>
        <div onClick={() => handleSummaryCardClick('overdue')}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${activeSummaryCard === 'overdue'
            ? 'bg-red-100 border-red-400 text-red-800' 
            : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'}`}>
          <div className="text-sm opacity-75">Overdue</div>
          <div className={`text-2xl font-bold ${activeSummaryCard !== 'overdue' ? 'text-red-600' : ''}`}>{counts.overdue}</div>
        </div>
        <div onClick={() => handleSummaryCardClick('dueToday')}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${activeSummaryCard === 'dueToday'
            ? 'bg-orange-100 border-orange-400 text-orange-800' 
            : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}>
          <div className="text-sm opacity-75">Due Today</div>
          <div className={`text-2xl font-bold ${activeSummaryCard !== 'dueToday' ? 'text-orange-600' : ''}`}>{counts.dueToday}</div>
        </div>
        <div onClick={() => handleSummaryCardClick('upcoming')}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${activeSummaryCard === 'upcoming'
            ? 'bg-blue-100 border-blue-400 text-blue-800' 
            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
          <div className="text-sm opacity-75">Pending</div>
          <div className={`text-2xl font-bold ${activeSummaryCard !== 'upcoming' ? 'text-blue-600' : ''}`}>{counts.upcoming}</div>
        </div>
        <div onClick={() => handleSummaryCardClick('completed')}
          className={`rounded-lg border-2 p-4 cursor-pointer transition ${activeSummaryCard === 'completed'
            ? 'bg-green-100 border-green-400 text-green-800' 
            : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
          <div className="text-sm opacity-75">Completed</div>
          <div className={`text-2xl font-bold ${activeSummaryCard !== 'completed' ? 'text-green-600' : ''}`}>{counts.completed}</div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Filters:</span>
          {activeFilters.map(f => (
            <FilterChip key={f.key} label={f.label} onRemove={() => removeFilter(f.key)} />
          ))}
          <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline ml-2">
            Clear All
          </button>
        </div>
      )}

      {/* Smart Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={taskFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by client, matter, or title..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ExportButtons onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} disabled={!filteredTasks.length} />
      </div>

      {/* Table with Header Dropdowns */}
      <div className="bg-white rounded-lg shadow overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Client"
                  value={taskFilters.clientId}
                  options={clientOptions}
                  onChange={(v) => handleFilterChange('clientId', v)}
                  isOpen={openDropdown === 'client'}
                  onToggle={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Matter"
                  value={taskFilters.matterId}
                  options={matterOptions}
                  onChange={(v) => handleFilterChange('matterId', v)}
                  isOpen={openDropdown === 'matter'}
                  onToggle={() => setOpenDropdown(openDropdown === 'matter' ? null : 'matter')}
                  onClose={() => setOpenDropdown(null)}
                  disabled={!taskFilters.clientId}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Type"
                  value={taskFilters.taskTypeId}
                  options={typeOptions}
                  onChange={(v) => handleFilterChange('taskTypeId', v)}
                  isOpen={openDropdown === 'type'}
                  onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label={'Region'}
                  value={taskFilters.regionId}
                  options={regionOptions}
                  onChange={(v) => handleFilterChange('regionId', v)}
                  isOpen={openDropdown === 'region'}
                  onToggle={() => setOpenDropdown(openDropdown === 'region' ? null : 'region')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <DateFilterDropdown
                  value={datePreset}
                  dateFrom={taskFilters.dateFrom}
                  dateTo={taskFilters.dateTo}
                  onPresetChange={handleDatePreset}
                  onCustomChange={handleCustomDateChange}
                  isOpen={openDropdown === 'date'}
                  onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Assigned"
                  value={taskFilters.lawyerId}
                  options={lawyerOptions}
                  onChange={(v) => handleFilterChange('lawyerId', v)}
                  isOpen={openDropdown === 'assigned'}
                  onToggle={() => setOpenDropdown(openDropdown === 'assigned' ? null : 'assigned')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Priority"
                  value={taskPriorityFilter}
                  options={priorityOptions}
                  onChange={setTaskPriorityFilter}
                  isOpen={openDropdown === 'priority'}
                  onToggle={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <FilterDropdown
                  label="Status"
                  value={taskStatusFilter}
                  options={statusOptions}
                  onChange={setTaskStatusFilter}
                  isOpen={openDropdown === 'status'}
                  onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTasks.length === 0 ? (
              <tr><td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                {hasActiveFilters ? 'No results match filters' : 'No tasks'}
              </td></tr>
            ) : (
              paginatedTasks.map(task => {
                const matter = matters.find(m => m.matter_id === task.matter_id);
                const client = getTaskClient(task);
                const taskType = taskTypes.find(tt => tt.task_type_id === task.task_type_id);
                const lawyer = lawyers.find(l => l.lawyer_id === task.assigned_to);
                const overdue = isOverdue(task);
                
                return (
                  <tr key={task.task_id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 text-sm">{client?.client_name || '--'}</td>
                    <td className="px-3 py-3 text-sm">
                      <div className="text-gray-900">{matter?.matter_name || '--'}</div>
                      {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                        <div className="text-xs text-gray-500 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium">{task.title || '--'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{taskType?.name_en || task.task_type_custom || '--'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{matter?.region_name || '--'}</td>
                    <td className={`px-3 py-3 text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>{formatDate(task.due_date)}</td>
                    <td className="px-3 py-3 text-sm">{lawyer?.full_name || lawyer?.name || '--'}</td>
                    <td className="px-3 py-3">{getPriorityBadge(task.priority)}</td>
                    <td className="px-3 py-3">{getStatusBadge(task.status)}</td>
                    <td className="px-3 py-3 text-sm">
                      <button onClick={() => openForm('task', task)}
                        className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                      <button onClick={() => {
                        showConfirm('Delete Task', 'Are you sure you want to delete this task?', async () => {
                          try {
                            const result = await apiClient.deleteTask(task.task_id);
                            if (!result || result.success === false) {
                              showToast(result?.error || 'Failed to delete task', 'error');
                              hideConfirm();
                              return;
                            }
                            await refreshTasks();
                            showToast('Task deleted');
                            hideConfirm();
                          } catch (error) {
                            console.error('Error deleting task:', error);
                            showToast('Error deleting task', 'error');
                            hideConfirm();
                          }
                        });
                      }} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredTasks.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-600">
            Showing {startIdx + 1}-{Math.min(startIdx + taskPageSize, filteredTasks.length)} of {filteredTasks.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select value={taskPageSize}
                onChange={(e) => { setTaskPageSize(Number(e.target.value)); setTaskPage(1); }}
                className="px-2 py-1 border rounded text-sm">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTaskPage(p => Math.max(1, p - 1))}
                disabled={taskPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
              <span className="text-sm text-gray-600">Page {taskPage} of {totalPages || 1}</span>
              <button onClick={() => setTaskPage(p => Math.min(totalPages, p + 1))}
                disabled={taskPage >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;
