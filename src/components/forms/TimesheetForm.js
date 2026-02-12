// ============================================
// TIMESHEET FORM COMPONENT (extracted from App.js)
// Version: v46.54 - Enriched matter dropdown (case_number + court)
// ============================================
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../common';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

const TimesheetForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshTimesheets, clients, matters, lawyers}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingTimesheet, formData: timesheetFormData, setFormData: setTimesheetFormData } = forms.timesheet;
  const defaultFormData = {
    date: new Date().toISOString().split('T')[0], lawyer_id: '',
    client_id: '', matter_id: '', minutes: '', narrative: '',
    billable: true, rate_per_hour: '150'
  };
  
  const getInitialData = () => {
    if (timesheetFormData) return timesheetFormData;
    if (editingTimesheet) return {...defaultFormData, ...editingTimesheet};
    return defaultFormData;
  };
  
  // Local state only - no wrapper function
  const [formData, setFormData] = useState(getInitialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Sync to parent via useEffect (not during render)
  useEffect(() => {
    setTimesheetFormData(formData);
  }, [formData, setTimesheetFormData]);

  const validateField = (name, value) => {
    switch (name) {
      case 'lawyer_id': if (!value) return 'Please select an option'; break;
      case 'client_id': if (!value) return 'Please select an option'; break;
      case 'date': if (!value) return 'This field is required'; break;
      case 'minutes': if (!value || parseInt(value) < 1) return 'Must be greater than 0'; break;
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
    ['lawyer_id', 'client_id', 'date', 'minutes'].forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ lawyer_id: true, client_id: true, date: true, minutes: true });
    return Object.keys(newErrors).length === 0;
  };

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  // Auto-populate rate when lawyer selected
  const handleLawyerChange = (lawyerId) => {
    const lawyer = lawyers.find(l => l.lawyer_id == lawyerId);
    setFormData(prev => ({
      ...prev, 
      lawyer_id: lawyerId,
      rate_per_hour: lawyer?.hourly_rate || prev.rate_per_hour
    }));
    markFormDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast('Please fix the errors', 'error');
      return;
    }
    try {
      const data = {
        ...formData,
        minutes: parseInt(formData.minutes),
        rate_per_hour: parseFloat(formData.rate_per_hour) || 0
      };

      let result;
      if (editingTimesheet) {
        result = await apiClient.updateTimesheet(data);
      } else {
        result = await apiClient.addTimesheet(data);
      }

      // Check if save actually succeeded
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to save timesheet';
        showToast(errorMsg, 'error');
        return;
      }

      clearFormDirty();
      await refreshTimesheets();
      showToast(editingTimesheet
        ? ('Timesheet updated successfully')
        : ('Timesheet added successfully'));
      closeForm('timesheet');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      showToast('Error saving timesheet', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingTimesheet ? 'Edit' : 'Add Timesheet'}</h2>
            <button onClick={() => { closeForm('timesheet'); clearFormDirty(); }} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={'Date'} required error={errors.date}>
                <input type="date" value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  onBlur={() => handleBlur('date')}
                  className={inputClass(errors.date)} />
              </FormField>
              <FormField label={'Lawyer'} required error={errors.lawyer_id}>
                <select value={formData.lawyer_id}
                  onChange={(e) => handleLawyerChange(e.target.value)}
                  onBlur={() => handleBlur('lawyer_id')}
                  className={inputClass(errors.lawyer_id)}>
                  <option value="">-- {'Select'} --</option>
                  {lawyers.map(lawyer => (
                    <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                      {lawyer.full_name}
                      {lawyer.initials ? ` (${lawyer.initials})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={'Client'} required error={errors.client_id}>
                <select value={formData.client_id}
                  onChange={(e) => { 
                    const newClientId = e.target.value;
                    setFormData(prev => ({...prev, client_id: newClientId, matter_id: ''}));
                    markFormDirty();
                    if (touched.client_id) setErrors(prev => ({ ...prev, client_id: validateField('client_id', newClientId) }));
                  }}
                  onBlur={() => handleBlur('client_id')}
                  className={inputClass(errors.client_id)}>
                  <option value="">{'Select Client'}</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{'Matter'}</label>
                <select value={formData.matter_id}
                  onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                  disabled={!formData.client_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">{formData.client_id ? 'Select Matter' : 'Select client first'}</option>
                  {matters.filter(m => m.client_id == formData.client_id).map(m => (
                    <option key={m.matter_id} value={m.matter_id}>
                      {`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ` - ${m.case_number}` : ''}${m.court_name ? ` - ${m.court_name}` : ''}`}
                    </option>
                  ))}
                </select>
              </div>
              <FormField label={'Minutes'} required error={errors.minutes}>
                <input type="number" value={formData.minutes} min="1"
                  onChange={(e) => handleFieldChange('minutes', e.target.value)}
                  onBlur={() => handleBlur('minutes')}
                  className={inputClass(errors.minutes)} />
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{'Rate/Hour'}</label>
                <input type="number" value={formData.rate_per_hour}
                  onChange={(e) => handleFieldChange('rate_per_hour', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.billable}
                    onChange={(e) => handleFieldChange('billable', e.target.checked)}
                    className="w-4 h-4" />
                  <span className="font-medium">{'Billable'}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{'Narrative'}</label>
              <textarea value={formData.narrative} rows="3"
                onChange={(e) => handleFieldChange('narrative', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder={'Describe the work performed...'} />
              <p className="text-xs text-gray-400 mt-1">
                {'Supports Arabic / يدعم العربية'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('timesheet'); clearFormDirty(); }}
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

export default TimesheetForm;
