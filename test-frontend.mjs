/**
 * Qanuni Frontend Automated Tests
 * Tests all 13 forms via api-client.js
 * Run: node test-frontend.mjs
 */

import fetch from 'node-fetch';
import apiClient from './src/api-client.js';

// Make fetch available globally
global.fetch = fetch;

// ==================== TEST FRAMEWORK ====================

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    process.stdout.write('\x1b[32m.\x1b[0m');
  } else {
    failed++;
    failures.push({ test: testName, details });
    process.stdout.write('\x1b[31mF\x1b[0m');
  }
}

// ==================== TESTS ====================

async function testClientForm() {
  try {
    const result = await apiClient.createClient({
      client_name: 'Test Client ' + Date.now(),
      client_name_arabic: 'عميل تجريبي',
      client_type: 'individual',
      email: 'test@example.com'
    });

    assert(result.success === true, 'Client form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Client form - create', err.message);
  }
}

async function testMatterForm() {
  try {
    const clientResult = await apiClient.createClient({
      client_name: 'Matter Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const result = await apiClient.createMatter({
      matter_name: 'Test Matter ' + Date.now(),
      matter_name_arabic: 'قضية تجريبية',
      client_id: clientResult.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    assert(result.success === true, 'Matter form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Matter form - create', err.message);
  }
}

async function testLawyerForm() {
  try {
    const result = await apiClient.createLawyer({
      full_name: 'Test Lawyer ' + Date.now(),
      full_name_arabic: 'محامي تجريبي',
      email: 'lawyer@example.com',
      role: 'partner'
    });

    assert(result.success === true, 'Lawyer form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Lawyer form - create', err.message);
  }
}

async function testHearingForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Hearing Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Hearing Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const result = await apiClient.createHearing({
      matter_id: matter.matterId,
      court_name: 'Test Court',
      hearing_date: '2026-03-01',
      hearing_time: '10:00',
      hearing_type: 'trial'
    });

    assert(result.success === true, 'Hearing form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Hearing form - create', err.message);
  }
}

async function testJudgmentForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Judgment Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Judgment Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const result = await apiClient.createJudgment({
      matter_id: matter.matterId,
      judgment_date: '2026-02-15',
      judgment_type: 'final',
      outcome: 'favorable'
    });

    assert(result.success === true, 'Judgment form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Judgment form - create', err.message);
  }
}

async function testTaskForm() {
  try {
    const result = await apiClient.createTask({
      title: 'Test Task ' + Date.now(),
      due_date: '2026-03-01',
      priority: 'medium',
      status: 'assigned'  // Fixed: use valid enum value
    });

    assert(result.success === true, 'Task form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Task form - create', err.message);
  }
}

async function testTimesheetForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Timesheet Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Timesheet Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const lawyer = await apiClient.createLawyer({
      full_name: 'Timesheet Lawyer ' + Date.now(),
      email: 'timesheet@example.com',
      role: 'associate'
    });

    const result = await apiClient.createTimesheet({
      client_id: client.client_id,  // Added client_id
      matter_id: matter.matterId,
      lawyer_id: lawyer.lawyerId,
      date: '2026-02-11',
      hours: 2.5,
      rate: 200,
      narrative: 'Test timesheet entry'  // Fixed: use narrative
    });

    assert(result.success === true, 'Timesheet form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Timesheet form - create', err.message);
  }
}

async function testExpenseForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Expense Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Expense Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const result = await apiClient.createExpense({
      matter_id: matter.matterId,
      date: '2026-02-11',
      amount: 150.00,
      category: 'court_fees',
      description: 'Test expense'
    });

    assert(result.success === true, 'Expense form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Expense form - create', err.message);
  }
}

async function testAppointmentForm() {
  try {
    const result = await apiClient.createAppointment({
      title: 'Test Appointment ' + Date.now(),
      appointment_date: '2026-03-01',  // Fixed field name
      appointment_time: '14:00',
      duration: 60
    });

    assert(result.success === true, 'Appointment form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Appointment form - create', err.message);
  }
}

async function testDeadlineForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Deadline Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Deadline Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const result = await apiClient.createDeadline({
      matter_id: matter.matterId,
      title: 'Test Deadline',
      deadline_date: '2026-03-15',  // Fixed field name
      priority: 'high'
    });

    assert(result.success === true, 'Deadline form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Deadline form - create', err.message);
  }
}

async function testInvoiceForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Invoice Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const matter = await apiClient.createMatter({
      matter_name: 'Invoice Test Matter',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });

    const result = await apiClient.createInvoice({
      client_id: client.client_id,
      matter_id: matter.matterId,
      issue_date: '2026-02-11',
      due_date: '2026-03-11',
      total: 1000.00,
      status: 'draft'
    });

    assert(result.success === true, 'Invoice form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Invoice form - create', err.message);
  }
}

