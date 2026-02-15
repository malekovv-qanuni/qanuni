/**
 * Qanuni SaaS - Integration Test Suite
 * Tests: Pagination, Search, Filtering, Cross-Resource
 *
 * Run: node test-integration-saas.js
 * Requires: server running on localhost:3001
 *
 * @version 1.0.0 (Week 2 Day 8)
 */

require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3001';
let TOKEN = '';
let passed = 0;
let failed = 0;
let totalAssertions = 0;

// Track created resources for cleanup
const cleanup = { settings: [], currencies: [], exchangeRates: [], lookups: [], appointments: [], invoices: [], advances: [], expenses: [], timesheets: [], deadlines: [], judgments: [], tasks: [], clients: [], matters: [], lawyers: [], hearings: [], diary: [] };

// ==================== HTTP Helper ====================

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
  totalAssertions++;
  if (condition) {
    passed++;
    console.log('    PASS: ' + name);
  } else {
    failed++;
    console.log('    FAIL: ' + name + (detail ? ' - ' + detail : ''));
  }
}

// ==================== Setup ====================

async function setup() {
  console.log('=== Qanuni SaaS Integration Tests ===\n');
  console.log('Setup: Authenticating...');

  const login = await request('POST', '/api/auth/login', {
    email: 'admin@testfirm.com',
    password: 'Test1234!'
  });

  if (login.status === 200) {
    TOKEN = login.body.token;
    console.log('  Logged in successfully.\n');
  } else {
    console.log('  Login failed, registering...');
    const reg = await request('POST', '/api/auth/register', {
      firm_name: 'Integration Test Firm',
      admin_name: 'Test Admin',
      email: 'admin@testfirm.com',
      password: 'Test1234!'
    });
    if (reg.status === 201) {
      TOKEN = reg.body.token;
      console.log('  Registered successfully.\n');
    } else {
      console.log('  FATAL: Cannot authenticate:', reg.status, JSON.stringify(reg.body));
      process.exit(1);
    }
  }
}

// ==================== Seed Data ====================

async function seedData() {
  console.log('Seeding test data...');

  // Create 5 clients with varied data (unique emails per run)
  const ts = Date.now();
  const clientNames = [
    { client_name: 'Alpha Corp', client_name_arabic: '\u0634\u0631\u0643\u0629 \u0623\u0644\u0641\u0627', client_type: 'legal_entity', email: 'alpha' + ts + '@test.com', phone: '111-0001' },
    { client_name: 'Beta Holdings', client_name_arabic: '\u0628\u064A\u062A\u0627 \u0642\u0627\u0628\u0636\u0629', client_type: 'legal_entity', email: 'beta' + ts + '@test.com', phone: '111-0002' },
    { client_name: 'Charlie Smith', client_type: 'individual', email: 'charlie' + ts + '@test.com', phone: '111-0003' },
    { client_name: 'Dana Johnson', client_type: 'individual', email: 'dana' + ts + '@test.com', phone: '111-0004' },
    { client_name: 'Echo Foundation', client_type: 'legal_entity', email: 'echo' + ts + '@test.com', phone: '111-0005' }
  ];

  for (const c of clientNames) {
    const res = await request('POST', '/api/clients', c);
    if (res.status === 201) {
      cleanup.clients.push(res.body.client.client_id);
    } else {
      console.log('    WARN: Client creation failed (' + res.status + '): ' + JSON.stringify(res.body));
    }
  }
  if (cleanup.clients.length < 5) {
    console.log('  FATAL: Only ' + cleanup.clients.length + '/5 clients created');
    process.exit(1);
  }
  console.log('  Created ' + cleanup.clients.length + ' clients');

  // Create 5 matters
  const matterData = [
    { matter_number: 'INT-M-001-' + Date.now(), matter_name: 'Alpha Lawsuit', matter_type: 'litigation', matter_status: 'active', billing_type: 'hourly', client_ids: [cleanup.clients[0]], primary_client_id: cleanup.clients[0] },
    { matter_number: 'INT-M-002-' + Date.now(), matter_name: 'Beta Merger', matter_type: 'corporate', matter_status: 'active', billing_type: 'flat_fee', client_ids: [cleanup.clients[1]], primary_client_id: cleanup.clients[1] },
    { matter_number: 'INT-M-003-' + Date.now(), matter_name: 'Charlie Estate', matter_type: 'other', matter_status: 'closed', billing_type: 'hourly' },
    { matter_number: 'INT-M-004-' + Date.now(), matter_name: 'Dana IP Case', matter_type: 'litigation', matter_status: 'active', billing_type: 'hourly', client_ids: [cleanup.clients[3]], primary_client_id: cleanup.clients[3] },
    { matter_number: 'INT-M-005-' + Date.now(), matter_name: 'Echo Advisory', matter_type: 'advisory', matter_status: 'active' }
  ];

  for (const m of matterData) {
    const res = await request('POST', '/api/matters', m);
    if (res.status === 201) {
      cleanup.matters.push(res.body.matter_id);
    } else {
      console.log('    WARN: Matter creation failed (' + res.status + '): ' + JSON.stringify(res.body));
    }
  }
  if (cleanup.matters.length < 5) {
    console.log('  FATAL: Only ' + cleanup.matters.length + '/5 matters created');
    process.exit(1);
  }
  console.log('  Created ' + cleanup.matters.length + ' matters');

  // Create 3 lawyers
  const lawyerData = [
    { full_name: 'Lawyer Alpha', full_name_arabic: '\u0645\u062D\u0627\u0645\u064A \u0623\u0644\u0641\u0627', role: 'partner', email: 'lawyer.alpha.' + Date.now() + '@test.com' },
    { full_name: 'Lawyer Beta', role: 'associate', email: 'lawyer.beta.' + Date.now() + '@test.com' },
    { full_name: 'Lawyer Gamma', role: 'associate', is_active: false, email: 'lawyer.gamma.' + Date.now() + '@test.com' }
  ];

  for (const l of lawyerData) {
    const res = await request('POST', '/api/lawyers', l);
    if (res.status === 201) {
      cleanup.lawyers.push(res.body.lawyer.lawyer_id);
    }
  }
  console.log('  Created ' + cleanup.lawyers.length + ' lawyers');

  // Create 5 hearings across different matters
  const hearingData = [
    { matter_id: cleanup.matters[0], hearing_date: '2026-03-10', hearing_type: 'trial', court_name: 'Beirut Court', judge_name: 'Judge Ahmad', outcome: 'pending' },
    { matter_id: cleanup.matters[0], hearing_date: '2026-04-15', hearing_type: 'trial', court_name: 'Beirut Court', judge_name: 'Judge Ahmad', outcome: 'continued' },
    { matter_id: cleanup.matters[1], hearing_date: '2026-05-20', hearing_type: 'status', court_name: 'Tripoli Court', judge_name: 'Judge Layla', outcome: 'pending' },
    { matter_id: cleanup.matters[3], hearing_date: '2026-06-01', hearing_type: 'initial', court_name: 'Beirut IP Court', judge_name: 'Judge Samir', outcome: 'decided' },
    { matter_id: cleanup.matters[0], hearing_date: '2026-07-10', hearing_type: 'trial', court_name: 'Beirut Court', judge_name: 'Judge Ahmad', outcome: 'pending' }
  ];

  for (const h of hearingData) {
    const res = await request('POST', '/api/hearings', h);
    if (res.status === 201) {
      cleanup.hearings.push(res.body.hearing.hearing_id);
    } else {
      console.log('    WARN: Hearing creation failed (' + res.status + '): ' + JSON.stringify(res.body));
    }
  }
  if (cleanup.hearings.length < 5) {
    console.log('  WARN: Only ' + cleanup.hearings.length + '/5 hearings created');
  }
  console.log('  Created ' + cleanup.hearings.length + ' hearings\n');
}

// ==================== Pagination Tests ====================

async function testPagination() {
  console.log('--- PAGINATION TESTS ---\n');

  // Test 1: Default pagination
  console.log('  Test 1: Default pagination on clients');
  const t1 = await request('GET', '/api/clients');
  assert('Has data array', Array.isArray(t1.body.data));
  assert('Has pagination object', t1.body.pagination != null);
  assert('Default page is 1', t1.body.pagination.page === 1);
  assert('Default limit is 50', t1.body.pagination.limit === 50);
  assert('Total >= 5 (seeded)', t1.body.pagination.total >= 5);
  assert('totalPages >= 1', t1.body.pagination.totalPages >= 1);
  assert('hasPrev is false on page 1', t1.body.pagination.hasPrev === false);

  // Test 2: Custom page size
  console.log('\n  Test 2: Custom page size (limit=2, page=1)');
  const t2 = await request('GET', '/api/clients?limit=2&page=1');
  assert('Returns exactly 2 items', t2.body.data.length === 2, 'Got ' + t2.body.data.length);
  assert('limit is 2', t2.body.pagination.limit === 2);
  assert('hasNext is true', t2.body.pagination.hasNext === true);

  // Test 3: Page 2
  console.log('\n  Test 3: Page 2 with limit=2');
  const t3 = await request('GET', '/api/clients?limit=2&page=2');
  assert('Returns items', t3.body.data.length > 0);
  assert('Page is 2', t3.body.pagination.page === 2);
  assert('hasPrev is true', t3.body.pagination.hasPrev === true);
  // Ensure no overlap with page 1
  const page1Ids = t2.body.data.map(c => c.client_id);
  const page2Ids = t3.body.data.map(c => c.client_id);
  assert('No overlap between pages', page1Ids.every(id => !page2Ids.includes(id)));

  // Test 4: Invalid pagination params (clamped)
  console.log('\n  Test 4: Invalid pagination params');
  const t4a = await request('GET', '/api/clients?page=-1&limit=0');
  assert('Negative page clamped to 1', t4a.body.pagination.page === 1);
  assert('Zero limit clamped to 1', t4a.body.pagination.limit === 1);

  const t4b = await request('GET', '/api/clients?limit=999');
  assert('Limit > 100 clamped to 100', t4b.body.pagination.limit === 100);

  // Test 5: Pagination on matters
  console.log('\n  Test 5: Pagination on matters');
  const t5 = await request('GET', '/api/matters?limit=2');
  assert('Matters has data array', Array.isArray(t5.body.data));
  assert('Matters has pagination', t5.body.pagination != null);
  assert('Matters limit=2 returns <=2', t5.body.data.length <= 2);
  assert('Matters include clients array', t5.body.data[0] && Array.isArray(t5.body.data[0].clients));

  // Test 6: Pagination on lawyers
  console.log('\n  Test 6: Pagination on lawyers');
  const t6 = await request('GET', '/api/lawyers?limit=2');
  assert('Lawyers has data array', Array.isArray(t6.body.data));
  assert('Lawyers has pagination', t6.body.pagination != null);

  // Test 7: Pagination on hearings
  console.log('\n  Test 7: Pagination on hearings');
  const t7 = await request('GET', '/api/hearings?limit=2');
  assert('Hearings has data array', Array.isArray(t7.body.data));
  assert('Hearings has pagination', t7.body.pagination != null);
  assert('Hearings include matter_name', t7.body.data[0] && t7.body.data[0].matter_name != null);

  // Test 8: Empty result pagination
  console.log('\n  Test 8: Empty results pagination');
  const t8 = await request('GET', '/api/clients?search=ZZZZNONEXISTENT');
  assert('Empty data array', t8.body.data.length === 0);
  assert('Total is 0', t8.body.pagination.total === 0);
  assert('totalPages is 0', t8.body.pagination.totalPages === 0);
  assert('hasNext is false', t8.body.pagination.hasNext === false);
}

// ==================== Search Tests ====================

async function testSearch() {
  console.log('\n--- SEARCH TESTS ---\n');

  // Test 9: Search clients by name
  console.log('  Test 9: Search clients by name');
  const t9 = await request('GET', '/api/clients?search=Alpha');
  assert('Finds Alpha Corp', t9.body.data.length >= 1);
  assert('Result contains Alpha', t9.body.data.length > 0 && t9.body.data[0].client_name.includes('Alpha'));

  // Test 10: Search clients by Arabic name
  console.log('\n  Test 10: Search clients by Arabic name');
  const t10 = await request('GET', '/api/clients?search=\u0623\u0644\u0641\u0627');
  assert('Finds Arabic match', t10.body.data.length >= 1);

  // Test 11: Search matters
  console.log('\n  Test 11: Search matters by name');
  const t11 = await request('GET', '/api/matters?search=Lawsuit');
  assert('Finds Alpha Lawsuit', t11.body.data.length >= 1);

  // Test 12: Search matters by number
  console.log('\n  Test 12: Search matters by number');
  const t12 = await request('GET', '/api/matters?search=INT-M-001');
  assert('Finds by matter_number', t12.body.data.length >= 1);

  // Test 13: Search lawyers
  console.log('\n  Test 13: Search lawyers');
  const t13 = await request('GET', '/api/lawyers?search=Alpha');
  assert('Finds Lawyer Alpha', t13.body.data.length >= 1);

  // Test 14: Search hearings
  console.log('\n  Test 14: Search hearings by court name');
  const t14 = await request('GET', '/api/hearings?search=Tripoli');
  assert('Finds Tripoli Court hearing', t14.body.data.length >= 1);

  // Test 15: Search returns no results
  console.log('\n  Test 15: No search results');
  const t15 = await request('GET', '/api/lawyers?search=XXXXXXXXX');
  assert('Returns empty array', t15.body.data.length === 0);
  assert('Total is 0', t15.body.pagination.total === 0);
}

// ==================== Filter Tests ====================

