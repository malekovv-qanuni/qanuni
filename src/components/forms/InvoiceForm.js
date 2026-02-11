// ============================================
// INVOICE FORM COMPONENT (Create Invoice Wizard)
// Extracted from App.js - v46.46
// v46.46: Added useMemo optimizations for performance
// v46.44: Added Arabic support hint
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { FormField } from '../common';
import { useUI } from '../../contexts';
import apiClient from '../../api-client';

const InvoiceForm = React.memo(({ showToast, markFormDirty, clearFormDirty, refreshInvoices, refreshTimesheets, refreshExpenses, refreshAdvances, clients, matters, timesheets, expenses, advances, firmInfo}) => {
  const { forms, closeForm } = useUI();
  const { editing: editingInvoice } = forms.invoice;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_id: '', matter_id: '', period_start: '', period_end: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0], due_date: '',
    discount_type: 'none', discount_value: '', vat_rate: '11',
    notes_to_client: '', internal_notes: '',
    client_reference: '', // Option A: PO number / client's internal reference
    invoice_content_type: 'combined' // D9: 'fees_only', 'expenses_only', 'combined'
  });
  const [generateSupportingDocs, setGenerateSupportingDocs] = useState(true); // D9: Generate timesheet/expense PDFs
  const [unbilledTimeItems, setUnbilledTimeItems] = useState([]);
  const [unbilledExpenseItems, setUnbilledExpenseItems] = useState([]);
  const [selectedTimeIds, setSelectedTimeIds] = useState([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [fixedFeeItems, setFixedFeeItems] = useState([]);
  const [retainerBalance, setRetainerBalance] = useState(0);
  const [retainerToApply, setRetainerToApply] = useState(0);
  const [applyRetainer, setApplyRetainer] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // v46.4: Fee arrangement state
  const [matterFeeInfo, setMatterFeeInfo] = useState(null);
  const [invoiceType, setInvoiceType] = useState('fixed'); // For fixed_success: 'fixed' or 'success'
  const [manualFeeAmount, setManualFeeAmount] = useState(''); // For manual fee entry

  // v46.46: Memoize filtered matters to prevent recalculation on every render
  const filteredMatters = useMemo(() => 
    formData.client_id ? matters.filter(m => m.client_id == formData.client_id) : [],
    [formData.client_id, matters]
  );

  // v46.37: Populate form when editing existing invoice
  useEffect(() => {
    if (editingInvoice) {
      setFormData({
        client_id: editingInvoice.client_id || '',
        matter_id: editingInvoice.matter_id || '',
        period_start: editingInvoice.period_start || '',
        period_end: editingInvoice.period_end || new Date().toISOString().split('T')[0],
        issue_date: editingInvoice.issue_date || new Date().toISOString().split('T')[0],
        due_date: editingInvoice.due_date || '',
        discount_type: editingInvoice.discount_type || 'none',
        discount_value: editingInvoice.discount_value || '',
        vat_rate: editingInvoice.vat_rate || '11',
        notes_to_client: editingInvoice.notes_to_client || '',
        internal_notes: editingInvoice.internal_notes || '',
        client_reference: editingInvoice.client_reference || '',
        invoice_content_type: editingInvoice.invoice_content_type || 'combined'
      });
      // Skip to step 3 (review) when editing since items are already defined
      setStep(3);
      // Load existing invoice items
      loadExistingInvoiceItems(editingInvoice.invoice_id);
    } else {
      // Reset to step 1 for new invoices
      setStep(1);
      setFormData({
        client_id: '', matter_id: '', period_start: '', period_end: new Date().toISOString().split('T')[0],
        issue_date: new Date().toISOString().split('T')[0], due_date: '',
        discount_type: 'none', discount_value: '', vat_rate: '11',
        notes_to_client: '', internal_notes: '',
        client_reference: '',
        invoice_content_type: 'combined'
      });
      setSelectedTimeIds([]);
      setSelectedExpenseIds([]);
      setFixedFeeItems([]);
      setGenerateSupportingDocs(true);
    }
  }, [editingInvoice]);

  // Load existing invoice items when editing
  const loadExistingInvoiceItems = async (invoiceId) => {
    try {
      const items = await apiClient.getInvoiceItems(invoiceId);
      if (items && items.length > 0) {
        // Separate by type
        const timeItems = items.filter(i => i.item_type === 'time');
        const expenseItems = items.filter(i => i.item_type === 'expense');
        const fixedItems = items.filter(i => i.item_type === 'fixed_fee');
        
        // Convert to form format
        setUnbilledTimeItems(timeItems.map(t => ({
          timesheet_id: t.timesheet_id || `existing-${t.item_id}`,
          date: t.item_date,
          narrative: t.description,
          minutes: parseFloat(t.quantity) * 60,
          rate_per_hour: parseFloat(t.rate)
        })));
        setSelectedTimeIds(timeItems.map(t => t.timesheet_id || `existing-${t.item_id}`));
        
        setUnbilledExpenseItems(expenseItems.map(e => ({
          expense_id: e.expense_id || `existing-${e.item_id}`,
          date: e.item_date,
          description: e.description,
          amount: parseFloat(e.amount)
        })));
        setSelectedExpenseIds(expenseItems.map(e => e.expense_id || `existing-${e.item_id}`));
        
        setFixedFeeItems(fixedItems.map(f => ({
          description: f.description,
          amount: f.amount
        })));
      }
    } catch (error) {
      console.error('Error loading invoice items:', error);
    }
  };

  // v46.4: Load fee info when matter changes
  useEffect(() => {
    if (formData.matter_id) {
      const selectedMatter = matters.find(m => m.matter_id === formData.matter_id);
      if (selectedMatter) {
        setMatterFeeInfo({
          fee_arrangement: selectedMatter.fee_arrangement,
          agreed_fee_amount: selectedMatter.agreed_fee_amount,
          agreed_fee_currency: selectedMatter.agreed_fee_currency || 'USD',
          success_fee_type: selectedMatter.success_fee_type,
          success_fee_percentage: selectedMatter.success_fee_percentage,
          success_fee_fixed_amount: selectedMatter.success_fee_fixed_amount,
          success_fee_currency: selectedMatter.success_fee_currency || 'USD',
          custom_hourly_rate: selectedMatter.custom_hourly_rate,
          custom_hourly_currency: selectedMatter.custom_hourly_currency || 'USD'
        });
        // Pre-fill manual fee amount based on fee type
        if (['fixed', 'recurrent'].includes(selectedMatter.fee_arrangement) && selectedMatter.agreed_fee_amount) {
          setManualFeeAmount(selectedMatter.agreed_fee_amount.toString());
        } else {
          setManualFeeAmount('');
        }
      } else {
        setMatterFeeInfo(null);
        setManualFeeAmount('');
      }
    } else {
      setMatterFeeInfo(null);
      setManualFeeAmount('');
    }
  }, [formData.matter_id, matters]);

  // Helper: Check if fee type requires showing unbilled time
  const showUnbilledTime = () => {
    if (!matterFeeInfo || !matterFeeInfo.fee_arrangement) return true; // Default to hourly
    return ['hourly', ''].includes(matterFeeInfo.fee_arrangement);
  };

  // Helper: Get fee type label
  const getFeeTypeLabel = () => {
    if (!matterFeeInfo || !matterFeeInfo.fee_arrangement) return 'Hourly (Default)';
    const labels = {
      'hourly': 'Hourly',
      'fixed': 'Fixed Fee',
      'recurrent': 'Recurrent Fee',
      'success': 'Success Fee',
      'fixed_success': 'Fixed + Success Fee'
    };
    return labels[matterFeeInfo.fee_arrangement] || matterFeeInfo.fee_arrangement;
  };

  // Validation functions
  const validateField = (name, value) => {
    switch (name) {
      case 'client_id':
        if (!value) return 'Client is required';
        break;
      case 'issue_date':
        if (!value) return 'Issue date is required';
        break;
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

  const inputClass = (hasError) => `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500 bg-red-50' : ''}`;

  // Step validation
  const validateStep1 = () => {
    if (!formData.client_id) {
      setErrors({ client_id: 'Client is required' });
      setTouched({ client_id: true });
      showToast('Please select a client', 'error');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.issue_date) {
      setErrors(prev => ({ ...prev, issue_date: 'Issue date is required' }));
      showToast('Please set an issue date', 'error');
      return false;
    }
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      loadUnbilledItems();
      setStep(2);
    }
  };

  // Load retainer balance when client changes
  const loadRetainerBalance = async () => {
    if (formData.client_id) {
      try {
        const retainer = await apiClient.getClientRetainer(formData.client_id, formData.matter_id || null);
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
      const time = await apiClient.getUnbilledTime(formData.client_id, formData.matter_id || null);
      const exp = await apiClient.getUnbilledExpenses(formData.client_id, formData.matter_id || null);
      setUnbilledTimeItems(time);
      setUnbilledExpenseItems(exp);
      setSelectedTimeIds(time.map(t => t.timesheet_id));
      setSelectedExpenseIds(exp.map(e => e.expense_id));
      await loadRetainerBalance();
    }
  };

  const calculateTotals = () => {
    // Calculate fees based on fee arrangement type (only if content includes fees)
    let feesTotal = 0;
    
    if (formData.invoice_content_type !== 'expenses_only') {
      if (showUnbilledTime()) {
        // Hourly: calculate from selected time entries + fixed fee items
        const timeTotal = unbilledTimeItems
          .filter(t => selectedTimeIds.includes(t.timesheet_id))
          .reduce((sum, t) => sum + (t.minutes / 60 * (t.rate_per_hour || 0)), 0);
        const fixedTotal = fixedFeeItems.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        feesTotal = timeTotal + fixedTotal;
      } else {
        // Non-hourly: use manual fee amount + any additional fixed fee items
        feesTotal = parseFloat(manualFeeAmount) || 0;
        const fixedTotal = fixedFeeItems.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        feesTotal += fixedTotal;
      }
    }
    
    // Calculate expenses (only if content includes expenses)
    let expenseTotal = 0;
    if (formData.invoice_content_type !== 'fees_only') {
      expenseTotal = unbilledExpenseItems
        .filter(e => selectedExpenseIds.includes(e.expense_id))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    }
    
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
    if (!validateStep3()) return;
    
    try {
      const invoiceNumber = await apiClient.generateInvoiceNumber();
      const totals = calculateTotals();
      
      const items = [];
      
      // Add time entries only for hourly fee types AND if content includes fees
      if (formData.invoice_content_type !== 'expenses_only') {
        if (showUnbilledTime()) {
          unbilledTimeItems
            .filter(t => selectedTimeIds.includes(t.timesheet_id))
            .forEach(t => {
              items.push({
                item_type: 'time',
                item_date: t.date,
                description: t.narrative,
                quantity: (t.minutes / 60).toFixed(2),
                unit: 'hours',
                rate: t.rate_per_hour,
                amount: (t.minutes / 60 * t.rate_per_hour).toFixed(2),
                timesheet_id: t.timesheet_id
              });
            });
        }
        
        // Add manual fee for non-hourly arrangements
        if (!showUnbilledTime() && parseFloat(manualFeeAmount) > 0) {
          let feeDescription = '';
          const feeType = matterFeeInfo?.fee_arrangement || 'fixed';
          
          if (feeType === 'fixed') {
            feeDescription = 'Fixed Fee';
          } else if (feeType === 'recurrent') {
            feeDescription = 'Retainer Fee';
          } else if (feeType === 'success') {
            feeDescription = 'Success Fee';
          } else if (feeType === 'fixed_success') {
            feeDescription = invoiceType === 'fixed' 
              ? ('Fixed Fee (Upfront)')
              : ('Success Fee');
          }
          
          items.push({
            item_type: 'fixed_fee',
            item_date: formData.issue_date,
            description: feeDescription,
            quantity: 1,
            unit: 'fixed',
            rate: manualFeeAmount,
            amount: manualFeeAmount
          });
        }
        
        // Add additional fixed fee items (manual entries)
        fixedFeeItems.forEach(f => {
          if (f.description && f.amount) {
            items.push({
              item_type: 'fixed_fee',
              item_date: formData.issue_date,
              description: f.description,
              quantity: 1,
              unit: 'fixed',
              rate: f.amount,
              amount: f.amount
            });
          }
        });
      }
      
      // Add expenses only if content includes expenses
      if (formData.invoice_content_type !== 'fees_only') {
        unbilledExpenseItems
          .filter(e => selectedExpenseIds.includes(e.expense_id))
          .forEach(e => {
            items.push({
              item_type: 'expense',
              item_date: e.date,
              description: e.description,
              quantity: 1,
              unit: 'units',
              rate: e.amount,
              amount: e.amount,
              expense_id: e.expense_id
            });
          });
      }

      const result = await apiClient.createInvoice({
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
        internal_notes: formData.internal_notes,
        client_reference: formData.client_reference || null,
        invoice_content_type: formData.invoice_content_type
      }, items);

      // Deduct retainer from advance if applied
      if (totals.retainerApplied > 0) {
        try {
          await apiClient.deductRetainer(formData.client_id, formData.matter_id || null, 'client_retainer', totals.retainerApplied);
        } catch (error) {
          console.error('Error deducting retainer:', error);
        }
      }

      // Generate supporting documents if requested
      if (generateSupportingDocs && result?.invoice_id) {
        try {
          const pdfResult = await apiClient.generateInvoicePdfs(result.invoice_id, {
            generateTimesheet: formData.invoice_content_type !== 'expenses_only' && items.some(i => i.item_type === 'time'),
            generateExpenses: formData.invoice_content_type !== 'fees_only' && items.some(i => i.item_type === 'expense')
          });
          if (pdfResult?.success) {
            showToast(`Invoice created with ${pdfResult.files?.length || 1} document(s)`);
          }
        } catch (error) {
          console.error('Error generating supporting documents:', error);
          // Don't fail the invoice creation, just warn
          showToast('Invoice created (attachments failed)', 'warning');
        }
      } else {
        showToast('Invoice created successfully');
      }

      await refreshInvoices();
      clearFormDirty();
      closeForm('invoice');
    } catch (error) {
      console.error('Error creating invoice:', error);
      showToast('Error creating invoice', 'error');
    }
  };

  // v46.46: Memoize totals calculation to prevent recalculation on every render
  const totals = useMemo(() => calculateTotals(), [
    unbilledTimeItems, selectedTimeIds, unbilledExpenseItems, selectedExpenseIds,
    fixedFeeItems, manualFeeAmount, applyRetainer, retainerToApply, retainerBalance,
    formData.discount_type, formData.discount_value, formData.vat_rate, formData.invoice_content_type,
    matterFeeInfo
  ]);
  const maxRetainer = Math.min(totals.feesTotal, retainerBalance);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{'Create Invoice'}</h2>
          
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
                <FormField label={'Client'} required error={errors.client_id}>
                  <select value={formData.client_id}
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
                  <select value={formData.matter_id}
                    onChange={(e) => setFormData({...formData, matter_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="">{'All Matters'}</option>
                    {filteredMatters.map(m => <option key={m.matter_id} value={m.matter_id}>{`${m.custom_matter_number ? '[' + m.custom_matter_number + '] ' : ''}${m.matter_name}${m.case_number ? ' — ' + m.case_number : ''}${m.court_name ? ' — ' + m.court_name : ''}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{'Period Start'}</label>
                  <input type="date" value={formData.period_start}
                    onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{'Period End'}</label>
                  <input type="date" value={formData.period_end}
                    onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              
              {/* Invoice Content Type Selector (D9) */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  {'Invoice Content'}
                </label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="invoice_content_type"
                      checked={formData.invoice_content_type === 'combined'}
                      onChange={() => setFormData({...formData, invoice_content_type: 'combined'})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">{'Fees & Expenses (Combined)'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="invoice_content_type"
                      checked={formData.invoice_content_type === 'fees_only'}
                      onChange={() => setFormData({...formData, invoice_content_type: 'fees_only'})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">{'Fees Only'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="invoice_content_type"
                      checked={formData.invoice_content_type === 'expenses_only'}
                      onChange={() => setFormData({...formData, invoice_content_type: 'expenses_only'})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">{'Expenses Only'}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { closeForm('invoice'); clearFormDirty(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Cancel'}</button>
                <button type="button" onClick={goToStep2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Items */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Fee Arrangement Info Banner */}
              {formData.matter_id && matterFeeInfo && matterFeeInfo.fee_arrangement && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{'Fee Arrangement:'}</span>{' '}
                    {getFeeTypeLabel()}
                    {matterFeeInfo.agreed_fee_amount && ['fixed', 'recurrent'].includes(matterFeeInfo.fee_arrangement) && (
                      <span className="ml-2">
                        ({'Agreed:'} {matterFeeInfo.agreed_fee_currency} {matterFeeInfo.agreed_fee_amount.toLocaleString()})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Invoice Type Selector for Fixed + Success */}
              {matterFeeInfo?.fee_arrangement === 'fixed_success' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    {'Invoice Type'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="invoice_type"
                        checked={invoiceType === 'fixed'}
                        onChange={() => {
                          setInvoiceType('fixed');
                          setManualFeeAmount(matterFeeInfo.agreed_fee_amount?.toString() || '');
                        }}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium text-purple-800">
                        {'Fixed Fee (Upfront)'}
                      </span>
                      {matterFeeInfo.agreed_fee_amount && (
                        <span className="text-xs text-purple-600">
                          ({matterFeeInfo.agreed_fee_currency} {matterFeeInfo.agreed_fee_amount.toLocaleString()})
                        </span>
                      )}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="invoice_type"
                        checked={invoiceType === 'success'}
                        onChange={() => {
                          setInvoiceType('success');
                          if (matterFeeInfo.success_fee_type === 'fixed' && matterFeeInfo.success_fee_fixed_amount) {
                            setManualFeeAmount(matterFeeInfo.success_fee_fixed_amount.toString());
                          } else {
                            setManualFeeAmount('');
                          }
                        }}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium text-purple-800">
                        {'Success Fee'}
                      </span>
                      {matterFeeInfo.success_fee_type === 'percentage' && matterFeeInfo.success_fee_percentage && (
                        <span className="text-xs text-purple-600">({matterFeeInfo.success_fee_percentage}%)</span>
                      )}
                      {matterFeeInfo.success_fee_type === 'fixed' && matterFeeInfo.success_fee_fixed_amount && (
                        <span className="text-xs text-purple-600">
                          ({matterFeeInfo.success_fee_currency} {matterFeeInfo.success_fee_fixed_amount.toLocaleString()})
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Unbilled Time - Only for Hourly or Not Set, AND if content includes fees */}
              {formData.invoice_content_type !== 'expenses_only' && showUnbilledTime() && (
                <div>
                  <h3 className="font-semibold mb-2">{'Unbilled Time'} ({unbilledTimeItems.length})</h3>
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {unbilledTimeItems.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">{'No data'}</p>
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
              )}

              {/* Fee Amount Entry - For Non-Hourly Arrangements, AND if content includes fees */}
              {formData.invoice_content_type !== 'expenses_only' && !showUnbilledTime() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3">
                    {matterFeeInfo?.fee_arrangement === 'fixed_success' 
                      ? (invoiceType === 'fixed' 
                          ? ('Fixed Fee Amount')
                          : ('Success Fee Amount'))
                      : ('Fee Amount')
                    }
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        value={manualFeeAmount}
                        onChange={(e) => setManualFeeAmount(e.target.value)}
                        placeholder={'Enter amount...'}
                        className="w-full px-3 py-2 border rounded-md text-lg"
                      />
                    </div>
                    <span className="text-lg font-medium text-green-800">
                      {matterFeeInfo?.agreed_fee_currency || 'USD'}
                    </span>
                  </div>
                  {/* Helpful info based on fee type */}
                  {matterFeeInfo?.fee_arrangement === 'fixed' && matterFeeInfo.agreed_fee_amount && (
                    <p className="text-xs text-green-600 mt-2">
                      {'Agreed amount:'} {matterFeeInfo.agreed_fee_currency} {matterFeeInfo.agreed_fee_amount.toLocaleString()}
                      {parseFloat(manualFeeAmount) < matterFeeInfo.agreed_fee_amount && (
                        <span className="ml-2">({'Partial payment'})</span>
                      )}
                    </p>
                  )}
                  {matterFeeInfo?.fee_arrangement === 'success' && matterFeeInfo.success_fee_type === 'percentage' && (
                    <p className="text-xs text-green-600 mt-2">
                      {'Agreed percentage:'} {matterFeeInfo.success_fee_percentage}%
                    </p>
                  )}
                </div>
              )}

              {/* Unbilled Expenses - Always Available */}
              {/* Unbilled Expenses - Only if content includes expenses */}
              {formData.invoice_content_type !== 'fees_only' && (
              <div>
                <h3 className="font-semibold mb-2">{'Unbilled Expenses'} ({unbilledExpenseItems.length})</h3>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {unbilledExpenseItems.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">{'No data'}</p>
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
              )}

              {/* Additional Fixed Fee Items - Only if content includes fees */}
              {formData.invoice_content_type !== 'expenses_only' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    {'Additional Items'}
                  </h3>
                  <button type="button" onClick={() => setFixedFeeItems([...fixedFeeItems, {description: '', amount: ''}])}
                    className="text-sm text-blue-600 hover:text-blue-800">+ {'Add Item'}</button>
                </div>
                {fixedFeeItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input type="text" placeholder={'Description'} value={item.description}
                      onChange={(e) => {
                        const updated = [...fixedFeeItems];
                        updated[index].description = e.target.value;
                        setFixedFeeItems(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-md" />
                    <input type="number" placeholder={'Amount'} value={item.amount}
                      onChange={(e) => {
                        const updated = [...fixedFeeItems];
                        updated[index].amount = e.target.value;
                        setFixedFeeItems(updated);
                      }}
                      className="w-32 px-3 py-2 border rounded-md" />
                    <button type="button" onClick={() => setFixedFeeItems(fixedFeeItems.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md">أ—</button>
                  </div>
                ))}
              </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <button type="button" onClick={() => setStep(1)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Back'}</button>
                <button type="button" onClick={() => setStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{'Next'}</button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Finalize */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={'Issue Date'} required error={errors.issue_date}>
                  <input type="date" value={formData.issue_date}
                    onChange={(e) => handleFieldChange('issue_date', e.target.value)}
                    onBlur={() => handleBlur('issue_date')}
                    className={inputClass(errors.issue_date)} />
                </FormField>
                <div>
                  <label className="block text-sm font-medium mb-1">{'Due Date'}</label>
                  <input type="date" value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                
                {/* Client Reference (Option A: PO Number) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {'Client Reference / PO #'}
                  </label>
                  <input type="text" value={formData.client_reference}
                    onChange={(e) => setFormData({...formData, client_reference: e.target.value})}
                    placeholder={'Optional'}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{'Discount Type'}</label>
                  <select value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md">
                    <option value="none">{'None'}</option>
                    <option value="percentage">{'Percentage'}</option>
                    <option value="fixed">{'Fixed'}</option>
                  </select>
                </div>
                {formData.discount_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{'Discount'} {formData.discount_type === 'percentage' ? '%' : '$'}</label>
                    <input type="number" value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{'VAT Rate'} %</label>
                  <input type="number" value={formData.vat_rate}
                    onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              
              {/* Generate Supporting Documents Checkbox (D9) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={generateSupportingDocs}
                    onChange={(e) => setGenerateSupportingDocs(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600"
                  />
                  <div>
                    <span className="font-medium text-blue-800">
                      {'Generate Supporting Documents'}
                    </span>
                    <p className="text-xs text-blue-600 mt-1">
                      {'Separate PDF files: Detailed timesheet report and expense itemization'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Retainer Application Section */}
              {retainerBalance > 0 && totals.feesTotal > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-green-800">{'Client Retainer'}</h4>
                      <p className="text-sm text-green-600">{'Available Balance'}: ${retainerBalance.toFixed(2)}</p>
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
                      <span className="text-sm font-medium">{'Apply Retainer'}</span>
                    </label>
                  </div>
                  {applyRetainer && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm">{'Amount to Apply'}:</label>
                      <input type="number" value={retainerToApply}
                        min="0" max={maxRetainer} step="0.01"
                        onChange={(e) => setRetainerToApply(Math.min(parseFloat(e.target.value) || 0, maxRetainer))}
                        className="w-32 px-3 py-1 border rounded-md" />
                      <button type="button" onClick={() => setRetainerToApply(maxRetainer)}
                        className="text-sm text-blue-600 hover:underline">{'Apply Max'}</button>
                      <span className="text-sm text-gray-500">(max: ${maxRetainer.toFixed(2)})</span>
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-2 italic">{'Note: Retainer is applied to professional fees only, not expenses'}</p>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between py-1 text-sm">
                  <span>{'Professional Fees'}:</span>
                  <span>${totals.feesTotal.toFixed(2)}</span>
                </div>
                {totals.retainerApplied > 0 && (
                  <div className="flex justify-between py-1 text-sm text-green-600">
                    <span>{'Less: Retainer Applied'}:</span>
                    <span>-${totals.retainerApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm border-b">
                  <span>{'Net Professional Fees'}:</span>
                  <span>${totals.netFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>{'Disbursements/Expenses'}:</span>
                  <span>${totals.expenseTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-medium border-t">
                  <span>{'Subtotal'}:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-red-600">
                    <span>{'Discount'}:</span>
                    <span>-${totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>VAT ({formData.vat_rate}%):</span>
                  <span>${totals.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t-2">
                  <span>{'Total'}:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{'Notes to Client'}</label>
                <textarea value={formData.notes_to_client} rows="2"
                  onChange={(e) => setFormData({...formData, notes_to_client: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md" />
                <p className="text-xs text-gray-400 mt-1">
                  {'Supports Arabic / يدعم العربية'}
                </p>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button type="button" onClick={() => setStep(2)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50">{'Back'}</button>
                <button type="button" onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  {'Generate Invoice'}
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
