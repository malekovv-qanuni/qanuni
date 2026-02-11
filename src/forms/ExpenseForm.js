// ============================================
// EXPENSE FORM COMPONENT (extracted from App.js)
// Version: v42.1 - Fixed expense_id and expense_type in update
// ============================================
import React, { useState } from 'react';

const ExpenseForm = React.memo(({ language, isRTL, editingExpense, setEditingExpense, setShowExpenseForm, showToast, markFormDirty, clearFormDirty, refreshExpenses, refreshAdvances, clients, matters, expenseCategories, lawyers, advances, t }) => {
  const [formData, setFormData] = useState(editingExpense || {
    client_id: '', matter_id: '', category_id: '', paid_by_lawyer_id: '',
    amount: '', currency: 'USD', description: '', date: new Date().toISOString().split('T')[0],
    billable: true, markup_percent: '', notes: ''
  });
  const [balanceWarning, setBalanceWarning] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return language === 'ar' ? 'العميل مطلوب' : 'Client is required';
        return '';
      case 'date':
        if (!value) return language === 'ar' ? 'التاريخ مطلوب' : 'Date is required';
        return '';
      case 'amount':
        if (!value) return language === 'ar' ? 'المبلغ مطلوب' : 'Amount is required';
        if (parseFloat(value) <= 0) return language === 'ar' ? 'يجب أن يكون المبلغ أكبر من صفر' : 'Amount must be greater than zero';
        return '';
      case 'category_id':
        if (!value) return language === 'ar' ? 'الفئة مطلوبة' : 'Category is required';
        return '';
      case 'paid_by':
        if (!value && value !== 'firm') return language === 'ar' ? 'الدافع مطلوب' : 'Paid By is required';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    markFormDirty && markFormDirty();
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, formData[name]) }));
  };

  const validateAll = () => {
    const fieldsToValidate = ['client_id', 'date', 'amount', 'category_id'];
    const newErrors = {};
    let isValid = true;
    fieldsToValidate.forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) { newErrors[name] = error; isValid = false; }
    });
    // Special validation for paid_by (not a single field)
    if (!formData.paid_by_lawyer_id && formData.paid_by_firm !== 1) {
      newErrors.paid_by = language === 'ar' ? 'الدافع مطلوب' : 'Paid By is required';
      isValid = false;
    }
    setErrors(newErrors);
    setTouched({...fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}), paid_by: true});
    return isValid;
  };

  // Check advance balances when client/amount changes
  const checkBalances = async () => {
    if (!formData.client_id || !formData.amount) {
      setBalanceWarning(null);
      return;
    }
    const amount = parseFloat(formData.amount) || 0;
    const warnings = [];
    
    // Check client expense advance
    try {
      const clientAdv = await window.electronAPI.getClientExpenseAdvance(formData.client_id, formData.matter_id);
      if (clientAdv) {
        const newBalance = parseFloat(clientAdv.balance_remaining) - amount;
        if (newBalance < 0) {
          warnings.push(`${t[language].clientExpenseAdvance}: ${clientAdv.currency} ${clientAdv.balance_remaining} → ${newBalance.toFixed(2)} (${t[language].negative})`);
        }
      }
    } catch (e) { console.log('No client expense advance'); }
    
    // Check lawyer advance if paid by lawyer
    if (formData.paid_by_lawyer_id) {
      try {
        const lawyerAdv = await window.electronAPI.getLawyerAdvance(formData.paid_by_lawyer_id);
        if (lawyerAdv) {
          const newBalance = parseFloat(lawyerAdv.balance_remaining) - amount;
          if (newBalance < 0) {
            warnings.push(`${t[language].lawyerAdvance}: ${lawyerAdv.currency} ${lawyerAdv.balance_remaining} → ${newBalance.toFixed(2)} (${t[language].negative})`);
          }
        }
      } catch (e) { console.log('No lawyer advance'); }
    }
    
    setBalanceWarning(warnings.length > 0 ? warnings : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    try {
      if (editingExpense) {
        // Ensure expense_id and expense_type are included
        await window.electronAPI.updateExpense({
          ...formData,
          expense_id: editingExpense.expense_id,
          expense_type: formData.expense_type || editingExpense.expense_type || 'client'
        });
      } else {
        // Use new API with auto-deduction
        await window.electronAPI.addExpenseWithDeduction({
          ...formData,
          expense_type: 'client' // All expenses are client expenses now
        });
      }
      await Promise.all([refreshExpenses(), refreshAdvances()]);
      clearFormDirty && clearFormDirty(); // Clear dirty state after successful save
      showToast(editingExpense 
        ? (language === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully')
        : (language === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully'));
      setShowExpenseForm(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast(language === 'ar' ? 'خطأ في حفظ المصروف' : 'Error saving expense', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{editingExpense ? t[language].edit : t[language].addExpense}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                <select value={formData.client_id}
                  onChange={(e) => { handleChange('client_id', e.target.value); setFormData(prev => ({...prev, client_id: e.target.value, matter_id: ''})); setTimeout(checkBalances, 100); }}
                  onBlur={() => handleBlur('client_id')}
                  className={`w-full px-3 py-2 border rounded-md ${errors.client_id && touched.client_id ? 'border-red-500' : ''}`}>
                  <option value="">{t[language].selectClient}</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
                {errors.client_id && touched.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                <select value={formData.matter_id}
                  onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">{t[language].selectMatter}</option>
                  {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].date} *</label>
                <input type="date" value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  onBlur={() => handleBlur('date')}
                  className={`w-full px-3 py-2 border rounded-md ${errors.date && touched.date ? 'border-red-500' : ''}`} />
                {errors.date && touched.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].paidBy} *</label>
                <select value={formData.paid_by_firm === 1 ? 'firm' : (formData.paid_by_lawyer_id || '')}
                  onChange={(e) => { 
                    const val = e.target.value;
                    setFormData({...formData, paid_by_lawyer_id: val === 'firm' ? null : val, paid_by_firm: val === 'firm' ? 1 : 0}); 
                    setTouched(prev => ({...prev, paid_by: true}));
                    setErrors(prev => ({...prev, paid_by: ''}));
                    setTimeout(checkBalances, 100); 
                  }}
                  className={`w-full px-3 py-2 border rounded-md ${errors.paid_by && touched.paid_by ? 'border-red-500' : ''}`}>
                  <option value="">-- {t[language].select || 'Select'} --</option>
                  <option value="firm">{t[language].firmDirect || 'Firm (Direct)'}</option>
                  {lawyers.map(l => <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>)}
                </select>
                {errors.paid_by && touched.paid_by && <p className="text-red-500 text-xs mt-1">{errors.paid_by}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].category} *</label>
                <select value={formData.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  onBlur={() => handleBlur('category_id')}
                  className={`w-full px-3 py-2 border rounded-md ${errors.category_id && touched.category_id ? 'border-red-500' : ''}`}>
                  <option value="">-- {t[language].select} --</option>
                  {expenseCategories.map(c => (
                    <option key={c.category_id} value={c.category_id}>
                      {language === 'ar' ? c.name_ar : c.name_en}
                    </option>
                  ))}
                </select>
                {errors.category_id && touched.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].amount} *</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={formData.amount || ''}
                    onChange={(e) => { handleChange('amount', e.target.value); setTimeout(checkBalances, 100); }}
                    onBlur={() => handleBlur('amount')}
                    className={`flex-1 px-3 py-2 border rounded-md ${errors.amount && touched.amount ? 'border-red-500' : ''}`} />
                  <select value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-24 px-3 py-2 border rounded-md">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
                {errors.amount && touched.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>
            </div>
            
            {/* Balance Warning */}
            {balanceWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800 font-medium">⚠️ {t[language].balanceWarning}:</p>
                {balanceWarning.map((w, i) => (
                  <p key={i} className="text-sm text-yellow-700 ml-4">• {w}</p>
                ))}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">{t[language].description} *</label>
              <textarea required value={formData.description || ''} rows="2"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.billable}
                    onChange={(e) => setFormData({...formData, billable: e.target.checked})}
                    className="w-4 h-4" />
                  <span className="text-sm font-medium">{t[language].billable}</span>
                </label>
              </div>
              {formData.billable && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].markup} %</label>
                  <input type="number" value={formData.markup_percent || ''}
                    onChange={(e) => setFormData({...formData, markup_percent: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t[language].notes}</label>
              <textarea value={formData.notes || ''} rows="2"
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }}
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

export default ExpenseForm;
