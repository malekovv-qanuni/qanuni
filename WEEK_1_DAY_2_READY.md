# Week 1 Day 2 Implementation Guide - First REST Endpoint

**Goal:** Create Express server with health check endpoint  
**Duration:** 4 hours  
**Prerequisites:** Week 1 Day 1 complete (shared/, server/database.js, SQL Server working)

---

## Pre-Session Verification (5 minutes)

```powershell
# 1. Verify desktop still works
cd C:\Projects\qanuni
node test-integration.js
# Expected: 118/118 passing

# 2. Verify SQL Server connection
node test-mssql-connection.js
# Expected: 3/3 passing

# 3. Check git status
git status
# Should be clean or known uncommitted docs
```

**If any test fails, STOP and fix before proceeding.**

---

## Phase 1: Install Express + Packages (30 minutes)

### Step 1: Install Core Packages

```powershell
npm install express cors body-parser jsonwebtoken bcryptjs
npm install --save-dev nodemon
```

**Packages explained:**
- `express` - Web framework
- `cors` - Cross-Origin Resource Sharing (for React frontend)
- `body-parser` - Parse JSON request bodies
- `jsonwebtoken` - JWT token creation/verification
- `bcryptjs` - Password hashing (for Week 1 Day 3)
- `nodemon` - Auto-restart server on file changes (dev only)

### Step 2: Add npm Scripts

**Implementation Plan for Claude Code Chat:**

**Task:** Add server scripts to package.json

**File:** `package.json`

**Add to "scripts" section:**
```json
{
  "scripts": {
    "dev": "electron .",
    "dev:test": "electron . --test-db",
    "dist:clean": "electron-builder --dir",
    "dist": "electron-builder",
    "server": "nodemon server/index.js",
    "server:prod": "node server/index.js"
  }
}
```

**After Claude Code Chat completes:**
```powershell
git add package.json package-lock.json
git commit -m "Add Express and server dependencies"
```

---

## Phase 2: Create Express Server (1.5 hours)

### Step 1: Create server/index.js

**Implementation Plan for Claude Code Chat:**

**Task:** Create Express server entry point

**Create file:** `C:\Projects\qanuni\server\index.js`

**Specifications:**

```javascript
/**
 * Qanuni SaaS - Express Server
 * 
 * Main server entry point for REST API.
 * Connects to SQL Server via server/database.js
 * 
 * @version 1.0.0 (Week 1 Day 2)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Health check endpoint (root)
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await database.execute('SELECT 1 AS test');
    
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Qanuni SaaS server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});
```

**Success Criteria:**
- File created at `C:\Projects\qanuni\server\index.js`
- Uses Express, CORS, body-parser
- Imports server/database.js
- Has /health endpoint with database check
- Has request logging middleware
- Has error handlers
- Graceful shutdown implemented

---

### Step 2: Create server/routes/ Directory

```powershell
New-Item -Path "C:\Projects\qanuni\server\routes" -ItemType Directory -Force
```

---

### Step 3: Create server/routes/auth.js

**Implementation Plan for Claude Code Chat:**

**Task:** Create auth routes module (health check only for now)

**Create file:** `C:\Projects\qanuni\server\routes/auth.js`

**Specifications:**

```javascript
/**
 * Qanuni SaaS - Authentication Routes
 * 
 * Handles login, registration, token refresh.
 * Week 1 Day 2: Just a placeholder endpoint
 * Week 1 Day 3: Full auth implementation
 * 
 * @version 1.0.0 (Week 1 Day 2)
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/auth/test
 * Simple test endpoint to verify routing works
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/register
 * User registration (Week 1 Day 3)
 */
router.post('/register', (req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'Registration endpoint will be implemented in Week 1 Day 3'
  });
});

/**
 * POST /api/auth/login
 * User login (Week 1 Day 3)
 */
router.post('/login', (req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'Login endpoint will be implemented in Week 1 Day 3'
  });
});

module.exports = router;
```

**Success Criteria:**
- File created at `C:\Projects\qanuni\server/routes/auth.js`
- Exports Express router
- Has /test endpoint (working)
- Has /register stub (501 response)
- Has /login stub (501 response)

---

## Phase 3: Test Server (1 hour)

### Step 1: Start Server

```powershell
# Start server with nodemon (auto-restart on changes)
npm run server
```

**Expected output:**
```
🚀 Qanuni SaaS server running on port 3001
📊 Environment: development
🔗 Health check: http://localhost:3001/health
```

**If errors:**
- Check .env file exists and has correct values
- Verify SQL Server is running: `Get-Service MSSQL$SQLEXPRESS`
- Check port 3001 not already in use

---

### Step 2: Test Health Endpoint

**Open new PowerShell window (keep server running):**

```powershell
# Test health check
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-14T...",
  "environment": "development"
}
```

**If "database": "disconnected":**
- Run `node test-mssql-connection.js` to debug
- Check SQL Server service running
- Verify .env DB_SERVER setting

---

### Step 3: Test Auth Routes

```powershell
# Test auth test endpoint
curl http://localhost:3001/api/auth/test

# Expected:
# {"message":"Auth routes working","timestamp":"..."}

# Test login stub
curl -X POST http://localhost:3001/api/auth/login

# Expected:
# {"error":"Not implemented yet","message":"..."}
```

