// ============================================
// ADVANCE FORM COMPONENT (extracted from App.js)
// Version: v42.1 - Fixed balance_remaining capped at amount
// ============================================
import React, { useState } from 'react';

const AdvanceForm = React.memo(({ language, isRTL, editingAdvance, setEditingAdvance, setShowAdvanceForm, showToast, markFormDirty, clearFormDirty, refreshAdvances, clients, matters, lawyers, t }) => {
  const [formData, setFormData] = useState(editingAdvance || {
    advance_type: 'client_retainer', client_id: '', matter_id: '', lawyer_id: '',
    amount: '', currency: 'USD', date_received: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer', reference_number: '', balance_remaining: '',
    minimum_balance_alert: '', notes: '', fee_description: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const isLawyerAdvance = formData.advance_type === 'lawyer_advance';
  const isFeePayment = formData.advance_type.startsWith('fee_payment');

  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  const validateField = (name, value) => {
    switch (name) {
      case 'date_received':
        if (!value) return language === 'ar' ? 'التاريخ مطلوب' : 'Date is required';
        return '';
      case 'client_id':
        if (!isLawyerAdvance && !value) return language === 'ar' ? 'العميل مطلوب' : 'Client is required';
        return '';
      case 'lawyer_id':
        if (isLawyerAdvance && !value) return language === 'ar' ? 'المحامي مطلوب' : 'Lawyer is required';
        return '';
      case 'amount':
        if (!value) return language === 'ar' ? 'المبلغ مطلوب' : 'Amount is required';
        if (parseFloat(value) <= 0) return language === 'ar' ? 'يجب أن يكون المبلغ أكبر من صفر' : 'Amount must be greater than zero';
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
    const fieldsToValidate = ['date_received', 'amount'];
    if (isLawyerAdvance) fieldsToValidate.push('lawyer_id');
    else fieldsToValidate.push('client_id');
    
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
      const amount = parseFloat(formData.amount) || 0;
      // Balance can never exceed amount
      const balanceValue = parseFloat(formData.balance_remaining) || amount;
      const cappedBalance = isFeePayment ? amount : Math.min(balanceValue, amount);
      
      const advanceData = {
        ...formData,
        // Clear irrelevant fields based on type
        client_id: isLawyerAdvance ? null : formData.client_id,
        matter_id: isLawyerAdvance ? null : formData.matter_id,
        lawyer_id: isLawyerAdvance ? formData.lawyer_id : null,
        // Fee payments don't have balance tracking; balance capped at amount
        balance_remaining: cappedBalance,
        minimum_balance_alert: isFeePayment ? null : formData.minimum_balance_alert
      };
      let result;
      if (editingAdvance) {
        result = await window.electronAPI.updateAdvance(advanceData);
      } else {
        result = await window.electronAPI.addAdvance(advanceData);
      }
      if (result && result.success === false) {
        showToast('Save failed: ' + (result.error || 'Unknown error'), 'error');
        return;
      }
      await refreshAdvances();
      clearFormDirty && clearFormDirty(); // Clear dirty state after successful save
      showToast(editingAdvance ? 'Payment updated successfully' : 'Payment added successfully');
      setShowAdvanceForm(false);
      setEditingAdvance(null);
    } catch (error) {
      console.error('Error saving payment:', error);
      showToast('Error saving payment: ' + error.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{editingAdvance ? t[language].edit : t[language].addAdvance}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].advanceType}</label>
                <select value={formData.advance_type}
                  onChange={(e) => setFormData({...formData, advance_type: e.target.value, client_id: '', matter_id: '', lawyer_id: '', fee_description: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <optgroup label="Fee Payments (from clients)">
                    <option value="client_retainer">{t[language].clientRetainer}</option>
                    <option value="fee_payment_fixed">{t[language].feePaymentFixed}</option>
                    <option value="fee_payment_consultation">{t[language].feePaymentConsultation}</option>
                    <option value="fee_payment_success">{t[language].feePaymentSuccess}</option>
                    <option value="fee_payment_milestone">{t[language].feePaymentMilestone}</option>
                    <option value="fee_payment_other">{t[language].feePaymentOther}</option>
                  </optgroup>
                  <optgroup label="Expense Advances (for costs)">
                    <option value="client_expense_advance">{t[language].clientExpenseAdvance}</option>
                  </optgroup>
                  <optgroup label="Internal (firm to lawyer)">
                    <option value="lawyer_advance">{t[language].lawyerAdvance}</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].dateReceived} *</label>
                <input type="date" value={formData.date_received}
                  onChange={(e) => handleChange('date_received', e.target.value)}
                  onBlur={() => handleBlur('date_received')}
                  className={`w-full px-3 py-2 border rounded-md ${errors.date_received && touched.date_received ? 'border-red-500' : ''}`} />
                {errors.date_received && touched.date_received && <p className="text-red-500 text-xs mt-1">{errors.date_received}</p>}
              </div>
              
              {/* Show Lawyer dropdown for lawyer_advance */}
              {isLawyerAdvance ? (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].lawyer} *</label>
                  <select value={formData.lawyer_id || ''}
                    onChange={(e) => handleChange('lawyer_id', e.target.value)}
                    onBlur={() => handleBlur('lawyer_id')}
                    className={`w-full px-3 py-2 border rounded-md ${errors.lawyer_id && touched.lawyer_id ? 'border-red-500' : ''}`}>
                    <option value="">{t[language].selectLawyer}</option>
                    {lawyers.map(l => <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>)}
                  </select>
                  {errors.lawyer_id && touched.lawyer_id && <p className="text-red-500 text-xs mt-1">{errors.lawyer_id}</p>}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                    <select value={formData.client_id || ''}
                      onChange={(e) => { handleChange('client_id', e.target.value); setFormData(prev => ({...prev, client_id: e.target.value, matter_id: ''})); }}
                      onBlur={() => handleBlur('client_id')}
                      className={`w-full px-3 py-2 border rounded-md ${errors.client_id && touched.client_id ? 'border-red-500' : ''}`}>
                      <option value="">{t[language].selectClient}</option>
                      {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                    </select>
                    {errors.client_id && touched.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                    <select value={formData.matter_id || ''}
                      onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md">
                      <option value="">{t[language].selectMatter}</option>
                      {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                    </select>
                  </div>
                </>
              )}
              
              {/* Fee description for fee payments */}
              {isFeePayment && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{t[language].feeDescription}</label>
                  <input type="text" value={formData.fee_description || ''}
                    onChange={(e) => setFormData({...formData, fee_description: e.target.value})}
                    placeholder="e.g., Contract drafting - Phase 1"
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].amount} *</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={formData.amount || ''}
                    onChange={(e) => { 
                      const newAmount = parseFloat(e.target.value) || 0;
                      handleChange('amount', e.target.value); 
                      setFormData(prev => {
                        // For new advances, balance = amount
                        // For editing, cap balance at new amount if amount decreased
                        const currentBalance = parseFloat(prev.balance_remaining) || newAmount;
                        const newBalance = editingAdvance ? Math.min(currentBalance, newAmount) : newAmount;
                        return {...prev, amount: e.target.value, balance_remaining: newBalance};
                      }); 
                    }}
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
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].paymentMethod}</label>
                <select value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="bank_transfer">{t[language].bankTransfer}</option>
                  <option value="check">{t[language].check}</option>
                  <option value="cash">{t[language].cash}</option>
                  <option value="credit_card">{t[language].creditCard}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[language].referenceNumber}</label>
                <input type="text" value={formData.reference_number || ''}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              {/* Balance fields - only for non-fee-payment types */}
              {!isFeePayment && editingAdvance && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].balanceRemaining}</label>
                  <input type="number" step="0.01" value={formData.balance_remaining || ''}
                    onChange={(e) => setFormData({...formData, balance_remaining: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              {!isFeePayment && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].minimumBalanceAlert}</label>
                  <input type="number" step="0.01" value={formData.minimum_balance_alert || ''}
                    onChange={(e) => setFormData({...formData, minimum_balance_alert: e.target.value})}
                    placeholder="500"
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
              <button type="button" onClick={() => { setShowAdvanceForm(false); setEditingAdvance(null); }}
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

export default AdvanceForm;