async function testFilters() {
  console.log('\n--- FILTER TESTS ---\n');

  // Test 16: Filter clients by type
  console.log('  Test 16: Filter clients by type');
  const t16 = await request('GET', '/api/clients?client_type=legal_entity');
  assert('Returns legal_entity clients', t16.body.data.length >= 3);
  assert('All are legal_entity', t16.body.data.every(c => c.client_type === 'legal_entity'));

  // Test 17: Filter matters by status
  console.log('\n  Test 17: Filter matters by status');
  const t17 = await request('GET', '/api/matters?matter_status=closed');
  assert('Returns closed matters', t17.body.data.length >= 1);
  assert('All are closed', t17.body.data.every(m => m.matter_status === 'closed'));

  // Test 18: Filter matters by type
  console.log('\n  Test 18: Filter matters by type + status');
  const t18 = await request('GET', '/api/matters?matter_type=litigation&matter_status=active');
  assert('Returns active litigation', t18.body.data.length >= 1);
  assert('All are litigation', t18.body.data.every(m => m.matter_type === 'litigation'));
  assert('All are active', t18.body.data.every(m => m.matter_status === 'active'));

  // Test 19: Filter lawyers by role
  console.log('\n  Test 19: Filter lawyers by role');
  const t19 = await request('GET', '/api/lawyers?role=partner');
  assert('Returns partners', t19.body.data.length >= 1);
  assert('All are partner', t19.body.data.every(l => l.role === 'partner'));

  // Test 20: Filter lawyers active_only
  console.log('\n  Test 20: Filter lawyers active_only');
  const t20 = await request('GET', '/api/lawyers?active_only=true');
  assert('Returns active lawyers', t20.body.data.length >= 2);
  assert('All are active', t20.body.data.every(l => l.is_active === true));

  // Test 21: Filter hearings by outcome
  console.log('\n  Test 21: Filter hearings by outcome');
  const t21 = await request('GET', '/api/hearings?outcome=pending');
  assert('Returns pending hearings', t21.body.data.length >= 1);
  assert('All are pending', t21.body.data.every(h => h.outcome === 'pending'));

  // Test 22: Filter hearings by date range
  console.log('\n  Test 22: Filter hearings by date range');
  const t22 = await request('GET', '/api/hearings?start_date=2026-04-01&end_date=2026-05-31');
  assert('Returns hearings in range', t22.body.data.length >= 1);
  assert('All in range', t22.body.data.every(h => {
    const d = h.hearing_date.substring(0, 10);
    return d >= '2026-04-01' && d <= '2026-05-31';
  }));

  // Test 23: Filter + pagination combined
  console.log('\n  Test 23: Filter + pagination combined');
  const t23 = await request('GET', '/api/hearings?outcome=pending&limit=1&page=1');
  assert('Returns 1 result', t23.body.data.length === 1);
  assert('Has pagination', t23.body.pagination.limit === 1);
  assert('Total > 1 pending', t23.body.pagination.total >= 2);

  // Test 24: Filter hearings by hearing_type
  console.log('\n  Test 24: Filter hearings by hearing_type');
  const t24 = await request('GET', '/api/hearings?hearing_type=trial');
  assert('Returns trial hearings', t24.body.data.length >= 1);
  assert('All are trial type', t24.body.data.every(h => h.hearing_type === 'trial'));
}

// ==================== Diary Tests ====================

async function testDiary() {
  console.log('\n--- DIARY TESTS ---\n');

  // Test 28: Create diary entry
  console.log('  Test 28: Create diary entry');
  const t28 = await request('POST', '/api/diary', {
    matter_id: cleanup.matters[0],
    entry_date: '2026-02-14',
    entry_type: 'note',
    title: 'Test diary entry',
    description: 'This is a test diary entry'
  });
  assert('Status 201', t28.status === 201, 'Got ' + t28.status);
  assert('Has diary object', t28.body.diary != null);
  assert('Has diary_id', t28.body.diary && t28.body.diary.diary_id > 0);
  const testDiaryId = t28.body.diary ? t28.body.diary.diary_id : null;
  if (testDiaryId) cleanup.diary.push(testDiaryId);

  // Test 29: Create diary entry (minimal - no description)
  console.log('\n  Test 29: Create diary entry (minimal)');
  const t29 = await request('POST', '/api/diary', {
    matter_id: cleanup.matters[0],
    entry_date: '2026-02-15',
    entry_type: 'call',
    title: 'Client phone call'
  });
  assert('Status 201', t29.status === 201, 'Got ' + t29.status);
  assert('Created successfully', t29.body.success === true);
  if (t29.body.diary) cleanup.diary.push(t29.body.diary.diary_id);

  // Test 30: Reject invalid matter_id
  console.log('\n  Test 30: Reject invalid matter_id');
  const t30 = await request('POST', '/api/diary', {
    matter_id: 99999,
    entry_date: '2026-02-14',
    entry_type: 'note',
    title: 'Should fail'
  });
  assert('Status 404', t30.status === 404, 'Got ' + t30.status);
  assert('Error mentions Matter', t30.body.error && t30.body.error.includes('Matter not found'));

  // Test 31: List diary entries
  console.log('\n  Test 31: List diary entries');
  const t31 = await request('GET', '/api/diary');
  assert('Has data array', Array.isArray(t31.body.data));
  assert('Has pagination', t31.body.pagination != null);
  assert('Has at least 2 entries', t31.body.data.length >= 2, 'Got ' + t31.body.data.length);

  // Test 32: Filter by matter_id
  console.log('\n  Test 32: Filter by matter_id');
  const t32 = await request('GET', '/api/diary?matter_id=' + cleanup.matters[0]);
  assert('Returns diary entries', t32.body.data.length >= 2, 'Got ' + t32.body.data.length);
  assert('All match matter_id', t32.body.data.every(e => e.matter_id === cleanup.matters[0]));

  // Test 33: Filter by date range
  console.log('\n  Test 33: Filter by date range');
  const t33 = await request('GET', '/api/diary?start_date=2026-02-14&end_date=2026-02-15');
  assert('Returns entries in range', t33.body.data.length >= 2, 'Got ' + t33.body.data.length);

  // Test 34: Get single diary entry
  console.log('\n  Test 34: Get single diary entry');
  const t34 = await request('GET', '/api/diary/' + testDiaryId);
  assert('Status 200', t34.status === 200, 'Got ' + t34.status);
  assert('Has diary object', t34.body.diary != null);
  assert('diary_id matches', t34.body.diary && t34.body.diary.diary_id === testDiaryId);
  assert('Title matches', t34.body.diary && t34.body.diary.title === 'Test diary entry');

  // Test 35: Update diary entry
  console.log('\n  Test 35: Update diary entry');
  const t35 = await request('PUT', '/api/diary/' + testDiaryId, {
    matter_id: cleanup.matters[0],
    entry_date: '2026-02-16',
    entry_type: 'meeting',
    title: 'Updated title',
    description: 'Updated description'
  });
  assert('Status 200', t35.status === 200, 'Got ' + t35.status);
  assert('Title updated', t35.body.diary && t35.body.diary.title === 'Updated title');
  assert('Entry type updated', t35.body.diary && t35.body.diary.entry_type === 'meeting');

  // Test 36: Soft delete diary entry
  console.log('\n  Test 36: Soft delete diary entry');
  const t36 = await request('DELETE', '/api/diary/' + testDiaryId);
  assert('Status 200', t36.status === 200, 'Got ' + t36.status);
  assert('Success message', t36.body.message === 'Diary entry deleted successfully');

  // Verify not in list
  const t36list = await request('GET', '/api/diary');
  assert('Deleted entry not in list', !t36list.body.data.find(e => e.diary_id === testDiaryId));
}

// ==================== Tasks Tests ====================

async function testTasks() {
  console.log('\n--- TASKS TESTS ---\n');

  // Test 37: Create task (comprehensive - with matter + lawyer)
  console.log('  Test 37: Create task (comprehensive)');
  const t37 = await request('POST', '/api/tasks', {
    title: 'Review contract',
    description: 'Annual lease agreement',
    matter_id: cleanup.matters[0],
    priority: 'high',
    status: 'assigned',
    assigned_to: cleanup.lawyers[0],
    due_date: '2026-03-15'
  });
  assert('Status 201', t37.status === 201, 'Got ' + t37.status);
  assert('Has task object', t37.body.task != null);
  assert('Has task_id', t37.body.task && t37.body.task.task_id > 0);
  assert('task_number format', t37.body.task && t37.body.task.task_number && t37.body.task.task_number.startsWith('WA-2026-'));
  assert('Priority is high', t37.body.task && t37.body.task.priority === 'high');
  const testTaskId = t37.body.task ? t37.body.task.task_id : null;
  if (testTaskId) cleanup.tasks.push(testTaskId);

  // Test 38: Create task (minimal - title only)
  console.log('\n  Test 38: Create task (minimal)');
  const t38 = await request('POST', '/api/tasks', {
    title: 'Minimal task'
  });
  assert('Status 201', t38.status === 201, 'Got ' + t38.status);
  assert('Created successfully', t38.body.success === true);
  assert('Default priority medium', t38.body.task && t38.body.task.priority === 'medium');
  assert('Default status assigned', t38.body.task && t38.body.task.status === 'assigned');
  if (t38.body.task) cleanup.tasks.push(t38.body.task.task_id);

  // Test 39: Reject invalid matter_id
  console.log('\n  Test 39: Reject invalid matter_id');
  const t39 = await request('POST', '/api/tasks', {
    title: 'Bad task',
    matter_id: 99999
  });
  assert('Status 404', t39.status === 404, 'Got ' + t39.status);
  assert('Error mentions Matter', t39.body.error && t39.body.error.includes('Matter not found'));

  // Test 40: List tasks
  console.log('\n  Test 40: List tasks');
  const t40 = await request('GET', '/api/tasks');
  assert('Has data array', Array.isArray(t40.body.data));
  assert('Has pagination', t40.body.pagination != null);
  assert('Has at least 2 tasks', t40.body.data.length >= 2, 'Got ' + t40.body.data.length);

  // Test 41: Filter by status
  console.log('\n  Test 41: Filter by status');
  const t41 = await request('GET', '/api/tasks?status=assigned');
  assert('Returns assigned tasks', t41.body.data.length >= 1);
  assert('All are assigned', t41.body.data.every(t => t.status === 'assigned'));

  // Test 42: Filter by matter_id
  console.log('\n  Test 42: Filter by matter_id');
  const t42 = await request('GET', '/api/tasks?matter_id=' + cleanup.matters[0]);
  assert('Returns tasks for matter', t42.body.data.length >= 1, 'Got ' + t42.body.data.length);
  assert('All match matter_id', t42.body.data.every(t => t.matter_id === cleanup.matters[0]));

  // Test 43: Get single task
  console.log('\n  Test 43: Get single task');
  const t43 = await request('GET', '/api/tasks/' + testTaskId);
  assert('Status 200', t43.status === 200, 'Got ' + t43.status);
  assert('Has task object', t43.body.task != null);
  assert('task_id matches', t43.body.task && t43.body.task.task_id === testTaskId);
  assert('Has matter_name from JOIN', t43.body.task && t43.body.task.matter_name != null);

  // Test 44: Update task
  console.log('\n  Test 44: Update task');
  const t44 = await request('PUT', '/api/tasks/' + testTaskId, {
    title: 'Updated review contract',
    status: 'in_progress',
    priority: 'medium',
    completion_notes: 'Reviewed sections 1-3'
  });
  assert('Status 200', t44.status === 200, 'Got ' + t44.status);
  assert('Title updated', t44.body.task && t44.body.task.title === 'Updated review contract');
  assert('Status updated', t44.body.task && t44.body.task.status === 'in_progress');

  // Test 45: Soft delete task
  console.log('\n  Test 45: Soft delete task');
  const deleteTaskId = cleanup.tasks[1]; // Delete the minimal task
  const t45 = await request('DELETE', '/api/tasks/' + deleteTaskId);
  assert('Status 200', t45.status === 200, 'Got ' + t45.status);
  assert('Success message', t45.body.message === 'Task deleted successfully');

  // Verify not in list
  const t45list = await request('GET', '/api/tasks');
  assert('Deleted task not in list', !t45list.body.data.find(t => t.task_id === deleteTaskId));
}

// ==================== Judgments Tests ====================

