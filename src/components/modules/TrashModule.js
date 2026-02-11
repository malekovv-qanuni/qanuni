import React, { useState, useEffect } from 'react';
import {
  Trash2, RefreshCw, RotateCcw, AlertTriangle, Search, Filter, X
} from 'lucide-react';
import { tf } from '../../utils';

// ============================================
// TRASH MODULE COMPONENT (v46.23)
// View and restore soft-deleted items
// ============================================
const TrashModule = ({
  showConfirm,
  hideConfirm,
  showToast,
  onRestore // Callback to refresh main data after restore
}) => {
  const [trashItems, setTrashItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState({ total: 0 });

  // Item type configuration
  const itemTypes = [
    { id: 'all', label: 'All', icon: '📁' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'matters', label: 'Matters', icon: '📂' },
    { id: 'hearings', label: 'hearings', icon: '⚖️' },
    { id: 'judgments', label: 'Judgments', icon: '📜' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'timesheets', label: 'Timesheets', icon: '⏱️' },
    { id: 'expenses', label: 'Expenses', icon: '💰' },
    { id: 'invoices', label: 'Invoices', icon: '📄' },
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'advances', label: 'Payments Received', icon: '💵' },
    { id: 'deadlines', label: 'Deadlines', icon: '⏰' },
  ];

  useEffect(() => {
    loadTrashItems();
  }, []);

  const loadTrashItems = async () => {
    setLoading(true);
    try {
      const items = await window.electronAPI.getTrashItems();
      setTrashItems(items || {});
      const countData = await window.electronAPI.getTrashCount();
      setCounts(countData || { total: 0 });
    } catch (error) {
      console.error('Error loading trash:', error);
      showToast('Error loading trash', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type, id, name) => {
    showConfirm(
      'Restore Item',
      tf('Do you want to restore "{name}"?', { name }),
      async () => {
        try {
          await window.electronAPI.restoreTrashItem(type, id);
          showToast('Item restored');
          await loadTrashItems();
          // Trigger refresh of main data
          if (onRestore) onRestore(type);
          hideConfirm();
        } catch (error) {
          console.error('Error restoring item:', error);
          showToast('Error restoring item', 'error');
        }
      },
      { confirmText: 'Restore' }
    );
  };

  const handlePermanentDelete = async (type, id, name) => {
    showConfirm(
      'Permanent Delete',
      tf('Are you sure you want to permanently delete "{name}"? This cannot be undone.', { name }),
      async () => {
        try {
          await window.electronAPI.permanentDeleteItem(type, id);
          showToast('Permanently deleted');
          await loadTrashItems();
          hideConfirm();
        } catch (error) {
          console.error('Error deleting item:', error);
          showToast('Error deleting item', 'error');
        }
      },
      { danger: true, confirmText: 'Delete Forever' }
    );
  };

  const handleEmptyTrash = () => {
    if (counts.total === 0) {
      showToast('Trash is empty', 'info');
      return;
    }

    showConfirm(
      'Empty Trash',
      tf('Are you sure you want to permanently delete {count} items? This cannot be undone.', { count: counts.total }),
      async () => {
        try {
          await window.electronAPI.emptyTrash();
          showToast('Trash emptied');
          await loadTrashItems();
          hideConfirm();
        } catch (error) {
          console.error('Error emptying trash:', error);
          showToast('Error emptying trash', 'error');
        }
      },
      { danger: true, confirmText: 'Delete All' }
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get all items for display (filtered by type and search)
  const getAllItems = () => {
    let items = [];
    
    Object.entries(trashItems).forEach(([type, typeItems]) => {
      if (selectedType === 'all' || selectedType === type) {
        typeItems.forEach(item => {
          items.push({
            ...item,
            category: type
          });
        });
      }
    });

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(search) ||
        item.client_name?.toLowerCase().includes(search)
      );
    }

    // Sort by deleted_at descending (newest first)
    items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

    return items;
  };

  const allItems = getAllItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-gray-600" />
          <h2 className="text-2xl font-bold">
            {'Trash'}
          </h2>
          {counts.total > 0 && (
            <span className="px-2 py-1 text-sm bg-gray-200 rounded-full">
              {counts.total} {'items'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTrashItems}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {'Refresh'}
          </button>
          <button
            onClick={handleEmptyTrash}
            disabled={counts.total === 0}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {'Empty Trash'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {itemTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label} 
                  {type.id !== 'all' && counts[type.id] > 0 && ` (${counts[type.id]})`}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={'Search deleted items...'}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            {'Loading...'}
          </div>
        ) : allItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trash2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">
              {'Trash is empty'}
            </p>
            <p className="text-sm mt-1">
              {'Deleted items will appear here'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {'Type'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {'Name'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {'Deleted'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allItems.map((item, index) => {
                const typeConfig = itemTypes.find(t => t.id === item.category);
                return (
                  <tr key={`${item.type}-${item.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-sm">
                        {typeConfig?.icon} {typeConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{item.name || '--'}</div>
                      {item.client_name && (
                        <div className="text-xs text-gray-500">{item.client_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(item.deleted_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(item.type, item.id, item.name)}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                          title={'Restore'}
                        >
                          <RotateCcw className="w-4 h-4" />
                          {'Restore'}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.type, item.id, item.name)}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          title={'Delete Forever'}
                        >
                          <Trash2 className="w-4 h-4" />
                          {'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">
            {'Note'}
          </p>
          <p>
            {'Items in trash can be restored. Permanent deletion cannot be undone.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrashModule;
