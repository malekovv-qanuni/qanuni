# Qanuni Product Strategy & Action Plan

> **Purpose:** Single source of truth for product direction. Update this doc, not session checkpoints.
> **Last Updated:** 2026-02-15
> **Current Phase:** Phase 1 — Make It Sellable (Week 3 Day 2 Complete)
> **Hosting Platform:** Azure App Service (B1 $13/mo, West Europe) + Azure SQL (Basic $5/mo, UAE North)

---

## Vision

**Qanuni** is a bilingual (Arabic/English) legal practice management SaaS for law firms in the MENA region. Competitive advantages: full Arabic support, corporate secretary module, integrated financials (timesheets → invoices → aging reports), multi-tenant cloud delivery.

**Target customers:** Solo practitioners and small-to-mid law firms (1-20 lawyers) in Lebanon, UAE, Saudi Arabia, and broader MENA.

**Revenue model:** Monthly SaaS subscription (tiered by firm size).

---

## Completed Foundation (SaaS Transformation)

| Metric | Value |
|--------|-------|
| API Endpoints | 171 (5 auth + 166 business) |
| SQL Server Tables | 33 (Azure SQL: qanuni-sql-server.database.windows.net) |
| Route Modules | 21/21 (100%) |
| SaaS Test Assertions | 739/739 passing |
| Desktop Test Assertions | 118/118 passing |
| Bridge Layer | Dual-mode (Desktop IPC + REST API) |

---

## Phase 1: Make It Sellable (Target: 3 weeks)

**Goal:** A deployed web app that a law firm can sign up for and use.
**Platform:** Azure App Service (API + frontend) + Azure SQL (DB) — single deployment model
**Cost:** ~$18/month (B1 App Service $13 + Basic SQL $5)

### Week 1: Pre-Deployment Code Prep

**Day 1-2: Fix Dependency & API Client Issues**
- [x] Move `msnodesqlv8` from dependencies to optionalDependencies in package.json
- [x] Wrap msnodesqlv8 require in try/catch in server/database.js
- [x] Update api-client.js baseURL: `process.env.REACT_APP_API_URL || 'http://localhost:3001/api'`
- [x] Create `.env.example` with all required variables documented
- [x] Delete dead code: `src/api.js` (76 electronAPI refs, 0 imports)
- [x] Add `"engines": { "node": ">=18.0.0" }` to package.json
- [x] Verify `npm run server` + `node test-integration-saas.js` still pass (118/118 desktop, 739/739 SaaS, 3/3 connection)

**Day 3-5: Refactor 9 Components (replace direct electronAPI with apiClient)**
- [x] `src/components/forms/MatterForm.js` (9 refs)
- [x] `src/components/forms/ClientForm.js` (7 refs)
- [x] `src/components/forms/JudgmentForm.js` (5 refs)
- [x] `src/components/forms/HearingForm.js` (4 refs)
- [x] `src/components/lists/ClientsList.js` (4 refs — import/export buttons hidden in web mode)
- [x] `src/components/lists/JudgmentsList.js` (3 refs)
- [x] `src/components/lists/MattersList.js` (2 refs)
- [x] `src/components/lists/HearingsList.js` (2 refs)
- [x] `src/components/lists/DeadlinesList.js` (1 ref — was only a comment, already clean)
- [x] Update App.js to stop passing electronAPI prop to these components
- [x] Test `npm run build:web` succeeds
- [ ] Verify all 55 components render in browser (dev mode)

### Week 2: Auth UI & Database Setup

**Day 1-3: Build Auth Pages** ✅
- [x] LoginPage.js (email + password form, calls /api/auth/login)
- [x] RegisterPage.js (firm name + admin user, calls /api/auth/register)
- [x] ForgotPasswordPage.js (placeholder — "contact your administrator")
- [x] ProtectedRoute wrapper (redirect to /login if no token)
- [x] Logout button in app header (clear token + redirect)
- [x] React Router v6 setup (public routes vs protected routes)
- [x] AuthContext.js (user state, login/register/logout)
- [x] 4 auth methods in api-client.js (login, register, refreshAuthToken, getMe)

