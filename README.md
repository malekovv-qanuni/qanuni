# Qanuni - Legal Practice Management System

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
1. Download the latest installer: `Qanuni-Setup-1.0.0.exe`
2. Run installer and follow wizard
3. Launch application
4. Enter license key when prompted

### Developers

**Prerequisites:**
- Node.js 20+
- Windows (primary platform)

**Setup:**
```bash
git clone [repository]
cd qanuni
npm install
```

**Development:**
```bash
npm run dev          # Development with production database
npm run dev:test     # Development with test database
```

**Testing:**
```bash
node test-integration.js     # Run 117 integration tests
```

**Building:**
```bash
npm install --save-dev electron-builder    # First time only
npm run dist:clean                          # Build unpacked (for testing)
npm run dist                                # Build installer (.exe)
```

## Data Storage

- **Database:** `%APPDATA%/Qanuni/qanuni.db`
- **Logs:** `%APPDATA%/Qanuni/logs/` (30-day retention)
- **Backups:** Automatic backups in database directory
- **Crash Reports:** `%APPDATA%/Qanuni/logs/crash-TIMESTAMP.txt`

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
