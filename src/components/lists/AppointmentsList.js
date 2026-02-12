import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight, Calendar, CalendarDays, Clock, History, List } from 'lucide-react';
import { tf } from '../../utils';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

// ============================================================================
// REUSABLE FILTER COMPONENTS
// ============================================================================

// FilterDropdown - Column header dropdown with blue highlight when active
const FilterDropdown = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isActive = value !== 'all' && value !== '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
          isActive ? 'text-blue-600' : 'text-gray-500'
        } hover:text-blue-600`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-20 mt-1 ${'left-0'} bg-white border rounded-md shadow-lg min-w-[160px] max-h-60 overflow-y-auto`}>
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                value === opt.value ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// DateFilterDropdown - Date presets with custom range
const DateFilterDropdown = ({ label, value, onChange}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const dropdownRef = useRef(null);
  const isActive = value !== 'all';

  const presets = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month Revenue' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'custom', label: 'Custom Range...' }
  ];

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

  const handlePresetClick = (preset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      onChange(preset);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const applyCustomRange = () => {
    if (customFrom && customTo) {
      onChange(`custom:${customFrom}:${customTo}`);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const getDisplayValue = () => {
    if (value.startsWith('custom:')) {
      const parts = value.split(':');
      return `${parts[1]} - ${parts[2]}`;
    }
    const preset = presets.find(p => p.value === value);
    return preset ? preset.label : label;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
          isActive ? 'text-blue-600' : 'text-gray-500'
        } hover:text-blue-600`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-20 mt-1 ${'left-0'} bg-white border rounded-md shadow-lg min-w-[200px]`}>
          {!showCustom ? (
            presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(preset.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  value === preset.value || (preset.value === 'custom' && value.startsWith('custom:'))
                    ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                {preset.label}
              </button>
            ))
          ) : (
            <div className="p-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {'From'}
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {'To'}
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCustom(false)}
                  className="flex-1 px-2 py-1 text-sm border rounded hover:bg-gray-100"
                >
                  {'Back'}
                </button>
                <button
                  onClick={applyCustomRange}
                  disabled={!customFrom || !customTo}
                  className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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

// FilterChip - Removable filter tag
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
    {label}
    <button onClick={onRemove} className="hover:text-blue-600">
      <X className="w-3 h-3" />
    </button>
  </span>
);

// SummaryCard - Clickable card with count
const SummaryCard = ({ icon: Icon, label, count, isActive, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-w-[100px] ${
      isActive
        ? `${colorClass} border-current`
        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
    }`}
  >
    <Icon className="w-5 h-5 mb-1" />
    <span className="text-lg font-bold">{count}</span>
    <span className="text-xs">{label}</span>
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AppointmentsList = ({
  appointments,
  clients,
  showConfirm,
  hideConfirm,
  showToast,
  refreshAppointments
}) => {
  const { openForm } = useUI();
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCard, setActiveCard] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCard, dateFilter, typeFilter, clientFilter]);

  // ---------------------------------------------------------------------------
  // DATE UTILITIES
  // ---------------------------------------------------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const weekStart = getStartOfWeek(today);
  const weekEnd = getEndOfWeek(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const isInDateRange = (dateStr, rangeStart, rangeEnd) => {
    const d = new Date(dateStr);
    return d >= rangeStart && d <= rangeEnd;
  };

  const isToday = (dateStr) => dateStr === todayStr;
  const isThisWeek = (dateStr) => isInDateRange(dateStr, weekStart, weekEnd);
  const isThisMonth = (dateStr) => isInDateRange(dateStr, monthStart, monthEnd);
  const isLastMonth = (dateStr) => isInDateRange(dateStr, lastMonthStart, lastMonthEnd);
  const isUpcoming = (dateStr) => new Date(dateStr) >= today;
  const isPast = (dateStr) => new Date(dateStr) < today;

  // ---------------------------------------------------------------------------
  // SUMMARY CARD COUNTS
  // ---------------------------------------------------------------------------
  const cardCounts = useMemo(() => ({
    today: appointments.filter(a => isToday(a.date)).length,
    thisWeek: appointments.filter(a => isThisWeek(a.date)).length,
    upcoming: appointments.filter(a => isUpcoming(a.date)).length,
    past: appointments.filter(a => isPast(a.date)).length,
    all: appointments.length
  }), [appointments]);

  // ---------------------------------------------------------------------------
  // APPOINTMENT TYPES
  // ---------------------------------------------------------------------------
  const appointmentTypes = useMemo(() => {
    const types = [...new Set(appointments.map(a => a.appointment_type).filter(Boolean))];
    return types.sort();
  }, [appointments]);

  // ---------------------------------------------------------------------------
  // FILTER OPTIONS
  // ---------------------------------------------------------------------------
  const typeOptions = useMemo(() => [
    { value: 'all', label: 'All Types' },
    ...appointmentTypes.map(type => ({
      value: type,
      label: type
    }))
  ], [appointmentTypes]);

  const clientOptions = useMemo(() => [
    { value: 'all', label: 'All Clients' },
    ...clients.map(c => ({ value: c.client_id.toString(), label: c.client_name }))
  ], [clients]);

  // ---------------------------------------------------------------------------
  // FILTERING LOGIC
  // ---------------------------------------------------------------------------
  const filteredAppointments = useMemo(() => {
    let result = [...appointments];

    // Card filter
    if (activeCard === 'today') {
      result = result.filter(a => isToday(a.date));
    } else if (activeCard === 'thisWeek') {
      result = result.filter(a => isThisWeek(a.date));
    } else if (activeCard === 'upcoming') {
      result = result.filter(a => isUpcoming(a.date));
    } else if (activeCard === 'past') {
      result = result.filter(a => isPast(a.date));
    }

    // Date dropdown filter (overrides card if set)
    if (dateFilter !== 'all') {
      if (dateFilter === 'today') {
        result = result.filter(a => isToday(a.date));
      } else if (dateFilter === 'thisWeek') {
        result = result.filter(a => isThisWeek(a.date));
      } else if (dateFilter === 'thisMonth') {
        result = result.filter(a => isThisMonth(a.date));
      } else if (dateFilter === 'lastMonth') {
        result = result.filter(a => isLastMonth(a.date));
      } else if (dateFilter === 'upcoming') {
        result = result.filter(a => isUpcoming(a.date));
      } else if (dateFilter === 'past') {
        result = result.filter(a => isPast(a.date));
      } else if (dateFilter.startsWith('custom:')) {
        const parts = dateFilter.split(':');
        const from = new Date(parts[1]);
        const to = new Date(parts[2]);
        to.setHours(23, 59, 59, 999);
        result = result.filter(a => isInDateRange(a.date, from, to));
      }
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(a => a.appointment_type === typeFilter);
    }

    // Client filter
    if (clientFilter !== 'all') {
      result = result.filter(a => a.client_id?.toString() === clientFilter);
    }

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(a => {
        const client = clients.find(c => c.client_id === a.client_id);
        return (
          a.title?.toLowerCase().includes(search) ||
          a.appointment_type?.toLowerCase().includes(search) ||
          a.location?.toLowerCase().includes(search) ||
          a.location_type?.toLowerCase().includes(search) ||
          a.notes?.toLowerCase().includes(search) ||
          client?.client_name?.toLowerCase().includes(search)
        );
      });
    }

    // Sort by date descending (most recent first)
    result.sort((a, b) => new Date(b.date) - new Date(a.date));

    return result;
  }, [appointments, clients, activeCard, dateFilter, typeFilter, clientFilter, debouncedSearch]);

  // ---------------------------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------------------------
  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage, pageSize]);

  // ---------------------------------------------------------------------------
  // ACTIVE FILTERS FOR CHIPS
  // ---------------------------------------------------------------------------
  const activeFilters = useMemo(() => {
    const filters = [];

    if (activeCard !== 'all') {
      const cardLabels = {
        today: 'Today',
        thisWeek: 'This Week',
        upcoming: 'Upcoming',
        past: 'Past'
      };
      filters.push({
        key: 'card',
        label: `${'Period'}: ${cardLabels[activeCard]}`,
        onRemove: () => setActiveCard('all')
      });
    }

    if (dateFilter !== 'all' && activeCard === 'all') {
      let dateLabel = dateFilter;
      if (dateFilter.startsWith('custom:')) {
        const parts = dateFilter.split(':');
        dateLabel = `${parts[1]} - ${parts[2]}`;
      } else {
        const presetLabels = {
          today: 'Today',
          thisWeek: 'This Week',
          thisMonth: 'This Month Revenue',
          lastMonth: 'Last Month',
          upcoming: 'Upcoming',
          past: 'Past'
        };
        dateLabel = presetLabels[dateFilter] || dateFilter;
      }
      filters.push({
        key: 'date',
        label: `${'DATE'}: ${dateLabel}`,
        onRemove: () => setDateFilter('all')
      });
    }

    if (typeFilter !== 'all') {
      const typeLabel = typeFilter;
      filters.push({
        key: 'type',
        label: `${'Type'}: ${typeLabel}`,
        onRemove: () => setTypeFilter('all')
      });
    }

    if (clientFilter !== 'all') {
      const client = clients.find(c => c.client_id.toString() === clientFilter);
      filters.push({
        key: 'client',
        label: `${'Client'}: ${client?.client_name || clientFilter}`,
        onRemove: () => setClientFilter('all')
      });
    }

    return filters;
  }, [activeCard, dateFilter, typeFilter, clientFilter, clients]);

  const clearAllFilters = () => {
    setActiveCard('all');
    setDateFilter('all');
    setTypeFilter('all');
    setClientFilter('all');
    setSearchTerm('');
  };

  // ---------------------------------------------------------------------------
  // CARD CLICK HANDLERS
  // ---------------------------------------------------------------------------
  const handleCardClick = (cardType) => {
    if (activeCard === cardType) {
      setActiveCard('all');
      setDateFilter('all');
    } else {
      setActiveCard(cardType);
      setDateFilter('all'); // Clear date dropdown when using card
    }
  };

  // ---------------------------------------------------------------------------
  // FORMAT DATE DISPLAY
  // ---------------------------------------------------------------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Appointments'}</h2>
        <button
          onClick={() => openForm('appointment')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {'Add Appointment'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard
          icon={Calendar}
          label={'Today'}
          count={cardCounts.today}
          isActive={activeCard === 'today'}
          onClick={() => handleCardClick('today')}
          colorClass="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={CalendarDays}
          label={'This Week'}
          count={cardCounts.thisWeek}
          isActive={activeCard === 'thisWeek'}
          onClick={() => handleCardClick('thisWeek')}
          colorClass="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Clock}
          label={'Upcoming'}
          count={cardCounts.upcoming}
          isActive={activeCard === 'upcoming'}
          onClick={() => handleCardClick('upcoming')}
          colorClass="bg-yellow-50 text-yellow-600"
        />
        <SummaryCard
          icon={History}
          label={'Past'}
          count={cardCounts.past}
          isActive={activeCard === 'past'}
          onClick={() => handleCardClick('past')}
          colorClass="bg-gray-100 text-gray-600"
        />
        <SummaryCard
          icon={List}
          label={'Total'}
          count={cardCounts.all}
          isActive={activeCard === 'all'}
          onClick={() => handleCardClick('all')}
          colorClass="bg-slate-100 text-slate-600"
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${
          'left-3'
        }`} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={'Search by client, title, location, type...'}
          className={`w-full border rounded-lg py-2 ${
            'pl-10 pr-4'
          }`}
          dir={'ltr'}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
              'right-3'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <FilterChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
          ))}
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-800"
          >
            {'Clear All'}
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        {tf('Showing {shown} of {total} appointments', { shown: filteredAppointments.length, total: appointments.length })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">
                <DateFilterDropdown
                  label={'DATE'}
                  value={dateFilter}
                  onChange={(val) => {
                    setDateFilter(val);
                    if (val !== 'all') setActiveCard('all');
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {'Title'}
              </th>
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Type'}
                  value={typeFilter}
                  options={typeOptions}
                  onChange={setTypeFilter}
                                 />
              </th>
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Client'}
                  value={clientFilter}
                  options={clientOptions}
                  onChange={setClientFilter}
                                 />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {'Location Type'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedAppointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  {'No data'}
                </td>
              </tr>
            ) : (
              paginatedAppointments.map(a => {
                const client = clients.find(c => c.client_id === a.client_id);
                return (
                  <tr key={a.appointment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div>{formatDate(a.date)}</div>
                      {!a.all_day && a.start_time && (
                        <div className="text-xs text-gray-500">
                          {a.start_time} - {a.end_time}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{a.title}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                        {a.appointment_type || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{client?.client_name || '--'}</td>
                    <td className="px-6 py-4 text-sm">
                      {a.location_type || '--'}
                      {a.location && <div className="text-xs text-gray-500">{a.location}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openForm('appointment', a)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {'Edit'}
                      </button>
                      <button
                        onClick={() => {
                          showConfirm(
                            'Delete Appointment',
                            'Are you sure you want to delete this appointment?',
                            async () => {
                              try {
                                const result = await apiClient.deleteAppointment(a.appointment_id);
                                if (!result || result.success === false) {
                                  showToast(result?.error || 'Failed to delete appointment', 'error');
                                  hideConfirm();
                                  return;
                                }
                                await refreshAppointments();
                                showToast('Appointment deleted');
                                hideConfirm();
                              } catch (error) {
                                console.error('Error deleting appointment:', error);
                                showToast('Error deleting appointment', 'error');
                                hideConfirm();
                              }
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
      </div>

      {/* Pagination - Always Visible */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            {'Show'}
          </span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">
            {'per page'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            {tf('Page {current} of {total}', { current: currentPage, total: totalPages || 1 })}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsList;
