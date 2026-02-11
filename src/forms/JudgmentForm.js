// ============================================
// JUDGMENT FORM COMPONENT (extracted from App.js)
// Version: v42.0.7
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';

const JudgmentForm = React.memo(({ language, isRTL, editingJudgment, setEditingJudgment, setShowJudgmentForm, showToast, markFormDirty, clearFormDirty, refreshJudgments, refreshDeadlines, refreshHearings, clients, matters, hearings, hearingPurposes, t }) => {
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

  // Filter hearings by selected matter (only those with outcome "taken_for_judgment")
  const filteredHearings = formData.matter_id 
    ? hearings.filter(h => h.matter_id === formData.matter_id)
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return language === 'ar' ? 'العميل مطلوب' : 'Client is required';
        return '';
      case 'matter_id':
        if (!value) return language === 'ar' ? 'القضية مطلوبة' : 'Matter is required';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (name, value, additionalUpdates = {}) => {
    setFormData(prev => ({ ...prev, [name]: value, ...additionalUpdates }));
    markFormDirty && markFormDirty();
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const fieldsToValidate = ['client_id', 'matter_id'];
    const newErrors = {};
    let isValid = true;
    fieldsToValidate.forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) { newErrors[name] = error; isValid = false; }
    });
    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    try {
      const judgmentData = { ...formData };
      const clientId = judgmentData.client_id; // Store before deleting
      delete judgmentData.client_id; // Remove client_id before sending
      
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
      
      // TRIGGER: When outcome is "not_final" and next hearing date is set
      // Mark judgment to be hidden from list (moved to hearings)
      if (formData.judgment_outcome === 'not_final' && nextHearingDate) {
        judgmentData.status = 'moved_to_hearing';
      }
      
      let judgmentId;
      if (editingJudgment) {
        await window.electronAPI.updateJudgment({ ...judgmentData, judgment_id: editingJudgment.judgment_id });
        judgmentId = editingJudgment.judgment_id;
      } else {
        const result = await window.electronAPI.addJudgment(judgmentData);
        judgmentId = result?.lastInsertRowid || result?.judgment_id;
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
          notes: language === 'ar' 
            ? 'جلسة ناتجة عن حكم غير نهائي' 
            : 'Hearing created from non-final judgment'
        };
        await window.electronAPI.addHearing(nextHearingData);
      }
      
      // Auto-create appeal deadline if checkbox is checked and appeal_deadline date is set
      if (createAppealDeadline && appealDeadlineDate && !editingJudgment) {
        const deadlineData = {
          client_id: clientId,
          matter_id: formData.matter_id,
          judgment_id: judgmentId,
          title: language === 'ar' ? 'موعد الاستئناف' : 'Appeal Deadline',
          deadline_date: appealDeadlineDate,
          reminder_days: 7,
          priority: 'high',
          status: 'pending',
          notes: language === 'ar' 
            ? 'موعد استئناف تم إنشاؤه تلقائياً من الحكم'
            : 'Appeal deadline auto-created from judgment'
        };
        await window.electronAPI.addDeadline(deadlineData);
        await refreshDeadlines();
      }
      
      await Promise.all([refreshJudgments(), refreshHearings()]);
      showToast(editingJudgment 
        ? (language === 'ar' ? 'تم تحديث الحكم بنجاح' : 'Judgment updated successfully')
        : (createAppealDeadline && appealDeadlineDate 
            ? (language === 'ar' ? 'تم إضافة الحكم وموعد الاستئناف' : 'Judgment and appeal deadline added')
            : (language === 'ar' ? 'تم إضافة الحكم بنجاح' : 'Judgment added successfully')));
      setShowJudgmentForm(false);
      setEditingJudgment(null);
    } catch (error) {
      console.error('Error saving judgment:', error);
      showToast(language === 'ar' ? 'خطأ في حفظ الحكم' : 'Error saving judgment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingJudgment ? t[language].edit : t[language].addJudgment}</h2>
            <button onClick={() => { setShowJudgmentForm(false); setEditingJudgment(null); }}
              className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client & Matter Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                <select value={formData.client_id}
                  onChange={(e) => handleChange('client_id', e.target.value, {matter_id: '', hearing_id: ''})}
                  onBlur={() => handleBlur('client_id')}
                  className={`w-full px-3 py-2 border rounded-md ${errors.client_id && touched.client_id ? 'border-red-500' : ''}`}>
                  <option value="">{t[language].selectClient}</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
                {errors.client_id && touched.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].matter} *</label>
                <select value={formData.matter_id}
                  onChange={(e) => handleChange('matter_id', e.target.value, {hearing_id: ''})}
                  onBlur={() => handleBlur('matter_id')}
                  disabled={!formData.client_id}
                  className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 ${errors.matter_id && touched.matter_id ? 'border-red-500' : ''}`}>
                  <option value="">{formData.client_id ? t[language].selectMatter : t[language].selectClientFirst}</option>
                  {filteredMatters.map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                  ))}
                </select>
                {errors.matter_id && touched.matter_id && <p className="text-red-500 text-xs mt-1">{errors.matter_id}</p>}
              </div>
            </div>

            {/* Link to Hearing */}
            {filteredHearings.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].hearings} ({language === 'ar' ? 'اختياري' : 'optional'})</label>
                <select value={formData.hearing_id}
                  onChange={(e) => setFormData({...formData, hearing_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  {filteredHearings.map(h => (
                    <option key={h.hearing_id} value={h.hearing_id}>
                      {h.hearing_date} - {hearingPurposes.find(p => p.purpose_id == h.purpose_id)?.name_en || h.purpose_custom || 'Hearing'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].judgmentType}</label>
                <select value={formData.judgment_type}
                  onChange={(e) => setFormData({...formData, judgment_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="first_instance">{t[language].firstInstance}</option>
                  <option value="appeal">{t[language].appeal}</option>
                  <option value="cassation">{t[language].cassation}</option>
                  <option value="arbitral_award">{t[language].arbitralAward}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].judgmentStatus}</label>
                <select value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="pending">{t[language].pending}</option>
                  <option value="issued">{t[language].issued}</option>
                  <option value="appealed">{t[language].appealed}</option>
                  <option value="final">{t[language].final}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].judgmentDate || (language === 'ar' ? 'تاريخ الحكم' : 'Judgment Date')}</label>
                <input type="date" value={formData.expected_date}
                  onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].reminderDays}</label>
                <input type="number" value={formData.reminder_days}
                  onChange={(e) => setFormData({...formData, reminder_days: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].judgmentOutcome}</label>
                <select value={formData.judgment_outcome}
                  onChange={(e) => setFormData({...formData, judgment_outcome: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  <option value="won">{t[language].won}</option>
                  <option value="lost">{t[language].lost}</option>
                  <option value="partial_win">{t[language].partialWin}</option>
                  <option value="not_final">{t[language].notFinal || 'Not Final'}</option>
                  <option value="settled">{t[language].settled}</option>
                  <option value="dismissed">{t[language].dismissed}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].inFavorOf}</label>
                <select value={formData.in_favor_of}
                  onChange={(e) => setFormData({...formData, in_favor_of: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  <option value="our_client">{t[language].ourClient}</option>
                  <option value="opposing">{t[language].opposing}</option>
                  <option value="partial">{t[language].partial}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].appealDeadline}</label>
                <input type="date" value={formData.appeal_deadline}
                  onChange={(e) => setFormData({...formData, appeal_deadline: e.target.value})}
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
                    {t[language].createAppealDeadline || (language === 'ar' ? 'إنشاء موعد استئناف تلقائياً' : 'Automatically create appeal deadline')}
                  </span>
                </label>
                {formData.create_appeal_deadline && (
                  <p className="text-xs text-blue-600 mt-1 ml-6">
                    ✓ {language === 'ar' ? 'سيتم إنشاء موعد نهائي للاستئناف في قائمة المواعيد' : 'A deadline will be created in the Deadlines list'}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.appeal_possible}
                  onChange={(e) => setFormData({...formData, appeal_possible: e.target.checked})}
                  className="w-4 h-4" />
                <span className="text-sm">{t[language].appealPossible}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.appealed}
                  onChange={(e) => setFormData({...formData, appealed: e.target.checked})}
                  className="w-4 h-4" />
                <span className="text-sm">{t[language].appealed}</span>
              </label>
            </div>

            {/* Not Final Workflow - Schedule Next Hearing */}
            {formData.judgment_outcome === 'not_final' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">
                  📋 {t[language].notFinalWorkflow || 'Not Final - Schedule Next Hearing'}
                </h4>
                <p className="text-xs text-indigo-600 mb-3">
                  {language === 'ar'
                    ? 'الحكم ليس نهائياً. يمكنك جدولة جلسة جديدة وسيتم نقل هذا السجل إلى قائمة الجلسات.'
                    : 'The judgment is not final. You can schedule a new hearing and this record will move to the Hearings list.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].nextHearingDate || 'Next Hearing Date'}</label>
                    <input type="date" value={formData.next_hearing_date}
                      onChange={(e) => setFormData({...formData, next_hearing_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].time}</label>
                    <input type="time" value={formData.next_hearing_time}
                      onChange={(e) => setFormData({...formData, next_hearing_time: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].purpose}</label>
                    <select value={formData.next_hearing_purpose_id}
                      onChange={(e) => setFormData({...formData, next_hearing_purpose_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">-- {t[language].select} --</option>
                      {hearingPurposes.map(p => (
                        <option key={p.purpose_id} value={p.purpose_id}>
                          {language === 'ar' ? p.name_ar : p.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.next_hearing_date && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ {language === 'ar' ? 'سيتم إنشاء جلسة جديدة وإخفاء هذا الحكم من القائمة' : 'A new hearing will be created and this judgment will be hidden from the list'}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{t[language].judgmentSummary}</label>
              <textarea value={formData.judgment_summary} rows="3"
                onChange={(e) => setFormData({...formData, judgment_summary: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowJudgmentForm(false); setEditingJudgment(null); }}
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

export default JudgmentForm;
