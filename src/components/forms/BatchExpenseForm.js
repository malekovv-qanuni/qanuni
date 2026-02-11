// ============================================
// BATCH EXPENSE FORM COMPONENT
// Version: v46.44 - Added Arabic support hint
// ============================================
import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

const BatchExpenseForm = React.memo(({ 
  setShowBatchExpenseForm, 
  showToast, 
  refreshExpenses, 
  refreshAdvances,
  clients, 
  matters, 
  expenseCategories, 
  lawyers}) => {
  // Shared fields
  const [sharedData, setSharedData] = useState({
    client_id: '',
    matter_id: '',
    date: new Date().toISOString().split('T')[0],
    paid_by_lawyer_id: '',
    paid_by_firm: 0,
    currency: 'USD',
    billable: true
  });

  // Line items - start with 2 empty rows
  const [lineItems, setLineItems] = useState([
    { id: 1, category_id: '', description: '', amount: '', attachment_note: '' },
    { id: 2, category_id: '', description: '', amount: '', attachment_note: '' }
  ]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Filter matters by selected client
  const filteredMatters = sharedData.client_id 
    ? matters.filter(m => m.client_id == sharedData.client_id)
    : [];

  // Add new line item
  const addLineItem = () => {
    if (lineItems.length >= 20) {
      showToast('Maximum 20 items allowed', 'error');
      return;
    }
    const newId = Math.max(...lineItems.map(l => l.id)) + 1;
    setLineItems([...lineItems, { id: newId, category_id: '', description: '', amount: '', attachment_note: '' }]);
  };

  // Remove line item
  const removeLineItem = (id) => {
    if (lineItems.length <= 1) {
      showToast('At least one item required', 'error');
      return;
    }
    setLineItems(lineItems.filter(l => l.id !== id));
  };

  // Update line item
  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  // Calculate total
  const totalAmount = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  // Count valid items (have category, description, and amount)
  const validItemsCount = lineItems.filter(item => 
    item.category_id && item.description && item.amount && parseFloat(item.amount) > 0
  ).length;

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
      newErrors.items = 'Enter at least one item with category, description, and amount';
    }

    // Validate individual items that have partial data
    lineItems.forEach((item, index) => {
      const hasAnyData = item.category_id || item.description || item.amount;
      if (hasAnyData) {
        if (!item.category_id) {
          newErrors[`item_${item.id}_category`] = true;
        }
        if (!item.description) {
          newErrors[`item_${item.id}_description`] = true;
        }
        if (!item.amount || parseFloat(item.amount) <= 0) {
          newErrors[`item_${item.id}_amount`] = true;
        }
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
      // Filter only valid items
      const validItems = lineItems.filter(item => 
        item.category_id && item.description && item.amount && parseFloat(item.amount) > 0
      );

      // Build expenses array
      const expenses = validItems.map(item => ({
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
        expense_type: 'client',
        status: 'pending',
        notes: ''
      }));

      // Call batch API
      await window.electronAPI.addExpensesBatch(expenses);
      
      await Promise.all([refreshExpenses(), refreshAdvances()]);
      
      showToast(
        `${expenses.length} expenses added successfully`
      );
      setShowBatchExpenseForm(false);
    } catch (error) {
      console.error('Error saving batch expenses:', error);
      showToast('Error saving expenses', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {'Add Multiple Expenses'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shared Fields Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">
                {'Shared Information'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Client */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'Client'} *</label>
                  <select 
                    value={sharedData.client_id}
                    onChange={(e) => setSharedData({...sharedData, client_id: e.target.value, matter_id: ''})}
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
                    onChange={(e) => setSharedData({...sharedData, matter_id: e.target.value})}
                    disabled={!sharedData.client_id}
                    className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100"
                  >
                    <option value="">{sharedData.client_id ? ('Select Matter') : ('Select Client First')}</option>
                    {filteredMatters.map(m => (
                      <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">{'DATE'} *</label>
                  <input 
                    type="date" 
                    value={sharedData.date}
                    onChange={(e) => setSharedData({...sharedData, date: e.target.value})}
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
                    onChange={(e) => setSharedData({...sharedData, currency: e.target.value})}
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
                      onChange={(e) => setSharedData({...sharedData, billable: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{'Billable'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-600">
                  {'Line Items'}
                </h3>
                <span className="text-xs text-gray-500">
                  {lineItems.length}/20 {'items'}
                </span>
              </div>

              {errors.items && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600">{errors.items}</span>
                </div>
              )}

              <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                  <div className="col-span-3">{'Category'} *</div>
                  <div className="col-span-4">{'Description'} *</div>
                  <div className="col-span-2">{'Amount'} *</div>
                  <div className="col-span-2">{'Attach.'}</div>
                  <div className="col-span-1"></div>
                </div>
                <p className="text-xs text-gray-400 px-2 -mt-1">
                  {'Description supports Arabic / يدعم العربية'}
                </p>

                {/* Line Items */}
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    {/* Category */}
                    <div className="col-span-3">
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

                    {/* Description */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder={'Expense description...'}
                        className={`w-full px-2 py-2 border rounded-md text-sm ${errors[`item_${item.id}_description`] ? 'border-red-500' : ''}`}
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-2 py-2 border rounded-md text-sm ${errors[`item_${item.id}_amount`] ? 'border-red-500' : ''}`}
                      />
                    </div>

                    {/* Attachment Note */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.attachment_note}
                        onChange={(e) => updateLineItem(item.id, 'attachment_note', e.target.value)}
                        placeholder={'Receipt #...'}
                        className="w-full px-2 py-2 border rounded-md text-sm"
                      />
                    </div>

                    {/* Delete Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length <= 1}
                        className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Line Button */}
              <button
                type="button"
                onClick={addLineItem}
                disabled={lineItems.length >= 20}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {'Add Line'}
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                {'Total'}: {sharedData.currency} {totalAmount.toFixed(2)}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({validItemsCount} {'items'})
                </span>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowBatchExpenseForm(false)}
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
                    : `${'Save'} (${validItemsCount})`
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

export default BatchExpenseForm;
