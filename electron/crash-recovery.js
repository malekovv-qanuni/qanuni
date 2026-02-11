/**
 * Qanuni Crash Recovery System
 *
 * Handles:
 * - Graceful shutdown on app quit
 * - Force save on uncaught exceptions
 * - Crash report generation
 * - Clean exit on unhandled promise rejections
 *
 * @version 1.0.0 (Phase 4 Hardening)
 */

const { app } = require('electron');
const logger = require('./logging');
const database = require('./database');
const fs = require('fs');
const path = require('path');

let isShuttingDown = false;
let crashHandlersInstalled = false;

/**
 * Initialize crash recovery handlers.
 * Should be called once during app startup.
 */
function init() {
  if (crashHandlersInstalled) {
    logger.warn('Crash handlers already installed');
    return;
  }

  // Graceful shutdown on app quit
  app.on('before-quit', (event) => {
    if (!isShuttingDown) {
      logger.info('App shutting down gracefully');
      isShuttingDown = true;

      // Force save database
      const saved = database.forceSave();
      if (!saved) {
        logger.error('Failed to save database during shutdown');
      }
    }
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    handleCrash('uncaughtException', error);
  });

  // Unhandled promise rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleCrash('unhandledRejection', error, { promise });
  });

  crashHandlersInstalled = true;
  logger.info('Crash recovery handlers installed');
}

/**
 * Handle a crash scenario.
 * 1. Log the crash with full context
 * 2. Force save database
 * 3. Generate crash report file
 * 4. Exit cleanly
 */
function handleCrash(type, error, context = {}) {
  logger.error(`CRASH: ${type}`, {
    message: error.message,
    stack: error.stack,
    context
  });

  // Force save database before exit
  try {
    const saved = database.forceSave();
    if (saved) {
      logger.info('Database saved before crash exit');
    } else {
      logger.error('Failed to save database before crash exit');
    }
  } catch (saveError) {
    logger.error('Exception during crash save', { error: saveError.message });
  }

  // Generate crash report
  try {
    generateCrashReport(type, error, context);
  } catch (reportError) {
    // Don't let crash report generation prevent exit
    console.error('Failed to generate crash report:', reportError);
  }

  // Exit with error code
  process.exit(1);
}

/**
 * Generate a crash report file in the logs directory.
 */
function generateCrashReport(type, error, context) {
  const userDataPath = app.getPath('userData');
  const logsDir = path.join(userDataPath, 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(logsDir, `crash-${timestamp}.txt`);

  const report = [
    '='.repeat(80),
    'QANUNI CRASH REPORT',
    '='.repeat(80),
    '',
    `Crash Type: ${type}`,
    `Time: ${new Date().toISOString()}`,
    `App Version: ${app.getVersion()}`,
    `Electron Version: ${process.versions.electron}`,
    `Node Version: ${process.versions.node}`,
    `Platform: ${process.platform} ${process.arch}`,
    '',
    'ERROR:',
    error.message,
    '',
    'STACK TRACE:',
    error.stack || '(no stack trace)',
    '',
    'CONTEXT:',
    JSON.stringify(context, null, 2),
    '',
    'DATABASE STATUS:',
    JSON.stringify(database.getStatus(), null, 2),
    '',
    '='.repeat(80),
    'Please send this file to support for investigation.',
    '='.repeat(80)
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  console.error(`Crash report written to: ${reportPath}`);

  return reportPath;
}

/**
 * Manually trigger crash recovery (for testing).
 */
function testCrashRecovery() {
  throw new Error('Test crash - verifying recovery system');
}

module.exports = {
  init,
  testCrashRecovery
};
