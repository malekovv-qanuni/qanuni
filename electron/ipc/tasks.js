/**
 * Tasks Module - Dual-Mode (IPC + REST)
 * 4 handlers: CRUD (with auto task number generation)
 * Refactored to preserve EXACT working logic
 * @version 3.0.0 (Session 2 - Dual-Mode)
 */

const { ipcMain } = require('electron');
const validation = require('../../shared/validation');

// ============================================================================
// PURE FUNCTIONS - EXACT COPIES of working IPC handler logic
// ============================================================================

function getTasks(database) {
  return database.query(`SELECT t.*, m.matter_name, c.client_name, lt.name_en as task_type_name, lt.icon as task_type_icon,
      l.name as assigned_lawyer_name
      FROM tasks t LEFT JOIN matters m ON t.matter_id = m.matter_id
      LEFT JOIN clients c ON t.client_id = c.client_id
      LEFT JOIN lookup_task_types lt ON t.task_type_id = lt.task_type_id
      LEFT JOIN lawyers l ON t.assigned_to = l.lawyer_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.due_date ASC`);
}

function addTask(database, logger, task) {
  const check = validation.check(task, 'task');
  if (!check.valid) return check.result;

  const id = database.generateId('TSK');
  const now = new Date().toISOString();

  // Auto-generate task number: WA-YYYY-0001
  const year = new Date().getFullYear();
  const countResult = database.query('SELECT COUNT(*) as count FROM tasks WHERE task_number LIKE ?', [`WA-${year}-%`]);
  const num = (countResult[0]?.count || 0) + 1;
  const taskNumber = `WA-${year}-${num.toString().padStart(4, '0')}`;

  // Handle field name mapping (form sends assigned_to_id, we store as assigned_to)
  const assignedTo = task.assigned_to_id || task.assigned_to || null;
  const matterId = task.matter_id || null;
  const clientId = task.client_id || null;
  const hearingId = task.hearing_id || null;
  const taskTypeId = task.task_type_id ? parseInt(task.task_type_id) : null;
  const timeBudget = task.time_budget_minutes ? parseInt(task.time_budget_minutes) : null;

  database.execute(`INSERT INTO tasks (task_id, task_number, matter_id, client_id, hearing_id,
      task_type_id, title, description, instructions, due_date, due_time, time_budget_minutes,
      priority, status, assigned_by, assigned_to, assigned_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, taskNumber, matterId, clientId, hearingId, taskTypeId, task.title,
       task.description || '', task.instructions || '', task.due_date || null,
       task.due_time || null, timeBudget,
       task.priority || 'medium', task.status || 'assigned',
       task.assigned_by || 'Admin', assignedTo,
       task.assigned_date || now, task.notes || '', now, now]);

  logger.info('Task created', { taskId: id, taskNumber });
  return { success: true, taskId: id };
}

function updateTask(database, logger, task) {
  if (!task.task_id) return { success: false, error: 'task_id is required' };

  const check = validation.check(task, 'task');
  if (!check.valid) return check.result;

  const now = new Date().toISOString();
  const assignedTo = task.assigned_to_id || task.assigned_to || null;
  const matterId = task.matter_id || null;
  const clientId = task.client_id || null;
  const taskTypeId = task.task_type_id ? parseInt(task.task_type_id) : null;

  database.execute(`UPDATE tasks SET matter_id=?, client_id=?, task_type_id=?, title=?, description=?,
      instructions=?, due_date=?, priority=?, status=?, assigned_to=?, completion_notes=?,
      completed_date=?, notes=?, updated_at=? WHERE task_id=?`,
      [matterId, clientId, taskTypeId, task.title, task.description || '',
       task.instructions || '', task.due_date || null, task.priority, task.status,
       assignedTo, task.completion_notes || '',
       task.completed_date || null, task.notes || '', now, task.task_id]);

  logger.info('Task updated', { taskId: task.task_id });
  return { success: true };
}

function deleteTask(database, logger, id) {
  if (!id) return { success: false, error: 'task_id is required' };

  const now = new Date().toISOString();
  database.execute('UPDATE tasks SET deleted_at = ? WHERE task_id = ?', [now, id]);

  logger.info('Task soft-deleted', { taskId: id });
  return { success: true };
}

// ============================================================================
// IPC HANDLERS - Factory function (PRESERVED PATTERN)
// ============================================================================

module.exports = function registerTaskHandlers({ database, logger }) {

  ipcMain.handle('get-all-tasks', logger.wrapHandler('get-all-tasks', () => {
    return getTasks(database);
  }));

  ipcMain.handle('add-task', logger.wrapHandler('add-task', (event, task) => {
    return addTask(database, logger, task);
  }));

  ipcMain.handle('update-task', logger.wrapHandler('update-task', (event, task) => {
    return updateTask(database, logger, task);
  }));

  ipcMain.handle('delete-task', logger.wrapHandler('delete-task', (event, id) => {
    return deleteTask(database, logger, id);
  }));

};

// ============================================================================
// EXPORTS FOR REST API
// ============================================================================

module.exports.getTasks = getTasks;
module.exports.addTask = addTask;
module.exports.updateTask = updateTask;
module.exports.deleteTask = deleteTask;
