/**
 * ClientForm Component (v46.52)
 * Client creation and editing form
 * v46.52: Removed service_type field entirely (service type belongs on matters, not clients)
 *         Simplified - removed billing_terms, currency, notes (billing is per-matter)
 *         Registration number & VAT only shown for legal entities
 * v46.34: Enhanced conflict check with severity levels
 * Extracted from App.js for better maintainability
 */
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Loader2, Search, X, AlertTriangle } from 'lucide-react';
import FormField from '../common/FormField';
import { useUI } from '../../contexts';

// Helper function for generating IDs
const generateID = (prefix) => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${year}-${random}`;
};

const ClientForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshClients, refreshCorporateEntities, entityTypes, electronAPI}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingClient, formData: clientFormData, setFormData: setClientFormData } = forms.client;

  const defaultFormData = {
    client_name: '', client_name_arabic: '', client_type: 'individual', entity_type: '',
    custom_id: '', registration_number: '', vat_number: '',
    main_contact: '', email: '', phone: '', mobile: '',
    address: '', website: '', industry: '',
    default_currency: 'USD', billing_terms: 'hourly', source: '', notes: ''
  };
  
  // Use App-level state to persist across re-renders, fall back to defaults
  const initialData = clientFormData || (editingClient ? {...defaultFormData, ...editingClient} : defaultFormData);
  const [formData, setFormDataLocal] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [conflictChecked, setConflictChecked] = useState(!!editingClient);
  const [conflicts, setConflicts] = useState([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wrapper to update both local and App-level state
  // Fixed: Use useEffect to sync to parent state to avoid setState during render (Issue #3)
  const setFormData = (updater) => {
    setFormDataLocal(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      return newData;
    });
  };

  // Sync local state to App-level state when it changes (fixes setState during render warning)
  useEffect(() => {
    setClientFormData(formData);
  }, [formData, setClientFormData]);
  
  // Initialize App-level state on first render
  useEffect(() => {
    if (!clientFormData) {
      setClientFormData(initialData);
    }
  }, []);

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case 'client_name':
        if (!value || !value.trim()) return 'This field is required';
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        break;
      case 'phone':
        if (value && !/^[\d\s\+\-\(\)]{7,}$/.test(value)) return 'Please enter a valid phone number';
        break;
      case 'mobile':
        if (value && !/^[\d\s\+\-\(\)]{7,}$/.test(value)) return 'Please enter a valid phone number';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    markFormDirty();
    if (name === 'client_name') setConflictChecked(false);
    // Clear error if field was touched
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const newErrors = {};
    const fieldsToValidate = ['client_name', 'email', 'phone', 'mobile'];
    fieldsToValidate.forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return Object.keys(newErrors).length === 0;
  };

  const handleConflictCheck = async () => {
    if (!validateAll()) return;
    
    setChecking(true);
    try {
      const results = await electronAPI.conflictCheck({
        name: formData.client_name,
        registration_number: formData.registration_number,
        vat_number: formData.vat_number,
        email: formData.email,
        phone: formData.phone || formData.mobile
      });
      setConflicts(results || []);
      setConflictChecked(true);
    } catch (error) {
      console.error('Conflict check error:', error);
      setConflicts([]);
      setConflictChecked(true);
    }
    setChecking(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields first
    if (!validateAll()) {
      showToast('Please fix the errors', 'error');
      return;
    }
    
    // Must run conflict check first for new clients
    if (!conflictChecked && !editingClient) {
      await handleConflictCheck();
      return;
    }
    
    setSaving(true);
    
    try {
      if (!electronAPI) {
        alert('Error: App must run in Electron, not browser. Close browser and use the Electron window.');
        setSaving(false);
        return;
      }

      const clientData = {
        ...formData,
        client_id: editingClient?.client_id || generateID('CLT')
      };

      let result;
      if (editingClient) {
        result = await electronAPI.updateClient(clientData);
      } else {
        result = await electronAPI.addClient(clientData);
        if (electronAPI.logConflictCheck) {
          await electronAPI.logConflictCheck({
            check_type: 'new_client',
            search_terms: { name: formData.client_name },
            results_found: conflicts,
            decision: 'proceeded',
            entity_type: 'client',
            entity_id: clientData.client_id
          });
        }
      }
      
      if (!result || !result.success) {
        showToast(result?.error || 'Failed to save client', 'error');
        setSaving(false);
        return;
      }
      
      clearFormDirty();
      await refreshClients();
      await refreshCorporateEntities();
      showToast(editingClient
        ? ('Client updated successfully')
        : ('Client added successfully'));
      closeForm('client');
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error saving client', 'error');
    }
    setSaving(false);
  };

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingClient ? 'Edit Client' : 'Add Client'}</h2>
            <button onClick={() => { closeForm('client'); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Conflict Check Results */}
          {conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {'Potential conflicts found'}
                </span>
              </div>
              <ul className="space-y-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                      c.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                      c.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                      c.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>{c.severity}</span>
                    {c.display_info || c.matched_name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={'Client Name'} required error={errors.client_name}>
                <input type="text" value={formData.client_name}
                  onChange={(e) => handleFieldChange('client_name', e.target.value)}
                  onBlur={() => handleBlur('client_name')}
                  className={inputClass(errors.client_name)} />
              </FormField>
              
              <FormField label={'Client Name (Arabic)'}>
                <input type="text" value={formData.client_name_arabic} dir="rtl"
                  onChange={(e) => handleFieldChange('client_name_arabic', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              <FormField label={'Client Type'}>
                <select value={formData.client_type}
                  onChange={(e) => {
                    handleFieldChange('client_type', e.target.value);
                    if (e.target.value === 'individual') {
                      handleFieldChange('entity_type', '');
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="individual">{'Individual'}</option>
                  <option value="legal_entity">{'Legal Entity'}</option>
                </select>
              </FormField>

              {formData.client_type === 'legal_entity' && (
                <FormField label={'Entity Type'}>
                  <select value={formData.entity_type || ''}
                    onChange={(e) => handleFieldChange('entity_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{'Select'}...</option>
                    {entityTypes.map(et => (
                      <option key={et.code} value={et.code}>
                        {et.name_en}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField label={'Custom ID'}>
                <input type="text" value={formData.custom_id}
                  onChange={(e) => handleFieldChange('custom_id', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              {/* Registration Number & VAT - Only for legal entities (v46.52) */}
              {formData.client_type === 'legal_entity' && (
                <FormField label={'Registration Number'}>
                  <input type="text" value={formData.registration_number}
                    onChange={(e) => handleFieldChange('registration_number', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
              )}
              
              {formData.client_type === 'legal_entity' && (
                <FormField label={'VAT Number'}>
                  <input type="text" value={formData.vat_number}
                    onChange={(e) => handleFieldChange('vat_number', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md" />
                </FormField>
              )}
              
              <FormField label={'Main Contact'}>
                <input type="text" value={formData.main_contact}
                  onChange={(e) => handleFieldChange('main_contact', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              <FormField label={'Email'} error={errors.email}>
                <input type="email" value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={inputClass(errors.email)} />
              </FormField>
              
              <FormField label={'Phone'} error={errors.phone}>
                <input type="tel" value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={inputClass(errors.phone)} />
              </FormField>
              
              <FormField label={'Mobile'} error={errors.mobile}>
                <input type="tel" value={formData.mobile}
                  onChange={(e) => handleFieldChange('mobile', e.target.value)}
                  onBlur={() => handleBlur('mobile')}
                  className={inputClass(errors.mobile)} />
              </FormField>
              
              <FormField label={'Website'}>
                <input type="text" value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
              
              <FormField label={'Industry'}>
                <input type="text" value={formData.industry}
                  onChange={(e) => handleFieldChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>

              <FormField label={'Source'}>
                <input type="text" value={formData.source || ''}
                  onChange={(e) => handleFieldChange('source', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
            </div>
            
            <FormField label={'Address'}>
              <textarea value={formData.address || ''} rows="2"
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="w-full px-3 py-2 border rounded-md" />
            </FormField>
            
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { closeForm('client'); clearFormDirty(); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">
                {'Cancel'}
              </button>
              {!editingClient && !conflictChecked && (
                <button type="button" onClick={handleConflictCheck} disabled={checking}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center gap-2 disabled:bg-yellow-400">
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {checking ? 'Checking...' : 'Run Conflict Check'}
                </button>
              )}
              {(editingClient || conflictChecked) && (
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? ('Saving...') : 'Save'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default ClientForm;