**Day 4-5: Azure SQL Provisioning** ✅
- [x] Create Azure SQL Database (Basic tier: $5/mo, 2GB, UAE North)
- [x] Fix database.js: remove instanceName from SQL Auth path (Azure compatibility)
- [x] Run all 18 schema-*.sql files against Azure SQL (33 tables created)
- [x] Seed 6 system currencies (USD, EUR, LBP, GBP, AED, SAR with Arabic names)
- [x] Test connection from local machine with SQL Auth credentials
- [x] Run `node test-integration-saas.js` against Azure SQL — 739/739 passing
- [x] Created run-azure-schema.js (reusable deployment script)

### Week 3: Deployment & Live Testing

**Day 1-2: Deploy API + Frontend** ✅
- [x] Created Azure App Service (Node.js 20 LTS, Linux, B1 tier, West Europe)
- [x] Changed `npm start` to run Express API (required for Azure)
- [x] Added CORS origin restriction with ALLOWED_ORIGINS env var
- [x] Added body-parser size limits (5mb) and static file serving with SPA fallback
- [x] Configured environment variables (DB_SERVER, JWT_SECRET, ALLOWED_ORIGINS, etc.)
- [x] Built React frontend with `npm run build:web` (196KB gzipped)
- [x] Deployed via Azure Management API zipdeploy (code-only zip + remote npm install)
- [x] SSL automatic on *.azurewebsites.net
- [x] Verified health: `{"status":"ok","database":"connected"}`
- [x] Upgraded F1 → B1 ($13/mo) for dedicated CPU + always-on
- [x] Enabled always-on (prevents cold starts)
- [x] Tested registration: HTTP 201 in ~11s (was 125s on F1)
- [x] Tested login: HTTP 200 in ~2.5s
- [x] Single-deployment model: Express serves both API (/api/*) and React build (/*) — no separate Static Web Apps needed

**Day 3: End-to-End Integration Testing**
- [ ] Register new firm via web UI (browser)
- [ ] Login, create client, create matter
- [ ] Test all 21 modules in browser
- [ ] Test Arabic text input (bilingual fields)
- [ ] Test firm isolation (register 2nd firm, verify no data leak)
- [ ] Fix any CORS/environment issues

### Phase 1 Exit Criteria
- A lawyer can visit the URL, register a firm, log in, and manage clients/matters/cases
- All 21 modules functional via web browser
- HTTPS, proper auth, data isolation between firms

---

## Phase 2: Make It Competitive (Target: 3 weeks after Phase 1)

**Goal:** Features that justify paying and differentiate from competitors.

### 2.1 Security & Hardening
- [ ] Rate limiting on auth endpoints
- [ ] Input sanitization audit (XSS, SQL injection)
- [x] CORS configuration (whitelist production domain only) — done in Phase 1 Week 3
- [x] Request size limits (5mb) — done in Phase 1 Week 3
- [ ] Helmet.js security headers
- [ ] API request logging & monitoring

### 2.2 Billing & Subscription
- [ ] Stripe integration (or regional payment gateway)
- [ ] Plan tiers: Solo (1 lawyer), Firm (5 lawyers), Enterprise (20+ lawyers)
- [ ] Trial period (14 or 30 days)
- [ ] Subscription management UI (upgrade, downgrade, cancel)
- [ ] Usage limits enforcement (lawyers per plan, storage per plan)

### 2.3 User Management & Roles
- [ ] Invite team members (email invitation flow)
- [ ] Role-based permissions (Admin, Lawyer, Assistant, Read-only)
- [ ] Per-user activity logging
- [ ] Firm settings page (firm profile, logo upload)

### 2.4 Phase 2 Exit Criteria
- Firm can subscribe, pay, invite team members with different roles
- Production-grade security
- Revenue is being collected

---

## Phase 3: Make It Grow (Ongoing after Phase 2)

**Goal:** Features that increase stickiness and expand market.

### 3.1 Document Management
- [ ] File upload per matter (contracts, pleadings, evidence)
- [ ] Azure Blob Storage or S3 backend
- [ ] Document preview (PDF viewer)
- [ ] Version history
- [ ] Document templates

### 3.2 Client Portal
- [ ] Separate login for clients
- [ ] Clients see their case status, upcoming hearings, invoices
- [ ] Secure messaging between client and lawyer
- [ ] Reduces phone calls — major selling point

### 3.3 Arabic-First Polish
- [ ] Full RTL layout support
- [ ] Complete Arabic translations for all UI strings
- [ ] Arabic date formatting (Hijri calendar option)
- [ ] Arabic PDF generation for invoices/reports

### 3.4 Advanced Features (Prioritize by Customer Demand)
- [ ] Calendar sync (Google Calendar, Outlook)
- [ ] Email integration (link emails to matters)
- [ ] Mobile app (React Native, same API)
- [ ] Advanced analytics dashboard
- [ ] AI-powered document analysis
- [ ] Court deadline auto-calculation by jurisdiction
- [ ] Bulk SMS/WhatsApp notifications for hearing reminders

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-15 | Web build of existing React app, not new frontend | 55 components + bridge layer already work; rewriting wastes months |
| 2026-02-15 | Skip mobile until after paying customers | Mobile doesn't close sales; deployed web app does |
| 2026-02-15 | Kill desktop-local SQLite for SaaS users | Dual-database sync is a maintenance nightmare |
| 2026-02-15 | Phase 1 before features | Deployment + auth + landing page = sellable product |
| 2026-02-15 | Azure App Service + Azure SQL, not SmarterASP.NET | Code audit: msnodesqlv8 native module won't compile on IIS shared hosting; no iisnode/web.config in repo; IIS port binding conflicts with Express. Azure = same SQL Server engine, $0 free tier, git-push deploy |
| 2026-02-15 | Not Railway | Splits infra across 2 platforms; Railway has no SQL Server; cross-region latency risk |
| 2026-02-15 | Fix code before deploying (Week 1 prep) | 9 components have direct electronAPI usage; api-client.js has hardcoded localhost; msnodesqlv8 blocks npm install on Linux |
| 2026-02-15 | BrowserRouter wrap (not full router migration) | Only auth boundary needs routes; state-based module nav inside app works fine; avoids touching 4000-line App.js |
| 2026-02-15 | ForgotPassword as placeholder (not full flow) | No backend endpoint yet; build UI now, wire later; users expect the link on login page |
| 2026-02-15 | Azure SQL Basic tier ($5/mo) not free tier | Predictable performance; free tier has vCore-second metering that can surprise |
| 2026-02-15 | UAE North region for Azure SQL | Closest to MENA target market (Lebanon, UAE, Saudi Arabia) |
| 2026-02-15 | Single-deployment model (Express serves API + frontend) | Eliminates CORS complexity; no need for separate Static Web Apps; simpler deployment pipeline |
| 2026-02-15 | B1 App Service ($13/mo) over F1 free tier | F1 caused 125s response times (shared CPU + cold starts); B1 gives dedicated CPU, always-on, 2.5s login |
| 2026-02-15 | West Europe for App Service (not UAE North) | UAE North has Basic VM quota limit (0); West Europe available immediately; cross-region latency acceptable (~2.5s login) |
| 2026-02-15 | Kudu command API for remote npm install | Zipdeploy with SCM_DO_BUILD_DURING_DEPLOYMENT didn't trigger Oryx; deploying code-only zip + running `npm install` via Kudu API works reliably |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| 9 components with direct electronAPI break in browser | Medium | Week 1 Day 3-5 refactor; pattern is mechanical find/replace |
| msnodesqlv8 blocks npm install on Linux/Azure | High | Move to optionalDependencies; production uses tedious (pure JS) |
| ~~Azure free tier limits hit~~ | ~~Low~~ | ~~RESOLVED: Upgraded to B1 ($13/mo); always-on enabled~~ |
| SQL Server hosting costs | Low | Azure SQL Basic tier: $5/mo, 2GB; sufficient for first 100 firms |
| No customers sign up | High | Start with personal network, Lebanese legal community |
| Competitor launches Arabic tool | Medium | Move fast on Phase 1; corporate module is differentiator |
| Single developer bottleneck | High | Keep architecture simple; avoid over-engineering |
| ~~CORS issues between static frontend and API~~ | ~~Low~~ | ~~RESOLVED: Single-deployment model eliminates CORS; ALLOWED_ORIGINS configured for safety~~ |
| Cross-region latency (App: West Europe, DB: UAE North) | Medium | ~2.5s login, ~11s registration; acceptable for MVP; request UAE North B1 quota later |

---

## How to Use This Document

1. **At session start:** Read this doc to know what phase/task you're on
2. **During work:** Check off completed items with `[x]`
3. **At session end:** Update "Last Updated" date, add any new decisions to Decision Log
4. **When priorities shift:** Update the phase tasks, add rationale to Decision Log
5. **This replaces:** Session checkpoint files for strategic direction (checkpoints remain for technical detail)
