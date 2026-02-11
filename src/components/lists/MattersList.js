import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Link2, Briefcase, CheckCircle, PauseCircle, XCircle, Clock, History } from 'lucide-react';
import { EmptyState } from '../common';
import ExportButtons from '../common/ExportButtons';
import { tf } from '../../utils';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';

/**
 * MattersList Component - v46.38
 * 
 * Features:
 * - Summary cards: Total, Active, On Hold, Closed, Engaged (clickable to filter)
 * - 8 columns: CLIENT → MATTER NAME → FILE NO. → COURT → LAWYER → FEE TYPE → STATUS → ACTIONS
 * - Case # as subtitle under matter name
 * - Region as subtitle under court
 * - Link icon 🔗 for matters with parent_matter_id (appeal chain)
 * - Column header dropdowns for filtering (including fee arrangement)
 * - Filter chips showing active filters (removable)
 * - Smart search across client, matter name, case number, lawyer
 * - Always visible pagination
 * 
 * v46.38: Changed default page size from 20 to 25
 * v46.28: Added summary cards with clickable status filter, always-visible pagination
 */

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

// Filter chip component
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

// Summary card component - v46.28
const SummaryCard = ({ icon: Icon, label, count, color, isActive, onClick }) => {
  const colorClasses = {
    slate: isActive 
      ? 'bg-slate-100 border-slate-400 text-slate-800' 
      : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50',
    green: isActive 
      ? 'bg-green-100 border-green-400 text-green-800' 
      : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50',
    yellow: isActive 
      ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
      : 'bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50',
    gray: isActive 
      ? 'bg-gray-200 border-gray-400 text-gray-800' 
      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
    blue: isActive 
      ? 'bg-blue-100 border-blue-400 text-blue-800' 
      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
  };

  const iconColors = {
    slate: 'text-slate-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-500',
    blue: 'text-blue-500',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${colorClasses[color]}`}
    >
      <Icon className={`w-5 h-5 ${isActive ? '' : iconColors[color]}`} />
      <div className="text-left">
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
      </div>
    </button>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-800' },
    on_hold: { label: 'On Hold', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-800' },
    engaged: { label: 'Engaged', bg: 'bg-blue-100', text: 'text-blue-800' }
  };
  
  const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Fee Arrangement badge component
const FeeArrangementBadge = ({ feeArrangement }) => {
  const feeConfig = {
    hourly: { label: 'Hourly', bg: 'bg-gray-100', text: 'text-gray-700' },
    fixed: { label: 'Fixed', bg: 'bg-blue-100', text: 'text-blue-700' },
    recurrent: { label: 'Retainer', bg: 'bg-purple-100', text: 'text-purple-700' },
    success: { label: 'Success', bg: 'bg-green-100', text: 'text-green-700' },
    fixed_success: { label: 'Fixed+Success', bg: 'bg-amber-100', text: 'text-amber-700' }
  };
  
  if (!feeArrangement) return <span className="text-xs text-gray-400">—</span>;
  
  const config = feeConfig[feeArrangement] || { label: feeArrangement, bg: 'bg-gray-100', text: 'text-gray-600' };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const MattersList = ({
  matters,
  clients,
  lawyers = [],
  showConfirm,
  showToast,
  hideConfirm,
  refreshMatters,
  electronAPI,
  onViewTimeline
}) => {
  const { openForm } = useUI();
  const { search: matterSearch, setSearch: setMatterSearch } = useFilters('matters');
  // Filter state
  const [filters, setFilters] = useState({
    client: '',
    court: '',
    lawyer: '',
    status: '',
    feeArrangement: ''
  });
  
  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Local pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Compute status counts for summary cards - v46.28
  const statusCounts = useMemo(() => {
    return {
      total: matters.length,
      active: matters.filter(m => m.status === 'active').length,
      on_hold: matters.filter(m => m.status === 'on_hold').length,
      closed: matters.filter(m => m.status === 'closed').length,
      engaged: matters.filter(m => m.status === 'engaged').length
    };
  }, [matters]);

  // Handle summary card click - syncs with column dropdown filter - v46.28
  const handleStatusCardClick = (status) => {
    if (filters.status === status) {
      // Clicking same card clears the filter
      setFilters(prev => ({ ...prev, status: '' }));
    } else {
      setFilters(prev => ({ ...prev, status: status }));
    }
    setCurrentPage(1);
  };

  // Helper function to get lawyer name from ID
  const getLawyerName = (lawyerId) => {
    if (!lawyerId) return null;
    const lawyer = lawyers.find(l => String(l.lawyer_id) === String(lawyerId));
    if (!lawyer) return null;
    return lawyer.full_name || lawyer.initials || null;
  };

  // Build filter options from data
  const filterOptions = useMemo(() => {
    const clientOptions = [
      { value: '', label: 'All Clients' },
      ...clients.map(c => ({ value: c.client_id, label: c.client_name }))
    ];
    
    const courts = [...new Set(matters.map(m => m.court_name).filter(Boolean))];
    const courtOptions = [
      { value: '', label: 'All Courts' },
      ...courts.map(c => ({ value: c, label: c }))
    ];
    
    const lawyerIds = [...new Set(matters.map(m => m.responsible_lawyer_id).filter(Boolean))];
    const lawyerOptions = [
      { value: '', label: 'All Lawyers' },
      ...lawyerIds.map(id => {
        const name = getLawyerName(id);
        return { value: id, label: name || id };
      }).filter(opt => opt.label)
    ];
    
    const statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'on_hold', label: 'On Hold' },
      { value: 'closed', label: 'Closed' },
      { value: 'engaged', label: 'Engaged' }
    ];

    const feeArrangementOptions = [
      { value: '', label: 'All Fee Types' },
      { value: 'hourly', label: 'Hourly' },
      { value: 'fixed', label: 'Fixed Fee' },
      { value: 'recurrent', label: 'Retainer' },
      { value: 'success', label: 'Success Fee' },
      { value: 'fixed_success', label: 'Fixed + Success' },
      { value: 'not_set', label: 'Not Set' }
    ];
    
    return { clientOptions, courtOptions, lawyerOptions, statusOptions, feeArrangementOptions };
  }, [clients, matters, lawyers]);

  // Filter and search matters
  const filteredMatters = useMemo(() => {
    let result = [...matters];
    
    // Apply search
    if (matterSearch.trim()) {
      const search = matterSearch.toLowerCase();
      result = result.filter(m => {
        const client = clients.find(c => c.client_id === m.client_id);
        const lawyerName = getLawyerName(m.responsible_lawyer_id);
        return (
          (m.matter_name || '').toLowerCase().includes(search) ||
          (m.matter_name_arabic || '').includes(matterSearch) ||
          (m.case_number || '').toLowerCase().includes(search) ||
          (m.custom_matter_number || '').toLowerCase().includes(search) ||
          (client?.client_name || '').toLowerCase().includes(search) ||
          (lawyerName || '').toLowerCase().includes(search)
        );
      });
    }
    
    // Apply filters
    if (filters.client) {
      result = result.filter(m => String(m.client_id) === String(filters.client));
    }
    if (filters.court) {
      result = result.filter(m => m.court_name === filters.court);
    }
    if (filters.lawyer) {
      result = result.filter(m => String(m.responsible_lawyer_id) === String(filters.lawyer));
    }
    if (filters.status) {
      result = result.filter(m => m.status === filters.status);
    }
    if (filters.feeArrangement) {
      if (filters.feeArrangement === 'not_set') {
        result = result.filter(m => !m.fee_arrangement);
      } else {
        result = result.filter(m => m.fee_arrangement === filters.feeArrangement);
      }
    }
    
    return result;
  }, [matters, clients, lawyers, matterSearch, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMatters.length / pageSize));
  const paginatedMatters = filteredMatters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [matterSearch, filters]);

  // Export helpers - v46.55
  const feeLabelsExport = { fixed: 'Fixed Fee', hourly: 'Hourly', success: 'Success Fee', contingency: 'Contingency', pro_bono: 'Pro Bono' };
  const prepareExportData = () => {
    return filteredMatters.map(m => {
      const client = clients.find(c => c.client_id === m.client_id);
      return {
        'Client': client?.client_name || '',
        'Matter Name': m.matter_name,
        'File No.': m.custom_matter_number || '',
        'Case No.': m.case_number || '',
        'Court': m.court_name || '',
        'Region': m.region_name || '',
        'Lawyer': getLawyerName(m.responsible_lawyer_id) || '',
        'Fee Type': feeLabelsExport[m.fee_arrangement] || m.fee_arrangement || '',
        'Status': (m.status || '').replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
      };
    });
  };

  const handleExportExcel = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const result = await window.electronAPI.exportToExcel(data, 'Matters');
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleExportPdf = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const columns = ['Client', 'Matter Name', 'File No.', 'Case No.', 'Court', 'Lawyer', 'Status'];
    const result = await window.electronAPI.exportToPdf(data, 'Matters', columns);
    if (result?.success) showToast('Exported successfully', 'success');
  };

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.client) {
      const client = clients.find(c => String(c.client_id) === String(filters.client));
      chips.push({ key: 'client', label: `${'Client'}: ${client?.client_name || filters.client}` });
    }
    if (filters.court) {
      chips.push({ key: 'court', label: `${'Court'}: ${filters.court}` });
    }
    if (filters.lawyer) {
      const lawyerName = getLawyerName(filters.lawyer);
      chips.push({ key: 'lawyer', label: `${'Lawyer'}: ${lawyerName || filters.lawyer}` });
    }
    if (filters.status) {
      const statusLabels = { 
        active: 'Active', 
        on_hold: 'On Hold', 
        closed: 'Closed', 
        engaged: 'Engaged' 
      };
      chips.push({ key: 'status', label: `${'Status'}: ${statusLabels[filters.status]}` });
    }
    if (filters.feeArrangement) {
      const feeLabels = { 
        hourly: 'Hourly', 
        fixed: 'Fixed', 
        recurrent: 'Retainer',
        success: 'Success',
        fixed_success: 'Fixed+Success',
        not_set: 'Not Set'
      };
      chips.push({ key: 'feeArrangement', label: `${'Fee'}: ${feeLabels[filters.feeArrangement]}` });
    }
    return chips;
  }, [filters, clients, lawyers]);

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFilters({ client: '', court: '', lawyer: '', status: '', feeArrangement: '' });
    setMatterSearch('');
  };

  const hasActiveFilters = activeFilters.length > 0 || matterSearch.trim();

  // Show empty state when no matters exist
  if (matters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{'Matters'}</h2>
        </div>
        <div className="bg-white rounded-lg shadow">
          <EmptyState
            type="matters"
            title={'No matters yet'}
            description={'Create a matter to start tracking cases and legal work.'}
            actionLabel={'Add Matter'}
            onAction={() => openForm('matter')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center" data-tour="matters-header">
        <h2 className="text-2xl font-bold">{'Matters'}</h2>
        <button 
          onClick={() => openForm('matter')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          data-tour="add-matter-btn"
        >
          <Plus className="w-5 h-5" /> {'Add Matter'}
        </button>
      </div>

      {/* Summary Cards - v46.28 */}
      <div className="grid grid-cols-5 gap-4">
        <SummaryCard
          icon={Briefcase}
          label={'Total'}
          count={statusCounts.total}
          color="slate"
          isActive={!filters.status}
          onClick={() => handleStatusCardClick('')}
        />
        <SummaryCard
          icon={CheckCircle}
          label={'Active'}
          count={statusCounts.active}
          color="green"
          isActive={filters.status === 'active'}
          onClick={() => handleStatusCardClick('active')}
        />
        <SummaryCard
          icon={PauseCircle}
          label={'On Hold'}
          count={statusCounts.on_hold}
          color="yellow"
          isActive={filters.status === 'on_hold'}
          onClick={() => handleStatusCardClick('on_hold')}
        />
        <SummaryCard
          icon={XCircle}
          label={'Closed'}
          count={statusCounts.closed}
          color="gray"
          isActive={filters.status === 'closed'}
          onClick={() => handleStatusCardClick('closed')}
        />
        <SummaryCard
          icon={Clock}
          label={'Engaged'}
          count={statusCounts.engaged}
          color="blue"
          isActive={filters.status === 'engaged'}
          onClick={() => handleStatusCardClick('engaged')}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={matterSearch}
              onChange={(e) => setMatterSearch(e.target.value)}
              placeholder={'Search matters...'}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <ExportButtons onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} disabled={!filteredMatters.length} />
        </div>
        
        {/* Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {matterSearch.trim() && (
              <FilterChip 
                label={`${'Search'}: "${matterSearch}"`} 
                onRemove={() => setMatterSearch('')} 
              />
            )}
            {activeFilters.map(f => (
              <FilterChip 
                key={f.key} 
                label={f.label} 
                onRemove={() => clearFilter(f.key)} 
              />
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
            >
              {'Clear All'}
            </button>
          </div>
        )}
        
        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mt-2">
            {'Showing'} {filteredMatters.length} {'of'} {matters.length} {'Matters'}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden" data-tour="matter-list">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* CLIENT */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Client'}
                  value={filters.client}
                  options={filterOptions.clientOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, client: v }))}
                  isOpen={openDropdown === 'client'}
                  onToggle={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* MATTER NAME */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Matter Name'}
              </th>
              {/* OFFICE FILE NO. (v46.55) */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'FILE NO.'}
              </th>
              {/* COURT */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Court'}
                  value={filters.court}
                  options={filterOptions.courtOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, court: v }))}
                  isOpen={openDropdown === 'court'}
                  onToggle={() => setOpenDropdown(openDropdown === 'court' ? null : 'court')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* LAWYER */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Responsible Lawyer'}
                  value={filters.lawyer}
                  options={filterOptions.lawyerOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, lawyer: v }))}
                  isOpen={openDropdown === 'lawyer'}
                  onToggle={() => setOpenDropdown(openDropdown === 'lawyer' ? null : 'lawyer')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* FEE TYPE */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'FEE TYPE'}
                  value={filters.feeArrangement}
                  options={filterOptions.feeArrangementOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, feeArrangement: v }))}
                  isOpen={openDropdown === 'feeArrangement'}
                  onToggle={() => setOpenDropdown(openDropdown === 'feeArrangement' ? null : 'feeArrangement')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* STATUS */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Status'}
                  value={filters.status}
                  options={filterOptions.statusOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                  isOpen={openDropdown === 'status'}
                  onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* ACTIONS */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedMatters.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  {hasActiveFilters 
                    ? ('No matters match your filters')
                    : ('No data')}
                </td>
              </tr>
            ) : (
              paginatedMatters.map(matter => {
                const client = clients.find(c => c.client_id === matter.client_id);
                const hasParent = !!matter.parent_matter_id;
                const lawyerName = getLawyerName(matter.responsible_lawyer_id);
                
                return (
                  <tr key={matter.matter_id} className="hover:bg-gray-50">
                    {/* CLIENT */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {client?.client_name || 'N/A'}
                    </td>
                    {/* MATTER NAME with Court Case No. subtitle and link icon */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {hasParent && (
                          <Link2 className="w-4 h-4 text-purple-500 flex-shrink-0" title={'Linked to parent matter'} />
                        )}
                        <span className="font-medium text-gray-900">{matter.matter_name}</span>
                      </div>
                      {matter.case_number && (
                        <div className="text-xs text-gray-500 mt-0.5">{matter.case_number}</div>
                      )}
                    </td>
                    {/* OFFICE FILE NO. (v46.55) */}
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                      {matter.custom_matter_number || '—'}
                    </td>
                    {/* COURT with region subtitle */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{matter.court_name || '—'}</div>
                      {matter.region_name && (
                        <div className="text-xs text-gray-500 mt-0.5">{matter.region_name}</div>
                      )}
                    </td>
                    {/* LAWYER */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lawyerName || '—'}
                    </td>
                    {/* FEE TYPE */}
                    <td className="px-6 py-4">
                      <FeeArrangementBadge feeArrangement={matter.fee_arrangement} />
                    </td>
                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <StatusBadge status={matter.status} />
                    </td>
                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => onViewTimeline?.(matter)}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                        title={'Timeline'}
                      >
                        <History className="w-4 h-4 inline" />
                      </button>
                      <button 
                        onClick={() => openForm('matter', matter)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {'Edit'}
                      </button>
                      <button 
                        onClick={() => {
                          showConfirm(
                            'Delete Matter',
                            'Are you sure you want to delete this matter?',
                            async () => {
                              await electronAPI.deleteMatter(matter.matter_id);
                              await refreshMatters();
                              showToast('Matter deleted');
                              hideConfirm();
                            }
                          );
                        }} 
                        className="text-red-600 hover:text-red-900"
                      >
                        {'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Pagination - Always visible v46.28 */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{'Show'}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>{'per page'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {tf('Page {current} of {total}', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              {'Prev'}
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              {'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MattersList;