---

### Step 4: Test 404 Handler

```powershell
# Test non-existent route
curl http://localhost:3001/api/nonexistent

# Expected:
# {"error":"Not Found","path":"/api/nonexistent","method":"GET"}
```

---

## Phase 4: Verify Desktop Still Works (15 minutes)

**CRITICAL: Desktop must still work after adding server code.**

```powershell
# Stop server (Ctrl+C in server window)

# Test desktop integration tests
node test-integration.js

# Expected: 118/118 passing
```

**If tests fail:**
- Check if shared/validation.js was modified
- Verify electron/ipc/ files still import correctly
- Review git diff to see what changed

---

## Phase 5: Commit (15 minutes)

```powershell
# Verify changes
git status

# Expected changes:
# - package.json (new scripts + dependencies)
# - package-lock.json (dependency tree)
# - server/index.js (new)
# - server/routes/auth.js (new)

# Stage changes
git add package.json package-lock.json server/

# Commit
git commit -m "Add Express server with health check endpoint

- Install express, cors, body-parser, jwt, bcrypt
- Create server/index.js with health check endpoint
- Create server/routes/auth.js with placeholder endpoints
- Add npm scripts: server, server:prod
- Tested: /health returns database status
- Desktop tests: 118/118 still passing"

# Push
git push
```

---

## Success Criteria Checklist

### ✅ Complete When:
- [ ] Express + dependencies installed
- [ ] npm scripts added (server, server:prod)
- [ ] server/index.js created and working
- [ ] server/routes/auth.js created with test endpoint
- [ ] Server starts without errors
- [ ] GET /health returns database connected
- [ ] GET /api/auth/test returns success
- [ ] POST /api/auth/login returns 501 (not implemented)
- [ ] GET /nonexistent returns 404
- [ ] Desktop tests still pass (118/118)
- [ ] All changes committed and pushed

---

## Troubleshooting

### Issue: Port 3001 already in use
**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env
# Add: PORT=3002
```

### Issue: Cannot find module 'express'
**Solution:**
```powershell
# Reinstall dependencies
npm install

# Or manually
npm install express cors body-parser
```

### Issue: Database disconnected in /health
**Solution:**
```powershell
# Test SQL Server connection
node test-mssql-connection.js

# Check SQL Server service
Get-Service MSSQL$SQLEXPRESS

# Restart if stopped
Restart-Service MSSQL$SQLEXPRESS
```

### Issue: CORS errors (Week 2+)
**Already handled in server/index.js with:**
```javascript
app.use(cors());
```

### Issue: nodemon not found
**Solution:**
```powershell
# Install globally (optional)
npm install -g nodemon

# Or use npx
npx nodemon server/index.js
```

---

## Week 1 Day 2 Deliverables

### Files Created
```
server/index.js              # Express server entry point
server/routes/auth.js        # Auth routes (placeholders)
```

### Files Modified
```
package.json                 # New scripts + dependencies
package-lock.json            # Dependency tree
```

### Tests Verified
```
✅ npm run server            # Server starts
✅ GET /health               # Database connected
✅ GET /api/auth/test        # Auth routes working
✅ node test-integration.js  # Desktop: 118/118
```

---

## Next Session Prep (Week 1 Day 3)

### Goals for Day 3 (6 hours)
1. Create server/middleware/auth.js (JWT verification)
2. Create server/middleware/validate.js (request validation)
3. Implement POST /api/auth/register (user registration)
4. Implement POST /api/auth/login (user authentication)
5. Test authentication flow with JWT tokens

### Required for Day 3
- User registration working
- JWT tokens generated on login
- Protected endpoints require valid token
- Password hashing with bcrypt

### Files to Create (Day 3)
- server/middleware/auth.js
- server/middleware/validate.js
- Update server/routes/auth.js (full implementation)

---

## Common Questions

**Q: Why port 3001 instead of 3000?**  
A: Port 3000 commonly used by React dev server. 3001 avoids conflicts.

**Q: Why nodemon for development?**  
A: Auto-restarts server when files change. Saves manual restarts during dev.

**Q: Why separate server/ from electron/?**  
A: Clean separation: Desktop (electron/) vs SaaS (server/). Shared code in shared/.

**Q: Can I test with Postman instead of curl?**  
A: Yes! Use Thunder Client (VS Code extension) or Postman. Same endpoints.

**Q: Why 501 for /login and /register?**  
A: HTTP 501 = "Not Implemented". More accurate than 404 for planned endpoints.

---

## Quick Reference

### Start Server
```powershell
npm run server              # Development (auto-restart)
npm run server:prod         # Production (no auto-restart)
```

### Test Endpoints
```powershell
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/test
```

### Stop Server
Press `Ctrl+C` in server window

### Check Logs
Server logs appear in same window where you ran `npm run server`

---

**End of Week 1 Day 2 Guide**

**Total Time:** ~4 hours  
**Week 1 Progress:** 50% complete (Day 2 of 4)  
**Next:** Week 1 Day 3 - Authentication implementation
