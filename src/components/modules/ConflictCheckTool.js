/**
 * ConflictCheckTool Component (v46.34)
 * Standalone conflict of interest search tool
 * For intake calls and preliminary checks before client/matter creation
 */
import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Loader2, UserX, Users, Briefcase, Building2, Phone, Mail, FileText, X } from 'lucide-react';
import { tf } from '../../utils';
import apiClient from '../../api-client';

const ConflictCheckTool = ({ showToast}) => {
  const [searchTerms, setSearchTerms] = useState({
    name: '',
    registration_number: '',
    vat_number: '',
    email: '',
    phone: ''
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async () => {
    // Validate at least one field has value
    const hasSearchTerm = Object.values(searchTerms).some(v => v && v.trim().length >= 2);
    if (!hasSearchTerm) {
      showToast(
        'Please enter at least one search term (minimum 2 characters)',
        'error'
      );
      return;
    }

    setSearching(true);
    setSearchPerformed(false);
    
    try {
      // Build search terms object with only non-empty values
      const terms = {};
      if (searchTerms.name?.trim()) terms.name = searchTerms.name.trim();
      if (searchTerms.registration_number?.trim()) terms.registration_number = searchTerms.registration_number.trim();
      if (searchTerms.vat_number?.trim()) terms.vat_number = searchTerms.vat_number.trim();
      if (searchTerms.email?.trim()) terms.email = searchTerms.email.trim();
      if (searchTerms.phone?.trim()) terms.phone = searchTerms.phone.trim();

      const searchResults = await apiClient.conflictCheck(terms);
      setResults(searchResults || []);
      setSearchPerformed(true);

      // Log the search
      if (apiClient.logConflictCheck) {
        await apiClient.logConflictCheck({
          check_type: 'standalone_search',
          search_terms: terms,
          results_found: searchResults || [],
          decision: 'search_only',
          entity_type: null,
          entity_id: null
        });
      }
    } catch (error) {
      console.error('Conflict check error:', error);
      showToast(
        'Search error',
        'error'
      );
      setResults([]);
    }
    
    setSearching(false);
  };

  const handleClear = () => {
    setSearchTerms({
      name: '',
      registration_number: '',
      vat_number: '',
      email: '',
      phone: ''
    });
    setResults(null);
    setSearchPerformed(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getMatchTypeIcon = (matchType) => {
    switch (matchType) {
      case 'client_name': return <Users className="w-4 h-4" />;
      case 'shareholder': return <Building2 className="w-4 h-4" />;
      case 'director': return <Briefcase className="w-4 h-4" />;
      case 'adverse_party': return <UserX className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'registration_number':
      case 'vat_number': return <FileText className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getMatchTypeLabel = (matchType) => {
    const labels = {
      client_name: 'Client',
      shareholder: 'Shareholder',
      director: 'Director',
      adverse_party: 'Adverse Party',
      email: 'Email',
      phone: 'Phone',
      registration_number: 'Registration #',
      vat_number: 'VAT #'
    };
    return labels[matchType] || matchType;
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-100 border-red-300',
          text: 'text-red-800',
          badge: 'bg-red-200 text-red-800'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-100 border-orange-300',
          text: 'text-orange-800',
          badge: 'bg-orange-200 text-orange-800'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-100 border-yellow-300',
          text: 'text-yellow-800',
          badge: 'bg-yellow-200 text-yellow-800'
        };
      default:
        return {
          bg: 'bg-gray-100 border-gray-300',
          text: 'text-gray-700',
          badge: 'bg-gray-200 text-gray-700'
        };
    }
  };

  // Group results by severity for summary
  const getSeverityCounts = () => {
    if (!results) return {};
    return results.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {});
  };

  const severityCounts = getSeverityCounts();

  return (
    <div className="p-6 ltr">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Search className="w-7 h-7 text-blue-600" />
          {'Conflict Check Tool'}
        </h1>
        <p className="text-gray-600 mt-1">
          {'Search the database to check for potential conflicts of interest before accepting a new client'}
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500" />
          {'Search Criteria'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name - Primary search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">
              {'Name (Person or Company)'} *
            </label>
            <input
              type="text"
              value={searchTerms.name}
              onChange={(e) => setSearchTerms({ ...searchTerms, name: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={'Enter name to search...'}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir={'ltr'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {'Searches: Clients, Shareholders, Directors, Adverse Parties'}
            </p>
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'Registration Number'}
            </label>
            <input
              type="text"
              value={searchTerms.registration_number}
              onChange={(e) => setSearchTerms({ ...searchTerms, registration_number: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={'Registration #...'}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* VAT Number */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'VAT Number'}
            </label>
            <input
              type="text"
              value={searchTerms.vat_number}
              onChange={(e) => setSearchTerms({ ...searchTerms, vat_number: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={'VAT #...'}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'Email'}
            </label>
            <input
              type="email"
              value={searchTerms.email}
              onChange={(e) => setSearchTerms({ ...searchTerms, email: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={'Email...'}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'Phone Number'}
            </label>
            <input
              type="tel"
              value={searchTerms.phone}
              onChange={(e) => setSearchTerms({ ...searchTerms, phone: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={'Phone...'}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 font-medium"
          >
            {searching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {'Searching...'}
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {'Search'}
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium"
          >
            <X className="w-5 h-5" />
            {'Clear'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {searchPerformed && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {results.length > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                {tf('Search Results ({count})', { count: results.length })}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                {'No Matches Found'}
              </>
            )}
          </h2>

          {/* Results found */}
          {results.length > 0 ? (
            <>
              {/* Severity Summary */}
              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                {severityCounts.CRITICAL > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    🔴 CRITICAL: {severityCounts.CRITICAL}
                  </span>
                )}
                {severityCounts.HIGH > 0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    🟠 HIGH: {severityCounts.HIGH}
                  </span>
                )}
                {severityCounts.MEDIUM > 0 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    🟡 MEDIUM: {severityCounts.MEDIUM}
                  </span>
                )}
                {severityCounts.LOW > 0 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    ⚪ LOW: {severityCounts.LOW}
                  </span>
                )}
              </div>

              {/* Results List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {results.map((result, idx) => {
                  const style = getSeverityStyle(result.severity);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${style.bg} ${style.text}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${style.badge}`}>
                            {getMatchTypeIcon(result.match_type)}
                          </div>
                          <div>
                            <div className="font-semibold text-base">
                              {result.client_name || result.matched_value}
                            </div>
                            <div className="text-sm opacity-80 flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                                {getMatchTypeLabel(result.match_type)}
                              </span>
                              {result.matched_value && result.match_type !== 'client_name' && (
                                <span>• {result.matched_value}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.badge}`}>
                          {result.severity}
                        </span>
                      </div>
                      
                      {result.display_info && (
                        <div className="mt-2 text-sm opacity-90 pl-12">
                          {result.display_info}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Warning Footer */}
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>{'Note:'}</strong>{' '}
                  {'Please review these results carefully before accepting the client. Matches may indicate a potential conflict of interest.'}
                </p>
              </div>
            </>
          ) : (
            /* No results */
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-green-700 font-medium">
                {'No matches found in the database'}
              </p>
              <p className="text-gray-500 mt-2">
                {'You may proceed with accepting this client'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions when no search performed */}
      {!searchPerformed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-3">
            {'How to Use'}
          </h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• {'Enter a person or company name to check for potential conflicts'}</li>
            <li>• {'You can also search by registration number, VAT, email, or phone'}</li>
            <li>• {'Results are classified by severity: Critical, High, Medium, Low'}</li>
            <li>• {'Searches clients, shareholders, directors, and adverse parties'}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConflictCheckTool;
