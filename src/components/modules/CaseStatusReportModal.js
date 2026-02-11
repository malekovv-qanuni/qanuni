import React from 'react';
import { X, FileSpreadsheet, FileText, Briefcase, Gavel, Scale, AlertCircle } from 'lucide-react';
import { useReport } from '../../contexts';

/**
 * CaseStatusReportModal - Displays client case status with matters, hearings, judgments, deadlines
 * Extracted from App.js v46.15 → v46.16
 * Migrated to ReportContext (Phase 3c.6)
 *
 * Props:
 * - generateCaseStatusReport: Function to generate report
 * - exportCaseStatusReport: Function to export report
 * - clients: Array of clients for dropdown
 * - matters: Array of matters for activity preview
 * - hearings: Array of hearings for activity preview
 */
const CaseStatusReportModal = ({
  generateCaseStatusReport,
  exportCaseStatusReport,
  clients,
  matters,
  hearings}) => {
  const { isOpen, data, loading, clientId, closeReport, setData, setClientId } = useReport('caseStatus');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-indigo-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold">
            {'Case Status Report'}
          </h2>
          <button onClick={() => { closeReport(); }}
            className="p-1 hover:bg-indigo-700 rounded">
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
              onClick={() => generateCaseStatusReport(clientId)}
              disabled={!clientId || loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading
                ? ('Loading...')
                : ('Generate Report')}
            </button>
          </div>

          {/* Client Activity Preview */}
          {clientId && !data && (
            <div className="mt-3 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              {(() => {
                const clientMatters = matters.filter(m => String(m.client_id) === String(clientId));
                const activeMatters = clientMatters.filter(m => ['active', 'engaged', 'on_hold'].includes(m.status));
                const clientHearings = hearings.filter(h => {
                  const matter = matters.find(m => m.matter_id === h.matter_id);
                  return matter && String(matter.client_id) === String(clientId);
                });
                const upcomingHearings = clientHearings.filter(h => new Date(h.hearing_date) >= new Date());

                return (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-indigo-600">{'Active Matters:'}</span>
                      <span className="font-medium text-indigo-800 ml-1">{activeMatters.length}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600">{'Total Matters:'}</span>
                      <span className="font-medium text-indigo-800 ml-1">{clientMatters.length}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600">{'Upcoming Hearings:'}</span>
                      <span className="font-medium text-indigo-800 ml-1">{upcomingHearings.length}</span>
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {data.client?.client_name}
                  {data.client?.client_name_ar && ` / ${data.client.client_name_ar}`}
                </h3>
                <div className="text-sm text-gray-600">
                  {data.client?.email && <span>{data.client.email}</span>}
                  {data.client?.phone && <span className="ml-3">{data.client.phone}</span>}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-indigo-600 uppercase">{'Active Matters'}</div>
                  <div className="text-2xl font-bold text-indigo-800">{data.summary?.totalMatters || 0}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 uppercase">{'Upcoming Hearings'}</div>
                  <div className="text-2xl font-bold text-blue-800">{data.summary?.upcomingHearingsCount || 0}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-purple-600 uppercase">{'Recent Judgments'}</div>
                  <div className="text-2xl font-bold text-purple-800">{data.summary?.recentJudgmentsCount || 0}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 uppercase">{'Pending Deadlines'}</div>
                  <div className="text-2xl font-bold text-amber-800">{data.summary?.upcomingDeadlinesCount || 0}</div>
                </div>
              </div>

              {/* Matters Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {'Active Matters'} ({data.matters?.length || 0})
                </h4>
                {data.matters?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-left">{'Case #'}</th>
                        <th className="px-3 py-2 text-center">{'Status'}</th>
                        <th className="px-3 py-2 text-left">{'Lawyer'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.matters.map(m => (
                        <tr key={m.matter_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{m.matter_name}</td>
                          <td className="px-3 py-2">{m.case_number || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              m.status === 'active' ? 'bg-green-100 text-green-800' :
                              m.status === 'engaged' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">{m.lawyer_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No active matters'}
                  </div>
                )}
              </div>

              {/* Hearings Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Gavel className="w-4 h-4" />
                  {'Upcoming Hearings (90 days)'} ({data.hearings?.length || 0})
                </h4>
                {data.hearings?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Date'}</th>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-left">{'Purpose'}</th>
                        <th className="px-3 py-2 text-left">{'Court'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.hearings.map(h => (
                        <tr key={h.hearing_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{new Date(h.hearing_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2">{h.matter_name}</td>
                          <td className="px-3 py-2">{h.purpose_name || h.purpose_custom || '-'}</td>
                          <td className="px-3 py-2">{h.court_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No upcoming hearings'}
                  </div>
                )}
              </div>

              {/* Judgments Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  {'Recent Judgments (12 months)'} ({data.judgments?.length || 0})
                </h4>
                {data.judgments?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Date'}</th>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-center">{'Outcome'}</th>
                        <th className="px-3 py-2 text-center">{'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.judgments.map(j => (
                        <tr key={j.judgment_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{new Date(j.judgment_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2">{j.matter_name}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              j.outcome === 'favorable' ? 'bg-green-100 text-green-800' :
                              j.outcome === 'unfavorable' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {j.outcome || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              j.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No recent judgments'}
                  </div>
                )}
              </div>

              {/* Deadlines Table */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {'Upcoming Deadlines (60 days)'} ({data.deadlines?.length || 0})
                </h4>
                {data.deadlines?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Due Date'}</th>
                        <th className="px-3 py-2 text-left">{'Description'}</th>
                        <th className="px-3 py-2 text-left">{'Matter'}</th>
                        <th className="px-3 py-2 text-center">{'Days Left'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.deadlines.map(d => {
                        const daysRemaining = Math.ceil((new Date(d.deadline_date) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={d.deadline_id} className={`hover:bg-gray-50 ${daysRemaining <= 7 ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2 font-medium">{new Date(d.deadline_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-3 py-2">{d.title}</td>
                            <td className="px-3 py-2">{d.matter_name || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                daysRemaining <= 7 ? 'bg-red-100 text-red-800 font-bold' :
                                daysRemaining <= 14 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {daysRemaining} {'days'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    {'No upcoming deadlines'}
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
                onClick={() => exportCaseStatusReport('excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {'Export Excel'}
              </button>
              <button
                onClick={() => exportCaseStatusReport('pdf')}
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

export default CaseStatusReportModal;
