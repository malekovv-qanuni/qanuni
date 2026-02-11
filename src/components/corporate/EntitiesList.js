/**
 * EntitiesList Component (v46.38)
 * Corporate Entities list with search and filtering
 * Extracted from App.js for better maintainability
 * 
 * v46.38: Added Client filter, Entity Type filter, enhanced search
 */
import React, { useState, useMemo } from 'react';
import { Building2, Edit3, Plus, Trash2, Filter } from 'lucide-react';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

const EntitiesList = React.memo(({ corporateEntities, showToast, refreshCorporateEntities }) => {
  const { openForm } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  // Get unique clients for dropdown
  const uniqueClients = useMemo(() => {
    const clients = corporateEntities.map(e => ({
      id: e.client_id,
      name: e.client_name,
      nameArabic: e.client_name_arabic
    }));
    // Remove duplicates by client_id
    const unique = Array.from(new Map(clients.map(c => [c.id, c])).values());
    // Sort alphabetically
    return unique.sort((a, b) => {
      const nameA = a.name;
      const nameB = b.name;
      return nameA.localeCompare(nameB);
    });
  }, [corporateEntities]);

  // Get unique entity types for dropdown
  const uniqueEntityTypes = useMemo(() => {
    const types = corporateEntities
      .filter(e => e.entity_type) // Only include entities with a type set
      .map(e => ({
        id: e.entity_type,
        name: e.entity_type_name,
        nameArabic: e.entity_type_name_ar
      }));
    // Remove duplicates by entity_type id
    const unique = Array.from(new Map(types.map(t => [t.id, t])).values());
    // Sort alphabetically
    return unique.sort((a, b) => {
      const nameA = a.name;
      const nameB = b.name;
      return (nameA || '').localeCompare(nameB || '');
    });
  }, [corporateEntities]);

  const filteredEntities = corporateEntities.filter(entity => {
    // Enhanced search: includes client name, registration number, AND entity type
    const matchesSearch = !searchTerm ||
      entity.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.client_name_arabic?.includes(searchTerm) ||
      entity.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.entity_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.entity_type_name_ar?.includes(searchTerm) ||
      entity.commercial_register?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by corporate_status
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'no_details' && !entity.has_corporate_details) ||
      (entity.has_corporate_details && entity.corporate_status === statusFilter);
    
    // Filter by client (use string comparison to avoid type issues)
    const matchesClient = clientFilter === 'all' || 
      String(entity.client_id) === String(clientFilter);
    
    // Filter by entity type (use string comparison to avoid type issues)
    const matchesEntityType = entityTypeFilter === 'all' || 
      String(entity.entity_type) === String(entityTypeFilter);
    
    return matchesSearch && matchesStatus && matchesClient && matchesEntityType;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClientFilter('all');
    setEntityTypeFilter('all');
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || clientFilter !== 'all' || entityTypeFilter !== 'all';

  const handleEdit = (entity) => {
    if (entity.has_corporate_details) {
      openForm('entity', {
        ...entity,
        entity_type: entity.entity_type,
        entity_id: entity.entity_id,
        status: entity.corporate_status
      });
    } else {
      openForm('entity', {
        client_id: entity.client_id,
        client_name: entity.client_name,
        client_name_arabic: entity.client_name_arabic,
        entity_type: entity.entity_type,
        isNewForClient: true
      });
    }
  };

  const handleAddDetails = (entity) => {
    openForm('entity', {
      client_id: entity.client_id,
      client_name: entity.client_name,
      client_name_arabic: entity.client_name_arabic,
      entity_type: entity.entity_type,
      isNewForClient: true
    });
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this corporate record?')) {
      try {
        await apiClient.deleteCorporateEntity(clientId);
        showToast('Corporate record deleted', 'success');
        refreshCorporateEntities();
      } catch (error) {
        showToast('Error deleting', 'error');
      }
    }
  };

  const getStatusBadge = (entity) => {
    if (!entity.has_corporate_details) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          {'No Details'}
        </span>
      );
    }

    const status = entity.corporate_status;
    const styles = {
      active: 'bg-green-100 text-green-800',
      dormant: 'bg-gray-100 text-gray-600',
      liquidating: 'bg-orange-100 text-orange-800',
      struck_off: 'bg-red-100 text-red-800'
    };
    const labels = {
      active: 'Active',
      dormant: 'Dormant',
      liquidating: 'Liquidating',
      struck_off: 'Struck Off'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount, currency) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center" data-tour="companies-header">
        <h2 className="text-xl font-semibold">{'Companies'}</h2>
        {/* Results count */}
        <span className="text-sm text-gray-500">
          {`${filteredEntities.length} of ${corporateEntities.length}`}
        </span>
      </div>

      {/* Info message */}
      <div className="flex items-center gap-2 text-gray-500" style={{ fontSize: '13px' }}>
        <span>ℹ️</span>
        <span>
          {"Showing clients with Service Type 'Corporate Only' or 'Both'. Click a row to edit. To add a company here, update Service Type in Clients."}
        </span>
      </div>

      {/* Filters Row 1: Search + Clear */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder={'Search by name, registration #, entity type...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1"
          >
            <Filter size={16} />
            {'Clear Filters'}
          </button>
        )}
      </div>

      {/* Filters Row 2: Dropdowns */}
      <div className="flex gap-4 flex-wrap">
        {/* Client Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            {'Client:'}
          </label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg min-w-[180px]"
          >
            <option value="all">{'All Clients'}</option>
            {uniqueClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            {'Entity Type:'}
          </label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg min-w-[180px]"
          >
            <option value="all">{'All Types'}</option>
            {uniqueEntityTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            {'Status:'}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg min-w-[150px]"
          >
            <option value="all">{'All'}</option>
            <option value="no_details">{'No Details'}</option>
            <option value="active">{'Active'}</option>
            <option value="dormant">{'Dormant'}</option>
            <option value="liquidating">{'Liquidating'}</option>
            <option value="struck_off">{'Struck Off'}</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filteredEntities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">{'No corporate entities'}</p>
          {hasActiveFilters ? (
            <p className="text-sm">
              {'No results match the selected filters'}
            </p>
          ) : (
            <p className="text-sm max-w-md mx-auto">
              {'To see clients here, create a client with Client Type = Legal Entity and Service Type = Corporate Only or Both.'}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden" data-tour="entity-list">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  {'Client'}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  {'Entity Type'}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  {'Registration Number'}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  {'Share Capital'}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  {'Status'}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntities.map(entity => (
                <tr
                  key={entity.client_id}
                  onClick={() => handleEdit(entity)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${!entity.has_corporate_details ? 'bg-yellow-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {entity.client_name}
                      {!entity.has_corporate_details && (
                        <span className="ml-2 text-xs text-amber-600">
                          ({'needs details'})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {entity.entity_type_name}
                  </td>
                  <td className="px-4 py-3">
                    {entity.registration_number || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(entity.share_capital, entity.share_capital_currency)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(entity)}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center">
                      {entity.has_corporate_details ? (
                        <>
                          <button
                            onClick={() => handleEdit(entity)}
                            className="text-blue-600 hover:text-blue-800"
                            title={'Edit'}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(entity.client_id)}
                            className="text-red-600 hover:text-red-800"
                            title={'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAddDetails(entity)}
                          className="text-green-600 hover:text-green-800 flex items-center gap-1"
                          title={'Add Details'}
                        >
                          <Plus size={16} />
                          <span className="text-xs">{'Add'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default EntitiesList;
