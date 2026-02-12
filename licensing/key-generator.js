#!/usr/bin/env node
/**
 * Qanuni License Key Generator
 * CLI tool to generate machine-bound license keys
 * 
 * Usage:
 *   node key-generator.js --machine ABCD-1234-5678-90EF --name "Client Name" --days 365
 *   node key-generator.js --machine ABCD-1234-5678-90EF --name "Trial User" --days 14 --type trial
 *   node key-generator.js --list              # List all generated keys
 *   node key-generator.js --verify KEY        # Verify a key (without machine check)
 * 
 * Options:
 *   --machine, -m   Machine ID (required for generation)
 *   --name, -n      Client/licensee name (required for generation)
 *   --days, -d      Days until expiry (default: 365)
 *   --type, -t      License type: trial, annual, perpetual (default: annual)
 *   --list, -l      List all generated keys from log
 *   --verify, -v    Verify a license key
 *   --help, -h      Show help
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// MUST match the salt in license-manager.js!
const LICENSE_SALT = 'w9dqq+mqP+b5tybz1XviCbGT3qWdLOQ89bfpg61fYqk=';

// Log file for tracking issued licenses
const LOG_FILE = path.join(__dirname, 'issued-licenses.json');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    machine: null,
    name: null,
    days: 365,
    type: 'annual',
    list: false,
    verify: null,
    help: false,
    interactive: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--machine':
      case '-m':
        options.machine = nextArg;
        i++;
        break;
      case '--name':
      case '-n':
        options.name = nextArg;
        i++;
        break;
      case '--days':
      case '-d':
        options.days = parseInt(nextArg, 10);
        i++;
        break;
      case '--type':
      case '-t':
        options.type = nextArg;
        i++;
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      case '--verify':
      case '-v':
        options.verify = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
    }
  }
  
  return options;
}

/**
 * Generate a license key
 */
function generateLicenseKey(machineId, issuedTo, days, type = 'annual') {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  
  const licenseData = {
    machineId: machineId.toUpperCase(),
    issuedTo,
    issuedAt,
    expiresAt: expiresAt.toISOString(),
    type
  };
  
  // Encode payload
  const payload = Buffer.from(JSON.stringify(licenseData)).toString('base64');
  
  // Generate checksum
  const checksum = crypto
    .createHash('md5')
    .update(payload + LICENSE_SALT)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  
  // Construct key
  const licenseKey = `QANUNI-${payload}-${checksum}`;
  
  return {
    key: licenseKey,
    data: licenseData
  };
}

/**
 * Verify a license key (without machine check)
 */
