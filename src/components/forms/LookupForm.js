// ============================================
// LOOKUP FORM COMPONENT (extracted from App.js)
// Version: v46.33 - Fixed Arabic encoding + icons
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../common';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

const LookupForm = React.memo(({ showToast, refreshLookups }) => {
  const { forms, closeForm } = useUI();
  const { editing: editingLookup, currentType: lookupType } = forms.lookup;
  const isLawyer = lookupType === 'lawyers';
  const isTaskType = lookupType === 'taskTypes';
  
  const [formData, setFormData] = useState(editingLookup || {
    name_en: '', name_ar: '', full_name: '', full_name_arabic: '',
    initials: '', hourly_rate: '', icon: '📋', active: 1
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case 'name_en':
        if (!isLawyer && (!value || !value.trim())) return 'This field is required';
        break;
      case 'full_name':
        if (isLawyer && (!value || !value.trim())) return 'This field is required';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const fieldsToValidate = isLawyer ? ['full_name'] : ['name_en'];
    const newErrors = {};
    fieldsToValidate.forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return Object.keys(newErrors).length === 0;
  };

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast('Please fix the errors', 'error');
      return;
    }
    try {
      let result;
      if (editingLookup) {
        result = await apiClient.updateLookupItem(lookupType, formData);
      } else {
        result = await apiClient.addLookupItem(lookupType, formData);
      }
      if (!result || !result.success) {
        showToast(result?.error || 'Failed to save lookup item', 'error');
        return;
      }
      await refreshLookups();
      showToast(editingLookup 
        ? ('Item updated successfully')
        : ('Item added successfully'));
      closeForm('lookup');
    } catch (error) {
      console.error('Error saving lookup item:', error);
      showToast('Error saving: ' + error.message, 'error');
    }
  };

  const lookupTabs = [
    { id: 'lawyers', label: 'Lawyers' },
    { id: 'courtTypes', label: 'Court Types' },
    { id: 'regions', label: 'Regions' },
    { id: 'hearingPurposes', label: 'Hearing Purposes' },
    { id: 'taskTypes', label: 'Task Types' },
    { id: 'expenseCategories', label: 'Expense Categories' },
  ];
  
  const currentTab = lookupTabs.find(tab => tab.id === lookupType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {editingLookup ? 'Edit' : 'Add New'} - {currentTab?.label}
            </h2>
            <button onClick={() => closeForm('lookup')}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLawyer ? (
              <>
                <FormField label={'Name (English)'} required error={errors.full_name}>
                  <input type="text" value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    onBlur={() => handleBlur('full_name')}
                    className={inputClass(errors.full_name)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{'Name (Arabic)'}</label>
                  <input type="text" value={formData.full_name_arabic}
                    onChange={(e) => setFormData({...formData, full_name_arabic: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Initials'}</label>
                    <input type="text" value={formData.initials} maxLength="5"
                      onChange={(e) => setFormData({...formData, initials: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Hourly Rate'}</label>
                    <input type="number" value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <FormField label={'Name (English)'} required error={errors.name_en}>
                  <input type="text" value={formData.name_en}
                    onChange={(e) => handleFieldChange('name_en', e.target.value)}
                    onBlur={() => handleBlur('name_en')}
                    className={inputClass(errors.name_en)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{'Name (Arabic)'}</label>
                  <input type="text" value={formData.name_ar}
                    onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                {isTaskType && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Icon'}</label>
                    <input type="text" value={formData.icon} maxLength="4"
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-2xl"
                      placeholder="📋" />
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => closeForm('lookup')}
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

export default LookupForm;
