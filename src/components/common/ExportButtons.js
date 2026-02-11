import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';

/**
 * ExportButtons - Excel and PDF export icon buttons
 * v46.55 - Export from Current View feature
 * 
 * Props:
 *   onExportExcel: () => void
 *   onExportPdf: () => void
 *   disabled: boolean (optional, disables when no data)
 */
const ExportButtons = ({ onExportExcel, onExportPdf, disabled = false }) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onExportExcel}
        disabled={disabled}
        title={'Export to Excel'}
        className="p-2 rounded-md hover:bg-green-50 text-green-600 hover:text-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button
        onClick={onExportPdf}
        disabled={disabled}
        title={'Export to PDF'}
        className="p-2 rounded-md hover:bg-red-50 text-red-600 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <FileText className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ExportButtons;
