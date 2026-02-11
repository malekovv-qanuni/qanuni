// ============================================
// LOOKUP FORM COMPONENT (extracted from App.js)
// Version: v42.0.8
// Bug Fixed: Changed currentLookupType to lookupType prop
// ============================================
import React, { useState } from 'react';
import { X } from 'lucide-react';

const LookupForm = React.memo(({ language, isRTL, showLookupForm, setShowLookupForm, lookupType, editingLookup, setEditingLookup, showToast, refreshLookups, t }) => {
  const isLawyer = lookupType === 'lawyers';
  const isTaskType = lookupType === 'taskTypes';
  
  const [formData, setFormData] = useState(editingLookup || {
    name_en: '', name_ar: '', full_name: '', full_name_arabic: '',
    initials: '', hourly_rate: '', icon: '📋', active: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLookup) {
        await window.electronAPI.updateLookupItem(lookupType, formData);
      } else {
        await window.electronAPI.addLookupItem(lookupType, formData);
      }
      await refreshLookups();
      showToast(editingLookup 
        ? (language === 'ar' ? 'تم تحديث العنصر بنجاح' : 'Item updated successfully')
        : (language === 'ar' ? 'تم إضافة العنصر بنجاح' : 'Item added successfully'));
      setShowLookupForm(false);
      setEditingLookup(null);
    } catch (error) {
      console.error('Error saving lookup item:', error);
      showToast(language === 'ar' ? 'خطأ في الحفظ' : 'Error saving: ' + error.message, 'error');
    }
  };

  const lookupTabs = [
    { id: 'lawyers', label: t[language].lawyers },
    { id: 'courtTypes', label: t[language].courtTypes },
    { id: 'regions', label: t[language].regions },
    { id: 'hearingPurposes', label: t[language].hearingPurposes },
    { id: 'taskTypes', label: t[language].taskTypes },
    { id: 'expenseCategories', label: t[language].expenseCategories },
  ];
  
  const currentTab = lookupTabs.find(tab => tab.id === lookupType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-md ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {editingLookup ? t[language].edit : t[language].addNew} - {currentTab?.label}
            </h2>
            <button onClick={() => { setShowLookupForm(false); setEditingLookup(null); }}
              className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLawyer ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].nameEn} *</label>
                  <input type="text" required value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].nameAr}</label>
                  <input type="text" value={formData.full_name_arabic}
                    onChange={(e) => setFormData({...formData, full_name_arabic: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].initials}</label>
                    <input type="text" value={formData.initials} maxLength="5"
                      onChange={(e) => setFormData({...formData, initials: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].hourlyRate}</label>
                    <input type="number" value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].nameEn} *</label>
                  <input type="text" required value={formData.name_en}
                    onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].nameAr}</label>
                  <input type="text" value={formData.name_ar}
                    onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                {isTaskType && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].icon}</label>
                    <input type="text" value={formData.icon} maxLength="4"
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-2xl"
                      placeholder="📋" />
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => { setShowLookupForm(false); setEditingLookup(null); }}
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

export default LookupForm;
