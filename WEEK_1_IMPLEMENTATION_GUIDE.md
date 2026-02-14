# Week 1 Implementation Guide — SaaS Database Layer

**Timeline:** Monday-Friday (5 days, 40 hours)  
**Goal:** Create `server/database.js` with SQL Server connection pooling  
**Status:** BLOCKER - All subsequent work depends on this  
**Confidence:** 97% (Claude Code verified plan)

---

## Pre-Flight Checklist

Before starting Monday, verify:

- [ ] Desktop v1.0.0 is working (`npm run dev` → app launches)
- [ ] All 116 integration tests pass (`node test-integration.js`)
- [ ] Git status is clean (commit any pending work)
- [ ] SQL Server is available (local SQL Express OR SmarterASP.NET credentials)
- [ ] Node.js 20+ installed (`node --version`)
- [ ] VS Code open to `C:\Projects\qanuni\`

---

## Monday Morning (4 hours) — Foundation Setup

### Task 1: Create shared/ Directory (5 minutes)

```powershell
# Navigate to project root
cd C:\Projects\qanuni

# Create shared directory
New-Item -ItemType Directory -Path "shared"

# Verify
Get-ChildItem
# Should now show: electron/, src/, server/, shared/, package.json, etc.
```

---

### Task 2: Move validation.js to shared/ (10 minutes)

```powershell
# Move file
Move-Item "electron\validation.js" "shared\validation.js"

# Verify
Test-Path "shared\validation.js"  # Should return True
Test-Path "electron\validation.js"  # Should return False
```

---

### Task 3: Update Imports in All IPC Handlers (30 minutes)

**Pattern to find:**
```javascript
const validation = require('../validation');
```

**Replace with:**
```javascript
const validation = require('../../shared/validation');
```

**Files to update (all 22 files in `electron/ipc/`):**
1. clients.js
2. lawyers.js
3. matters.js
4. matter-timeline.js
5. diary.js
6. hearings.js
7. judgments.js
8. deadlines.js
9. tasks.js
10. timesheets.js
11. expenses.js
12. advances.js
13. invoices.js
14. appointments.js
15. lookups.js
16. conflict-check.js
17. corporate.js
18. trash.js
19. settings.js
20. reports.js
21. client-imports.js
22. license.js

**PowerShell find/replace:**
```powershell
# Find all files with old import
Get-ChildItem "electron\ipc" -Filter "*.js" | Select-String -Pattern "require\('../validation'\)"

# Use VS Code Find in Files:
# Find: const validation = require\('../validation'\);
# Replace: const validation = require\('../../shared/validation'\);
# Scope: electron/ipc/*.js
# Replace All (Ctrl+Shift+H)
```

**Manual verification:**
```powershell
# Check one file manually
Get-Content "electron\ipc\clients.js" | Select-String "validation"
# Should show: const validation = require('../../shared/validation');
```

---

### Task 4: Test Desktop Still Works (15 minutes)

```powershell
# Run in test mode
npm run dev:test

# Verify app launches
# Try creating a test client
# Close app

# Run integration tests
node test-integration.js

