/**
 * ShareholderRegistryReport (v46.25)
 * Shows all shareholders across all companies
 */
import React, { useState, useEffect } from 'react';
import { X, Users, Building2, Printer, Filter, Download } from 'lucide-react';
import apiClient from '../../../api-client';

const ShareholderRegistryReport = ({ show, onClose}) => {
  const [loading, setLoading] = useState(true);
  const [shareholders, setShareholders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterNationality, setFilterNationality] = useState('all');
  const [sortBy, setSortBy] = useState('company');  useEffect(() => {
    if (show) {
      loadAllShareholders();
    }
  }, [show]);

  const loadAllShareholders = async () => {
    setLoading(true);
    try {
      // Get all corporate entities
      const entitiesData = await apiClient.getAllCorporateEntities();
      const corporateEntities = (entitiesData || []).filter(c => c.has_corporate_details);
      setCompanies(corporateEntities);

      const allShareholders = [];

      // Load shareholders for each company
      for (const company of corporateEntities) {
        const shareholdersData = await apiClient.getShareholders(company.client_id);
        
        (shareholdersData || []).forEach(s => {
          allShareholders.push({
            ...s,
            company_id: company.client_id,
            company_name: company.client_name,
            total_shares: company.total_shares
          });
        });
      }

      setShareholders(allShareholders);
    } catch (error) {
      console.error('Error loading shareholders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handler
  const handleExport = async (format) => {
    if (sortedShareholders.length === 0) return;
    
    const reportName = 'Shareholder_Registry';
    
    // Prepare data for export
    const exportData = sortedShareholders.map(s => ({
      ['Company']: s.company_name,
      ['Shareholder Name']: s.name,
      ['ID Number']: s.id_number || '-',
      ['Nationality']: s.nationality || '-',
      ['Shares']: s.shares_owned || 0,
      ['Percentage']: `${getSharePercentage(s.shares_owned, s.total_shares)}%`,
      ['Share Class']: s.share_class || '-'
    }));
    
    try {
      let result;
      if (format === 'excel') {
        result = await apiClient.exportToExcel(exportData, reportName);
      } else if (format === 'csv') {
        result = await apiClient.exportToCsv(exportData, reportName);
      } else if (format === 'pdf') {
        const columns = Object.keys(exportData[0] || {});
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

  const getSharePercentage = (shares, totalShares) => {
    if (!totalShares || totalShares === 0) return '0.00';
    return ((shares / totalShares) * 100).toFixed(2);
  };

  // Get unique nationalities for filter
  const nationalities = [...new Set(shareholders.map(s => s.nationality).filter(Boolean))].sort();

  const filteredShareholders = shareholders.filter(s => {
    const matchesCompany = filterCompany === 'all' || s.company_id === parseInt(filterCompany);
    const matchesNationality = filterNationality === 'all' || s.nationality === filterNationality;
    return matchesCompany && matchesNationality;
  });

  // Sort shareholders
  const sortedShareholders = [...filteredShareholders].sort((a, b) => {
    switch (sortBy) {
      case 'company':
        return a.company_name.localeCompare(b.company_name);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'shares':
        return (b.shares_owned || 0) - (a.shares_owned || 0);
      case 'nationality':
        return (a.nationality || '').localeCompare(b.nationality || '');
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalShares = filteredShareholders.reduce((sum, s) => sum + (s.shares_owned || 0), 0);
  const uniqueShareholderNames = new Set(filteredShareholders.map(s => s.name.toLowerCase())).size;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-teal-600" size={24} />
            {'Shareholder Registry'}
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
            value={filterNationality}
            onChange={(e) => setFilterNationality(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">{'All Nationalities'}</option>
            {nationalities.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="company">{'Sort: Company'}</option>
            <option value="name">{'Sort: Name'}</option>
            <option value="shares">{'Sort: Shares'}</option>
            <option value="nationality">{'Sort: Nationality'}</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {'Loading...'}
            </div>
          ) : filteredShareholders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>{'No shareholders found'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-teal-600">{filteredShareholders.length}</div>
                  <div className="text-sm text-teal-700">{'Total Records'}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{uniqueShareholderNames}</div>
                  <div className="text-sm text-blue-700">{'Unique Shareholders'}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{totalShares.toLocaleString()}</div>
                  <div className="text-sm text-green-700">{'Total Shares'}</div>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Company'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Shareholder Name'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'ID Number'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Nationality'}
                      </th>
                      <th className="px-4 py-3 font-medium text-center">
                        {'Shares'}
                      </th>
                      <th className="px-4 py-3 font-medium text-center">
                        {'%'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Share Class'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedShareholders.map((s, idx) => (
                      <tr key={`${s.company_id}-${s.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400" />
                            {s.company_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3">{s.id_number || '-'}</td>
                        <td className="px-4 py-3">{s.nationality || '-'}</td>
                        <td className="px-4 py-3 text-center">{s.shares_owned?.toLocaleString() || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                            {getSharePercentage(s.shares_owned, s.total_shares)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{s.share_class || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

export default ShareholderRegistryReport;