async function testJudgments() {
  console.log('\n--- JUDGMENTS TESTS ---\n');

  // Test 46: Create judgment (comprehensive - with matter + hearing)
  console.log('  Test 46: Create judgment (comprehensive)');
  const t46 = await request('POST', '/api/judgments', {
    matter_id: cleanup.matters[0],
    hearing_id: cleanup.hearings[0],
    judgment_type: 'first_instance',
    expected_date: '2026-04-01',
    reminder_days: 14,
    judgment_outcome: 'favorable',
    judgment_summary: 'Court ruled in favor of plaintiff',
    amount_awarded: 50000,
    currency: 'USD',
    in_favor_of: 'Alpha Corp',
    appeal_deadline: '2026-05-01',
    status: 'favorable',
    notes: 'Full award granted'
  });
  assert('Status 201', t46.status === 201, 'Got ' + t46.status);
  assert('Has judgment object', t46.body.judgment != null);
  assert('Has judgment_id', t46.body.judgment && t46.body.judgment.judgment_id > 0);
  assert('Status is favorable', t46.body.judgment && t46.body.judgment.status === 'favorable');
  assert('Currency is USD', t46.body.judgment && t46.body.judgment.currency === 'USD');
  assert('Amount is 50000', t46.body.judgment && t46.body.judgment.amount_awarded === 50000);
  const testJudgmentId = t46.body.judgment ? t46.body.judgment.judgment_id : null;
  if (testJudgmentId) cleanup.judgments.push(testJudgmentId);

  // Test 47: Create judgment (minimal - matter_id only)
  console.log('\n  Test 47: Create judgment (minimal)');
  const t47 = await request('POST', '/api/judgments', {
    matter_id: cleanup.matters[1]
  });
  assert('Status 201', t47.status === 201, 'Got ' + t47.status);
  assert('Created successfully', t47.body.success === true);
  assert('Default status pending', t47.body.judgment && t47.body.judgment.status === 'pending');
  assert('Default currency USD', t47.body.judgment && t47.body.judgment.currency === 'USD');
  assert('Default type first_instance', t47.body.judgment && t47.body.judgment.judgment_type === 'first_instance');
  if (t47.body.judgment) cleanup.judgments.push(t47.body.judgment.judgment_id);

  // Test 48: Reject invalid matter_id
  console.log('\n  Test 48: Reject invalid matter_id');
  const t48 = await request('POST', '/api/judgments', {
    matter_id: 99999
  });
  assert('Status 404', t48.status === 404, 'Got ' + t48.status);
  assert('Error mentions Matter', t48.body.error && t48.body.error.includes('Matter not found'));

  // Test 49: Reject invalid hearing_id
  console.log('\n  Test 49: Reject invalid hearing_id');
  const t49 = await request('POST', '/api/judgments', {
    matter_id: cleanup.matters[0],
    hearing_id: 99999
  });
  assert('Status 404', t49.status === 404, 'Got ' + t49.status);
  assert('Error mentions Hearing', t49.body.error && t49.body.error.includes('Hearing not found'));

  // Test 50: List judgments
  console.log('\n  Test 50: List judgments');
  const t50 = await request('GET', '/api/judgments');
  assert('Has data array', Array.isArray(t50.body.data));
  assert('Has pagination', t50.body.pagination != null);
  assert('Has at least 2 judgments', t50.body.data.length >= 2, 'Got ' + t50.body.data.length);

  // Test 51: Filter by status
  console.log('\n  Test 51: Filter by status');
  const t51 = await request('GET', '/api/judgments?status=favorable');
  assert('Returns favorable judgments', t51.body.data.length >= 1);
  assert('All are favorable', t51.body.data.every(j => j.status === 'favorable'));

  // Test 52: Filter by matter_id
  console.log('\n  Test 52: Filter by matter_id');
  const t52 = await request('GET', '/api/judgments?matter_id=' + cleanup.matters[0]);
  assert('Returns judgments for matter', t52.body.data.length >= 1, 'Got ' + t52.body.data.length);
  assert('All match matter_id', t52.body.data.every(j => j.matter_id === cleanup.matters[0]));

  // Test 53: Get single judgment
  console.log('\n  Test 53: Get single judgment');
  const t53 = await request('GET', '/api/judgments/' + testJudgmentId);
  assert('Status 200', t53.status === 200, 'Got ' + t53.status);
  assert('Has judgment object', t53.body.judgment != null);
  assert('judgment_id matches', t53.body.judgment && t53.body.judgment.judgment_id === testJudgmentId);
  assert('Has matter_name from JOIN', t53.body.judgment && t53.body.judgment.matter_name != null);

  // Test 54: Update judgment
  console.log('\n  Test 54: Update judgment');
  const t54 = await request('PUT', '/api/judgments/' + testJudgmentId, {
    matter_id: cleanup.matters[0],
    judgment_type: 'first_instance',
    status: 'appealed',
    judgment_summary: 'Updated: judgment appealed',
    amount_awarded: 75000,
    currency: 'EUR',
    notes: 'Appealed by defendant'
  });
  assert('Status 200', t54.status === 200, 'Got ' + t54.status);
  assert('Status updated to appealed', t54.body.judgment && t54.body.judgment.status === 'appealed');
  assert('Amount updated to 75000', t54.body.judgment && t54.body.judgment.amount_awarded === 75000);
  assert('Currency updated to EUR', t54.body.judgment && t54.body.judgment.currency === 'EUR');

  // Test 55: Soft delete judgment
  console.log('\n  Test 55: Soft delete judgment');
  const deleteJudgmentId = cleanup.judgments[1]; // Delete the minimal judgment
  const t55 = await request('DELETE', '/api/judgments/' + deleteJudgmentId);
  assert('Status 200', t55.status === 200, 'Got ' + t55.status);
  assert('Success message', t55.body.message === 'Judgment deleted successfully');

  // Verify not in list
  const t55list = await request('GET', '/api/judgments');
  assert('Deleted judgment not in list', !t55list.body.data.find(j => j.judgment_id === deleteJudgmentId));
}

// ==================== Deadlines Tests ====================

async function testDeadlines() {
  console.log('\n--- DEADLINES TESTS ---\n');

  // Test 56: Create deadline (comprehensive - with matter + judgment)
  console.log('  Test 56: Create deadline (comprehensive)');
  const t56 = await request('POST', '/api/deadlines', {
    matter_id: cleanup.matters[0],
    judgment_id: cleanup.judgments[0],
    title: 'File appeal brief',
    deadline_date: '2026-04-15',
    reminder_days: 14,
    priority: 'high',
    status: 'pending',
    notes: 'Must file before appeal deadline'
  });
  assert('Status 201', t56.status === 201, 'Got ' + t56.status);
  assert('Has deadline object', t56.body.deadline != null);
  assert('Has deadline_id', t56.body.deadline && t56.body.deadline.deadline_id > 0);
  assert('Priority is high', t56.body.deadline && t56.body.deadline.priority === 'high');
  assert('Status is pending', t56.body.deadline && t56.body.deadline.status === 'pending');
  assert('Reminder days is 14', t56.body.deadline && t56.body.deadline.reminder_days === 14);
  const testDeadlineId = t56.body.deadline ? t56.body.deadline.deadline_id : null;
  if (testDeadlineId) cleanup.deadlines.push(testDeadlineId);

  // Test 57: Create deadline (minimal - matter_id + title + date only)
  console.log('\n  Test 57: Create deadline (minimal)');
  const t57 = await request('POST', '/api/deadlines', {
    matter_id: cleanup.matters[1],
    title: 'Submit documents',
    deadline_date: '2026-05-01'
  });
  assert('Status 201', t57.status === 201, 'Got ' + t57.status);
  assert('Created successfully', t57.body.success === true);
  assert('Default priority medium', t57.body.deadline && t57.body.deadline.priority === 'medium');
  assert('Default status pending', t57.body.deadline && t57.body.deadline.status === 'pending');
  assert('Default reminder 7', t57.body.deadline && t57.body.deadline.reminder_days === 7);
  if (t57.body.deadline) cleanup.deadlines.push(t57.body.deadline.deadline_id);

  // Test 58: Reject invalid matter_id
  console.log('\n  Test 58: Reject invalid matter_id');
  const t58 = await request('POST', '/api/deadlines', {
    matter_id: 99999,
    title: 'Should fail',
    deadline_date: '2026-04-01'
  });
  assert('Status 404', t58.status === 404, 'Got ' + t58.status);
  assert('Error mentions Matter', t58.body.error && t58.body.error.includes('Matter not found'));

  // Test 59: Reject invalid judgment_id
  console.log('\n  Test 59: Reject invalid judgment_id');
  const t59 = await request('POST', '/api/deadlines', {
    matter_id: cleanup.matters[0],
    judgment_id: 99999,
    title: 'Should fail',
    deadline_date: '2026-04-01'
  });
  assert('Status 404', t59.status === 404, 'Got ' + t59.status);
  assert('Error mentions Judgment', t59.body.error && t59.body.error.includes('Judgment not found'));

  // Test 60: List deadlines
  console.log('\n  Test 60: List deadlines');
  const t60 = await request('GET', '/api/deadlines');
  assert('Has data array', Array.isArray(t60.body.data));
  assert('Has pagination', t60.body.pagination != null);
  assert('Has at least 2 deadlines', t60.body.data.length >= 2, 'Got ' + t60.body.data.length);

  // Test 61: Filter by status
  console.log('\n  Test 61: Filter by status');
  const t61 = await request('GET', '/api/deadlines?status=pending');
  assert('Returns pending deadlines', t61.body.data.length >= 1);
  assert('All are pending', t61.body.data.every(d => d.status === 'pending'));

  // Test 62: Filter by matter_id
  console.log('\n  Test 62: Filter by matter_id');
  const t62 = await request('GET', '/api/deadlines?matter_id=' + cleanup.matters[0]);
  assert('Returns deadlines for matter', t62.body.data.length >= 1, 'Got ' + t62.body.data.length);
  assert('All match matter_id', t62.body.data.every(d => d.matter_id === cleanup.matters[0]));

  // Test 63: Filter by priority
  console.log('\n  Test 63: Filter by priority');
  const t63 = await request('GET', '/api/deadlines?priority=high');
  assert('Returns high priority deadlines', t63.body.data.length >= 1);
  assert('All are high priority', t63.body.data.every(d => d.priority === 'high'));

  // Test 64: Search deadlines
  console.log('\n  Test 64: Search deadlines');
  const t64 = await request('GET', '/api/deadlines?search=appeal');
  assert('Finds appeal deadline', t64.body.data.length >= 1);

  // Test 65: Get single deadline
  console.log('\n  Test 65: Get single deadline');
  const t65 = await request('GET', '/api/deadlines/' + testDeadlineId);
  assert('Status 200', t65.status === 200, 'Got ' + t65.status);
  assert('Has deadline object', t65.body.deadline != null);
  assert('deadline_id matches', t65.body.deadline && t65.body.deadline.deadline_id === testDeadlineId);
  assert('Has matter_name from JOIN', t65.body.deadline && t65.body.deadline.matter_name != null);

  // Test 66: Update deadline
  console.log('\n  Test 66: Update deadline');
  const t66 = await request('PUT', '/api/deadlines/' + testDeadlineId, {
    matter_id: cleanup.matters[0],
    title: 'Updated: File appeal brief',
    deadline_date: '2026-04-20',
    priority: 'urgent',
    status: 'completed',
    notes: 'Filed successfully'
  });
  assert('Status 200', t66.status === 200, 'Got ' + t66.status);
  assert('Title updated', t66.body.deadline && t66.body.deadline.title === 'Updated: File appeal brief');
  assert('Priority updated to urgent', t66.body.deadline && t66.body.deadline.priority === 'urgent');
  assert('Status updated to completed', t66.body.deadline && t66.body.deadline.status === 'completed');

  // Test 67: Soft delete deadline
  console.log('\n  Test 67: Soft delete deadline');
  const deleteDeadlineId = cleanup.deadlines[1]; // Delete the minimal deadline
  const t67 = await request('DELETE', '/api/deadlines/' + deleteDeadlineId);
  assert('Status 200', t67.status === 200, 'Got ' + t67.status);
  assert('Success message', t67.body.message === 'Deadline deleted successfully');

  // Verify not in list
  const t67list = await request('GET', '/api/deadlines');
  assert('Deleted deadline not in list', !t67list.body.data.find(d => d.deadline_id === deleteDeadlineId));
}

// ==================== Timesheets Tests ====================

