/**
 * Qanuni IPC Handlers — License (Electron-only)
 *
 * NOTE: License validation is Electron-only — not exposed via REST API.
 * Desktop mode: Uses machine fingerprinting + encrypted license files.
 * Web mode: Will use JWT tokens + session management (Session 3).
 *
 * FAIL-CLOSED: If license check errors, access is denied.
 * No exceptions. No "allow on error." No loose ends.
 *
 * The only exception is DEV_MODE when running without Electron
 * (i.e., `npm run dev` with hot reload from localhost:3000).
 * In packaged builds, license is always enforced.
 *
 * @version 2.0.1 (Documented as Electron-only, Session 2 Batch 5)
 */

const { ipcMain } = require('electron');

module.exports = function registerLicenseHandlers({ database, logger, licenseManager, isDev }) {

  if (!licenseManager) {
    logger.error('License manager not provided to license handler');
  }

  // ==================== GET STATUS ====================

  ipcMain.handle('license:getStatus', logger.wrapHandler('license:getStatus', () => {
    // Development mode — allow access but flag it
    if (isDev && !licenseManager) {
      logger.debug('License: DEV_MODE — no license manager');
      return { isValid: true, status: 'DEV_MODE' };
    }

    if (!licenseManager) {
      // Production without license manager = BLOCKED
      logger.error('License: No license manager in production build');
      return {
        isValid: false,
        status: 'ERROR',
        message: 'License system unavailable. Please reinstall the application.'
      };
    }

    try {
      const status = licenseManager.getLicenseStatusSummary();
      logger.info('License status checked', { status: status.status, valid: status.isValid });
      return status;
    } catch (error) {
      // FAIL CLOSED — error means no access
      logger.error('License check threw', { error: error.message });
      return {
        isValid: false,
        status: 'ERROR',
        message: 'License verification failed. Please contact support.'
      };
    }
  }));

  // ==================== GET MACHINE ID ====================

  ipcMain.handle('license:getMachineId', logger.wrapHandler('license:getMachineId', () => {
    if (!licenseManager || !licenseManager.getMachineId) {
      return 'unknown';
    }

    try {
      return licenseManager.getMachineId();
    } catch (error) {
      logger.error('Failed to get machine ID', { error: error.message });
      return 'error';
    }
  }));

  // ==================== VALIDATE / ACTIVATE ====================

  ipcMain.handle('license:validate', logger.wrapHandler('license:validate', (event, licenseKey) => {
    if (!licenseManager) {
      return { success: false, valid: false, status: 'ERROR', error: 'License system unavailable' };
    }

    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length === 0) {
      return { success: false, valid: false, status: 'ERROR', error: 'Invalid license key' };
    }

    try {
      const result = licenseManager.validateAndActivate(licenseKey.trim());
      logger.info('License activation attempt', {
        success: result.success,
        status: result.status
      });
      // Ensure both success and valid fields exist for frontend compatibility
      return {
        ...result,
        success: result.success !== undefined ? result.success : result.valid,
        valid: result.valid !== undefined ? result.valid : result.success
      };
    } catch (error) {
      logger.error('License activation failed', { error: error.message });
      return { success: false, valid: false, status: 'ERROR', error: 'Activation failed. Please try again.' };
    }
  }));

  // ==================== CLEAR (for testing/support) ====================

  ipcMain.handle('license:clear', logger.wrapHandler('license:clear', () => {
    if (!licenseManager) {
      return { success: false, error: 'License system unavailable' };
    }

    try {
      const cleared = licenseManager.clearLicenseKey();
      if (cleared) {
        logger.info('License cleared');
        return { success: true };
      } else {
        return { success: false, error: 'No license file found to clear' };
      }
    } catch (error) {
      logger.error('Failed to clear license', { error: error.message });
      return { success: false, error: error.message };
    }
  }));

};
