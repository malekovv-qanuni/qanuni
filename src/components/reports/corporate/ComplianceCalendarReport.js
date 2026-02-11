/**
 * ComplianceCalendarReport (v46.25)
 * Shows all upcoming filings and meetings for all companies
 */
import React, { useState, useEffect } from 'react';
import { X, Calendar, Building2, FileText, Printer, AlertTriangle, Filter, Download } from 'lucide-react';

const ComplianceCalendarReport = ({ show, onClose}) => {
  const [loading, setLoading] = useState(true);
  const [deadlines, setDeadlines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDays, setFilterDays] = useState(90); // Default: next 90 days  useEffect(() => {
    if (show) {
      loadAllDeadlines();
    }
  }, [show]);

  const loadAllDeadlines = async () => {
    setLoading(true);
    try {
      // Get all corporate entities
      const entitiesData = await window.electronAPI.getAllCorporateEntities();
      const corporateEntities = (entitiesData || []).filter(c => c.has_corporate_details);
      setCompanies(corporateEntities);

      const allDeadlines = [];
      const today = new Date().toISOString().split('T')[0];

      // Load filings and meetings for each company
      for (const company of corporateEntities) {
        const [filings, meetings] = await Promise.all([
          window.electronAPI.getFilings(company.client_id),
          window.electronAPI.getMeetings(company.client_id)
        ]);

        // Add upcoming filings
        (filings || []).forEach(f => {
          if (f.next_due_date && f.next_due_date >= today) {
            allDeadlines.push({
              type: 'filing',
              date: f.next_due_date,
              name: f.filing_type,
              description: f.filing_description,
              company_id: company.client_id,
              company_name: company.client_name,
              reminder_days: f.reminder_days,
              status: f.status
            });
          }
        });

        // Add upcoming meetings
        (meetings || []).forEach(m => {
          if (m.next_meeting_date && m.next_meeting_date >= today) {
            allDeadlines.push({
              type: 'meeting',
              date: m.next_meeting_date,
              name: m.meeting_type,
              description: m.next_meeting_agenda,
              company_id: company.client_id,
              company_name: company.client_name,
              reminder_days: m.reminder_days,
              status: m.status
            });
          }
        });
      }

      // Sort by date
      allDeadlines.sort((a, b) => a.date.localeCompare(b.date));
      setDeadlines(allDeadlines);
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handler
  const handleExport = async (format) => {
    if (filteredDeadlines.length === 0) return;
    
    const reportName = 'Compliance_Calendar';
    
    // Prepare data for export
    const exportData = filteredDeadlines.map(d => ({
      ['Date']: d.date,
      ['Days Left']: getDaysUntil(d.date),
      ['Type']: d.type === 'filing' 
        ? ('Filing') 
        : ('Meeting'),
      ['Item']: d.type === 'filing' ? getFilingTypeName(d.name) : getMeetingTypeName(d.name),
      ['Company']: d.company_name,
      ['Description']: d.description || '-'
    }));
    
    try {
      let result;
      if (format === 'excel') {
        result = await window.electronAPI.exportToExcel(exportData, reportName);
      } else if (format === 'csv') {
        result = await window.electronAPI.exportToCsv(exportData, reportName);
      } else if (format === 'pdf') {
        const columns = Object.keys(exportData[0] || {});
        result = await window.electronAPI.exportToPdf(exportData, reportName, columns);
      }
      
      if (result?.success) {
        const openFile = window.confirm(
          `Export successful!\n\nFile saved to:\n${result.filePath}\n\nWould you like to open it?`
        );
        if (openFile) {
          await window.electronAPI.openFile(result.filePath);
        }
      } else if (!result?.canceled) {
        alert(('Export failed: ') + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(('Export failed: ') + error.message);
    }
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const getFilingTypeName = (code) => {
    const types = {
      renewal: 'Annual Renewal',
      amendment: 'Amendment',
      capital_change: 'Capital Change',
      director_change: 'Director Change',
      shareholder_change: 'Shareholder Change',
      address_change: 'Address Change',
      name_change: 'Name Change',
      other: 'Other'
    };
    return types[code] || code;
  };

  const getMeetingTypeName = (code) => {
    const types = {
      board: 'Board Meeting',
      ordinary_ga: 'Ordinary GA',
      extraordinary_ga: 'Extraordinary GA',
      partners: 'Partners Meeting',
      directors: 'Directors Meeting',
      written_resolution: 'Written Resolution',
      owner_decision: 'Owner Decision',
      parent_directive: 'Parent Directive',
      other: 'Other'
    };
    return types[code] || code;
  };

  const filteredDeadlines = deadlines.filter(d => {
    const matchesCompany = filterCompany === 'all' || d.company_id === parseInt(filterCompany);
    const matchesType = filterType === 'all' || d.type === filterType;
    const matchesDays = getDaysUntil(d.date) <= filterDays;
    return matchesCompany && matchesType && matchesDays;
  });

  // Group by urgency
  const urgent = filteredDeadlines.filter(d => getDaysUntil(d.date) <= 7);
  const soon = filteredDeadlines.filter(d => getDaysUntil(d.date) > 7 && getDaysUntil(d.date) <= 30);
  const upcoming = filteredDeadlines.filter(d => getDaysUntil(d.date) > 30);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-amber-600" size={24} />
            {'Compliance Calendar'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 print:hidden"
              title="Export to Excel"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 print:hidden"
              title="Export to PDF"
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
            >
              <Printer size={16} />
              {'Print'}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 print:hidden">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">{'Filter:'}</span>
          </div>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">{'All Companies'}</option>
            {companies.map(c => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">{'All Types'}</option>
            <option value="filing">{'Filings'}</option>
            <option value="meeting">{'Meetings'}</option>
          </select>
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(parseInt(e.target.value))}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="7">{'Next 7 days'}</option>
            <option value="30">{'Next 30 days'}</option>
            <option value="90">{'Next 90 days'}</option>
            <option value="180">{'Next 6 months'}</option>
            <option value="365">{'Next year'}</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {'Loading...'}
            </div>
          ) : filteredDeadlines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>{'No upcoming deadlines found'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{urgent.length}</div>
                  <div className="text-sm text-red-700">{'Urgent (≤7 days)'}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">{soon.length}</div>
                  <div className="text-sm text-amber-700">{'Soon (8-30 days)'}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{upcoming.length}</div>
                  <div className="text-sm text-green-700">{'Upcoming (>30 days)'}</div>
                </div>
              </div>

              {/* Urgent Section */}
              {urgent.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-100 px-4 py-2 font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {'Urgent - Within 7 days'}
                  </div>
                  <div className="divide-y">
                    {urgent.map((d, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-red-50">
                        <div>
                          <div className="flex items-center gap-2">
                            {d.type === 'filing' ? <FileText size={16} className="text-orange-500" /> : <Calendar size={16} className="text-teal-500" />}
                            <span className="font-medium">
                              {d.type === 'filing' ? getFilingTypeName(d.name) : getMeetingTypeName(d.name)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Building2 size={14} className="inline mr-1" />
                            {d.company_name}
                            {d.description && ` • ${d.description}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{d.date}</div>
                          <div className="text-sm text-red-600">
                            {getDaysUntil(d.date) === 0 ? ('Today!') :
                             getDaysUntil(d.date) === 1 ? ('Tomorrow!') :
                             `${getDaysUntil(d.date)} ${'days'}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Soon Section */}
              {soon.length > 0 && (
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-100 px-4 py-2 font-semibold text-amber-800 flex items-center gap-2">
                    <Calendar size={18} />
                    {'Soon - Within 30 days'}
                  </div>
                  <div className="divide-y">
                    {soon.map((d, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-amber-50">
                        <div>
                          <div className="flex items-center gap-2">
                            {d.type === 'filing' ? <FileText size={16} className="text-orange-500" /> : <Calendar size={16} className="text-teal-500" />}
                            <span className="font-medium">
                              {d.type === 'filing' ? getFilingTypeName(d.name) : getMeetingTypeName(d.name)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Building2 size={14} className="inline mr-1" />
                            {d.company_name}
                            {d.description && ` • ${d.description}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{d.date}</div>
                          <div className="text-sm text-amber-600">
                            {getDaysUntil(d.date)} {'days'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Section */}
              {upcoming.length > 0 && (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-100 px-4 py-2 font-semibold text-green-800 flex items-center gap-2">
                    <Calendar size={18} />
                    {'Upcoming - More than 30 days'}
                  </div>
                  <div className="divide-y">
                    {upcoming.map((d, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-green-50">
                        <div>
                          <div className="flex items-center gap-2">
                            {d.type === 'filing' ? <FileText size={16} className="text-orange-500" /> : <Calendar size={16} className="text-teal-500" />}
                            <span className="font-medium">
                              {d.type === 'filing' ? getFilingTypeName(d.name) : getMeetingTypeName(d.name)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Building2 size={14} className="inline mr-1" />
                            {d.company_name}
                            {d.description && ` • ${d.description}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{d.date}</div>
                          <div className="text-sm text-green-600">
                            {getDaysUntil(d.date)} {'days'}
                          </div>
                        </div>
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

export default ComplianceCalendarReport;
