/**
 * MatterForm Component (v46.55)
 * Matter/Case creation and editing form
 * v46.55: Office File No. field with soft uniqueness check
 * v46.52: Dynamic currency dropdowns from Settings
 * v46: Fee Arrangement field for billing types
 * v46.1: Agreed Fee Amount + Currency for fixed/recurrent fees
 * v46.2: Success fee (% or fixed), custom hourly rate override, removed hybrid
 * v46.3: Fixed + Success fee type (common in Lebanon)
 * v46.34: Adverse Parties tracking with conflict check
 * Related Matters section showing parent/child appeal chain
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Scale, ChevronRight, Link2, AlertTriangle, Loader2 } from 'lucide-react';
import FormField from '../common/FormField';
import AdversePartiesInput from '../common/AdversePartiesInput';
import { useUI } from '../../contexts';

// Helper function for generating IDs
const generateID = (prefix) => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${year}-${random}`;
};

const MatterForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshMatters, refreshClients, clients, matters, courtTypes, regions, lawyers, onViewMatter}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingMatter, formData: matterFormData, setFormData: setMatterFormData } = forms.matter;
  const defaultFormData = {
    client_id: '', matter_name: '', matter_name_arabic: '', matter_type: 'litigation',
    custom_matter_type: '', status: 'active', custom_matter_number: '', case_number: '',
    court_type_id: '', court_type_custom: '', court_region_id: '', region_custom: '', judge_name: '',
    responsible_lawyer_id: '', opening_date: new Date().toISOString().split('T')[0], notes: '',
    parent_matter_id: '', matter_stage: 'first_instance', fee_arrangement: '',
    agreed_fee_amount: '', agreed_fee_currency: 'USD',
    success_fee_type: 'percentage', success_fee_percentage: '',
    success_fee_fixed_amount: '', success_fee_currency: 'USD',
    custom_hourly_rate: '', custom_hourly_currency: 'USD',
    adverse_parties: '[]'
  };
  
  // Use App-level state to persist across re-renders
  // Sanitize editingMatter to replace null values with defaults (v46.34 fix)
  const sanitizeData = (data) => {
    if (!data) return defaultFormData;
    return {
      ...defaultFormData,
      ...data,
      // Ensure these fields are never null (causes React warnings)
      adverse_parties: data.adverse_parties || '[]',
      matter_name: data.matter_name || '',
      matter_name_arabic: data.matter_name_arabic || '',
      case_number: data.case_number || '',
      court_type_custom: data.court_type_custom || '',
      region_custom: data.region_custom || '',
      judge_name: data.judge_name || '',
      notes: data.notes || '',
      custom_matter_type: data.custom_matter_type || '',
      custom_matter_number: data.custom_matter_number || '',
      agreed_fee_amount: data.agreed_fee_amount || '',
      success_fee_percentage: data.success_fee_percentage || '',
      success_fee_fixed_amount: data.success_fee_fixed_amount || '',
      custom_hourly_rate: data.custom_hourly_rate || ''
    };
  };
  
  const initialData = matterFormData || sanitizeData(editingMatter);
  const [formData, setFormDataLocal] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Related matters state
  const [relatedMatters, setRelatedMatters] = useState({ parent: null, children: [] });
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Adverse party conflict check state (v46.34)
  const [adverseConflicts, setAdverseConflicts] = useState([]);
  const [checkingAdverse, setCheckingAdverse] = useState(false);
  const [criticalAcknowledged, setCriticalAcknowledged] = useState(false);
  const [acknowledgmentReason, setAcknowledgmentReason] = useState('');
  const [fileNumberWarning, setFileNumberWarning] = useState(''); // v46.55 soft uniqueness

  // Dynamic currencies from Settings (v46.52)
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  // Wrapper to update both local and App-level state
  const setFormData = useCallback((updater) => {
    setFormDataLocal(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      // Schedule App-level state update after render completes
      setTimeout(() => setMatterFormData(newData), 0);
      return newData;
    });
  }, [setMatterFormData]);
  
  // Initialize App-level state on first render
  useEffect(() => {
    if (!matterFormData) {
      setMatterFormData(initialData);
    }
  }, []);

  // Load related matters when editing
  useEffect(() => {
    const loadRelatedMatters = async () => {
      if (editingMatter && editingMatter.matter_id) {
        setLoadingRelated(true);
        try {
          // Try to use API if available
          if (window.electronAPI.getRelatedMatters) {
            const related = await window.electronAPI.getRelatedMatters(editingMatter.matter_id);
            setRelatedMatters(related);
          } else {
            // Fallback: find related matters from the matters array
            const parent = editingMatter.parent_matter_id 
              ? matters.find(m => m.matter_id === editingMatter.parent_matter_id)
              : null;
            const children = matters.filter(m => m.parent_matter_id === editingMatter.matter_id);
            setRelatedMatters({ parent, children });
          }
        } catch (error) {
          console.error('Error loading related matters:', error);
          // Fallback to local search
          const parent = editingMatter.parent_matter_id 
            ? matters.find(m => m.matter_id === editingMatter.parent_matter_id)
            : null;
          const children = matters.filter(m => m.parent_matter_id === editingMatter.matter_id);
          setRelatedMatters({ parent, children });
        }
        setLoadingRelated(false);
      }
    };
    loadRelatedMatters();
  }, [editingMatter, matters]);

  // Load currencies from Settings (v46.52)
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        if (window.electronAPI.getCurrencies) {
          const data = await window.electronAPI.getCurrencies();
          setAvailableCurrencies(data || []);
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      }
    };
    loadCurrencies();
  }, []);

  // Helper to render currency options (v46.52)
  const renderCurrencyOptions = () => {
    if (availableCurrencies.length > 0) {
      return availableCurrencies.map(c => (
        <option key={c.code} value={c.code}>{c.code}{c.symbol ? ` (${c.symbol})` : ''}</option>
      ));
    }
    // Fallback if currencies haven't loaded
    return (
      <>
        <option value="USD">USD ($)</option>
        <option value="LBP">LBP (ل.ل)</option>
        <option value="EUR">EUR (€)</option>
        <option value="GBP">GBP (£)</option>
        <option value="AED">AED (د.إ)</option>
        <option value="SAR">SAR (ر.س)</option>
      </>
    );
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return 'Please select an option';
        break;
      case 'matter_name':
        if (!value || !value.trim()) return 'This field is required';
        break;
      case 'custom_matter_type':
        if (formData.matter_type === 'custom' && (!value || !value.trim())) return 'This field is required';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    markFormDirty();
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const newErrors = {};
    const fieldsToValidate = ['client_id', 'matter_name'];
    if (formData.matter_type === 'custom') fieldsToValidate.push('custom_matter_type');
    fieldsToValidate.forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return Object.keys(newErrors).length === 0;
  };

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  // Get stage badge
  const getStageBadge = (stage) => {
    const stages = {
      'first_instance': { label: 'First Instance', color: 'bg-blue-100 text-blue-800' },
      'appeal': { label: 'Appeal', color: 'bg-purple-100 text-purple-800' },
      'cassation': { label: 'Cassation', color: 'bg-red-100 text-red-800' }
    };
    const s = stages[stage] || stages['first_instance'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  // Handle viewing a related matter
  const handleViewRelatedMatter = (matter) => {
    if (onViewMatter) {
      closeForm('matter');
      clearFormDirty();
      // Small delay to allow form to close first
      setTimeout(() => onViewMatter(matter), 100);
    }
  };

  // Handle adverse party conflict check (v46.34)
  const handleAdversePartyCheck = async (partyName) => {
    if (!partyName || partyName.length < 2) return;
    
    setCheckingAdverse(true);
    try {
      const results = await window.electronAPI.conflictCheck({ name: partyName });
      // Filter out current client from results (they're obviously adverse to their own matter)
      const conflicts = results.filter(r => r.client_id !== formData.client_id);
      setAdverseConflicts(conflicts);
      
      if (conflicts.length > 0) {
        // Show warning toast
        const hasCritical = conflicts.some(c => c.severity === 'CRITICAL');
        const hasHigh = conflicts.some(c => c.severity === 'HIGH');
        
        showToast(
          `⚠️ Warning: "${partyName}" found in database (${conflicts.length} result${conflicts.length > 1 ? 's' : ''})`,
          hasCritical ? 'error' : hasHigh ? 'warning' : 'info'
        );
      }
    } catch (error) {
      console.error('Adverse party check error:', error);
    }
    setCheckingAdverse(false);
  };

  // v46.55 — Soft uniqueness check for Office File No.
  const handleFileNumberBlur = async () => {
    const fileNum = formData.custom_matter_number?.trim();
    setFileNumberWarning('');
    if (!fileNum) return;
    try {
      const matches = await window.electronAPI.checkFileNumberUnique(fileNum, formData.matter_id || null);
      if (matches && matches.length > 0) {
        const names = matches.map(m => m.matter_name).join(', ');
        setFileNumberWarning(
          `This file number is already used by: ${names}`
        );
      }
    } catch (err) {
      console.error('File number check error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast('Please fix the errors', 'error');
      return;
    }
    
    // Check for CRITICAL conflicts that require acknowledgment (v46.34)
    const hasCriticalConflict = adverseConflicts.some(c => c.severity === 'CRITICAL');
    if (hasCriticalConflict && !criticalAcknowledged) {
      showToast(
        'You must acknowledge the critical conflict before saving',
        'error'
      );
      return;
    }
    
    try {
      const matterData = {
        ...formData,
        matter_id: formData.matter_id || generateID('MTR'),
        court_type_id: formData.court_type_id === 'custom' ? null : (formData.court_type_id || null),
        court_region_id: formData.court_region_id === 'custom' ? null : (formData.court_region_id || null),
        responsible_lawyer_id: formData.responsible_lawyer_id || null,
        parent_matter_id: formData.parent_matter_id || null,
        matter_stage: formData.matter_stage || 'first_instance',
        fee_arrangement: formData.fee_arrangement || null,
        agreed_fee_amount: formData.agreed_fee_amount ? parseFloat(formData.agreed_fee_amount) : null,
        agreed_fee_currency: formData.agreed_fee_currency || 'USD',
        success_fee_type: formData.success_fee_type || 'percentage',
        success_fee_percentage: formData.success_fee_percentage ? parseFloat(formData.success_fee_percentage) : null,
        success_fee_fixed_amount: formData.success_fee_fixed_amount ? parseFloat(formData.success_fee_fixed_amount) : null,
        success_fee_currency: formData.success_fee_currency || 'USD',
        custom_hourly_rate: formData.custom_hourly_rate ? parseFloat(formData.custom_hourly_rate) : null,
        custom_hourly_currency: formData.custom_hourly_currency || 'USD',
        adverse_parties: formData.adverse_parties || '[]'
      };

      if (editingMatter) {
        await window.electronAPI.updateMatter(matterData);
      } else {
        await window.electronAPI.addMatter(matterData);
      }
      clearFormDirty();
      await refreshMatters();
      showToast(editingMatter
        ? ('Matter updated successfully')
        : ('Matter added successfully'));
      closeForm('matter');
    } catch (error) {
      console.error('Error saving matter:', error);
      showToast('Error saving matter', 'error');
    }
  };

  // Check if there are related matters to show
  const hasRelatedMatters = relatedMatters.parent || relatedMatters.children?.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingMatter ? 'Edit' : 'Add Matter'}</h2>
            <button onClick={() => { closeForm('matter'); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Related Matters Section - Only show when editing and has related matters */}
          {editingMatter && hasRelatedMatters && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                {'Related Matters'}
              </h3>
              
              {loadingRelated ? (
                <div className="text-sm text-purple-600">{'Loading...'}</div>
              ) : (
                <div className="space-y-2">
                  {/* Appeal Chain Visualization */}
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    {/* Parent Matter */}
                    {relatedMatters.parent && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleViewRelatedMatter(relatedMatters.parent)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-purple-300 rounded hover:bg-purple-100 transition-colors"
                          title={'View original matter'}
                        >
                          <Scale className="w-3 h-3 text-purple-600" />
                          <span className="max-w-[150px] truncate">{relatedMatters.parent.matter_name}</span>
                          {getStageBadge(relatedMatters.parent.matter_stage)}
                        </button>
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                      </>
                    )}
                    
                    {/* Current Matter */}
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-200 border border-purple-400 rounded font-medium">
                      <Scale className="w-3 h-3 text-purple-700" />
                      <span className="max-w-[150px] truncate">{formData.matter_name || ('Current')}</span>
                      {getStageBadge(formData.matter_stage)}
                    </div>
                    
                    {/* Child Appeals */}
                    {relatedMatters.children?.length > 0 && (
                      <>
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        {relatedMatters.children.map((child, idx) => (
                          <React.Fragment key={child.matter_id}>
                            {idx > 0 && <span className="text-purple-400">|</span>}
                            <button
                              type="button"
                              onClick={() => handleViewRelatedMatter(child)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-purple-300 rounded hover:bg-purple-100 transition-colors"
                              title={'View appeal matter'}
                            >
                              <Scale className="w-3 h-3 text-purple-600" />
                              <span className="max-w-[150px] truncate">{child.matter_name}</span>
                              {getStageBadge(child.matter_stage)}
                            </button>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </div>
                  
                  {/* Info text */}
                  <p className="text-xs text-purple-600 mt-2">
                    {relatedMatters.parent && (
                      `This matter is an appeal of: ${relatedMatters.parent.case_number || relatedMatters.parent.matter_name}`
                    )}
                    {relatedMatters.children?.length > 0 && !relatedMatters.parent && (
                      `${relatedMatters.children.length} appeal(s) filed on this matter`
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Show matter stage badge when editing */}
          {editingMatter && formData.matter_stage && formData.matter_stage !== 'first_instance' && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">{'Matter Stage:'}</span>
              {getStageBadge(formData.matter_stage)}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={'Select Client'} required error={errors.client_id}>
              <select value={formData.client_id || ''}
                onChange={(e) => handleFieldChange('client_id', e.target.value)}
                onBlur={() => handleBlur('client_id')}
                className={inputClass(errors.client_id)}>
                <option value="">{'Select Client'}</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={'Matter Name'} required error={errors.matter_name}>
                <input type="text" value={formData.matter_name}
                  onChange={(e) => handleFieldChange('matter_name', e.target.value)}
                  onBlur={() => handleBlur('matter_name')}
                  className={inputClass(errors.matter_name)} />
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{'Matter Type'}</label>
                <select value={formData.matter_type?.startsWith('custom:') ? 'custom' : (formData.matter_type || 'litigation')}
                  onChange={(e) => { handleFieldChange('matter_type', e.target.value); setFormData(prev => ({...prev, custom_matter_type: ''})); }}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="litigation">{'Litigation'}</option>
                  <option value="arbitration">{'Arbitration'}</option>
                  <option value="advisory">{'Advisory'}</option>
                  <option value="transactional">{'Transactional'}</option>
                  <option value="custom">{'Custom'}</option>
                </select>
              </div>
              {(formData.matter_type === 'custom' || formData.matter_type?.startsWith('custom:')) && (
                <FormField label={'Custom Type'} required error={errors.custom_matter_type}>
                  <input type="text"
                    value={formData.custom_matter_type || formData.matter_type?.replace('custom:', '') || ''}
                    onChange={(e) => { handleFieldChange('custom_matter_type', e.target.value); setFormData(prev => ({...prev, matter_type: 'custom:' + e.target.value})); }}
                    onBlur={() => handleBlur('custom_matter_type')}
                    placeholder={'Enter matter type...'}
                    className={inputClass(errors.custom_matter_type)} />
                </FormField>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{'Status'}</label>
                <select value={formData.status || 'active'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="consultation">{'Consultation'}</option>
                  <option value="engaged">{'Engaged'}</option>
                  <option value="active">{'Active'}</option>
                  <option value="on_hold">{'On Hold'}</option>
                  <option value="closed">{'Closed'}</option>
                  <option value="archived">{'Archived'}</option>
                </select>
              </div>
              {/* Fee Arrangement - v46 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Fee Arrangement'}
                </label>
                <select value={formData.fee_arrangement || ''}
                  onChange={(e) => setFormData({...formData, fee_arrangement: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">{'-- Not Set --'}</option>
                  <option value="hourly">{'Hourly'}</option>
                  <option value="fixed">{'Fixed Fee'}</option>
                  <option value="recurrent">{'Recurrent Fee'}</option>
                  <option value="success">{'Success Fee'}</option>
                  <option value="fixed_success">{'Fixed + Success Fee'}</option>
                </select>
              </div>
              {/* Hourly - Custom Rate Override (v46.2) */}
              {formData.fee_arrangement === 'hourly' && (
                <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      {'Custom Hourly Rate (Optional)'}
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      value={formData.custom_hourly_rate || ''}
                      onChange={(e) => setFormData({...formData, custom_hourly_rate: e.target.value})}
                      placeholder={'Leave empty to use lawyer default'}
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      {'Currency'}
                    </label>
                    <select 
                      value={formData.custom_hourly_currency || 'USD'}
                      onChange={(e) => setFormData({...formData, custom_hourly_currency: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      {renderCurrencyOptions()}
                    </select>
                  </div>
                  <p className="col-span-2 text-xs text-gray-500">
                    {'If left empty, each lawyer\'s default rate will be used'}
                  </p>
                </div>
              )}
              {/* Fixed / Recurrent Fee Amount (v46.1) */}
              {['fixed', 'recurrent'].includes(formData.fee_arrangement) && (
                <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">
                      {'Agreed Fee Amount'}
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      value={formData.agreed_fee_amount || ''}
                      onChange={(e) => setFormData({...formData, agreed_fee_amount: e.target.value})}
                      placeholder={'Enter amount...'}
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">
                      {'Currency'}
                    </label>
                    <select 
                      value={formData.agreed_fee_currency || 'USD'}
                      onChange={(e) => setFormData({...formData, agreed_fee_currency: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      {renderCurrencyOptions()}
                    </select>
                  </div>
                </div>
              )}
              {/* Success Fee (v46.2) - Percentage or Fixed */}
              {formData.fee_arrangement === 'success' && (
                <div className="col-span-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="success_fee_type"
                        checked={formData.success_fee_type !== 'fixed'}
                        onChange={() => setFormData({...formData, success_fee_type: 'percentage'})}
                        className="text-green-600"
                      />
                      <span className="text-sm font-medium text-green-800">
                        {'Percentage'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="success_fee_type"
                        checked={formData.success_fee_type === 'fixed'}
                        onChange={() => setFormData({...formData, success_fee_type: 'fixed'})}
                        className="text-green-600"
                      />
                      <span className="text-sm font-medium text-green-800">
                        {'Fixed Amount'}
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.success_fee_type === 'fixed' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-green-800">
                            {'Fee Amount'}
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            value={formData.agreed_fee_amount || ''}
                            onChange={(e) => setFormData({...formData, agreed_fee_amount: e.target.value})}
                            placeholder={'Enter amount...'}
                            className="w-full px-3 py-2 border rounded-md" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-green-800">
                            {'Currency'}
                          </label>
                          <select 
                            value={formData.agreed_fee_currency || 'USD'}
                            onChange={(e) => setFormData({...formData, agreed_fee_currency: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md">
                            {renderCurrencyOptions()}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-green-800">
                          {'Fee Percentage (%)'}
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          step="0.1"
                          value={formData.success_fee_percentage || ''}
                          onChange={(e) => setFormData({...formData, success_fee_percentage: e.target.value})}
                          placeholder={'e.g., 15'}
                          className="w-full px-3 py-2 border rounded-md" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Fixed + Success Fee (v46.3) - Common in Lebanon */}
              {formData.fee_arrangement === 'fixed_success' && (
                <div className="col-span-2 space-y-3">
                  {/* Fixed Fee Part */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                      {'Fixed Fee (Upfront)'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800">
                          {'Amount'}
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={formData.agreed_fee_amount || ''}
                          onChange={(e) => setFormData({...formData, agreed_fee_amount: e.target.value})}
                          placeholder={'Enter amount...'}
                          className="w-full px-3 py-2 border rounded-md" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800">
                          {'Currency'}
                        </label>
                        <select 
                          value={formData.agreed_fee_currency || 'USD'}
                          onChange={(e) => setFormData({...formData, agreed_fee_currency: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md">
                          {renderCurrencyOptions()}
                        </select>
                      </div>
                    </div>
                  </div>
                  {/* Success Fee Part */}
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">
                      {'Success Fee (On Win)'}
                    </h4>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="success_fee_type_combined"
                          checked={formData.success_fee_type !== 'fixed'}
                          onChange={() => setFormData({...formData, success_fee_type: 'percentage'})}
                          className="text-green-600"
                        />
                        <span className="text-sm font-medium text-green-800">
                          {'Percentage'}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="success_fee_type_combined"
                          checked={formData.success_fee_type === 'fixed'}
                          onChange={() => setFormData({...formData, success_fee_type: 'fixed'})}
                          className="text-green-600"
                        />
                        <span className="text-sm font-medium text-green-800">
                          {'Fixed Amount'}
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.success_fee_type === 'fixed' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-green-800">
                              {'Success Amount'}
                            </label>
                            <input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              value={formData.success_fee_fixed_amount || ''}
                              onChange={(e) => setFormData({...formData, success_fee_fixed_amount: e.target.value})}
                              placeholder={'Enter amount...'}
                              className="w-full px-3 py-2 border rounded-md" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-green-800">
                              {'Currency'}
                            </label>
                            <select 
                              value={formData.success_fee_currency || 'USD'}
                              onChange={(e) => setFormData({...formData, success_fee_currency: e.target.value})}
                              className="w-full px-3 py-2 border rounded-md">
                              {renderCurrencyOptions()}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium mb-1 text-green-800">
                            {'Fee Percentage (%)'}
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="0.1"
                            value={formData.success_fee_percentage || ''}
                            onChange={(e) => setFormData({...formData, success_fee_percentage: e.target.value})}
                            placeholder={'e.g., 15'}
                            className="w-full px-3 py-2 border rounded-md" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Office File No. + Court Case No. (v46.55) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Office File No.'}
                </label>
                <input type="text" value={formData.custom_matter_number}
                  onChange={(e) => { setFormData({...formData, custom_matter_number: e.target.value}); setFileNumberWarning(''); }}
                  onBlur={handleFileNumberBlur}
                  placeholder={'e.g., 231-14'}
                  className="w-full px-3 py-2 border rounded-md" />
                {fileNumberWarning && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {fileNumberWarning}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Court Case No.'}
                </label>
                <input type="text" value={formData.case_number}
                  onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>

              {/* Adverse Parties Section (v46.34) */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 text-red-700">
                  {'Adverse Parties'}
                </label>
                <AdversePartiesInput
                  value={formData.adverse_parties || '[]'}
                  onChange={(val) => {
                    setFormData({...formData, adverse_parties: val});
                    markFormDirty();
                  }}
                  onConflictCheck={handleAdversePartyCheck}
                />
                
                {/* Conflict Warning Panel */}
                {adverseConflicts.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">
                        {'Warning: Potential matches found'}
                      </span>
                      {checkingAdverse && <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />}
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {adverseConflicts.map((conflict, idx) => (
                        <div key={idx} className={`text-sm p-2 rounded ${
                          conflict.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-300' :
                          conflict.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          conflict.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {conflict.client_name || conflict.matched_value}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              conflict.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                              conflict.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                              conflict.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {conflict.severity}
                            </span>
                          </div>
                          <div className="text-xs mt-1 opacity-75">
                            {conflict.display_info || `${
                              conflict.match_type === 'client_name' ? ('Existing client') :
                              conflict.match_type === 'shareholder' ? ('Shareholder') :
                              conflict.match_type === 'director' ? ('Director') :
                              conflict.match_type === 'adverse_party' ? ('Adverse party in another matter') :
                              conflict.match_type
                            }`}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      {'Please review these matches before proceeding. This may indicate a potential conflict of interest.'}
                    </p>
                    
                    {/* CRITICAL Conflict Acknowledgment (v46.34) */}
                    {adverseConflicts.some(c => c.severity === 'CRITICAL') && (
                      <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="criticalAcknowledge"
                            checked={criticalAcknowledged}
                            onChange={(e) => setCriticalAcknowledged(e.target.checked)}
                            className="mt-1 w-5 h-5 text-red-600 border-red-400 rounded focus:ring-red-500"
                          />
                          <label htmlFor="criticalAcknowledge" className="text-sm text-red-800 font-medium cursor-pointer">
                            {'I acknowledge that I have reviewed the CRITICAL conflict and take full responsibility for proceeding'}
                          </label>
                        </div>
                        {criticalAcknowledged && (
                          <div className="mt-3">
                            <label className="block text-xs text-red-700 mb-1">
                              {'Reason for proceeding (optional):'}
                            </label>
                            <input
                              type="text"
                              value={acknowledgmentReason}
                              onChange={(e) => setAcknowledgmentReason(e.target.value)}
                              placeholder={'Enter reason...'}
                              className="w-full px-3 py-2 text-sm border border-red-300 rounded-md bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Court Type with Custom Option */}
              <div>
                <label className="block text-sm font-medium mb-1">{'Court Type'}</label>
                <select value={formData.court_type_id || ''}
                  onChange={(e) => setFormData({...formData, court_type_id: e.target.value, court_type_custom: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  {courtTypes.map(ct => (
                    <option key={ct.court_type_id} value={ct.court_type_id}>
                      {ct.name_en}
                    </option>
                  ))}
                  <option value="custom">{'Custom'}</option>
                </select>
              </div>
              {formData.court_type_id === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{'Custom Type'} *</label>
                  <input type="text" required value={formData.court_type_custom}
                    onChange={(e) => setFormData({...formData, court_type_custom: e.target.value})}
                    placeholder={'Enter court type...'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              {/* Region with Custom Option */}
              <div>
                <label className="block text-sm font-medium mb-1">{'Region'}</label>
                <select value={formData.court_region_id || ''}
                  onChange={(e) => setFormData({...formData, court_region_id: e.target.value, region_custom: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  {regions.map(r => (
                    <option key={r.region_id} value={r.region_id}>
                      {r.name_en}
                    </option>
                  ))}
                  <option value="custom">{'Custom'}</option>
                </select>
              </div>
              {formData.court_region_id === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{'Custom Region'} *</label>
                  <input type="text" required value={formData.region_custom}
                    onChange={(e) => setFormData({...formData, region_custom: e.target.value})}
                    placeholder={'Enter region...'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{'Judge Name'}</label>
                <input type="text" value={formData.judge_name}
                  onChange={(e) => setFormData({...formData, judge_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Responsible Lawyer'}</label>
                <select value={formData.responsible_lawyer_id || ''}
                  onChange={(e) => setFormData({...formData, responsible_lawyer_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  {lawyers.map(lawyer => (
                    <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                      {lawyer.full_name}
                      {lawyer.initials ? ` (${lawyer.initials})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Opening Date'}</label>
                <input type="date" value={formData.opening_date}
                  onChange={(e) => setFormData({...formData, opening_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{'Notes'}</label>
              <textarea value={formData.notes} rows="3"
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('matter'); clearFormDirty(); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Cancel'}</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default MatterForm;
