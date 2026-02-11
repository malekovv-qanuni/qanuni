import React from 'react';
import {
  X, FileSpreadsheet, FileText, Briefcase, Gavel, Scale,
  AlertCircle, Clock, Receipt, DollarSign, Mail, Phone
} from 'lucide-react';
import { useReport } from '../../contexts';

/**
 * Client360ReportModal - Comprehensive client report with financial, cases, time, expenses
 * Extracted from App.js v46.16 → v46.17
 * Migrated to ReportContext (Phase 3c.6)
 *
 * Props:
 * - generateClient360Report: Function to generate report
 * - exportClient360Report: Function to export report
 * - clients: Array of clients for dropdown
 * - matters: Array of matters for activity preview
 * - invoices: Array of invoices for activity preview
 * - timesheets: Array of timesheets for activity preview
 * - expenses: Array of expenses for activity preview
 */
const Client360ReportModal = ({
  generateClient360Report,
  exportClient360Report,
  clients,
  matters,
  invoices,
  timesheets,
  expenses}) => {
  const { isOpen, data, loading, clientId, closeReport, setData, setClientId } = useReport('client360');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-emerald-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold">
            {'Client 360° Report'}
          </h2>
          <button onClick={() => { closeReport(); }}
            className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Selection */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'Client'} *
              </label>
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setData(null); }}
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
            <button
              onClick={() => generateClient360Report(clientId)}
              disabled={!clientId || loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading
                ? ('Loading...')
                : ('Generate Report')}
            </button>
          </div>

          {/* Client Activity Preview */}
          {clientId && !data && (
            <div className="mt-3 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              {(() => {
                const clientMatters = matters.filter(m => String(m.client_id) === String(clientId));
                const clientInvoices = invoices.filter(inv => String(inv.client_id) === String(clientId));
                const clientTimesheets = timesheets.filter(ts => {
                  const matter = matters.find(m => m.matter_id === ts.matter_id);
                  return matter && String(matter.client_id) === String(clientId);
                });
                const clientExpenses = expenses.filter(exp => String(exp.client_id) === String(clientId));

                return (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-emerald-600">{'Matters:'}</span>
                      <span className="font-medium text-emerald-800 ml-1">{clientMatters.length}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600">{'Invoices:'}</span>
                      <span className="font-medium text-emerald-800 ml-1">{clientInvoices.length}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600">{'Timesheets:'}</span>
                      <span className="font-medium text-emerald-800 ml-1">{clientTimesheets.length}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600">{'Expenses:'}</span>
                      <span className="font-medium text-emerald-800 ml-1">{clientExpenses.length}</span>
                    </div>
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
              {clientId
                ? ('Click "Generate Report" to view data')
                : ('Select a client first')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl text-emerald-900">
                      {data.client?.client_name}
                      {data.client?.client_name_arabic && (
                        <span className="mr-2" dir="rtl"> / {data.client.client_name_arabic}</span>
                      )}
                    </h3>
                    <div className="text-sm text-emerald-700 mt-1 flex flex-wrap gap-3">
                      {data.client?.email && (
                        <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{data.client.email}</span>
                      )}
                      {data.client?.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{data.client.phone}</span>
                      )}
                      {data.client?.client_type && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          data.client.client_type === 'legal_entity' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {data.client.client_type === 'legal_entity' ? 'Legal Entity' : 'Individual'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-emerald-600">
                    <div>{'Report Date'}</div>
                    <div className="font-medium">{new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {'Financial Summary'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <div className="text-xs text-blue-600 uppercase">{'Total Invoiced'}</div>
                    <div className="text-lg font-bold text-blue-800">${(data.financial?.totalInvoiced || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                    <div className="text-xs text-green-600 uppercase">{'Collected'}</div>
                    <div className="text-lg font-bold text-green-800">${(data.financial?.totalPaid || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                    <div className="text-xs text-red-600 uppercase">{'Outstanding'}</div>
                    <div className="text-lg font-bold text-red-800">${(data.financial?.outstanding || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                    <div className="text-xs text-purple-600 uppercase">{'Retainer Balance'}</div>
                    <div className="text-lg font-bold text-purple-800">${(data.financial?.retainerBalance || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                    <div className="text-xs text-amber-600 uppercase">{'Unbilled Time'}</div>
                    <div className="text-lg font-bold text-amber-800">${(data.financial?.unbilledValue || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Activity Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalMatters || 0}</div>
                  <div className="text-xs text-gray-600">{'Matters'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalHearings || 0}</div>
                  <div className="text-xs text-gray-600">{'Hearings'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalJudgments || 0}</div>
                  <div className="text-xs text-gray-600">{'Judgments'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalDeadlines || 0}</div>
                  <div className="text-xs text-gray-600">{'Deadlines'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalTimesheets || 0}</div>
                  <div className="text-xs text-gray-600">{'Timesheets'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-gray-800">{data.summary?.totalExpenses || 0}</div>
                  <div className="text-xs text-gray-600">{'Expenses'}</div>
                </div>
              </div>

              {/* Matters Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-indigo-50 px-4 py-2 border-b flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-indigo-800">{'Matters'} ({data.matters?.length || 0})</span>
                </div>
                {data.matters?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-left">{'Case #'}</th>
                        <th className="px-3 py-2 text-center">{'Status'}</th>
                        <th className="px-3 py-2 text-left">{'Type'}</th>
                        <th className="px-3 py-2 text-left">{'Opened'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.matters.map(m => (
                        <tr key={m.matter_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{m.matter_name}</td>
                          <td className="px-3 py-2 text-gray-600">{m.case_number || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              m.status === 'active' ? 'bg-green-100 text-green-800' :
                              m.status === 'engaged' ? 'bg-blue-100 text-blue-800' :
                              m.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>{m.status}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{m.matter_type || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{m.opening_date ? new Date(m.opening_date).toLocaleDateString('en-GB') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500">{'No matters'}</div>
                )}
              </div>

              {/* Two-column layout for Hearings and Judgments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Hearings Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">{'Hearings'} ({data.hearings?.length || 0})</span>
                  </div>
                  {data.hearings?.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">{'Date'}</th>
                            <th className="px-3 py-2 text-left">{'Matter'}</th>
                            <th className="px-3 py-2 text-left">{'Purpose'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.hearings.slice(0, 10).map(h => (
                            <tr key={h.hearing_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{new Date(h.hearing_date).toLocaleDateString('en-GB')}</td>
                              <td className="px-3 py-2">{h.matter_name}</td>
                              <td className="px-3 py-2 text-gray-600">{h.purpose_name || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.hearings.length > 10 && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                          +{data.hearings.length - 10} {'more hearings'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">{'No hearings'}</div>
                  )}
                </div>

                {/* Judgments Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-4 py-2 border-b flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-800">{'Judgments'} ({data.judgments?.length || 0})</span>
                  </div>
                  {data.judgments?.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">{'Date'}</th>
                            <th className="px-3 py-2 text-left">{'Matter'}</th>
                            <th className="px-3 py-2 text-left">{'Summary'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.judgments.map(j => (
                            <tr key={j.judgment_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{j.judgment_date ? new Date(j.judgment_date).toLocaleDateString('en-GB') : '-'}</td>
                              <td className="px-3 py-2">{j.matter_name}</td>
                              <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]" title={j.judgment_summary}>
                                {j.judgment_summary?.substring(0, 50) || '-'}{j.judgment_summary?.length > 50 ? '...' : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">{'No judgments'}</div>
                  )}
                </div>
              </div>

              {/* Two-column layout for Deadlines and Timesheets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Deadlines Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 border-b flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-800">{'Deadlines'} ({data.deadlines?.length || 0})</span>
                  </div>
                  {data.deadlines?.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">{'Due Date'}</th>
                            <th className="px-3 py-2 text-left">{'Title'}</th>
                            <th className="px-3 py-2 text-center">{'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.deadlines.slice(0, 10).map(d => (
                            <tr key={d.deadline_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{new Date(d.deadline_date).toLocaleDateString('en-GB')}</td>
                              <td className="px-3 py-2">{d.title}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  d.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  d.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>{d.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.deadlines.length > 10 && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                          +{data.deadlines.length - 10} {'more deadlines'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">{'No deadlines'}</div>
                  )}
                </div>

                {/* Timesheets Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-cyan-50 px-4 py-2 border-b flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    <span className="font-medium text-cyan-800">{'Timesheets'} ({data.timesheets?.length || 0})</span>
                    {data.timesheets?.length > 0 && (
                      <span className="text-xs text-cyan-600 ml-auto">
                        {(() => {
                          const totalMins = data.timesheets.reduce((sum, ts) => sum + (ts.duration_minutes || 0), 0);
                          return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m total`;
                        })()}
                      </span>
                    )}
                  </div>
                  {data.timesheets?.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">{'Date'}</th>
                            <th className="px-3 py-2 text-left">{'Matter'}</th>
                            <th className="px-3 py-2 text-right">{'Duration'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.timesheets.slice(0, 10).map(ts => (
                            <tr key={ts.timesheet_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{new Date(ts.work_date).toLocaleDateString('en-GB')}</td>
                              <td className="px-3 py-2">{ts.matter_name}</td>
                              <td className="px-3 py-2 text-right">{Math.floor(ts.duration_minutes / 60)}h {ts.duration_minutes % 60}m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.timesheets.length > 10 && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                          +{data.timesheets.length - 10} {'more entries'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">{'No timesheets'}</div>
                  )}
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-rose-50 px-4 py-2 border-b flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span className="font-medium text-rose-800">{'Expenses'} ({data.expenses?.length || 0})</span>
                  {data.expenses?.length > 0 && (
                    <span className="text-xs text-rose-600 ml-auto">
                      ${data.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toLocaleString()} {'total'}
                    </span>
                  )}
                </div>
                {data.expenses?.length > 0 ? (
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">{'Date'}</th>
                          <th className="px-3 py-2 text-left">{'Category'}</th>
                          <th className="px-3 py-2 text-left">{'Matter'}</th>
                          <th className="px-3 py-2 text-right">{'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.expenses.slice(0, 10).map(e => (
                          <tr key={e.expense_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{new Date(e.expense_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-3 py-2">{e.category_name || e.category || '-'}</td>
                            <td className="px-3 py-2">{e.matter_name || '-'}</td>
                            <td className="px-3 py-2 text-right font-medium">${parseFloat(e.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.expenses.length > 10 && (
                      <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                        +{data.expenses.length - 10} {'more expenses'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">{'No expenses'}</div>
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
                onClick={() => exportClient360Report('excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {'Export Excel'}
              </button>
              <button
                onClick={() => exportClient360Report('pdf')}
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

export default Client360ReportModal;
