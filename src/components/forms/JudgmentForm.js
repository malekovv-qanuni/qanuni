// ============================================
// JUDGMENT FORM COMPONENT (extracted from App.js)
// Version: v46.54 - Enriched matter dropdown (case_number + court)
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../common';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';


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

const JudgmentForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshJudgments, refreshDeadlines, refreshHearings, clients, matters, hearings, hearingPurposes, onJudgmentAppealed}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingJudgment } = forms.judgment;
  const [formData, setFormData] = useState(editingJudgment ? {
    ...editingJudgment,
    client_id: matters.find(m => m.matter_id === editingJudgment.matter_id)?.client_id || '',
    // Preliminary decision workflow fields
    next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '',
    // Auto-create deadline checkbox
    create_appeal_deadline: false
  } : {
    client_id: '', matter_id: '', hearing_id: '', judgment_type: 'first_instance',
    expected_date: '', actual_date: '', reminder_days: '7',
    judgment_outcome: '', judgment_summary: '', amount_awarded: '',
    currency: 'USD', in_favor_of: '', appeal_possible: false,
    appeal_deadline: '', appealed: false, status: 'pending', notes: '',
    // Preliminary decision workflow fields
    next_hearing_date: '', next_hearing_time: '', next_hearing_purpose_id: '',
    // Auto-create deadline checkbox (default true for new judgments)
    create_appeal_deadline: true
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Filter matters by selected client
  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  // Filter hearings by selected matter
  const filteredHearings = formData.matter_id 
    ? hearings.filter(h => h.matter_id === formData.matter_id)
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return 'Client is required';
        break;
      case 'matter_id':
        if (!value) return 'Matter is required';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value, additionalUpdates = {}) => {
    let updates = { [name]: value, ...additionalUpdates };
    
    // Reset matter when client changes
    if (name === 'client_id') {
      updates.matter_id = '';
      updates.hearing_id = '';
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    markFormDirty && markFormDirty();
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  // Handle status change - sync legacy fields automatically
  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    // Sync legacy 'appealed' field when status is set to 'appealed'
    if (newStatus === 'appealed') {
      updates.appealed = true;
    }
    // If appeal_deadline is set, appeal is possible
    if (formData.appeal_deadline) {
      updates.appeal_possible = true;
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateAll = () => {
    const fieldsToValidate = ['client_id', 'matter_id'];
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
      const judgmentData = { ...formData };
      const clientId = judgmentData.client_id;
      delete judgmentData.client_id;
      
      // Remove next hearing fields and deadline checkbox from judgment data
      const nextHearingDate = judgmentData.next_hearing_date;
      const nextHearingTime = judgmentData.next_hearing_time;
      const nextHearingPurposeId = judgmentData.next_hearing_purpose_id;
      const createAppealDeadline = judgmentData.create_appeal_deadline;
      const appealDeadlineDate = judgmentData.appeal_deadline;
      delete judgmentData.next_hearing_date;
      delete judgmentData.next_hearing_time;
      delete judgmentData.next_hearing_purpose_id;
      delete judgmentData.create_appeal_deadline;
      
      // Auto-sync: If appeal_deadline is set, appeal_possible = true
      if (appealDeadlineDate) {
        judgmentData.appeal_possible = true;
      }
      
      // Auto-sync: If status is appealed, set appealed = true
      if (judgmentData.status === 'appealed') {
        judgmentData.appealed = true;
      }
      
      // TRIGGER: When outcome is "not_final" and next hearing date is set
      if (formData.judgment_outcome === 'not_final' && nextHearingDate) {
        judgmentData.status = 'moved_to_hearing';
      }
      
      let judgmentId;
      if (editingJudgment) {
        const updateResult = await apiClient.updateJudgment({ ...judgmentData, judgment_id: editingJudgment.judgment_id });
        if (updateResult && updateResult.success === false) {
          showToast(updateResult.error || 'Failed to update judgment', 'error');
          return;
        }
        judgmentId = editingJudgment.judgment_id;
      } else {
        const result = await apiClient.addJudgment(judgmentData);
        if (!result || result.success === false) {
          showToast(result?.error || 'Failed to add judgment', 'error');
          return;
        }
        judgmentId = result.judgment_id;
      }
      
      // Create next hearing if "not_final" with date
      if (formData.judgment_outcome === 'not_final' && nextHearingDate) {
        const nextHearingData = {
          matter_id: formData.matter_id,
          hearing_date: nextHearingDate,
          hearing_time: nextHearingTime || '',
          purpose_id: nextHearingPurposeId || '',
          purpose_custom: '',
          court_name: '',
          judge: '',
          notes: 'Hearing created from non-final judgment'
        };
        await apiClient.addHearing(nextHearingData);
      }
      
      // Auto-create appeal deadline if checkbox is checked and appeal_deadline date is set
      if (createAppealDeadline && appealDeadlineDate && !editingJudgment) {
        const deadlineData = {
          client_id: clientId,
          matter_id: formData.matter_id,
          judgment_id: judgmentId,
          title: 'Appeal Deadline',
          deadline_date: appealDeadlineDate,
          reminder_days: 7,
          priority: 'high',
          status: 'pending',
          notes: 'Deadline auto-created from judgment'
        };
        const dlResult = await apiClient.addDeadline(deadlineData);
        if (dlResult && dlResult.success === false) {
          showToast('Judgment saved but deadline creation failed: ' + (dlResult.error || ''), 'warning');
        }
      }
      
      clearFormDirty && clearFormDirty();
      await Promise.all([refreshJudgments(), refreshDeadlines?.(), refreshHearings?.()].filter(Boolean));
      
      showToast(editingJudgment 
        ? ('Judgment updated successfully')
        : ('Judgment added successfully'));
      
      // If status is "appealed", trigger appeal matter creation dialog
      if (formData.status === 'appealed' && onJudgmentAppealed) {
        onJudgmentAppealed({
          judgment_id: judgmentId,
          matter_id: formData.matter_id,
          client_id: clientId
        });
      }
      
      closeForm('judgment');
    } catch (error) {
      console.error('Error saving judgment:', error);
      showToast('Error saving judgment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingJudgment ? 'Edit' : 'Add Judgment'}</h2>
            <button onClick={() => { closeForm('judgment'); clearFormDirty && clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client & Matter Selection (Required) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={'Client'} required error={errors.client_id}>
                <select value={formData.client_id || ''}
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
                <select value={formData.matter_id || ''}
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

            {/* Source Hearing - Read-only display when auto-linked */}
            {formData.hearing_id && (() => {
              const sourceHearing = hearings.find(h => h.hearing_id === formData.hearing_id);
              if (!sourceHearing) return null;
              const hearingDate = sourceHearing.hearing_date 
                ? new Date(sourceHearing.hearing_date).toLocaleDateString('en-GB')
                : '';
              const courtName = (sourceHearing.court_name || '');
              return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">
                      {'Source Hearing:'}
                    </span>
                    <span className="font-medium text-gray-700">
                      {hearingDate}{courtName ? ` - ${courtName}` : ''}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Judgment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{'Judgment Type'}</label>
                <select value={formData.judgment_type || 'first_instance'}
                  onChange={(e) => setFormData({...formData, judgment_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="first_instance">{'First Instance'}</option>
                  <option value="appeal">{'Appeal'}</option>
                  <option value="cassation">{'Cassation'}</option>
                  <option value="arbitral_award">{'Arbitral Award'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Status'}</label>
                <select value={formData.status || 'pending'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="pending">{'Pending'}</option>
                  <option value="issued">{'Issued'}</option>
                  <option value="appealed">{'Appealed'}</option>
                  <option value="final">{'Final'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Judgment Date'}</label>
                <input type="date" value={formData.expected_date || ''}
                  onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
                <WeekendWarning show={isWeekendDate(formData.expected_date)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Reminder Days'}</label>
                <input type="number" value={formData.reminder_days || ''}
                  onChange={(e) => setFormData({...formData, reminder_days: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Outcome'}</label>
                <select value={formData.judgment_outcome || ''}
                  onChange={(e) => setFormData({...formData, judgment_outcome: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  <option value="won">{'Won'}</option>
                  <option value="lost">{'Lost'}</option>
                  <option value="partial_win">{'Partial Win'}</option>
                  <option value="not_final">{'Not Final'}</option>
                  <option value="settled">{'Settled'}</option>
                  <option value="dismissed">{'Dismissed'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'In Favor Of'}</label>
                <select value={formData.in_favor_of || ''}
                  onChange={(e) => setFormData({...formData, in_favor_of: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  <option value="our_client">{'Our Client'}</option>
                  <option value="opposing">{'Opposing'}</option>
                  <option value="partial">{'Partial'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Appeal Deadline'}</label>
                <input type="date" value={formData.appeal_deadline || ''}
                  onChange={(e) => setFormData({...formData, appeal_deadline: e.target.value, appeal_possible: !!e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            
            {/* Auto-create appeal deadline checkbox */}
            {formData.appeal_deadline && !editingJudgment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.create_appeal_deadline}
                    onChange={(e) => setFormData({...formData, create_appeal_deadline: e.target.checked})}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    {'Create Appeal Deadline'}
                  </span>
                </label>
                {formData.create_appeal_deadline && (
                  <p className="text-xs text-blue-600 mt-1 ml-6">
✓ {'A deadline will be created in the Deadlines list'}
                  </p>
                )}
              </div>
            )}

            {/* Appeal workflow hint - show when status is "appealed" */}
            {formData.status === 'appealed' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  ⚖️ {'On save, you will be asked to create a new hearing for the next session.'}
                </p>
              </div>
            )}

            {/* Not Final Workflow - Schedule Next Hearing */}
            {formData.judgment_outcome === 'not_final' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">
                  📋 {'Not Final - Schedule Next Hearing'}
                </h4>
                <p className="text-xs text-indigo-600 mb-3">
                  {'The judgment is not final. You can schedule a new hearing and this record will move to the Hearings list.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Next Hearing Date'}</label>
                    <input type="date" value={formData.next_hearing_date || ''}
                      onChange={(e) => setFormData({...formData, next_hearing_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                    <WeekendWarning show={isWeekendDate(formData.next_hearing_date)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Time'}</label>
                    <input type="text" value={formData.next_hearing_time || ''}
                      onChange={(e) => setFormData({...formData, next_hearing_time: e.target.value})}
                      placeholder={'e.g. 10:30 AM'}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Purpose'}</label>
                    <select value={formData.next_hearing_purpose_id || ''}
                      onChange={(e) => setFormData({...formData, next_hearing_purpose_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">-- {'Select'} --</option>
                      {hearingPurposes.map(p => (
                        <option key={p.purpose_id} value={p.purpose_id}>
                          {p.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.next_hearing_date && (
                  <p className="text-xs text-green-600 mt-2">
✓ {'A new hearing will be created and this judgment will be hidden from the list'}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{'Summary'}</label>
              <textarea value={formData.judgment_summary || ''} rows="3"
                onChange={(e) => setFormData({...formData, judgment_summary: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
              <p className="text-xs text-gray-400 mt-1">
                {'Supports Arabic / يدعم العربية'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('judgment'); clearFormDirty && clearFormDirty(); }}
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

export default JudgmentForm;
