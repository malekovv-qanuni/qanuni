// ============================================
// APPOINTMENT FORM COMPONENT (extracted from App.js)
// Version: v42.0.7
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../components/common';

const AppointmentForm = React.memo(({ language, isRTL, editingAppointment, setEditingAppointment, setShowAppointmentForm, showToast, markFormDirty, clearFormDirty, refreshAppointments, clients, matters, lawyers, t }) => {
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
      case 'title': if (!value || !value.trim()) return t[language].required; break;
      case 'date': if (!value) return t[language].required; break;
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
      showToast(language === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
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
        ? (language === 'ar' ? 'تم تحديث الموعد بنجاح' : 'Appointment updated successfully')
        : (language === 'ar' ? 'تم إضافة الموعد بنجاح' : 'Appointment added successfully'));
      setShowAppointmentForm(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Error saving appointment:', error);
      showToast(language === 'ar' ? 'خطأ في حفظ الموعد' : 'Error saving appointment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingAppointment ? t[language].edit : t[language].addAppointment}</h2>
            <button onClick={() => { setShowAppointmentForm(false); setEditingAppointment(null); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].appointmentType}</label>
                <select value={formData.appointment_type}
                  onChange={(e) => handleFieldChange('appointment_type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="client_meeting">{t[language].clientMeeting}</option>
                  <option value="internal_meeting">{t[language].internalMeeting}</option>
                  <option value="call">{t[language].call}</option>
                  <option value="court_visit">{t[language].courtVisit}</option>
                  <option value="consultation">{t[language].consultation}</option>
                  <option value="personal">{t[language].personal}</option>
                </select>
              </div>
              <FormField label={t[language].title} required error={errors.title}>
                <input type="text" value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={inputClass(errors.title)} />
              </FormField>
              <FormField label={t[language].date} required error={errors.date}>
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
                  <span className="text-sm">{t[language].allDay}</span>
                </label>
              </div>
              {!formData.all_day && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].startTime}</label>
                    <input type="time" value={formData.start_time}
                      onChange={(e) => handleFieldChange('start_time', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].endTime}</label>
                    <input type="time" value={formData.end_time}
                      onChange={(e) => handleFieldChange('end_time', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].locationType}</label>
                <select value={formData.location_type}
                  onChange={(e) => handleFieldChange('location_type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="office">{t[language].office}</option>
                  <option value="external">{t[language].external}</option>
                  <option value="virtual">{t[language].virtual}</option>
                  <option value="court">{t[language].court}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].locationDetails}</label>
                <input type="text" value={formData.location_details}
                  onChange={(e) => setFormData({...formData, location_details: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              {formData.location_type === 'virtual' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{t[language].virtualLink}</label>
                  <input type="url" value={formData.virtual_link}
                    onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].client}</label>
                <select value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                <select value={formData.matter_id}
                  onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                  disabled={!formData.client_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">-- {t[language].select} --</option>
                  {matters.filter(m => m.client_id == formData.client_id).map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t[language].description}</label>
              <textarea value={formData.description} rows="2"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAppointmentForm(false); setEditingAppointment(null); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {t[language].save}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default AppointmentForm;
