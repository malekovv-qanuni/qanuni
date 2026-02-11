// ============================================
// DEADLINE FORM COMPONENT (extracted from App.js)
// Version: v46.54 - Enriched matter dropdown (case_number + court)
// ============================================
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FormField, LoadingButton } from '../common';
import { useUI } from '../../contexts';

const DeadlineForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshDeadlines, clients, matters, judgments}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingDeadline, formData: deadlineFormData, setFormData: setDeadlineFormData } = forms.deadline;
  const getInitialDeadlineData = () => {
    if (deadlineFormData) return deadlineFormData;
    if (editingDeadline) {
      return {
        ...editingDeadline,
        client_id: String(editingDeadline.client_id || matters.find(m => String(m.matter_id) === String(editingDeadline.matter_id))?.client_id || ''),
        matter_id: String(editingDeadline.matter_id || ''),
        judgment_id: String(editingDeadline.judgment_id || ''),
        reminder_days: String(editingDeadline.reminder_days ?? '7')
      };
    }
    return {
      client_id: '', matter_id: '', judgment_id: '', title: '', deadline_date: '', reminder_days: '7',
      priority: 'medium', status: 'pending', notes: ''
    };
  };
  
  // Local state only - no wrapper function
  const [formData, setFormData] = useState(getInitialDeadlineData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // Sync to parent via useEffect (not during render)
  useEffect(() => {
    setDeadlineFormData(formData);
  }, [formData, setDeadlineFormData]);

  // Filter matters by selected client
  // When editing, include the current matter even if not active (so it appears in dropdown)
  const filteredMatters = formData.client_id
    ? matters.filter(m => m.client_id == formData.client_id && (m.status === 'active' || (editingDeadline && String(m.matter_id) === String(formData.matter_id))))
    : [];

  // Filter judgments by selected matter (use loose comparison for ID type safety)
  const filteredJudgments = formData.matter_id
    ? judgments.filter(j => String(j.matter_id) === String(formData.matter_id) && j.status !== 'moved_to_hearing')
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return 'This field is required';
        break;
      case 'matter_id':
        if (!value) return 'This field is required';
        break;
      case 'title':
        if (!value || !value.trim()) return 'This field is required';
        break;
      case 'deadline_date':
        if (!value) return 'This field is required';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value) => {
    let updates = { [name]: value };
    
    // Reset dependent fields when parent changes
    if (name === 'client_id') {
      updates.matter_id = '';
      updates.judgment_id = '';
    } else if (name === 'matter_id') {
      updates.judgment_id = '';
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    markFormDirty();
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const newErrors = {};
    ['client_id', 'matter_id', 'title', 'deadline_date'].forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ client_id: true, matter_id: true, title: true, deadline_date: true });
    return Object.keys(newErrors).length === 0;
  };

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast('Please fix the errors', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        ...formData,
        reminder_days: parseInt(formData.reminder_days) || 7
      };
      
      // Check for deadline_id to determine if updating or creating
      let result;
      if (editingDeadline?.deadline_id) {
        result = await window.electronAPI.updateDeadline(data);
      } else {
        result = await window.electronAPI.addDeadline(data);
      }

      if (result && result.success === false) {
        showToast(result.error || 'Failed to save deadline', 'error');
        return;
      }

      await refreshDeadlines();
      showToast('Deadline saved successfully');
      clearFormDirty();
      closeForm('deadline');
    } catch (error) {
      console.error('Error saving deadline:', error);
      showToast('Error saving deadline', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingDeadline ? 'Edit' : 'Add Deadline'}</h2>
            <button onClick={() => { closeForm('deadline'); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client & Matter Selection (Required) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={'Client'} required error={errors.client_id}>
                <select value={formData.client_id}
                  onChange={(e) => handleFieldChange('client_id', e.target.value)}
                  onBlur={() => handleBlur('client_id')}
                  className={inputClass(errors.client_id)}>
                  <option value="">{'Select Client'}</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </FormField>
              
              <FormField label={'Matter'} required error={errors.matter_id}>
                <select value={formData.matter_id}
                  onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                  onBlur={() => handleBlur('matter_id')}
                  disabled={!formData.client_id}
                  className={`${inputClass(errors.matter_id)} disabled:bg-gray-100`}>
                  <option value="">{formData.client_id ? 'Select Matter' : 'Select client first'}</option>
                  {filteredMatters.map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' - ' + m.case_number : ''}${m.court_name ? ' - ' + m.court_name : ''}`}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Hide title field when coming from judgment - title is auto-generated */}
            {!editingDeadline?._fromJudgment && (
              <FormField label={'Deadline Title'} required error={errors.title}>
                <input type="text" value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  placeholder={'e.g., Appeal Deadline'}
                  className={inputClass(errors.title)} />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label={'Deadline Date'} required error={errors.deadline_date}>
                <input type="date" value={formData.deadline_date}
                  onChange={(e) => handleFieldChange('deadline_date', e.target.value)}
                  onBlur={() => handleBlur('deadline_date')}
                  className={inputClass(errors.deadline_date)} />
              </FormField>
              
              <FormField label={'Reminder Days'}>
                <input type="number" value={formData.reminder_days} min="0" max="90"
                  onChange={(e) => handleFieldChange('reminder_days', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={'Priority'}>
                <select value={formData.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="high">{'High'}</option>
                  <option value="medium">{'Medium'}</option>
                  <option value="low">{'Low'}</option>
                </select>
              </FormField>
              
              <FormField label={'Linked to Judgment'}>
                <select value={formData.judgment_id}
                  onChange={(e) => handleFieldChange('judgment_id', e.target.value)}
                  disabled={!formData.matter_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">-- {'Select'} ({'optional'}) --</option>
                  {filteredJudgments.map(j => (
                    <option key={j.judgment_id} value={j.judgment_id}>
                      {j.judgment_type} - {j.expected_date || j.actual_date || 'Pending'}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label={'Notes'}>
              <textarea value={formData.notes} rows="2"
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder={'Additional notes...'}
                className="w-full px-3 py-2 border rounded-md" />
              <p className="text-xs text-gray-400 mt-1">
                {'Supports Arabic / يدعم العربية'}
              </p>
            </FormField>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => { closeForm('deadline'); clearFormDirty(); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Cancel'}</button>
              <LoadingButton type="submit" loading={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {'Save'}
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default DeadlineForm;
