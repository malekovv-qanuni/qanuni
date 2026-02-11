// ============================================
// TASK FORM COMPONENT (extracted from App.js)
// Version: v42.0.7
// ============================================
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../components/common';

const TaskForm = React.memo(({ language, isRTL, editingTask, setEditingTask, setShowTaskForm, taskFormData, setTaskFormData, showToast, markFormDirty, clearFormDirty, refreshTasks, clients, matters, taskTypes, lawyers, t }) => {
  const defaultFormData = {
    client_id: '', matter_id: '', task_type_id: '', task_type_custom: '', title: '', description: '',
    instructions: '', due_date: '', due_time: '', time_budget_minutes: '',
    priority: 'medium', assigned_to_id: '', notes: ''
  };
  
  // Map assigned_to from database to assigned_to_id for form
  const mappedEditingTask = editingTask ? {
    ...editingTask,
    assigned_to_id: editingTask.assigned_to || editingTask.assigned_to_id || ''
  } : null;
  
  const getInitialData = () => {
    if (taskFormData) return taskFormData;
    if (mappedEditingTask) return {...defaultFormData, ...mappedEditingTask};
    return defaultFormData;
  };
  
  // Local state only - no wrapper function
  const [formData, setFormData] = useState(getInitialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Sync to parent via useEffect (not during render)
  useEffect(() => {
    setTaskFormData(formData);
  }, [formData, setTaskFormData]);

  // Filter matters by selected client
  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  // Check if custom task type selected
  const isCustomTaskType = formData.task_type_id === 'custom';

  const validateField = (name, value) => {
    switch (name) {
      case 'title': if (!value || !value.trim()) return t[language].required; break;
      case 'due_date': if (!value) return t[language].required; break;
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
    ['title', 'due_date'].forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ title: true, due_date: true });
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
      const taskData = {
        ...formData,
        assigned_by: 'Admin',
        task_type_id: formData.task_type_id === 'custom' ? null : formData.task_type_id,
        assigned_to_id: formData.assigned_to_id || null,
        time_budget_minutes: formData.time_budget_minutes ? parseInt(formData.time_budget_minutes) : null
      };
      
      if (editingTask) {
        await window.electronAPI.updateTask({ ...taskData, task_id: editingTask.task_id });
      } else {
        await window.electronAPI.addTask(taskData);
      }
      clearFormDirty();
      await refreshTasks();
      showToast(editingTask 
        ? (language === 'ar' ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully')
        : (language === 'ar' ? 'تم إضافة المهمة بنجاح' : 'Task added successfully'));
      setShowTaskForm(false);
      setEditingTask(null);
      setTaskFormData(null);
    } catch (error) {
      console.error('Error saving task:', error);
      showToast(language === 'ar' ? 'خطأ في حفظ المهمة' : 'Error saving task', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingTask ? t[language].edit : t[language].addTask}</h2>
            <button onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormData(null); clearFormDirty(); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client & Matter Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].client}</label>
                <select value={formData.client_id}
                  onChange={(e) => { 
                    const newClientId = e.target.value;
                    setFormData(prev => ({...prev, client_id: newClientId, matter_id: ''}));
                    markFormDirty();
                  }}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].selectClient} --</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                <select value={formData.matter_id}
                  onChange={(e) => handleFieldChange('matter_id', e.target.value)}
                  disabled={!formData.client_id}
                  className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                  <option value="">{formData.client_id ? '-- ' + t[language].selectMatter + ' --' : t[language].selectClientFirst}</option>
                  {filteredMatters.map(m => (
                    <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t[language].taskTitle} required error={errors.title}>
                <input type="text" value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={inputClass(errors.title)} />
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].taskType}</label>
                <select value={formData.task_type_id}
                  onChange={(e) => handleFieldChange('task_type_id', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  {taskTypes.map(tt => (
                    <option key={tt.task_type_id} value={tt.task_type_id}>
                      {language === 'ar' ? (tt.name_ar || tt.name_en) : tt.name_en}
                    </option>
                  ))}
                  <option value="custom">{t[language].custom}</option>
                </select>
              </div>
              {isCustomTaskType && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].customType} *</label>
                  <input type="text" required value={formData.task_type_custom}
                    onChange={(e) => handleFieldChange('task_type_custom', e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل نوع المهمة...' : 'Enter task type...'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].priority}</label>
                <select value={formData.priority}
                  onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="high">{t[language].high}</option>
                  <option value="medium">{t[language].medium}</option>
                  <option value="low">{t[language].low}</option>
                </select>
              </div>
              <FormField label={t[language].dueDate} required error={errors.due_date}>
                <input type="date" value={formData.due_date}
                  onChange={(e) => handleFieldChange('due_date', e.target.value)}
                  onBlur={() => handleBlur('due_date')}
                  className={inputClass(errors.due_date)} />
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].assignedTo}</label>
                <select value={formData.assigned_to_id || ''}
                  onChange={(e) => setFormData(prev => ({...prev, assigned_to_id: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">-- {t[language].select} --</option>
                  {lawyers.map(lawyer => (
                    <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                      {language === 'ar' && lawyer.full_name_arabic ? lawyer.full_name_arabic : lawyer.full_name}
                      {lawyer.initials ? ` (${lawyer.initials})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t[language].description}</label>
              <textarea value={formData.description} rows="2"
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t[language].instructions}</label>
              <textarea value={formData.instructions} rows="3"
                onChange={(e) => setFormData(prev => ({...prev, instructions: e.target.value}))}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormData(null); clearFormDirty(); }}
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

export default TaskForm;
