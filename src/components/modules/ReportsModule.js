import React, { useState, useEffect } from 'react';
import {
  FileText, Briefcase, DollarSign, PieChart, Download, Building2, Users, UserCheck, Calendar
} from 'lucide-react';
import apiClient from '../../api-client';

// ============================================
// REPORTS MODULE COMPONENT
// v48 - Language removal (English-only UI)
// ============================================
const ReportsModule = ({
  formatDate,
  setShowClientStatement,
  setShowCaseStatusReport,
  setShowClient360Report,
  // Corporate report modal handlers
  setShowCompany360Report,
  setShowComplianceCalendar,
  setShowShareholderRegistry,
  setShowDirectorRegistry
}) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Date filter state
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.substring(0, 7) + '-01';
  const firstOfYear = today.substring(0, 4) + '-01-01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [datePreset, setDatePreset] = useState('thisMonth');

  const reports = [
    { id: 'outstanding-receivables', label: 'Outstanding Receivables', category: 'financial' },
    { id: 'revenue-by-client', label: 'Revenue by Client', category: 'financial' },
    { id: 'revenue-by-matter', label: 'Revenue by Matter', category: 'financial' },
    { id: 'retainer-balances', label: 'Retainer Balances', category: 'financial' },
    { id: 'time-by-lawyer', label: 'Time by Lawyer', category: 'time' },
    { id: 'time-by-client', label: 'Time by Client', category: 'time' },
    { id: 'unbilled-time', label: 'Unbilled Time', category: 'time' },
    { id: 'active-matters', label: 'Active Matters', category: 'matters' },
    { id: 'upcoming-hearings', label: 'Upcoming Hearings', category: 'matters' },
    { id: 'pending-judgments', label: 'Pending Judgments', category: 'matters' },
    { id: 'tasks-overdue', label: 'Overdue Tasks', category: 'tasks' },
    { id: 'expenses-by-category', label: 'Expenses by Category', category: 'expenses' },
  ];

  // Reports that support date filtering
  const dateFilterableReports = ['revenue-by-client', 'revenue-by-matter', 'time-by-lawyer', 'time-by-client', 'expenses-by-category'];

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'thisMonth':
        setDateFrom(firstOfMonth);
        setDateTo(today);
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        setDateFrom(lastMonth.toISOString().split('T')[0]);
        setDateTo(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'thisQuarter':
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        setDateFrom(qStart.toISOString().split('T')[0]);
        setDateTo(today);
        break;
      case 'thisYear':
        setDateFrom(firstOfYear);
        setDateTo(today);
        break;
      case 'allTime':
        setDateFrom('2020-01-01');
        setDateTo(today);
        break;
      default:
        break;
    }
  };

  const loadReport = async (reportId) => {
    setLoading(true);
    setSelectedReport(reportId);
    try {
      const filters = dateFilterableReports.includes(reportId) 
        ? { dateFrom, dateTo } 
        : {};
      const data = await apiClient.generateReport(reportId, filters);
      setReportData(data || []);
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload report when date filters change
  useEffect(() => {
    if (selectedReport && dateFilterableReports.includes(selectedReport)) {
      loadReport(selectedReport);
    }
  }, [dateFrom, dateTo]);

  const formatMinutes = (mins) => {
    if (!mins) return '0h';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  // Export handler
  const handleExport = async (format) => {
    if (!selectedReport || reportData.length === 0) return;
    
    const reportName = reports.find(r => r.id === selectedReport)?.label || 'Report';
    
    try {
      let result;
      if (format === 'excel') {
        result = await apiClient.exportToExcel(reportData, reportName);
      } else if (format === 'csv') {
        result = await apiClient.exportToCsv(reportData, reportName);
      } else if (format === 'pdf') {
        // Get column headers based on report type
        const columns = Object.keys(reportData[0] || {});
        result = await apiClient.exportToPdf(reportData, reportName, columns);
      }
      
      if (result?.success) {
        // Optionally open the file
        const openFile = window.confirm(`Export successful!\n\nFile saved to:\n${result.filePath}\n\nWould you like to open it?`);
        if (openFile) {
          await apiClient.openFile(result.filePath);
        }
      } else if (!result?.canceled) {
        alert('Export failed: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    }
  };

  const renderReportTable = () => {
    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (!selectedReport) return <div className="text-center py-8 text-gray-500">Select a report to view</div>;
    if (reportData.length === 0) return <div className="text-center py-8 text-gray-500">No data available</div>;

    // Render different tables based on report type
    switch (selectedReport) {
      case 'outstanding-receivables':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.invoice_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.invoice_number}</td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{formatDate(row.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={row.days_overdue > 30 ? 'text-red-600 font-medium' : ''}>
                      {row.days_overdue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{row.currency_code} {parseFloat(row.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'revenue-by-client':
      case 'revenue-by-matter':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {selectedReport === 'revenue-by-client' ? 'Client' : 'Matter'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoiced</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{selectedReport === 'revenue-by-client' ? row.client_name : row.matter_name}</td>
                  <td className="px-4 py-3 text-right">{row.currency_code} {parseFloat(row.total_invoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-green-600">{row.currency_code} {parseFloat(row.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-red-600">{row.currency_code} {parseFloat(row.total_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'retainer-balances':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.matter_name || 'General'}</td>
                  <td className="px-4 py-3 text-right font-medium">{row.currency_code} {parseFloat(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'time-by-lawyer':
      case 'time-by-client':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {selectedReport === 'time-by-lawyer' ? 'Lawyer' : 'Client'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Non-Billable Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{selectedReport === 'time-by-lawyer' ? row.lawyer_name : row.client_name}</td>
                  <td className="px-4 py-3 text-right">{formatMinutes(row.billable_minutes)}</td>
                  <td className="px-4 py-3 text-right">{formatMinutes(row.non_billable_minutes)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMinutes(row.total_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'unbilled-time':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lawyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.timesheet_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(row.work_date)}</td>
                  <td className="px-4 py-3">{row.lawyer_name}</td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.matter_name}</td>
                  <td className="px-4 py-3 text-sm">{row.description}</td>
                  <td className="px-4 py-3 text-right">{row.hours}</td>
                  <td className="px-4 py-3 text-right font-medium">{row.currency_code} {parseFloat(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'active-matters':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Lawyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.matter_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.matter_name}</td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      row.matter_status === 'active' ? 'bg-green-100 text-green-700' :
                      row.matter_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.matter_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.lawyer_name}</td>
                  <td className="px-4 py-3">{formatDate(row.opened_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'upcoming-hearings':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.hearing_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(row.hearing_date)}</td>
                  <td className="px-4 py-3">{row.hearing_time || '-'}</td>
                  <td className="px-4 py-3">{row.matter_name}</td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.court_name}</td>
                  <td className="px-4 py-3">{row.purpose_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'pending-judgments':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judgment Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.judgment_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.matter_name}</td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.court_name}</td>
                  <td className="px-4 py-3">{formatDate(row.judgment_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      row.judgment_status === 'favorable' ? 'bg-green-100 text-green-700' :
                      row.judgment_status === 'unfavorable' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.judgment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'tasks-overdue':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(row => (
                <tr key={row.task_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.task_title}</td>
                  <td className="px-4 py-3">{row.matter_name}</td>
                  <td className="px-4 py-3">{row.assigned_to_name}</td>
                  <td className="px-4 py-3">{formatDate(row.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={row.days_overdue > 7 ? 'text-red-600 font-medium' : 'text-yellow-600'}>
                      {row.days_overdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'expenses-by-category':
        return (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.category_name}</td>
                  <td className="px-4 py-3 text-right">{row.expense_count}</td>
                  <td className="px-4 py-3 text-right font-medium">{row.currency_code} {parseFloat(row.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            Report type not configured
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-600" />
          <h2 className="text-2xl font-bold">Reports</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Report Categories Sidebar */}
        <div className="space-y-4">
          {/* Client Intelligence Section */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Client Intelligence</h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowClientStatement && setShowClientStatement(true)}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded text-blue-700 hover:bg-blue-100 text-sm font-medium flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4" />
                Client Statement
              </button>
              <button
                onClick={() => setShowCaseStatusReport && setShowCaseStatusReport(true)}
                className="w-full px-3 py-2 bg-purple-50 border border-purple-100 rounded text-purple-700 hover:bg-purple-100 text-sm font-medium flex items-center gap-2"
              >
                <PieChart className="w-4 h-4" />
                Case Status Report
              </button>
              <button
                onClick={() => setShowClient360Report && setShowClient360Report(true)}
                className="w-full px-3 py-2 bg-green-50 border border-green-100 rounded text-green-700 hover:bg-green-100 text-sm font-medium flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Client 360° Profile
              </button>
            </div>
          </div>

          {/* Corporate Reports Section */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Corporate Secretary
            </h4>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <button 
                onClick={() => setShowCompany360Report && setShowCompany360Report(true)}
                className="w-full flex items-center gap-2 text-purple-700 hover:text-purple-800 font-medium text-sm"
              >
                <Building2 className="w-4 h-4" />
                Company 360° Profile
              </button>
              <p className="text-xs text-purple-600 mt-1">
                Full profile with shareholders, directors, and filings
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <button 
                onClick={() => setShowComplianceCalendar && setShowComplianceCalendar(true)}
                className="w-full flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium text-sm"
              >
                <Calendar className="w-4 h-4" />
                Compliance Calendar
              </button>
              <p className="text-xs text-amber-600 mt-1">
                All upcoming deadlines for all companies
              </p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
              <button 
                onClick={() => setShowShareholderRegistry && setShowShareholderRegistry(true)}
                className="w-full flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium text-sm"
              >
                <Users className="w-4 h-4" />
                Shareholder Registry
              </button>
              <p className="text-xs text-teal-600 mt-1">
                All shareholders across all companies
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
              <button 
                onClick={() => setShowDirectorRegistry && setShowDirectorRegistry(true)}
                className="w-full flex items-center gap-2 text-rose-700 hover:text-rose-800 font-medium text-sm"
              >
                <UserCheck className="w-4 h-4" />
                Director Registry
              </button>
              <p className="text-xs text-rose-600 mt-1">
                All directors across all companies
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Financial</h4>
            {reports.filter(r => r.category === 'financial').map(report => (
              <button key={report.id} onClick={() => loadReport(report.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                {report.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Time</h4>
            {reports.filter(r => r.category === 'time').map(report => (
              <button key={report.id} onClick={() => loadReport(report.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                {report.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Matters</h4>
            {reports.filter(r => r.category === 'matters').map(report => (
              <button key={report.id} onClick={() => loadReport(report.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                {report.label}
              </button>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Other</h4>
            {reports.filter(r => r.category === 'tasks' || r.category === 'expenses').map(report => (
              <button key={report.id} onClick={() => loadReport(report.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${selectedReport === report.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                {report.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Results */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-medium">
              {selectedReport ? reports.find(r => r.id === selectedReport)?.label : 'Report Results'}
            </h3>
            <div className="flex items-center gap-2">
              {reportData.length > 0 && (
                <>
                  <span className="text-sm text-gray-500 mr-2">{reportData.length} records</span>
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    title="Export to Excel"
                  >
                    <Download size={14} />
                    Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    title="Export to CSV"
                  >
                    <Download size={14} />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    title="Export to PDF"
                  >
                    <FileText size={14} />
                    PDF
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Date Filters - only show for applicable reports */}
          {selectedReport && dateFilterableReports.includes(selectedReport) && (
            <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Period:</label>
                <select
                  value={datePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisQuarter">This Quarter</option>
                  <option value="thisYear">This Year</option>
                  <option value="allTime">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                  className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }}
                  className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            {renderReportTable()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
