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
const cleanup = { tasks: [], clients: [], matters: [], lawyers: [], hearings: [], diary: [] };

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

// ==================== Cleanup ====================

async function cleanupData() {
  console.log('\nCleanup...');

  // Delete in reverse dependency order: tasks -> diary -> hearings -> matters -> lawyers -> clients
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
