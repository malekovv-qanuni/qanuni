/**
 * Lawyers CRUD Smoke Tests
 * Run: node test-lawyers-smoke.js
 * Requires: server running on localhost:3001
 */

require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3001';
let TOKEN = '';
let LAWYER_ID = null;
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
  console.log('=== Lawyers CRUD Smoke Tests ===\n');

  // Login first
  console.log('Setup: Logging in...');
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@testfirm.com',
    password: 'Test1234!'
  });

  if (login.status === 200) {
    TOKEN = login.body.token;
    console.log('Logged in successfully.\n');
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
      console.log('Registered and got token.\n');
    } else {
      console.log('Register failed:', reg.status, JSON.stringify(reg.body));
      process.exit(1);
    }
  }

  // Test 1: Create lawyer with minimal fields
  console.log('Test 1: Create lawyer with minimal fields (only full_name)');
  const t1 = await request('POST', '/api/lawyers', { full_name: 'Jane Doe' });
  assert('Status 201', t1.status === 201, 'Got ' + t1.status);
  assert('Has lawyer_id', t1.body.lawyer && t1.body.lawyer.lawyer_id != null);
  assert('Default role is associate', t1.body.lawyer && t1.body.lawyer.role === 'associate');
  assert('Default currency is USD', t1.body.lawyer && t1.body.lawyer.hourly_rate_currency === 'USD');
  LAWYER_ID = t1.body.lawyer ? t1.body.lawyer.lawyer_id : null;
  console.log('  Created lawyer_id:', LAWYER_ID);

  // Test 2: Create lawyer with full details
  console.log('\nTest 2: Create lawyer with full details');
  const t2 = await request('POST', '/api/lawyers', {
    full_name: 'Sarah Thompson',
    full_name_arabic: '\u0633\u0627\u0631\u0629 \u062a\u0648\u0645\u0628\u0633\u0648\u0646',
    email: 'sthompson@lawfirm.com',
    phone: '+961-1-234567',
    mobile: '+961-70-123456',
    role: 'partner',
    hourly_rate: 500.00,
    hourly_rate_currency: 'USD',
    hire_date: '2015-07-01',
    notes: 'Specializes in M&A transactions'
  });
  assert('Status 201', t2.status === 201, 'Got ' + t2.status);
  assert('Full name saved', t2.body.lawyer && t2.body.lawyer.full_name === 'Sarah Thompson');
  assert('Arabic name saved', t2.body.lawyer && t2.body.lawyer.full_name_arabic != null);
  assert('Role is partner', t2.body.lawyer && t2.body.lawyer.role === 'partner');
  assert('Hourly rate is 500', t2.body.lawyer && t2.body.lawyer.hourly_rate === 500);
  const LAWYER_ID_2 = t2.body.lawyer ? t2.body.lawyer.lawyer_id : null;

  // Test 3: Duplicate email prevention
  console.log('\nTest 3: Duplicate email prevention');
  const t3 = await request('POST', '/api/lawyers', {
    full_name: 'Another Lawyer',
    email: 'sthompson@lawfirm.com'
  });
  assert('Status 409 (conflict)', t3.status === 409, 'Got ' + t3.status);
  assert('Error mentions duplicate', t3.body.error && t3.body.error.includes('already exists'));

  // Test 4: Multiple NULL emails allowed
  console.log('\nTest 4: Email uniqueness allows NULL (two lawyers without email)');
  const t4a = await request('POST', '/api/lawyers', { full_name: 'No Email Lawyer A' });
  const t4b = await request('POST', '/api/lawyers', { full_name: 'No Email Lawyer B' });
  assert('First NULL email: 201', t4a.status === 201, 'Got ' + t4a.status);
  assert('Second NULL email: 201', t4b.status === 201, 'Got ' + t4b.status);

  // Test 5: List lawyers with role filter
  console.log('\nTest 5: List lawyers with role filter');
  const t5all = await request('GET', '/api/lawyers');
  assert('List returns array', t5all.body.data && Array.isArray(t5all.body.data));
  assert('Count >= 4', t5all.body.pagination.total >= 4, 'Got count ' + t5all.body.pagination.total);
  assert('Sorted by full_name', t5all.body.data.length >= 2 && t5all.body.data[0].full_name <= t5all.body.data[1].full_name);

  const t5role = await request('GET', '/api/lawyers?role=partner');
  assert('Role filter returns partners only', t5role.body.data && t5role.body.data.every(l => l.role === 'partner'));
  assert('Partner count is 1', t5role.body.pagination.total === 1, 'Got ' + t5role.body.pagination.total);

  // Test 6: Update lawyer role and rate
  console.log('\nTest 6: Update lawyer role and hourly_rate');
  const t6 = await request('PUT', '/api/lawyers/' + LAWYER_ID, {
    full_name: 'Jane Doe',
    role: 'senior_associate',
    hourly_rate: 350.00
  });
  assert('Status 200', t6.status === 200, 'Got ' + t6.status);
  assert('Role updated', t6.body.lawyer && t6.body.lawyer.role === 'senior_associate');
  assert('Hourly rate updated', t6.body.lawyer && t6.body.lawyer.hourly_rate === 350);

  // Test 7: Soft delete lawyer
  console.log('\nTest 7: Soft delete lawyer');
  const t7 = await request('DELETE', '/api/lawyers/' + LAWYER_ID);
  assert('Status 200', t7.status === 200, 'Got ' + t7.status);
  assert('Success message', t7.body.message === 'Lawyer deleted successfully');

  // Verify deleted lawyer not in list
  const t7list = await request('GET', '/api/lawyers');
  const deletedInList = t7list.body.data.find(l => l.lawyer_id === LAWYER_ID);
  assert('Deleted lawyer not in list', !deletedInList);

  // Verify GET /:id returns 404
  const t7get = await request('GET', '/api/lawyers/' + LAWYER_ID);
  assert('GET deleted lawyer returns 404', t7get.status === 404, 'Got ' + t7get.status);

  // Cleanup: delete test lawyers
  console.log('\nCleanup...');
  const allLawyers = await request('GET', '/api/lawyers');
  for (const l of allLawyers.body.data) {
    await request('DELETE', '/api/lawyers/' + l.lawyer_id);
  }
  console.log('  Cleaned up ' + allLawyers.body.pagination.total + ' test lawyers');

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