function verifyKey(licenseKey) {
  try {
    licenseKey = licenseKey.trim().replace(/[\s\r\n]/g, '');
    
    if (!licenseKey.startsWith('QANUNI-')) {
      return { valid: false, error: 'Invalid format - must start with QANUNI-' };
    }
    
    const withoutPrefix = licenseKey.substring(7);
    const lastDashIndex = withoutPrefix.lastIndexOf('-');
    
    if (lastDashIndex === -1) {
      return { valid: false, error: 'Invalid format - missing checksum' };
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
      return { valid: false, error: 'Checksum verification failed' };
    }
    
    // Decode payload
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const data = JSON.parse(decoded);
    
    // Check expiry
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    return {
      valid: true,
      expired: daysUntilExpiry < 0,
      daysUntilExpiry,
      data
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Load issued licenses log
 */
function loadLicenseLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading license log:', error.message);
  }
  return [];
}

/**
 * Save issued license to log
 */
function saveLicenseToLog(licenseInfo) {
  const log = loadLicenseLog();
  log.push({
    ...licenseInfo,
    generatedAt: new Date().toISOString()
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

/**
 * Display all issued licenses
 */
function listLicenses() {
  const log = loadLicenseLog();
  
  if (log.length === 0) {
    console.log('\nNo licenses have been issued yet.\n');
    return;
  }
  
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           ISSUED LICENSES                                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  
  log.forEach((license, index) => {
    const expiresAt = new Date(license.data.expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const status = daysLeft < 0 ? '❌ EXPIRED' : (daysLeft <= 7 ? '⚠️  EXPIRING' : '✅ ACTIVE');
    
    console.log(`║ ${index + 1}. ${license.data.issuedTo.padEnd(30)} ${status.padEnd(15)} ║`);
    console.log(`║    Machine: ${license.data.machineId}                                       ║`);
    console.log(`║    Type: ${license.data.type.padEnd(10)} Expires: ${expiresAt.toLocaleDateString()} (${daysLeft} days)      ║`);
    console.log(`║    Generated: ${license.generatedAt.substring(0, 10)}                                      ║`);
    if (index < log.length - 1) {
      console.log('╟──────────────────────────────────────────────────────────────────────────────╢');
    }
  });
  
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    QANUNI LICENSE KEY GENERATOR                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const machineId = await question('Enter Machine ID (e.g., ABCD-1234-5678-90EF): ');
  const name = await question('Enter Client/Company Name: ');
  const type = await question('License Type (trial/annual) [annual]: ') || 'annual';
  const daysInput = await question(`Days until expiry [${type === 'trial' ? '14' : '365'}]: `);
  const days = parseInt(daysInput, 10) || (type === 'trial' ? 14 : 365);
  
  rl.close();
  
  // Generate and display
  console.log('\nGenerating license key...\n');
  const result = generateLicenseKey(machineId, name, days, type);
  displayGeneratedKey(result);
  
  // Save to log
  saveLicenseToLog(result);
  console.log('✅ License saved to log file.\n');
}

/**
 * Display generated key nicely
 */
function displayGeneratedKey(result) {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         LICENSE KEY GENERATED                                ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Issued To:   ${result.data.issuedTo.padEnd(60)}║`);
  console.log(`║  Machine ID:  ${result.data.machineId.padEnd(60)}║`);
  console.log(`║  Type:        ${result.data.type.padEnd(60)}║`);
  console.log(`║  Issued:      ${result.data.issuedAt.substring(0, 10).padEnd(60)}║`);
  console.log(`║  Expires:     ${result.data.expiresAt.substring(0, 10).padEnd(60)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  LICENSE KEY (send this to the client):                                      ║');
  console.log('╟──────────────────────────────────────────────────────────────────────────────╢');
  
  // Break key into readable lines
  const key = result.key;
  const chunkSize = 70;
  for (let i = 0; i < key.length; i += chunkSize) {
    const chunk = key.substring(i, i + chunkSize);
    console.log(`║  ${chunk.padEnd(74)}║`);
  }
  
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    QANUNI LICENSE KEY GENERATOR                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Usage:                                                                      ║
║    node key-generator.js [options]                                           ║
║                                                                              ║
║  Options:                                                                    ║
║    -i, --interactive     Interactive mode (guided)                           ║
║    -m, --machine ID      Machine ID from client                              ║
║    -n, --name NAME       Client/licensee name                                ║
║    -d, --days N          Days until expiry (default: 365)                    ║
║    -t, --type TYPE       License type: trial, annual (default: annual)       ║
║    -l, --list            List all issued licenses                            ║
║    -v, --verify KEY      Verify a license key                                ║
║    -h, --help            Show this help                                      ║
║                                                                              ║
║  Examples:                                                                   ║
║    node key-generator.js -i                                                  ║
║    node key-generator.js -m ABCD-1234-5678-90EF -n "Law Firm LLC" -d 365     ║
║    node key-generator.js -m ABCD-1234-5678-90EF -n "Trial User" -d 14 -t trial
║    node key-generator.js --list                                              ║
║    node key-generator.js --verify QANUNI-xxx-yyy                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  if (options.list) {
    listLicenses();
    return;
  }
  
  if (options.verify) {
    const result = verifyKey(options.verify);
    console.log('\n--- License Verification ---');
    if (result.valid) {
      console.log('✅ Key is valid');
      console.log(`   Issued To: ${result.data.issuedTo}`);
      console.log(`   Machine: ${result.data.machineId}`);
      console.log(`   Type: ${result.data.type}`);
      console.log(`   Expires: ${result.data.expiresAt.substring(0, 10)}`);
      console.log(`   Status: ${result.expired ? '❌ EXPIRED' : `✅ ${result.daysUntilExpiry} days remaining`}`);
    } else {
      console.log('❌ Invalid key:', result.error);
    }
    console.log('');
    return;
  }
  
  if (options.interactive || (!options.machine && !options.name)) {
    await interactiveMode();
    return;
  }
  
  // Direct generation
  if (!options.machine || !options.name) {
    console.error('\n❌ Error: Both --machine and --name are required for key generation.');
    console.error('   Use --interactive for guided mode, or --help for usage.\n');
    process.exit(1);
  }
  
  const result = generateLicenseKey(options.machine, options.name, options.days, options.type);
  displayGeneratedKey(result);
  saveLicenseToLog(result);
  console.log('\n✅ License saved to log file.\n');
}

// Run
main().catch(console.error);
