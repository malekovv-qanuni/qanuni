// test-matters-smoke.js - Week 2 Day 5 Smoke Tests
require('dotenv').config();

const baseUrl = 'http://localhost:3001';
let authToken = '';
let testMatterId = null;
let testClientId = null;

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function runTests() {
  console.log('Week 2 Day 5 - Matters CRUD Smoke Tests\n');
  let passed = 0, failed = 0;

  try {
    // Setup: Register a fresh user (or login if already exists)
    console.log('Setup: Registering test user...');
    const testEmail = 'matter-test-' + Date.now() + '@test.com';
    const testPassword = 'TestPass123!';

    const registerRes = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: testPassword,
      firm_name: 'Matter Test Firm',
      full_name: 'Matter Tester'
    });

    if (registerRes.status !== 201) {
      console.log('❌ SETUP FAILED: Registration failed');
      console.log('   Response:', registerRes.data);
      return;
    }

    authToken = registerRes.data.token;
    console.log(`✅ Registered & logged in as ${testEmail}\n`);

    // Setup: Create a test client first
    console.log('Setup: Creating test client...');
    const clientRes = await request('POST', '/api/clients', {
      client_name: 'Test Client for Matter',
      client_type: 'individual',
      email: 'testclient@example.com'
    }, authToken);
    
    if (clientRes.status !== 201) {
      console.log('❌ SETUP FAILED: Client creation failed');
      console.log('   Response:', clientRes.data);
      return;
    }

    testClientId = clientRes.data.client.client_id;
    console.log(`✅ Test client created (ID: ${testClientId})\n`);

    // Test 1: Create matter with single client
    console.log('Test 1: Create matter with single client');
    const createRes = await request('POST', '/api/matters', {
      matter_number: 'TEST-2026-001',
      matter_name: 'Test Matter - Single Client',
      matter_name_arabic: 'قضية تجريبية',
      matter_type: 'litigation',
      matter_status: 'active',
      court_name: 'Court of First Instance',
      case_number: 'TEST/2026/001',
      case_year: 2026,
      hourly_rate: 250.00,
      billing_type: 'hourly',
      date_opened: '2026-02-14',
      description: 'Test litigation matter',
      client_ids: [testClientId],
      primary_client_id: testClientId
    }, authToken);
    
    if (createRes.status === 201 && createRes.data.matter_id) {
      testMatterId = createRes.data.matter_id;
      console.log(`✅ Test 1 PASSED: Matter created (ID: ${testMatterId})`);
      passed++;
    } else {
      console.log('❌ Test 1 FAILED:', createRes.data);
      failed++;
    }

    // Test 2: Create matter with multiple clients (need second client)
    console.log('\nTest 2: Create matter with multiple clients');
    const client2Res = await request('POST', '/api/clients', {
      client_name: 'Second Test Client',
      client_type: 'individual'
    }, authToken);
    
    const testClientId2 = client2Res.data.client.client_id;
    
    const multiClientRes = await request('POST', '/api/matters', {
      matter_number: 'TEST-2026-002',
      matter_name: 'Test Matter - Multi Client',
      matter_type: 'corporate',
      matter_status: 'active',
      date_opened: '2026-02-14',
      client_ids: [testClientId, testClientId2],
      primary_client_id: testClientId
    }, authToken);
    
    if (multiClientRes.status === 201 && multiClientRes.data.matter_id) {
      console.log(`✅ Test 2 PASSED: Multi-client matter created (ID: ${multiClientRes.data.matter_id})`);
      passed++;
    } else {
      console.log('❌ Test 2 FAILED:', multiClientRes.data);
      failed++;
    }

    // Test 3: List matters with clients array
    console.log('\nTest 3: List all matters');
    const listRes = await request('GET', '/api/matters', null, authToken);
    
    if (listRes.status === 200 && Array.isArray(listRes.data.matters)) {
      const matter = listRes.data.matters.find(m => m.matter_id === testMatterId);
      if (matter && matter.clients && matter.clients.length === 1) {
        console.log(`✅ Test 3 PASSED: Listed ${listRes.data.matters.length} matters, clients array populated`);
        passed++;
      } else {
        console.log('❌ Test 3 FAILED: Clients array missing or incorrect');
        failed++;
      }
    } else {
      console.log('❌ Test 3 FAILED:', listRes.data);
      failed++;
    }

    // Test 4: Get single matter
    console.log('\nTest 4: Get single matter');
    const getRes = await request('GET', `/api/matters/${testMatterId}`, null, authToken);
    
    if (getRes.status === 200 && getRes.data.matter && getRes.data.matter.matter_id === testMatterId) {
      console.log(`✅ Test 4 PASSED: Retrieved matter ${testMatterId} with full details`);
      passed++;
    } else {
      console.log('❌ Test 4 FAILED:', getRes.data);
      failed++;
    }

    // Test 5: Update matter clients
    console.log('\nTest 5: Update matter clients');
    const updateRes = await request('PUT', `/api/matters/${testMatterId}`, {
      matter_number: 'TEST-2026-001',
      matter_name: 'Updated Test Matter',
      matter_type: 'litigation',
      client_ids: [testClientId2],  // Switch to second client only
      primary_client_id: testClientId2
    }, authToken);

    if (updateRes.status === 200) {
      // Verify the change
      const verifyRes = await request('GET', `/api/matters/${testMatterId}`, null, authToken);
      const m = verifyRes.data.matter;
      if (m && m.clients && m.clients.length === 1 &&
          m.clients[0].client_id === testClientId2) {
        console.log('✅ Test 5 PASSED: Matter clients updated successfully');
        passed++;
      } else {
        console.log('❌ Test 5 FAILED: Client update not reflected');
        console.log('   Matter:', JSON.stringify(m, null, 2));
        failed++;
      }
    } else {
      console.log('❌ Test 5 FAILED:', updateRes.data);
      failed++;
    }

    // Test 6: Soft delete matter
    console.log('\nTest 6: Soft delete matter');
    const deleteRes = await request('DELETE', `/api/matters/${testMatterId}`, null, authToken);
    
    if (deleteRes.status === 200 && deleteRes.data.success) {
      // Verify it's no longer in list
      const verifyList = await request('GET', '/api/matters', null, authToken);
      const deletedMatter = verifyList.data.matters.find(m => m.matter_id === testMatterId);
      
      if (!deletedMatter) {
        console.log('✅ Test 6 PASSED: Matter soft deleted (not in list)');
        passed++;
      } else {
        console.log('❌ Test 6 FAILED: Deleted matter still appears in list');
        failed++;
      }
    } else {
      console.log('❌ Test 6 FAILED:', deleteRes.data);
      failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests Complete: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    if (failed === 0) {
      console.log('\n✅ ALL SMOKE TESTS PASSED - Ready for commit');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Review errors above');
    }

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
  }
}

runTests();