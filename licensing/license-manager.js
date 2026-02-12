/**
 * Qanuni License Manager
 * Handles machine fingerprinting, license validation, and expiry management
 * 
 * Features:
 * - Machine-bound keys (tied to hardware)
 * - Expiry dates on all keys
 * - 7-day grace period after expiry
 * - Warning notifications at 30, 7, 1 days before expiry
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Secret salt - CHANGE THIS to your own random string for production!
const LICENSE_SALT = 'Qanuni-2026-MalekKallas-LegalERP-SecretKey';

// Grace period in days after expiry (app works but shows warning)
const GRACE_PERIOD_DAYS = 7;

// Warning thresholds (days before expiry)
const WARNING_THRESHOLDS = [30, 7, 1];

/**
 * Generate a unique machine fingerprint
 * Combines CPU, hostname, username, and MAC address for uniqueness
 */
function getMachineId() {
  try {
    const cpuInfo = os.cpus()[0]?.model || 'unknown-cpu';
    const hostname = os.hostname();
    const username = os.userInfo().username || 'unknown-user';
    
    // Get first non-internal MAC address
    const networkInterfaces = os.networkInterfaces();
    let macAddress = 'unknown-mac';
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macAddress = iface.mac;
          break;
        }
      }
      if (macAddress !== 'unknown-mac') break;
    }
    
    // Combine and hash
    const rawId = `${cpuInfo}|${hostname}|${username}|${macAddress}`;
    const hash = crypto.createHash('sha256').update(rawId + LICENSE_SALT).digest('hex');
    
    // Return first 16 chars in groups of 4 for readability (e.g., ABCD-EF12-3456-7890)
    return hash.substring(0, 16).toUpperCase().match(/.{4}/g).join('-');
  } catch (error) {
    console.error('Error generating machine ID:', error);
    return 'ERROR-0000-0000-0000';
  }
}

/**
 * Get license file path in user's app data
 */
function getLicenseFilePath() {
  const appDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' 
      ? path.join(os.homedir(), 'Library', 'Application Support') 
      : path.join(os.homedir(), '.config'));
  const qanuniPath = path.join(appDataPath, 'qanuni');
  
  // Ensure directory exists
  if (!fs.existsSync(qanuniPath)) {
    fs.mkdirSync(qanuniPath, { recursive: true });
  }
  
  return path.join(qanuniPath, 'license.key');
}

/**
 * Save license key to file
 */