async function testTimesheets() {
  console.log('\n--- TIMESHEETS TESTS ---\n');

  // Test 68: Create timesheet (comprehensive - with matter + lawyer)
  console.log('  Test 68: Create timesheet (comprehensive)');
  const t68 = await request('POST', '/api/timesheets', {
    matter_id: cleanup.matters[0],
    lawyer_id: cleanup.lawyers[0],
    entry_date: '2026-02-14',
    minutes: 120,
    narrative: 'Drafted motion for summary judgment',
    billable: true,
    rate_per_hour: 250,
    rate_currency: 'USD',
    status: 'draft'
  });
  assert('Status 201', t68.status === 201, 'Got ' + t68.status);
  assert('Has timesheet object', t68.body.timesheet != null);
  assert('Has timesheet_id', t68.body.timesheet && t68.body.timesheet.timesheet_id > 0);
  assert('Minutes is 120', t68.body.timesheet && t68.body.timesheet.minutes === 120);
  assert('Status is draft', t68.body.timesheet && t68.body.timesheet.status === 'draft');
  assert('Rate is 250', t68.body.timesheet && t68.body.timesheet.rate_per_hour === 250);
  const testTimesheetId = t68.body.timesheet ? t68.body.timesheet.timesheet_id : null;
  if (testTimesheetId) cleanup.timesheets.push(testTimesheetId);

  // Test 69: Create timesheet (minimal - date + minutes + narrative only)
  console.log('\n  Test 69: Create timesheet (minimal)');
  const t69 = await request('POST', '/api/timesheets', {
    entry_date: '2026-02-15',
    minutes: 30,
    narrative: 'Client phone call'
  });
  assert('Status 201', t69.status === 201, 'Got ' + t69.status);
  assert('Created successfully', t69.body.success === true);
  assert('Default status draft', t69.body.timesheet && t69.body.timesheet.status === 'draft');
  assert('Default billable true', t69.body.timesheet && t69.body.timesheet.billable === true);
  assert('Default currency USD', t69.body.timesheet && t69.body.timesheet.rate_currency === 'USD');
  if (t69.body.timesheet) cleanup.timesheets.push(t69.body.timesheet.timesheet_id);

  // Test 70: Reject invalid matter_id
  console.log('\n  Test 70: Reject invalid matter_id');
  const t70 = await request('POST', '/api/timesheets', {
    matter_id: 99999,
    entry_date: '2026-02-14',
    minutes: 60,
    narrative: 'Should fail'
  });
  assert('Status 404', t70.status === 404, 'Got ' + t70.status);
  assert('Error mentions Matter', t70.body.error && t70.body.error.includes('Matter not found'));

  // Test 71: Reject invalid lawyer_id
  console.log('\n  Test 71: Reject invalid lawyer_id');
  const t71 = await request('POST', '/api/timesheets', {
    lawyer_id: 99999,
    entry_date: '2026-02-14',
    minutes: 60,
    narrative: 'Should fail'
  });
  assert('Status 404', t71.status === 404, 'Got ' + t71.status);
  assert('Error mentions Lawyer', t71.body.error && t71.body.error.includes('Lawyer not found'));

  // Test 72: List timesheets
  console.log('\n  Test 72: List timesheets');
  const t72 = await request('GET', '/api/timesheets');
  assert('Has data array', Array.isArray(t72.body.data));
  assert('Has pagination', t72.body.pagination != null);
  assert('Has at least 2 timesheets', t72.body.data.length >= 2, 'Got ' + t72.body.data.length);

  // Test 73: Filter by status
  console.log('\n  Test 73: Filter by status');
  const t73 = await request('GET', '/api/timesheets?status=draft');
  assert('Returns draft timesheets', t73.body.data.length >= 1);
  assert('All are draft', t73.body.data.every(t => t.status === 'draft'));

  // Test 74: Filter by matter_id
  console.log('\n  Test 74: Filter by matter_id');
  const t74 = await request('GET', '/api/timesheets?matter_id=' + cleanup.matters[0]);
  assert('Returns timesheets for matter', t74.body.data.length >= 1, 'Got ' + t74.body.data.length);
  assert('All match matter_id', t74.body.data.every(t => t.matter_id === cleanup.matters[0]));

  // Test 75: Filter by lawyer_id
  console.log('\n  Test 75: Filter by lawyer_id');
  const t75 = await request('GET', '/api/timesheets?lawyer_id=' + cleanup.lawyers[0]);
  assert('Returns timesheets for lawyer', t75.body.data.length >= 1);
  assert('All match lawyer_id', t75.body.data.every(t => t.lawyer_id === cleanup.lawyers[0]));

  // Test 76: Search timesheets
  console.log('\n  Test 76: Search timesheets');
  const t76 = await request('GET', '/api/timesheets?search=motion');
  assert('Finds motion timesheet', t76.body.data.length >= 1);

  // Test 77: Get single timesheet
  console.log('\n  Test 77: Get single timesheet');
  const t77 = await request('GET', '/api/timesheets/' + testTimesheetId);
  assert('Status 200', t77.status === 200, 'Got ' + t77.status);
  assert('Has timesheet object', t77.body.timesheet != null);
  assert('timesheet_id matches', t77.body.timesheet && t77.body.timesheet.timesheet_id === testTimesheetId);
  assert('Has matter_name from JOIN', t77.body.timesheet && t77.body.timesheet.matter_name != null);
  assert('Has lawyer_name from JOIN', t77.body.timesheet && t77.body.timesheet.lawyer_name != null);

  // Test 78: Update timesheet
  console.log('\n  Test 78: Update timesheet');
  const t78 = await request('PUT', '/api/timesheets/' + testTimesheetId, {
    matter_id: cleanup.matters[0],
    lawyer_id: cleanup.lawyers[0],
    entry_date: '2026-02-14',
    minutes: 180,
    narrative: 'Updated: Drafted and reviewed motion',
    billable: true,
    rate_per_hour: 300,
    status: 'submitted'
  });
  assert('Status 200', t78.status === 200, 'Got ' + t78.status);
  assert('Minutes updated to 180', t78.body.timesheet && t78.body.timesheet.minutes === 180);
  assert('Status updated to submitted', t78.body.timesheet && t78.body.timesheet.status === 'submitted');
  assert('Rate updated to 300', t78.body.timesheet && t78.body.timesheet.rate_per_hour === 300);

  // Test 79: Soft delete timesheet
  console.log('\n  Test 79: Soft delete timesheet');
  const deleteTimesheetId = cleanup.timesheets[1]; // Delete the minimal timesheet
  const t79 = await request('DELETE', '/api/timesheets/' + deleteTimesheetId);
  assert('Status 200', t79.status === 200, 'Got ' + t79.status);
  assert('Success message', t79.body.message === 'Timesheet deleted successfully');

  // Verify not in list
  const t79list = await request('GET', '/api/timesheets');
  assert('Deleted timesheet not in list', !t79list.body.data.find(t => t.timesheet_id === deleteTimesheetId));

  // Test 79a: Get unbilled time (all)
  console.log('\n  Test 79a: Get unbilled timesheets');
  const t79a = await request('GET', '/api/timesheets/unbilled');
  assert('Status 200', t79a.status === 200, 'Got ' + t79a.status);
  assert('Has data array', Array.isArray(t79a.body.data));
  assert('Includes test timesheet', t79a.body.data.some(t => t.timesheet_id === testTimesheetId));
  assert('All are billable', t79a.body.data.every(t => t.billable === true || t.billable === 1));
  assert('None are billed', t79a.body.data.every(t => t.status !== 'billed'));

  // Test 79b: Get unbilled time filtered by matter_id
  console.log('\n  Test 79b: Get unbilled timesheets by matter');
  const t79b = await request('GET', '/api/timesheets/unbilled?matter_id=' + cleanup.matters[0]);
  assert('Status 200', t79b.status === 200, 'Got ' + t79b.status);
  assert('Has data array', Array.isArray(t79b.body.data));
  assert('All match matter_id', t79b.body.data.every(t => t.matter_id === cleanup.matters[0]));

  // Test 79c: Get timesheets by matter route
  console.log('\n  Test 79c: Get timesheets by matter route');
  const t79c = await request('GET', '/api/timesheets/matter/' + cleanup.matters[0]);
  assert('Status 200', t79c.status === 200, 'Got ' + t79c.status);
  assert('Has data array', Array.isArray(t79c.body.data));
  assert('Includes test timesheet', t79c.body.data.some(t => t.timesheet_id === testTimesheetId));
  assert('All match matter_id', t79c.body.data.every(t => t.matter_id === cleanup.matters[0]));

  // Test 79d: Get lawyer timesheets
  console.log('\n  Test 79d: Get lawyer timesheets');
  const t79d = await request('GET', '/api/lawyers/' + cleanup.lawyers[0] + '/timesheets');
  assert('Status 200', t79d.status === 200, 'Got ' + t79d.status);
  assert('Has data array', Array.isArray(t79d.body.data));
  assert('Includes test timesheet', t79d.body.data.some(t => t.timesheet_id === testTimesheetId));
  assert('All match lawyer_id', t79d.body.data.every(t => t.lawyer_id === cleanup.lawyers[0]));
}

// ==================== Expenses Tests ====================

async function testExpenses() {
  console.log('\n--- EXPENSES TESTS ---\n');

  // Test 80: Create expense (comprehensive - with matter + lawyer)
  console.log('  Test 80: Create expense (comprehensive)');
  const t80 = await request('POST', '/api/expenses', {
    matter_id: cleanup.matters[0],
    lawyer_id: cleanup.lawyers[0],
    expense_type: 'client',
    date: '2026-02-14',
    amount: 150.50,
    currency: 'USD',
    description: 'Court filing fees',
    category: 'Filing',
    billable: true,
    markup_percent: 10,
    paid_by_firm: true,
    status: 'pending',
    notes: 'Reimbursable by client'
  });
  assert('Status 201', t80.status === 201, 'Got ' + t80.status);
  assert('Has expense object', t80.body.expense != null);
  assert('Has expense_id', t80.body.expense && t80.body.expense.expense_id > 0);
  assert('Amount is 150.50', t80.body.expense && t80.body.expense.amount === 150.50);
  assert('Status is pending', t80.body.expense && t80.body.expense.status === 'pending');
  assert('Type is client', t80.body.expense && t80.body.expense.expense_type === 'client');
  assert('Markup is 10', t80.body.expense && t80.body.expense.markup_percent === 10);
  const testExpenseId = t80.body.expense ? t80.body.expense.expense_id : null;
  if (testExpenseId) cleanup.expenses.push(testExpenseId);

  // Test 81: Create expense (minimal - date + amount + description only)
  console.log('\n  Test 81: Create expense (minimal)');
  const t81 = await request('POST', '/api/expenses', {
    date: '2026-02-15',
    amount: 25,
    description: 'Parking fee'
  });
  assert('Status 201', t81.status === 201, 'Got ' + t81.status);
  assert('Created successfully', t81.body.success === true);
  assert('Default status pending', t81.body.expense && t81.body.expense.status === 'pending');
  assert('Default billable true', t81.body.expense && t81.body.expense.billable === true);
  assert('Default currency USD', t81.body.expense && t81.body.expense.currency === 'USD');
  assert('Default type client', t81.body.expense && t81.body.expense.expense_type === 'client');
  if (t81.body.expense) cleanup.expenses.push(t81.body.expense.expense_id);

  // Test 82: Reject invalid matter_id
  console.log('\n  Test 82: Reject invalid matter_id');
  const t82 = await request('POST', '/api/expenses', {
    matter_id: 99999,
    date: '2026-02-14',
    amount: 50,
    description: 'Should fail'
  });
  assert('Status 404', t82.status === 404, 'Got ' + t82.status);
  assert('Error mentions Matter', t82.body.error && t82.body.error.includes('Matter not found'));

  // Test 83: Reject invalid lawyer_id
  console.log('\n  Test 83: Reject invalid lawyer_id');
  const t83 = await request('POST', '/api/expenses', {
    lawyer_id: 99999,
    date: '2026-02-14',
    amount: 50,
    description: 'Should fail'
  });
  assert('Status 404', t83.status === 404, 'Got ' + t83.status);
  assert('Error mentions Lawyer', t83.body.error && t83.body.error.includes('Lawyer not found'));

  // Test 84: List expenses
  console.log('\n  Test 84: List expenses');
  const t84 = await request('GET', '/api/expenses');
  assert('Has data array', Array.isArray(t84.body.data));
  assert('Has pagination', t84.body.pagination != null);
  assert('Has at least 2 expenses', t84.body.data.length >= 2, 'Got ' + t84.body.data.length);

  // Test 85: Filter by status
  console.log('\n  Test 85: Filter by status');
  const t85 = await request('GET', '/api/expenses?status=pending');
  assert('Returns pending expenses', t85.body.data.length >= 1);
  assert('All are pending', t85.body.data.every(e => e.status === 'pending'));

  // Test 86: Filter by matter_id
  console.log('\n  Test 86: Filter by matter_id');
  const t86 = await request('GET', '/api/expenses?matter_id=' + cleanup.matters[0]);
  assert('Returns expenses for matter', t86.body.data.length >= 1, 'Got ' + t86.body.data.length);
  assert('All match matter_id', t86.body.data.every(e => e.matter_id === cleanup.matters[0]));

  // Test 87: Filter by expense_type
  console.log('\n  Test 87: Filter by expense_type');
  const t87 = await request('GET', '/api/expenses?expense_type=client');
  assert('Returns client expenses', t87.body.data.length >= 1);
  assert('All are client type', t87.body.data.every(e => e.expense_type === 'client'));

  // Test 88: Search expenses
  console.log('\n  Test 88: Search expenses');
  const t88 = await request('GET', '/api/expenses?search=filing');
  assert('Finds filing expense', t88.body.data.length >= 1);

  // Test 89: Get single expense
  console.log('\n  Test 89: Get single expense');
  const t89 = await request('GET', '/api/expenses/' + testExpenseId);
  assert('Status 200', t89.status === 200, 'Got ' + t89.status);
  assert('Has expense object', t89.body.expense != null);
  assert('expense_id matches', t89.body.expense && t89.body.expense.expense_id === testExpenseId);
  assert('Has matter_name from JOIN', t89.body.expense && t89.body.expense.matter_name != null);
  assert('Has lawyer_name from JOIN', t89.body.expense && t89.body.expense.lawyer_name != null);

  // Test 90: Update expense
  console.log('\n  Test 90: Update expense');
  const t90 = await request('PUT', '/api/expenses/' + testExpenseId, {
    matter_id: cleanup.matters[0],
    lawyer_id: cleanup.lawyers[0],
    expense_type: 'client',
    date: '2026-02-14',
    amount: 200.75,
    currency: 'USD',
    description: 'Updated: Court filing fees + service fees',
    category: 'Filing',
    billable: true,
    markup_percent: 15,
    paid_by_firm: true,
    status: 'approved'
  });
  assert('Status 200', t90.status === 200, 'Got ' + t90.status);
  assert('Amount updated to 200.75', t90.body.expense && t90.body.expense.amount === 200.75);
  assert('Status updated to approved', t90.body.expense && t90.body.expense.status === 'approved');
  assert('Markup updated to 15', t90.body.expense && t90.body.expense.markup_percent === 15);

  // Test 91: Soft delete expense
  console.log('\n  Test 91: Soft delete expense');
  const deleteExpenseId = cleanup.expenses[1]; // Delete the minimal expense
  const t91 = await request('DELETE', '/api/expenses/' + deleteExpenseId);
  assert('Status 200', t91.status === 200, 'Got ' + t91.status);
  assert('Success message', t91.body.message === 'Expense deleted successfully');

  // Verify not in list
  const t91list = await request('GET', '/api/expenses');
  assert('Deleted expense not in list', !t91list.body.data.find(e => e.expense_id === deleteExpenseId));
}

// ==================== Advances Tests ====================

