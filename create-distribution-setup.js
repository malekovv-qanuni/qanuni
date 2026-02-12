/**
 * create-distribution-setup.js
 * 
 * Creates all files needed for Qanuni distribution:
 * - LICENSE (placeholder - full EULA to be added later)
 * - electron-builder.yml (build config)
 * - README.md (project docs)
 * - Updates package.json (adds dist scripts)
 * - Creates placeholder icon
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Qanuni distribution infrastructure...\n');

// ============================================================================
// 1. LICENSE FILE (PLACEHOLDER)
// ============================================================================
const LICENSE_CONTENT = `Qanuni Legal Practice Management System
Copyright © 2026 Malek Kallas. All rights reserved.

PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED

This is proprietary and confidential software.
Unauthorized copying, distribution, or use is strictly prohibited.

LICENSE REQUIRED FOR USE
This software requires a valid license key for activation.
Each license is granted per installation and is non-transferable.

RESTRICTIONS
- No reverse engineering, decompilation, or disassembly
- No modification or derivative works
- No redistribution or sublicensing

For licensing inquiries, please contact: mk@kfi.net

NOTE: This is a preliminary license. Full End-User License Agreement (EULA)
with comprehensive terms will be provided before official distribution.
`;

try {
  fs.writeFileSync('LICENSE', LICENSE_CONTENT, 'utf8');
  console.log('✅ Created LICENSE (placeholder - full EULA pending)');
} catch (error) {
  console.error('❌ Failed to create LICENSE:', error.message);
  process.exit(1);
}

// ============================================================================
// 2. ELECTRON-BUILDER.YML
// ============================================================================
const ELECTRON_BUILDER_CONFIG = `appId: com.qanuni.app
productName: Qanuni
copyright: Copyright © 2026 Malek Kallas
directories:
  buildResources: build
  output: dist
files:
  - "**/*"
  - "!**/*.map"
  - "!test-*.js"
  - "!generate-*.js"
  - "!benchmark-*.js"
  - "!SESSION_*.md"
  - "!CHECKPOINT_*.md"
  - "!QANUNI_*.md"
  - "!PATTERNS.md"
  - "!Known_Fixes.md"
  - "!API_ENDPOINTS.md"
  - "!CODING_STANDARDS.md"
  - "!*.bak"
  - "!*.tmp"
  - "!qanuni-web.db.backup-*"
  - "!qanuni-web.db.bak"
  - "!qanuni-web.db.tmp"
  - "!.git"
  - "!.claude"
  - "!CProjectsqanunisrccontexts"
  - "!TWO_CHAT_WORKFLOW_FOR_CLAUDE_MD.md"
  - "!v48-translations-map.json"
  - "!nul"
  - "!create-distribution-setup.js"
win:
  target: nsis
  icon: build/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  artifactName: "\${productName}-Setup-\${version}.\${ext}"
  deleteAppDataOnUninstall: false
  license: LICENSE
`;

try {
  fs.writeFileSync('electron-builder.yml', ELECTRON_BUILDER_CONFIG, 'utf8');
  console.log('✅ Created electron-builder.yml');
} catch (error) {
  console.error('❌ Failed to create electron-builder.yml:', error.message);
  process.exit(1);
}

// ============================================================================
// 3. README.MD
// ============================================================================
const README_CONTENT = `# Qanuni - Legal Practice Management System

**Version:** 1.0.0  
**Author:** Malek Kallas  
**Status:** Production Ready (All 6 Hardening Phases Complete)

## Overview

Qanuni is a comprehensive legal practice management system (Legal ERP) built for Lebanese law firms and the broader MENA region. Desktop-first application with offline capabilities and full bilingual support.

## Features

### Core Practice Management
- **Client Management** - Track individual and corporate clients
- **Matter Management** - Organize cases, appeals, and legal matters
- **Court Scheduling** - Lebanese court system integration with hearing tracking
- **Conflict Checking** - Automated conflict detection across clients and matters

### Time & Billing
- **Time Tracking** - Billable hours and timesheet management
- **Expense Tracking** - Track and categorize expenses by matter
- **Invoicing** - Professional invoice generation with multiple templates
- **Fee Arrangements** - Hourly, fixed, retainer, success, and hybrid billing

### Corporate Secretary
- **Entity Management** - 13 Lebanese entity types supported
- **Share Transfers** - Track ownership changes and cap table
- **Commercial Register** - Filing tracking and compliance
- **Corporate Meetings** - Minutes and resolutions management

### Financial Management
- **Advances** - Client retainer and advance payment tracking
- **Reports** - Comprehensive financial and operational reports
- **Export** - PDF and Excel export capabilities

### Interface
- **Bilingual** - Full Arabic/English support with RTL layout
- **Offline-Capable** - Desktop application works without internet
- **Professional** - Modern, clean interface with Tailwind CSS

## Technical Architecture

- **Framework:** Electron 28.3.3
- **Frontend:** React 18 with Context-based state management
- **Database:** SQLite with atomic writes and crash recovery
- **Testing:** 117 integration tests (100% pass rate)
- **Scale:** Validated with 26,268 records, sub-second performance