function saveLicenseKey(licenseKey) {
  try {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, licenseKey.trim(), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Load license key from file
 */
function loadLicenseKey() {
  try {
    const filePath = getLicenseFilePath();
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
    return null;
  } catch (error) {
    console.error('Error loading license:', error);
    return null;
  }
}

/**
 * Delete stored license key
 */
function clearLicenseKey() {
  try {
    const filePath = getLicenseFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Validate a license key
 * 
 * Key format: QANUNI-{base64payload}-{checksum}
 * Payload contains: { machineId, expiresAt, type, issuedTo, issuedAt }
 * 
 * @param {string} licenseKey - The license key to validate
 * @param {string} currentMachineId - The current machine's ID (optional, will generate if not provided)
 * @returns {object} - Validation result with status and details
 */
function validateLicenseKey(licenseKey, currentMachineId = null) {
  try {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return { 
        valid: false, 
        status: 'NO_KEY',
        error: 'No license key provided' 
      };
    }
    
    // Clean up the key (remove whitespace, newlines)
    licenseKey = licenseKey.trim().replace(/[\s\r\n]/g, '');
    
    // Key format: QANUNI-{base64payload}-{checksum}
    if (!licenseKey.startsWith('QANUNI-')) {
      return { 
        valid: false, 
        status: 'INVALID_FORMAT',
        error: 'Invalid key format - must start with QANUNI-' 
      };
    }
    
    // Extract parts
    const withoutPrefix = licenseKey.substring(7); // Remove "QANUNI-"
    const lastDashIndex = withoutPrefix.lastIndexOf('-');
    
    if (lastDashIndex === -1) {
      return { 
        valid: false, 
        status: 'INVALID_FORMAT',
        error: 'Invalid key format - missing checksum' 
      };
    }
    
    const payload = withoutPrefix.substring(0, lastDashIndex);
    const checksum = withoutPrefix.substring(lastDashIndex + 1);
    
    // Verify checksum
    const expectedChecksum = crypto
      .createHash('md5')
      .update(payload + LICENSE_SALT)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    
    if (checksum !== expectedChecksum) {
      return { 
        valid: false, 
        status: 'INVALID_CHECKSUM',
        error: 'Invalid license key (verification failed)' 
      };
    }
    
    // Decode payload
    let licenseData;
    try {
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      licenseData = JSON.parse(decoded);
    } catch (e) {
      return { 
        valid: false, 
        status: 'CORRUPT_KEY',
        error: 'License key is corrupted' 
      };
    }
    
    // Validate required fields
    if (!licenseData.machineId || !licenseData.expiresAt) {
      return { 
        valid: false, 
        status: 'INCOMPLETE_KEY',
        error: 'License key is incomplete' 
      };
    }
    
    // Check machine ID
    const machineId = currentMachineId || getMachineId();
    if (licenseData.machineId !== machineId) {
      return { 
        valid: false, 
        status: 'WRONG_MACHINE',
        error: 'This license key is registered to a different computer',
        details: {
          expectedMachine: licenseData.machineId,
          currentMachine: machineId
        }
      };
    }
    
    // Check expiry
    const now = new Date();
    const expiresAt = new Date(licenseData.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const gracePeriodEnd = new Date(expiresAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
    
    // Determine expiry status
    let expiryStatus = 'ACTIVE';
    let warningLevel = null;
    
    if (now > gracePeriodEnd) {
      // Past grace period - fully expired
      return {
        valid: false,
        status: 'EXPIRED',
        error: 'License has expired. Please renew to continue using Qanuni.',
        details: {
          ...licenseData,
          daysUntilExpiry,
          expiredDaysAgo: Math.abs(daysUntilExpiry),
          gracePeriodEnded: gracePeriodEnd.toISOString()
        }
      };
    } else if (now > expiresAt) {
      // In grace period
      const daysLeftInGrace = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
      expiryStatus = 'GRACE_PERIOD';
      warningLevel = 'critical';
      
      return {
        valid: true,
        status: 'GRACE_PERIOD',
        warning: `License expired! You have ${daysLeftInGrace} day(s) left to renew before lockout.`,
        warningLevel: 'critical',
        details: {
          ...licenseData,
          daysUntilExpiry,
          daysLeftInGrace,
          gracePeriodEnd: gracePeriodEnd.toISOString()
        }
      };
    } else {
      // Still valid - check for upcoming expiry warnings
      for (const threshold of WARNING_THRESHOLDS) {
        if (daysUntilExpiry <= threshold) {
          warningLevel = threshold === 1 ? 'critical' : (threshold === 7 ? 'warning' : 'info');
          break;
        }
      }
    }
    
    // Build response
    const response = {
      valid: true,
      status: expiryStatus,
      details: {
        type: licenseData.type || 'standard',
        issuedTo: licenseData.issuedTo || 'Unknown',
        issuedAt: licenseData.issuedAt,
        expiresAt: licenseData.expiresAt,
        machineId: licenseData.machineId,
        daysUntilExpiry
      }
    };
    
    // Add warning if approaching expiry
    if (warningLevel && daysUntilExpiry <= 30) {
      response.warning = daysUntilExpiry === 1 
        ? 'Your license expires TOMORROW! Please renew to avoid interruption.'
        : `Your license expires in ${daysUntilExpiry} days. Please renew soon.`;
      response.warningLevel = warningLevel;
    }
    
    return response;
    
  } catch (error) {
    console.error('License validation error:', error);
    return { 
      valid: false, 
      status: 'ERROR',
      error: 'Error validating license: ' + error.message 
    };
  }
}

/**
 * Check the currently stored license
 * Convenience function that loads and validates in one step
 */
function checkStoredLicense() {
  const storedKey = loadLicenseKey();
  if (!storedKey) {
    return {
      valid: false,
      status: 'NO_KEY',
      error: 'No license key found. Please enter your license key.'
    };
  }
  return validateLicenseKey(storedKey);
}

/**
 * Get license status summary for UI
 */
function getLicenseStatusSummary() {
  const result = checkStoredLicense();
  
  return {
    isValid: result.valid,
    status: result.status,
    message: result.error || result.warning || 'License is active',
    warningLevel: result.warningLevel || null,
    details: result.details || null,
    machineId: getMachineId()
  };
}

/**
 * Validate a license key and save it if valid
 * Combined operation for the activation flow
 *
 * @param {string} licenseKey - The license key to validate and activate
 * @returns {object} - Result with both success and valid flags
 */
function validateAndActivate(licenseKey) {
  try {
    const machineId = getMachineId();
    const validation = validateLicenseKey(licenseKey, machineId);

    if (validation.valid) {
      const saveResult = saveLicenseKey(licenseKey);
      if (!saveResult.success) {
        return {
          success: false,
          valid: false,
          status: 'ERROR',
          error: `Validation succeeded but failed to save: ${saveResult.error}`
        };
      }

      return {
        ...validation,
        success: true
      };
    } else {
      return {
        ...validation,
        success: false
      };
    }
  } catch (error) {
    console.error('Error in validateAndActivate:', error);
    return {
      success: false,
      valid: false,
      status: 'ERROR',
      error: `Error during activation: ${error.message}`
    };
  }
}

// Export functions
module.exports = {
  getMachineId,
  saveLicenseKey,
  loadLicenseKey,
  clearLicenseKey,
  validateLicenseKey,
  validateAndActivate,
  checkStoredLicense,
  getLicenseStatusSummary,
  GRACE_PERIOD_DAYS,
  WARNING_THRESHOLDS,
  LICENSE_SALT // Exported for key generator (same salt required)
};
