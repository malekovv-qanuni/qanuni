/**
 * Matter Timeline Export Module
 *
 * Handles Excel export of matter timeline data.
 * Reuses getMatterTimeline() from diary.js to avoid query duplication.
 *
 * Channels:
 *   export-matter-timeline — Generate styled XLSX with all timeline entries
 *
 * Dependencies: database, logger, getMainWindow, dialog, app, path
 *
 * @version 1.0.0 (v49.4 — moved from frontend to backend)
 */

const { ipcMain } = require('electron');
const ExcelJS = require('exceljs');

// Entry type labels for Excel output
const ENTRY_TYPE_LABELS = {
  hearing: 'Hearing',
  judgment: 'Judgment',
  timesheet: 'Time Entry',
  expense: 'Expense',
  task: 'Task',
  diary: 'Note'
};

module.exports = function registerMatterTimelineHandlers({ database, logger, getMainWindow, dialog, app, path }) {

  ipcMain.handle('export-matter-timeline', logger.wrapHandler('export-matter-timeline', async (event, data) => {
    // 1. Validate input
    if (!data?.matter_id) {
      return { success: false, error: 'Matter ID is required' };
    }

    // 2. Get matter name for filename
    const matter = database.queryOne(
      'SELECT matter_name FROM matters WHERE matter_id = ? AND deleted_at IS NULL',
      [data.matter_id]
    );
    const matterName = matter?.matter_name || 'Matter';
    const safeName = matterName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);

    // 3. Show save dialog
    const mainWindow = getMainWindow();
    const today = new Date().toISOString().split('T')[0];
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Matter Timeline',
      defaultPath: path.join(app.getPath('documents'), `${safeName}_Timeline_${today}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    // 4. Get timeline data (reuse diary.js pure function)
    const { getMatterTimeline } = require('./diary');
    const timeline = getMatterTimeline(database, data.matter_id);

    if (!timeline || timeline.length === 0) {
      return { success: false, error: 'No timeline entries found for this matter' };
    }

    // 5. Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Qanuni Legal ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Matter Timeline');

    // 6. Define columns
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Lawyer', key: 'lawyer', width: 20 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Source', key: 'source', width: 10 }
    ];

    // 7. Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // 8. Add data rows
    timeline.forEach(entry => {
      sheet.addRow({
        date: entry.date || '',
        type: ENTRY_TYPE_LABELS[entry.type] || entry.type,
        title: entry.title || '',
        description: entry.description || '',
        lawyer: entry.lawyer_name || '',
        amount: entry.amount || '',
        currency: entry.currency || '',
        source: entry.source === 'manual' ? 'Manual' : 'Auto'
      });
    });

    // 9. Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: timeline.length + 1, column: 8 }
    };

    // 10. Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 11. Title row above data (insert at top)
    // Instead, add a summary at the bottom
    const summaryRow = sheet.addRow([]);
    const totalRow = sheet.addRow({
      date: '',
      type: `Total: ${timeline.length} entries`,
      title: `Matter: ${matterName}`,
      description: `Exported: ${new Date().toLocaleString()}`,
      lawyer: '',
      amount: '',
      currency: '',
      source: ''
    });
    totalRow.font = { italic: true, color: { argb: 'FF808080' } };

    // 12. Write file
    await workbook.xlsx.writeFile(filePath);

    logger.info('Matter timeline exported', { matterId: data.matter_id, filePath, entries: timeline.length });
    return { success: true, filePath };
  }));

};
