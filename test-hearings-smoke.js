/**
 * Hearings CRUD Smoke Tests
 * Run: node test-hearings-smoke.js
 * Requires: server running on localhost:3001
 */

require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3001';
let TOKEN = '';
let MATTER_ID = null;
let HEARING_ID = null;
let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    if (TOKEN) options.headers['Authorization'] = 'Bearer ' + TOKEN;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + name);
  } else {
    failed++;
    console.log('  FAIL: ' + name + (detail ? ' - ' + detail : ''));
  }
}

async function run() {
  console.log('=== Hearings CRUD Smoke Tests ===\n');

  // Login first
  console.log('Setup: Logging in...');
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@testfirm.com',
    password: 'Test1234!'
  });

  if (login.status === 200) {
    TOKEN = login.body.token;
    console.log('Logged in successfully.');
  } else {
    console.log('Login failed (' + login.status + '), registering test user...');
    const reg = await request('POST', '/api/auth/register', {
      firm_name: 'Test Law Firm',
      admin_name: 'Admin User',
      email: 'admin@testfirm.com',
      password: 'Test1234!'
    });
    if (reg.status === 201) {
      TOKEN = reg.body.token;
      console.log('Registered and got token.');
    } else {
      console.log('Register failed:', reg.status, JSON.stringify(reg.body));
      process.exit(1);
    }
  }

  // Setup: Create a matter for hearing tests
  console.log('\nSetup: Creating test matter...');
  const matterRes = await request('POST', '/api/matters', {
    matter_number: 'HRG-TEST-' + Date.now(),
    matter_name: 'Hearing Test Matter'
  });
  if (matterRes.status === 201) {
    MATTER_ID = matterRes.body.matter_id;
    console.log('Created test matter_id:', MATTER_ID);
  } else {
    console.log('Failed to create test matter:', matterRes.status, JSON.stringify(matterRes.body));
    process.exit(1);
  }

  // ==================== Test 1: Create hearing with minimal fields ====================
  console.log('\nTest 1: Create hearing with minimal fields (matter_id + hearing_date)');
  const t1 = await request('POST', '/api/hearings', {
    matter_id: MATTER_ID,
    hearing_date: '2026-03-15'
  });
  assert('Status 201', t1.status === 201, 'Got ' + t1.status);
  assert('Has hearing_id', t1.body.hearing && t1.body.hearing.hearing_id != null);
  assert('hearing_date matches', t1.body.hearing && t1.body.hearing.hearing_date && t1.body.hearing.hearing_date.startsWith('2026-03-15'));
  assert('matter_id matches', t1.body.hearing && t1.body.hearing.matter_id === MATTER_ID);
  assert('outcome defaults to pending', t1.body.hearing && t1.body.hearing.outcome === 'pending');
  assert('reminder_days defaults to 7', t1.body.hearing && t1.body.hearing.reminder_days === 7);
  HEARING_ID = t1.body.hearing ? t1.body.hearing.hearing_id : null;
  console.log('  Created hearing_id:', HEARING_ID);

  // ==================== Test 2: Create hearing with full details ====================
  console.log('\nTest 2: Create hearing with full details');
  const t2 = await request('POST', '/api/hearings', {
    matter_id: MATTER_ID,
    hearing_date: '2026-04-20',
    hearing_time: '09:30',
    hearing_type: 'trial',
    court_name: 'Beirut Court of Appeal',
    court_room: 'Room 4B',
    judge_name: 'Judge Ahmad Khalil',
    outcome: 'pending',
    outcome_notes: 'Initial trial hearing scheduled',
    next_hearing_date: '2026-05-10',
    reminder_days: 14
  });
  assert('Status 201', t2.status === 201, 'Got ' + t2.status);
  assert('court_name saved', t2.body.hearing && t2.body.hearing.court_name === 'Beirut Court of Appeal');
  assert('judge_name saved', t2.body.hearing && t2.body.hearing.judge_name === 'Judge Ahmad Khalil');
  assert('hearing_type is trial', t2.body.hearing && t2.body.hearing.hearing_type === 'trial');
  assert('court_room saved', t2.body.hearing && t2.body.hearing.court_room === 'Room 4B');
  assert('reminder_days is 14', t2.body.hearing && t2.body.hearing.reminder_days === 14);
  const HEARING_ID_2 = t2.body.hearing ? t2.body.hearing.hearing_id : null;

  // ==================== Test 3: Invalid matter_id returns 404 ====================
  console.log('\nTest 3: Invalid matter_id returns 404');
  const t3 = await request('POST', '/api/hearings', {
    matter_id: 999999,
    hearing_date: '2026-06-01'
  });
  assert('Status 404', t3.status === 404, 'Got ' + t3.status);
  assert('Error mentions Matter not found', t3.body.error && t3.body.error.includes('Matter not found'));

  // ==================== Test 4: List hearings with matter_id filter ====================
  console.log('\nTest 4: List hearings with matter_id filter');
  const t4all = await request('GET', '/api/hearings');
  assert('List returns array', t4all.body.hearings && Array.isArray(t4all.body.hearings));
  assert('Count >= 2', t4all.body.count >= 2, 'Got count ' + t4all.body.count);
  assert('Includes matter_name', t4all.body.hearings[0] && t4all.body.hearings[0].matter_name != null);

  const t4filter = await request('GET', '/api/hearings?matter_id=' + MATTER_ID);
  assert('Filtered count matches', t4filter.body.count >= 2, 'Got ' + t4filter.body.count);
  assert('All hearings belong to matter', t4filter.body.hearings && t4filter.body.hearings.every(h => h.matter_id === MATTER_ID));

  // ==================== Test 5: List hearings with date range filter ====================
  console.log('\nTest 5: List hearings with date range filter');
  const t5 = await request('GET', '/api/hearings?start_date=2026-04-01&end_date=2026-04-30');
  assert('Date filter returns results', t5.body.hearings && Array.isArray(t5.body.hearings));
  assert('All in range (April)', t5.body.hearings && t5.body.hearings.every(h => {
    const d = h.hearing_date.substring(0, 10);
    return d >= '2026-04-01' && d <= '2026-04-30';
  }));

  // ==================== Test 6: Update hearing outcome and notes ====================
  console.log('\nTest 6: Update hearing outcome and notes');
  const t6 = await request('PUT', '/api/hearings/' + HEARING_ID, {
    matter_id: MATTER_ID,
    hearing_date: '2026-03-15',
    outcome: 'continued',
    outcome_notes: 'Postponed to next month',
    next_hearing_date: '2026-04-15'
  });
  assert('Status 200', t6.status === 200, 'Got ' + t6.status);
  assert('Outcome updated to continued', t6.body.hearing && t6.body.hearing.outcome === 'continued');
  assert('next_hearing_date set', t6.body.hearing && t6.body.hearing.next_hearing_date && t6.body.hearing.next_hearing_date.startsWith('2026-04-15'));

  // ==================== Test 7: Soft delete hearing ====================
  console.log('\nTest 7: Soft delete hearing');
  const t7 = await request('DELETE', '/api/hearings/' + HEARING_ID);
  assert('Status 200', t7.status === 200, 'Got ' + t7.status);
  assert('Success message', t7.body.message === 'Hearing deleted successfully');

  // Verify deleted hearing not in list
  const t7list = await request('GET', '/api/hearings');
  const deletedInList = t7list.body.hearings.find(h => h.hearing_id === HEARING_ID);
  assert('Deleted hearing not in list', !deletedInList);

  // Verify GET /:id returns 404
  const t7get = await request('GET', '/api/hearings/' + HEARING_ID);
  assert('GET deleted hearing returns 404', t7get.status === 404, 'Got ' + t7get.status);

  // Cleanup: delete remaining test hearings
  console.log('\nCleanup...');
  const allHearings = await request('GET', '/api/hearings');
  for (const h of allHearings.body.hearings) {
    await request('DELETE', '/api/hearings/' + h.hearing_id);
  }
  console.log('  Cleaned up ' + allHearings.body.count + ' test hearings');

  // Cleanup: delete test matter
  if (MATTER_ID) {
    await request('DELETE', '/api/matters/' + MATTER_ID);
    console.log('  Cleaned up test matter');
  }

  // Summary
  console.log('\n============================================');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('============================================');
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
