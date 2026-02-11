import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Calendar } from 'lucide-react';
import { EmptyState } from '../common';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';

/**
 * InvoicesList Component - v44.3
 * Hybrid filter design matching TasksList pattern
 * 
 * v44.3 Changes:
 * - Added Smart Search (searches invoice number, client, matter)
 * - Added Filter Chips showing active filters with remove button
 * - Made 4 summary cards clickable (filter by status)
 * - Added DateFilterDropdown with presets (All, This Month, Last Month, This Quarter, This Year, Overdue, Custom)
 * - Improved filter bar layout (5 columns: search, client, matter, status, date)
 * - Added "Clear All" for filter chips
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
};

// ============ HELPER COMPONENTS ============

// Filter Chip Component
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

// Summary Card Component (clickable)
const SummaryCard = ({ label, value, subtext, color = 'gray', active, onClick }) => {
  const colorClasses = {
    gray: 'text-gray-800',
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-md ${
        active ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
    </div>
  );
};

// Date Filter Dropdown Component
const DateFilterDropdown = ({ 
  dateFrom, 
  dateTo, 
  datePreset, 
  onDateChange}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = [
    { key: 'all', label: 'All Dates' },
    { key: 'this_month', label: 'This Month Revenue' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_quarter', label: 'This Quarter' },
    { key: 'this_year', label: 'This Year' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'custom', label: 'Custom Range...' }
  ];

  const getPresetDates = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preset) {
      case 'all':
        return { from: '', to: '' };
      case 'this_month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { 
          from: firstDay.toISOString().split('T')[0], 
          to: lastDay.toISOString().split('T')[0] 
        };
      }
      case 'last_month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return { 
          from: firstDay.toISOString().split('T')[0], 
          to: lastDay.toISOString().split('T')[0] 
        };
      }
      case 'this_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
        const lastDay = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        return { 
          from: firstDay.toISOString().split('T')[0], 
          to: lastDay.toISOString().split('T')[0] 
        };
      }
      case 'this_year': {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const lastDay = new Date(today.getFullYear(), 11, 31);
        return { 
          from: firstDay.toISOString().split('T')[0], 
          to: lastDay.toISOString().split('T')[0] 
        };
      }
      case 'overdue': {
        // Overdue = due date before today
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { 
          from: '2000-01-01', 
          to: yesterday.toISOString().split('T')[0],
          isOverdue: true
        };
      }
      default:
        return { from: '', to: '' };
    }
  };

  const handlePresetClick = (preset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      setTempFrom(dateFrom);
      setTempTo(dateTo);
    } else {
      const dates = getPresetDates(preset);
      onDateChange(dates.from, dates.to, preset);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const handleCustomApply = () => {
    onDateChange(tempFrom, tempTo, 'custom');
    setIsOpen(false);
    setShowCustom(false);
  };

  const getDisplayLabel = () => {
    if (!datePreset || datePreset === 'all') {
      return 'All Dates';
    }
    if (datePreset === 'custom') {
      if (dateFrom && dateTo) {
        return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
      }
      return 'Custom Range...';
    }
    const preset = presets.find(p => p.key === datePreset);
    return preset ? preset.label : ('All Dates');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 ${
          datePreset && datePreset !== 'all' ? 'border-blue-500 bg-blue-50' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="truncate">{getDisplayLabel()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white border rounded-lg shadow-lg">
          {!showCustom ? (
            <div className="py-1">
              {presets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset.key)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    datePreset === preset.key ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium text-gray-700">
                {'Custom Range...'}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">{'From'}</label>
                  <input
                    type="date"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{'To'}</label>
                  <input
                    type="date"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustom(false)}
                  className="flex-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  {'Back'}
                </button>
                <button
                  onClick={handleCustomApply}
                  className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {'Apply'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============

const InvoicesList = ({
  invoices,
  clients,
  matters,
  setViewingInvoice,
  showConfirm,
  showToast,
  hideConfirm,
  refreshInvoices
}) => {
  const { openForm } = useUI();
  const { filters: invoiceFilters, page: invoicePage, pageSize: invoicePageSize, setFilter: _invSetFilter, setPage: setInvoicePage, setPageSize: setInvoicePageSize } = useFilters('invoices');
  const setInvoiceFilters = (updaterOrValue) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(invoiceFilters) : updaterOrValue;
    Object.keys(next).forEach(k => _invSetFilter(k, next[k]));
  };
  // ============ FILTERING LOGIC ============
  
  // Filter invoices with smart search
  const filteredInvoices = invoices.filter(inv => {
    // Smart search - searches invoice number, client name, matter name
    if (invoiceFilters.search) {
      const searchLower = invoiceFilters.search.toLowerCase();
      const client = clients.find(c => c.client_id === inv.client_id);
      const matter = matters.find(m => m.matter_id === inv.matter_id);
      const invoiceNumber = (inv.invoice_number || '').toLowerCase();
      const clientName = (client?.client_name || '').toLowerCase();
      const clientNameAr = (client?.client_name_ar || '').toLowerCase();
      const matterName = (matter?.matter_name || '').toLowerCase();
      const matterNameAr = (matter?.matter_name_ar || '').toLowerCase();
      
      if (!invoiceNumber.includes(searchLower) && 
          !clientName.includes(searchLower) && 
          !clientNameAr.includes(searchLower) &&
          !matterName.includes(searchLower) &&
          !matterNameAr.includes(searchLower)) {
        return false;
      }
    }
    
    // Client filter
    if (invoiceFilters.clientId && String(inv.client_id) !== String(invoiceFilters.clientId)) return false;
    
    // Matter filter
    if (invoiceFilters.matterId && String(inv.matter_id) !== String(invoiceFilters.matterId)) return false;
    
    // Status filter
    if (invoiceFilters.status && inv.status !== invoiceFilters.status) return false;
    
    // Date filter (based on dateType: issue or due)
    const dateField = invoiceFilters.dateType === 'due' ? inv.due_date : inv.issue_date;
    
    // Special handling for overdue preset
    if (invoiceFilters.datePreset === 'overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      if (!dueDate || dueDate >= today || inv.status === 'paid' || inv.status === 'cancelled') {
        return false;
      }
    } else {
      if (invoiceFilters.dateFrom && dateField && dateField < invoiceFilters.dateFrom) return false;
      if (invoiceFilters.dateTo && dateField && dateField > invoiceFilters.dateTo) return false;
    }
    
    return true;
  });

  // ============ PAGINATION ============
  
  const totalPages = Math.ceil(filteredInvoices.length / invoicePageSize);
  const startIdx = (invoicePage - 1) * invoicePageSize;
  const paginatedInvoices = filteredInvoices.slice(startIdx, startIdx + invoicePageSize);

  // ============ CALCULATE TOTALS ============
  
  // Totals from ALL invoices (for summary cards)
  const allInvoiceTotals = invoices.reduce((acc, inv) => {
    const amount = parseFloat(inv.total) || 0;
    acc.total += amount;
    acc.count++;
    if (inv.status === 'paid') {
      acc.paid += amount;
      acc.paidCount++;
    } else if (inv.status !== 'cancelled' && inv.status !== 'draft') {
      acc.outstanding += amount;
      acc.outstandingCount++;
    }
    // Check if overdue
    if (inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(inv.due_date);
      if (dueDate < today) {
        acc.overdueAmount += amount;
        acc.overdueCount++;
      }
    }
    return acc;
  }, { total: 0, count: 0, paid: 0, paidCount: 0, outstanding: 0, outstandingCount: 0, overdueAmount: 0, overdueCount: 0 });

  // ============ CASCADING FILTERS ============
  
  // Filter matters by selected client
  const invoiceFilteredMatters = invoiceFilters.clientId 
    ? matters.filter(m => String(m.client_id) === String(invoiceFilters.clientId))
    : [];

  // ============ FILTER HANDLERS ============
  
  const handleFilterChange = (field, value) => {
    setInvoiceFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      // Clear matter when client changes
      if (field === 'clientId') newFilters.matterId = '';
      return newFilters;
    });
    setInvoicePage(1);
  };

  const handleDateChange = (from, to, preset) => {
    setInvoiceFilters(prev => ({
      ...prev,
      dateFrom: from,
      dateTo: to,
      datePreset: preset,
      // Switch to due date type for overdue preset
      dateType: preset === 'overdue' ? 'due' : prev.dateType
    }));
    setInvoicePage(1);
  };

  const clearFilters = () => {
    setInvoiceFilters({ 
      clientId: '', 
      matterId: '', 
      status: '', 
      dateType: 'issue', 
      dateFrom: '', 
      dateTo: '', 
      datePreset: 'all',
      search: '' 
    });
    setInvoicePage(1);
  };

  const hasActiveFilters = invoiceFilters.clientId || invoiceFilters.matterId || 
    invoiceFilters.status || invoiceFilters.dateFrom || invoiceFilters.dateTo ||
    invoiceFilters.search || (invoiceFilters.datePreset && invoiceFilters.datePreset !== 'all');

  // ============ BUILD FILTER CHIPS ============
  
  const filterChips = [];
  
  if (invoiceFilters.search) {
    filterChips.push({
      key: 'search',
      label: `${'Search'}: "${invoiceFilters.search}"`,
      onRemove: () => handleFilterChange('search', '')
    });
  }
  
  if (invoiceFilters.clientId) {
    const client = clients.find(c => String(c.client_id) === String(invoiceFilters.clientId));
    filterChips.push({
      key: 'client',
      label: `${'Client'}: ${client?.client_name || 'Unknown'}`,
      onRemove: () => { handleFilterChange('clientId', ''); handleFilterChange('matterId', ''); }
    });
  }
  
  if (invoiceFilters.matterId) {
    const matter = matters.find(m => String(m.matter_id) === String(invoiceFilters.matterId));
    filterChips.push({
      key: 'matter',
      label: `${'Matter'}: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || 'Unknown'}`,
      onRemove: () => handleFilterChange('matterId', '')
    });
  }
  
  if (invoiceFilters.status) {
    const statusLabels = {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      partial: 'Partial',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled'
    };
    filterChips.push({
      key: 'status',
      label: `${'Status'}: ${statusLabels[invoiceFilters.status] || invoiceFilters.status}`,
      onRemove: () => handleFilterChange('status', '')
    });
  }
  
  if (invoiceFilters.datePreset && invoiceFilters.datePreset !== 'all') {
    const presetLabels = {
      this_month: 'This Month Revenue',
      last_month: 'Last Month',
      this_quarter: 'This Quarter',
      this_year: 'This Year',
      overdue: 'Overdue',
      custom: invoiceFilters.dateFrom && invoiceFilters.dateTo 
        ? `${formatDate(invoiceFilters.dateFrom)} - ${formatDate(invoiceFilters.dateTo)}`
        : ('Custom Range...')
    };
    filterChips.push({
      key: 'date',
      label: `${'DATE'}: ${presetLabels[invoiceFilters.datePreset] || invoiceFilters.datePreset}`,
      onRemove: () => handleDateChange('', '', 'all')
    });
  }

  // ============ EMPTY STATE ============
  
  if (invoices.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{'Invoices'}</h2>
        </div>
        <div className="bg-white rounded-lg shadow">
          <EmptyState
            type="invoices"
            title={'No invoices yet'}
            description={'Create invoices to bill your clients.'}
            actionLabel={'Create Invoice'}
            onAction={() => openForm('invoice')}
          />
        </div>
      </div>
    );
  }

  // ============ STATUS COLORS ============
  
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  // ============ RENDER ============
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Invoices'}</h2>
        <button onClick={() => openForm('invoice')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {'Create Invoice'}
        </button>
      </div>

      {/* Summary Cards (Clickable) */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label={'Total Invoiced'}
          value={`$${allInvoiceTotals.total.toFixed(2)}`}
          subtext={`${allInvoiceTotals.count} ${'Invoices'}`}
          color="gray"
          active={!invoiceFilters.status && !invoiceFilters.datePreset}
          onClick={() => { handleFilterChange('status', ''); handleDateChange('', '', 'all'); }}
        />
        <SummaryCard
          label={'Paid'}
          value={`$${allInvoiceTotals.paid.toFixed(2)}`}
          subtext={`${allInvoiceTotals.paidCount} ${'Invoices'}`}
          color="green"
          active={invoiceFilters.status === 'paid'}
          onClick={() => handleFilterChange('status', invoiceFilters.status === 'paid' ? '' : 'paid')}
        />
        <SummaryCard
          label={'Outstanding'}
          value={`$${allInvoiceTotals.outstanding.toFixed(2)}`}
          subtext={`${allInvoiceTotals.outstandingCount} ${'Invoices'}`}
          color="blue"
          active={invoiceFilters.status === 'sent' || invoiceFilters.status === 'viewed' || invoiceFilters.status === 'partial'}
          onClick={() => handleFilterChange('status', invoiceFilters.status === 'sent' ? '' : 'sent')}
        />
        <SummaryCard
          label={'Overdue'}
          value={allInvoiceTotals.overdueCount}
          subtext={`$${allInvoiceTotals.overdueAmount.toFixed(2)} ${'Overdue'}`}
          color="red"
          active={invoiceFilters.datePreset === 'overdue'}
          onClick={() => {
            if (invoiceFilters.datePreset === 'overdue') {
              handleDateChange('', '', 'all');
            } else {
              handleDateChange('', '', 'overdue');
            }
          }}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        {/* Search + Dropdowns Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Smart Search */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={invoiceFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={'Search invoice #, client, matter...'}
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Client Dropdown */}
          <select 
            value={invoiceFilters.clientId}
            onChange={(e) => handleFilterChange('clientId', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">{'All Clients'}</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name}
              </option>
            ))}
          </select>
          
          {/* Matter Dropdown (cascading) */}
          <select 
            value={invoiceFilters.matterId}
            onChange={(e) => handleFilterChange('matterId', e.target.value)}
            disabled={!invoiceFilters.clientId}
            className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{'All Matters'}</option>
            {invoiceFilteredMatters.map(m => (
              <option key={m.matter_id} value={m.matter_id}>
                {`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}
              </option>
            ))}
          </select>
          
          {/* Status Dropdown */}
          <select 
            value={invoiceFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">{'All Statuses'}</option>
            <option value="draft">{'Draft'}</option>
            <option value="sent">{'Sent'}</option>
            <option value="viewed">{'Viewed'}</option>
            <option value="partial">{'Partial'}</option>
            <option value="paid">{'Paid'}</option>
            <option value="overdue">{'Overdue'}</option>
            <option value="cancelled">{'Cancelled'}</option>
          </select>
          
          {/* Date Filter Dropdown */}
          <DateFilterDropdown
            dateFrom={invoiceFilters.dateFrom}
            dateTo={invoiceFilters.dateTo}
            datePreset={invoiceFilters.datePreset || 'all'}
            onDateChange={handleDateChange}
          />
        </div>
        
        {/* Filter Chips Row */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-xs text-gray-500">{'Active filters'}</span>
            {filterChips.map(chip => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-800 ml-2"
            >
              {'Clear All'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Invoice Number'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Client'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Issue Date'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Due Date'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Total'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{'Status'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedInvoices.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                {hasActiveFilters 
                  ? ('No results match filters') 
                  : 'No data'}
              </td></tr>
            ) : (
              paginatedInvoices.map(inv => {
                const client = clients.find(c => c.client_id === inv.client_id);
                return (
                  <tr key={inv.invoice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">
                      {client?.client_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDate(inv.issue_date)}</td>
                    <td className="px-6 py-4 text-sm">{inv.due_date ? formatDate(inv.due_date) : '--'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{inv.currency} {parseFloat(inv.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[inv.status] || 'bg-gray-100'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => setViewingInvoice(inv)}
                        className="text-purple-600 hover:text-purple-900 mr-3">{'View'}</button>
                      {inv.status === 'draft' && (
                        <>
                          <button onClick={() => openForm('invoice', inv)}
                            className="text-blue-600 hover:text-blue-900 mr-3">{'Edit'}</button>
                          <button onClick={async () => {
                            await window.electronAPI.updateInvoiceStatus(inv.invoice_id, 'sent');
                            await refreshInvoices();
                            showToast('Invoice marked as sent');
                          }} className="text-green-600 hover:text-green-900 mr-3">{'Mark as Sent'}</button>
                        </>
                      )}
                      {(inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'partial') && (
                        <button onClick={async () => {
                          await window.electronAPI.updateInvoiceStatus(inv.invoice_id, 'paid');
                          await refreshInvoices();
                          showToast('Invoice marked as paid');
                        }} className="text-green-600 hover:text-green-900 mr-3">{'Mark as Paid'}</button>
                      )}
                      <button onClick={() => {
                        showConfirm(
                          'Delete Invoice',
                          'Are you sure you want to delete this invoice?',
                          async () => {
                            await window.electronAPI.deleteInvoice(inv.invoice_id);
                            await refreshInvoices();
                            showToast('Invoice deleted');
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
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-600">
            {'Showing'}: {filteredInvoices.length} {'Invoices'}
            {filteredInvoices.length !== invoices.length && ` (${'of'} ${invoices.length})`}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{'Show'}:</span>
              <select value={invoicePageSize}
                onChange={(e) => { setInvoicePageSize(Number(e.target.value)); setInvoicePage(1); }}
                className="px-2 py-1 border rounded text-sm">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                disabled={invoicePage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                {'Prev'}
              </button>
              <span className="text-sm text-gray-600">
                {'Page'} {invoicePage} {'of'} {totalPages || 1}
              </span>
              <button onClick={() => setInvoicePage(p => Math.min(totalPages, p + 1))}
                disabled={invoicePage >= totalPages}
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

export default InvoicesList;