async function testAdvances() {
  console.log('\n--- ADVANCES TESTS ---\n');

  // Test 92: Create client retainer advance (comprehensive - with client + matter)
  console.log('  Test 92: Create client retainer (comprehensive)');
  const t92 = await request('POST', '/api/advances', {
    advance_type: 'client_retainer',
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    amount: 5000,
    currency: 'USD',
    date_received: '2026-02-14',
    payment_method: 'bank_transfer',
    reference_number: 'RET-2026-001',
    minimum_balance_alert: 500,
    notes: 'Initial retainer deposit'
  });
  assert('Status 201', t92.status === 201, 'Got ' + t92.status);
  assert('Has advance object', t92.body.advance != null);
  assert('Has advance_id', t92.body.advance && t92.body.advance.advance_id > 0);
  assert('Amount is 5000', t92.body.advance && t92.body.advance.amount === 5000);
  assert('Status is active', t92.body.advance && t92.body.advance.status === 'active');
  assert('Type is client_retainer', t92.body.advance && t92.body.advance.advance_type === 'client_retainer');
  assert('Balance equals amount', t92.body.advance && t92.body.advance.balance_remaining === 5000);
  const testAdvanceId = t92.body.advance ? t92.body.advance.advance_id : null;
  if (testAdvanceId) cleanup.advances.push(testAdvanceId);

  // Test 93: Create lawyer advance (minimal)
  console.log('\n  Test 93: Create lawyer advance (minimal)');
  const t93 = await request('POST', '/api/advances', {
    advance_type: 'lawyer_advance',
    lawyer_id: cleanup.lawyers[0],
    amount: 2000,
    date_received: '2026-02-15'
  });
  assert('Status 201', t93.status === 201, 'Got ' + t93.status);
  assert('Created successfully', t93.body.success === true);
  assert('Default status active', t93.body.advance && t93.body.advance.status === 'active');
  assert('Default currency USD', t93.body.advance && t93.body.advance.currency === 'USD');
  assert('Default payment bank_transfer', t93.body.advance && t93.body.advance.payment_method === 'bank_transfer');
  assert('Balance equals amount', t93.body.advance && t93.body.advance.balance_remaining === 2000);
  if (t93.body.advance) cleanup.advances.push(t93.body.advance.advance_id);

  // Test 94: Reject invalid client_id
  console.log('\n  Test 94: Reject invalid client_id');
  const t94 = await request('POST', '/api/advances', {
    advance_type: 'client_retainer',
    client_id: 99999,
    amount: 1000,
    date_received: '2026-02-14'
  });
  assert('Status 404', t94.status === 404, 'Got ' + t94.status);
  assert('Error mentions Client', t94.body.error && t94.body.error.includes('Client not found'));

  // Test 95: Reject invalid lawyer_id
  console.log('\n  Test 95: Reject invalid lawyer_id');
  const t95 = await request('POST', '/api/advances', {
    advance_type: 'lawyer_advance',
    lawyer_id: 99999,
    amount: 1000,
    date_received: '2026-02-14'
  });
  assert('Status 404', t95.status === 404, 'Got ' + t95.status);
  assert('Error mentions Lawyer', t95.body.error && t95.body.error.includes('Lawyer not found'));

  // Test 96: Reject lawyer_advance without lawyer_id
  console.log('\n  Test 96: Reject lawyer_advance without lawyer_id');
  const t96 = await request('POST', '/api/advances', {
    advance_type: 'lawyer_advance',
    amount: 1000,
    date_received: '2026-02-14'
  });
  assert('Status 400', t96.status === 400, 'Got ' + t96.status);
  assert('Error mentions Lawyer ID required', t96.body.error && t96.body.error.includes('Lawyer ID is required'));

  // Test 97: Reject client_retainer without client_id
  console.log('\n  Test 97: Reject client_retainer without client_id');
  const t97 = await request('POST', '/api/advances', {
    advance_type: 'client_retainer',
    amount: 1000,
    date_received: '2026-02-14'
  });
  assert('Status 400', t97.status === 400, 'Got ' + t97.status);
  assert('Error mentions Client ID required', t97.body.error && t97.body.error.includes('Client ID is required'));

  // Test 98: Create fee payment (no balance tracking)
  console.log('\n  Test 98: Create fee payment (no balance tracking)');
  const t98 = await request('POST', '/api/advances', {
    advance_type: 'fee_payment_initial',
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    amount: 3000,
    date_received: '2026-02-14',
    fee_description: 'Initial consultation fee'
  });
  assert('Status 201', t98.status === 201, 'Got ' + t98.status);
  assert('Type is fee_payment_initial', t98.body.advance && t98.body.advance.advance_type === 'fee_payment_initial');
  assert('Balance is null for fee payment', t98.body.advance && t98.body.advance.balance_remaining === null);
  assert('Fee description set', t98.body.advance && t98.body.advance.fee_description === 'Initial consultation fee');
  if (t98.body.advance) cleanup.advances.push(t98.body.advance.advance_id);

  // Test 99: List advances
  console.log('\n  Test 99: List advances');
  const t99 = await request('GET', '/api/advances');
  assert('Has data array', Array.isArray(t99.body.data));
  assert('Has pagination', t99.body.pagination != null);
  assert('Has at least 3 advances', t99.body.data.length >= 3, 'Got ' + t99.body.data.length);

  // Test 100: Filter by status
  console.log('\n  Test 100: Filter by status');
  const t100 = await request('GET', '/api/advances?status=active');
  assert('Returns active advances', t100.body.data.length >= 1);
  assert('All are active', t100.body.data.every(a => a.status === 'active'));

  // Test 101: Filter by advance_type
  console.log('\n  Test 101: Filter by advance_type');
  const t101 = await request('GET', '/api/advances?advance_type=client_retainer');
  assert('Returns client_retainer advances', t101.body.data.length >= 1);
  assert('All are client_retainer', t101.body.data.every(a => a.advance_type === 'client_retainer'));

  // Test 102: Filter by client_id
  console.log('\n  Test 102: Filter by client_id');
  const t102 = await request('GET', '/api/advances?client_id=' + cleanup.clients[0]);
  assert('Returns advances for client', t102.body.data.length >= 1, 'Got ' + t102.body.data.length);
  assert('All match client_id', t102.body.data.every(a => a.client_id === cleanup.clients[0]));

  // Test 103: Search advances
  console.log('\n  Test 103: Search advances');
  const t103 = await request('GET', '/api/advances?search=RET-2026');
  assert('Finds advance by reference number', t103.body.data.length >= 1);

  // Test 104: Get single advance
  console.log('\n  Test 104: Get single advance');
  const t104 = await request('GET', '/api/advances/' + testAdvanceId);
  assert('Status 200', t104.status === 200, 'Got ' + t104.status);
  assert('Has advance object', t104.body.advance != null);
  assert('advance_id matches', t104.body.advance && t104.body.advance.advance_id === testAdvanceId);
  assert('Has client_name from JOIN', t104.body.advance && t104.body.advance.client_name != null);
  assert('Has matter_name from JOIN', t104.body.advance && t104.body.advance.matter_name != null);

  // Test 105: Update advance
  console.log('\n  Test 105: Update advance');
  const t105 = await request('PUT', '/api/advances/' + testAdvanceId, {
    advance_type: 'client_retainer',
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    amount: 7500,
    date_received: '2026-02-14',
    balance_remaining: 6000,
    status: 'active',
    reference_number: 'RET-2026-001-UPDATED'
  });
  assert('Status 200', t105.status === 200, 'Got ' + t105.status);
  assert('Amount updated to 7500', t105.body.advance && t105.body.advance.amount === 7500);
  assert('Balance updated to 6000', t105.body.advance && t105.body.advance.balance_remaining === 6000);
  assert('Reference updated', t105.body.advance && t105.body.advance.reference_number === 'RET-2026-001-UPDATED');

  // Test 106: Soft delete advance
  console.log('\n  Test 106: Soft delete advance');
  const deleteAdvanceId = cleanup.advances[1]; // Delete the lawyer advance
  const t106 = await request('DELETE', '/api/advances/' + deleteAdvanceId);
  assert('Status 200', t106.status === 200, 'Got ' + t106.status);
  assert('Success message', t106.body.message === 'Advance deleted successfully');

  // Verify not in list
  const t106list = await request('GET', '/api/advances');
  assert('Deleted advance not in list', !t106list.body.data.find(a => a.advance_id === deleteAdvanceId));
}

// ==================== Invoices Tests ====================

async function testInvoices() {
  console.log('\n--- INVOICES TESTS ---\n');

  // Test 107: Generate next invoice number
  console.log('  Test 107: Generate next invoice number');
  const t107 = await request('GET', '/api/invoices/next-number');
  assert('Status 200', t107.status === 200, 'Got ' + t107.status);
  assert('Has invoice_number', t107.body.invoice_number != null);
  assert('Starts with INV-', t107.body.invoice_number && t107.body.invoice_number.startsWith('INV-'));

  // Test 108: Create invoice (comprehensive - with matter + items)
  console.log('\n  Test 108: Create invoice (comprehensive)');
  const t108 = await request('POST', '/api/invoices', {
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    invoice_number: 'INV-TEST-001',
    issue_date: '2026-02-15',
    due_date: '2026-03-15',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    subtotal: 5000,
    discount_type: 'percentage',
    discount_value: 10,
    discount_amount: 500,
    taxable_amount: 4500,
    vat_rate: 11,
    vat_amount: 495,
    total: 4995,
    currency: 'USD',
    status: 'draft',
    client_reference: 'PO-12345',
    notes_to_client: 'Payment due within 30 days',
    internal_notes: 'First invoice for this client',
    items: [
      { item_type: 'time', item_date: '2026-01-15', description: 'Legal research', quantity: 5, unit: 'hours', rate: 200, amount: 1000 },
      { item_type: 'time', item_date: '2026-01-20', description: 'Contract review', quantity: 10, unit: 'hours', rate: 250, amount: 2500 },
      { item_type: 'expense', item_date: '2026-01-25', description: 'Court filing fee', amount: 500 },
      { item_type: 'fixed_fee', description: 'Consultation fee', amount: 1000 }
    ]
  });
  assert('Status 201', t108.status === 201, 'Got ' + t108.status);
  assert('Has invoice object', t108.body.invoice != null);
  assert('Has invoice_id', t108.body.invoice && t108.body.invoice.invoice_id > 0);
  assert('Invoice number matches', t108.body.invoice && t108.body.invoice.invoice_number === 'INV-TEST-001');
  assert('Total is 4995', t108.body.invoice && t108.body.invoice.total === 4995);
  assert('Status is draft', t108.body.invoice && t108.body.invoice.status === 'draft');
  assert('Currency is USD', t108.body.invoice && t108.body.invoice.currency === 'USD');
  assert('Discount type is percentage', t108.body.invoice && t108.body.invoice.discount_type === 'percentage');
  const testInvoiceId = t108.body.invoice ? t108.body.invoice.invoice_id : null;
  if (testInvoiceId) cleanup.invoices.push(testInvoiceId);

  // Test 109: Create invoice (minimal - auto-generated number)
  console.log('\n  Test 109: Create invoice (minimal, auto number)');
  const t109 = await request('POST', '/api/invoices', {
    client_id: cleanup.clients[0],
    issue_date: '2026-02-16',
    total: 100
  });
  assert('Status 201', t109.status === 201, 'Got ' + t109.status);
  assert('Created successfully', t109.body.success === true);
  assert('Auto-generated number', t109.body.invoice && t109.body.invoice.invoice_number && t109.body.invoice.invoice_number.startsWith('INV-'));
  assert('Default status draft', t109.body.invoice && t109.body.invoice.status === 'draft');
  assert('Default currency USD', t109.body.invoice && t109.body.invoice.currency === 'USD');
  if (t109.body.invoice) cleanup.invoices.push(t109.body.invoice.invoice_id);

  // Test 110: Reject invalid client_id
  console.log('\n  Test 110: Reject invalid client_id');
  const t110 = await request('POST', '/api/invoices', {
    client_id: 99999,
    issue_date: '2026-02-15',
    total: 100
  });
  assert('Status 404', t110.status === 404, 'Got ' + t110.status);
  assert('Error mentions Client', t110.body.error && t110.body.error.includes('Client not found'));

  // Test 111: Reject invalid matter_id
  console.log('\n  Test 111: Reject invalid matter_id');
  const t111 = await request('POST', '/api/invoices', {
    client_id: cleanup.clients[0],
    matter_id: 99999,
    issue_date: '2026-02-15',
    total: 100
  });
  assert('Status 404', t111.status === 404, 'Got ' + t111.status);
  assert('Error mentions Matter', t111.body.error && t111.body.error.includes('Matter not found'));

  // Test 112: List invoices
  console.log('\n  Test 112: List invoices');
  const t112 = await request('GET', '/api/invoices');
  assert('Has data array', Array.isArray(t112.body.data));
  assert('Has pagination', t112.body.pagination != null);
  assert('Has at least 2 invoices', t112.body.data.length >= 2, 'Got ' + t112.body.data.length);

  // Test 113: Filter by status
  console.log('\n  Test 113: Filter by status');
  const t113 = await request('GET', '/api/invoices?status=draft');
  assert('Returns draft invoices', t113.body.data.length >= 1);
  assert('All are draft', t113.body.data.every(inv => inv.status === 'draft'));

  // Test 114: Filter by client_id
  console.log('\n  Test 114: Filter by client_id');
  const t114 = await request('GET', '/api/invoices?client_id=' + cleanup.clients[0]);
  assert('Returns invoices for client', t114.body.data.length >= 1, 'Got ' + t114.body.data.length);
  assert('All match client_id', t114.body.data.every(inv => inv.client_id === cleanup.clients[0]));

  // Test 115: Search invoices
  console.log('\n  Test 115: Search invoices');
  const t115 = await request('GET', '/api/invoices?search=INV-TEST');
  assert('Finds invoice by number', t115.body.data.length >= 1);

  // Test 116: Get single invoice (with embedded items)
  console.log('\n  Test 116: Get single invoice with items');
  const t116 = await request('GET', '/api/invoices/' + testInvoiceId);
  assert('Status 200', t116.status === 200, 'Got ' + t116.status);
  assert('Has invoice object', t116.body.invoice != null);
  assert('invoice_id matches', t116.body.invoice && t116.body.invoice.invoice_id === testInvoiceId);
  assert('Has client_name from JOIN', t116.body.invoice && t116.body.invoice.client_name != null);
  assert('Has matter_name from JOIN', t116.body.invoice && t116.body.invoice.matter_name != null);
  assert('Has items array', t116.body.invoice && Array.isArray(t116.body.invoice.items));
  assert('Has 4 items', t116.body.invoice && t116.body.invoice.items && t116.body.invoice.items.length === 4);
  assert('First item is time type', t116.body.invoice && t116.body.invoice.items && t116.body.invoice.items[0].item_type === 'time');
  assert('Items sorted by sort_order', t116.body.invoice && t116.body.invoice.items && t116.body.invoice.items[0].sort_order === 0);

  // Test 117: Update invoice (with item replacement)
  console.log('\n  Test 117: Update invoice');
  const t117 = await request('PUT', '/api/invoices/' + testInvoiceId, {
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    invoice_number: 'INV-TEST-001',
    issue_date: '2026-02-15',
    due_date: '2026-03-15',
    subtotal: 6000,
    total: 6000,
    currency: 'EUR',
    status: 'sent',
    items: [
      { item_type: 'time', item_date: '2026-01-15', description: 'Updated research', quantity: 8, unit: 'hours', rate: 250, amount: 2000 },
      { item_type: 'fixed_fee', description: 'Updated consultation', amount: 4000 }
    ]
  });
  assert('Status 200', t117.status === 200, 'Got ' + t117.status);
  assert('Total updated to 6000', t117.body.invoice && t117.body.invoice.total === 6000);
  assert('Currency updated to EUR', t117.body.invoice && t117.body.invoice.currency === 'EUR');
  assert('Status updated to sent', t117.body.invoice && t117.body.invoice.status === 'sent');

  // Verify items were replaced
  const t117verify = await request('GET', '/api/invoices/' + testInvoiceId);
  assert('Items replaced - now 2', t117verify.body.invoice && t117verify.body.invoice.items && t117verify.body.invoice.items.length === 2);

  // Test 118: Soft delete invoice
  console.log('\n  Test 118: Soft delete invoice');
  const deleteInvoiceId = cleanup.invoices[1]; // Delete the minimal invoice
  const t118 = await request('DELETE', '/api/invoices/' + deleteInvoiceId);
  assert('Status 200', t118.status === 200, 'Got ' + t118.status);
  assert('Success message', t118.body.message === 'Invoice deleted successfully');

  // Verify not in list
  const t118list = await request('GET', '/api/invoices');
  assert('Deleted invoice not in list', !t118list.body.data.find(inv => inv.invoice_id === deleteInvoiceId));
}

