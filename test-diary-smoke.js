/**
 * Diary CRUD Smoke Tests
 * Run: node test-diary-smoke.js
 * Requires: server running on localhost:3001
 */

require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3001';
let TOKEN = '';
let MATTER_ID = null;
let DIARY_ID = null;
let DIARY_ID_2 = null;
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
  console.log('=== Diary CRUD Smoke Tests ===\n');

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

  // Setup: Create a matter for diary tests
  console.log('\nSetup: Creating test matter...');
  const matterRes = await request('POST', '/api/matters', {
    matter_number: 'DRY-TEST-' + Date.now(),
    matter_name: 'Diary Test Matter'
  });
  if (matterRes.status === 201) {
    MATTER_ID = matterRes.body.matter_id;
    console.log('Created test matter_id:', MATTER_ID);
  } else {
    console.log('Failed to create test matter:', matterRes.status, JSON.stringify(matterRes.body));
    process.exit(1);
  }

  // ==================== Test 1: Create diary entry with minimal fields ====================
  console.log('\nTest 1: Create diary entry with minimal fields (note type, no description)');
  const t1 = await request('POST', '/api/diary', {
    matter_id: MATTER_ID,
    entry_date: '2026-02-14',
    entry_type: 'note',
    title: 'Minimal diary entry'
  });
  assert('Status 201', t1.status === 201, 'Got ' + t1.status);
  assert('Has diary_id', t1.body.diary && t1.body.diary.diary_id != null);
  assert('entry_date matches', t1.body.diary && t1.body.diary.entry_date && t1.body.diary.entry_date.startsWith('2026-02-14'));
  assert('matter_id matches', t1.body.diary && t1.body.diary.matter_id === MATTER_ID);
  assert('entry_type is note', t1.body.diary && t1.body.diary.entry_type === 'note');
  DIARY_ID = t1.body.diary ? t1.body.diary.diary_id : null;
  console.log('  Created diary_id:', DIARY_ID);

  // ==================== Test 2: Create diary entry with full details ====================
  console.log('\nTest 2: Create diary entry with full details (call type)');
  const t2 = await request('POST', '/api/diary', {
    matter_id: MATTER_ID,
    entry_date: '2026-02-15',
    entry_type: 'call',
    title: 'Client phone call',
    description: 'Discussed settlement options with client'
  });
  assert('Status 201', t2.status === 201, 'Got ' + t2.status);
  assert('title saved', t2.body.diary && t2.body.diary.title === 'Client phone call');
  assert('entry_type is call', t2.body.diary && t2.body.diary.entry_type === 'call');
  assert('description saved', t2.body.diary && t2.body.diary.description === 'Discussed settlement options with client');
  DIARY_ID_2 = t2.body.diary ? t2.body.diary.diary_id : null;

  // ==================== Test 3: Create diary entry (meeting type) ====================
  console.log('\nTest 3: Create diary entry (meeting type)');
  const t3 = await request('POST', '/api/diary', {
    matter_id: MATTER_ID,
    entry_date: '2026-02-16',
    entry_type: 'meeting',
    title: 'Strategy meeting',
    description: 'Prepared case strategy for upcoming hearing'
  });
  assert('Status 201', t3.status === 201, 'Got ' + t3.status);
  assert('entry_type is meeting', t3.body.diary && t3.body.diary.entry_type === 'meeting');

  // ==================== Test 4: Invalid matter_id returns 404 ====================
  console.log('\nTest 4: Invalid matter_id returns 404');
  const t4 = await request('POST', '/api/diary', {
    matter_id: 999999,
    entry_date: '2026-02-14',
    entry_type: 'note',
    title: 'Should fail'
  });
  assert('Status 404', t4.status === 404, 'Got ' + t4.status);
  assert('Error mentions Matter not found', t4.body.error && t4.body.error.includes('Matter not found'));

  // ==================== Test 5: Invalid entry_type returns 400 ====================
  console.log('\nTest 5: Invalid entry_type returns 400');
  const t5 = await request('POST', '/api/diary', {
    matter_id: MATTER_ID,
    entry_date: '2026-02-14',
    entry_type: 'invalid_type',
    title: 'Should fail validation'
  });
  assert('Status 400', t5.status === 400, 'Got ' + t5.status);
  assert('Has validation error', t5.body.error != null);

  // ==================== Test 6: List diary entries with matter_id filter ====================
  console.log('\nTest 6: List diary entries with matter_id filter');
  const t6all = await request('GET', '/api/diary');
  assert('List returns array', t6all.body.data && Array.isArray(t6all.body.data));
  assert('Has pagination', t6all.body.pagination != null);
  assert('Count >= 3', t6all.body.pagination.total >= 3, 'Got count ' + t6all.body.pagination.total);
  assert('Includes matter_name', t6all.body.data[0] && t6all.body.data[0].matter_name != null);

  const t6filter = await request('GET', '/api/diary?matter_id=' + MATTER_ID);
  assert('Filtered count matches', t6filter.body.pagination.total >= 3, 'Got ' + t6filter.body.pagination.total);
  assert('All entries belong to matter', t6filter.body.data && t6filter.body.data.every(e => e.matter_id === MATTER_ID));

  // ==================== Test 7: List diary entries with date range filter ====================
  console.log('\nTest 7: List diary entries with date range filter');
  const t7 = await request('GET', '/api/diary?start_date=2026-02-14&end_date=2026-02-15');
  assert('Date filter returns results', t7.body.data && Array.isArray(t7.body.data));
  assert('All in range (Feb 14-15)', t7.body.data && t7.body.data.every(e => {
    const d = e.entry_date.substring(0, 10);
    return d >= '2026-02-14' && d <= '2026-02-15';
  }));

  // ==================== Test 8: Get single diary entry ====================
  console.log('\nTest 8: Get single diary entry by ID');
  const t8 = await request('GET', '/api/diary/' + DIARY_ID);
  assert('Status 200', t8.status === 200, 'Got ' + t8.status);
  assert('Has diary object', t8.body.diary != null);
  assert('diary_id matches', t8.body.diary && t8.body.diary.diary_id === DIARY_ID);
  assert('Has created_by_name field', t8.body.diary && 'created_by_name' in t8.body.diary);

  // ==================== Test 9: Update diary entry ====================
  console.log('\nTest 9: Update diary entry');
  const t9 = await request('PUT', '/api/diary/' + DIARY_ID, {
    matter_id: MATTER_ID,
    entry_date: '2026-02-17',
    entry_type: 'meeting',
    title: 'Updated title',
    description: 'Updated description'
  });
  assert('Status 200', t9.status === 200, 'Got ' + t9.status);
  assert('Title updated', t9.body.diary && t9.body.diary.title === 'Updated title');
  assert('Entry type updated to meeting', t9.body.diary && t9.body.diary.entry_type === 'meeting');

  // ==================== Test 10: Search diary entries ====================
  console.log('\nTest 10: Search diary entries');
  const t10 = await request('GET', '/api/diary?search=settlement');
  assert('Search returns results', t10.body.data && t10.body.data.length >= 1);
  assert('Found matching entry', t10.body.data && t10.body.data.some(e => e.description && e.description.includes('settlement')));

  // ==================== Test 11: Soft delete diary entry ====================
  console.log('\nTest 11: Soft delete diary entry');
  const t11 = await request('DELETE', '/api/diary/' + DIARY_ID);
  assert('Status 200', t11.status === 200, 'Got ' + t11.status);
  assert('Success message', t11.body.message === 'Diary entry deleted successfully');

  // Verify deleted diary entry not in list
  const t11list = await request('GET', '/api/diary');
  const deletedInList = t11list.body.data.find(e => e.diary_id === DIARY_ID);
  assert('Deleted entry not in list', !deletedInList);

  // Verify GET /:id returns 404
  const t11get = await request('GET', '/api/diary/' + DIARY_ID);
  assert('GET deleted entry returns 404', t11get.status === 404, 'Got ' + t11get.status);

  // Cleanup: delete remaining test diary entries and matter
  console.log('\nCleanup...');
  const allDiary = await request('GET', '/api/diary');
  for (const e of allDiary.body.data) {
    await request('DELETE', '/api/diary/' + e.diary_id);
  }
  console.log('  Cleaned up ' + allDiary.body.pagination.total + ' test diary entries');

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
