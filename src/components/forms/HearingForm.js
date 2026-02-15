import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FormField from '../common/FormField';
import { useUI, useDialog } from '../../contexts';
import apiClient from '../../api-client';


/**
 * HearingForm Component
 * Form for adding/editing hearings with support for:
 * - Client/Matter selection
 * - Court type, region, purpose (with custom options)
 * - Judgment Pronouncement special handling
 * - Weekend date warning (v46.38)
 * 
 * Extracted from App.js v42.0.6
 * v46.38: Added weekend date alert
 */

// Helper function to check if date is a weekend
const isWeekendDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Weekend warning component
const WeekendWarning = ({ show }) => {
  if (!show) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-amber-600 text-xs">
      <span>⚠️</span>
      <span>
        {'This date is a Saturday/Sunday - courts are typically closed'}
      </span>
    </div>
  );
};

const HearingForm = React.memo(({
  showToast,
  markFormDirty,
  clearFormDirty,
  refreshHearings,
  refreshJudgments,
  clients,
  matters,
  courtTypes,
  regions,
  hearingPurposes,
  lawyers,
  judgments
}) => {
  const { forms, closeForm } = useUI();
  const { selectedMatter } = useDialog('selectedMatter');
  const { editing: editingHearing, formData: hearingFormData, setFormData: setHearingFormData } = forms.hearing;
  const defaultFormData = {
    client_id: selectedMatter ? matters.find(m => m.matter_id === selectedMatter.matter_id)?.client_id : '',
    matter_id: selectedMatter?.matter_id || '', hearing_date: '', hearing_time: '',
    end_time: '', court_type_id: '', court_type_custom: '', court_region_id: '', region_custom: '', 
    judge: '', purpose_id: '', purpose_custom: '', outcome: '', outcome_notes: '', notes: '',
    // Judgment fields (when outcome is taken_for_judgment)
    expected_judgment_date: '', reminder_days: '7', create_pronouncement_hearing: true,
    // Judgment Pronouncement fields (when purpose is Judgment Pronouncement)
    judgment_date: '', // Future date when judgment will be pronounced
    linked_judgment_id: '', judgment_outcome: '', judgment_amount: '', judgment_in_favor: '',
    // Adjourned workflow fields (when outcome is adjourned)
    next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '', 
    create_followup_task: false, followup_task_title: '', followup_task_due_date: ''
  };
  
  // Use App-level state to persist across re-renders, fall back to defaults
  const getInitialData = () => {
    if (hearingFormData) return hearingFormData;
    if (editingHearing) return {...defaultFormData, ...editingHearing};
    return defaultFormData;
  };
  
  const [formData, setFormData] = useState(getInitialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Sync local state to App-level state (for form persistence)
  useEffect(() => {
    setHearingFormData(formData);
  }, [formData, setHearingFormData]);

  // Inherit court_type and region from selected matter
  useEffect(() => {
    if (formData.matter_id && !editingHearing) {
      const selectedMatterData = matters.find(m => m.matter_id == formData.matter_id);
      if (selectedMatterData) {
        setFormData(prev => ({
          ...prev,
          court_type_id: selectedMatterData.court_type_id || prev.court_type_id,
          court_region_id: selectedMatterData.court_region_id || prev.court_region_id
        }));
      }
    }
  }, [formData.matter_id, matters, editingHearing]);

  // Filter matters by selected client
  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  // Check if client is selected but has no matters
  const noMattersForClient = formData.client_id && filteredMatters.length === 0;

  // Check if "Other" purpose is selected
  const isOtherPurpose = formData.purpose_id && 
    hearingPurposes.find(p => p.purpose_id == formData.purpose_id)?.name_en === 'Other';

  // Check if "Judgment Pronouncement" purpose is selected (case-insensitive)
  const selectedPurpose = hearingPurposes.find(p => p.purpose_id == formData.purpose_id);
  const isJudgmentPronouncement = formData.purpose_id && 
    selectedPurpose?.name_en?.toLowerCase().trim() === 'judgment pronouncement';

  // Get pending judgments for this matter
  const pendingJudgments = formData.matter_id 
    ? judgments.filter(j => j.matter_id === formData.matter_id && j.status === 'pending')
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id': if (!value) return 'Please select an option'; break;
      case 'matter_id': if (!value) return 'Please select an option'; break;
      case 'hearing_date': if (!value) return 'This field is required'; break;
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
    ['client_id', 'matter_id', 'hearing_date'].forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ client_id: true, matter_id: true, hearing_date: true });
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
      const hearingData = {
        ...formData,
        court_type_id: formData.court_type_id === 'custom' ? null : formData.court_type_id,
        court_region_id: formData.court_region_id === 'custom' ? null : formData.court_region_id,
      };
      
      let hearingId;
      if (editingHearing) {
        const updateResult = await apiClient.updateHearing(hearingData);
        if (updateResult && updateResult.success === false) {
          showToast(updateResult.error || 'Failed to update hearing', 'error');
          return;
        }
        hearingId = editingHearing.hearing_id;
      } else {
        const result = await apiClient.addHearing(hearingData);
        if (!result || result.success === false) {
          showToast(result?.error || 'Failed to add hearing', 'error');
          return;
        }
        hearingId = result.hearing_id;
      }
      
      // TRIGGER: When purpose is "Judgment Pronouncement" - auto create pending judgment
      // Works for both add and edit (in case user changes purpose to Judgment Pronouncement)
      if (isJudgmentPronouncement && formData.judgment_date) {
        // Check if judgment already exists for this hearing
        const existingJudgment = judgments.find(j => j.hearing_id == hearingId);
        if (!existingJudgment) {
          // Create pending judgment linked to this hearing
          const newJudgment = await apiClient.addJudgment({
            matter_id: formData.matter_id,
            hearing_id: hearingId,
            judgment_type: 'first_instance',
            expected_date: formData.judgment_date,
            status: 'pending'
          });
        }
      }
      
      clearFormDirty();
      await Promise.all([refreshHearings(), refreshJudgments()]);
      showToast(editingHearing
        ? ('Hearing updated successfully')
        : ('Hearing added successfully'));
      closeForm('hearing');
    } catch (error) {
      console.error('Error saving hearing:', error);
      showToast('Error saving hearing', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingHearing ? 'Edit' : 'Add Hearing'}</h2>
            <button onClick={() => { closeForm('hearing'); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Selection First */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Client'} <span className="text-red-500">*</span>
                </label>
                <select value={formData.client_id}
                  onChange={(e) => setFormData(prev => ({...prev, client_id: e.target.value, matter_id: ''}))}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">{'Select Client'}</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
                {errors.client_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.client_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Matter'} <span className="text-red-500">*</span>
                </label>
                <select value={formData.matter_id}
                  onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                  disabled={!formData.client_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">{formData.client_id ? 'Select Matter' : 'Select client first'}</option>
                  {filteredMatters.map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}</option>
                  ))}
                </select>
                {errors.matter_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.matter_id}</p>
                )}
              </div>
            </div>

            {/* Warning when client has no matters */}
            {noMattersForClient && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ {'This client has no matters. Please add a matter first from the Matters section.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label={'Hearing Date'} required error={errors.hearing_date}>
                <input type="date" value={formData.hearing_date}
                  onChange={(e) => handleFieldChange('hearing_date', e.target.value)}
                  onBlur={() => handleBlur('hearing_date')}
                  className={inputClass(errors.hearing_date)} />
                <WeekendWarning show={isWeekendDate(formData.hearing_date)} />
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{'Time'}</label>
                <input type="text" value={formData.hearing_time || ''}
                  onChange={(e) => handleFieldChange('hearing_time', e.target.value)}
                  placeholder={'e.g. 10:30 AM'}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'End Time'}</label>
                <input type="text" value={formData.end_time || ''}
                  onChange={(e) => handleFieldChange('end_time', e.target.value)}
                  placeholder={'e.g. 11:30 AM'}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Court Type with Custom Option */}
              <div>
                <label className="block text-sm font-medium mb-1">{'Court Type'}</label>
                <select value={formData.court_type_id}
                  onChange={(e) => handleFieldChange('court_type_id', e.target.value)}
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
                <select value={formData.court_region_id}
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

              {/* Purpose with Custom Option */}
              <div>
                <label className="block text-sm font-medium mb-1">{'Purpose'}</label>
                <select value={formData.purpose_id}
                  onChange={(e) => setFormData({...formData, purpose_id: e.target.value, purpose_custom: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  {hearingPurposes.map(p => (
                    <option key={p.purpose_id} value={p.purpose_id}>
                      {p.name_en}
                    </option>
                  ))}
                </select>
              </div>
              {isOtherPurpose && (
                <div>
                  <label className="block text-sm font-medium mb-1">{'Custom Purpose'} *</label>
                  <input type="text" required value={formData.purpose_custom}
                    onChange={(e) => setFormData({...formData, purpose_custom: e.target.value})}
                    placeholder={'Enter purpose...'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">{'Judge'}</label>
                <input type="text" value={formData.judge}
                  onChange={(e) => setFormData({...formData, judge: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>

            {/* Info message when Purpose is Judgment Pronouncement */}
            {isJudgmentPronouncement && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  ⚠️ {'Enter the judgment pronouncement date. This record will appear in the Judgments list instead of the Hearings list.'}
                </p>
              </div>
            )}

            {/* Judgment Date field - only shows when purpose is Judgment Pronouncement */}
            {isJudgmentPronouncement && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Judgment Date'} *
                </label>
                <input type="date" required
                  value={formData.judgment_date || ''}
                  onChange={(e) => setFormData({...formData, judgment_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
                <WeekendWarning show={isWeekendDate(formData.judgment_date)} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{'Notes'}</label>
              <textarea value={formData.notes} rows="3"
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('hearing'); clearFormDirty(); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Cancel'}</button>
              <button type="submit" 
                disabled={noMattersForClient}
                className={`px-4 py-2 rounded-md ${noMattersForClient 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default HearingForm;
