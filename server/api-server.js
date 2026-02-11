/**
 * Qanuni REST API Server - WITH CLIENTS MODULE
 * Version: v48.2-session1
 * 
 * Updated after clients module refactoring
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import backend modules
const database = require('../electron/database');
const logging = require('../electron/logging');
const { createTables, seedLookupData } = require('../electron/schema');
const migrations = require('../electron/migrations');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logging.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  next();
});

// Initialize database for web mode
async function initDatabase() {
  const webDbPath = path.join(__dirname, '..', 'qanuni-web.db');
  await database.init({ dbPath: webDbPath });

  // Create tables if this is a fresh database
  const tableCheck = database.queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'");
  if (!tableCheck) {
    logging.info('Fresh database — creating tables and seeding lookup data');
    createTables(database);
    seedLookupData(database);
    database.saveToDisk();
  }

  // Run pending migrations
  const migrationResult = migrations.runAll(database);
  if (migrationResult.applied > 0) {
    logging.info('Migrations applied', migrationResult);
    database.saveToDisk();
  }

  console.log('Database initialized:', webDbPath);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v48.2',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Clients routes
app.use('/api/clients', require('./routes/clients'));

// Matters routes
app.use('/api/matters', require('./routes/matters'));

// Hearings routes
app.use('/api/hearings', require('./routes/hearings'));

// Tasks routes
app.use('/api/tasks', require('./routes/tasks'));

// Timesheets routes
app.use('/api/timesheets', require('./routes/timesheets'));

// Expenses routes
app.use('/api/expenses', require('./routes/expenses'));

// Advances routes
app.use('/api/advances', require('./routes/advances'));

// Invoices routes
app.use('/api/invoices', require('./routes/invoices'));

// Judgments routes
app.use('/api/judgments', require('./routes/judgments'));

// Appointments routes
app.use('/api/appointments', require('./routes/appointments'));

// Deadlines routes
app.use('/api/deadlines', require('./routes/deadlines'));

// Diary routes
app.use('/api/diary', require('./routes/diary'));

// Lawyers routes
app.use('/api/lawyers', require('./routes/lawyers'));

// Lookups routes
app.use('/api/lookups', require('./routes/lookups'));

// Conflict Check routes
const conflictCheckRoutes = require('./routes/conflict-check');
app.use('/api/conflict-check', conflictCheckRoutes);

// Settings routes
app.use('/api/settings', require('./routes/settings'));

// Client Imports routes
app.use('/api/client-imports', require('./routes/client-imports'));

// Corporate Secretary routes
app.use('/api/corporate', require('./routes/corporate'));

// Reports routes (data-only; PDF/Excel exports are Electron-only)
app.use('/api/reports', require('./routes/reports'));

// Trash routes
app.use('/api/trash', require('./routes/trash'));

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Error handling middleware
app.use((err, req, res, next) => {
  logging.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// ============================================================================
// START SERVER
// ============================================================================

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\nQanuni REST API Server`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`\nAvailable endpoints:`);
    console.log(`   GET    /api/clients`);
    console.log(`   GET    /api/clients/:id`);
    console.log(`   POST   /api/clients`);
    console.log(`   PUT    /api/clients/:id`);
    console.log(`   DELETE /api/clients/:id`);
    console.log(`   GET    /api/matters`);
    console.log(`   GET    /api/matters/:id`);
    console.log(`   POST   /api/matters`);
    console.log(`   PUT    /api/matters/:id`);
    console.log(`   DELETE /api/matters/:id`);
    console.log(`   GET    /api/matters/:id/related`);
    console.log(`   POST   /api/matters/check-file-number`);
    console.log(`   GET    /api/hearings`);
    console.log(`   POST   /api/hearings`);
    console.log(`   PUT    /api/hearings/:id`);
    console.log(`   DELETE /api/hearings/:id`);
    console.log(`   GET    /api/tasks`);
    console.log(`   POST   /api/tasks`);
    console.log(`   PUT    /api/tasks/:id`);
    console.log(`   DELETE /api/tasks/:id`);
    console.log(`   GET    /api/timesheets`);
    console.log(`   GET    /api/timesheets/unbilled`);
    console.log(`   POST   /api/timesheets`);
    console.log(`   PUT    /api/timesheets/:id`);
    console.log(`   DELETE /api/timesheets/:id`);
    console.log(`   GET    /api/expenses`);
    console.log(`   GET    /api/expenses/unbilled`);
    console.log(`   POST   /api/expenses`);
    console.log(`   POST   /api/expenses/batch`);
    console.log(`   PUT    /api/expenses/:id`);
    console.log(`   DELETE /api/expenses/:id`);
    console.log(`   GET    /api/advances`);
    console.log(`   GET    /api/advances/client-expense-advance`);
    console.log(`   GET    /api/advances/client-retainer`);
    console.log(`   GET    /api/advances/lawyer-advance`);
    console.log(`   POST   /api/advances`);
    console.log(`   PUT    /api/advances/:id`);
    console.log(`   DELETE /api/advances/:id`);
    console.log(`   POST   /api/advances/deduct`);
    console.log(`   POST   /api/advances/deduct-retainer`);
    console.log(`   POST   /api/advances/expense-with-deduction`);
    console.log(`   GET    /api/invoices`);
    console.log(`   GET    /api/invoices/generate-number`);
    console.log(`   GET    /api/invoices/:id`);
    console.log(`   GET    /api/invoices/:id/items`);
    console.log(`   POST   /api/invoices`);
    console.log(`   PUT    /api/invoices/:id/status`);
    console.log(`   DELETE /api/invoices/:id`);
    console.log(`   GET    /api/judgments`);
    console.log(`   POST   /api/judgments`);
    console.log(`   PUT    /api/judgments/:id`);
    console.log(`   DELETE /api/judgments/:id`);
    console.log(`   GET    /api/appointments`);
    console.log(`   POST   /api/appointments`);
    console.log(`   PUT    /api/appointments/:id`);
    console.log(`   DELETE /api/appointments/:id`);
    console.log(`\nLogs: See electron/logs/\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  database.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  database.close();
  process.exit(0);
});
