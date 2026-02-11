import React from 'react';
import { Scale } from 'lucide-react';
import { useDialog } from '../../contexts';

/**
 * AppealMatterDialog - Dialog for creating appeal matters from judgments
 * Extracted from App.js v46.17 → v46.18
 * Migrated to DialogContext (Phase 3c.6)
 *
 * Props:
 * - createAppealMatter: Function to create the appeal matter
 * - courtTypes: Array of court types for dropdown
 * - showToast: Function to show toast notifications
 */
const AppealMatterDialog = ({
  createAppealMatter,
  courtTypes,
  showToast}) => {
  const { isOpen, data, closeDialog } = useDialog('appealMatter');

  if (!isOpen || !data) return null;

  const handleCreate = () => {
    const courtTypeId = document.getElementById('appealCourtType').value;
    const newCaseNumber = document.getElementById('appealCaseNumber').value;
    if (!courtTypeId) {
      showToast('Please select a court', 'error');
      return;
    }
    createAppealMatter({
      originalMatter: data.matter,
      courtTypeId,
      newCaseNumber
    });
  };

  const handleClose = () => {
    closeDialog();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg ltr">
        <div className="p-4 border-b bg-purple-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {'Create Appeal Matter'}
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Original Matter Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-600 mb-1">{'Original Matter:'}</p>
            <p className="font-medium">{data.matter?.matter_name}</p>
            {data.matter?.case_number && (
              <p className="text-gray-500">{'Case #:'} {data.matter.case_number}</p>
            )}
          </div>
          
          {/* Court Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'Appeal Court'} *
            </label>
            <select
              id="appealCourtType"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue=""
            >
              <option value="">-- {'Select Court'} --</option>
              {courtTypes.filter(ct => 
                ct.name_en?.toLowerCase().includes('appeal') || 
                ct.name_ar?.includes('استئناف') ||
                ct.name_en?.toLowerCase().includes('cassation') ||
                ct.name_ar?.includes('تمييز')
              ).map(ct => (
                <option key={ct.court_type_id} value={ct.court_type_id}>
                  {ct.name_en}
                </option>
              ))}
              <optgroup label={'All Courts'}>
                {courtTypes.map(ct => (
                  <option key={ct.court_type_id} value={ct.court_type_id}>
                    {ct.name_en}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          {/* New Case Number */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {'New Case Number'} ({'optional'})
            </label>
            <input
              type="text"
              id="appealCaseNumber"
              className="w-full px-3 py-2 border rounded-md"
              placeholder={'Enter appeal case number'}
            />
          </div>
          
          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p>ℹ️ {'A new matter will be created linked to the original case. The original matter will remain unchanged.'}</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            {'Not Now'}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {'Create Appeal Matter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppealMatterDialog;
