/**
 * Company360ReportModal (v46.25)
 * Select a company and view its full 360° profile report
 */
import React, { useState, useEffect } from 'react';
import { X, Building2, Users, UserCheck, FileText, Calendar, Printer, DollarSign, AlertTriangle, Download } from 'lucide-react';
import apiClient from '../../../api-client';

const Company360ReportModal = ({ show, onClose}) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);  useEffect(() => {
    if (show) {
      loadCompanies();
    }
  }, [show]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAllCorporateEntities();
      // Filter to only show companies with corporate details
      setCompanies((data || []).filter(c => c.has_corporate_details));
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyReport = async (company) => {
    setSelectedCompany(company);
    setLoadingReport(true);
    try {
      // Load all related data
      const [shareholders, directors, filings, meetings] = await Promise.all([
        apiClient.getShareholders(company.client_id),
        apiClient.getDirectors(company.client_id),
        apiClient.getFilings(company.client_id),
        apiClient.getMeetings(company.client_id)
      ]);

      setReportData({
        company,
        shareholders: shareholders || [],
        directors: directors || [],
        filings: filings || [],
        meetings: meetings || []
      });
    } catch (error) {
      console.error('Error loading company report:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handlers
  const handleExport = async (format) => {
    if (!reportData || !selectedCompany) return;
    
    const companyName = selectedCompany.client_name;
    const reportName = `Company_360_${companyName.replace(/\s+/g, '_')}`;
    
    // Prepare comprehensive data for export
    const exportData = [];
    
    // Company info section
    exportData.push({
      section: 'Company Info',
      field: 'Name',
      value: companyName
    });
    exportData.push({
      section: '',
      field: 'Registration Number',
      value: selectedCompany.registration_number || '-'
    });
    exportData.push({
      section: '',
      field: 'Share Capital',
      value: formatCurrency(selectedCompany.share_capital, selectedCompany.share_capital_currency)
    });
    
    // Shareholders
    exportData.push({ section: '', field: '', value: '' }); // Empty row
    exportData.push({
      section: 'Shareholders',
      field: 'Name',
      value: 'Shares'
    });
    reportData.shareholders.forEach(s => {
      exportData.push({
        section: '',
        field: s.name,
        value: `${s.shares_owned || 0} (${getSharePercentage(s.shares_owned, selectedCompany.total_shares)}%)`
      });
    });
    
    // Directors
    exportData.push({ section: '', field: '', value: '' }); // Empty row
    exportData.push({
      section: 'Directors',
      field: 'Name',
      value: 'Position'
    });
    reportData.directors.filter(d => !d.date_resigned).forEach(d => {
      exportData.push({
        section: '',
        field: d.name,
        value: d.position || '-'
      });
    });
    
    try {
      let result;
      if (format === 'excel') {
        result = await apiClient.exportToExcel(exportData, reportName);
      } else if (format === 'csv') {
        result = await apiClient.exportToCsv(exportData, reportName);
      } else if (format === 'pdf') {
        const columns = ['section', 'field', 'value'];
        result = await apiClient.exportToPdf(exportData, reportName, columns);
      }
      
      if (result?.success) {
        const openFile = window.confirm(
          `Export successful!\n\nFile saved to:\n${result.filePath}\n\nWould you like to open it?`
        );
        if (openFile) {
          await apiClient.openFile(result.filePath);
        }
      } else if (!result?.canceled) {
        alert(('Export failed: ') + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(('Export failed: ') + error.message);
    }
  };

  const formatCurrency = (amount, currency) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const getSharePercentage = (shares, totalShares) => {
    if (!totalShares || totalShares === 0) return '0.00';
    return ((shares / totalShares) * 100).toFixed(2);
  };

  const getUpcomingDeadlines = () => {
    if (!reportData) return [];
    const today = new Date().toISOString().split('T')[0];
    const upcoming = [];

    reportData.filings.forEach(f => {
      if (f.next_due_date && f.next_due_date >= today) {
        upcoming.push({ type: 'filing', date: f.next_due_date, name: f.filing_type, description: f.filing_description });
      }
    });

    reportData.meetings.forEach(m => {
      if (m.next_meeting_date && m.next_meeting_date >= today) {
        upcoming.push({ type: 'meeting', date: m.next_meeting_date, name: m.meeting_type, description: m.next_meeting_agenda });
      }
    });

    return upcoming.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getActiveDirectors = () => {
    if (!reportData) return [];
    return reportData.directors.filter(d => !d.date_resigned);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="text-purple-600" size={24} />
            {'Company 360° Profile'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Company Selector */}
          {!reportData && (
            <div className="max-w-md mx-auto">
              <label className="block text-sm font-medium mb-2">
                {'Select Company'}
              </label>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  {'Loading...'}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {'No companies with corporate details found'}
                </div>
              ) : (
                <div className="space-y-2">
                  {companies.map(company => (
                    <button
                      key={company.client_id}
                      onClick={() => loadCompanyReport(company)}
                      className="w-full p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 text-left transition-colors"
                    >
                      <div className="font-medium">
                        {company.client_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {company.registration_number && `${'Reg #: '}${company.registration_number}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading Report */}
          {loadingReport && (
            <div className="text-center py-8 text-gray-500">
              {'Loading report...'}
            </div>
          )}

          {/* Report Content */}
          {reportData && !loadingReport && (
            <div className="space-y-6 print:p-0" id="company-360-report">
              {/* Back Button & Actions */}
              <div className="flex justify-between items-center print:hidden">
                <button
                  onClick={() => { setReportData(null); setSelectedCompany(null); }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← {'Select another company'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    title="Export to Excel"
                  >
                    <Download size={14} />
                    Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    title="Export to PDF"
                  >
                    <Download size={14} />
                    PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Printer size={16} />
                    {'Print'}
                  </button>
                </div>
              </div>

              {/* Company Header */}
              <div className="text-center border-b pb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  {selectedCompany.client_name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {selectedCompany.entity_type_name}
                </p>
                {selectedCompany.registration_number && (
                  <p className="text-sm text-gray-500 mt-2">
                    {'Reg. No: '}{selectedCompany.registration_number}
                  </p>
                )}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <DollarSign className="mx-auto text-blue-600 mb-2" size={24} />
                  <div className="text-sm text-gray-600">{'Share Capital'}</div>
                  <div className="font-bold text-lg">{formatCurrency(selectedCompany.share_capital, selectedCompany.share_capital_currency)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <Users className="mx-auto text-green-600 mb-2" size={24} />
                  <div className="text-sm text-gray-600">{'Shareholders'}</div>
                  <div className="font-bold text-lg">{reportData.shareholders.length}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <UserCheck className="mx-auto text-purple-600 mb-2" size={24} />
                  <div className="text-sm text-gray-600">{'Directors'}</div>
                  <div className="font-bold text-lg">{getActiveDirectors().length}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg text-center">
                  <Calendar className="mx-auto text-amber-600 mb-2" size={24} />
                  <div className="text-sm text-gray-600">{'Upcoming'}</div>
                  <div className="font-bold text-lg">{getUpcomingDeadlines().length}</div>
                </div>
              </div>

              {/* Company Details Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-gray-600" />
                  {'Company Details'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">{'Registration Date:'}</span> <strong>{selectedCompany.registration_date || '-'}</strong></div>
                  <div><span className="text-gray-500">{'Fiscal Year End:'}</span> <strong>{selectedCompany.fiscal_year_end || '-'}</strong></div>
                  <div><span className="text-gray-500">{'Tax ID:'}</span> <strong>{selectedCompany.tax_id || '-'}</strong></div>
                  <div><span className="text-gray-500">{'Commercial Register:'}</span> <strong>{selectedCompany.commercial_register || '-'}</strong></div>
                  <div className="col-span-2"><span className="text-gray-500">{'Registered Address:'}</span> <strong>{selectedCompany.registered_address || '-'}</strong></div>
                </div>
              </div>

              {/* Shareholders Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users size={20} className="text-gray-600" />
                  {'Shareholders'} ({reportData.shareholders.length})
                </h3>
                {reportData.shareholders.length === 0 ? (
                  <p className="text-gray-500 text-sm">{'No shareholders registered'}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Name'}</th>
                        <th className="px-3 py-2 text-left">{'Nationality'}</th>
                        <th className="px-3 py-2 text-center">{'Shares'}</th>
                        <th className="px-3 py-2 text-center">{'%'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.shareholders.map(s => (
                        <tr key={s.id}>
                          <td className="px-3 py-2 font-medium">{s.name}</td>
                          <td className="px-3 py-2">{s.nationality || '-'}</td>
                          <td className="px-3 py-2 text-center">{s.shares_owned?.toLocaleString() || '-'}</td>
                          <td className="px-3 py-2 text-center font-medium">{getSharePercentage(s.shares_owned, selectedCompany.total_shares)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Directors Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <UserCheck size={20} className="text-gray-600" />
                  {'Board of Directors'} ({getActiveDirectors().length} {'active'})
                </h3>
                {reportData.directors.length === 0 ? (
                  <p className="text-gray-500 text-sm">{'No directors registered'}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">{'Name'}</th>
                        <th className="px-3 py-2 text-left">{'Position'}</th>
                        <th className="px-3 py-2 text-left">{'Appointed'}</th>
                        <th className="px-3 py-2 text-center">{'Signatory'}</th>
                        <th className="px-3 py-2 text-left">{'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.directors.map(d => (
                        <tr key={d.id} className={d.date_resigned ? 'opacity-60' : ''}>
                          <td className="px-3 py-2 font-medium">{d.name}</td>
                          <td className="px-3 py-2">{d.position}</td>
                          <td className="px-3 py-2">{d.date_appointed || '-'}</td>
                          <td className="px-3 py-2 text-center">{d.is_signatory ? '✓' : '-'}</td>
                          <td className="px-3 py-2">
                            {d.date_resigned ? (
                              <span className="text-gray-500">{'Resigned '}{d.date_resigned}</span>
                            ) : (
                              <span className="text-green-600">{'Active'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Upcoming Deadlines Section */}
              {getUpcomingDeadlines().length > 0 && (
                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-amber-800">
                    <AlertTriangle size={20} />
                    {'Upcoming Deadlines'}
                  </h3>
                  <div className="space-y-2">
                    {getUpcomingDeadlines().map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded">
                        <span className="font-medium">
                          {item.type === 'filing' ? '📋 ' : '📅 '}
                          {item.name}
                          {item.description && ` - ${item.description}`}
                        </span>
                        <span className="text-amber-700 font-medium">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 border-t pt-4">
                {'Report generated by Qanuni'} - {new Date().toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Company360ReportModal;