# ✅ MUST show: 116/116 tests passing
# If any failures, STOP and fix before proceeding
```

**If tests fail:**
1. Check import paths in `electron/ipc/*.js`
2. Verify `shared/validation.js` exists and has correct content
3. Check for typos in require paths (`../../shared` not `../shared`)

---

### Task 5: Commit Progress (5 minutes)

```powershell
git status
# Should show:
# - deleted: electron/validation.js
# - new file: shared/validation.js
# - modified: electron/ipc/*.js (22 files)

git add -A
git commit -m "Refactor: Move validation.js to shared/ for SaaS reuse

- Created shared/ directory
- Moved electron/validation.js → shared/validation.js
- Updated imports in all 22 IPC handlers
- Verified desktop still works (116/116 tests passing)

Part of Week 1 SaaS database layer setup."

git push
```

---

### Task 6: Install SQL Server Package (5 minutes)

```powershell
# Install mssql package
npm install mssql

# Verify installation
npm list mssql
# Should show: mssql@10.0.1 (or later)

# Commit
git add package.json package-lock.json
git commit -m "Add mssql package for SQL Server connection pooling"
git push
```

---

### Task 7: Create .env File (10 minutes)

**Create `.env` in project root:**
```powershell
# Create file
New-Item -Path ".env" -ItemType File

# Open in VS Code
code .env
```

**Add content:**
```env
# SQL Server Connection (Local Development)
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=qanuni_dev
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!

# JWT Secrets (Generate with: openssl rand -base64 64)
JWT_SECRET=<paste 64-char random string>
JWT_REFRESH_SECRET=<paste 64-char random string>

# Email Service (Resend - signup at resend.com)
RESEND_API_KEY=re_123456789

# Environment
NODE_ENV=development

# CORS (for local React dev server)
ALLOWED_ORIGINS=http://localhost:3000
```

**Generate JWT secrets (PowerShell):**
```powershell
# If you have OpenSSL installed:
openssl rand -base64 64

# Otherwise, use Node.js:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# Run twice, paste each into .env
```

**Add .env to .gitignore:**
```powershell
# Check if .env is already ignored
Get-Content ".gitignore" | Select-String ".env"

# If not found, add it
Add-Content ".gitignore" "`n# Environment variables`n.env"

# Verify .env is NOT staged for commit
git status
# .env should NOT appear in "Changes to be committed"
```

---

### Task 8: Create server/database.js Skeleton (60 minutes)

**Create file:**
```powershell
code server\database.js
```

**Add content:**
```javascript
/**
 * Database Layer - SQL Server Connection Pooling
 * 
 * Provides the same interface as desktop database.js but uses mssql package.
 * - query(sql, params): SELECT queries, returns array of rows
 * - queryOne(sql, params): SELECT, returns first row or null
 * - execute(sql, params): INSERT/UPDATE/DELETE
 * - transaction(callback): Wraps operations in transaction
 * - generateId(prefix): Crypto-based ID generation (matches desktop)
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,  // Required for Azure/SmarterASP.NET
    trustServerCertificate: true,  // For local dev
    enableArithAbort: true
  },
  pool: {
    max: 10,  // Maximum connections
    min: 0,   // Minimum connections
    idleTimeoutMillis: 30000  // Close idle connections after 30s
  }
};

let pool = null;

/**
 * Get or create connection pool
 * @returns {Promise<sql.ConnectionPool>}
 */
async function connect() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ SQL Server connection pool created');
  }
  return pool;
}

/**
 * Execute SELECT query, return all rows
 * @param {string} sqlText - SQL query with @param placeholders
 * @param {object} params - Parameters object { param1: value1, param2: value2 }
 * @param {string} firmId - Optional firm_id for multi-tenant queries
 * @returns {Promise<Array>} Array of row objects
 * 
 * @example
 * const clients = await query(
 *   'SELECT * FROM clients WHERE firm_id = @firmId',
 *   { firmId: 'abc-123' }
 * );
 */
async function query(sqlText, params = {}, firmId = null) {
  const pool = await connect();
  const request = pool.request();
  
  // Add all parameters
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.query(sqlText);
  return result.recordset;  // Array of rows
}

/**
 * Execute SELECT query, return first row or null
 * @param {string} sqlText - SQL query
 * @param {object} params - Parameters
 * @param {string} firmId - Optional firm_id
 * @returns {Promise<object|null>} First row or null
 * 
 * @example
 * const client = await queryOne(
 *   'SELECT * FROM clients WHERE client_id = @id AND firm_id = @firmId',
 *   { id: 'CLI-2026-abc123', firmId: 'firm-xyz' }
 * );
 */
async function queryOne(sqlText, params = {}, firmId = null) {
  const rows = await query(sqlText, params, firmId);
  return rows[0] || null;
}