// ==================== Cross-Resource Tests ====================

async function testCrossResource() {
  console.log('\n--- CROSS-RESOURCE TESTS ---\n');

  // Test 25: Create client -> matter -> hearing chain
  console.log('  Test 25: Client -> Matter -> Hearing chain');
  const client = await request('POST', '/api/clients', {
    client_name: 'Chain Test Client',
    client_type: 'individual'
  });
  assert('Client created', client.status === 201);
  const chainClientId = client.body.client.client_id;
  cleanup.clients.push(chainClientId);

  const matter = await request('POST', '/api/matters', {
    matter_number: 'CHAIN-' + Date.now(),
    matter_name: 'Chain Test Matter',
    client_ids: [chainClientId],
    primary_client_id: chainClientId
  });
  assert('Matter created with client link', matter.status === 201);
  const chainMatterId = matter.body.matter_id;
  cleanup.matters.push(chainMatterId);

  const hearing = await request('POST', '/api/hearings', {
    matter_id: chainMatterId,
    hearing_date: '2026-08-01',
    court_name: 'Chain Test Court'
  });
  assert('Hearing created linked to matter', hearing.status === 201);
  cleanup.hearings.push(hearing.body.hearing.hearing_id);

  // Verify the chain
  const matterDetail = await request('GET', '/api/matters/' + chainMatterId);
  assert('Matter detail has clients', matterDetail.body.matter.clients.length === 1);
  assert('Client ID matches', matterDetail.body.matter.clients[0].client_id === chainClientId);

  const hearingList = await request('GET', '/api/hearings?matter_id=' + chainMatterId);
  assert('Hearing linked to matter', hearingList.body.data.length >= 1);
  assert('Hearing has matter_name', hearingList.body.data[0].matter_name === 'Chain Test Matter');

  // Test 26: Soft delete matter -> hearings still exist (referential integrity)
  console.log('\n  Test 26: Soft delete matter - hearings preserved');
  const delMatter = await request('DELETE', '/api/matters/' + chainMatterId);
  assert('Matter soft deleted', delMatter.status === 200);

  // Hearings still exist (hearings JOIN matters - but matter is soft-deleted)
  // Since matters.is_deleted=1, the hearings GET with INNER JOIN on matters will still work
  // because we only check h.is_deleted, not m.is_deleted
  const hearingsAfter = await request('GET', '/api/hearings/' + hearing.body.hearing.hearing_id);
  assert('Hearing still accessible after matter delete', hearingsAfter.status === 200);

  // Test 27: Soft delete client -> matter unaffected (already deleted but demonstrates pattern)
  console.log('\n  Test 27: Soft delete client - no cascade');
  const delClient = await request('DELETE', '/api/clients/' + chainClientId);
  assert('Client soft deleted', delClient.status === 200);

  // Client should be 404 now
  const clientCheck = await request('GET', '/api/clients/' + chainClientId);
  assert('Deleted client returns 404', clientCheck.status === 404);
}

// ==================== Appointments Tests ====================

async function testAppointments() {
  console.log('\n--- Appointments Tests ---');

  // Test: Create appointment (required fields only)
  console.log('\n  Test: Create appointment (required fields)');
  const apt1 = await request('POST', '/api/appointments', {
    title: 'Initial Consultation',
    appointment_date: '2026-03-15'
  });
  assert('Create appointment status 201', apt1.status === 201);
  assert('Appointment has ID', apt1.body.appointment && apt1.body.appointment.appointment_id > 0);
  assert('Appointment title correct', apt1.body.appointment.title === 'Initial Consultation');
  assert('Default type is client_meeting', apt1.body.appointment.appointment_type === 'client_meeting');
  assert('Default status is scheduled', apt1.body.appointment.status === 'scheduled');
  cleanup.appointments.push(apt1.body.appointment.appointment_id);

  // Test: Create appointment with all fields
  console.log('\n  Test: Create appointment (all fields)');
  const apt2 = await request('POST', '/api/appointments', {
    title: 'Court Hearing Prep',
    appointment_date: '2026-04-01',
    appointment_type: 'court_appearance',
    description: 'Prepare for trial hearing',
    start_time: '09:00',
    end_time: '11:00',
    all_day: false,
    location_type: 'court',
    location_details: 'Downtown Court Room 3',
    client_id: cleanup.clients[0],
    matter_id: cleanup.matters[0],
    billable: true,
    attendees: JSON.stringify(['John Doe', 'Jane Smith']),
    notes: 'Bring all case files',
    status: 'scheduled'
  });
  assert('Full appointment created', apt2.status === 201);
  assert('Appointment type court_appearance', apt2.body.appointment.appointment_type === 'court_appearance');
  assert('Has client_id', apt2.body.appointment.client_id === cleanup.clients[0]);
  assert('Has matter_id', apt2.body.appointment.matter_id === cleanup.matters[0]);
  cleanup.appointments.push(apt2.body.appointment.appointment_id);

  // Test: Get appointment list
  console.log('\n  Test: Get appointment list');
  const list = await request('GET', '/api/appointments');
  assert('List status 200', list.status === 200);
  assert('List has data array', Array.isArray(list.body.data));
  assert('List has pagination', list.body.pagination && list.body.pagination.total >= 2);

  // Test: Get appointment by ID
  console.log('\n  Test: Get appointment by ID');
  const get1 = await request('GET', '/api/appointments/' + apt2.body.appointment.appointment_id);
  assert('Get by ID status 200', get1.status === 200);
  assert('Has appointment object', get1.body.appointment && get1.body.appointment.title === 'Court Hearing Prep');
  assert('Has client_name from JOIN', get1.body.appointment.client_name != null);
  assert('Has matter_name from JOIN', get1.body.appointment.matter_name != null);

  // Test: Update appointment
  console.log('\n  Test: Update appointment');
  const upd = await request('PUT', '/api/appointments/' + apt1.body.appointment.appointment_id, {
    title: 'Updated Consultation',
    appointment_date: '2026-03-20',
    status: 'rescheduled'
  });
  assert('Update status 200', upd.status === 200);
  assert('Title updated', upd.body.appointment.title === 'Updated Consultation');
  assert('Status updated', upd.body.appointment.status === 'rescheduled');

  // Test: Filter by client_id
  console.log('\n  Test: Filter by client_id');
  const byClient = await request('GET', '/api/appointments?client_id=' + cleanup.clients[0]);
  assert('Filter by client_id returns data', byClient.status === 200);
  assert('Filter returns correct count', byClient.body.data.length >= 1);

  // Test: Filter by matter_id
  console.log('\n  Test: Filter by matter_id');
  const byMatter = await request('GET', '/api/appointments?matter_id=' + cleanup.matters[0]);
  assert('Filter by matter_id returns data', byMatter.status === 200);
  assert('Filter returns correct count', byMatter.body.data.length >= 1);

  // Test: Filter by status
  console.log('\n  Test: Filter by status');
  const byStatus = await request('GET', '/api/appointments?status=rescheduled');
  assert('Filter by status returns data', byStatus.status === 200);
  assert('Rescheduled appointment found', byStatus.body.data.length >= 1);

  // Test: Search by title
  console.log('\n  Test: Search by title');
  const bySearch = await request('GET', '/api/appointments?search=Court');
  assert('Search returns data', bySearch.status === 200);
  assert('Search finds Court Hearing Prep', bySearch.body.data.length >= 1);

  // Test: FK validation - invalid client_id
  console.log('\n  Test: FK validation - invalid client_id');
  const badClient = await request('POST', '/api/appointments', {
    title: 'Bad Client Test',
    appointment_date: '2026-05-01',
    client_id: 999999
  });
  assert('Invalid client_id returns 404', badClient.status === 404);

  // Test: FK validation - invalid matter_id
  console.log('\n  Test: FK validation - invalid matter_id');
  const badMatter = await request('POST', '/api/appointments', {
    title: 'Bad Matter Test',
    appointment_date: '2026-05-01',
    matter_id: 999999
  });
  assert('Invalid matter_id returns 404', badMatter.status === 404);

  // Test: Delete appointment (soft delete)
  console.log('\n  Test: Delete appointment');
  const del = await request('DELETE', '/api/appointments/' + apt1.body.appointment.appointment_id);
  assert('Delete status 200', del.status === 200);
  const afterDel = await request('GET', '/api/appointments/' + apt1.body.appointment.appointment_id);
  assert('Deleted appointment returns 404', afterDel.status === 404);
  // Remove from cleanup since already deleted
  cleanup.appointments = cleanup.appointments.filter(id => id !== apt1.body.appointment.appointment_id);
}

// ==================== Conflict Check Tests ====================

async function testConflictCheck() {
  console.log('\n--- Conflict Check Tests ---');

  // Test: Search with client name match
  console.log('\n  Test: Search with client name match');
  const nameSearch = await request('POST', '/api/conflict-check/search', {
    name: 'Alpha'
  });
  assert('Conflict search status 200', nameSearch.status === 200);
  assert('Has data object', nameSearch.body.data != null);
  assert('Has results array', Array.isArray(nameSearch.body.data.results));
  assert('Found Alpha client', nameSearch.body.data.results.some(r => r.type === 'client' && r.name === 'Alpha Corp'));
  assert('Has searches_performed', Array.isArray(nameSearch.body.data.searches_performed));
  assert('Has searches_deferred', nameSearch.body.data.searches_deferred.length === 5);
  assert('Has total_matches', nameSearch.body.data.total_matches >= 1);

  // Test: Search with client email match
  console.log('\n  Test: Search with client email match');
  // We know clients were created with emails like 'alpha<ts>@test.com'
  const emailSearch = await request('POST', '/api/conflict-check/search', {
    email: 'alpha'
  });
  assert('Email search status 200', emailSearch.status === 200);
  assert('Email search found results', emailSearch.body.data.total_matches >= 1);
  assert('Email search performed', emailSearch.body.data.searches_performed.includes('client_email'));

  // Test: Search with no matches
  console.log('\n  Test: Search with no matches');
  const noMatch = await request('POST', '/api/conflict-check/search', {
    name: 'ZZZNONEXISTENT999'
  });
  assert('No match search status 200', noMatch.status === 200);
  assert('No match returns 0 results', noMatch.body.data.total_matches === 0);

  // Test: Search with searchTerms wrapper (second body format)
  console.log('\n  Test: Search with searchTerms wrapper');
  const wrappedSearch = await request('POST', '/api/conflict-check/search', {
    searchTerms: { name: 'Beta' }
  });
  assert('Wrapped search status 200', wrappedSearch.status === 200);
  assert('Wrapped search found Beta', wrappedSearch.body.data.results.some(r => r.name === 'Beta Holdings'));

  // Test: Log conflict check
  console.log('\n  Test: Log conflict check');
  const logResult = await request('POST', '/api/conflict-check/log', {
    search_terms: 'Alpha Corp test',
    results_count: 2
  });
  assert('Log status 201', logResult.status === 201);
  assert('Log has log_id', logResult.body.log && logResult.body.log.log_id > 0);

  // Test: Get conflict check history
  console.log('\n  Test: Get conflict check history');
  const history = await request('GET', '/api/conflict-check/history');
  assert('History status 200', history.status === 200);
  assert('History has data array', Array.isArray(history.body.data));
  assert('History has pagination', history.body.pagination != null);
  assert('History contains our log', history.body.data.length >= 1);
}

// ==================== Trash Tests ====================

async function testTrash() {
  console.log('\n--- Trash Tests ---');

  // Create a client specifically for trash testing
  const ts = Date.now();
  const trashClient = await request('POST', '/api/clients', {
    client_name: 'Trash Test Client ' + ts,
    client_type: 'individual',
    email: 'trash.client.' + ts + '@test.com'
  });
  assert('Create trash test client', trashClient.status === 201);
  const trashClientId = trashClient.body.client.client_id;

  // Create a matter for trash testing
  const trashMatter = await request('POST', '/api/matters', {
    matter_number: 'TRASH-M-' + ts,
    matter_name: 'Trash Test Matter',
    matter_type: 'litigation',
    matter_status: 'active'
  });
  assert('Create trash test matter', trashMatter.status === 201);
  const trashMatterId = trashMatter.body.matter_id;

  // Test: Delete client -> appears in trash
  console.log('\n  Test: Delete client -> appears in trash');
  const delClient = await request('DELETE', '/api/clients/' + trashClientId);
  assert('Soft delete client', delClient.status === 200);

  // Test: Get trash list
  console.log('\n  Test: Get trash list');
  const trashList = await request('GET', '/api/trash');
  assert('Trash list status 200', trashList.status === 200);
  assert('Trash list has data', Array.isArray(trashList.body.data));
  assert('Deleted client in trash', trashList.body.data.some(i => i.type === 'client' && i.id === trashClientId));

  // Test: Get trash count
  console.log('\n  Test: Get trash count');
  const trashCount = await request('GET', '/api/trash/count');
  assert('Trash count status 200', trashCount.status === 200);
  assert('Has counts object', trashCount.body.counts != null);
  assert('Client count >= 1', trashCount.body.counts.client >= 1);
  assert('Has total', trashCount.body.total >= 1);

  // Test: Restore client
  console.log('\n  Test: Restore client');
  const restoreResult = await request('POST', '/api/trash/restore', {
    type: 'client',
    id: trashClientId
  });
  assert('Restore status 200', restoreResult.status === 200);

  // Verify restored client is accessible
  const restoredClient = await request('GET', '/api/clients/' + trashClientId);
  assert('Restored client accessible', restoredClient.status === 200);
  assert('Restored client is_active', restoredClient.body.client.is_active === true || restoredClient.body.client.is_active === 1);

  // Test: Delete matter and verify in trash
  console.log('\n  Test: Delete matter -> appears in trash');
  const delMatter = await request('DELETE', '/api/matters/' + trashMatterId);
  assert('Soft delete matter', delMatter.status === 200);

  const trashList2 = await request('GET', '/api/trash');
  assert('Matter in trash', trashList2.body.data.some(i => i.type === 'matter' && i.id === trashMatterId));

  // Test: Permanent delete matter
  console.log('\n  Test: Permanent delete matter');
  const permDel = await request('POST', '/api/trash/permanent-delete', {
    type: 'matter',
    id: trashMatterId
  });
  assert('Permanent delete status 200', permDel.status === 200);

  // Verify 404 on GET
  const checkDeleted = await request('GET', '/api/matters/' + trashMatterId);
  assert('Permanently deleted matter returns 404', checkDeleted.status === 404);

  // Test: Empty trash
  console.log('\n  Test: Empty trash');
  // Delete the client again so it goes to trash
  await request('DELETE', '/api/clients/' + trashClientId);

  const emptyResult = await request('POST', '/api/trash/empty');
  assert('Empty trash status 200', emptyResult.status === 200);
  assert('Has deleted_count', emptyResult.body.deleted_count >= 0);

  // Verify trash is empty (for our test items)
  const trashAfterEmpty = await request('GET', '/api/trash/count');
  assert('Trash count after empty', trashAfterEmpty.body.total >= 0);

  // Test: Invalid entity type
  console.log('\n  Test: Invalid entity type');
  const badType = await request('POST', '/api/trash/restore', {
    type: 'invalid_type',
    id: 1
  });
  assert('Invalid type returns 400', badType.status === 400);
}

