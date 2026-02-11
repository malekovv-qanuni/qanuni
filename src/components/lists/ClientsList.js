import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown, Users, Building2, User, Upload, Download } from 'lucide-react';
import { EmptyState } from '../common';
import { tf } from '../../utils';
import { useUI } from '../../contexts';
import { useFilters } from '../../hooks/useFilters';

/**
 * ClientsList Component - v46.52
 * Displays a searchable list of clients
 * 
 * Features:
 * - Summary cards (Total, Individual, Legal Entity) - clickable to filter
 * - Client Type dropdown filter
 * - Filter chips with Clear All
 * - Smart search
 * - Pagination (always visible)
 * 
 * v46.52: Removed service_type column and filter (service type belongs on matters)
 * v46.6: Added summary cards, always show pagination
 */

// Summary card component - clickable to filter
const SummaryCard = ({ icon: Icon, label, count, color, isActive, onClick }) => {
  // Convert text-color-600 to bg-color-600 for active state
  const activeBg = color.replace('text-', 'bg-');
  const inactiveBg = color.replace('text-', 'bg-').replace('600', '100');
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
        isActive 
          ? `${activeBg} border-transparent text-white shadow-md` 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className={`p-2 rounded-full ${isActive ? 'bg-white bg-opacity-20' : inactiveBg}`}>
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : color}`} />
      </div>
      <div className="text-left">
        <p className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>{count}</p>
        <p className={`text-xs ${isActive ? 'text-white text-opacity-80' : 'text-gray-500'}`}>{label}</p>
      </div>
    </button>
  );
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

// Filter chip component
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

const ClientsList = ({
  clients,
  showConfirm,
  showToast,
  hideConfirm,
  refreshClients,
  electronAPI
}) => {
  const { openForm } = useUI();
  const { search: clientSearch, setSearch: setClientSearch } = useFilters('clients');
  // Filter state
  const [filters, setFilters] = useState({
    clientType: ''
  });
  
  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Import handler - v46.55 fix
  const handleImport = async () => {
    try {
      const result = await electronAPI.importClientsExcel();
      if (result?.success) {
        showToast(tf('Successfully imported {n} client(s)', { n: result.imported }), 'success');
        refreshClients();
      } else if (result?.error) {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('Import failed', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const result = await electronAPI.exportClientTemplate();
      if (result?.success) {
        showToast('Template saved successfully', 'success');
      }
    } catch (err) {
      showToast('Template download failed', 'error');
    }
  };

  // Build filter options
  const filterOptions = useMemo(() => {
    const clientTypeOptions = [
      { value: '', label: 'All Types' },
      { value: 'individual', label: 'Individual' },
      { value: 'legal_entity', label: 'Legal Entity' }
    ];
    
    return { clientTypeOptions };
  }, [clients]);

  // Filter and search clients
  const filteredClients = useMemo(() => {
    let result = [...clients];
    
    // Apply search
    if (clientSearch.trim()) {
      const search = clientSearch.toLowerCase();
      result = result.filter(c => 
        (c.client_name || '').toLowerCase().includes(search) ||
        (c.client_name_arabic || '').includes(clientSearch) ||
        (c.email || '').toLowerCase().includes(search) ||
        (c.phone || '').includes(search) ||
        (c.mobile || '').includes(search)
      );
    }
    
    // Apply filters
    if (filters.clientType) {
      result = result.filter(c => c.client_type === filters.clientType);
    }
    
    return result;
  }, [clients, clientSearch, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [clientSearch, filters]);

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.clientType) {
      const label = filters.clientType === 'individual' 
        ? ('Individual')
        : ('Legal Entity');
      chips.push({ key: 'clientType', label: `Type: ${label}` });
    }
    return chips;
  }, [filters]);

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFilters({ clientType: '' });
    setClientSearch('');
  };

  const hasActiveFilters = activeFilters.length > 0 || clientSearch.trim();

  // v46.6: Summary statistics
  const summaryStats = useMemo(() => {
    return {
      total: clients.length,
      individual: clients.filter(c => c.client_type === 'individual').length,
      legalEntity: clients.filter(c => c.client_type === 'legal_entity').length
    };
  }, [clients]);

  // Show empty state when no clients exist
  if (clients.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{'Clients'}</h2>
        </div>
        <div className="bg-white rounded-lg shadow">
          <EmptyState
            type="clients"
            title={'No clients yet'}
            description={'Add your first client to get started with managing your practice.'}
            actionLabel={'Add Client'}
            onAction={() => openForm('client')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div data-tour="clients-header" className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Clients'}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
            title={'Download import template'}
          >
            <Download className="w-4 h-4" /> {'Template'}
          </button>
          <button
            data-tour="import-btn"
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
          >
            <Upload className="w-4 h-4" /> {'Import'}
          </button>
          <button 
            data-tour="add-client-btn"
            onClick={() => openForm('client')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" /> {'Add Client'}
          </button>
        </div>
      </div>

      {/* v46.6: Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          icon={Users}
          label={'Total Clients'}
          count={summaryStats.total}
          color="text-blue-600"
          isActive={!filters.clientType}
          onClick={() => setFilters(prev => ({ ...prev, clientType: '' }))}
        />
        <SummaryCard
          icon={User}
          label={'Individuals'}
          count={summaryStats.individual}
          color="text-green-600"
          isActive={filters.clientType === 'individual'}
          onClick={() => setFilters(prev => ({ 
            ...prev, 
            clientType: filters.clientType === 'individual' ? '' : 'individual' 
          }))}
        />
        <SummaryCard
          icon={Building2}
          label={'Legal Entities'}
          count={summaryStats.legalEntity}
          color="text-purple-600"
          isActive={filters.clientType === 'legal_entity'}
          onClick={() => setFilters(prev => ({ 
            ...prev, 
            clientType: filters.clientType === 'legal_entity' ? '' : 'legal_entity' 
          }))}
        />
      </div>
      
      {/* Search Bar */}
      <div data-tour="client-search" className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder={'Search clients...'}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {clientSearch.trim() && (
              <FilterChip 
                label={`Search: "${clientSearch}"`} 
                onRemove={() => setClientSearch('')} 
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
            {'Showing'} {filteredClients.length} {'of'} {clients.length} {'Clients'}
          </p>
        )}
      </div>

      {/* Table */}
      <div data-tour="client-list" className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* CLIENT NAME */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Client Name'}
              </th>
              {/* CLIENT TYPE */}
              <th className="px-6 py-3 text-left">
                <FilterDropdown
                  label={'Client Type'}
                  value={filters.clientType}
                  options={filterOptions.clientTypeOptions}
                  onChange={(v) => setFilters(prev => ({ ...prev, clientType: v }))}
                  isOpen={openDropdown === 'clientType'}
                  onToggle={() => setOpenDropdown(openDropdown === 'clientType' ? null : 'clientType')}
                  onClose={() => setOpenDropdown(null)}
                />
              </th>
              {/* EMAIL */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Email'}
              </th>
              {/* PHONE */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Phone'}
              </th>
              {/* ACTIONS */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  {hasActiveFilters 
                    ? ('No clients match your filters')
                    : ('No data')}
                </td>
              </tr>
            ) : (
              paginatedClients.map(client => (
                <tr key={client.client_id} className="hover:bg-gray-50">
                  {/* CLIENT NAME */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{client.client_name}</div>
                    {client.client_name_arabic && (
                      <div className="text-sm text-gray-500" dir="rtl">{client.client_name_arabic}</div>
                    )}
                  </td>
                  {/* CLIENT TYPE */}
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      client.client_type === 'legal_entity' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {client.client_type === 'legal_entity' 
                        ? ('Legal Entity')
                        : ('Individual')}
                    </span>
                  </td>
                  {/* EMAIL */}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {client.email || '—'}
                  </td>
                  {/* PHONE */}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {client.phone || client.mobile || '—'}
                  </td>
                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-sm">
                    <button 
                      onClick={() => openForm('client', client)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {'Edit'}
                    </button>
                    <button 
                      onClick={() => {
                        showConfirm(
                          'Delete Client',
                          'Are you sure you want to delete this client?',
                          async () => {
                            await electronAPI.deleteClient(client.client_id);
                            await refreshClients();
                            showToast('Client deleted');
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
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination - v46.6: Always show when there are clients */}
        {clients.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
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
              <span>per page</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsList;
