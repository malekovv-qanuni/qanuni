/**
 * AdversePartiesInput Component (v46.34)
 * Manages adverse party entries with conflict checking
 * Used in MatterForm to track opposing parties
 */
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, UserX, Loader2 } from 'lucide-react';

const AdversePartiesInput = ({ value, onChange, onConflictCheck, disabled }) => {
  const [parties, setParties] = useState(() => {
    try { 
      return JSON.parse(value) || []; 
    } catch { 
      return []; 
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Sync parties state when value prop changes (e.g., when editing existing matter)
  useEffect(() => {
    try {
      const parsed = JSON.parse(value) || [];
      setParties(parsed);
    } catch {
      setParties([]);
    }
  }, [value]);

  const addParty = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    // Check for duplicates
    if (parties.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      return; // Don't add duplicate
    }
    
    // Run conflict check before adding
    if (onConflictCheck && trimmed.length >= 2) {
      setChecking(true);
      try {
        await onConflictCheck(trimmed);
      } catch (error) {
        console.error('Conflict check error:', error);
      }
      setChecking(false);
      setLastChecked(trimmed);
    }
    
    const newParties = [...parties, trimmed];
    setParties(newParties);
    onChange(JSON.stringify(newParties));
    setInputValue('');
  };

  const removeParty = (index) => {
    const newParties = parties.filter((_, i) => i !== index);
    setParties(newParties);
    onChange(JSON.stringify(newParties));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addParty();
    }
  };

  return (
    <div className="space-y-2">
      {/* Input field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || checking}
            placeholder={'Enter adverse party name'}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400"
            dir={'ltr'}
          />
          {checking && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        <button 
          type="button" 
          onClick={addParty}
          disabled={disabled || checking || !inputValue.trim()}
          className="px-4 py-2 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 text-red-700 font-medium transition-colors flex items-center gap-2"
        >
          <UserX className="w-4 h-4" />
          {'Add'}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        {'Each party will be checked against the database when added'}
      </p>

      {/* Tags display */}
      {parties.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-red-50 border border-red-100 rounded-md">
          {parties.map((party, i) => (
            <span 
              key={i} 
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 rounded-full text-sm text-red-800 shadow-sm"
            >
              <UserX className="w-3 h-3 text-red-500" />
              {party}
              {!disabled && (
                <button 
                  type="button" 
                  onClick={() => removeParty(i)}
                  className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                  title={'Remove'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {parties.length === 0 && (
        <div className="text-sm text-gray-400 italic">
          {'No adverse parties added yet'}
        </div>
      )}
    </div>
  );
};

export default AdversePartiesInput;