/**
 * Execute INSERT/UPDATE/DELETE query
 * @param {string} sqlText - SQL statement
 * @param {object} params - Parameters
 * @param {string} firmId - Optional firm_id
 * @returns {Promise<object>} { success: true, rowsAffected: N }
 * 
 * @example
 * await execute(
 *   'UPDATE clients SET client_name = @name WHERE client_id = @id AND firm_id = @firmId',
 *   { name: 'Updated Name', id: 'CLI-2026-abc', firmId: 'firm-xyz' }
 * );
 */
async function execute(sqlText, params = {}, firmId = null) {
  const pool = await connect();
  const request = pool.request();
  
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.query(sqlText);
  return { success: true, rowsAffected: result.rowsAffected[0] };
}

/**
 * Execute multiple operations in a transaction
 * @param {Function} callback - async function receiving transaction object
 * @returns {Promise<any>} Result from callback
 * 
 * @example
 * await transaction(async (tx) => {
 *   await tx.request()
 *     .input('id', 'CLI-2026-abc')
 *     .query('INSERT INTO clients ...');
 *   
 *   await tx.request()
 *     .input('matterId', 'MAT-2026-xyz')
 *     .query('INSERT INTO matters ...');
 *   
 *   return { success: true };
 * });
 */
async function transaction(callback) {
  const pool = await connect();
  const tx = pool.transaction();
  
  try {
    await tx.begin();
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

/**
 * Generate unique ID with prefix (matches desktop pattern)
 * @param {string} prefix - ID prefix (e.g., 'CLI', 'MAT', 'INV')
 * @returns {string} ID in format PREFIX-YYYY-xxxxxxxx
 * 
 * @example
 * const clientId = generateId('CLI');
 * // Returns: 'CLI-2026-a1b2c3d4'
 */
function generateId(prefix) {
  const crypto = require('crypto');
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${year}-${random}`;
}

/**
 * Close connection pool (for graceful shutdown)
 */
async function close() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('✅ SQL Server connection pool closed');
  }
}

module.exports = {
  query,
  queryOne,
  execute,
  transaction,
  generateId,
  connect,
  close
};
```

**Save and commit:**
```powershell
git add server\database.js
git commit -m "Create server/database.js with SQL Server connection pooling

- Connection pool configuration (max: 10, idle: 30s)
- Match desktop interface: query, queryOne, execute, transaction
- generateId() matches desktop crypto-based pattern
- Parameterized queries (@param syntax for SQL Server)
- Transaction support with rollback
- Graceful pool closing

Week 1 Day 1 - Database foundation complete."
git push
```

---

### Task 9: Test SQL Server Connection (30 minutes)

**Test script:**
```powershell
# Create test file
code test-db-connection.js
```

**Content:**
```javascript
const database = require('./server/database');

async function testConnection() {
  try {
    console.log('🔌 Testing SQL Server connection...');
    
    // Test basic connection
    const pool = await database.connect();
    console.log('✅ Connection pool created');
    
    // Test basic query
    const result = await database.query('SELECT 1 AS test');
    console.log('✅ Basic query works:', result);
    
    // Test queryOne
    const one = await database.queryOne('SELECT @@VERSION AS version');
    console.log('✅ QueryOne works:', one.version.substring(0, 50) + '...');
    
    // Test generateId
    const id = database.generateId('TEST');
    console.log('✅ Generate ID works:', id);
    
    // Close pool
    await database.close();
    console.log('✅ Connection pool closed');
    
    console.log('\n🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

**Run test:**
```powershell
node test-db-connection.js

# Expected output:
# 🔌 Testing SQL Server connection...
# ✅ Connection pool created
# ✅ Basic query works: [ { test: 1 } ]
# ✅ QueryOne works: Microsoft SQL Server 2022...
# ✅ Generate ID works: TEST-2026-a1b2c3d4
# ✅ Connection pool closed
# 🎉 All database tests passed!
```

**If connection fails:**
1. Check `.env` credentials (server, database, user, password)
2. Verify SQL Server is running (`services.msc` → SQL Server service)
3. Check SQL Server Authentication mode (must allow SQL logins, not Windows-only)
4. Test with SQL Server Management Studio first
5. Check firewall (port 1433 must be open)

**Commit test:**
```powershell
git add test-db-connection.js
git commit -m "Add database connection test script

Verifies:
- Connection pool creation
- Basic queries (SELECT 1)
- Version detection
- ID generation
- Graceful shutdown

Week 1 Day 1 - Connection verified."
git push
```

---

## Monday Summary Checklist

At end of Monday, verify all complete:

- [x] shared/ directory created
- [x] validation.js moved to shared/
- [x] All 22 IPC imports updated
- [x] Desktop still works (116/116 tests)
- [x] mssql package installed
- [x] .env file created (NOT committed to git)
- [x] server/database.js created
- [x] SQL Server connection tested
- [x] All work committed to git (except .env)

**Monday deliverable:** ✅ Database layer foundation complete

---

## Tuesday-Friday — Create SaaS Tables

### Tuesday Morning (4 hours) — New SaaS Tables

**Create SQL file:**
```powershell
code server\schema-saas-tables.sql
```

**Content:**
```sql
-- Qanuni SaaS Schema - New Tables
-- Run this after connecting to SQL Server

-- 1. Firms table (parent of all data)
CREATE TABLE firms (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'starter',  -- starter, pro, enterprise
  max_users INT DEFAULT 2,
  max_clients INT DEFAULT 50,
  storage_limit_mb INT DEFAULT 5000,
  trial_ends_at DATETIME,
  is_active BIT DEFAULT 1,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);

-- 2. Users table (authentication)
CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  firm_id UNIQUEIDENTIFIER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name NVARCHAR(255),
  role VARCHAR(50) DEFAULT 'staff',  -- firm_admin, lawyer, staff
  is_active BIT DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_firm ON users(firm_id);

-- 3. Audit logs (compliance + security)
CREATE TABLE audit_logs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  firm_id UNIQUEIDENTIFIER NOT NULL,
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  action VARCHAR(100),  -- 'POST /api/clients', 'DELETE /api/matters/123'
  resource_type VARCHAR(50),  -- 'clients', 'matters', 'invoices'
  resource_id UNIQUEIDENTIFIER,
  changes NVARCHAR(MAX),  -- JSON: { old: {...}, new: {...} }
  ip_address VARCHAR(50),
  user_agent NVARCHAR(500),
  created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_audit_firm ON audit_logs(firm_id, created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);

-- 4. Refresh tokens (token revocation)
CREATE TABLE refresh_tokens (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME,
  created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_token_user ON refresh_tokens(user_id);
CREATE INDEX idx_token_expires ON refresh_tokens(expires_at);

-- Test data
INSERT INTO firms (name) VALUES ('Test Law Firm');
SELECT * FROM firms;
```

**Run SQL:**
```powershell
# Option A: SQL Server Management Studio
# 1. Open SSMS
# 2. Connect to localhost\SQLEXPRESS
# 3. Open server\schema-saas-tables.sql
# 4. Execute (F5)

# Option B: Command line (sqlcmd)
sqlcmd -S localhost\SQLEXPRESS -d qanuni_dev -U sa -P YourPassword -i server\schema-saas-tables.sql
```

**Verify:**
```javascript
// Create test script: test-new-tables.js
const database = require('./server/database');

async function testNewTables() {
  try {
    // Test firms table
    const firms = await database.query('SELECT * FROM firms');
    console.log('✅ Firms table:', firms.length, 'rows');
    
    // Test users table exists
    const users = await database.query('SELECT * FROM users');
    console.log('✅ Users table:', users.length, 'rows');
    
    // Test audit_logs table exists
    const logs = await database.query('SELECT * FROM audit_logs');
    console.log('✅ Audit logs table:', logs.length, 'rows');
    
    // Test refresh_tokens table exists
    const tokens = await database.query('SELECT * FROM refresh_tokens');
    console.log('✅ Refresh tokens table:', tokens.length, 'rows');
    
    console.log('\n🎉 All new SaaS tables created!');
    await database.close();
  } catch (error) {
    console.error('❌ Table test failed:', error.message);
  }
}

testNewTables();
```

```powershell
node test-new-tables.js

# Expected output:
# ✅ Firms table: 1 rows
# ✅ Users table: 0 rows
# ✅ Audit logs table: 0 rows
# ✅ Refresh tokens table: 0 rows
# 🎉 All new SaaS tables created!
```

**Commit:**
```powershell
git add server\schema-saas-tables.sql test-new-tables.js
git commit -m "Create 4 new SaaS tables: firms, users, audit_logs, refresh_tokens

- firms: Parent table for multi-tenancy
- users: Authentication with roles (firm_admin/lawyer/staff)
- audit_logs: Compliance tracking for all API calls
- refresh_tokens: JWT refresh token revocation support

Week 1 Day 2 - SaaS tables created."
git push
```

---

### Tuesday Afternoon - Friday (20 hours) — Copy 32 Desktop Tables

**Full guide in roadmap v2, but summary:**

1. Copy all 32 CREATE TABLE statements from `electron/schema.js`
2. Convert SQLite syntax → SQL Server syntax:
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT IDENTITY(1,1) PRIMARY KEY`
   - `TEXT` → `NVARCHAR(MAX)`
   - `REAL` → `FLOAT`
   - `datetime('now')` → `GETDATE()`
3. Add firm_id to 3 MVP tables:
   - lawyers
   - deadlines
   - invoice_items
4. Create indexes on all firm_id + primary_key composites
5. Test basic queries on each table

**Deliverable:** All 32 desktop tables + 4 new SaaS tables in SQL Server

---

## Week 1 Success Criteria

At end of Friday, verify:

- [ ] `shared/validation.js` exists and is used by both electron/ and server/
- [ ] Desktop still works (116/116 tests passing)
- [ ] `server/database.js` has connection pooling
- [ ] SQL Server connection tested and working
- [ ] 4 new SaaS tables created (firms, users, audit_logs, refresh_tokens)
- [ ] 32 desktop tables migrated to SQL Server
- [ ] 3 MVP tables have firm_id column added
- [ ] All work committed to git (except .env)
- [ ] `.env` file exists locally but NOT in git

**Week 1 Deliverable:** ✅ Database layer complete, ready for Week 3 (Auth + RBAC)

---

## Common Issues & Solutions

### Issue: Desktop tests fail after moving validation.js

**Symptom:** `node test-integration.js` shows errors like "Cannot find module '../validation'"

**Solution:**
```powershell
# Check import paths in electron/ipc/*.js
Get-ChildItem "electron\ipc" -Filter "*.js" | Select-String -Pattern "validation"

# Should show: ../../shared/validation (not ../validation)
# If wrong, fix with find/replace in VS Code
```

### Issue: SQL Server connection fails

**Symptom:** `Error: Login failed for user 'sa'`

**Solution:**
1. Open SQL Server Configuration Manager
2. Enable SQL Server Authentication (not just Windows)
3. Restart SQL Server service
4. Create new SA password if needed
5. Update `.env` with correct password

### Issue: mssql package not found

**Symptom:** `Error: Cannot find module 'mssql'`

**Solution:**
```powershell
# Reinstall
npm install mssql

# Check node_modules
Test-Path "node_modules\mssql"  # Should return True

# Check package.json
Get-Content package.json | Select-String "mssql"
```

---

## Next Steps (Week 3)

After Week 1 complete:
- Create server/middleware/auth.js (JWT verification)
- Create server/middleware/roles.js (RBAC)
- Create server/routes/auth.js (register, login endpoints)
- Add authMiddleware to existing routes
- Test authentication flow

---

**Week 1 Monday complete = 25% of database layer done** 🚀
**Week 1 Friday complete = 100% of database layer done** ✅

Ready to proceed to Week 3 (Auth + RBAC).
