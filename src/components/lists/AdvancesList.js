import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, DollarSign, Receipt, UserCircle } from 'lucide-react';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

/**
 * AdvancesList Component - v46.42 Global Min Balance Setting
 * 
 * Features:
 * - Summary cards: Total Fees, Expense Advances, Lawyer Advances (clickable to switch tabs)
 * - 3 Tabs: Fees | Expense Advances | Lawyer Advances  
 * - Per-lawyer balance cards (on Lawyer Advances tab)
 * - Smart search (client, lawyer, description)
 * - Column header dropdowns for filtering
 * - Date presets dropdown
 * - Filter chips with Clear All
 * - Always visible pagination (25/50/100)
 * - Tab-specific columns:
 *   - Fees: DATE, CLIENT, TYPE, AMOUNT, BALANCE, STATUS
 *   - Expense Advances: DATE, CLIENT, AMOUNT, BALANCE, STATUS
 *   - Lawyer Advances: DATE, LAWYER, CLIENT, AMOUNT, STATUS
 * 
 * v46.31: Full hybrid filter redesign matching gold standard
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Dropdown component for column header filters
const FilterDropdown = ({ label, value, options, onChange, isOpen, onToggle, onClose }) => {
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

  const displayValue = value ? options.find(o => o.value === value)?.label || value : label;
  const isFiltered = value && value !== '' && value !== 'all';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded hover:bg-gray-200 transition ${isFiltered ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
      >
        {displayValue}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[180px] max-h-64 overflow-y-auto">
          {options.map(opt => (
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
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded hover:bg-gray-200 transition ${isFiltered ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
      >
        {'DATE'}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[200px]">
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
                <input type="date" value={dateFrom || ''} onChange={(e) => onCustomChange('dateFrom', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-500">{'To'}</label>
                <input type="date" value={dateTo || ''} onChange={(e) => onCustomChange('dateTo', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
              </div>
              <button onClick={() => { onPresetChange('custom'); onClose(); }} className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                {'Apply'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Filter chip component
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
  </span>
);

// Summary card component - clickable to switch tabs
const SummaryCard = ({ label, amount, subtitle, color, isActive, onClick }) => {
  const colorClasses = {
    blue: isActive ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
    green: isActive ? 'bg-green-100 border-green-400' : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50',
    orange: isActive ? 'bg-orange-100 border-orange-400' : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50',
  };
  const textColors = { blue: 'text-blue-600', green: 'text-green-600', orange: 'text-orange-600' };

  return (
    <button onClick={onClick} className={`flex-1 p-4 rounded-lg border-2 transition-all cursor-pointer text-left ${colorClasses[color]}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${textColors[color]}`}>${amount.toFixed(2)}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </button>
  );
};

const AdvancesList = ({
  advances, lawyers, expenses, clients, showConfirm, hideConfirm, showToast, refreshAdvances,
  lawyerAdvanceMinBalance = 500 // Global setting for minimum balance warning
}) => {
  const { openForm } = useUI();
  const [activeTab, setActiveTab] = useState('fees');
  const [filters, setFilters] = useState({ client: '', lawyer: '', type: '', status: '', datePreset: 'all', dateFrom: '', dateTo: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const isFeeType = (type) => type === 'client_retainer' || type?.startsWith('fee_payment');
  const isFeePayment = (type) => type?.startsWith('fee_payment');

  // Calculate totals
  const totals = useMemo(() => {
    const retainers = advances.filter(a => a.advance_type === 'client_retainer').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    const feePayments = advances.filter(a => a.advance_type?.startsWith('fee_payment')).reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    const expenseAdvances = advances.filter(a => a.advance_type === 'client_expense_advance').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    const lawyerAdvances = advances.filter(a => a.advance_type === 'lawyer_advance').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    return { allFees: retainers + feePayments, retainers, feePayments, expenseAdvances, lawyerAdvances };
  }, [advances]);

  // Per-lawyer balances
  const lawyerBalances = useMemo(() => {
    return lawyers.map(lawyer => {
      const lawyerAdv = advances.filter(a => a.advance_type === 'lawyer_advance' && a.lawyer_id === lawyer.lawyer_id);
      const totalAdvanced = lawyerAdv.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
      const balanceFromAdv = lawyerAdv.reduce((sum, a) => sum + parseFloat(a.balance_remaining ?? a.amount ?? 0), 0);
      const expensesPaid = expenses.filter(e => e.paid_by_lawyer_id === lawyer.lawyer_id).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalSpent = Math.max(totalAdvanced - balanceFromAdv, expensesPaid);
      return { lawyer_id: lawyer.lawyer_id, name: lawyer.full_name || lawyer.name, totalAdvanced, totalSpent, netBalance: totalAdvanced - totalSpent };
    }).filter(lb => lb.totalAdvanced > 0 || lb.totalSpent > 0);
  }, [lawyers, advances, expenses]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    fees: advances.filter(a => isFeeType(a.advance_type)).length,
    expense_advances: advances.filter(a => a.advance_type === 'client_expense_advance').length,
    lawyer_advances: advances.filter(a => a.advance_type === 'lawyer_advance').length
  }), [advances]);

  // Date range helper
  const getDateRange = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    switch (preset) {
      case 'today': return { start: todayStr, end: todayStr };
      case 'thisWeek': {
        const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return { start: ws.toISOString().split('T')[0], end: we.toISOString().split('T')[0] };
      }
      case 'thisMonth': {
        const ms = new Date(now.getFullYear(), now.getMonth(), 1);
        const me = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: ms.toISOString().split('T')[0], end: me.toISOString().split('T')[0] };
      }
      case 'lastMonth': {
        const lms = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lme = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lms.toISOString().split('T')[0], end: lme.toISOString().split('T')[0] };
      }
      case 'custom': return { start: filters.dateFrom, end: filters.dateTo };
      default: return { start: null, end: null };
    }
  };

  // Filter advances
  const filteredAdvances = useMemo(() => {
    let result = [...advances];
    // Tab filter
    if (activeTab === 'fees') result = result.filter(a => isFeeType(a.advance_type));
    else if (activeTab === 'expense_advances') result = result.filter(a => a.advance_type === 'client_expense_advance');
    else if (activeTab === 'lawyer_advances') result = result.filter(a => a.advance_type === 'lawyer_advance');
    // Search
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(a => {
        const cl = clients.find(c => c.client_id === a.client_id);
        const la = lawyers.find(l => l.lawyer_id === a.lawyer_id);
        return (cl?.client_name || '').toLowerCase().includes(s) || (la?.full_name || la?.name || '').toLowerCase().includes(s) || (a.fee_description || '').toLowerCase().includes(s);
      });
    }
    // Filters
    if (filters.client) result = result.filter(a => String(a.client_id) === String(filters.client));
    if (filters.lawyer && activeTab === 'lawyer_advances') result = result.filter(a => String(a.lawyer_id) === String(filters.lawyer));
    if (filters.type && activeTab === 'fees') result = result.filter(a => a.advance_type === filters.type);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    // Date
    if (filters.datePreset && filters.datePreset !== 'all') {
      const { start, end } = getDateRange(filters.datePreset);
      if (start) result = result.filter(a => a.date_received >= start);
      if (end) result = result.filter(a => a.date_received <= end);
    }
    return result;
  }, [advances, activeTab, searchTerm, filters, clients, lawyers]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAdvances.length / pageSize));
  const paginatedAdvances = filteredAdvances.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, filters]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters({ client: '', lawyer: '', type: '', status: '', datePreset: 'all', dateFrom: '', dateTo: '' });
    setSearchTerm('');
  };

  // Filter options
  const filterOptions = useMemo(() => ({
    clientOptions: [{ value: '', label: 'All Clients' }, ...clients.map(c => ({ value: c.client_id, label: c.client_name }))],
    lawyerOptions: [{ value: '', label: 'All Lawyers' }, ...lawyers.map(l => ({ value: l.lawyer_id, label: l.full_name || l.name }))],
    typeOptions: [
      { value: '', label: 'All Types' },
      { value: 'client_retainer', label: 'Client Retainer' },
      { value: 'fee_payment_fixed', label: 'Fixed Fee Payment' },
      { value: 'fee_payment_consultation', label: 'Consultation Fee' },
      { value: 'fee_payment_success', label: 'Success Fee' },
      { value: 'fee_payment_milestone', label: 'Milestone Payment' },
      { value: 'fee_payment_other', label: 'Other Fee Payment' }
    ],
    statusOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'depleted', label: 'Depleted' },
      { value: 'refunded', label: 'Refunded' }
    ]
  }), [clients, lawyers]);

  // Active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.client) { const c = clients.find(x => String(x.client_id) === String(filters.client)); chips.push({ key: 'client', label: `Client: ${c?.client_name || filters.client}` }); }
    if (filters.lawyer && activeTab === 'lawyer_advances') { const l = lawyers.find(x => String(x.lawyer_id) === String(filters.lawyer)); chips.push({ key: 'lawyer', label: `Lawyer: ${l?.full_name || l?.name || filters.lawyer}` }); }
    if (filters.type && activeTab === 'fees') { const ty = filterOptions.typeOptions.find(o => o.value === filters.type); chips.push({ key: 'type', label: `Type: ${ty?.label}` }); }
    if (filters.status) { const st = filterOptions.statusOptions.find(o => o.value === filters.status); chips.push({ key: 'status', label: `Status: ${st?.label}` }); }
    if (filters.datePreset && filters.datePreset !== 'all') { const dl = { today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', lastMonth: 'Last Month', custom: 'Custom' }; chips.push({ key: 'date', label: `Date: ${dl[filters.datePreset]}` }); }
    return chips;
  }, [filters, clients, lawyers, activeTab, filterOptions]);

  const clearFilter = (key) => { if (key === 'date') setFilters(prev => ({ ...prev, datePreset: 'all', dateFrom: '', dateTo: '' })); else setFilters(prev => ({ ...prev, [key]: '' })); };
  const clearAllFilters = () => { setFilters({ client: '', lawyer: '', type: '', status: '', datePreset: 'all', dateFrom: '', dateTo: '' }); setSearchTerm(''); };
  const hasActiveFilters = activeFilters.length > 0 || searchTerm.trim();

  const getTypeLabel = (type) => {
    const labels = { client_retainer: 'Client Retainer', client_expense_advance: 'Expense Advance', lawyer_advance: 'Lawyer Advance', fee_payment_fixed: 'Fixed Fee Payment', fee_payment_consultation: 'Consultation Fee', fee_payment_success: 'Success Fee', fee_payment_milestone: 'Milestone Payment', fee_payment_other: 'Other Fee Payment' };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Payments Received'}</h2>
        <button onClick={() => openForm('advance')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-5 h-5" /> {'Add Payment'}
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label={'Total Fees'} amount={totals.allFees} subtitle={`Retainers: $${totals.retainers.toFixed(2)} | Other: $${totals.feePayments.toFixed(2)}`} color="blue" isActive={activeTab === 'fees'} onClick={() => handleTabChange('fees')} />
        <SummaryCard label={'Expense Advances'} amount={totals.expenseAdvances} color="green" isActive={activeTab === 'expense_advances'} onClick={() => handleTabChange('expense_advances')} />
        <SummaryCard label={'Lawyer Advance'} amount={totals.lawyerAdvances} color="orange" isActive={activeTab === 'lawyer_advances'} onClick={() => handleTabChange('lawyer_advances')} />
      </div>

      {/* Per-Lawyer Balance Cards */}
      {activeTab === 'lawyer_advances' && lawyerBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {lawyerBalances.map(lb => (
            <div key={lb.lawyer_id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${lb.netBalance < 0 ? 'border-red-500' : lb.netBalance > 0 ? 'border-green-500' : 'border-gray-300'}`}>
              <div className="font-medium text-gray-900 truncate">{lb.name}</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Advanced:</span><span className="text-green-600">${lb.totalAdvanced.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Spent:</span><span className="text-orange-600">${lb.totalSpent.toFixed(2)}</span></div>
                <div className={`flex justify-between font-semibold pt-1 border-t ${lb.netBalance < 0 ? 'text-red-600' : lb.netBalance > 0 ? 'text-green-600' : 'text-gray-600'}`}><span>Balance:</span><span>${lb.netBalance.toFixed(2)}</span></div>
              </div>
              <div className={`text-xs mt-2 ${lb.netBalance < 0 ? 'text-red-500' : 'text-gray-400'}`}>{lb.netBalance < 0 ? 'Firm owes lawyer' : lb.netBalance > 0 ? 'Available balance' : 'Settled'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex flex-wrap">
            {[{ id: 'fees', label: 'Fees', count: tabCounts.fees }, { id: 'expense_advances', label: 'Expense Advances', count: tabCounts.expense_advances }, { id: 'lawyer_advances', label: 'Lawyer Advance', count: tabCounts.lawyer_advances }].map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {tab.label}<span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={'Search by client, lawyer, description...'} className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {searchTerm.trim() && <FilterChip label={`Search: "${searchTerm}"`} onRemove={() => setSearchTerm('')} />}
              {activeFilters.map(f => <FilterChip key={f.key} label={f.label} onRemove={() => clearFilter(f.key)} />)}
              <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 underline ml-2">Clear All</button>
            </div>
          )}
          {hasActiveFilters && <p className="text-sm text-gray-500 mt-2">Showing {filteredAdvances.length} of {tabCounts[activeTab]} records</p>}
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left"><DateFilterDropdown value={filters.datePreset} dateFrom={filters.dateFrom} dateTo={filters.dateTo} onPresetChange={(v) => setFilters(p => ({ ...p, datePreset: v }))} onCustomChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} isOpen={openDropdown === 'date'} onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')} onClose={() => setOpenDropdown(null)} /></th>
                {activeTab === 'lawyer_advances' && <th className="px-6 py-3 text-left"><FilterDropdown label={'Lawyer'} value={filters.lawyer} options={filterOptions.lawyerOptions} onChange={(v) => setFilters(p => ({ ...p, lawyer: v }))} isOpen={openDropdown === 'lawyer'} onToggle={() => setOpenDropdown(openDropdown === 'lawyer' ? null : 'lawyer')} onClose={() => setOpenDropdown(null)} /></th>}
                <th className="px-6 py-3 text-left"><FilterDropdown label={'Client'} value={filters.client} options={filterOptions.clientOptions} onChange={(v) => setFilters(p => ({ ...p, client: v }))} isOpen={openDropdown === 'client'} onToggle={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')} onClose={() => setOpenDropdown(null)} /></th>
                {activeTab === 'fees' && <th className="px-6 py-3 text-left"><FilterDropdown label={'Type'} value={filters.type} options={filterOptions.typeOptions} onChange={(v) => setFilters(p => ({ ...p, type: v }))} isOpen={openDropdown === 'type'} onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')} onClose={() => setOpenDropdown(null)} /></th>}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{'Amount'}</th>
                {activeTab !== 'lawyer_advances' && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{'Balance Remaining'}</th>}
                <th className="px-6 py-3 text-left"><FilterDropdown label={'Status'} value={filters.status} options={filterOptions.statusOptions} onChange={(v) => setFilters(p => ({ ...p, status: v }))} isOpen={openDropdown === 'status'} onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')} onClose={() => setOpenDropdown(null)} /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAdvances.length === 0 ? (
                <tr><td colSpan={activeTab === 'fees' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">{hasActiveFilters ? 'No results match filters' : ('No data')}</td></tr>
              ) : paginatedAdvances.map(adv => {
                const client = clients.find(c => c.client_id === adv.client_id);
                const lawyer = lawyers.find(l => l.lawyer_id === adv.lawyer_id);
                const isFeePmt = isFeePayment(adv.advance_type);
                const usedPct = adv.amount > 0 ? ((adv.amount - (adv.balance_remaining || 0)) / adv.amount * 100).toFixed(0) : 0;
                return (
                  <tr key={adv.advance_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{formatDate(adv.date_received)}</td>
                    {activeTab === 'lawyer_advances' && <td className="px-6 py-4 text-sm font-medium">{lawyer?.full_name || lawyer?.name || 'N/A'}</td>}
                    <td className="px-6 py-4 text-sm">{client?.client_name || (activeTab === 'lawyer_advances' ? '—' : 'N/A')}{adv.fee_description && <div className="text-xs text-gray-500">{adv.fee_description}</div>}</td>
                    {activeTab === 'fees' && <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 text-xs rounded-full ${isFeePmt ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{getTypeLabel(adv.advance_type)}</span></td>}
                    <td className="px-6 py-4 text-sm">{adv.currency} {parseFloat(adv.amount).toFixed(2)}</td>
                    {activeTab !== 'lawyer_advances' && (
                      <td className="px-6 py-4">{isFeePmt ? <span className="text-gray-400">—</span> : (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${parseFloat(adv.balance_remaining) < 0 ? 'text-red-600' : adv.balance_remaining < lawyerAdvanceMinBalance ? 'text-orange-600' : 'text-green-600'}`}>{adv.currency} {parseFloat(adv.balance_remaining || 0).toFixed(2)}</span>
                          {parseFloat(adv.balance_remaining || 0) >= 0 && <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{width: `${100 - usedPct}%`}}></div></div>}
                        </div>
                      )}</td>
                    )}
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${adv.status === 'active' ? 'bg-green-100 text-green-800' : adv.status === 'depleted' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{isFeePmt ? 'Received' : adv.status}</span></td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => openForm('advance', adv)} className="text-blue-600 hover:text-blue-900 mr-3">{'Edit'}</button>
                      <button onClick={() => { showConfirm('Delete Payment', 'Are you sure you want to delete this payment?', async () => { try { const result = await apiClient.deleteAdvance(adv.advance_id); if (!result || result.success === false) { showToast(result?.error || 'Failed to delete payment', 'error'); hideConfirm(); return; } await refreshAdvances(); showToast('Payment deleted'); hideConfirm(); } catch (error) { console.error('Error deleting payment:', error); showToast('Error deleting payment', 'error'); hideConfirm(); } }); }} className="text-red-600 hover:text-red-900">{'Delete'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100">Prev</button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancesList;
