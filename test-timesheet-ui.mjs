import { createRequire } from 'module';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { env } from 'process';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

// Electron userData path on Windows: %APPDATA%/qanuni
const appDataPath = env.APPDATA || join(env.USERPROFILE, 'AppData', 'Roaming');
const dbPath = join(appDataPath, 'qanuni', 'qanuni.db');

function queryAll(db, sql) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function run() {
  const SQL = await initSqlJs();

  console.log(`\nDatabase path: ${dbPath}`);
  if (!existsSync(dbPath)) {
    console.log('ERROR: Database file not found at this path.');
    console.log('Is the Electron app installed/run at least once?');
    process.exit(1);
  }

  console.log('\n=== BEFORE TEST ===');
  const fileBuffer = readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const clients = queryAll(db, 'SELECT client_id, client_name FROM clients');
  const matters = queryAll(db, 'SELECT matter_id, matter_name FROM matters');
  const lawyers = queryAll(db, 'SELECT lawyer_id, name FROM lawyers');
  const timesheets = queryAll(db, 'SELECT * FROM timesheets WHERE deleted_at IS NULL');

  console.log(`Clients: ${clients.length}`);
  console.log(`Matters: ${matters.length}`);
  console.log(`Lawyers: ${lawyers.length}`);
  console.log(`Timesheets BEFORE: ${timesheets.length}`);

  if (timesheets.length > 0) {
    console.log('\nExisting timesheets:');
    timesheets.forEach(ts => {
      console.log(`  - ID: ${ts.timesheet_id}, Lawyer: ${ts.lawyer_id}, Minutes: ${ts.minutes}, Narrative: ${ts.narrative}`);
    });
  }

  db.close();

  console.log('\n=== NOW TEST IN APP ===');
  console.log('1. Open Qanuni app (npm run dev)');
  console.log('2. Go to Timesheets tab');
  console.log('3. Add timesheet with narrative "Final test"');
  console.log('4. After saving, press Enter here...\n');

  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('\n=== AFTER TEST ===');
  const fileBuffer2 = readFileSync(dbPath);
  const db2 = new SQL.Database(fileBuffer2);
  const timesheets2 = queryAll(db2, 'SELECT * FROM timesheets WHERE deleted_at IS NULL');
  console.log(`Timesheets AFTER: ${timesheets2.length}`);

  if (timesheets2.length > timesheets.length) {
    console.log('✅ NEW TIMESHEET SAVED!');
    const newTs = timesheets2[timesheets2.length - 1];
    console.log(JSON.stringify(newTs, null, 2));
  } else {
    console.log('❌ NO NEW TIMESHEET FOUND');
    console.log('Possible causes:');
    console.log('  - Save failed silently (check app console for errors)');
    console.log('  - The Electron app has the DB locked in memory and hasn\'t flushed to disk yet');
  }

  db2.close();
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