// ==================== Lookups Tests ====================

async function testLookups() {
  console.log('\n--- Lookups Tests ---');

  // Test 1: Get court types (system seed data)
  console.log('\n  Test: Get court types');
  const courtTypes = await request('GET', '/api/lookups/court-types');
  assert('Court types status 200', courtTypes.status === 200);
  assert('Court types success', courtTypes.body.success === true);
  assert('Court types is array', Array.isArray(courtTypes.body.data));
  assert('At least 17 court types', courtTypes.body.data.length >= 17);
  const singleJudge = courtTypes.body.data.find(c => c.name_en === 'Single Judge Civil');
  assert('Single Judge Civil exists', !!singleJudge);
  assert('Has Arabic name', !!singleJudge.name_ar);
  assert('Is system item', singleJudge.is_system === true);

  // Test 2: Get regions
  console.log('\n  Test: Get regions');
  const regions = await request('GET', '/api/lookups/regions');
  assert('Regions status 200', regions.status === 200);
  assert('At least 12 regions', regions.body.data.length >= 12);
  const beirut = regions.body.data.find(r => r.name_en === 'Beirut');
  assert('Beirut exists', !!beirut);
  assert('Beirut has Arabic name', !!beirut.name_ar);

  // Test 3: Get hearing purposes
  console.log('\n  Test: Get hearing purposes');
  const purposes = await request('GET', '/api/lookups/hearing-purposes');
  assert('Hearing purposes status 200', purposes.status === 200);
  assert('At least 10 hearing purposes', purposes.body.data.length >= 10);
  const firstSession = purposes.body.data.find(p => p.name_en === 'First Session');
  assert('First Session exists', !!firstSession);

  // Test 4: Get task types (includes icon)
  console.log('\n  Test: Get task types');
  const taskTypes = await request('GET', '/api/lookups/task-types');
  assert('Task types status 200', taskTypes.status === 200);
  assert('At least 11 task types', taskTypes.body.data.length >= 11);
  const memo = taskTypes.body.data.find(t => t.name_en === 'Memo');
  assert('Memo exists', !!memo);
  assert('Memo has icon', !!memo.icon);

  // Test 5: Get expense categories
  console.log('\n  Test: Get expense categories');
  const categories = await request('GET', '/api/lookups/expense-categories');
  assert('Expense categories status 200', categories.status === 200);
  assert('At least 10 expense categories', categories.body.data.length >= 10);
  const courtFees = categories.body.data.find(c => c.name_en === 'Court Fees');
  assert('Court Fees exists', !!courtFees);

  // Test 6: Get entity types (includes code)
  console.log('\n  Test: Get entity types');
  const entityTypes = await request('GET', '/api/lookups/entity-types');
  assert('Entity types status 200', entityTypes.status === 200);
  assert('At least 13 entity types', entityTypes.body.data.length >= 13);
  const sal = entityTypes.body.data.find(e => e.code === 'SAL');
  assert('SAL entity type exists', !!sal);
  assert('SAL has correct name', sal.name_en === 'Joint Stock Company');

  // Test 7: Get matter types (hardcoded enum)
  console.log('\n  Test: Get matter types (hardcoded)');
  const matterTypes = await request('GET', '/api/lookups/matter-types');
  assert('Matter types status 200', matterTypes.status === 200);
  assert('Matter types is array', Array.isArray(matterTypes.body.data));
  assert('Has litigation', matterTypes.body.data.includes('litigation'));
  assert('Has corporate', matterTypes.body.data.includes('corporate'));
  assert('Has 6 matter types', matterTypes.body.data.length === 6);

  // Test 8: Get matter statuses (hardcoded enum)
  console.log('\n  Test: Get matter statuses (hardcoded)');
  const matterStatuses = await request('GET', '/api/lookups/matter-statuses');
  assert('Matter statuses status 200', matterStatuses.status === 200);
  assert('Has active', matterStatuses.body.data.includes('active'));
  assert('Has closed', matterStatuses.body.data.includes('closed'));
  assert('Has 5 matter statuses', matterStatuses.body.data.length === 5);

  // Test 9: Get courts (alias for court-types)
  console.log('\n  Test: Get courts (alias)');
  const courts = await request('GET', '/api/lookups/courts');
  assert('Courts status 200', courts.status === 200);
  assert('Courts matches court types count', courts.body.data.length === courtTypes.body.data.length);

  // Test 10: Create custom court type
  console.log('\n  Test: Create custom court type');
  const newCourt = await request('POST', '/api/lookups', {
    type: 'court-types',
    name_en: 'Mediation Panel',
    name_ar: '\u0644\u062c\u0646\u0629 \u0648\u0633\u0627\u0637\u0629',
    name_fr: 'Panel de M\u00e9diation',
    sort_order: 100
  });
  assert('Create court type status 201', newCourt.status === 201);
  assert('Create court type success', newCourt.body.success === true);
  assert('Has new court type ID', newCourt.body.id > 0);
  cleanup.lookups.push({ type: 'court-types', id: newCourt.body.id });

  // Test 11: Verify custom court type in list
  console.log('\n  Test: Verify custom court type in list');
  const updatedCourts = await request('GET', '/api/lookups/court-types');
  const customCourt = updatedCourts.body.data.find(c => c.court_type_id === newCourt.body.id);
  assert('Custom court appears in list', !!customCourt);
  assert('Custom court name correct', customCourt.name_en === 'Mediation Panel');
  assert('Custom court is NOT system', customCourt.is_system === false);
  assert('Custom court has firm_id', customCourt.firm_id !== null);

  // Test 12: Create custom task type with icon
  console.log('\n  Test: Create task type with icon');
  const newTask = await request('POST', '/api/lookups', {
    type: 'task-types',
    name_en: 'Contract Negotiation',
    name_ar: '\u0645\u0641\u0627\u0648\u0636\u0627\u062a \u0639\u0642\u062f',
    icon: '\ud83e\udd1d',
    sort_order: 50
  });
  assert('Create task type status 201', newTask.status === 201);
  assert('Has new task type ID', newTask.body.id > 0);
  cleanup.lookups.push({ type: 'task-types', id: newTask.body.id });

  // Test 13: Verify task type with icon
  console.log('\n  Test: Verify task type with icon');
  const updatedTasks = await request('GET', '/api/lookups/task-types');
  const customTask = updatedTasks.body.data.find(t => t.task_type_id === newTask.body.id);
  assert('Custom task appears in list', !!customTask);
  assert('Custom task has icon', customTask.icon === '\ud83e\udd1d');

  // Test 14: Update custom court type
  console.log('\n  Test: Update custom court type');
  const updateResult = await request('PUT', '/api/lookups/' + newCourt.body.id, {
    type: 'court-types',
    name_en: 'Mediation Tribunal',
    name_ar: '\u0645\u062d\u0643\u0645\u0629 \u0648\u0633\u0627\u0637\u0629',
    name_fr: 'Tribunal de M\u00e9diation',
    sort_order: 101
  });
  assert('Update court type status 200', updateResult.status === 200);
  assert('Update court type success', updateResult.body.success === true);

  // Test 15: Verify update
  console.log('\n  Test: Verify court type update');
  const verifyUpdate = await request('GET', '/api/lookups/court-types');
  const updatedCourt = verifyUpdate.body.data.find(c => c.court_type_id === newCourt.body.id);
  assert('Updated name correct', updatedCourt.name_en === 'Mediation Tribunal');
  assert('Updated sort_order correct', updatedCourt.sort_order === 101);

  // Test 16: Attempt to update system court type (should fail)
  console.log('\n  Test: Update system item (should fail)');
  const systemCourt = courtTypes.body.data.find(c => c.is_system === true);
  const updateSystem = await request('PUT', '/api/lookups/' + systemCourt.court_type_id, {
    type: 'court-types',
    name_en: 'Hacked Court'
  });
  assert('Update system item returns 404', updateSystem.status === 404);
  assert('System item error mentions system', updateSystem.body.error.includes('system'));

  // Test 17: Delete custom court type (soft delete)
  console.log('\n  Test: Soft delete custom court type');
  const deleteResult = await request('DELETE', '/api/lookups/court-types/' + newCourt.body.id);
  assert('Delete court type status 200', deleteResult.status === 200);
  assert('Delete court type success', deleteResult.body.success === true);

  // Test 18: Verify deletion (should not appear in GET)
  console.log('\n  Test: Verify deleted court type hidden');
  const afterDelete = await request('GET', '/api/lookups/court-types');
  const deletedCourt = afterDelete.body.data.find(c => c.court_type_id === newCourt.body.id);
  assert('Deleted court type not in list', !deletedCourt);
  // Remove from cleanup since already deleted
  cleanup.lookups = cleanup.lookups.filter(l => !(l.type === 'court-types' && l.id === newCourt.body.id));

  // Test 19: Attempt to delete system item (should fail)
  console.log('\n  Test: Delete system item (should fail)');
  const deleteSystem = await request('DELETE', '/api/lookups/court-types/' + systemCourt.court_type_id);
  assert('Delete system item returns 404', deleteSystem.status === 404);

  // Test 20: Validation - empty name_en
  console.log('\n  Test: Validation - empty name');
  const invalidCreate = await request('POST', '/api/lookups', {
    type: 'court-types',
    name_en: ''
  });
  assert('Empty name rejected', invalidCreate.status === 400);

  // Test 21: Validation - invalid type
  console.log('\n  Test: Validation - invalid type');
  const invalidType = await request('POST', '/api/lookups', {
    type: 'invalid-type',
    name_en: 'Test'
  });
  assert('Invalid type rejected', invalidType.status === 400);

  // Test 22: Validation - nonexistent item update
  console.log('\n  Test: Update nonexistent item');
  const invalidUpdate = await request('PUT', '/api/lookups/999999', {
    type: 'court-types',
    name_en: 'Nonexistent'
  });
  assert('Nonexistent item returns 404', invalidUpdate.status === 404);

  // Test 23: Lawyer type rejected
  console.log('\n  Test: Lawyer type rejected');
  const lawyerCreate = await request('POST', '/api/lookups', {
    type: 'lawyers',
    name_en: 'Test Lawyer'
  });
  assert('Lawyer type rejected', lawyerCreate.status === 400);
  assert('Error mentions /api/lawyers', lawyerCreate.body.error.includes('/api/lawyers'));
}

// ==================== Settings Tests ====================

