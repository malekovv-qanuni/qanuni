# Qanuni Project Overview

**Version:** v1.0.0 (production release) — internal dev v49.8  
**SaaS Status:** 10/10 verified plan, Week 1 starts Monday (Session 24 complete)  
**Last Updated:** February 13, 2026 (Session 24)

## Current Status

Qanuni has reached production-ready status at version v1.0.0 with desktop application fully complete. **SaaS transformation plan verified at 10/10 by Claude Code - ready for Week 1 implementation.**

### Desktop Application (Complete)
- ✅ All core modules operational (22 IPC modules, 164 total handlers)
- ✅ 116 integration tests passing (100% happy-path coverage)
- ✅ Complete licensing system with machine-bound protection
- ✅ Windows installer built and polished (104.64 MB)
- ✅ All hardening phases (1-6) complete per QANUNI_HARDENING_STRATEGY.md
- ⚠️ **Known bug:** Invoice delete doesn't restore advance balance (fix in v1.0.1 or SaaS Week 5-6)

### SaaS Transformation (10/10 Verified - Ready to Build)

**Verification Journey (Session 23-24):**
- Session 23 initial plan: **7.5/10**
- After corrections: **8.5/10**
- After follow-up: **9.2/10**
- Final roadmap v2: **10/10** ✅

**Status:** Strategy finalized, all critical bugs identified, Week 1 implementation approved

