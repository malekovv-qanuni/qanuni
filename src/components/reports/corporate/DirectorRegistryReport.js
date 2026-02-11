/**
 * DirectorRegistryReport (v46.25)
 * Shows all directors across all companies
 */
import React, { useState, useEffect } from 'react';
import { X, UserCheck, Building2, Printer, Filter, Download } from 'lucide-react';
import apiClient from '../../../api-client';

const DirectorRegistryReport = ({ show, onClose}) => {
  const [loading, setLoading] = useState(true);
  const [directors, setDirectors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [sortBy, setSortBy] = useState('company');  useEffect(() => {
    if (show) {
      loadAllDirectors();
    }
  }, [show]);

  const loadAllDirectors = async () => {
    setLoading(true);
    try {
      // Get all corporate entities
      const entitiesData = await apiClient.getAllCorporateEntities();
      const corporateEntities = (entitiesData || []).filter(c => c.has_corporate_details);
      setCompanies(corporateEntities);

      const allDirectors = [];

      // Load directors for each company
      for (const company of corporateEntities) {
        const directorsData = await apiClient.getDirectors(company.client_id);
        
        (directorsData || []).forEach(d => {
          allDirectors.push({
            ...d,
            company_id: company.client_id,
            company_name: company.client_name
          });
        });
      }

      setDirectors(allDirectors);
    } catch (error) {
      console.error('Error loading directors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handler
  const handleExport = async (format) => {
    if (sortedDirectors.length === 0) return;
    
    const reportName = 'Director_Registry';
    
    // Prepare data for export
    const exportData = sortedDirectors.map(d => ({
      ['Company']: d.company_name,
      ['Director Name']: d.name,
      ['Position']: getPositionLabel(d.position),
      ['Nationality']: d.nationality || '-',
      ['Appointed']: d.date_appointed || '-',
      ['Signatory']: d.is_signatory 
        ? ('Yes') 
        : ('No'),
      ['Status']: d.date_resigned 
        ? `${'Resigned'} ${d.date_resigned}` 
        : ('Active')
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

  const getPositionLabel = (position) => {
    const positions = {
      'Director': 'Director',
      'Chairman': 'Chairman',
      'Vice Chairman': 'Vice Chairman',
      'Managing Director': 'Managing Director',
      'Secretary': 'Secretary',
      'Treasurer': 'Treasurer'
    };
    return positions[position] || position;
  };

  // Get unique positions for filter
  const positions = [...new Set(directors.map(d => d.position).filter(Boolean))].sort();

  const filteredDirectors = directors.filter(d => {
    const matchesCompany = filterCompany === 'all' || d.company_id === parseInt(filterCompany);
    const matchesPosition = filterPosition === 'all' || d.position === filterPosition;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !d.date_resigned) ||
      (filterStatus === 'resigned' && d.date_resigned);
    return matchesCompany && matchesPosition && matchesStatus;
  });

  // Sort directors
  const sortedDirectors = [...filteredDirectors].sort((a, b) => {
    switch (sortBy) {
      case 'company':
        return a.company_name.localeCompare(b.company_name);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'position':
        return (a.position || '').localeCompare(b.position || '');
      case 'date':
        return (b.date_appointed || '').localeCompare(a.date_appointed || '');
      default:
        return 0;
    }
  });

  // Calculate stats
  const activeDirectors = filteredDirectors.filter(d => !d.date_resigned);
  const signatories = filteredDirectors.filter(d => d.is_signatory && !d.date_resigned);
  const uniqueDirectorNames = new Set(filteredDirectors.map(d => d.name.toLowerCase())).size;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="text-rose-600" size={24} />
            {'Director Registry'}
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
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">{'All Positions'}</option>
            {positions.map(p => (
              <option key={p} value={p}>{getPositionLabel(p)}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">{'All Status'}</option>
            <option value="active">{'Active'}</option>
            <option value="resigned">{'Resigned'}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="company">{'Sort: Company'}</option>
            <option value="name">{'Sort: Name'}</option>
            <option value="position">{'Sort: Position'}</option>
            <option value="date">{'Sort: Date'}</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {'Loading...'}
            </div>
          ) : filteredDirectors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
              <p>{'No directors found'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-rose-600">{filteredDirectors.length}</div>
                  <div className="text-sm text-rose-700">{'Total Records'}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{uniqueDirectorNames}</div>
                  <div className="text-sm text-blue-700">{'Unique Directors'}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{activeDirectors.length}</div>
                  <div className="text-sm text-green-700">{'Active Directors'}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{signatories.length}</div>
                  <div className="text-sm text-purple-700">{'Signatories'}</div>
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
                        {'Director Name'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Position'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Nationality'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Appointed'}
                      </th>
                      <th className="px-4 py-3 font-medium text-center">
                        {'Signatory'}
                      </th>
                      <th className="px-4 py-3 font-medium text-left">
                        {'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedDirectors.map((d, idx) => (
                      <tr key={`${d.company_id}-${d.id}`} className={`hover:bg-gray-50 ${d.date_resigned ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400" />
                            {d.company_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{d.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {getPositionLabel(d.position)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{d.nationality || '-'}</td>
                        <td className="px-4 py-3">{d.date_appointed || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {d.is_signatory ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              ✓ {'Yes'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.date_resigned ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                              {'Resigned'} {d.date_resigned}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {'Active'}
                            </span>
                          )}
                        </td>
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

export default DirectorRegistryReport;
