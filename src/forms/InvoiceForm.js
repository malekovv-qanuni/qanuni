// ============================================
// INVOICE FORM COMPONENT (Create Invoice Wizard)
// Extracted from App.js - v42.0.8
// ============================================
import React, { useState } from 'react';

const InvoiceForm = React.memo(({ language, isRTL, editingInvoice, setEditingInvoice, setShowInvoiceForm, showToast, markFormDirty, clearFormDirty, refreshInvoices, refreshTimesheets, refreshExpenses, refreshAdvances, clients, matters, timesheets, expenses, advances, firmInfo, t }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_id: '', matter_id: '', period_start: '', period_end: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0], due_date: '',
    discount_type: 'none', discount_value: '', vat_rate: '11',
    notes_to_client: '', internal_notes: ''
  });
  const [unbilledTimeItems, setUnbilledTimeItems] = useState([]);
  const [unbilledExpenseItems, setUnbilledExpenseItems] = useState([]);
  const [selectedTimeIds, setSelectedTimeIds] = useState([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [fixedFeeItems, setFixedFeeItems] = useState([]);
  const [retainerBalance, setRetainerBalance] = useState(0);
  const [retainerToApply, setRetainerToApply] = useState(0);
  const [applyRetainer, setApplyRetainer] = useState(false);
  const [errors, setErrors] = useState({});

  const filteredMatters = formData.client_id 
    ? matters.filter(m => m.client_id == formData.client_id)
    : [];

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    markFormDirty();
  };

  // Load retainer balance when client changes
  const loadRetainerBalance = async () => {
    if (formData.client_id) {
      try {
        const retainer = await window.electronAPI.getClientRetainer(formData.client_id, formData.matter_id || null);
        if (retainer && retainer.balance_remaining) {
          setRetainerBalance(parseFloat(retainer.balance_remaining));
        } else {
          setRetainerBalance(0);
        }
      } catch (error) {
        console.error('Error loading retainer:', error);
        setRetainerBalance(0);
      }
    }
  };

  const loadUnbilledItems = async () => {
    if (formData.client_id) {
      const time = await window.electronAPI.getUnbilledTime(formData.client_id, formData.matter_id || null);
      const exp = await window.electronAPI.getUnbilledExpenses(formData.client_id, formData.matter_id || null);
      setUnbilledTimeItems(time);
      setUnbilledExpenseItems(exp);
      setSelectedTimeIds(time.map(t => t.timesheet_id));
      setSelectedExpenseIds(exp.map(e => e.expense_id));
      await loadRetainerBalance();
    }
  };

  const calculateTotals = () => {
    // Calculate fees (time + fixed fees)
    const timeTotal = unbilledTimeItems
      .filter(t => selectedTimeIds.includes(t.timesheet_id))
      .reduce((sum, t) => sum + (t.minutes / 60 * (t.rate_per_hour || 0)), 0);
    const fixedTotal = fixedFeeItems.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
    const feesTotal = timeTotal + fixedTotal;
    
    // Calculate expenses (separate from fees)
    const expenseTotal = unbilledExpenseItems
      .filter(e => selectedExpenseIds.includes(e.expense_id))
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Retainer applies to FEES ONLY (Option A)
    const retainerApplied = applyRetainer ? Math.min(retainerToApply, feesTotal, retainerBalance) : 0;
    const netFees = feesTotal - retainerApplied;
    
    // Subtotal = Net Fees + Expenses
    const subtotal = netFees + expenseTotal;
    
    // Discount applies after retainer
    let discountAmount = 0;
    if (formData.discount_type === 'percentage') {
      discountAmount = subtotal * (parseFloat(formData.discount_value) || 0) / 100;
    } else if (formData.discount_type === 'fixed') {
      discountAmount = parseFloat(formData.discount_value) || 0;
    }
    
    const taxableAmount = subtotal - discountAmount;
    const vatAmount = taxableAmount * (parseFloat(formData.vat_rate) || 0) / 100;
    const total = taxableAmount + vatAmount;

    return { feesTotal, expenseTotal, retainerApplied, netFees, subtotal, discountAmount, taxableAmount, vatAmount, total };
  };

  const handleSubmit = async () => {
    try {
      const invoiceNumber = await window.electronAPI.generateInvoiceNumber();
      const totals = calculateTotals();
      
      const items = [
        ...unbilledTimeItems
          .filter(t => selectedTimeIds.includes(t.timesheet_id))
          .map(t => ({
            item_type: 'time',
            item_date: t.date,
            description: t.narrative,
            quantity: (t.minutes / 60).toFixed(2),
            unit: 'hours',
            rate: t.rate_per_hour,
            amount: (t.minutes / 60 * t.rate_per_hour).toFixed(2),
            timesheet_id: t.timesheet_id
          })),
        ...unbilledExpenseItems
          .filter(e => selectedExpenseIds.includes(e.expense_id))
          .map(e => ({
            item_type: 'expense',
            item_date: e.date,
            description: e.description,
            quantity: 1,
            unit: 'units',
            rate: e.amount,
            amount: e.amount,
            expense_id: e.expense_id
          })),
        ...fixedFeeItems.map(f => ({
          item_type: 'fixed_fee',
          item_date: formData.issue_date,
          description: f.description,
          quantity: 1,
          unit: 'fixed',
          rate: f.amount,
          amount: f.amount
        }))
      ];

      await window.electronAPI.createInvoice({
        invoice_number: invoiceNumber,
        client_id: formData.client_id,
        matter_id: formData.matter_id || null,
        period_start: formData.period_start || null,
        period_end: formData.period_end,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        subtotal: totals.feesTotal + totals.expenseTotal, // Original subtotal before retainer
        discount_type: formData.discount_type,
        discount_value: formData.discount_value || 0,
        discount_amount: totals.discountAmount,
        retainer_applied: totals.retainerApplied, // Store retainer applied
        taxable_amount: totals.taxableAmount,
        vat_rate: formData.vat_rate || 0,
        vat_amount: totals.vatAmount,
        total: totals.total,
        currency: 'USD',
        notes_to_client: formData.notes_to_client,
        internal_notes: formData.internal_notes
      }, items);

      // Deduct retainer from advance if applied
      if (totals.retainerApplied > 0) {
        try {
          await window.electronAPI.deductRetainer(formData.client_id, formData.matter_id || null, 'client_retainer', totals.retainerApplied);
        } catch (error) {
          console.error('Error deducting retainer:', error);
        }
      }

      await refreshInvoices();
      clearFormDirty();
      showToast(language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
      setShowInvoiceForm(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      showToast(language === 'ar' ? 'خطأ في إنشاء الفاتورة' : 'Error creating invoice', 'error');
    }
  };

  const totals = calculateTotals();
  const maxRetainer = Math.min(totals.feesTotal, retainerBalance);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{t[language].createInvoice}</h2>
          
          {/* Step Indicator */}
          <div className="flex items-center mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
          </div>

          {/* Step 1: Select Client & Matter */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].client} *</label>
                  <select required value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value, matter_id: ''})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t[language].selectClient}</option>
                    {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].matter}</label>
                  <select value={formData.matter_id}
                    onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">All Matters</option>
                    {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.matter_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].periodStart}</label>
                  <input type="date" value={formData.period_start}
                    onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].periodEnd}</label>
                  <input type="date" value={formData.period_end}
                    onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowInvoiceForm(false); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{t[language].cancel}</button>
                <button type="button" onClick={() => { loadUnbilledItems(); setStep(2); }}
                  disabled={!formData.client_id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Items */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Unbilled Time */}
              <div>
                <h3 className="font-semibold mb-2">{t[language].unbilledTime} ({unbilledTimeItems.length})</h3>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {unbilledTimeItems.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">{t[language].noData}</p>
                  ) : (
                    unbilledTimeItems.map(t => (
                      <label key={t.timesheet_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                        <input type="checkbox" checked={selectedTimeIds.includes(t.timesheet_id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTimeIds([...selectedTimeIds, t.timesheet_id]);
                            else setSelectedTimeIds(selectedTimeIds.filter(id => id !== t.timesheet_id));
                          }}
                          className="w-4 h-4" />
                        <span className="flex-1 text-sm">{t.date} - {t.narrative}</span>
                        <span className="text-sm text-gray-500">{(t.minutes/60).toFixed(2)}h @ ${t.rate_per_hour}</span>
                        <span className="text-sm font-medium">${(t.minutes/60 * t.rate_per_hour).toFixed(2)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Unbilled Expenses */}
              <div>
                <h3 className="font-semibold mb-2">{t[language].unbilledExpenses} ({unbilledExpenseItems.length})</h3>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {unbilledExpenseItems.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">{t[language].noData}</p>
                  ) : (
                    unbilledExpenseItems.map(e => (
                      <label key={e.expense_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                        <input type="checkbox" checked={selectedExpenseIds.includes(e.expense_id)}
                          onChange={(ev) => {
                            if (ev.target.checked) setSelectedExpenseIds([...selectedExpenseIds, e.expense_id]);
                            else setSelectedExpenseIds(selectedExpenseIds.filter(id => id !== e.expense_id));
                          }}
                          className="w-4 h-4" />
                        <span className="flex-1 text-sm">{e.date} - {e.description}</span>
                        <span className="text-sm font-medium">${parseFloat(e.amount).toFixed(2)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Fixed Fee Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{t[language].fixedFeeItem}</h3>
                  <button type="button" onClick={() => setFixedFeeItems([...fixedFeeItems, {description: '', amount: ''}])}
                    className="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
                </div>
                {fixedFeeItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Description" value={item.description}
                      onChange={(e) => {
                        const updated = [...fixedFeeItems];
                        updated[index].description = e.target.value;
                        setFixedFeeItems(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-md" />
                    <input type="number" placeholder="Amount" value={item.amount}
                      onChange={(e) => {
                        const updated = [...fixedFeeItems];
                        updated[index].amount = e.target.value;
                        setFixedFeeItems(updated);
                      }}
                      className="w-32 px-3 py-2 border rounded-md" />
                    <button type="button" onClick={() => setFixedFeeItems(fixedFeeItems.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md">×</button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-4">
                <button type="button" onClick={() => setStep(1)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">Back</button>
                <button type="button" onClick={() => setStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Next</button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Finalize */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].issueDate}</label>
                  <input type="date" value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].dueDate}</label>
                  <input type="date" value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].discountType}</label>
                  <select value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="none">None</option>
                    <option value="percentage">{t[language].percentage}</option>
                    <option value="fixed">{t[language].fixed}</option>
                  </select>
                </div>
                {formData.discount_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t[language].discount} {formData.discount_type === 'percentage' ? '%' : '$'}</label>
                    <input type="number" value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t[language].vatRate} %</label>
                  <input type="number" value={formData.vat_rate}
                    onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              {/* Retainer Application Section */}
              {retainerBalance > 0 && totals.feesTotal > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-green-800">{t[language].clientRetainer}</h4>
                      <p className="text-sm text-green-600">{t[language].availableBalance}: ${retainerBalance.toFixed(2)}</p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={applyRetainer}
                        onChange={(e) => {
                          setApplyRetainer(e.target.checked);
                          if (e.target.checked) {
                            setRetainerToApply(maxRetainer);
                          } else {
                            setRetainerToApply(0);
                          }
                        }}
                        className="w-4 h-4" />
                      <span className="text-sm font-medium">{t[language].applyRetainer}</span>
                    </label>
                  </div>
                  {applyRetainer && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm">{t[language].amountToApply}:</label>
                      <input type="number" value={retainerToApply}
                        min="0" max={maxRetainer} step="0.01"
                        onChange={(e) => setRetainerToApply(Math.min(parseFloat(e.target.value) || 0, maxRetainer))}
                        className="w-32 px-3 py-1 border rounded-md" />
                      <button type="button" onClick={() => setRetainerToApply(maxRetainer)}
                        className="text-sm text-blue-600 hover:underline">{t[language].applyMax}</button>
                      <span className="text-sm text-gray-500">(max: ${maxRetainer.toFixed(2)})</span>
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-2 italic">{t[language].retainerAppliedToFeesOnly}</p>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between py-1 text-sm">
                  <span>{t[language].professionalFees}:</span>
                  <span>${totals.feesTotal.toFixed(2)}</span>
                </div>
                {totals.retainerApplied > 0 && (
                  <div className="flex justify-between py-1 text-sm text-green-600">
                    <span>{t[language].lessRetainer}:</span>
                    <span>-${totals.retainerApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm border-b">
                  <span>{t[language].netFees}:</span>
                  <span>${totals.netFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>{t[language].disbursements}:</span>
                  <span>${totals.expenseTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-medium border-t">
                  <span>{t[language].subtotal}:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-red-600">
                    <span>{t[language].discount}:</span>
                    <span>-${totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>VAT ({formData.vat_rate}%):</span>
                  <span>${totals.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t-2">
                  <span>{t[language].total}:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t[language].notesToClient}</label>
                <textarea value={formData.notes_to_client} rows="2"
                  onChange={(e) => setFormData({...formData, notes_to_client: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>

              <div className="flex justify-between items-center mt-4">
                <button type="button" onClick={() => setStep(2)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">Back</button>
                <button type="button" onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  {t[language].generateInvoice}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default InvoiceForm;
