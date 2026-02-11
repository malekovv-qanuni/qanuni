import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Calendar, Clock, History, CalendarDays } from 'lucide-react';
import ExportButtons from '../common/ExportButtons';
import { tf } from '../../utils';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

/**
 * HearingsList Component - v46.38
 * 
 * Features:
 * - Summary cards: Today, This Week, Upcoming, Past, Total (clickable to filter)
 * - 7 columns: CLIENT → MATTER → DATE → COURT → REGION → PURPOSE → ACTIONS
 * - Time as subtitle under date
 * - Column header dropdowns for filtering (all columns)
 * - Cascading Client → Matter dropdown (matter disabled until client selected)
 * - Date presets: All, Today, This Week, This Month, Upcoming, Past
 * - Region uses lookup_regions (matches form)
 * - Purpose uses hearingPurposes (matches form)
 * - Filter chips with Clear All
 * - Smart search
 * - Always visible pagination
 * - Excludes "Judgment Pronouncement" hearings (shown in Judgments module)
 * 
 * v46.38: Fixed Arabic localization for court and region (table + dropdown)
 * v46.29: Added cascading Client→Matter filter
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
    blue: isActive 
      ? 'bg-blue-100 border-blue-400 text-blue-800' 
      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
    purple: isActive 
      ? 'bg-purple-100 border-purple-400 text-purple-800' 
      : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50',
    green: isActive 
      ? 'bg-green-100 border-green-400 text-green-800' 
      : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50',
    gray: isActive 
      ? 'bg-gray-200 border-gray-400 text-gray-800' 
      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
    slate: isActive 
      ? 'bg-slate-200 border-slate-400 text-slate-800' 
      : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50',
  };

  const iconColors = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    gray: 'text-gray-500',
    slate: 'text-slate-500',
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

const HearingsList = ({
  hearings,
  matters,
  clients,
  hearingPurposes,
  regions = [],
  formatDate,
  showConfirm,
  showToast,
  hideConfirm,
  refreshHearings,
  electronAPI
}) => {
  const { openForm } = useUI();
  // Filter state
  const [filters, setFilters] = useState({
    client: '',
    matter: '',
    dateRange: '',
    court: '',
    region: '',
    purpose: ''
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Find the "Judgment Pronouncement" purpose ID
  const judgmentPronouncementPurpose = hearingPurposes.find(p => p.name_en === 'Judgment Pronouncement');
  
  // Filter out hearings with "Judgment Pronouncement" purpose - they appear in Judgments instead
  const baseHearings = useMemo(() => {
    return hearings.filter(h => {
      if (judgmentPronouncementPurpose && h.purpose_id === judgmentPronouncementPurpose.purpose_id) {
        return false;
      }
      if (h.purpose_custom === 'Judgment Pronouncement') {
        return false;
      }
      return true;
    });
  }, [hearings, judgmentPronouncementPurpose]);

  // Date helper functions
  const getDateRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preset) {
      case 'today':
        return { start: today, end: today };
      case 'this_week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek, end: endOfWeek };
      }
      case 'this_month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      case 'upcoming':
        return { start: today, end: null };
      case 'past':
        return { start: null, end: new Date(today.getTime() - 86400000) }; // Yesterday
      default:
        return { start: null, end: null };
    }
  };

  // Calculate summary counts for cards
  const summaryCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // This week boundaries
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    let todayCount = 0;
    let thisWeekCount = 0;
    let upcomingCount = 0;
    let pastCount = 0;
    
    baseHearings.forEach(h => {
      const hearingDate = new Date(h.hearing_date);
      hearingDate.setHours(0, 0, 0, 0);
      
      // Today
      if (hearingDate.getTime() === today.getTime()) {
        todayCount++;
      }
      
      // This week
      if (hearingDate >= startOfWeek && hearingDate <= endOfWeek) {
        thisWeekCount++;
      }
      
      // Upcoming (today and future)
      if (hearingDate >= today) {
        upcomingCount++;
      }
      
      // Past (before today)
      if (hearingDate < today) {
        pastCount++;
      }
    });
    
    return {
      today: todayCount,
      thisWeek: thisWeekCount,
      upcoming: upcomingCount,
      past: pastCount,
      total: baseHearings.length
    };
  }, [baseHearings]);

  // Handle summary card click
  const handleCardClick = (cardType) => {
    if (filters.dateRange === cardType) {
      // If already active, clear the filter
      setFilters(prev => ({ ...prev, dateRange: '' }));
    } else {
      // Apply the filter
      setFilters(prev => ({ ...prev, dateRange: cardType }));
    }
  };

  // Handle client change - clear matter when client changes (cascading behavior)
  const handleClientChange = (clientId) => {
    setFilters(prev => ({ 
      ...prev, 
      client: clientId,
      matter: '' // Clear matter when client changes
    }));
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
    
    const dateOptions = [
      { value: '', label: 'All Dates' },
      { value: 'today', label: 'Today' },
      { value: 'this_week', label: 'This Week' },
      { value: 'this_month', label: 'This Month Revenue' },
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'past', label: 'Past' }
    ];
    
    // Get unique courts from hearings data (with Arabic support)
    const courtsMap = new Map();
    baseHearings.forEach(h => {
      if (h.court_name) {
        courtsMap.set(h.court_name, {
          name_en: h.court_name,
          name_ar: h.court_name_ar
        });
      }
    });
    const courtOptions = [
      { value: '', label: 'All Courts' },
      ...Array.from(courtsMap.entries()).map(([key, court]) => ({ 
        value: key, 
        label: court.name_en
      }))
    ];
    
    // Use regions lookup array (matches form)
    const regionOptions = [
      { value: '', label: 'All Regions' },
      ...regions.map(r => ({ 
        value: r.region_id, 
        label: r.name_en
      }))
    ];
    
    // Purpose options from hearingPurposes (excluding Judgment Pronouncement)
    const purposeOptions = [
      { value: '', label: 'All Purposes' },
      ...hearingPurposes
        .filter(p => p.name_en !== 'Judgment Pronouncement')
        .map(p => ({ 
          value: p.purpose_id, 
          label: p.name_en
        }))
    ];
    
    return { clientOptions, matterOptions, dateOptions, courtOptions, regionOptions, purposeOptions };
  }, [clients, matters, baseHearings, filters.client, regions, hearingPurposes]);

  // Filter and search hearings
  const filteredHearings = useMemo(() => {
    let result = [...baseHearings];
    
    // Apply search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(h => {
        const matter = matters.find(m => m.matter_id === h.matter_id);
        const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
        const purpose = hearingPurposes.find(p => p.purpose_id === h.purpose_id);
        return (
          (matter?.matter_name || '').toLowerCase().includes(search) ||
          (client?.client_name || '').toLowerCase().includes(search) ||
          (h.court_name || '').toLowerCase().includes(search) ||
          (h.region_name || '').toLowerCase().includes(search) ||
          (purpose?.name_en || '').toLowerCase().includes(search) ||
          (purpose?.name_ar || '').includes(searchTerm) ||
          (h.purpose_custom || '').toLowerCase().includes(search)
        );
      });
    }
    
    // Apply filters
    if (filters.client) {
      result = result.filter(h => {
        const matter = matters.find(m => m.matter_id === h.matter_id);
        return matter && String(matter.client_id) === String(filters.client);
      });
    }
    if (filters.matter) {
      result = result.filter(h => String(h.matter_id) === String(filters.matter));
    }
    if (filters.dateRange) {
      const { start, end } = getDateRange(filters.dateRange);
      result = result.filter(h => {
        const hearingDate = new Date(h.hearing_date);
        hearingDate.setHours(0, 0, 0, 0);
        if (start && hearingDate < start) return false;
        if (end && hearingDate > end) return false;
        return true;
      });
    }
    if (filters.court) {
      result = result.filter(h => h.court_name === filters.court);
    }
    // Filter by region_id (not region_name)
    if (filters.region) {
      result = result.filter(h => String(h.court_region_id) === String(filters.region));
    }
    // Filter by purpose
    if (filters.purpose) {
      result = result.filter(h => String(h.purpose_id) === String(filters.purpose));
    }
    
    // Sort by date (most recent first for past, soonest first for upcoming/default)
    result.sort((a, b) => {
      const dateA = new Date(a.hearing_date);
      const dateB = new Date(b.hearing_date);
      if (filters.dateRange === 'past') {
        return dateB - dateA; // Most recent past first
      }
      return dateA - dateB; // Soonest upcoming first
    });
    
    return result;
  }, [baseHearings, matters, clients, hearingPurposes, searchTerm, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHearings.length / pageSize));
  const paginatedHearings = filteredHearings.slice(
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

  // Export helpers - v46.55
  const prepareExportData = () => {
    return filteredHearings.map(h => {
      const matter = matters.find(m => m.matter_id === h.matter_id);
      const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
      const purpose = hearingPurposes.find(p => p.purpose_id === h.purpose_id);
      const purposeLabel = purpose ? (purpose.name_en) : (h.purpose_custom || '');
      return {
        'Client': client?.client_name || '',
        'Matter': (matter?.matter_name || ''),
        'File No.': matter?.custom_matter_number || '',
        'Hearing Date': h.hearing_date ? new Date(h.hearing_date).toLocaleDateString() : '',
        'Time': h.hearing_time || '',
        'Court': h.court_name || '',
        'Region': h.region_name || '',
        'Purpose': purposeLabel
      };
    });
  };

  const handleExportExcel = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const result = await apiClient.exportToExcel(data, 'Hearings');
    if (result?.success) showToast('Exported successfully', 'success');
  };

  const handleExportPdf = async () => {
    const data = prepareExportData();
    if (!data.length) return showToast('No data to export', 'info');
    const columns = ['Client', 'Matter', 'File No.', 'Hearing Date', 'Time', 'Court', 'Region', 'Purpose'];
    const result = await apiClient.exportToPdf(data, 'Hearings', columns);
    if (result?.success) showToast('Exported successfully', 'success');
  };

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.client) {
      const client = clients.find(c => String(c.client_id) === String(filters.client));
      chips.push({ key: 'client', label: `${'Client'}: ${client?.client_name || filters.client}` });
    }
    if (filters.matter) {
      const matter = matters.find(m => String(m.matter_id) === String(filters.matter));
      chips.push({ key: 'matter', label: `${'Matter'}: ${matter?.custom_matter_number ? '[' + matter.custom_matter_number + '] ' : ''}${matter?.matter_name || filters.matter}${matter?.case_number ? ' — ' + matter.case_number : ''}` });
    }
    if (filters.dateRange) {
      const dateLabels = {
        today: 'Today',
        this_week: 'This Week',
        this_month: 'This Month Revenue',
        upcoming: 'Upcoming',
        past: 'Past'
      };
      chips.push({ key: 'dateRange', label: `${'DATE'}: ${dateLabels[filters.dateRange]}` });
    }
    if (filters.court) {
      chips.push({ key: 'court', label: `${'Court'}: ${filters.court}` });
    }
    if (filters.region) {
      const region = regions.find(r => String(r.region_id) === String(filters.region));
      const regionLabel = region ? (region.name_en) : filters.region;
      chips.push({ key: 'region', label: `${'Region'}: ${regionLabel}` });
    }
    if (filters.purpose) {
      const purpose = hearingPurposes.find(p => String(p.purpose_id) === String(filters.purpose));
      const purposeLabel = purpose ? (purpose.name_en) : filters.purpose;
      chips.push({ key: 'purpose', label: `${'Purpose'}: ${purposeLabel}` });
    }
    return chips;
  }, [filters, clients, matters, regions, hearingPurposes]);

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFilters({ client: '', matter: '', dateRange: '', court: '', region: '', purpose: '' });
    setSearchTerm('');
  };

  const hasActiveFilters = activeFilters.length > 0 || searchTerm.trim();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center" data-tour="hearings-header">
        <h2 className="text-2xl font-bold">{'hearings'}</h2>
        <button 
          onClick={() => openForm('hearing')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          data-tour="add-hearing-btn"
        >
          <Plus className="w-5 h-5" /> {'Add Hearing'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <SummaryCard
          icon={Calendar}
          label={'Today'}
          count={summaryCounts.today}
          color="blue"
          isActive={filters.dateRange === 'today'}
          onClick={() => handleCardClick('today')}
        />
        <SummaryCard
          icon={CalendarDays}
          label={'This Week'}
          count={summaryCounts.thisWeek}
          color="purple"
          isActive={filters.dateRange === 'this_week'}
          onClick={() => handleCardClick('this_week')}
        />
        <SummaryCard
          icon={Clock}
          label={'Upcoming'}
          count={summaryCounts.upcoming}
          color="green"
          isActive={filters.dateRange === 'upcoming'}
          onClick={() => handleCardClick('upcoming')}
        />
        <SummaryCard
          icon={History}
          label={'Past'}
          count={summaryCounts.past}
          color="gray"
          isActive={filters.dateRange === 'past'}
          onClick={() => handleCardClick('past')}
        />
        <SummaryCard
          icon={Calendar}
          label={'Total'}
          count={summaryCounts.total}
          color="slate"
          isActive={!filters.dateRange}
          onClick={() => setFilters(prev => ({ ...prev, dateRange: '' }))}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={'Search hearings...'}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <ExportButtons onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} disabled={!filteredHearings.length} />
        </div>
        
        {/* Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {searchTerm.trim() && (
              <FilterChip 
                label={`${'Search'}: "${searchTerm}"`} 
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
              {'Clear All'}
            </button>
          </div>
        )}
        
        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mt-2">
            {'Showing'} {filteredHearings.length} {'of'} {baseHearings.length} {'hearings'}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden" data-tour="hearing-list">
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
              {/* DATE */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Hearing Date'}
                  value={filters.dateRange}
                  options={filterOptions.dateOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, dateRange: v }))}
                  isOpen={openDropdown === 'dateRange'}
                  onToggle={() => setOpenDropdown(openDropdown === 'dateRange' ? null : 'dateRange')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* COURT */}
              <th className="px-4 py-3 text-left">
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
              {/* REGION */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Region'}
                  value={filters.region}
                  options={filterOptions.regionOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, region: v }))}
                  isOpen={openDropdown === 'region'}
                  onToggle={() => setOpenDropdown(openDropdown === 'region' ? null : 'region')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* PURPOSE */}
              <th className="px-4 py-3 text-left">
                <FilterDropdown
                  label={'Purpose'}
                  value={filters.purpose}
                  options={filterOptions.purposeOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, purpose: v }))}
                  isOpen={openDropdown === 'purpose'}
                  onToggle={() => setOpenDropdown(openDropdown === 'purpose' ? null : 'purpose')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* ACTIONS */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedHearings.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  {hasActiveFilters 
                    ? ('No hearings match your filters')
                    : ('No data')}
                </td>
              </tr>
            ) : (
              paginatedHearings.map(hearing => {
                const matter = matters.find(m => m.matter_id === hearing.matter_id);
                const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
                const purpose = hearingPurposes.find(p => p.purpose_id === hearing.purpose_id);
                const purposeText = (purpose?.name_en || hearing.purpose_custom);
                
                return (
                  <tr key={hearing.hearing_id} className="hover:bg-gray-50">
                    {/* CLIENT */}
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {client?.client_name || 'N/A'}
                    </td>
                    {/* MATTER */}
                    <td className="px-4 py-4 text-sm">
                      <div className="text-gray-900">{matter?.matter_name || 'N/A'}</div>
                      {(matter?.custom_matter_number || matter?.case_number || matter?.court_name) && (
                        <div className="text-xs text-gray-500 mt-0.5">{[matter.custom_matter_number ? `[${matter.custom_matter_number}]` : null, matter.case_number, matter.court_name, matter.region_name].filter(Boolean).join(' • ')}</div>
                      )}
                    </td>
                    {/* DATE with time subtitle */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{formatDate(hearing.hearing_date)}</div>
                      {hearing.hearing_time && (
                        <div className="text-xs text-gray-500">{hearing.hearing_time}</div>
                      )}
                    </td>
                    {/* COURT */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {(hearing.court_name || '—')}
                    </td>
                    {/* REGION */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {(hearing.region_name || '—')}
                    </td>
                    {/* PURPOSE */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {purposeText || '—'}
                    </td>
                    {/* ACTIONS */}
                    <td className="px-4 py-4 text-sm">
                      <button 
                        onClick={() => openForm('hearing', hearing)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {'Edit'}
                      </button>
                      <button 
                        onClick={() => {
                          showConfirm(
                            'Delete Hearing',
                            'Are you sure you want to delete this hearing?',
                            async () => {
                              await electronAPI.deleteHearing(hearing.hearing_id);
                              await refreshHearings();
                              showToast('Hearing deleted');
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
              disabled={currentPage === totalPages}
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

export default HearingsList;