## Installation

### End Users
1. Download the latest installer: \`Qanuni-Setup-1.0.0.exe\`
2. Run installer and follow wizard
3. Launch application
4. Enter license key when prompted

### Developers

**Prerequisites:**
- Node.js 20+
- Windows (primary platform)

**Setup:**
\`\`\`bash
git clone [repository]
cd qanuni
npm install
\`\`\`

**Development:**
\`\`\`bash
npm run dev          # Development with production database
npm run dev:test     # Development with test database
\`\`\`

**Testing:**
\`\`\`bash
node test-integration.js     # Run 117 integration tests
\`\`\`

**Building:**
\`\`\`bash
npm install --save-dev electron-builder    # First time only
npm run dist:clean                          # Build unpacked (for testing)
npm run dist                                # Build installer (.exe)
\`\`\`

## Data Storage

- **Database:** \`%APPDATA%/Qanuni/qanuni.db\`
- **Logs:** \`%APPDATA%/Qanuni/logs/\` (30-day retention)
- **Backups:** Automatic backups in database directory
- **Crash Reports:** \`%APPDATA%/Qanuni/logs/crash-TIMESTAMP.txt\`

## Architecture Highlights

### Production-Ready Features
- ✅ Atomic database writes (no corruption on crash)
- ✅ Migration versioning with rollback support
- ✅ File-based logging with automatic rotation
- ✅ Crash recovery with detailed reports
- ✅ Input validation on all IPC handlers
- ✅ Error boundaries preventing white screens
- ✅ User-friendly error notifications

### Code Quality
- 21 modular IPC handler files
- 163 backend handlers
- Zero console.log in production
- 32,332 lines of dead code removed
- Professional, maintainable codebase

## Performance

Validated with 26,268 test records:
- Startup: 5.9ms (target: 3000ms) - **508x faster**
- Module loading: 86.8ms max (target: 1000ms) - **11.5x faster**
- All operations: Sub-second response times

## License

Copyright © 2026 Malek Kallas. All rights reserved.

This is proprietary software. See LICENSE file for full terms.
Requires valid license key for use.

## Development Resources

- **CLAUDE.md** - Project overview and current state
- **PATTERNS.md** - Code standards and conventions
- **Known_Fixes.md** - Common issues and solutions
- **QANUNI_HARDENING_STRATEGY.md** - Architecture improvement plan
- **SESSION_XX_SUCCESS_REPORT.md** - Session completion reports

## Contact

For licensing or support inquiries: malek@qanuni.com

---

*Built for Lebanese law firms*
`;

try {
  fs.writeFileSync('README.md', README_CONTENT, 'utf8');
  console.log('✅ Created README.md');
} catch (error) {
  console.error('❌ Failed to create README.md:', error.message);
  process.exit(1);
}

// ============================================================================
// 4. UPDATE PACKAGE.JSON
// ============================================================================
try {
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add author
  packageJson.author = 'Malek Kallas';

  // Add dist scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.dist = 'electron-builder';
  packageJson.scripts['dist:clean'] = 'electron-builder --dir';
  packageJson.scripts['dist:win'] = 'electron-builder --win';

  // Add build section
  packageJson.build = {
    appId: 'com.qanuni.app',
    productName: 'Qanuni',
    directories: {
      output: 'dist'
    },
    files: [
      '**/*',
      '!test-*.js',
      '!generate-*.js',
      '!benchmark-*.js',
      '!SESSION_*.md',
      '!CHECKPOINT_*.md'
    ]
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Updated package.json (added author, dist scripts, and build config)');
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
  process.exit(1);
}

// ============================================================================
// 5. CREATE PLACEHOLDER ICON (SVG)
// ============================================================================
const ICON_SVG = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#1e40af" rx="32"/>
  <text x="128" y="180" font-family="Arial, sans-serif" font-size="160" font-weight="bold" fill="white" text-anchor="middle">Q</text>
</svg>`;

try {
  fs.writeFileSync('build/icon.svg', ICON_SVG, 'utf8');
  console.log('✅ Created build/icon.svg (placeholder icon)');
} catch (error) {
  console.error('❌ Failed to create icon.svg:', error.message);
  process.exit(1);
}

// ============================================================================
// DONE
// ============================================================================
console.log('\n✅ Distribution setup complete!\n');
console.log('📋 Next Steps:\n');
console.log('1. Convert icon to PNG:');
console.log('   - Open build/icon.svg in any image editor (Paint, GIMP, etc.)');
console.log('   - Export/Save As PNG, 256x256 pixels');
console.log('   - Save as build/icon.png');
console.log('   - (Or use online converter: convertio.co/svg-png/)');
console.log('');
console.log('2. Install electron-builder:');
console.log('   npm install --save-dev electron-builder');
console.log('');
console.log('3. Test build:');
console.log('   npm run dist:clean');
console.log('');
console.log('4. Create installer:');
console.log('   npm run dist');
console.log('');
console.log('📝 TODO for official release:');
console.log('   - Replace LICENSE with comprehensive EULA before distribution');
console.log('   - Replace build/icon.png with professional logo/icon');
console.log('');