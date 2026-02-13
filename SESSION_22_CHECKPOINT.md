# Session 22 Checkpoint — SaaS Strategy & Hosting Analysis
**Date:** February 13, 2026
**Version:** v1.0.0 (post-production)
**Status:** SaaS planning complete, hosting validated

## Session Goals
1. Evaluate SaaS transformation strategy for Qanuni
2. Analyze existing SmarterASP.NET Premium Plan capabilities
3. Determine hosting costs and upgrade path
4. Plan database migration (SQLite → SQL Server/PostgreSQL)

---

## Key Decisions

### Hosting Strategy: Use Existing SmarterASP.NET Premium Plan
**Rationale:**
- Already paid through March 2028 (2+ years prepaid)
- 3GB RAM quota supports 20-30 concurrent users
- 10GB SQL Server + 10GB MySQL included
- Free SSL certificate (Let's Encrypt)
- Node.js support via IISNode confirmed
- **Cost Year 1: $0** (saves $600 vs. immediate upgrade)

**Capacity validated:**
- Current usage: 479MB RAM (15% of 3GB quota)
- Available headroom: 2.5GB
- Estimated capacity: 20-30 concurrent users for MVP
- Database limit: 10GB total (sufficient for 500-1000 clients)

---

## SaaS Architecture (Final Plan)

### Backend: Node.js + SQL Server
**Why SQL Server over PostgreSQL:**
- Already included in Premium Plan (no extra cost)
- No additional hosting needed
- Familiar Windows environment
- Can migrate to PostgreSQL later if moving to Linux VPS

**Architecture:**
```
SmarterASP.NET Premium Plan
├── Node.js API (via IISNode)
│   ├── Express REST endpoints (156 handlers from desktop app)
│   ├── JWT authentication
│   └── Multi-tenant isolation (firm_id per row)
├── SQL Server 2022 (10GB)
│   ├── qanuni_production (main DB)
│   ├── qanuni_staging (testing DB)
│   └── Multi-tenancy via firm_id column
├── React Frontend (static files via IIS)
└── Free SSL Certificate
```

### Database Migration: SQLite → SQL Server
**Key changes needed:**
```sql
-- Add multi-tenancy to all 27 tables
ALTER TABLE clients ADD firm_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE matters ADD firm_id UNIQUEIDENTIFIER NOT NULL;
-- ... repeat for all tables

-- Syntax translations
AUTOINCREMENT → IDENTITY(1,1)
datetime('now') → GETDATE()
SUBSTR() → SUBSTRING()
```

### Authentication: JWT-based
**Flow:**
1. POST /auth/login → returns JWT token
2. Client stores token in localStorage
3. Every API call includes: `Authorization: Bearer <token>`
4. Server extracts user_id, firm_id, role from token
5. All queries auto-filtered by firm_id

**Roles:**
- Firm Admin: Full access, billing, user management
- Lawyer: Own clients/matters, limited settings
- Staff: Data entry, restricted reports

---

## Cost Analysis

### Option A: Stay on SmarterASP.NET (Recommended for MVP)

| Phase | Timeline | Plan | RAM | SQL | Monthly Cost | User Capacity |
|-------|----------|------|-----|-----|--------------|---------------|
| MVP | Month 1-6 | Premium (current) | 3GB | 10GB | **$0** | 15-25 users |
| Growth | Month 7-12 | Premium (monitor) | 3GB | 10GB | **$0** | 25-35 users |
| Scale | Month 13-18 | Semi-Advance | 6GB | 10GB | $49.95 | 40-60 users |
| Expansion | Month 19+ | Semi-Premium | 9GB | 10GB | $79.95 | 60-100 users |

**Year 1 Total: $0** (use prepaid Premium Plan)
**Year 2 Total: ~$600** (if upgrading to Semi-Advance)
**Year 3 Total: ~$960** (if upgrading to Semi-Premium)

### Option B: Linux VPS Migration (Long-term cost savings)

| Phase | Timeline | Hosting | Monthly Cost | Notes |
|-------|----------|---------|--------------|-------|
| MVP | Month 1-6 | Premium (SmarterASP) | $0 | Validate product |
| Growth | Month 7-12 | Premium (SmarterASP) | $0 | Prove market fit |
| Migrate | Month 13 | Development | One-time | Rewrite to PostgreSQL (~2-3 weeks) |
| Scale | Month 13-36 | DigitalOcean Droplet | $24 | 4GB RAM, 80GB SSD |

**3-year total: ~$576** (vs. $2,938 staying on SmarterASP)
**Savings: $2,362 over 3 years**
**Tradeoff: 2-3 weeks migration effort**

### RAM Add-On Pricing (if needed)
- 256MB extra: $60/year ($5/month)
- 1GB extra: $240/year ($20/month)
- 3GB upgrade: $480/year ($40/month) with 15% discount

**Not needed for MVP** — current 3GB quota is sufficient.

---

## Upgrade Triggers

### When to upgrade from Premium Plan:

1. **RAM threshold:** Sustained >75% usage (2.25GB+) for 1+ week
2. **User count:** 25-30 concurrent users regularly
3. **SQL size:** Approaching 8GB (80% of 10GB limit)
4. **Performance:** Slow queries, frequent app pool recycling
5. **Revenue:** $2,000+ MRR justifies $50-80/month hosting

**Monitoring strategy:**
- Check Pool Manager weekly (SmarterASP control panel)
- Track concurrent user peaks via app logs
- Monitor SQL Server size via Database Manager
- Set alert at 70% RAM usage

---

## Technical Implementation Plan

### Phase 1: Backend API (2-3 weeks)
1. **SQL Server schema migration**
   - Convert 27 CREATE TABLE statements
   - Add firm_id to all tables
   - Migrate seed data
   - Test multi-tenant queries

2. **Express API setup**
   - Copy 156 IPC handlers from desktop app
   - Convert to REST endpoints
   - Add JWT middleware
   - Implement firm_id context per request

3. **Validation layer**
   - Reuse electron/validation.js schemas
   - Add firm-level permissions checks
   - Test with Postman/Thunder Client

### Phase 2: Frontend Adaptation (1-2 weeks)
1. **Authentication UI**
   - Login page
   - Registration flow (self-service trials)
   - Password reset
   - User settings

2. **API integration**
   - Replace `window.electronAPI.X()` with `fetch('/api/X')`
   - Add Authorization header to all requests
   - Handle 401 Unauthorized (logout)

3. **Component reuse**
   - 90% of React components work as-is
   - Forms need API call changes only
   - Lists need API call changes only

### Phase 3: Deployment (1 week)
1. **IISNode configuration**
   - Create web.config
   - Set up Node.js in SmarterASP control panel
   - Configure process.env.PORT
   - Enable URL rewriting

2. **Database setup**
   - Create SQL Server database via control panel
   - Run migration scripts
   - Test connection from Node.js

3. **SSL & domain**
   - Point domain to SmarterASP IP
   - Enable Let's Encrypt SSL
   - Test HTTPS

**Total implementation: 4-6 weeks**

---

## Compliance & Legal (if serving EU/Lebanon)

### GDPR Requirements
**Mandatory documents:**
1. Privacy Policy
2. Terms of Service
3. Data Processing Agreement (B2B)
4. Cookie Policy

**Technical requirements:**
- Right to erasure ("Delete my account")
- Data portability (export to JSON/CSV)
- Breach notification (72 hours)
- Consent management

**Cost:** Hire privacy lawyer for templates (~$500-2000)

### Subscription Tiers (Suggested)

| Tier | Price/Month | Clients | Matters | Users | Storage |
|------|-------------|---------|---------|-------|---------|
| Starter | $29 | 50 | 100 | 2 | 5 GB |
| Professional | $79 | 500 | 1000 | 10 | 50 GB |
| Enterprise | $199 | Unlimited | Unlimited | Unlimited | 500 GB |

**Payment:** Stripe (handles PCI compliance)
**Trial:** 14-day free (no credit card)
**Desktop license:** $499 one-time (privacy-conscious firms)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Premium Plan RAM limits | Medium | High | Monitor weekly, upgrade if >75% |
| SQL Server 10GB too small | Low | Medium | Optimize storage, archive old data |
| IISNode performance issues | Medium | Medium | Test early, migrate to VPS if needed |
| Multi-tenant data leak | Low | Critical | Row-level security, comprehensive testing |
| GDPR non-compliance | Medium | High | Legal review before EU launch |

---

## Next Steps (Session 23+)

1. **IISNode deployment guide** — Step-by-step for SmarterASP.NET
2. **SQL Server migration** — Complete schema conversion
3. **JWT authentication** — Implementation details
4. **web.config setup** — Node.js configuration for IIS
5. **Testing strategy** — Load testing to validate 20-30 user capacity

---

## Files Modified This Session
- None (planning session only)

## Resources
- SmarterASP.NET Control Panel: https://member5-4.smarterasp.net/cp/cp_screen
- SmarterASP.NET Node.js Guide: https://www.smarterasp.net/support/kb/c51/node_js.aspx
- SmarterASP.NET FAQ: https://www.smarterasp.net/faq
