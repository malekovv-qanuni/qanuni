import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Clock, CheckCircle, Scale, Gavel, FileCheck } from 'lucide-react';
import { tf } from '../../utils';
import { useUI } from '../../contexts';

/**
 * JudgmentsList Component - v46.30
 * 
 * Features:
 * - Summary cards: Total, Pending, Pronounced, Appealed, Final, Enforced (clickable)
 * - 7 columns: CLIENT → MATTER → TYPE → STATUS → DATE → DEADLINE → ACTIONS
 * - Cascading Client → Matter dropdown (matter disabled until client selected)
 * - Color-coded deadline: red (overdue/approaching), yellow (soon), green (far)
 * - Column header dropdowns for filtering
 * - Filter chips with Clear All
 * - Smart search
 * - Always visible pagination
 * - Excludes judgments with status 'moved_to_hearing'
 * 
 * v46.30: Added cascading Client→Matter filter
 */

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

  const displayValue = value ? options.find(o => o.value === value)?.label || value : label;
  const isFiltered = value && value !== '' && value !== 'all';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded transition
          ${disabled ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}
          ${isFiltered && !disabled ? 'text-blue-600 bg-blue-50' : disabled ? '' : 'text-gray-500'}`}
      >
        {displayValue}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
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

// Summary card component
const SummaryCard = ({ icon: Icon, label, count, color, isActive, onClick }) => {
  const colorClasses = {
    slate: isActive 
      ? 'bg-slate-100 border-slate-400 text-slate-800' 
      : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50',
    yellow: isActive 
      ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
      : 'bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50',
    blue: isActive 
      ? 'bg-blue-100 border-blue-400 text-blue-800' 
      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
    purple: isActive 
      ? 'bg-purple-100 border-purple-400 text-purple-800' 
      : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50',
    green: isActive 
      ? 'bg-green-100 border-green-400 text-green-800' 
      : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50',
    teal: isActive 
      ? 'bg-teal-100 border-teal-400 text-teal-800' 
      : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50',
  };

  const iconColors = {
    slate: 'text-slate-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    teal: 'text-teal-500',
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

// Color-coded deadline display
const DeadlineDisplay = ({ deadline, today, onAddDeadline, onEditDeadline, onRemoveDeadline}) => {
  if (!deadline) {
    return (
      <button 
        onClick={onAddDeadline}
        className="text-orange-600 hover:text-orange-900 text-xs flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> {'Add'}
      </button>
    );
  }

  const deadlineDate = new Date(deadline.deadline_date);
  const todayDate = new Date(today);
  const diffDays = Math.ceil((deadlineDate - todayDate) / (1000 * 60 * 60 * 24));
  
  // Format date
  const formattedDate = deadlineDate.toLocaleDateString('en-GB');
  
  // Determine color based on days remaining
  let colorClass = '';
  let indicator = '';
  
  if (deadline.status === 'completed') {
    colorClass = 'text-gray-500';
    indicator = '✓';
  } else if (diffDays < 0) {
    // Overdue
    colorClass = 'text-red-600 font-semibold';
    indicator = '⚠️';
  } else if (diffDays <= 7) {
    // Approaching (within 7 days)
    colorClass = 'text-red-600 font-medium';
    indicator = '🔴';
  } else if (diffDays <= 14) {
    // Soon (within 14 days)
    colorClass = 'text-yellow-600 font-medium';
    indicator = '🟡';
  } else {
    // Far (more than 14 days)
    colorClass = 'text-green-600';
    indicator = '🟢';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <span>{indicator}</span>
        <span>{formattedDate}</span>
        {diffDays < 0 && <span className="text-xs">({Math.abs(diffDays)}d overdue)</span>}
        {diffDays >= 0 && diffDays <= 14 && <span className="text-xs">({diffDays}d)</span>}
      </div>
      <div className="flex items-center gap-1 ml-1">
        <button
          onClick={onEditDeadline}
          className="text-blue-500 hover:text-blue-700 text-xs"
          title={'Edit'}
        >
          \u270F
        </button>
        <button
          onClick={onRemoveDeadline}
          className="text-red-400 hover:text-red-600 text-xs"
          title={'Remove'}
        >
          \u2715
        </button>
      </div>
    </div>
  );
};

const JudgmentsList = ({
  judgments,
  matters,
  clients,
  deadlines,
  hearings,
  formatDate,
  showConfirm,
  showToast,
  hideConfirm,
  refreshJudgments,
  electronAPI
}) => {
  const { openForm } = useUI();
  // Filter state
  const [filters, setFilters] = useState({
    client: '',
    matter: '',
    type: '',
    status: ''
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Summary card state
  const [activeSummaryCard, setActiveSummaryCard] = useState('total');

  const today = new Date().toISOString().split('T')[0];

  // Judgment type labels
  const getJudgmentTypeLabel = (type) => {
    const typeMap = {
      'first_instance': 'First Instance',
      'appeal': 'Appeal',
      'cassation': 'Cassation',
      'arbitral_award': 'Arbitral Award',
      'preliminary': 'Preliminary',
      'final': 'Final',
      'interlocutory': 'Interlocutory'
    };
    return typeMap[type] || type;
  };

  // Status labels
  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'pronounced': 'Pronounced',
      'appealed': 'Appealed',
      'final': 'Final',
      'enforced': 'Enforced'
    };
    return statusMap[status] || status;
  };

  // Filter out judgments with status 'moved_to_hearing'
  const baseJudgments = useMemo(() => {
    return judgments.filter(j => j.status !== 'moved_to_hearing');
  }, [judgments]);

  // Calculate summary counts for cards
  const summaryCounts = useMemo(() => {
    return {
      total: baseJudgments.length,
      pending: baseJudgments.filter(j => j.status === 'pending').length,
      pronounced: baseJudgments.filter(j => j.status === 'pronounced').length,
      appealed: baseJudgments.filter(j => j.status === 'appealed').length,
      final: baseJudgments.filter(j => j.status === 'final').length,
      enforced: baseJudgments.filter(j => j.status === 'enforced').length,
    };
  }, [baseJudgments]);

  // Handle summary card click
  const handleCardClick = (cardType) => {
    setActiveSummaryCard(cardType);
    if (cardType === 'total') {
      setFilters({ client: '', matter: '', type: '', status: '' });
    } else {
      setFilters({ client: '', matter: '', type: '', status: cardType });
    }
    setSearchTerm('');
  };

  // Handle client change - clear matter when client changes (cascading behavior)
  const handleClientChange = (clientId) => {
    setFilters(prev => ({ 
      ...prev, 
      client: clientId,
      matter: '' // Clear matter when client changes
    }));
  };

  // Add deadline for judgment
  const handleAddDeadlineForJudgment = (judgment) => {
    const matter = matters.find(m => m.matter_id === judgment.matter_id);
    const autoTitle = `Appeal Deadline - ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || ''}`;
    openForm('deadline', {
      client_id: matter?.client_id || '',
      matter_id: judgment.matter_id,
      judgment_id: judgment.judgment_id,
      title: autoTitle,
      deadline_date: judgment.expected_date || '',
      reminder_days: '7',
      priority: 'high',
      status: 'pending',
      notes: '',
      _fromJudgment: true
    });
  };

  // Build filter options from data
  const filterOptions = useMemo(() => {
    const clientOptions = [
      { value: '', label: 'All Clients' },
      ...clients.map(c => ({ value: c.client_id, label: c.client_name }))
    ];
    
    // Matters - filtered by selected client if any (cascading)
    let availableMatters = matters;
    if (filters.client) {
      availableMatters = matters.filter(m => String(m.client_id) === String(filters.client));
    }
    const matterOptions = [
      { value: '', label: filters.client 
        ? ('All Matters')
        : ('Select Client First') 
      },
      ...availableMatters.map(m => ({ value: m.matter_id, label: `${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}` }))
    ];
    
    // Judgment types - all 4 types like the form
    const typeOptions = [
      { value: '', label: 'All Types' },
      { value: 'first_instance', label: getJudgmentTypeLabel('first_instance') },
      { value: 'appeal', label: getJudgmentTypeLabel('appeal') },
      { value: 'cassation', label: getJudgmentTypeLabel('cassation') },
      { value: 'arbitral_award', label: getJudgmentTypeLabel('arbitral_award') }
    ];
    
    const statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: getStatusLabel('pending') },
      { value: 'pronounced', label: getStatusLabel('pronounced') },
      { value: 'appealed', label: getStatusLabel('appealed') },
      { value: 'final', label: getStatusLabel('final') },
      { value: 'enforced', label: getStatusLabel('enforced') }
    ];
    
    return { clientOptions, matterOptions, typeOptions, statusOptions };
  }, [clients, matters, baseJudgments, filters.client]);

  // Filter and search judgments
  const filteredJudgments = useMemo(() => {
    let result = [...baseJudgments];
    
    // Apply search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(j => {
        const matter = matters.find(m => m.matter_id === j.matter_id);
        const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
        return (
          (matter?.matter_name || '').toLowerCase().includes(search) ||
          (client?.client_name || '').toLowerCase().includes(search) ||
          (j.judgment_summary || '').toLowerCase().includes(search) ||
          getJudgmentTypeLabel(j.judgment_type).toLowerCase().includes(search) ||
          getStatusLabel(j.status).toLowerCase().includes(search)
        );
      });
    }
    
    // Apply filters
    if (filters.client) {
      result = result.filter(j => {
        const matter = matters.find(m => m.matter_id === j.matter_id);
        return matter && String(matter.client_id) === String(filters.client);
      });
    }
    if (filters.matter) {
      result = result.filter(j => String(j.matter_id) === String(filters.matter));
    }
    if (filters.type) {
      result = result.filter(j => j.judgment_type === filters.type);
    }
    if (filters.status) {
      result = result.filter(j => j.status === filters.status);
    }
    
    return result;
  }, [baseJudgments, matters, clients, searchTerm, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredJudgments.length / pageSize);
  const paginatedJudgments = filteredJudgments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Reset matter filter when client changes
  useEffect(() => {
    if (filters.client && filters.matter) {
      const matter = matters.find(m => m.matter_id === filters.matter);
      if (matter && String(matter.client_id) !== String(filters.client)) {
        setFilters(prev => ({ ...prev, matter: '' }));
      }
    }
  }, [filters.client, filters.matter, matters]);

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.client) {
      const client = clients.find(c => String(c.client_id) === String(filters.client));
      chips.push({ key: 'client', label: `Client: ${client?.client_name || filters.client}` });
    }
    if (filters.matter) {
      const matter = matters.find(m => String(m.matter_id) === String(filters.matter));
      chips.push({ key: 'matter', label: `Matter: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || filters.matter}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (filters.type) {
      chips.push({ key: 'type', label: `Type: ${getJudgmentTypeLabel(filters.type)}` });
    }
    if (filters.status) {
      chips.push({ key: 'status', label: `Status: ${getStatusLabel(filters.status)}` });
    }
    return chips;
  }, [filters, clients, matters]);

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFilters({ client: '', matter: '', type: '', status: '' });
    setSearchTerm('');
    setActiveSummaryCard('total');
  };

  const hasActiveFilters = activeFilters.length > 0 || searchTerm.trim();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Judgments'}</h2>
        <button 
          onClick={() => openForm('judgment')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" /> {'Add Judgment'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <SummaryCard
          icon={Scale}
          label={'Total'}
          count={summaryCounts.total}
          color="slate"
          isActive={activeSummaryCard === 'total'}
          onClick={() => handleCardClick('total')}
        />
        <SummaryCard
          icon={Clock}
          label={'Pending'}
          count={summaryCounts.pending}
          color="yellow"
          isActive={activeSummaryCard === 'pending'}
          onClick={() => handleCardClick('pending')}
        />
        <SummaryCard
          icon={Gavel}
          label={'Pronounced'}
          count={summaryCounts.pronounced}
          color="blue"
          isActive={activeSummaryCard === 'pronounced'}
          onClick={() => handleCardClick('pronounced')}
        />
        <SummaryCard
          icon={Scale}
          label={'Appealed'}
          count={summaryCounts.appealed}
          color="purple"
          isActive={activeSummaryCard === 'appealed'}
          onClick={() => handleCardClick('appealed')}
        />
        <SummaryCard
          icon={CheckCircle}
          label={'Final'}
          count={summaryCounts.final}
          color="green"
          isActive={activeSummaryCard === 'final'}
          onClick={() => handleCardClick('final')}
        />
        <SummaryCard
          icon={FileCheck}
          label={'Enforced'}
          count={summaryCounts.enforced}
          color="teal"
          isActive={activeSummaryCard === 'enforced'}
          onClick={() => handleCardClick('enforced')}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={'Search judgments...'}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {searchTerm.trim() && (
              <FilterChip 
                label={`Search: "${searchTerm}"`} 
                onRemove={() => setSearchTerm('')} 
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
              Clear All
            </button>
          </div>
        )}
        
        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mt-2">
            {'Showing'} {filteredJudgments.length} {'of'} {baseJudgments.length} {'Judgments'}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* CLIENT */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Client'}
                  value={filters.client}
                  options={filterOptions.clientOptions}
                  onChange={handleClientChange}
                  isOpen={openDropdown === 'client'}
                  onToggle={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* MATTER - cascading, disabled until client selected */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Matter'}
                  value={filters.matter}
                  options={filterOptions.matterOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, matter: v }))}
                  isOpen={openDropdown === 'matter'}
                  onToggle={() => setOpenDropdown(openDropdown === 'matter' ? null : 'matter')}
                  onClose={() => setOpenDropdown(null)}
                  disabled={!filters.client}
                />
              </th>
              {/* TYPE */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Judgment Type'}
                  value={filters.type}
                  options={filterOptions.typeOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, type: v }))}
                  isOpen={openDropdown === 'type'}
                  onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* STATUS */}
              <th className="px-4 py-3 text-left">
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
              {/* DATE */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Judgment Date'}
              </th>
              {/* DEADLINE */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Deadline'}
              </th>
              {/* ACTIONS */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedJudgments.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  {hasActiveFilters 
                    ? ('No clients match your filters')
                    : ('No data')}
                </td>
              </tr>
            ) : (
              paginatedJudgments.map(j => {
                const matter = matters.find(m => m.matter_id === j.matter_id);
                const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
                const judgmentDeadline = deadlines.find(d => d.judgment_id === j.judgment_id);
                const sourceHearing = j.hearing_id ? hearings.find(h => h.hearing_id === j.hearing_id) : null;
                
                return (
                  <tr key={j.judgment_id} className="hover:bg-gray-50">
                    {/* CLIENT */}
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {client?.client_name || '—'}
                    </td>
                    {/* MATTER */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{matter?.matter_name || '—'}</div>
                      {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                        <div className="text-xs text-gray-500 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
                      )}
                      {sourceHearing && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          📋 {formatDate(sourceHearing.hearing_date)}
                        </div>
                      )}
                    </td>
                    {/* TYPE */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {getJudgmentTypeLabel(j.judgment_type)}
                    </td>
                    {/* STATUS */}
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        j.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        j.status === 'pronounced' ? 'bg-blue-100 text-blue-800' :
                        j.status === 'appealed' ? 'bg-purple-100 text-purple-800' :
                        j.status === 'final' ? 'bg-green-100 text-green-800' :
                        j.status === 'enforced' ? 'bg-teal-100 text-teal-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusLabel(j.status)}
                      </span>
                    </td>
                    {/* DATE */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {j.expected_date ? formatDate(j.expected_date) : '—'}
                    </td>
                    {/* DEADLINE - Color coded */}
                    <td className="px-4 py-4 text-sm">
                      <DeadlineDisplay 
                        deadline={judgmentDeadline}
                        today={today}
                        onAddDeadline={() => handleAddDeadlineForJudgment(j)}
                        onEditDeadline={() => {
                          if (judgmentDeadline) {
                            openForm('deadline', judgmentDeadline);
                          }
                        }}
                        onRemoveDeadline={() => {
                          if (judgmentDeadline) {
                            showConfirm(
                              'Remove Deadline',
                              'Are you sure you want to remove this deadline?',
                              async () => {
                                await electronAPI.deleteDeadline(judgmentDeadline.deadline_id);
                                await refreshJudgments();
                                showToast('Deadline removed');
                                hideConfirm();
                              }
                            );
                          }
                        }}
                      />
                    </td>
                    {/* ACTIONS */}
                    <td className="px-4 py-4 text-sm">
                      <button 
                        onClick={() => openForm('judgment', j)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {'Edit'}
                      </button>
                      <button 
                        onClick={() => {
                          showConfirm(
                            'Delete Judgment',
                            'Are you sure you want to delete this judgment?',
                            async () => {
                              await electronAPI.deleteJudgment(j.judgment_id);
                              await refreshJudgments();
                              showToast('Judgment deleted');
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
        
        {/* Always visible pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{'Show'}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>{'per page'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {tf('Page {current} of {total}', { current: currentPage, total: Math.max(1, totalPages) })}
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

export default JudgmentsList;
