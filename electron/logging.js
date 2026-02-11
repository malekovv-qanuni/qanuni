/**
 * Qanuni Logging System
 * 
 * File-based logging that persists across sessions.
 * When a lawyer reports "my hearing disappeared," you can check the log.
 * 
 * Log location: %APPDATA%/Qanuni/logs/qanuni-YYYY-MM-DD.log
 * Retention: 30 days (auto-cleanup on startup)
 * 
 * Levels: error > warn > info > debug
 * Production default: info (skips debug)
 * 
 * @version 1.0.0 (Phase 1 Hardening)
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// ==================== CONFIGURATION ====================

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const RETENTION_DAYS = 30;
const MAX_LOG_SIZE_MB = 50; // Rotate if a single file exceeds this

let logDir = '';
let currentLogPath = '';
let currentLevel = 'info'; // Default: info in production
let initialized = false;

// ==================== INITIALIZATION ====================

function init(options = {}) {
  try {
    logDir = path.join(app.getPath('userData'), 'logs');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    currentLevel = options.level || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
    currentLogPath = getLogFilePath();
    initialized = true;

    // Clean up old logs
    cleanupOldLogs();

    info('Logger initialized', { level: currentLevel, path: currentLogPath });
  } catch (e) {
    // If logging fails to init, fall back to console
    console.error('Failed to initialize logger:', e);
  }
}

// ==================== LOG FUNCTIONS ====================

function error(message, data = {}) {
  writeLog('error', message, data);
}

function warn(message, data = {}) {
  writeLog('warn', message, data);
}

function info(message, data = {}) {
  writeLog('info', message, data);
}

function debug(message, data = {}) {
  writeLog('debug', message, data);
}

// ==================== IPC HANDLER LOGGING ====================

/**
 * Create a logging wrapper for IPC handlers.
 * Logs the call, measures duration, logs errors.
 * 
 * Usage:
 *   ipcMain.handle('get-clients', logger.wrapHandler('get-clients', (event, ...args) => {
 *     return database.query('SELECT * FROM clients');
 *   }));
 */
function wrapHandler(channel, handler) {
  return async (event, ...args) => {
    const start = Date.now();
    try {
      const result = await handler(event, ...args);
      const duration = Date.now() - start;

      // Only log slow operations (>500ms) at info level to avoid log bloat
      if (duration > 500) {
        info(`IPC slow: ${channel}`, { duration: `${duration}ms`, argsCount: args.length });
      } else {
        debug(`IPC: ${channel}`, { duration: `${duration}ms` });
      }

      return result;
    } catch (err) {
      const duration = Date.now() - start;
      error(`IPC error: ${channel}`, {
        duration: `${duration}ms`,
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join(' | ')
      });
      // Return structured error so frontend can check result.success
      return { success: false, error: err.message };
    }
  };
}

// ==================== INTERNAL ====================

function writeLog(level, message, data) {
  // Check log level
  if (LOG_LEVELS[level] > LOG_LEVELS[currentLevel]) return;

  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);

  // Format data — keep it concise
  let dataStr = '';
  if (data && Object.keys(data).length > 0) {
    try {
      dataStr = ' ' + JSON.stringify(data, null, 0);
      // Truncate very long data
      if (dataStr.length > 500) {
        dataStr = dataStr.substring(0, 497) + '...';
      }
    } catch (e) {
      dataStr = ' [data not serializable]';
    }
  }

  const line = `${timestamp} ${levelStr} ${message}${dataStr}\n`;

  // Always write to console in development
  if (process.env.NODE_ENV === 'development' || !initialized) {
    const consoleFn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    consoleFn(`[Qanuni] ${levelStr} ${message}`, data && Object.keys(data).length > 0 ? data : '');
  }

  // Write to file
  if (initialized) {
    try {
      // Check if we need a new log file (date changed)
      const expectedPath = getLogFilePath();
      if (expectedPath !== currentLogPath) {
        currentLogPath = expectedPath;
      }

      fs.appendFileSync(currentLogPath, line, 'utf8');
    } catch (e) {
      // Don't recurse — just console
      console.error('Logger write failed:', e.message);
    }
  }
}

function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `qanuni-${date}.log`);
}

function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(logDir).filter(f => f.startsWith('qanuni-') && f.endsWith('.log'));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    let removed = 0;
    for (const file of files) {
      // Extract date from filename: qanuni-YYYY-MM-DD.log
      const dateStr = file.replace('qanuni-', '').replace('.log', '');
      const fileDate = new Date(dateStr);

      if (!isNaN(fileDate.getTime()) && fileDate < cutoff) {
        fs.unlinkSync(path.join(logDir, file));
        removed++;
      }
    }

    if (removed > 0) {
      info('Cleaned up old log files', { removed, retention: `${RETENTION_DAYS} days` });
    }
  } catch (e) {
    console.error('Log cleanup failed:', e.message);
  }
}

// ==================== UTILITY ====================

/**
 * Get the log directory path (for "Open Logs Folder" feature).
 */
function getLogDir() {
  return logDir;
}

/**
 * Get recent log entries (for in-app log viewer or crash reports).
 */
function getRecentEntries(count = 100) {
  try {
    if (!fs.existsSync(currentLogPath)) return [];
    const content = fs.readFileSync(currentLogPath, 'utf8');
    const lines = content.trim().split('\n');
    return lines.slice(-count);
  } catch (e) {
    return [];
  }
}

// ==================== CRASH HANDLER ====================

/**
 * Install global crash handlers.
 * Call this early in app startup.
 */
function installCrashHandlers(database) {
  process.on('uncaughtException', (err) => {
    error('UNCAUGHT EXCEPTION', { message: err.message, stack: err.stack });
    // Force save database before crash
    if (database && database.forceSave) {
      database.forceSave();
    }
    // Give the log a moment to flush, then exit
    setTimeout(() => process.exit(1), 100);
  });

  process.on('unhandledRejection', (reason) => {
    error('UNHANDLED REJECTION', {
      message: reason?.message || String(reason),
      stack: reason?.stack?.split('\n').slice(0, 5).join(' | ')
    });
  });
}

// ==================== EXPORTS ====================

module.exports = {
  init,
  error,
  warn,
  info,
  debug,
  wrapHandler,
  getLogDir,
  getRecentEntries,
  installCrashHandlers
};
