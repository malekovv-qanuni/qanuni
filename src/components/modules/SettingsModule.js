import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Download, Upload, FileText, FolderOpen, Clock, CheckCircle, AlertCircle, RefreshCw, HardDrive, UserX, UserCheck, DollarSign, ArrowRightLeft, X, Save,
  Shield, Copy, XCircle, Info, AlertTriangle
} from 'lucide-react';
import { useUI, useApp } from '../../contexts';
import apiClient from '../../api-client';

// ============================================
// SETTINGS MODULE COMPONENT
// v48 - Language removal (English-only UI)
// v46.52: Currency & Exchange Rates management tab
// v46.46: Fix lawyer list refresh after add
// v46.44: Lawyer Deactivation (D11)
// v46.45: Lawyers promoted to own Settings tab
// ============================================
const SettingsModule = ({
  // Firm Info
  firmInfo,
  setFirmInfo,

  // Lookup data
  lawyers,
  courtTypes,
  regions,
  hearingPurposes,
  taskTypes,
  expenseCategories,
  // Dialogs
  showConfirm,
  hideConfirm,
  showToast,
  // Refresh
  refreshLookups
}) => {
  const [settingsTab, setSettingsTab] = useState('firm');
  const { forms, openForm } = useUI();
  const { licenseStatus, machineId, setLicenseStatus } = useApp();
  const { currentType: currentLookupType, setCurrentType: setCurrentLookupType } = forms.lookup;
  // Local state for firm saving
  const [firmSaving, setFirmSaving] = useState(false);

  // Lawyer deactivation state (v46.44 D11)
  const [allLawyers, setAllLawyers] = useState([]);
  const [showInactiveLawyers, setShowInactiveLawyers] = useState(false);
  const [loadingLawyers, setLoadingLawyers] = useState(false);

  // Auto-backup state (v46.22)
  const [autoBackupStatus, setAutoBackupStatus] = useState(null);
  const [autoBackupSettings, setAutoBackupSettings] = useState({
    enabled: true,
    frequency: 'daily',
    retention: 7,
    location: ''
  });
  const [backupHistory, setBackupHistory] = useState([]);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);

  // Currency & Exchange Rate state (v46.52)
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [showCurrencyForm, setShowCurrencyForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [currencyForm, setCurrencyForm] = useState({ code: '', name: '', name_ar: '', symbol: '' });
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateForm, setRateForm] = useState({ from_currency: '', to_currency: '', rate: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });

  // Load auto-backup status when backup tab is shown
  useEffect(() => {
    if (settingsTab === 'backup') {
      loadAutoBackupStatus();
    }
  }, [settingsTab]);

  // Load all lawyers (including inactive) when viewing lawyers tab (v46.45)
  useEffect(() => {
    if (settingsTab === 'lawyers') {
      loadAllLawyers();
    }
  }, [settingsTab]);

  // v46.46: Re-sync allLawyers when lawyers prop changes (catches new additions from form)
  useEffect(() => {
    if (settingsTab === 'lawyers') {
      loadAllLawyers();
    }
  }, [lawyers]);

  // Load currencies when currency tab is shown (v46.52)
  useEffect(() => {
    if (settingsTab === 'currency') {
      loadCurrencies();
      loadExchangeRates();
    }
  }, [settingsTab]);

  const loadAllLawyers = async () => {
    setLoadingLawyers(true);
    try {
      const data = await apiClient.getAllLawyers();
      setAllLawyers(data || []);
    } catch (error) {
      console.error('Error loading all lawyers:', error);
    } finally {
      setLoadingLawyers(false);
    }
  };

  // Currency & Exchange Rate functions (v46.52)
  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const data = await apiClient.getCurrencies();
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const data = await apiClient.getExchangeRates();
      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const handleSaveCurrency = async () => {
    if (!currencyForm.code || !currencyForm.name) {
      showToast('Code and name are required', 'error');
      return;
    }
    // Normalize code to uppercase
    const data = { ...currencyForm, code: currencyForm.code.toUpperCase().trim() };
    try {
      if (editingCurrency) {
        await apiClient.updateCurrency({ ...data, id: editingCurrency.id });
        showToast('Currency updated');
      } else {
        await apiClient.addCurrency(data);
        showToast('Currency added');
      }
      setShowCurrencyForm(false);
      setEditingCurrency(null);
      setCurrencyForm({ code: '', name: '', name_ar: '', symbol: '' });
      await loadCurrencies();
    } catch (error) {
      console.error('Error saving currency:', error);
      const msg = error?.message || '';
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        showToast('Currency code already exists', 'error');
      } else {
        showToast('Error saving currency', 'error');
      }
    }
  };

  const handleDeleteCurrency = (currency) => {
    showConfirm(
      'Delete Currency',
      `Are you sure you want to delete currency ${currency.code}?`,
      async () => {
        try {
          await apiClient.deleteCurrency(currency.id);
          showToast('Currency deleted');
          await loadCurrencies();
          hideConfirm();
        } catch (error) {
          console.error('Error deleting currency:', error);
          showToast('Error deleting currency', 'error');
        }
      }
    );
  };

  const handleEditCurrency = (currency) => {
    setEditingCurrency(currency);
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      name_ar: currency.name_ar || '',
      symbol: currency.symbol || ''
    });
    setShowCurrencyForm(true);
  };

  const handleSaveExchangeRate = async () => {
    if (!rateForm.from_currency || !rateForm.to_currency || !rateForm.rate || !rateForm.effective_date) {
      showToast('All fields are required', 'error');
      return;
    }
    if (rateForm.from_currency === rateForm.to_currency) {
      showToast('From and To currencies must be different', 'error');
      return;
    }
    try {
      if (editingRate) {
        await apiClient.updateExchangeRate({ ...rateForm, id: editingRate.id });
        showToast('Exchange rate updated');
      } else {
        await apiClient.addExchangeRate(rateForm);
        showToast('Exchange rate added');
      }
      setShowRateForm(false);
      setEditingRate(null);
      setRateForm({ from_currency: '', to_currency: '', rate: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });
      await loadExchangeRates();
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      showToast('Error saving exchange rate', 'error');
    }
  };

  const handleDeleteExchangeRate = (rate) => {
    showConfirm(
      'Delete Exchange Rate',
      `Delete exchange rate ${rate.from_currency} → ${rate.to_currency}?`,
      async () => {
        try {
          await apiClient.deleteExchangeRate(rate.id);
          showToast('Exchange rate deleted');
          await loadExchangeRates();
          hideConfirm();
        } catch (error) {
          console.error('Error deleting exchange rate:', error);
          showToast('Error deleting exchange rate', 'error');
        }
      }
    );
  };

  const handleEditExchangeRate = (rate) => {
    setEditingRate(rate);
    setRateForm({
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: rate.rate,
      effective_date: rate.effective_date,
      notes: rate.notes || ''
    });
    setShowRateForm(true);
  };

  // Lawyer activation/deactivation (v46.44 D11)
  const handleToggleLawyerStatus = (lawyer) => {
    const isActive = lawyer.is_active === 1;
    showConfirm(
      isActive ? 'Deactivate Lawyer' : 'Reactivate Lawyer',
      `Are you sure you want to ${isActive ? 'deactivate' : 'reactivate'} ${lawyer.full_name}?${isActive ? ' This will hide them from dropdown lists.' : ' This will make them available in dropdown lists again.'}`,
      async () => {
        try {
          if (isActive) {
            await apiClient.deactivateLawyer(lawyer.lawyer_id);
            showToast(`${lawyer.full_name} deactivated`);
          } else {
            await apiClient.activateLawyer(lawyer.lawyer_id);
            showToast(`${lawyer.full_name} reactivated`);
          }
          await loadAllLawyers();
          await refreshLookups();
          hideConfirm();
        } catch (error) {
          console.error('Error toggling lawyer status:', error);
          showToast('Error updating lawyer status', 'error');
        }
      }
    );
  };

  const handleSaveFirmInfo = async () => {
    setFirmSaving(true);
    try {
      await apiClient.updateFirmInfo(firmInfo);
      showToast('Firm information saved');
    } catch (error) {
      console.error('Error saving firm info:', error);
      showToast('Error saving firm information', 'error');
    } finally {
      setFirmSaving(false);
    }
  };

  const loadAutoBackupStatus = async () => {
    setLoadingBackup(true);
    try {
      const status = await apiClient.getAutoBackupStatus();
      if (status) {
        setAutoBackupStatus(status);
        setAutoBackupSettings(status.settings || {
          enabled: true,
          frequency: 'daily',
          retention: 7,
          location: ''
        });
        setBackupHistory(status.history || []);
      }
    } catch (error) {
      console.error('Error loading backup status:', error);
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleSaveAutoBackupSettings = async () => {
    try {
      await apiClient.saveAutoBackupSettings(autoBackupSettings);
      showToast('Auto-backup settings saved');
      await loadAutoBackupStatus();
    } catch (error) {
      console.error('Error saving auto-backup settings:', error);
      showToast('Error saving settings', 'error');
    }
  };

  const handleSelectBackupFolder = async () => {
    try {
      const result = await apiClient.selectBackupFolder();
      if (result?.path) {
        setAutoBackupSettings(prev => ({ ...prev, location: result.path }));
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleOpenBackupFolder = async () => {
    try {
      await apiClient.openBackupFolder();
    } catch (error) {
      console.error('Error opening folder:', error);
      showToast('Error opening backup folder', 'error');
    }
  };

  const handleRunBackupNow = async () => {
    setRunningBackup(true);
    try {
      const result = await apiClient.runBackupNow();
      if (result?.success) {
        showToast(`Backup created: ${result.filename}`);
        await loadAutoBackupStatus();
      } else {
        showToast(result?.error || 'Backup failed', 'error');
      }
    } catch (error) {
      console.error('Error running backup:', error);
      showToast('Backup failed', 'error');
    } finally {
      setRunningBackup(false);
    }
  };

  const formatBackupTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteLookup = (lookupItem) => {
    const typeNames = {
      courtTypes: 'court type',
      regions: 'region',
      hearingPurposes: 'hearing purpose',
      taskTypes: 'task type',
      expenseCategories: 'expense category'
    };
    
    showConfirm(
      'Delete Item',
      `Are you sure you want to delete this ${typeNames[currentLookupType]}?`,
      async () => {
        try {
          await apiClient.deleteLookupEntry(currentLookupType, lookupItem.id);
          showToast('Item deleted successfully');
          await refreshLookups();
          hideConfirm();
        } catch (error) {
          console.error('Error deleting lookup item:', error);
          showToast('Error deleting item', 'error');
        }
      }
    );
  };

  const lookupTables = {
    courtTypes: { data: courtTypes, label: 'Court Types', addLabel: 'Add Court Type' },
    regions: { data: regions, label: 'Regions', addLabel: 'Add Region' },
    hearingPurposes: { data: hearingPurposes, label: 'Hearing Purposes', addLabel: 'Add Purpose' },
    taskTypes: { data: taskTypes, label: 'Task Types', addLabel: 'Add Task Type' },
    expenseCategories: { data: expenseCategories, label: 'Expense Categories', addLabel: 'Add Category' }
  };

  const currentTable = lookupTables[currentLookupType];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setSettingsTab('firm')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'firm'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Firm Information
        </button>
        <button
          onClick={() => setSettingsTab('lookups')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'lookups'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Lookup Tables
        </button>
        <button
          onClick={() => setSettingsTab('lawyers')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'lawyers'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Lawyers
        </button>
        <button
          onClick={() => setSettingsTab('currency')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'currency'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-1" />
          Currency
        </button>
        <button
          onClick={() => setSettingsTab('backup')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'backup'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <HardDrive className="w-4 h-4 inline mr-1" />
          Backup & Restore
        </button>
        <button
          onClick={() => setSettingsTab('license')}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            settingsTab === 'license'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1" />
          License
        </button>
      </div>

      {/* Firm Information Tab */}
      {settingsTab === 'firm' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <h3 className="text-lg font-semibold mb-4">Firm Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
              <input
                type="text"
                value={firmInfo.firm_name || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, firm_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name (Arabic)</label>
              <input
                type="text"
                value={firmInfo.firm_name_arabic || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, firm_name_arabic: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-right"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={firmInfo.address || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={firmInfo.phone || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={firmInfo.email || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="text"
                value={firmInfo.website || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, website: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="www.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / Registration Number</label>
              <input
                type="text"
                value={firmInfo.tax_id || ''}
                onChange={(e) => setFirmInfo({ ...firmInfo, tax_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <button
              onClick={handleSaveFirmInfo}
              disabled={firmSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {firmSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lookup Tables Tab */}
      {settingsTab === 'lookups' && (
        <div className="space-y-6">
          {/* Lookup Type Selector */}
          <div className="flex gap-2">
            {Object.entries(lookupTables).map(([key, table]) => (
              <button
                key={key}
                onClick={() => setCurrentLookupType(key)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentLookupType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {table.label}
              </button>
            ))}
          </div>

          {/* Lookup Table Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">{currentTable.label}</h3>
              <button
                onClick={() => openForm('lookup')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} />
                {currentTable.addLabel}
              </button>
            </div>
            <div className="p-4">
              {currentTable.data.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items yet</p>
              ) : (
                <div className="space-y-2">
                  {currentTable.data.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">{item.name_en}</div>
                        {item.name_ar && (
                          <div className="text-sm text-gray-600" dir="rtl">{item.name_ar}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openForm('lookup', item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLookup(item)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lawyers Tab (v46.45) */}
      {settingsTab === 'lawyers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Lawyers</h3>
              <button
                onClick={() => setShowInactiveLawyers(!showInactiveLawyers)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                  showInactiveLawyers
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showInactiveLawyers ? (
                  <>
                    <UserX className="w-4 h-4" />
                    Show Active Only
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Show All (incl. Inactive)
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => {
                setCurrentLookupType('lawyers');
                openForm('lookup');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Lawyer
            </button>
          </div>

          {loadingLawyers ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allLawyers
                    .filter(lawyer => showInactiveLawyers || lawyer.is_active === 1)
                    .map((lawyer) => (
                      <tr key={lawyer.lawyer_id} className={lawyer.is_active === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{lawyer.full_name}</div>
                          {lawyer.full_name_arabic && (
                            <div className="text-sm text-gray-600" dir="rtl">{lawyer.full_name_arabic}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{lawyer.email || '-'}</td>
                        <td className="px-4 py-3 text-sm">{lawyer.position || '-'}</td>
                        <td className="px-4 py-3">
                          {lawyer.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              <UserX className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openForm('lookup', lawyer)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleLawyerStatus(lawyer)}
                              className={`p-2 rounded ${
                                lawyer.is_active === 1
                                  ? 'text-orange-600 hover:bg-orange-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={lawyer.is_active === 1 ? 'Deactivate' : 'Reactivate'}
                            >
                              {lawyer.is_active === 1 ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Currency & Exchange Rates Tab (v46.52) */}
      {settingsTab === 'currency' && (
        <div className="space-y-6">
          {/* Currencies Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Currencies
              </h3>
              <button
                onClick={() => {
                  setEditingCurrency(null);
                  setCurrencyForm({ code: '', name: '', name_ar: '', symbol: '' });
                  setShowCurrencyForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Currency
              </button>
            </div>
            <div className="p-4">
              {loadingCurrencies ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : currencies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No currencies configured</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currencies.map((currency) => (
                    <div
                      key={currency.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">{currency.code} {currency.symbol && `(${currency.symbol})`}</div>
                        <div className="text-sm text-gray-600">{currency.name}</div>
                        {currency.name_ar && (
                          <div className="text-sm text-gray-600" dir="rtl">{currency.name_ar}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCurrency(currency)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCurrency(currency)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Exchange Rates Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Exchange Rates
              </h3>
              <button
                onClick={() => {
                  setEditingRate(null);
                  setRateForm({ from_currency: '', to_currency: '', rate: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });
                  setShowRateForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={currencies.length < 2}
              >
                <Plus size={16} />
                Add Exchange Rate
              </button>
            </div>
            <div className="p-4">
              {currencies.length < 2 ? (
                <p className="text-gray-500 text-center py-8">Add at least 2 currencies to create exchange rates</p>
              ) : exchangeRates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No exchange rates configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {exchangeRates.map((rate) => (
                        <tr key={rate.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{rate.from_currency}</td>
                          <td className="px-4 py-3 font-medium">{rate.to_currency}</td>
                          <td className="px-4 py-3 text-right">{parseFloat(rate.rate).toFixed(6)}</td>
                          <td className="px-4 py-3">{rate.effective_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rate.notes || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditExchangeRate(rate)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteExchangeRate(rate)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Currency Form Modal */}
          {showCurrencyForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-semibold">{editingCurrency ? 'Edit Currency' : 'Add Currency'}</h3>
                  <button
                    onClick={() => {
                      setShowCurrencyForm(false);
                      setEditingCurrency(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currencyForm.code}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-md uppercase"
                      placeholder="USD"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currencyForm.name}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="US Dollar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (Arabic)</label>
                    <input
                      type="text"
                      value={currencyForm.name_ar}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, name_ar: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-right"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                    <input
                      type="text"
                      value={currencyForm.symbol}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="$"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowCurrencyForm(false);
                      setEditingCurrency(null);
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCurrency}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingCurrency ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Exchange Rate Form Modal */}
          {showRateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-semibold">{editingRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</h3>
                  <button
                    onClick={() => {
                      setShowRateForm(false);
                      setEditingRate(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={rateForm.from_currency}
                      onChange={(e) => setRateForm({ ...rateForm, from_currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select currency</option>
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={rateForm.to_currency}
                      onChange={(e) => setRateForm({ ...rateForm, to_currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select currency</option>
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={rateForm.rate}
                      onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={rateForm.effective_date}
                      onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={rateForm.notes}
                      onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowRateForm(false);
                      setEditingRate(null);
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExchangeRate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingRate ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backup & Restore Tab */}
      {settingsTab === 'backup' && (
        <div className="space-y-6">
          {/* Auto-Backup Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Automatic Backup
              </h3>
              {autoBackupStatus && (
                <button
                  onClick={handleRunBackupNow}
                  disabled={runningBackup}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {runningBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4" />
                      Backup Now
                    </>
                  )}
                </button>
              )}
            </div>

            {loadingBackup ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                {autoBackupStatus && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    {autoBackupSettings.enabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {autoBackupSettings.enabled ? 'Auto-backup is enabled' : 'Auto-backup is disabled'}
                      </div>
                      {autoBackupStatus.lastBackup && (
                        <div className="text-sm text-gray-600 mt-1">
                          Last backup: {formatBackupTime(autoBackupStatus.lastBackup)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Enable automatic backup
                  </label>
                  <button
                    onClick={() => setAutoBackupSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoBackupSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoBackupSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={autoBackupSettings.frequency}
                    onChange={(e) => setAutoBackupSettings(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={!autoBackupSettings.enabled}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="on_close">On app close</option>
                  </select>
                </div>

                {/* Retention */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keep last backups
                  </label>
                  <select
                    value={autoBackupSettings.retention}
                    onChange={(e) => setAutoBackupSettings(prev => ({ ...prev, retention: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={!autoBackupSettings.enabled}
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={30}>30</option>
                  </select>
                </div>

                {/* Backup Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup location
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={autoBackupSettings.location || 'Default folder'}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-gray-600"
                    />
                    <button
                      onClick={handleSelectBackupFolder}
                      disabled={!autoBackupSettings.enabled}
                      className="px-3 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FolderOpen className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleOpenBackupFolder}
                      className="px-3 py-2 border rounded-md hover:bg-gray-50"
                      title="Open folder"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveAutoBackupSettings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* Backup History */}
            {backupHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Backup History
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {backupHistory.slice(0, 5).map((backup, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600">{backup.filename}</span>
                      <span className="text-gray-400">{formatBackupTime(backup.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Manual Backup Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-6">Manual Backup & Restore</h3>
            
            <div className="space-y-6">
              {/* Backup Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Backup Database</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create a backup of all your data. You can restore from this file later.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await apiClient.backupDatabase();
                      if (result?.success) {
                        showToast(`Backup saved to: ${result.filePath}`);
                      } else if (!result?.canceled) {
                        showToast(result?.error || 'Backup failed', 'error');
                      }
                    } catch (error) {
                      showToast(error.message || 'Backup failed', 'error');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Download size={18} />
                  Create Backup
                </button>
              </div>

              {/* Restore Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Restore Database</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Restore your data from a previous backup file.
                </p>
                <p className="text-sm text-red-600 mb-4">
                  ⚠️ Warning: This will replace all current data with the backup file.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await apiClient.restoreDatabase();
                      if (result?.success) {
                        showToast(result.message || 'Restore successful. Please restart the application.');
                      } else if (!result?.canceled) {
                        showToast(result?.error || 'Restore failed', 'error');
                      }
                    } catch (error) {
                      showToast(error.message || 'Restore failed', 'error');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  <Upload size={18} />
                  Restore from Backup
                </button>
              </div>

              {/* Export All Data Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Export All Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export all your data to an Excel file with multiple sheets for reporting or archival.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const result = await apiClient.exportAllData();
                      if (result?.success) {
                        showToast(`Exported to: ${result.filePath}`);
                      } else if (!result?.canceled) {
                        showToast(result?.error || 'Export failed', 'error');
                      }
                    } catch (error) {
                      showToast(error.message || 'Export failed', 'error');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FileText size={18} />
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* License Tab */}
      {settingsTab === 'license' && (
        <div className="space-y-6">
          {/* License Status Card */}
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">License Information</h3>

            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                {licenseStatus?.isValid ? (
                  licenseStatus.status === 'GRACE_PERIOD' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Grace Period
                    </span>
                  ) : licenseStatus.status === 'DEV_MODE' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Development Mode
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Active
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {licenseStatus?.status === 'NO_KEY' ? 'No License' : 'Expired'}
                  </span>
                )}
              </div>

              {/* Details - only when license exists */}
              {licenseStatus?.details && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Licensed To</span>
                    <span className="text-sm text-gray-900">{licenseStatus.details.issuedTo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">License Type</span>
                    <span className="text-sm text-gray-900 capitalize">{licenseStatus.details.type || 'Standard'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Expires</span>
                    <span className="text-sm text-gray-900">
                      {new Date(licenseStatus.details.expiresAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Days Remaining</span>
                    <span className={`text-sm font-medium ${
                      licenseStatus.details.daysUntilExpiry < 7 ? 'text-red-600' :
                      licenseStatus.details.daysUntilExpiry < 30 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {licenseStatus.details.daysUntilExpiry > 0
                        ? `${licenseStatus.details.daysUntilExpiry} days`
                        : `Expired ${Math.abs(licenseStatus.details.daysUntilExpiry)} days ago`
                      }
                    </span>
                  </div>
                </>
              )}

              {/* Grace Period Warning */}
              {licenseStatus?.status === 'GRACE_PERIOD' && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">License Expired - Grace Period Active</p>
                    <p className="mt-1">
                      Please renew your license to continue using Qanuni without interruption.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Machine ID Card */}
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Machine Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={machineId || 'Loading...'}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(machineId);
                      showToast('Machine ID copied to clipboard');
                    } catch (err) {
                      showToast('Failed to copy Machine ID', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Provide this Machine ID when requesting a license key or contacting support.
              </p>
            </div>
          </div>

          {/* Actions Card - only for valid non-dev licenses */}
          {licenseStatus?.isValid && licenseStatus?.status !== 'DEV_MODE' && (
            <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">License Actions</h3>
              <button
                onClick={() => {
                  showConfirm(
                    'Deactivate License',
                    'Are you sure you want to deactivate this license? You will need to enter a valid license key to continue using Qanuni.',
                    async () => {
                      try {
                        const result = await apiClient.deactivateLicense();
                        if (result.success) {
                          showToast('License deactivated');
                          hideConfirm();
                          setLicenseStatus({
                            isValid: false,
                            status: 'NO_KEY',
                            message: 'No license key found',
                            machineId: machineId
                          });
                        } else {
                          showToast(result.error || 'Failed to deactivate license', 'error');
                        }
                      } catch (error) {
                        showToast('Error deactivating license', 'error');
                      }
                    }
                  );
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                Deactivate License
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Deactivating will remove this license from this computer. You can reactivate with the same key later.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsModule;
