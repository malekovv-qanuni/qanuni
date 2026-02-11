import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Paperclip } from 'lucide-react';
import ExportButtons from '../common/ExportButtons';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';

/**
 * ExpensesList Component - v46.46
 * 
 * v46.46 Changes:
 * - Added useMemo for expenseTotals and filteredMatters (performance)
 *
 * v46.40 Changes:
 * - Single "Add Expenses" button (unified form handles single & multiple)
 *
 * v46.39 Changes:
 * - Added Matter column between Client and Category
 * - Added 📎 icon column for attachment notes
 * - Renamed "Pending" → "Unbilled" for clarity
 * - Added WYSIWYG Export (Excel/PDF) - exports filtered view
 * - Export dropdown with Excel and PDF options
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
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
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month Revenue' },
    { value: 'lastMonth', label: 'Last Month' },
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
                <label className="text-xs text-gray-500">{'From'}</label>
                <input
                  type="date"
                  value={dateFrom || ''}
                  onChange={(e) => onCustomChange('dateFrom', e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{'To'}</label>
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


const ExpensesList = ({
  expenses,
  clients,
  matters,
  lawyers,
  expenseCategories,
  showConfirm,
  showToast,
  hideConfirm,
  refreshExpenses
}) => {
  const { openForm } = useUI();
  const { filters: expenseFilters, page: expensePage, pageSize: expensePageSize, setFilter: _expSetFilter, setPage: setExpensePage, setPageSize: setExpensePageSize } = useFilters('expenses');
  const setExpenseFilters = (updaterOrValue) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(expenseFilters) : updaterOrValue;
    Object.keys(next).forEach(k => _expSetFilter(k, next[k]));
  };
  const electronAPI = window.electronAPI;
  const [openDropdown, setOpenDropdown] = useState(null);
  const [datePreset, setDatePreset] = useState('all');

  // Get date range based on preset
  const getDateRange = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    switch (preset) {
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
      case 'lastMonth': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { dateFrom: lastMonthStart.toISOString().split('T')[0], dateTo: lastMonthEnd.toISOString().split('T')[0] };
      }
      default:
        return { dateFrom: '', dateTo: '' };
    }
  };

  // SMART SEARCH: Search across Client, Matter, Description, Category
  const matchesSearch = (exp, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Check description
    if (exp.description?.toLowerCase().includes(term)) return true;
    
    // Check client name
    const client = clients.find(c => c.client_id === exp.client_id);
    if (client?.client_name?.toLowerCase().includes(term)) return true;
    
    // Check matter name
    const matter = matters.find(m => m.matter_id === exp.matter_id);
    if (matter?.matter_name?.toLowerCase().includes(term)) return true;
    
    // Check category name
    const category = expenseCategories.find(c => c.category_id === exp.category_id);
    if (category?.name_en?.toLowerCase().includes(term)) return true;
    if (category?.name_ar?.toLowerCase().includes(term)) return true;
    
    return false;
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (expenseFilters.clientId && exp.client_id !== expenseFilters.clientId) return false;
      if (expenseFilters.matterId && exp.matter_id !== expenseFilters.matterId) return false;
      if (expenseFilters.paidBy === 'firm' && exp.paid_by_firm !== 1) return false;
      if (expenseFilters.paidBy && expenseFilters.paidBy !== 'firm' && exp.paid_by_lawyer_id !== expenseFilters.paidBy) return false;
      if (expenseFilters.status && exp.status !== expenseFilters.status) return false;
      if (expenseFilters.billable === 'yes' && !exp.billable) return false;
      if (expenseFilters.billable === 'no' && exp.billable) return false;
      if (expenseFilters.dateFrom && exp.date < expenseFilters.dateFrom) return false;
      if (expenseFilters.dateTo && exp.date > expenseFilters.dateTo) return false;
      
      // Smart search
      if (expenseFilters.search && !matchesSearch(exp, expenseFilters.search)) return false;
      
      return true;
    });
  }, [expenses, expenseFilters, clients, matters, expenseCategories]);

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / expensePageSize);
  const startIdx = (expensePage - 1) * expensePageSize;
  const paginatedExpenses = filteredExpenses.slice(startIdx, startIdx + expensePageSize);

  // v46.46: Memoize totals calculation
  const expenseTotals = useMemo(() => 
    filteredExpenses.reduce((acc, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      acc.total += amount;
      if (exp.billable) acc.billable += amount;
      else acc.nonBillable += amount;
      return acc;
    }, { total: 0, billable: 0, nonBillable: 0 }),
    [filteredExpenses]
  );

  // v46.46: Memoize filtered matters by selected client
  const filteredMatters = useMemo(() => 
    expenseFilters.clientId ? matters.filter(m => m.client_id === expenseFilters.clientId) : [],
    [expenseFilters.clientId, matters]
  );

  const handleFilterChange = (field, value) => {
    setExpenseFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      if (field === 'clientId') newFilters.matterId = '';
      return newFilters;
    });
    setExpensePage(1);
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setExpenseFilters(prev => ({ ...prev, ...range }));
    }
    setExpensePage(1);
  };

  const handleCustomDateChange = (field, value) => {
    setExpenseFilters(prev => ({ ...prev, [field]: value }));
    setDatePreset('custom');
  };

  const clearAllFilters = () => {
    setExpenseFilters({ clientId: '', matterId: '', paidBy: '', status: '', billable: '', dateFrom: '', dateTo: '', search: '' });
    setDatePreset('all');
    setExpensePage(1);
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'client':
        handleFilterChange('clientId', '');
        break;
      case 'matter':
        handleFilterChange('matterId', '');
        break;
      case 'paidBy':
        handleFilterChange('paidBy', '');
        break;
      case 'status':
        handleFilterChange('status', '');
        break;
      case 'billable':
        handleFilterChange('billable', '');
        break;
      case 'date':
        setDatePreset('all');
        setExpenseFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        break;
      case 'search':
        handleFilterChange('search', '');
        break;
    }
  };

  // Build active filter chips
  const getActiveFilters = () => {
    const chips = [];
    
    if (expenseFilters.clientId) {
      const client = clients.find(c => c.client_id === expenseFilters.clientId);
      chips.push({ key: 'client', label: `Client: ${client?.client_name}` });
    }
    if (expenseFilters.matterId) {
      const matter = matters.find(m => m.matter_id === expenseFilters.matterId);
      chips.push({ key: 'matter', label: `Matter: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (expenseFilters.paidBy) {
      if (expenseFilters.paidBy === 'firm') {
        chips.push({ key: 'paidBy', label: 'Paid By: Firm' });
      } else {
        const lawyer = lawyers.find(l => l.lawyer_id === expenseFilters.paidBy);
        chips.push({ key: 'paidBy', label: `Paid By: ${lawyer?.full_name || lawyer?.name}` });
      }
    }
    if (expenseFilters.status) {
      // Show "Unbilled" instead of "Pending" in chip
      const statusLabel = expenseFilters.status === 'pending' ? 'Unbilled' : 
        expenseFilters.status.charAt(0).toUpperCase() + expenseFilters.status.slice(1);
      chips.push({ key: 'status', label: `Status: ${statusLabel}` });
    }
    if (expenseFilters.billable) {
      chips.push({ key: 'billable', label: expenseFilters.billable === 'yes' ? 'Billable' : 'Non-billable' });
    }
    
    // Date filter
    if (datePreset !== 'all' || expenseFilters.dateFrom || expenseFilters.dateTo) {
      const presetLabels = { today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', lastMonth: 'Last Month' };
      let label = presetLabels[datePreset];
      if (!label && (expenseFilters.dateFrom || expenseFilters.dateTo)) {
        label = expenseFilters.dateFrom && expenseFilters.dateTo 
          ? `${formatDate(expenseFilters.dateFrom)} - ${formatDate(expenseFilters.dateTo)}`
          : expenseFilters.dateFrom ? `From ${formatDate(expenseFilters.dateFrom)}` : `Until ${formatDate(expenseFilters.dateTo)}`;
      }
      if (label) chips.push({ key: 'date', label: `Date: ${label}` });
    }
    
    if (expenseFilters.search) {
      chips.push({ key: 'search', label: `Search: "${expenseFilters.search}"` });
    }
    
    return chips;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  // Get display status - show "Unbilled" instead of "pending"
  const getDisplayStatus = (status) => {
    if (status === 'pending') {
      return 'Unbilled';
    }
    return status;
  };

  // Get status color class
  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'billed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // WYSIWYG Export - exports current filtered view
  const handleExport = async (format) => {
    try {
      // Build export data from filtered expenses
      const exportData = filteredExpenses.map(exp => {
        const client = clients.find(c => c.client_id === exp.client_id);
        const matter = matters.find(m => m.matter_id === exp.matter_id);
        const category = expenseCategories.find(c => c.category_id === exp.category_id);
        const paidBy = exp.paid_by_firm === 1 
          ? ('Firm')
          : (lawyers.find(l => l.lawyer_id === exp.paid_by_lawyer_id)?.full_name || '--');
        
        return {
          date: formatDate(exp.date),
          client: client?.client_name || '--',
          matter: `${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || '--'}${matter?.case_number ? ' — ' + matter.case_number : ''}`,
          category: category?.name_en,
          description: exp.description || '',
          amount: `${exp.currency} ${parseFloat(exp.amount).toFixed(2)}`,
          paidBy: paidBy,
          attachmentNote: exp.attachment_note || '',
          status: getDisplayStatus(exp.status),
          billable: exp.billable ? ('Yes') : ('No')
        };
      });

      if (format === 'excel') {
        await electronAPI.exportExpensesToExcel(exportData, {
          totals: expenseTotals,
          filters: hasActiveFilters ? activeFilters.map(f => f.label).join(', ') : 'None'
        });
        showToast('Excel exported successfully');
      } else if (format === 'pdf') {
        await electronAPI.exportExpensesToPDF(exportData, {
          totals: expenseTotals,
          filters: hasActiveFilters ? activeFilters.map(f => f.label).join(', ') : 'None'
        });
        showToast('PDF exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Expenses'}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => openForm('expense')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-5 h-5" /> {'Add Expense'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Total'}</div>
          <div className="text-2xl font-bold text-gray-800">${expenseTotals.total.toFixed(2)}</div>
          <div className="text-xs text-gray-400">{filteredExpenses.length} {'Expenses'}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Billable'}</div>
          <div className="text-2xl font-bold text-green-600">${expenseTotals.billable.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Non-Billable'}</div>
          <div className="text-2xl font-bold text-gray-500">${expenseTotals.nonBillable.toFixed(2)}</div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">{'Filters:'}</span>
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
            value={expenseFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder={'Search by client, matter, description, or category...'}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ExportButtons onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} disabled={!filteredExpenses.length} />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select value={expenseFilters.clientId}
            onChange={(e) => handleFilterChange('clientId', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'All Clients'}</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
            ))}
          </select>
          
          <select value={expenseFilters.matterId}
            onChange={(e) => handleFilterChange('matterId', e.target.value)}
            disabled={!expenseFilters.clientId}
            className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-100">
            <option value="">{expenseFilters.clientId ? ('All Matters') : ('Select Client First')}</option>
            {filteredMatters.map(m => (
              <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}</option>
            ))}
          </select>
          
          <select value={expenseFilters.paidBy}
            onChange={(e) => handleFilterChange('paidBy', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'Paid By'}: {'All'}</option>
            <option value="firm">{'Firm'}</option>
            {lawyers.map(l => (
              <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>
            ))}
          </select>
          
          <select value={expenseFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'All Statuses'}</option>
            <option value="pending">{'Unbilled'}</option>
            <option value="approved">{'Approved'}</option>
            <option value="billed">{'Billed'}</option>
          </select>
          
          <select value={expenseFilters.billable}
            onChange={(e) => handleFilterChange('billable', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'Billable'}: {'All'}</option>
            <option value="yes">{'Billable'}</option>
            <option value="no">{'Non-Billable'}</option>
          </select>
          
          <DateFilterDropdown
            value={datePreset}
            dateFrom={expenseFilters.dateFrom}
            dateTo={expenseFilters.dateTo}
            onPresetChange={handleDatePreset}
            onCustomChange={handleCustomDateChange}
            isOpen={openDropdown === 'date'}
            onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
            onClose={() => setOpenDropdown(null)}
                     />
        </div>
      </div>

      {/* Table - UPDATED with Matter column and Attachment icon */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'DATE'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Client'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Matter'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Category'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Description'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Amount'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Paid By'}</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10" title={'Attachment'}>
                <Paperclip className="w-4 h-4 mx-auto" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Status'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedExpenses.length === 0 ? (
              <tr><td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                {hasActiveFilters ? ('No results match filters') : 'No data'}
              </td></tr>
            ) : (
              paginatedExpenses.map(exp => {
                const client = clients.find(c => c.client_id === exp.client_id);
                const matter = matters.find(m => m.matter_id === exp.matter_id);
                const category = expenseCategories.find(c => c.category_id === exp.category_id);
                return (
                  <tr key={exp.expense_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3 text-sm">{client?.client_name || '--'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900">{matter?.matter_name || '--'}</div>
                      {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                        <div className="text-xs text-gray-500 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{category?.name_en}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={exp.description}>{exp.description}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={exp.billable ? 'text-green-700' : 'text-gray-500'}>
                        {exp.currency} {parseFloat(exp.amount).toFixed(2)}
                      </span>
                      {exp.billable && <span className="ml-1 text-xs text-green-600">●</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {exp.paid_by_firm === 1
                        ? ('Firm')
                        : exp.paid_by_lawyer_id
                          ? (lawyers.find(l => l.lawyer_id === exp.paid_by_lawyer_id)?.full_name || '--')
                          : '--'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.attachment_note && (
                        <span title={exp.attachment_note} className="cursor-help">
                          <Paperclip className="w-4 h-4 text-blue-500 mx-auto" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(exp.status)}`}>
                        {getDisplayStatus(exp.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button onClick={() => openForm('expense', exp)}
                        className="text-blue-600 hover:text-blue-900 mr-3">{'Edit'}</button>
                      <button onClick={() => {
                        showConfirm(
                          'Delete Expense',
                          'Are you sure you want to delete this expense?',
                          async () => {
                            await electronAPI.deleteExpense(exp.expense_id);
                            await refreshExpenses();
                            showToast('Expense deleted');
                            hideConfirm();
                          }
                        );
                      }} className="text-red-600 hover:text-red-900">{'Delete'}</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredExpenses.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-600">
            {'Showing'} {startIdx + 1}-{Math.min(startIdx + expensePageSize, filteredExpenses.length)} {'of'} {filteredExpenses.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{'Show'}:</span>
              <select value={expensePageSize}
                onChange={(e) => { setExpensePageSize(Number(e.target.value)); setExpensePage(1); }}
                className="px-2 py-1 border rounded text-sm">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                disabled={expensePage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                {'Prev'}
              </button>
              <span className="text-sm text-gray-600">
                {'Page'} {expensePage} {'of'} {totalPages || 1}
              </span>
              <button onClick={() => setExpensePage(p => Math.min(totalPages, p + 1))}
                disabled={expensePage >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                {'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesList;
