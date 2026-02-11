import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, ChevronDown } from 'lucide-react';
import { useDialog } from '../../contexts';

// Print styles - only show invoice modal when printing
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  .print-invoice,
  .print-invoice * {
    visibility: visible;
  }
  .print-invoice {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: white !important;
  }
  .no-print {
    display: none !important;
  }
}
`;

/**
 * InvoiceViewModal - Displays invoice details in a modal
 * Extracted from App.js v46.13 → v46.14
 * v46.43: Added PDF export functionality, client reference display
 * Migrated to DialogContext (Phase 3c.6)
 *
 * Props:
 * - clients: Array of clients for name lookup
 * - matters: Array of matters for name lookup
 * - formatDate: Date formatting utility function
 * - showToast: Toast notification function
 */
const InvoiceViewModal = ({
  clients,
  matters,
  formatDate,
  showToast
}) => {
  const { isOpen, data: invoice, closeDialog } = useDialog('invoiceViewer');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    const loadItems = async () => {
      if (invoice) {
        setLoading(true);
        try {
          const items = await window.electronAPI.getInvoiceItems(invoice.invoice_id);
          setInvoiceItems(items || []);
        } catch (error) {
          console.error('Error loading invoice items:', error);
        }
        setLoading(false);
      }
    };
    loadItems();
  }, [invoice]);

  // Inject print styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'invoice-print-styles';
    styleEl.textContent = printStyles;
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById('invoice-print-styles');
      if (el) el.remove();
    };
  }, []);

  if (!isOpen || !invoice) return null;
  
  const client = clients.find(c => c.client_id === invoice.client_id);
  const matter = invoice.matter_id ? matters.find(m => m.matter_id === invoice.matter_id) : null;
  
  // Separate time entries and expenses
  const timeItems = invoiceItems.filter(item => item.item_type === 'time');
  const expenseItems = invoiceItems.filter(item => item.item_type === 'expense');
  const fixedFeeItems = invoiceItems.filter(item => item.item_type === 'fixed_fee');
  
  const timeTotal = timeItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const fixedTotal = fixedFeeItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const feesTotal = timeTotal + fixedTotal;
  const expenseTotal = expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  
  // Calculate retainer applied (stored in discount if it was applied)
  const retainerApplied = invoice.retainer_applied || 0;
  
  // Export PDF function
  const handleExportPdf = async (includeAttachments = false) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const result = await window.electronAPI.generateInvoicePdfs(invoice.invoice_id, {
        generateTimesheet: includeAttachments && timeItems.length > 0,
        generateExpenses: includeAttachments && expenseItems.length > 0
      });
      
      if (result.success) {
        const fileCount = result.files?.length || 1;
        const msg = tf('Exported {count} file(s) to {folder}', { count: fileCount, folder: result.folder });
        showToast?.(msg, 'success');
      } else if (!result.canceled) {
        showToast?.('Export failed', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast?.('Export failed', 'error');
    }
    setExporting(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-invoice">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ltr">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 invoice-header">
            <div>
              <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
              {invoice.client_reference && (
                <p className="text-sm text-gray-500">
                  {'Client Ref'}: {invoice.client_reference}
                </p>
              )}
              <p className="text-gray-500">
                {'Issue Date'}: {formatDate(invoice.issue_date)}
                {invoice.due_date && ` | ${'Due Date'}: ${formatDate(invoice.due_date)}`}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>{invoice.status}</span>
          </div>
          
          {/* Client & Matter Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{'Client'}</p>
                <p className="font-medium">{client?.client_name || 'N/A'}</p>
              </div>
              {matter && (
                <div>
                  <p className="text-sm text-gray-500">{'Matter'}</p>
                  <p className="font-medium">{matter.matter_name}</p>
                </div>
              )}
            </div>
            {invoice.period_start && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">{'Billing Period'}</p>
                <p className="font-medium">{formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}</p>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8">{'Loading...'}</div>
          ) : (
            <>
              {/* Professional Fees Section */}
              {(timeItems.length > 0 || fixedFeeItems.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">{'Professional Fees'}</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'DATE'}</th>
                        <th className="px-3 py-2 text-left">{'Description'}</th>
                        <th className="px-3 py-2 text-right">{'Hours'}</th>
                        <th className="px-3 py-2 text-right">{'Rate *'}</th>
                        <th className="px-3 py-2 text-right">{'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeItems.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{parseFloat(item.rate).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                      {fixedFeeItems.map((item, idx) => (
                        <tr key={`ff-${idx}`} className="border-b">
                          <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">-</td>
                          <td className="px-3 py-2 text-right">{'Fixed Fee'}</td>
                          <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td colSpan="4" className="px-3 py-2 text-right">{'Professional Fees'} {'Subtotal'}:</td>
                        <td className="px-3 py-2 text-right">{invoice.currency} {feesTotal.toFixed(2)}</td>
                      </tr>
                      {retainerApplied > 0 && (
                        <tr className="text-green-700">
                          <td colSpan="4" className="px-3 py-2 text-right">{'Less: Retainer Applied'}:</td>
                          <td className="px-3 py-2 text-right">({invoice.currency} {retainerApplied.toFixed(2)})</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan="4" className="px-3 py-2 text-right">{'Net Professional Fees'}:</td>
                        <td className="px-3 py-2 text-right">{invoice.currency} {(feesTotal - retainerApplied).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              
              {/* Expenses/Disbursements Section */}
              {expenseItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">{'Disbursements/Expenses'}</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'DATE'}</th>
                        <th className="px-3 py-2 text-left">{'Description'}</th>
                        <th className="px-3 py-2 text-right">{'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">{formatDate(item.item_date)}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td colSpan="2" className="px-3 py-2 text-right">{'Disbursements/Expenses'} {'Total'}:</td>
                        <td className="px-3 py-2 text-right">{invoice.currency} {expenseTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              
              {/* Invoice Summary */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg">
                  <span>{'Subtotal'}:</span>
                  <span>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-green-700">
                    <span>{'Discount'} ({invoice.discount_type === 'percentage' ? `${invoice.discount_value}%` : 'Fixed Fee'}):</span>
                    <span>-{invoice.currency} {parseFloat(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span>{'VAT'} ({invoice.vat_rate}%):</span>
                    <span>{invoice.currency} {parseFloat(invoice.vat_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 mt-2 pt-2">
                  <span>{'Total'}:</span>
                  <span>{invoice.currency} {parseFloat(invoice.total).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Notes */}
              {invoice.notes_to_client && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">{'Notes'}:</p>
                  <p className="mt-1">{invoice.notes_to_client}</p>
                </div>
              )}
            </>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t no-print">
            {/* Export PDF Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {exporting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {'Export PDF'}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border z-10">
                  <button
                    onClick={() => handleExportPdf(false)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-gray-500" />
                    {'Invoice Only'}
                  </button>
                  {(timeItems.length > 0 || expenseItems.length > 0) && (
                    <button
                      onClick={() => handleExportPdf(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-t"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      {'Invoice + Attachments'}
                      <span className="text-xs text-gray-400 ml-auto">
                        {timeItems.length > 0 && ('Timesheet')}
                        {timeItems.length > 0 && expenseItems.length > 0 && ' + '}
                        {expenseItems.length > 0 && ('Expenses')}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <button onClick={() => window.print()}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {'Print'}
            </button>
            <button onClick={() => closeDialog()}
              className="px-4 py-2 border rounded-md hover:bg-gray-50">
              {'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;