async function testAdvanceForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Advance Test Client ' + Date.now(),
      client_type: 'individual'
    });

    const result = await apiClient.createAdvance({
      client_id: client.client_id,
      amount: 5000.00,
      date_received: '2026-02-11',
      advance_type: 'client_retainer'
    });

    assert(result.success === true, 'Advance form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Advance form - create', err.message);
  }
}

async function testCorporateEntityForm() {
  try {
    const client = await apiClient.createClient({
      client_name: 'Corporate Test Client ' + Date.now(),
      client_type: 'legal_entity'
    });

    const result = await apiClient.addCorporateEntity({
      client_id: client.client_id,
      entity_name: 'Test Company ' + Date.now(),
      entity_name_arabic: 'شركة تجريبية',
      entity_type: 'sal',
      registration_number: 'REG' + Date.now(),
      registration_date: '2020-01-01'
    });

    assert(result.success === true, 'Corporate entity form - create',
      result.error || 'Should return success=true');
  } catch (err) {
    assert(false, 'Corporate entity form - create', err.message);
  }
}

async function testCriticalWorkflow() {
  try {
    // 1. New client walks in
    const client = await apiClient.createClient({
      client_name: 'Workflow Test Client ' + Date.now(),
      client_type: 'individual',
      email: 'workflow@example.com',
      phone: '+961-1-234567'
    });
    assert(client.success === true, 'Workflow - create client', client.error);

    // 2. Open litigation matter
    const matter = await apiClient.createMatter({
      matter_name: 'Commercial Dispute Case',
      client_id: client.client_id,
      matter_type: 'litigation',
      status: 'active'
    });
    assert(matter.success === true, 'Workflow - create matter', matter.error);

    // 3. Schedule court hearing
    const hearing = await apiClient.createHearing({
      matter_id: matter.matterId,
      court_name: 'Beirut Court of First Instance',
      hearing_date: '2026-03-15',
      hearing_time: '10:00',
      hearing_type: 'trial'
    });
    assert(hearing.success === true, 'Workflow - create hearing', hearing.error);

    // 4. Lawyer works on case
    const lawyer = await apiClient.createLawyer({
      full_name: 'Workflow Lawyer ' + Date.now(),
      email: 'workflow.lawyer@example.com',
      role: 'partner'
    });
    assert(lawyer.success === true, 'Workflow - create lawyer', lawyer.error);

    // 5. Track billable time
    const timesheet = await apiClient.createTimesheet({
      client_id: client.client_id,
      matter_id: matter.matterId,
      lawyer_id: lawyer.lawyerId,
      date: '2026-02-11',
      hours: 5.5,
      rate: 250,
      narrative: 'Legal research and case preparation'
    });
    assert(timesheet.success === true, 'Workflow - create timesheet', timesheet.error);

    // 6. Incur court fees
    const expense = await apiClient.createExpense({
      matter_id: matter.matterId,
      date: '2026-02-11',
      amount: 500.00,
      category: 'court_fees',
      description: 'Filing fees'
    });
    assert(expense.success === true, 'Workflow - create expense', expense.error);

    // 7. Client pays retainer
    const advance = await apiClient.createAdvance({
      client_id: client.client_id,
      amount: 3000.00,
      date_received: '2026-02-10',
      advance_type: 'client_retainer'
    });
    assert(advance.success === true, 'Workflow - create advance', advance.error);

    // 8. Generate invoice
    const invoice = await apiClient.createInvoice({
      client_id: client.client_id,
      matter_id: matter.matterId,
      issue_date: '2026-02-28',
      due_date: '2026-03-28',
      total: 1875.00,  // 5.5 hours * $250 + $500 fees
      status: 'sent'
    });
    assert(invoice.success === true, 'Workflow - create invoice', invoice.error);

    console.log('\n  ✅ Complete workflow executed successfully');

  } catch (err) {
    assert(false, 'Critical workflow', err.message);
  }
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  console.log('\n🧪 Running Frontend Tests (13 Forms + Workflow)...\n');

  // Individual form tests
  await testClientForm();
  await testMatterForm();
  await testLawyerForm();
  await testHearingForm();
  await testJudgmentForm();
  await testTaskForm();
  await testTimesheetForm();
  await testExpenseForm();
  await testAppointmentForm();
  await testDeadlineForm();
  await testInvoiceForm();
  await testAdvanceForm();
  await testCorporateEntityForm();

  // End-to-end workflow
  await testCriticalWorkflow();

  // Print results
  console.log('\n\n' + '='.repeat(60));
  if (failed === 0) {
    console.log(`\x1b[32m✓ ALL TESTS PASSED\x1b[0m (${passed} tests)`);
  } else {
    console.log(`\x1b[31m✗ FAILURES\x1b[0m`);
    failures.forEach(f => {
      console.log(`\n❌ ${f.test}`);
      console.log(`   ${f.details}`);
    });
  }
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
