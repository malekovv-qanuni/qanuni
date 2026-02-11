// ============================================
// APPOINTMENT FORM COMPONENT (extracted from App.js)
// Version: v46.54 - Enriched matter dropdown (case_number + court)
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../common';
import { useUI } from '../../contexts';


const AppointmentForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshAppointments, clients, matters, lawyers}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingAppointment } = forms.appointment;
  const [formData, setFormData] = useState(editingAppointment || {
    appointment_type: 'client_meeting', title: '', description: '',
    date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00',
    all_day: false, location_type: 'office', location_details: '', virtual_link: '',
    client_id: '', matter_id: '', billable: false, notes: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case 'title': if (!value || !value.trim()) return 'This field is required'; break;
      case 'date': if (!value) return 'This field is required'; break;
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
    ['title', 'date'].forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ title: true, date: true });
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
      if (editingAppointment) {
        await window.electronAPI.updateAppointment({ ...formData, appointment_id: editingAppointment.appointment_id });
      } else {
        await window.electronAPI.addAppointment(formData);
      }
      clearFormDirty();
      await refreshAppointments();
      showToast(editingAppointment
        ? ('Appointment updated successfully')
        : ('Appointment added successfully'));
      closeForm('appointment');
    } catch (error) {
      console.error('Error saving appointment:', error);
      showToast('Error saving appointment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingAppointment ? 'Edit' : 'Add Appointment'}</h2>
            <button onClick={() => { closeForm('appointment'); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{'Type'}</label>
                <select value={formData.appointment_type}
                  onChange={(e) => handleFieldChange('appointment_type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="client_meeting">{'Client Meeting'}</option>
                  <option value="internal_meeting">{'Internal Meeting'}</option>
                  <option value="call">{'Call'}</option>
                  <option value="court_visit">{'Court Visit'}</option>
                  <option value="consultation">{'Consultation'}</option>
                  <option value="personal">{'Personal'}</option>
                </select>
              </div>
              <FormField label={'Title'} required error={errors.title}>
                <input type="text" value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={inputClass(errors.title)} />
              </FormField>
              <FormField label={'DATE'} required error={errors.date}>
                <input type="date" value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  onBlur={() => handleBlur('date')}
                  className={inputClass(errors.date)} />
              </FormField>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.all_day}
                    onChange={(e) => handleFieldChange('all_day', e.target.checked)}
                    className="w-4 h-4" />
                  <span className="text-sm">{'All Day'}</span>
                </label>
              </div>
              {!formData.all_day && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Start Time'}</label>
                    <input type="text" value={formData.start_time || ''}
                      onChange={(e) => handleFieldChange('start_time', e.target.value)}
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
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{'Location Type'}</label>
                <select value={formData.location_type}
                  onChange={(e) => handleFieldChange('location_type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="office">{'Office'}</option>
                  <option value="external">{'External'}</option>
                  <option value="virtual">{'Virtual'}</option>
                  <option value="court">{'Court'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Location Details'}</label>
                <input type="text" value={formData.location_details}
                  onChange={(e) => setFormData({...formData, location_details: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              {formData.location_type === 'virtual' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{'Virtual Link'}</label>
                  <input type="url" value={formData.virtual_link}
                    onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{'Client'}</label>
                <select value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {'Select'} --</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Matter'}</label>
                <select value={formData.matter_id}
                  onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                  disabled={!formData.client_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">-- {'Select'} --</option>
                  {matters.filter(m => m.client_id == formData.client_id).map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' - ' + m.case_number : ''}${m.court_name ? ' - ' + m.court_name : ''}`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{'Description'}</label>
              <textarea value={formData.description} rows="2"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
              <p className="text-xs text-gray-400 mt-1">
                {'Supports Arabic / يدعم العربية'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('appointment'); clearFormDirty(); }}
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

export default AppointmentForm;