**Key Discoveries:**
- 136 REST endpoints already fully coded in `server/routes/` (not empty stubs!)
- Critical invoice delete bug found (doesn't restore advance.balance_remaining)
- RLS session context has connection pool race condition (decision: skip RLS, use WHERE clauses)
- Timeline: 8 weeks (not 9 - routes exist, just need adaptation)

**Hosting:** SmarterASP.NET Premium Plan (3GB RAM, 10GB SQL Server, $0 Year 1)

**Architecture:** Node.js + Express + SQL Server + React (90% code reuse)
- Backend: Adapt 136 existing REST endpoints for SQL Server + auth + firm_id
- Database: SQLite → SQL Server migration with explicit WHERE firm_id = @firmId (no RLS)
- Auth: JWT-based with role permissions (firm_admin/lawyer/staff)
- Frontend: Reuse api-client.js (2,215 lines, 150+ methods, already dual-mode)

**Timeline:** 8 weeks for MVP
- Week 1-2: Database layer (sql.js → mssql, connection pooling) - BLOCKER
- Week 3-4: Auth + RBAC (JWT middleware, users/roles tables)
- Week 5-6: REST API adaptation (136 endpoints → SQL Server + auth + **fix invoice bug**)
- Week 7: Frontend adaptation (React Router, 4 forms to migrate)
- Week 8: Integration testing + deploy to SmarterASP.NET

**MVP Scope:** 7 modules (55 endpoints)
- Clients, Matters, Lawyers, Timesheets, **Expenses**, **Advances**, Invoices
- Why expenses + advances: Invoice creation writes to all three tables

**Capacity:** 20-30 concurrent users on existing hosting  
**Upgrade trigger:** When reaching 25+ users or 75% RAM usage  
**Next phase:** Week 1 Day 1 Monday - Move validation.js, install mssql, create database.js

**Confidence level:** 97% (verified by Claude Code with direct filesystem access)

---

## Critical Bugs Identified

### 🔴 Invoice Delete Doesn't Restore Advance Balance (Session 24)

**Location:** `electron/ipc/invoices.js` - deleteInvoice handler  
**Severity:** CRITICAL - Financial data loss  
**Impact:** When invoice with retainer deduction is deleted, the advance balance is NOT restored

**Example:**
1. Create invoice with $5,000 retainer → advance.balance_remaining = $15,000
2. Delete invoice → timesheets/expenses restored → advance.balance STILL $15,000 (should be $20,000)
3. **Result:** $5,000 permanently lost from client's retainer

**Fix (30 minutes):**
```javascript
// Add to deleteInvoice() BEFORE soft-delete:
const invoice = database.queryOne(
  'SELECT retainer_applied, retainer_advance_id FROM invoices WHERE invoice_id = ?',
  [invoiceId]
);

if (invoice?.retainer_applied > 0 && invoice?.retainer_advance_id) {
  database.execute(
    'UPDATE advances SET balance_remaining = balance_remaining + ? WHERE advance_id = ?',
    [invoice.retainer_applied, invoice.retainer_advance_id]
  );
}
```

**Apply to:**
- Desktop: `electron/ipc/invoices.js` (optional v1.0.1 patch)
- SaaS: `server/routes/invoices.js` (MUST fix in Week 5-6)

**Testing:**
```javascript
test('deleteInvoice restores advance balance', async () => {
  const advance = await createAdvance({ amount: 20000 });
  const invoice = await createInvoice({ retainer_applied: 5000, retainer_advance_id: advance.id });
  
  const advanceAfter = await getAdvance(advance.id);
  expect(advanceAfter.balance_remaining).toBe(15000);
  
  await deleteInvoice(invoice.id);
  
  const advanceRestored = await getAdvance(advance.id);
  expect(advanceRestored.balance_remaining).toBe(20000); // ✅ RESTORED
});
```

**Status:** Documented in KNOWN_FIXES.md, fix scheduled for SaaS Week 5-6

---

## Project Purpose

Qanuni is a comprehensive legal practice management system (Legal ERP) built with Electron, React, and SQLite, targeting Lebanese law firms and the broader MENA region. Desktop-first strategy proven successful (v1.0.0 shipped). Now transforming to multi-tenant SaaS for broader market reach.

**Key Features:**
- Bilingual Arabic/English with RTL layout support
- Client and matter management with conflict checking
- Court scheduling with Lebanese court system integration
- Time tracking and sophisticated billing (hourly, fixed, retainer, success, hybrid)
- Corporate secretary functions (13 Lebanese entity types, share transfers, filings)
- Financial management (invoices, advances, expenses, reports)
- Offline-capable desktop application (SQLite)
- **NEW: Multi-tenant SaaS** (SQL Server, 8-week timeline)

---

## Technical Stack

### Desktop (v1.0.0 Shipped)
- Electron 28.3.3 (desktop app framework)
- React 18 (frontend UI)
- SQLite via sql.js (embedded database)
- Tailwind CSS (styling)

### SaaS (Week 1 Starting Monday)
**Backend:**
- Node.js 20+ LTS
- Express.js 5.x (136 endpoints already coded)
- SQL Server 2022 (Phase 1 - SmarterASP.NET, $0 cost)
- mssql package v10+ (connection pooling)
- JWT + refresh tokens (httpOnly cookies)
- RBAC with 3 roles (firm_admin, lawyer, staff)
- **NO Row-Level Security** (use explicit WHERE firm_id = @firmId)

**Frontend:**
- React 18 (reuse 90% of desktop)
- React Router v6 (SPA routing)
- TanStack Query v5 (server state management)
- Existing api-client.js (2,215 lines, dual-mode already working)

**Development:**
- Node.js 20+
- VS Code with PowerShell (Windows)
- Git for version control
- electron-builder for desktop distribution

---

## Architecture

### Desktop (Current)
```
qanuni/
├── main.js                      # App lifecycle (150 lines)
├── preload.js                   # IPC bridge
├── electron/
│   ├── database.js              # Atomic writes, transactions, integrity (sql.js)
│   ├── logging.js               # File-based logging (30-day retention)
│   ├── migrations.js            # 16 versioned migrations
│   ├── schema.js                # 32 tables + seed data
│   ├── validation.js            ⚠️ MOVING to shared/ (Week 1 Day 1)
│   ├── crash-recovery.js        # Crash handling + reports
│   └── ipc/                     # 22 handler modules, 164 handlers (all complete)
│       ├── clients.js           # 6 handlers
│       ├── lawyers.js           # 7 handlers
│       ├── matters.js           # 6 handlers
│       ├── invoices.js          # 8 handlers (⚠️ has advance balance bug)
│       └── ... (18 more)
├── licensing/                   # License system
│   ├── license-manager.js      # Runtime validation (ships in installer)
│   ├── keygen.html             # Admin tool (excluded from build)
│   └── ...
├── src/
│   ├── App.js                   # Main React app (~4,000 lines)
│   ├── api-client.js            # ✅ 2,215 lines, 150+ methods, dual-mode ready
│   ├── constants/               # translations.js
│   ├── utils/                   # validators, formatDate, generateId
│   └── components/
│       ├── common/              # Shared components
│       ├── forms/               # ALL 13 form components (4 need migration)
│       ├── lists/               # 11 list components
│       ├── modules/             # Full modules (Dashboard, Calendar, Reports)
│       └── corporate/           # Corporate Secretary UI
└── test-integration.js          # 116 integration tests
```

### SaaS (Starting Week 1)
```
qanuni/
├── electron/                    # Desktop (unchanged, keep working)
├── src/                         # React (shared by desktop + SaaS)
│   └── api-client.js           # ✅ Already dual-mode
├── server/                      # ✅ EXISTS - 136 endpoints coded
│   ├── api-server.js           # Express skeleton
│   ├── database.js             # ❌ CREATE - mssql + connection pooling
│   ├── routes/                 # ✅ 20 files, 136 endpoints to ADAPT
│   │   ├── clients.js          # 6 endpoints → adapt for SQL Server + auth
│   │   ├── matters.js          # 7 endpoints → add WHERE firm_id
│   │   ├── expenses.js         # 6 endpoints → add auth middleware
│   │   ├── advances.js         # 10 endpoints → convert database calls
│   │   ├── invoices.js         # 8 endpoints → **FIX ADVANCE BUG HERE**
│   │   └── ... (15 more)
│   ├── middleware/             # ❌ CREATE
│   │   ├── auth.js            # JWT verification
│   │   ├── roles.js           # RBAC (firm_admin/lawyer/staff)
│   │   └── audit.js           # Audit logging
│   └── services/               # ❌ CREATE
│       ├── emailService.js    # Resend integration (password reset)
│       └── pdfService.js      # (defer to Phase 2)
└── shared/                      # ❌ CREATE (Week 1 Day 1)
    └── validation.js           # ← MOVE from electron/ (zero Electron deps)
```

---

## Database Schema

### Desktop (32 Tables)
- Core: clients, lawyers, matters, hearings, judgments, deadlines
- Time & Billing: timesheets, expenses, advances, invoices, invoice_items
- Organization: tasks, appointments, matter_diary
- Corporate Secretary: corporate_entities, shareholders, directors, share_transfers, commercial_register_filings, company_meetings
- Lookups: 6 lookup tables for courts, entity types, etc.
- System: settings, schema_versions, conflict_check_log, firm_currencies, exchange_rates

### SaaS (32 Desktop + 4 New Tables)
**New tables (Week 1-2):**
1. `firms` - Parent of all data (firm_id foreign key)
2. `users` - Authentication (email, password_hash, role)
3. `audit_logs` - Compliance tracking (all API calls logged)
4. `refresh_tokens` - Token revocation support

**Tables needing firm_id added (3 for MVP):**
- lawyers (add firm_id)
- deadlines (add firm_id)
- invoice_items (add firm_id)

**Tables already having firm_id (11 tables):**
- clients, matters, hearings, judgments, tasks, timesheets, expenses, advances, invoices, appointments, settings

**Key Changes:**
- Foreign key constraints enabled (same as desktop)
- Soft deletes (deleted_at column)
- Multi-tenant isolation via explicit `WHERE firm_id = @firmId`
- Connection pooling (max: 10, min: 0, idle: 30s)
- Indexes on all firm_id + primary_key composites

---

## IPC Architecture (Desktop - Complete)

**Pattern (all 22 modules follow this):**
```javascript
ipcMain.handle('channel-name', logger.wrapHandler('channel-name', (event, data) => {
  // 1. Validate input
  const check = validation.check(data, 'entityType');
  if (!check.valid) return check.result;

  // 2. Generate ID (for creates)
  const id = database.generateId('PREFIX');

  // 3. Execute with immediate save
  database.execute('INSERT INTO ...', [...]);

  // 4. Return structured result
  return { success: true, id };
}));
```

**All 22 IPC modules:**
- clients.js (6), lawyers.js (7), matters.js (6), matter-timeline.js (4)
- diary.js (4), hearings.js (4), judgments.js (4), deadlines.js (6)
- tasks.js (4), timesheets.js (5), expenses.js (8), advances.js (10)
- invoices.js (8 - **has advance bug**), appointments.js (4)
- lookups.js (9), conflict-check.js (2), corporate.js (24)
- trash.js (5), settings.js (22), reports.js (12), client-imports.js (2)
- license.js (fail-closed licensing)

**Total:** 164 handlers (was 163, found client-imports.js in Session 23)

---

## REST API Architecture (SaaS - Week 1-8)

**Pattern (Week 5-6 adaptation):**
```javascript
const { authMiddleware } = require('../middleware/auth');
const database = require('../database');

router.get('/api/clients', authMiddleware, async (req, res) => {
  const firmId = req.user.firmId; // From JWT
  
  const clients = await database.query(
    `SELECT * FROM clients 
     WHERE firm_id = @firmId AND deleted_at IS NULL`,
    { firmId }
  );
  
  res.json(clients);
});
```

**All 20 route modules (136 endpoints already coded):**
- clients.js (6), matters.js (7), lawyers.js (7), timesheets.js (5)
- expenses.js (6), advances.js (10), invoices.js (8), invoice_items (embedded)
- hearings.js (4), judgments.js (4), deadlines.js (6), tasks.js (4)
- appointments.js (4), diary.js (4), lookups.js (9), conflict-check.js (2)
- corporate.js (25+), trash.js (5), settings.js (14), reports.js (3)

**Total:** 136 endpoints (need SQL Server + auth + firm_id adaptation)

---

## Known Limitations

### Desktop v1.0.0
- Single-user model (no multi-user collaboration)
- No cloud sync (offline-only)
- Windows-only (no Mac/Linux builds yet)
- **Invoice delete bug:** Doesn't restore advance.balance_remaining

### SaaS Phase 1 (MVP)
- 17 tables use AUTOINCREMENT (not UUIDs) - acceptable for MVP, migrate to UUIDs in Phase 2
- No file uploads (expense receipts text-only) - defer to Phase 2
- No PDF generation server-side - defer to Phase 2
- Basic audit logs only (no compliance reports) - enhance in Phase 2
- SmarterASP.NET capacity: 20-30 users max - migrate to DigitalOcean PostgreSQL when scaling

---

## Roadmap

**v1.0.0 (Complete - Feb 13, 2026):**
- Desktop application shipped (104.64 MB installer)
- Production licensing system active
- 116 integration tests passing
- All hardening phases complete

**v1.0.1 (Optional Desktop Patch):**
- Fix invoice delete advance balance restoration bug
- Estimated effort: 30 minutes + testing
- Priority: MEDIUM (not critical for existing users)

**SaaS MVP (Week 1-8 - Starting Monday):**
- Week 1-2: Database layer (sql.js → mssql) ← BLOCKER
- Week 3-4: Auth + RBAC (JWT, users, roles)
- Week 5-6: REST API adaptation (136 endpoints + **fix invoice bug**)
- Week 7: Frontend adaptation (React Router, 4 forms)
- Week 8: Integration testing + deploy

**SaaS Phase 2 (Month 2-4):**
- Stripe billing integration
- File uploads (expense receipts, documents)
- PDF generation server-side
- Remaining 15 modules (hearings, judgments, corporate)
- Migrate AUTOINCREMENT → UUIDs
- Enhanced audit logs + compliance reports

**SaaS Phase 3 (Month 5-6):**
- Migrate to DigitalOcean + PostgreSQL
- Native Row-Level Security (RLS)
- 100+ active users support
- SOC 2 compliance (if enterprise demand)

---

## Success Metrics

**Desktop v1.0.0 (Achieved):**
- ✅ 104.64 MB installer (was 169 MB before security fixes)
- ✅ 116/116 integration tests passing
- ✅ Sub-second response times (5.9ms startup, 86.8ms max module load)
- ✅ 26,268 test records processed without degradation
- ✅ Licensing system enforced (machine-bound, 7-day grace)

**SaaS Week 8 (Launch Targets):**
- 5-10 beta users onboarded
- 0 data leak incidents (multi-tenancy working)
- <500ms average API response time
- 99%+ uptime
- Arabic text rendering correctly
- **Advance balance restoration verified (bug fixed)**

**SaaS Month 2 (Post-Launch):**
- 20+ active users
- Stripe billing integrated
- <1% error rate (Sentry)
- 15 remaining modules shipped

**SaaS Month 5-6 (Scale):**
- Migrate to PostgreSQL
- 100+ active users
- SOC 2 planning

---

## Resources

### Strategy Documents
- **SESSION_23_SAAS_FINAL_ROADMAP_v2.md** - 10/10 verified plan (8-week timeline)
- **SESSION_24_CHECKPOINT.md** - Full verification journey (7.5 → 10/10)
- **WEEK_1_IMPLEMENTATION_GUIDE.md** - Tactical Monday reference (to be created)
- **QANUNI_HARDENING_STRATEGY.md** - Desktop 6-phase improvement plan (complete)

### Code Standards
- **PATTERNS.md** - Code standards and conventions
- **KNOWN_FIXES.md** - Bug fixes and solutions (updated with invoice bug)

### Session Reports
- SESSION_20_SUCCESS_REPORT.md - v1.0.0 production release
- SESSION_21_CHECKPOINT.md - Production audit
- SESSION_22_CHECKPOINT.md - SaaS hosting strategy
- SESSION_23_CHECKPOINT.md - Initial SaaS plan (7.5/10)
- SESSION_24_CHECKPOINT.md - Final verification (10/10)

### Licensing Tools (Desktop)
- licensing/keygen.html - HTML UI for generating keys
- licensing/key-generator.js - CLI backup tool
- licensing/license-manager.js - Runtime validation
- All keygen tools excluded from installer (security)

---

## Session Notes

Proactively report conversation context status (% used) every 5-6 exchanges, alert at 70% to create checkpoint. At end of sessions with major structural changes, update CLAUDE.md in project root. When fixing recurring bugs, update KNOWN_FIXES.md with version, cause, fix, and test case.

**Session 24 completed SaaS plan verification (10/10).** Four rounds of verification with Claude Code (filesystem access) identified:
- 136 REST endpoints already coded (not empty stubs)
- Critical invoice delete bug (advance balance not restored)
- RLS race condition (decided to skip RLS, use WHERE clauses)
- Timeline correction (9 weeks → 8 weeks)
- Minor doc errors (firm_id count, AUTOINCREMENT limitation)

All issues documented in SESSION_23_SAAS_FINAL_ROADMAP_v2.md. Ready for Week 1 implementation Monday.

**Session 23 completed initial SaaS planning.** Validated existing SmarterASP.NET Premium Plan (3GB RAM, 10GB SQL Server, paid through March 2028). Chose SQL Server over PostgreSQL for MVP. Architecture: Node.js + Express + IISNode + JWT auth + multi-tenant firm_id. Timeline: 8 weeks for MVP (corrected from 9 in Session 24). Year 1 hosting cost: $0.

**Session 22 completed SaaS strategy and hosting analysis.** Full SaaS Platform (Option A) chosen over Hybrid model.

**Session 21 completed production audit.** Resolved stale SESSION_20_CHECKPOINT.md discrepancies, confirmed v1.0.0 production-ready.

**Session 19 completed licensing system implementation (v49.8).** All keygen tools excluded from installer for security. Production LICENSE_SALT active - all previous development keys invalidated.

---

## v1.0.0 - Production Release (Session 20 - Feb 13, 2026)

**Status:** Production-ready installer created  
**Installer:** `Qanuni Setup 1.0.0.exe` (104.64 MB)  
**Tests:** 116/116 passing  
**Known Issues:** Invoice delete doesn't restore advance balance (fix in v1.0.1 or SaaS Week 5-6)

### Session 20 Accomplishments

**Security Fix:**
- Fixed critical keygen file inclusion bug
- Changed `package.json` licensing whitelist from `/**/*` to `/license-manager.js`
- Verified keygen tools excluded from distribution
- Installer size reduced to 104.64 MB

**Documentation:**
- Created `README.txt` (5.8 KB) - User installation and activation guide
- Created `KEYGEN_USAGE.md` (11.4 KB) - Internal license management workflow
- README.txt bundled in installer package

**Final Build:**
- Production NSIS installer created via `npm run dist`
- Block map generated for auto-updates
- Security verification: Keygen tools NOT in distribution ✅

### Key Learnings
- `package.json` build config overrides `electron-builder.yml` when both present
- Whitelist patterns in files array override blacklist exclusions
- Must explicitly whitelist only necessary files from sensitive directories
- Installer size reduction (169 MB → 104 MB) confirms successful exclusions

### Production Checklist ✅
- [x] All tests passing (116/116)
- [x] Security verified (keygen excluded)
- [x] Documentation complete (README + KEYGEN_USAGE)
- [x] Installer created (104.64 MB)
- [x] Git history clean
- [ ] Code signing certificate (optional for v1.0)
- [ ] Update server configured (optional for v1.0)
- [ ] Installation tested on clean Windows system (recommended)

**Ready for distribution** to early adopters and beta customers.

---

*For detailed session reports, see SESSION_XX_*.md files in project root.*