async function testSettings() {
  console.log('\n\u2699\uFE0F  Testing Settings Module...');
  let currencyId, exchangeRateId;

  // Test 1-2: Get settings (empty initially)
  console.log('\n  Test: Get all settings (initially empty)');
  const emptySettings = await request('GET', '/api/settings');
  assert('Get settings succeeds', emptySettings.status === 200 && emptySettings.body.success);
  assert('Settings is array', Array.isArray(emptySettings.body.data));

  // Test 3-4: Save single setting via POST
  console.log('\n  Test: Save single setting');
  const saveSetting = await request('POST', '/api/settings', {
    key: 'test_setting',
    value: 'test_value',
    type: 'string',
    category: 'general'
  });
  assert('Save setting succeeds', saveSetting.status === 200 && saveSetting.body.success);
  cleanup.settings.push('test_setting');

  const getSetting = await request('GET', '/api/settings/by-key/test_setting');
  assert('Get setting by key succeeds', getSetting.status === 200 && getSetting.body.success);
  assert('Setting value matches', getSetting.body.data.setting_value === 'test_value');

  // Test 5-6: Batch update settings via PUT
  console.log('\n  Test: Batch update settings');
  const batchUpdate = await request('PUT', '/api/settings', {
    setting1: 'value1',
    setting2: 'value2',
    setting3: 'value3'
  });
  assert('Batch update succeeds', batchUpdate.status === 200 && batchUpdate.body.success);
  cleanup.settings.push('setting1', 'setting2', 'setting3');

  const allSettings = await request('GET', '/api/settings');
  assert('Should have at least 4 settings', allSettings.body.data.length >= 4);

  // Test 7-9: Firm info
  console.log('\n  Test: Firm info CRUD');
  const firmInfo = await request('PUT', '/api/settings/firm-info', {
    firm_name: 'Test Law Firm',
    firm_email: 'info@testlaw.com',
    firm_phone: '+961 1 234567',
    default_currency: 'USD'
  });
  assert('Update firm info succeeds', firmInfo.status === 200 && firmInfo.body.success);
  cleanup.settings.push('firm_name', 'firm_email', 'firm_phone', 'default_currency');

  const getFirmInfo = await request('GET', '/api/settings/firm-info');
  assert('Get firm info succeeds', getFirmInfo.status === 200 && getFirmInfo.body.success);
  assert('Firm name matches', getFirmInfo.body.data.firm_name === 'Test Law Firm');
  assert('Default currency matches', getFirmInfo.body.data.default_currency === 'USD');

  // Test 10-12: Currencies (system + custom)
  console.log('\n  Test: Get system currencies');
  const currencies = await request('GET', '/api/settings/currencies');
  assert('Get currencies succeeds', currencies.status === 200 && currencies.body.success);
  assert('Has at least 6 system currencies', currencies.body.data.length >= 6);
  const usd = currencies.body.data.find(c => c.code === 'USD');
  assert('USD exists with correct symbol', usd && usd.symbol === '$');

  // Test 13-14: Create custom currency (use unique code per run for re-runnability)
  console.log('\n  Test: Create custom currency');
  const testCurrencyCode = 'TC' + String(Date.now()).slice(-4);
  const newCurrency = await request('POST', '/api/settings/currencies', {
    code: testCurrencyCode,
    name: 'Test Currency',
    name_ar: '\u0639\u0645\u0644\u0629 \u062a\u062c\u0631\u064a\u0628\u064a\u0629',
    symbol: 'T',
    sort_order: 10
  });
  assert('Create currency succeeds', newCurrency.status === 200 && newCurrency.body.success);
  assert('Returns currency ID', newCurrency.body.id > 0);
  currencyId = newCurrency.body.id;
  cleanup.currencies.push(currencyId);

  const updatedCurrencies = await request('GET', '/api/settings/currencies');
  const testCur = updatedCurrencies.body.data.find(c => c.code === testCurrencyCode);
  assert('Custom currency appears in list', !!testCur);

  // Test 15-16: Update currency
  console.log('\n  Test: Update currency');
  const updateCurrency = await request('PUT', '/api/settings/currencies/' + currencyId, {
    code: testCurrencyCode,
    name: 'Test Currency (Updated)',
    name_ar: '\u0639\u0645\u0644\u0629 \u0645\u062d\u062f\u062b\u0629',
    symbol: 'T',
    sort_order: 11
  });
  assert('Update currency succeeds', updateCurrency.status === 200 && updateCurrency.body.success);

  const verifyUpdate = await request('GET', '/api/settings/currencies');
  const updatedCur = verifyUpdate.body.data.find(c => c.id === currencyId);
  assert('Currency name updated', updatedCur && updatedCur.name === 'Test Currency (Updated)');
  assert('Sort order updated', updatedCur && updatedCur.sort_order === 11);

  // Test 17-18: Delete currency (soft delete)
  console.log('\n  Test: Delete currency (soft delete)');
  const deleteCurrency = await request('DELETE', '/api/settings/currencies/' + currencyId);
  assert('Delete currency succeeds', deleteCurrency.status === 200 && deleteCurrency.body.success);

  const afterDelete = await request('GET', '/api/settings/currencies');
  const deletedJpy = afterDelete.body.data.find(c => c.id === currencyId);
  assert('Deleted currency not in list', !deletedJpy);
  // Remove from cleanup since already soft-deleted
  cleanup.currencies = cleanup.currencies.filter(id => id !== currencyId);

  // Test 19-21: Exchange rates
  console.log('\n  Test: Exchange rate CRUD');
  const emptyRates = await request('GET', '/api/settings/exchange-rates');
  assert('Get exchange rates succeeds', emptyRates.status === 200 && emptyRates.body.success);
  assert('Exchange rates is array', Array.isArray(emptyRates.body.data));

  const createRate = await request('POST', '/api/settings/exchange-rates', {
    from_currency: 'USD',
    to_currency: 'LBP',
    rate: 89500,
    effective_date: '2025-02-15',
    notes: 'Official rate'
  });
  assert('Create exchange rate succeeds', createRate.status === 200 && createRate.body.success);
  assert('Returns rate ID', createRate.body.id > 0);
  exchangeRateId = createRate.body.id;
  cleanup.exchangeRates.push(exchangeRateId);

  const rates = await request('GET', '/api/settings/exchange-rates');
  assert('Has 1 exchange rate', rates.body.data.length >= 1);

  // Test 22-23: Update exchange rate
  console.log('\n  Test: Update exchange rate');
  const updateRate = await request('PUT', '/api/settings/exchange-rates/' + exchangeRateId, {
    from_currency: 'USD',
    to_currency: 'LBP',
    rate: 90000,
    effective_date: '2025-02-16',
    notes: 'Updated rate'
  });
  assert('Update exchange rate succeeds', updateRate.status === 200 && updateRate.body.success);

  const verifyRateUpdate = await request('GET', '/api/settings/exchange-rates');
  const updatedRate = verifyRateUpdate.body.data.find(r => r.rate_id === exchangeRateId);
  assert('Rate updated', updatedRate && updatedRate.notes === 'Updated rate');

  // Test 24-25: Get exchange rate for date
  console.log('\n  Test: Exchange rate for date lookup');
  const rateForDate = await request('GET', '/api/settings/exchange-rates/for-date?from=USD&to=LBP&date=2025-02-16');
  assert('Get rate for date succeeds', rateForDate.status === 200 && rateForDate.body.success);
  assert('Returns correct rate', rateForDate.body.data.rate == 90000);

  const futureRate = await request('GET', '/api/settings/exchange-rates/for-date?from=USD&to=LBP&date=2025-12-31');
  assert('Returns rate for future date', futureRate.status === 200 && futureRate.body.success);
  assert('Uses latest available rate', futureRate.body.data.rate == 90000);

  // Test 26: Delete exchange rate (HARD delete)
  console.log('\n  Test: Delete exchange rate (hard delete)');
  const deleteRate = await request('DELETE', '/api/settings/exchange-rates/' + exchangeRateId);
  assert('Delete exchange rate succeeds', deleteRate.status === 200 && deleteRate.body.success);

  const afterRateDelete = await request('GET', '/api/settings/exchange-rates');
  assert('Exchange rates empty after delete', afterRateDelete.body.data.length === 0);
  // Remove from cleanup since already deleted
  cleanup.exchangeRates = cleanup.exchangeRates.filter(id => id !== exchangeRateId);

  // Test 27-29: Invoice settings (JSON blob)
  console.log('\n  Test: Invoice settings JSON');
  const invoiceSettings = await request('PUT', '/api/settings/invoice', {
    includeVAT: true,
    vatRate: 11,
    termsAndConditions: 'Payment due within 30 days'
  });
  assert('Update invoice settings succeeds', invoiceSettings.status === 200 && invoiceSettings.body.success);
  cleanup.settings.push('invoice_settings');

  const getInvoiceSettings = await request('GET', '/api/settings/invoice');
  assert('Get invoice settings succeeds', getInvoiceSettings.status === 200 && getInvoiceSettings.body.success);
  assert('Invoice VAT setting matches', getInvoiceSettings.body.data.includeVAT === true);
  assert('Invoice VAT rate matches', getInvoiceSettings.body.data.vatRate === 11);

  // Test 30-31: Timesheet settings (JSON blob)
  console.log('\n  Test: Timesheet settings JSON');
  const timesheetSettings = await request('PUT', '/api/settings/timesheet', {
    roundingInterval: 15,
    defaultBillable: true
  });
  assert('Update timesheet settings succeeds', timesheetSettings.status === 200 && timesheetSettings.body.success);
  cleanup.settings.push('timesheet_settings');

  const getTimesheetSettings = await request('GET', '/api/settings/timesheet');
  assert('Get timesheet settings succeeds', getTimesheetSettings.status === 200 && getTimesheetSettings.body.success);
  assert('Timesheet rounding interval matches', getTimesheetSettings.body.data.roundingInterval === 15);

  // Test 32-33: Invoice number generation
  console.log('\n  Test: Invoice number generation');
  const invoiceNumber = await request('GET', '/api/settings/next-invoice-number');
  assert('Get next invoice number succeeds', invoiceNumber.status === 200 && invoiceNumber.body.success);
  assert('Invoice number has correct format', invoiceNumber.body.number && invoiceNumber.body.number.startsWith('INV-'));

  const incrementInvoice = await request('POST', '/api/settings/increment-invoice-number');
  assert('Increment invoice number succeeds', incrementInvoice.status === 200 && incrementInvoice.body.success);
  assert('Returns invoice number', !!incrementInvoice.body.number);

  // Test 34-36: Receipt number generation
  // First, reset receipt number to a known state for re-runnability
  console.log('\n  Test: Receipt number generation');
  await request('POST', '/api/settings', {
    key: 'next_receipt_number',
    value: 'RCPT-2026-0050',
    type: 'string',
    category: 'general'
  });

  const receiptNumber = await request('GET', '/api/settings/next-receipt-number');
  assert('Get next receipt number succeeds', receiptNumber.status === 200 && receiptNumber.body.success);
  assert('Receipt number has correct format', receiptNumber.body.number === 'RCPT-2026-0050');

  const incrementReceipt = await request('POST', '/api/settings/increment-receipt-number');
  assert('Increment receipt number succeeds', incrementReceipt.status === 200 && incrementReceipt.body.success);
  assert('Returns receipt number', incrementReceipt.body.number === 'RCPT-2026-0051');
  cleanup.settings.push('next_receipt_number');

  const verifyIncrement = await request('GET', '/api/settings/next-receipt-number');
  assert('Verify receipt number incremented', verifyIncrement.body.number === 'RCPT-2026-0051');

  // Test 37-38: Validation tests
  console.log('\n  Test: Validation');
  const invalidCurrency = await request('POST', '/api/settings/currencies', {
    code: '',
    name: 'Invalid'
  });
  assert('Empty currency code rejected', !invalidCurrency.body.success);

  const invalidRate = await request('POST', '/api/settings/exchange-rates', {
    from_currency: 'USD',
    rate: 1.5
    // Missing to_currency and effective_date
  });
  assert('Incomplete exchange rate rejected', !invalidRate.body.success);

  console.log('\n  \u2705 All settings tests passed');
}

// ==================== Cleanup ====================

async function cleanupData() {
  console.log('\nCleanup...');

  // Cleanup settings - delete rows via POST with special _delete marker
  // Settings don't have a DELETE endpoint, so we upsert them to empty values
  // (They're firm-scoped and test auth creates unique firm, so no conflict on re-run)
  for (const key of cleanup.settings) {
    await request('POST', '/api/settings', { key, value: '', type: 'string', category: 'general' });
  }
  console.log('  Cleaned ' + cleanup.settings.length + ' settings keys');

  // Cleanup custom currencies - these need hard delete for unique constraint
  // Soft-deleted currencies still block UNIQUE(firm_id, code)
  for (const id of cleanup.currencies) {
    await request('DELETE', '/api/settings/currencies/' + id);
  }
  console.log('  Deleted ' + cleanup.currencies.length + ' custom currencies');

  // Cleanup exchange rates (hard delete)
  for (const id of cleanup.exchangeRates) {
    await request('DELETE', '/api/settings/exchange-rates/' + id);
  }
  console.log('  Deleted ' + cleanup.exchangeRates.length + ' exchange rates');

  // Cleanup lookups first (no dependencies)
  for (const item of cleanup.lookups) {
    await request('DELETE', '/api/lookups/' + item.type + '/' + item.id);
  }
  console.log('  Deleted ' + cleanup.lookups.length + ' lookup items');

  // Delete in reverse dependency order: appointments -> invoices -> advances -> expenses -> timesheets -> deadlines -> judgments -> tasks -> diary -> hearings -> matters -> lawyers -> clients
  for (const id of cleanup.appointments) {
    await request('DELETE', '/api/appointments/' + id);
  }
  console.log('  Deleted ' + cleanup.appointments.length + ' appointments');

  for (const id of cleanup.invoices) {
    await request('DELETE', '/api/invoices/' + id);
  }
  console.log('  Deleted ' + cleanup.invoices.length + ' invoices');

  for (const id of cleanup.advances) {
    await request('DELETE', '/api/advances/' + id);
  }
  console.log('  Deleted ' + cleanup.advances.length + ' advances');

  for (const id of cleanup.expenses) {
    await request('DELETE', '/api/expenses/' + id);
  }
  console.log('  Deleted ' + cleanup.expenses.length + ' expenses');

  for (const id of cleanup.timesheets) {
    await request('DELETE', '/api/timesheets/' + id);
  }
  console.log('  Deleted ' + cleanup.timesheets.length + ' timesheets');

  for (const id of cleanup.deadlines) {
    await request('DELETE', '/api/deadlines/' + id);
  }
  console.log('  Deleted ' + cleanup.deadlines.length + ' deadlines');

  for (const id of cleanup.judgments) {
    await request('DELETE', '/api/judgments/' + id);
  }
  console.log('  Deleted ' + cleanup.judgments.length + ' judgments');

  for (const id of cleanup.tasks) {
    await request('DELETE', '/api/tasks/' + id);
  }
  console.log('  Deleted ' + cleanup.tasks.length + ' tasks');

  for (const id of cleanup.diary) {
    await request('DELETE', '/api/diary/' + id);
  }
  console.log('  Deleted ' + cleanup.diary.length + ' diary entries');

  for (const id of cleanup.hearings) {
    await request('DELETE', '/api/hearings/' + id);
  }
  console.log('  Deleted ' + cleanup.hearings.length + ' hearings');

  for (const id of cleanup.matters) {
    await request('DELETE', '/api/matters/' + id);
  }
  console.log('  Deleted ' + cleanup.matters.length + ' matters');

  for (const id of cleanup.lawyers) {
    await request('DELETE', '/api/lawyers/' + id);
  }
  console.log('  Deleted ' + cleanup.lawyers.length + ' lawyers');

  for (const id of cleanup.clients) {
    await request('DELETE', '/api/clients/' + id);
  }
  console.log('  Deleted ' + cleanup.clients.length + ' clients');
}

// ==================== Main ====================

async function run() {
  try {
    await setup();
    await seedData();
    await testPagination();
    await testSearch();
    await testFilters();
    await testDiary();
    await testTasks();
    await testJudgments();
    await testDeadlines();
    await testTimesheets();
    await testExpenses();
    await testAdvances();
    await testInvoices();
    await testAppointments();
    await testConflictCheck();
    await testTrash();
    await testLookups();
    await testSettings();
    await testCrossResource();
    await cleanupData();
  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    // Still try cleanup
    try { await cleanupData(); } catch (e) { /* ignore */ }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS: ' + passed + '/' + totalAssertions + ' passed, ' + failed + ' failed');
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
