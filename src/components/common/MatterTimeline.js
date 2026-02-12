import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, Scale, Clock, Receipt, CheckSquare, FileText,
  Filter, Download, Plus, ChevronDown, ChevronUp, Edit2, Trash2,
  Gavel, FileSpreadsheet, Printer
} from 'lucide-react';
import { useDialog } from '../../contexts';
import apiClient from '../../api-client';

/**
 * MatterTimeline.js
 * v46.51: Full matter timeline with auto-pulled data + manual diary entries
 * Migrated to DialogContext (Phase 3c.6)
 *
 * Features:
 * - Chronological view of all matter activity
 * - Auto-pulls: hearings, judgments, timesheets, expenses, tasks
 * - Manual diary entries for court filings, communications, etc.
 * - Filter by entry type
 * - Export to Excel and PDF
 */

// Entry type configuration
const ENTRY_TYPES = {
  hearing: { 
    icon: Calendar, 
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    label_en: 'Hearing', 
    label_ar: 'جلسة' 
  },
  judgment: { 
    icon: Gavel, 
    color: 'bg-purple-100 text-purple-600 border-purple-200',
    label_en: 'Judgment', 
    label_ar: 'حكم' 
  },
  timesheet: { 
    icon: Clock, 
    color: 'bg-green-100 text-green-600 border-green-200',
    label_en: 'Time Entry', 
    label_ar: 'تسجيل وقت' 
  },
  expense: { 
    icon: Receipt, 
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    label_en: 'Expense', 
    label_ar: 'مصروف' 
  },
  task: { 
    icon: CheckSquare, 
    color: 'bg-teal-100 text-teal-600 border-teal-200',
    label_en: 'Task', 
    label_ar: 'مهمة' 
  },
  diary: { 
    icon: FileText, 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    label_en: 'Note', 
    label_ar: 'ملاحظة' 
  }
};

// Diary entry subtypes
const DIARY_SUBTYPES = [
  { value: 'note', label_en: 'General Note', label_ar: 'ملاحظة عامة' },
  { value: 'filing', label_en: 'Court Filing', label_ar: 'إيداع محكمة' },
  { value: 'communication', label_en: 'Communication', label_ar: 'تواصل' },
  { value: 'court_visit', label_en: 'Court Visit', label_ar: 'زيارة محكمة' },
  { value: 'document', label_en: 'Document', label_ar: 'مستند' },
  { value: 'payment', label_en: 'Payment', label_ar: 'دفعة' },
  { value: 'other', label_en: 'Other', label_ar: 'أخرى' }
];

