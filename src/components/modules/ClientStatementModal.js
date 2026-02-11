import React from 'react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';
import { useReport } from '../../contexts';

/**
 * ClientStatementModal - Displays client account statement with invoices and payments
 * Extracted from App.js v46.14 → v46.15
 * Migrated to ReportContext (Phase 3c.6)
 *
 * Props:
 * - generateClientStatement: Function to generate statement
 * - exportClientStatement: Function to export statement
 * - clients: Array of clients for dropdown
 * - invoices: Array of invoices for activity summary
 * - advances: Array of advances/payments for activity summary
 */
const ClientStatementModal = ({
  generateClientStatement,
  exportClientStatement,
  clients,
  invoices,
  advances}) => {
  const { isOpen, data, loading, filters, closeReport, setData, setFilters } = useReport('clientStatement');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-blue-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold">
            {'Client Statement'}
          </h2>
          <button onClick={() => { closeReport(); }}
            className="p-1 hover:bg-blue-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 space-y-3">
          {/* Client Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'Client'} *
              </label>
              <select
                value={filters.clientId}
                onChange={(e) => {
                  const newClientId = e.target.value;
                  setFilters({ clientId: newClientId });
                  setData(null);
                  // Auto-detect date range for this client
                  if (newClientId) {
                    const clientInvoices = invoices.filter(inv => String(inv.client_id) === String(newClientId));
                    const clientPayments = advances.filter(a =>
                      String(a.client_id) === String(newClientId) &&
                      ['client_retainer', 'fee_payment', 'fee_payment_cash', 'fee_payment_bank'].includes(a.advance_type)
                    );

                    // Find earliest and latest dates
                    const allDates = [
                      ...clientInvoices.map(inv => inv.issue_date),
                      ...clientPayments.map(p => p.date_received)
                    ].filter(Boolean).sort();

                    if (allDates.length > 0) {
                      // Set date range to cover all activity
                      setFilters({
                        clientId: newClientId,
                        dateFrom: allDates[0],
                        dateTo: new Date().toISOString().split('T')[0]
                      });
                    }
                  }
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">{'-- Select Client --'}</option>
                {clients.map(c => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'From Date'}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'To Date'}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => generateClientStatement(
                  filters.clientId,
                  filters.dateFrom,
                  filters.dateTo
                )}
                disabled={!filters.clientId || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading
                  ? ('Loading...')
                  : ('Generate Statement')}
              </button>
            </div>
          </div>

          {/* Quick Period Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">{'Quick periods:'}</span>
            {[
              { key: 'thisYear', label: 'This Year',
                from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().split('T')[0] },
              { key: 'lastYear', label: 'Last Year',
                from: `${new Date().getFullYear() - 1}-01-01`, to: `${new Date().getFullYear() - 1}-12-31` },
              { key: 'last6Months', label: 'Last 6 Months',
                from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0] },
              { key: 'allTime', label: 'All Time',
                from: '2020-01-01', to: new Date().toISOString().split('T')[0] }
            ].map(preset => (
              <button
                key={preset.key}
                onClick={() => setFilters({ dateFrom: preset.from, dateTo: preset.to })}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filters.dateFrom === preset.from && filters.dateTo === preset.to
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Client Activity Summary (when client selected but not generated yet) */}
          {filters.clientId && !data && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              {(() => {
                const clientId = filters.clientId;
                const clientInvoices = invoices.filter(inv => String(inv.client_id) === String(clientId));
                const clientPayments = advances.filter(a =>
                  String(a.client_id) === String(clientId) &&
                  ['client_retainer', 'fee_payment', 'fee_payment_cash', 'fee_payment_bank'].includes(a.advance_type)
                );

                const allDates = [
                  ...clientInvoices.map(inv => inv.issue_date),
                  ...clientPayments.map(p => p.date_received)
                ].filter(Boolean).sort();

                const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
                const totalPaid = clientPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                if (clientInvoices.length === 0 && clientPayments.length === 0) {
                  return (
                    <div className="text-sm text-blue-700">
                      <span className="font-medium">{'No activity found'}</span>
                      <span className="text-blue-600 ml-2">
                        {'No invoices or payments for this client'}
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">{'Invoices:'}</span>
                      <span className="font-medium text-blue-800 ml-1">{clientInvoices.length}</span>
                      <span className="text-blue-600 ml-1">(${totalInvoiced.toFixed(2)})</span>
                    </div>
                    <div>
                      <span className="text-blue-600">{'Payments:'}</span>
                      <span className="font-medium text-blue-800 ml-1">{clientPayments.length}</span>
                      <span className="text-blue-600 ml-1">(${totalPaid.toFixed(2)})</span>
                    </div>
                    {allDates.length > 0 && (
                      <>
                        <div>
                          <span className="text-blue-600">{'First activity:'}</span>
                          <span className="font-medium text-blue-800 ml-1">
                            {new Date(allDates[0]).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-600">{'Last activity:'}</span>
                          <span className="font-medium text-blue-800 ml-1">
                            {new Date(allDates[allDates.length - 1]).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {!data ? (
            <div className="text-center py-12 text-gray-500">
              {filters.clientId
                ? ('Click "Generate Statement" to view data')
                : ('Select a client first')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {data.client?.client_name}
                  {data.client?.client_name_ar && ` / ${data.client.client_name_ar}`}
                </h3>
                <div className="text-sm text-gray-600">
                  {data.client?.email && <div>{data.client.email}</div>}
                  {data.client?.phone && <div>{data.client.phone}</div>}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 uppercase">{'Opening Balance'}</div>
                  <div className="text-lg font-bold text-blue-800">${data.summary?.openingBalance?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600 uppercase">{'Total Invoiced'}</div>
                  <div className="text-lg font-bold text-gray-800">${data.summary?.totalInvoiced?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-600 uppercase">{'Payments'}</div>
                  <div className="text-lg font-bold text-green-800">${data.summary?.totalPayments?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-red-600 uppercase">{'Balance Due'}</div>
                  <div className="text-lg font-bold text-red-800">${data.summary?.closingBalance?.toFixed(2) || '0.00'}</div>
                </div>
              </div>

              {/* Invoices Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">{'Invoices'} ({data.invoices?.length || 0})</h4>
                {data.invoices?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Date'}</th>
                        <th className="px-3 py-2 text-left">{'Invoice #'}</th>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-right">{'Amount'}</th>
                        <th className="px-3 py-2 text-center">{'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.invoices.map(inv => (
                        <tr key={inv.invoice_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2 font-medium">{inv.invoice_number}</td>
                          <td className="px-3 py-2">{inv.matter_name || '-'}</td>
                          <td className="px-3 py-2 text-right">{inv.currency} {parseFloat(inv.total).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                              inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No invoices in this period'}
                  </div>
                )}
              </div>

              {/* Payments Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">{'Payments'} ({data.payments?.length || 0})</h4>
                {data.payments?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Date'}</th>
                        <th className="px-3 py-2 text-left">{'Reference'}</th>
                        <th className="px-3 py-2 text-left">{'Type'}</th>
                        <th className="px-3 py-2 text-right">{'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.payments.map(p => (
                        <tr key={p.advance_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{new Date(p.date_received).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2">{p.reference_number || '-'}</td>
                          <td className="px-3 py-2">{p.payment_type_label}</td>
                          <td className="px-3 py-2 text-right text-green-600">+${parseFloat(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No payments in this period'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Export Buttons */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={() => { closeReport(); }}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            {'Close'}
          </button>
          {data && (
            <div className="flex gap-2">
              <button
                onClick={() => exportClientStatement('excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {'Export Excel'}
              </button>
              <button
                onClick={() => exportClientStatement('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {'Export PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientStatementModal;
