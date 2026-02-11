import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown } from 'lucide-react';
import ExportButtons from '../common/ExportButtons';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';
import apiClient from '../../api-client';
/**
 * TimesheetsList Component - v46.46
 * 
 * v46.46 Changes:
 * - Added useMemo for timesheetTotals and filteredMatters (performance)
 *
 * v44.2 Changes:
 * - Added Smart Search (searches client, matter, description)
 * - Added Filter Chips showing active filters with remove button
 * - Replaced date inputs with DateFilterDropdown (presets)
 * - Cleaner 5-column filter layout
 * - Kept 3 summary cards unchanged
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

const TimesheetsList = ({
  timesheets,
  clients,
  matters,
  lawyers,
  showConfirm,
  showToast,
  hideConfirm,
  refreshTimesheets
}) => {
  const { openForm } = useUI();
  const { filters: timesheetFilters, page: timesheetPage, pageSize: timesheetPageSize, setFilter: _tsSetFilter, resetFilters: _tsResetFilters, setPage: setTimesheetPage, setPageSize: setTimesheetPageSize } = useFilters('timesheets');
  const setTimesheetFilters = (updaterOrValue) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(timesheetFilters) : updaterOrValue;
    Object.keys(next).forEach(k => _tsSetFilter(k, next[k]));
  };

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

  // SMART SEARCH: Search across Client, Matter, and Description
  const matchesSearch = (ts, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Check description
    if (ts.description?.toLowerCase().includes(term)) return true;
    
    // Check client name
    const client = clients.find(c => c.client_id === ts.client_id);
    if (client?.client_name?.toLowerCase().includes(term)) return true;
    
    // Check matter name
    const matter = matters.find(m => m.matter_id === ts.matter_id);
    if (matter?.matter_name?.toLowerCase().includes(term)) return true;
    
    // Check lawyer name
    const lawyer = lawyers.find(l => l.lawyer_id === ts.lawyer_id);
    if (lawyer?.full_name?.toLowerCase().includes(term)) return true;
    if (lawyer?.name?.toLowerCase().includes(term)) return true;
    
    return false;
  };

  // Filter timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter(ts => {
      if (timesheetFilters.clientId && ts.client_id !== timesheetFilters.clientId) return false;
      if (timesheetFilters.matterId && ts.matter_id !== timesheetFilters.matterId) return false;
      if (timesheetFilters.lawyerId && ts.lawyer_id !== timesheetFilters.lawyerId) return false;
      if (timesheetFilters.billable === 'yes' && !ts.billable) return false;
      if (timesheetFilters.billable === 'no' && ts.billable) return false;
      if (timesheetFilters.dateFrom && ts.date < timesheetFilters.dateFrom) return false;
      if (timesheetFilters.dateTo && ts.date > timesheetFilters.dateTo) return false;
      
      // Smart search
      if (timesheetFilters.search && !matchesSearch(ts, timesheetFilters.search)) return false;
      
      return true;
    });
  }, [timesheets, timesheetFilters, clients, matters, lawyers]);

  // Pagination
  const totalPages = Math.ceil(filteredTimesheets.length / timesheetPageSize);
  const startIdx = (timesheetPage - 1) * timesheetPageSize;
  const paginatedTimesheets = filteredTimesheets.slice(startIdx, startIdx + timesheetPageSize);

  // v46.46: Memoize totals calculation for filtered timesheets (in hours)
  const timesheetTotals = useMemo(() => 
    filteredTimesheets.reduce((acc, ts) => {
      const hours = (ts.minutes || 0) / 60;
      acc.total += hours;
      if (ts.billable) acc.billable += hours;
      else acc.nonBillable += hours;
      return acc;
    }, { total: 0, billable: 0, nonBillable: 0 }),
    [filteredTimesheets]
  );

  // v46.46: Memoize filtered matters by selected client
  const filteredMatters = useMemo(() => 
    timesheetFilters.clientId ? matters.filter(m => m.client_id === timesheetFilters.clientId) : [],
    [timesheetFilters.clientId, matters]
  );

  const handleFilterChange = (field, value) => {
    setTimesheetFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      if (field === 'clientId') newFilters.matterId = '';
      return newFilters;
    });
    setTimesheetPage(1);
  };

  // Export helpers - v46.55
  const prepareExportData = () => {
    return filteredTimesheets.map(ts => {
      const client = clients.find(c => c.client_id === ts.client_id);
      const matter = matters.find(m => m.matter_id === ts.matter_id);
      const lawyer = lawyers.find(l => l.lawyer_id === ts.lawyer_id);
      const hours = ((ts.minutes || 0) / 60).toFixed(2);
      const amount = ts.rate_per_hour ? (hours * ts.rate_per_hour).toFixed(2) : '0.00';
      return {
        'Date': ts.date ? new Date(ts.date).toLocaleDateString() : '',
        'Lawyer': lawyer ? (lawyer.full_name) : '',
        'Client': client?.client_name || '',
        'Matter': (matter?.matter_name || ''),
        'File No.': matter?.custom_matter_number || '',
        'Hours': hours,
        'Billable': ts.billable ? 'Yes' : 'No',
        'Amount': amount,
        'Description': ts.description || ''
      };
    });
  };

  const handleExportExcel = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const result = await apiClient.exportToExcel(data, 'Timesheets');
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleExportPdf = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const columns = ['Date', 'Lawyer', 'Client', 'Matter', 'File No.', 'Hours', 'Billable', 'Amount'];
    const result = await apiClient.exportToPdf(data, 'Timesheets', columns);
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setTimesheetFilters(prev => ({ ...prev, ...range }));
    }
    setTimesheetPage(1);
  };

  const handleCustomDateChange = (field, value) => {
    setTimesheetFilters(prev => ({ ...prev, [field]: value }));
    setDatePreset('custom');
  };

  const clearAllFilters = () => {
    setTimesheetFilters({ clientId: '', matterId: '', lawyerId: '', billable: '', dateFrom: '', dateTo: '', search: '' });
    setDatePreset('all');
    setTimesheetPage(1);
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'client':
        handleFilterChange('clientId', '');
        break;
      case 'matter':
        handleFilterChange('matterId', '');
        break;
      case 'lawyer':
        handleFilterChange('lawyerId', '');
        break;
      case 'billable':
        handleFilterChange('billable', '');
        break;
      case 'date':
        setDatePreset('all');
        setTimesheetFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        break;
      case 'search':
        handleFilterChange('search', '');
        break;
    }
  };

  // Build active filter chips
  const getActiveFilters = () => {
    const chips = [];
    
    if (timesheetFilters.clientId) {
      const client = clients.find(c => c.client_id === timesheetFilters.clientId);
      chips.push({ key: 'client', label: `Client: ${client?.client_name}` });
    }
    if (timesheetFilters.matterId) {
      const matter = matters.find(m => m.matter_id === timesheetFilters.matterId);
      chips.push({ key: 'matter', label: `Matter: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (timesheetFilters.lawyerId) {
      const lawyer = lawyers.find(l => l.lawyer_id === timesheetFilters.lawyerId);
      chips.push({ key: 'lawyer', label: `Lawyer: ${lawyer?.full_name || lawyer?.name}` });
    }
    if (timesheetFilters.billable) {
      chips.push({ key: 'billable', label: timesheetFilters.billable === 'yes' ? 'Billable' : 'Non-billable' });
    }
    
    // Date filter
    if (datePreset !== 'all' || timesheetFilters.dateFrom || timesheetFilters.dateTo) {
      const presetLabels = { today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', lastMonth: 'Last Month' };
      let label = presetLabels[datePreset];
      if (!label && (timesheetFilters.dateFrom || timesheetFilters.dateTo)) {
        label = timesheetFilters.dateFrom && timesheetFilters.dateTo 
          ? `${formatDate(timesheetFilters.dateFrom)} - ${formatDate(timesheetFilters.dateTo)}`
          : timesheetFilters.dateFrom ? `From ${formatDate(timesheetFilters.dateFrom)}` : `Until ${formatDate(timesheetFilters.dateTo)}`;
      }
      if (label) chips.push({ key: 'date', label: `Date: ${label}` });
    }
    
    if (timesheetFilters.search) {
      chips.push({ key: 'search', label: `Search: "${timesheetFilters.search}"` });
    }
    
    return chips;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center" data-tour="timesheets-header">
        <h2 className="text-2xl font-bold">{'Timesheets'}</h2>
        <button onClick={() => openForm('timesheet')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          data-tour="add-timesheet-btn">
          <Plus className="w-5 h-5" /> {'Add Timesheet'}
        </button>
      </div>

      {/* Summary Cards - UNCHANGED */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Total Hours'}</div>
          <div className="text-2xl font-bold text-gray-800">{timesheetTotals.total.toFixed(1)}h</div>
          <div className="text-xs text-gray-400">{filteredTimesheets.length} {'entries'}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Billable Hours'}</div>
          <div className="text-2xl font-bold text-green-600">{timesheetTotals.billable.toFixed(1)}h</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{'Non-billable Hours'}</div>
          <div className="text-2xl font-bold text-gray-500">{timesheetTotals.nonBillable.toFixed(1)}h</div>
        </div>
      </div>

      {/* Active Filter Chips - NEW */}
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

      {/* Smart Search Bar - NEW */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={timesheetFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder={'Search by client, matter, or description...'}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ExportButtons onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} disabled={!filteredTimesheets.length} />
      </div>

      {/* Filter Bar - CLEANER 5 COLUMNS */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={timesheetFilters.clientId}
            onChange={(e) => handleFilterChange('clientId', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'All Clients'}</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
            ))}
          </select>
          
          <select value={timesheetFilters.matterId}
            onChange={(e) => handleFilterChange('matterId', e.target.value)}
            disabled={!timesheetFilters.clientId}
            className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-100">
            <option value="">{timesheetFilters.clientId ? ('All Matters') : ('Select Client First')}</option>
            {filteredMatters.map(m => (
              <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}</option>
            ))}
          </select>
          
          <select value={timesheetFilters.lawyerId}
            onChange={(e) => handleFilterChange('lawyerId', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'All Lawyers'}</option>
            {lawyers.map(l => (
              <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>
            ))}
          </select>
          
          <select value={timesheetFilters.billable}
            onChange={(e) => handleFilterChange('billable', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm">
            <option value="">{'Billable'}: {'All'}</option>
            <option value="yes">{'Billable'}</option>
            <option value="no">{'Non-Billable'}</option>
          </select>
          
          <DateFilterDropdown
            value={datePreset}
            dateFrom={timesheetFilters.dateFrom}
            dateTo={timesheetFilters.dateTo}
            onPresetChange={handleDatePreset}
            onCustomChange={handleCustomDateChange}
            isOpen={openDropdown === 'date'}
            onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
            onClose={() => setOpenDropdown(null)}
                     />
        </div>
      </div>

      {/* Table - UNCHANGED */}
      <div className="bg-white rounded-lg shadow overflow-hidden" data-tour="timesheet-list">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'DATE'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Lawyer'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Client'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Matter'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Hours'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Billable'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Amount'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTimesheets.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                {hasActiveFilters ? ('No results match filters') : 'No data'}
              </td></tr>
            ) : (
              paginatedTimesheets.map(ts => {
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
                    <td className="px-6 py-4 text-sm">
                      <div className="text-gray-900">{matter?.matter_name || '--'}</div>
                      {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                        <div className="text-xs text-gray-500 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{hours}h</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${ts.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ts.billable ? 'Billable' : 'Non-Billable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">${amount}</td>
                    <td className="px-6 py-4 text-sm">
                      {ts.status !== 'billed' && (
                        <>
                          <button onClick={() => openForm('timesheet', ts)}
                            className="text-blue-600 hover:text-blue-900 mr-3">{'Edit'}</button>
                          <button onClick={() => {
                            showConfirm(
                              'Delete Timesheet',
                              'Are you sure you want to delete this timesheet?',
                              async () => {
                                await apiClient.deleteTimesheet(ts.timesheet_id);
                                await refreshTimesheets();
                                showToast('Timesheet deleted');
                                hideConfirm();
                              }
                            );
                          }} className="text-red-600 hover:text-red-900">{'Delete'}</button>
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

      {/* Pagination - UNCHANGED */}
      {filteredTimesheets.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-600">
            {'Showing'} {startIdx + 1}-{Math.min(startIdx + timesheetPageSize, filteredTimesheets.length)} {'of'} {filteredTimesheets.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{'Show'}:</span>
              <select value={timesheetPageSize}
                onChange={(e) => { setTimesheetPageSize(Number(e.target.value)); setTimesheetPage(1); }}
                className="px-2 py-1 border rounded text-sm">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTimesheetPage(p => Math.max(1, p - 1))}
                disabled={timesheetPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                {'Prev'}
              </button>
              <span className="text-sm text-gray-600">
                {'Page'} {timesheetPage} {'of'} {totalPages || 1}
              </span>
              <button onClick={() => setTimesheetPage(p => Math.min(totalPages, p + 1))}
                disabled={timesheetPage >= totalPages}
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

export default TimesheetsList;