// Timeline Entry Component
const TimelineEntry = ({ entry, isExpanded, onToggle, onEdit, onDelete }) => {
  const config = ENTRY_TYPES[entry.type] || ENTRY_TYPES.diary;
  const Icon = config.icon;  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline line */}
      <div className="absolute top-0 bottom-0 left-3 w-0.5 bg-gray-200" />
      
      {/* Timeline dot */}
      <div className={`absolute top-1 left-0 w-6 h-6 rounded-full ${config.color} border-2 flex items-center justify-center`}>
        <Icon className="w-3 h-3" />
      </div>
      
      {/* Entry card */}
      <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ml-4">
        <div 
          className="p-3 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                  {config.label_en}
                </span>
                {entry.source === 'manual' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    {'Manual'}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 mt-1">
                {entry.title}
              </h4>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{formatDate(entry.date)}</span>
                {entry.time && <span>{formatTime(entry.time)}</span>}
                {entry.lawyer_name && (
                  <span>{entry.lawyer_name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {entry.amount && (
                <span className="text-sm font-medium text-gray-700">
                  {entry.currency || 'USD'} {entry.amount.toLocaleString()}
                </span>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </div>
        
        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t bg-gray-50">
            <div className="pt-3 space-y-2 text-sm">
              {entry.description && (
                <p className="text-gray-700 whitespace-pre-wrap">{entry.description}</p>
              )}
              
              {/* Type-specific details */}
              {entry.type === 'hearing' && (
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  {entry.court_name && (
                    <div>
                      <span className="font-medium">{'Court: '}</span>
                      {entry.court_name}
                    </div>
                  )}
                  {entry.region_name && (
                    <div>
                      <span className="font-medium">{'Region: '}</span>
                      {entry.region_name}
                    </div>
                  )}
                  {entry.outcome && (
                    <div className="col-span-2">
                      <span className="font-medium">{'Outcome: '}</span>
                      {entry.outcome}
                    </div>
                  )}
                </div>
              )}
              
              {entry.type === 'judgment' && (
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  {entry.outcome && (
                    <div>
                      <span className="font-medium">{'Outcome: '}</span>
                      {entry.outcome}
                    </div>
                  )}
                  {entry.in_favor && (
                    <div>
                      <span className="font-medium">{'In favor of: '}</span>
                      {entry.in_favor}
                    </div>
                  )}
                </div>
              )}
              
              {entry.type === 'timesheet' && (
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>
                    <span className="font-medium">{'Duration: '}</span>
                    {(entry.minutes / 60).toFixed(1)}h
                  </div>
                  {entry.rate && (
                    <div>
                      <span className="font-medium">{'Rate: '}</span>
                      ${entry.rate}/hr
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{'Billable: '}</span>
                    {entry.billable ? ('Yes') : ('No')}
                  </div>
                </div>
              )}
              
              {entry.type === 'task' && (
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>
                    <span className="font-medium">{'Status: '}</span>
                    {entry.status}
                  </div>
                  <div>
                    <span className="font-medium">{'Priority: '}</span>
                    {entry.priority}
                  </div>
                </div>
              )}
              
              {/* Edit/Delete for manual entries */}
              {entry.source === 'manual' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                    {'Edit'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                    {'Delete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Diary Entry Form (inline)
const DiaryEntryForm = ({ lawyers, onSave, onCancel, editingEntry }) => {  const [formData, setFormData] = useState({
    entry_date: editingEntry?.date || new Date().toISOString().split('T')[0],
    entry_type: editingEntry?.subtype || 'note',
    title: editingEntry?.title || '',
    description: editingEntry?.description || '',
    created_by: editingEntry?.created_by || ''
  });
  
  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
      <h3 className="font-medium text-blue-900 mb-3">
        {editingEntry 
          ? ('Edit Entry')
          : ('Add New Entry')
        }
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {'Date'}
          </label>
          <input
            type="date"
            value={formData.entry_date}
            onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {'Type'}
          </label>
          <select
            value={formData.entry_type}
            onChange={(e) => setFormData({...formData, entry_type: e.target.value})}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            {DIARY_SUBTYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label_en}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {'Title'} *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder={'e.g., Filed motion at court registry'}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {'Details'}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
            placeholder={'Additional details...'}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {'By'}
          </label>
          <select
            value={formData.created_by}
            onChange={(e) => setFormData({...formData, created_by: e.target.value})}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">{'-- Select --'}</option>
            {lawyers.map(l => (
              <option key={l.lawyer_id} value={l.lawyer_id}>
                {l.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(formData)}
          disabled={!formData.title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
        >
          {'Cancel'}
        </button>
      </div>
    </div>
  );
};

// Main MatterTimeline Component
const MatterTimeline = ({
  lawyers,
  showToast
}) => {
  const { isOpen, data: matter, closeDialog } = useDialog('matterTimeline');
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterTypes, setFilterTypes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [exporting, setExporting] = useState(false);  // Fetch timeline data
  useEffect(() => {
    if (isOpen && matter?.matter_id) {
      loadTimeline();
    }
  }, [isOpen, matter?.matter_id]);
  
  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getMatterTimeline(matter.matter_id);
      setTimeline(data || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
      showToast('Error loading timeline', 'error');
    }
    setLoading(false);
  };
  
  // Filter timeline
  const filteredTimeline = useMemo(() => {
    if (filterTypes.length === 0) return timeline;
    return timeline.filter(entry => filterTypes.includes(entry.type));
  }, [timeline, filterTypes]);
  
  // Count by type (must be before any early return!)
  const typeCounts = useMemo(() => {
    const counts = {};
    timeline.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [timeline]);
  
  // Toggle filter
  const toggleFilter = (type) => {
    setFilterTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Save diary entry
  const handleSaveDiary = async (formData) => {
    try {
      if (editingEntry) {
        await apiClient.updateDiaryEntry({
          entry_id: editingEntry.id,
          ...formData
        });
        showToast('Entry updated', 'success');
      } else {
        await apiClient.addDiaryEntry({
          matter_id: matter.matter_id,
          ...formData
        });
        showToast('Entry added', 'success');
      }
      setShowAddForm(false);
      setEditingEntry(null);
      loadTimeline();
    } catch (error) {
      console.error('Error saving diary entry:', error);
      showToast('Error saving', 'error');
    }
  };
  
  // Delete diary entry
  const handleDeleteDiary = async (entry) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await apiClient.deleteDiaryEntry(entry.id);
      showToast('Entry deleted', 'success');
      loadTimeline();
    } catch (error) {
      console.error('Error deleting diary entry:', error);
      showToast('Error deleting', 'error');
    }
  };
  
  // Export to Excel (via backend IPC - v49.4)
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const result = await apiClient.exportMatterTimeline(matter.matter_id);
      if (result.canceled) {
        // User cancelled save dialog — not an error
      } else if (result.success) {
        showToast('Exported successfully', 'success');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Timeline export error:', error);
      showToast('Export failed', 'error');
    }
    setExporting(false);
  };
  
  // Export to PDF (print-based)
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const content = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>${matter.matter_name} - Timeline</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          .entry { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          .entry-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .entry-type { font-size: 11px; padding: 2px 8px; background: #f0f0f0; border-radius: 10px; }
          .entry-date { color: #666; font-size: 12px; }
          .entry-title { font-weight: bold; margin: 5px 0; }
          .entry-desc { color: #555; font-size: 13px; }
          .entry-amount { color: #2563eb; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${matter.matter_name}</h1>
        <div class="meta">
          ${'Client:'} ${matter.client_name || 'N/A'} | 
          ${'Exported:'} ${new Date().toLocaleDateString()}
        </div>
        ${filteredTimeline.map(entry => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-type">${(ENTRY_TYPES[entry.type]?.label_en || entry.type)}</span>
              <span class="entry-date">${entry.date}${entry.time ? ' ' + entry.time : ''}</span>
            </div>
            <div class="entry-title">${entry.title}</div>
            ${entry.description ? `<div class="entry-desc">${entry.description}</div>` : ''}
            ${entry.amount ? `<div class="entry-amount">${entry.currency || 'USD'} ${entry.amount.toLocaleString()}</div>` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };
  
  // Early return AFTER all hooks
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-t-lg p-4 border-b flex items-center justify-between">
          <div className={''}>
            <h2 className="text-lg font-bold text-gray-900">
              {'Matter Timeline'}
            </h2>
            <p className="text-sm text-gray-500">{matter?.matter_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={exporting || filteredTimeline.length === 0}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
              title={'Export Excel'}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button
              onClick={exportToPDF}
              disabled={filteredTimeline.length === 0}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              title={'Print PDF'}
            >
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={closeDialog} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Filters & Add Button */}
        <div className="bg-white px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              {Object.entries(ENTRY_TYPES).map(([type, config]) => {
                const count = typeCounts[type] || 0;
                const isActive = filterTypes.length === 0 || filterTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      isActive 
                        ? config.color 
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                  >
                    {config.label_en} ({count})
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setShowAddForm(true); setEditingEntry(null); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {'Add Note'}
            </button>
          </div>
        </div>
        
        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add/Edit Form */}
          {(showAddForm || editingEntry) && (
            <DiaryEntryForm
              lawyers={lawyers}
              editingEntry={editingEntry}
              onSave={handleSaveDiary}
              onCancel={() => { setShowAddForm(false); setEditingEntry(null); }}
            />
          )}
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              {'Loading...'}
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{'No entries found'}</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-blue-600 hover:underline text-sm"
              >
                {'Add first note'}
              </button>
            </div>
          ) : (
            <div className="relative">
              {filteredTimeline.map(entry => (
                <TimelineEntry
                  key={`${entry.type}-${entry.id}`}
                  entry={entry}
                  isExpanded={expandedId === `${entry.type}-${entry.id}`}
                  onToggle={() => setExpandedId(
                    expandedId === `${entry.type}-${entry.id}` ? null : `${entry.type}-${entry.id}`
                  )}
                  onEdit={(e) => { setEditingEntry(e); setShowAddForm(false); }}
                  onDelete={handleDeleteDiary}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with summary */}
        <div className="bg-white rounded-b-lg px-4 py-3 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {`${filteredTimeline.length} of ${timeline.length} entries`
              }
            </span>
            <span>
              {timeline.filter(e => e.source === 'manual').length} {'manual notes'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatterTimeline;
