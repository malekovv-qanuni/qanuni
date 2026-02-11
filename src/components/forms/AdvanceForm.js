// ============================================
// ADVANCE FORM COMPONENT (extracted from App.js)
// Version: v46.54 - Enriched matter dropdown (case_number + court)
// ============================================
import React, { useState } from 'react';
import { FormField } from '../common';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

const AdvanceForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshAdvances, clients, matters, lawyers}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingAdvance } = forms.advance;
  const [formData, setFormData] = useState(editingAdvance || {
    advance_type: 'client_retainer', client_id: '', matter_id: '', lawyer_id: '',
    amount: '', currency: 'USD', date_received: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer', reference_number: '', balance_remaining: '',
    notes: '', fee_description: ''
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
        if (!value) return 'Date is required';
        break;
      case 'client_id':
        if (!isLawyerAdvance && !value) return 'Client is required';
        break;
      case 'lawyer_id':
        if (isLawyerAdvance && !value) return 'Lawyer is required';
        break;
      case 'amount':
        if (!value) return 'Amount is required';
        if (parseFloat(value) <= 0) return 'Amount must be greater than zero';
        break;
    }
    return null;
  };

  const handleFieldChange = (name, value) => {
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
      const amount = parseFloat(formData.amount) || 0;
      // For new advances, balance = amount
      // For editing, keep existing balance (capped at amount if amount decreased)
      const currentBalance = parseFloat(formData.balance_remaining) || amount;
      const cappedBalance = isFeePayment ? amount : Math.min(currentBalance, amount);
      
      const advanceData = {
        ...formData,
        // Clear irrelevant fields based on type
        client_id: isLawyerAdvance ? null : formData.client_id,
        matter_id: isLawyerAdvance ? null : formData.matter_id,
        lawyer_id: isLawyerAdvance ? formData.lawyer_id : null,
        // Fee payments don't have balance tracking; balance capped at amount
        balance_remaining: cappedBalance,
        // No per-advance minimum_balance_alert anymore
        minimum_balance_alert: null
      };
      let result;
      if (editingAdvance) {
        result = await apiClient.updateAdvance(advanceData);
      } else {
        result = await apiClient.addAdvance(advanceData);
      }
      if (!result || !result.success) {
        showToast(result?.error || 'Failed to save payment', 'error');
        return;
      }
      await refreshAdvances();
      clearFormDirty && clearFormDirty();
      showToast(editingAdvance
        ? ('Payment updated successfully')
        : ('Payment added successfully'));
      closeForm('advance');
    } catch (error) {
      console.error('Error saving payment:', error);
      showToast('Error saving payment: ' + error.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{editingAdvance ? 'Edit' : 'Add Payment'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{'Payment Type'}</label>
                <select value={formData.advance_type}
                  onChange={(e) => setFormData({...formData, advance_type: e.target.value, client_id: '', matter_id: '', lawyer_id: '', fee_description: ''})}
                  className="w-full px-3 py-2 border rounded-md">
                  <optgroup label={'Fee Payments (from clients)'}>
                    <option value="client_retainer">{'Client Retainer'}</option>
                    <option value="fee_payment_fixed">{'Fixed Fee Payment'}</option>
                    <option value="fee_payment_consultation">{'Consultation Fee'}</option>
                    <option value="fee_payment_success">{'Success Fee'}</option>
                    <option value="fee_payment_milestone">{'Milestone Payment'}</option>
                    <option value="fee_payment_other">{'Other Fee Payment'}</option>
                  </optgroup>
                  <optgroup label={'Expense Advances (for costs)'}>
                    <option value="client_expense_advance">{'Expense Advance'}</option>
                  </optgroup>
                  <optgroup label={'Internal (firm to lawyer)'}>
                    <option value="lawyer_advance">{'Lawyer Advance'}</option>
                  </optgroup>
                </select>
              </div>
              
              <FormField label={'Date Received'} required error={errors.date_received}>
                <input type="date" value={formData.date_received}
                  onChange={(e) => handleFieldChange('date_received', e.target.value)}
                  onBlur={() => handleBlur('date_received')}
                  className={inputClass(errors.date_received)} />
              </FormField>
              
              {/* Show Lawyer dropdown for lawyer_advance */}
              {isLawyerAdvance ? (
                <FormField label={'Lawyer'} required error={errors.lawyer_id}>
                  <select value={formData.lawyer_id || ''}
                    onChange={(e) => handleFieldChange('lawyer_id', e.target.value)}
                    onBlur={() => handleBlur('lawyer_id')}
                    className={inputClass(errors.lawyer_id)}>
                    <option value="">{'Select Lawyer'}</option>
                    {lawyers.map(l => <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>)}
                  </select>
                </FormField>
              ) : (
                <>
                  <FormField label={'Client'} required error={errors.client_id}>
                    <select value={formData.client_id || ''}
                      onChange={(e) => { 
                        handleFieldChange('client_id', e.target.value); 
                        setFormData(prev => ({...prev, client_id: e.target.value, matter_id: ''})); 
                      }}
                      onBlur={() => handleBlur('client_id')}
                      className={inputClass(errors.client_id)}>
                      <option value="">{'Select Client'}</option>
                      {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                    </select>
                  </FormField>
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Matter'}</label>
                    <select value={formData.matter_id || ''}
                      onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                      disabled={!formData.client_id}
                      className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                      <option value="">{'Select Matter'}</option>
                      {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' - ' + m.case_number : ''}${m.court_name ? ' - ' + m.court_name : ''}`}</option>)}
                    </select>
                  </div>
                </>
              )}
              
              {/* Fee description for fee payments */}
              {isFeePayment && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{'Fee Description'}</label>
                  <input type="text" value={formData.fee_description || ''}
                    onChange={(e) => setFormData({...formData, fee_description: e.target.value})}
                    placeholder={'e.g., Contract drafting - Phase 1'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
              
              <FormField label={'Amount'} required error={errors.amount}>
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={formData.amount || ''}
                    onChange={(e) => { 
                      const newAmount = parseFloat(e.target.value) || 0;
                      handleFieldChange('amount', e.target.value); 
                      setFormData(prev => {
                        // For new advances, balance = amount
                        // For editing, cap balance at new amount if amount decreased
                        const currentBalance = parseFloat(prev.balance_remaining) || newAmount;
                        const newBalance = editingAdvance ? Math.min(currentBalance, newAmount) : newAmount;
                        return {...prev, amount: e.target.value, balance_remaining: newBalance};
                      }); 
                    }}
                    onBlur={() => handleBlur('amount')}
                    className={`flex-1 px-3 py-2 border rounded-md ${errors.amount ? 'border-red-500 bg-red-50' : ''}`} />
                  <select value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-24 px-3 py-2 border rounded-md">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
              </FormField>
              <div>
                <label className="block text-sm font-medium mb-1">{'Payment Method'}</label>
                <select value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="bank_transfer">{'Bank Transfer'}</option>
                  <option value="check">{'Check'}</option>
                  <option value="cash">{'Cash'}</option>
                  <option value="credit_card">{'Credit Card'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{'Reference Number'}</label>
                <input type="text" value={formData.reference_number || ''}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              
              {/* Balance Remaining - READ-ONLY display for editing non-fee-payment types */}
              {!isFeePayment && editingAdvance && (
                <div>
                  <label className="block text-sm font-medium mb-1">{'Balance Remaining'}</label>
                  <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                    {formData.currency} {parseFloat(formData.balance_remaining || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {'Updated automatically when expenses are recorded'}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{'Notes'}</label>
              <textarea value={formData.notes || ''} rows="2"
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-md" />
              <p className="text-xs text-gray-400 mt-1">
                {'Supports Arabic / يدعم العربية'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { closeForm('advance'); clearFormDirty && clearFormDirty(); }}
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

export default AdvanceForm;
