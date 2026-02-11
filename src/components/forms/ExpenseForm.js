// ============================================
// EXPENSE FORM COMPONENT - Unified Multi-Line Version
// Version: v46.44 - Added Arabic support hint
// ============================================
import React, { useState, useEffect } from 'react';
import { tf } from '../../utils';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useUI } from '../../contexts';

const ExpenseForm = React.memo(({
  showToast,
  markFormDirty,
  clearFormDirty,
  refreshExpenses,
  refreshAdvances,
  clients,
  matters,
  expenseCategories,
  lawyers,
  advances}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingExpense } = forms.expense;
  // Shared fields (apply to all line items)
  const [sharedData, setSharedData] = useState({
    client_id: editingExpense?.client_id || '',
    matter_id: editingExpense?.matter_id || '',
    date: editingExpense?.date || new Date().toISOString().split('T')[0],
    paid_by_lawyer_id: editingExpense?.paid_by_lawyer_id || '',
    paid_by_firm: editingExpense?.paid_by_firm || 0,
    currency: editingExpense?.currency || 'USD',
    billable: editingExpense?.billable !== undefined ? editingExpense.billable : true
  });

  // Line items - when editing, start with single item; when adding new, start with one empty row
  const [lineItems, setLineItems] = useState(editingExpense ? [{
    id: 1,
    category_id: editingExpense.category_id || '',
    description: editingExpense.description || '',
    amount: editingExpense.amount || '',
    attachment_note: editingExpense.attachment_note || ''
  }] : [{
    id: 1,
    category_id: '',
    description: '',
    amount: '',
    attachment_note: ''
  }]);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [balanceWarning, setBalanceWarning] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filter matters by selected client
  const filteredMatters = sharedData.client_id 
    ? matters.filter(m => m.client_id == sharedData.client_id)
    : [];

  // Calculate total amount
  const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Count valid items
  const validItemsCount = lineItems.filter(item => 
    item.category_id && item.description && item.amount && parseFloat(item.amount) > 0
  ).length;

  // Check advance balances
  const checkBalances = async () => {
    if (!sharedData.client_id || totalAmount <= 0) {
      setBalanceWarning(null);
      return;
    }
    const warnings = [];
    
    // Check client expense advance
    try {
      const clientAdv = await window.electronAPI.getClientExpenseAdvance(sharedData.client_id, sharedData.matter_id);
      if (clientAdv) {
        const newBalance = parseFloat(clientAdv.balance_remaining) - totalAmount;
        if (newBalance < 0) {
          warnings.push(`${'Expense Advance'}: ${clientAdv.currency} ${clientAdv.balance_remaining} → ${newBalance.toFixed(2)} (${'negative'})`);
        }
      }
    } catch (e) { /* No client expense advance */ }
    
    // Check lawyer advance if paid by lawyer
    if (sharedData.paid_by_lawyer_id) {
      try {
        const lawyerAdv = await window.electronAPI.getLawyerAdvance(sharedData.paid_by_lawyer_id);
        if (lawyerAdv) {
          const newBalance = parseFloat(lawyerAdv.balance_remaining) - totalAmount;
          if (newBalance < 0) {
            warnings.push(`${'Lawyer Advance'}: ${lawyerAdv.currency} ${lawyerAdv.balance_remaining} → ${newBalance.toFixed(2)} (${'negative'})`);
          }
        }
      } catch (e) { /* No lawyer advance */ }
    }
    
    setBalanceWarning(warnings.length > 0 ? warnings : null);
  };

  // Check balances when relevant fields change
  useEffect(() => {
    const timer = setTimeout(checkBalances, 200);
    return () => clearTimeout(timer);
  }, [sharedData.client_id, sharedData.matter_id, sharedData.paid_by_lawyer_id, totalAmount]);

  // Add new line item
  const addLineItem = () => {
    if (lineItems.length >= 20) {
      showToast('Maximum 20 items allowed', 'error');
      return;
    }
    const newId = Math.max(...lineItems.map(l => l.id)) + 1;
    setLineItems([...lineItems, { 
      id: newId, 
      category_id: '', 
      description: '', 
      amount: '', 
      attachment_note: ''
    }]);
    markFormDirty && markFormDirty();
  };

  // Remove line item
  const removeLineItem = (id) => {
    if (lineItems.length <= 1) {
      showToast('At least one item required', 'error');
      return;
    }
    setLineItems(lineItems.filter(l => l.id !== id));
    markFormDirty && markFormDirty();
  };

  // Update line item
  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ));
    markFormDirty && markFormDirty();
  };

  // Handle shared field change
  const handleSharedChange = (field, value) => {
    setSharedData(prev => ({ ...prev, [field]: value }));
    markFormDirty && markFormDirty();
    
    // Clear matter if client changes
    if (field === 'client_id') {
      setSharedData(prev => ({ ...prev, client_id: value, matter_id: '' }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    // Validate shared fields
    if (!sharedData.client_id) {
      newErrors.client_id = 'Client is required';
    }
    if (!sharedData.date) {
      newErrors.date = 'Date is required';
    }
    if (!sharedData.paid_by_lawyer_id && !sharedData.paid_by_firm) {
      newErrors.paid_by = 'Paid By is required';
    }

    // Validate at least one complete line item
    const hasValidItem = lineItems.some(item => 
      item.category_id && item.description && item.amount && parseFloat(item.amount) > 0
    );
    if (!hasValidItem) {
      newErrors.items = 'Enter at least one complete item';
    }

    // Validate individual items that have partial data
    lineItems.forEach((item) => {
      const hasAnyData = item.category_id || item.description || item.amount;
      if (hasAnyData) {
        if (!item.category_id) newErrors[`item_${item.id}_category`] = true;
        if (!item.description) newErrors[`item_${item.id}_description`] = true;
        if (!item.amount || parseFloat(item.amount) <= 0) newErrors[`item_${item.id}_amount`] = true;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingExpense) {
        // Update single expense
        const item = lineItems[0];
        await window.electronAPI.updateExpense({
          expense_id: editingExpense.expense_id,
          expense_type: editingExpense.expense_type || 'client',
          client_id: sharedData.client_id,
          matter_id: sharedData.matter_id || null,
          date: sharedData.date,
          paid_by_lawyer_id: sharedData.paid_by_firm ? null : sharedData.paid_by_lawyer_id,
          paid_by_firm: sharedData.paid_by_firm,
          currency: sharedData.currency,
          billable: sharedData.billable,
          category_id: item.category_id,
          description: item.description,
          amount: parseFloat(item.amount),
          attachment_note: item.attachment_note || null,
          status: editingExpense.status || 'pending'
        });
        showToast('Expense updated successfully');
      } else {
        // Add new expenses - use addExpenseWithDeduction for proper advance handling
        const validItems = lineItems.filter(item => 
          item.category_id && item.description && item.amount && parseFloat(item.amount) > 0
        );

        for (const item of validItems) {
          await window.electronAPI.addExpenseWithDeduction({
            expense_type: 'client',
            client_id: sharedData.client_id,
            matter_id: sharedData.matter_id || null,
            date: sharedData.date,
            paid_by_lawyer_id: sharedData.paid_by_firm ? null : sharedData.paid_by_lawyer_id,
            paid_by_firm: sharedData.paid_by_firm,
            currency: sharedData.currency,
            billable: sharedData.billable,
            category_id: item.category_id,
            description: item.description,
            amount: parseFloat(item.amount),
            attachment_note: item.attachment_note || null,
            status: 'pending'
          });
        }
        
        showToast(
          validItems.length === 1
            ? ('Expense added successfully')
            : (tf('{n} expenses added successfully', { n: validItems.length }))
        );
      }

      await Promise.all([refreshExpenses(), refreshAdvances()]);
      clearFormDirty && clearFormDirty();
      closeForm('expense');
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('Error saving expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {editingExpense ? 'Edit' : ('Add Expense')}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shared Fields Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Client */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'Client'} *</label>
                  <select 
                    value={sharedData.client_id}
                    onChange={(e) => handleSharedChange('client_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${errors.client_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">{'Select Client'}</option>
                    {clients.map(c => (
                      <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                    ))}
                  </select>
                  {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
                </div>

                {/* Matter */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'Matter'}</label>
                  <select 
                    value={sharedData.matter_id}
                    onChange={(e) => handleSharedChange('matter_id', e.target.value)}
                    disabled={!sharedData.client_id}
                    className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100"
                  >
                    <option value="">{sharedData.client_id ? ('Select Matter') : ('Select Client First')}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'DATE'} *</label>
                  <input 
                    type="date" 
                    value={sharedData.date}
                    onChange={(e) => handleSharedChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${errors.date ? 'border-red-500' : ''}`}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                </div>

                {/* Paid By */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'Paid By'} *</label>
                  <select 
                    value={sharedData.paid_by_firm ? 'firm' : (sharedData.paid_by_lawyer_id || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSharedData({
                        ...sharedData, 
                        paid_by_lawyer_id: val === 'firm' ? '' : val, 
                        paid_by_firm: val === 'firm' ? 1 : 0
                      });
                      markFormDirty && markFormDirty();
                    }}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${errors.paid_by ? 'border-red-500' : ''}`}
                  >
                    <option value="">-- {'Select'} --</option>
                    <option value="firm">{'Firm (Direct)'}</option>
                    {lawyers.map(l => (
                      <option key={l.lawyer_id} value={l.lawyer_id}>{l.full_name || l.name}</option>
                    ))}
                  </select>
                  {errors.paid_by && <p className="text-red-500 text-xs mt-1">{errors.paid_by}</p>}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'Currency'}</label>
                  <select 
                    value={sharedData.currency}
                    onChange={(e) => handleSharedChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>

                {/* Billable */}
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={sharedData.billable}
                      onChange={(e) => handleSharedChange('billable', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{'Billable'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Balance Warning */}
            {balanceWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {'Balance will go negative'}:
                </p>
                {balanceWarning.map((w, i) => (
                  <p key={i} className="text-sm text-yellow-700 ml-6">• {w}</p>
                ))}
              </div>
            )}

            {/* Items Error */}
            {errors.items && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <span className="text-sm text-red-600">{errors.items}</span>
              </div>
            )}

            {/* Line Items Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-600">
                  {'Expense Items'}
                </h3>
                {!editingExpense && (
                  <span className="text-xs text-gray-500">
                    {lineItems.length}/20 {'items'}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white">
                    {/* Row Header */}
                    {!editingExpense && lineItems.length > 1 && (
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-500">
                          {tf('Expense {n}', { n: index + 1 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Row 1: Category, Description */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">{'Category'} *</label>
                        <select
                          value={item.category_id}
                          onChange={(e) => updateLineItem(item.id, 'category_id', e.target.value)}
                          className={`w-full px-2 py-2 border rounded-md text-sm ${errors[`item_${item.id}_category`] ? 'border-red-500' : ''}`}
                        >
                          <option value="">-- {'Select'} --</option>
                          {expenseCategories.map(c => (
                            <option key={c.category_id} value={c.category_id}>
                              {c.name_en}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">{'Description'} *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          placeholder={'Expense description...'}
                          className={`w-full px-2 py-2 border rounded-md text-sm ${errors[`item_${item.id}_description`] ? 'border-red-500' : ''}`}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {'Supports Arabic / يدعم العربية'}
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Amount, Attachment Note */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">{'Amount'} *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          className={`w-full px-2 py-2 border rounded-md text-sm ${errors[`item_${item.id}_amount`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">{'Attachment Note'}</label>
                        <input
                          type="text"
                          value={item.attachment_note}
                          onChange={(e) => updateLineItem(item.id, 'attachment_note', e.target.value)}
                          placeholder={'Receipt #...'}
                          className="w-full px-2 py-2 border rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Line Button - only show when adding new (not editing) */}
              {!editingExpense && (
                <button
                  type="button"
                  onClick={addLineItem}
                  disabled={lineItems.length >= 20}
                  className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {'Add Another Expense'}
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                {'Total'}: {sharedData.currency} {totalAmount.toFixed(2)}
                {!editingExpense && validItemsCount > 1 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({validItemsCount} {'expenses'})
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { closeForm('expense'); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  {'Cancel'}
                </button>
                <button 
                  type="submit"
                  disabled={saving || validItemsCount === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving 
                    ? ('Saving...') 
                    : 'Save'
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default ExpenseForm;
