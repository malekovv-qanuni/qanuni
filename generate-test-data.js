/**
 * Qanuni Scale Test Data Generator
 *
 * Generates production-scale test data for performance testing.
 * Creates a backup of the existing database before inserting.
 *
 * Volumes:
 *   - 500 clients (70% individual, 30% legal_entity)
 *   - 10 lawyers
 *   - 1,000 matters (distributed across clients)
 *   - 5,000 hearings (across matters)
 *   - 2,000 tasks
 *   - 10,000 timesheets (billing data)
 *   - 3,000 expenses
 *   - 1,000 advances
 *   - 500 invoices
 *   - 2,000 appointments
 *   - 1,000 deadlines
 *
 * Run: node generate-test-data.js
 *
 * @version 1.0.0 (Session 10)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURATION ====================

const COUNTS = {
  clients: 500,
  lawyers: 10,
  matters: 1000,
  hearings: 5000,
  tasks: 2000,
  timesheets: 10000,
  expenses: 3000,
  advances: 1000,
  invoices: 500,
  appointments: 2000,
  deadlines: 1000,
};

// ==================== HELPERS ====================

function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${year}-${random}`;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(startYear, endYear) {
  const year = randomInt(startYear, endYear);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomTime() {
  const h = String(randomInt(8, 17)).padStart(2, '0');
  const m = randomElement(['00', '15', '30', '45']);
  return `${h}:${m}`;
}

function now() {
  return new Date().toISOString();
}

function progress(label, current, total) {
  if (current % Math.ceil(total / 10) === 0 || current === total) {
    const pct = Math.round((current / total) * 100);
    process.stdout.write(`\r  ${label}: ${current}/${total} (${pct}%)`);
    if (current === total) process.stdout.write('\n');
  }
}

// ==================== DATA ARRAYS ====================

const firstNames = [
  'Ahmad', 'Hassan', 'Karim', 'Omar', 'Sami', 'Nabil', 'Walid', 'Rami',
  'Fadi', 'Ziad', 'Tony', 'Georges', 'Pierre', 'Joseph', 'Michel',
  'Nadia', 'Layla', 'Rima', 'Sara', 'Dana', 'Maya', 'Rita', 'Carla',
  'Lina', 'Hala', 'Joanna', 'Marie', 'Chantal', 'Rania', 'Dina',
  'Ali', 'Hussein', 'Khalil', 'Tarek', 'Bassem', 'Imad', 'Jihad',
  'Elias', 'Marwan', 'Samir', 'Fouad', 'Issam', 'Jamil', 'Adel', 'Nadim',
];

const lastNames = [
  'Khoury', 'Haddad', 'Nassar', 'Saad', 'Moussa', 'Ibrahim', 'Khalil',
  'Hariri', 'Gemayel', 'Frangieh', 'Chamoun', 'Salam', 'Karami', 'Solh',
  'Aoun', 'Berri', 'Jumblatt', 'Geagea', 'Mikati', 'Siniora',
  'Abdallah', 'Daher', 'Rizk', 'Tannous', 'Bou Saab', 'El Amine',
  'Najjar', 'Azar', 'Fares', 'Hayek', 'Jabbour', 'Raad', 'Saliba',
  'Zein', 'Youssef', 'Najem', 'Barakat', 'Maatouk', 'Sleiman', 'Assaf',
];

const companyNames = [
  'Beirut Trading', 'Cedar Holdings', 'Levant Group', 'Mediterranean Consulting',
  'Phoenix Industries', 'Byblos Investments', 'Tripoli Enterprises', 'Sidon Logistics',
  'Mount Lebanon Properties', 'Baalbek Construction', 'Tyre Marine', 'Jounieh Hotels',
  'Zahle Agriculture', 'Jbeil Tourism', 'Metn Real Estate', 'Akkar Textiles',
  'Bekaa Valley Farms', 'Chouf Manufacturing', 'Keserwan Development', 'Aley Trading',
  'National Bank of Commerce', 'Orient Insurance', 'Phoenicia Capital', 'Cedars Tech',
  'Raouche Partners', 'Hamra Consulting', 'Solidere Development', 'Achrafieh Holdings',
  'Verdun Investments', 'Kaslik Marina', 'Faraya Resorts', 'Broummana Properties',
];

const entityTypes = ['SAL', 'SARL', 'HOLDING', 'OFFSHORE', 'PARTNERSHIP', 'LIMITED_PARTNER', 'BRANCH'];

const matterTypes = ['litigation', 'advisory', 'transactional', 'corporate', 'other'];
const matterStatuses = ['active', 'closed', 'pending', 'archived', 'on_hold'];
const matterStages = ['first_instance', 'appeal', 'cassation', 'execution'];
const feeArrangements = ['hourly', 'fixed_fee', 'contingency', 'retainer', 'mixed'];

const currencies = ['USD', 'EUR', 'LBP'];
const currencyRates = { USD: 1, EUR: 0.92, LBP: 89500 };

const taskStatuses = ['assigned', 'in_progress', 'done', 'cancelled'];
const priorities = ['high', 'medium', 'low'];
const judgmentStatuses = ['pending', 'favorable', 'unfavorable', 'partial', 'dismissed', 'settled'];
const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'partial'];
const advanceTypes = ['client_retainer', 'expense_advance', 'flat_fee_advance'];
const appointmentTypes = ['client_meeting', 'court_hearing', 'mediation', 'deposition', 'internal_meeting'];
const diaryTypes = ['note', 'call', 'meeting', 'correspondence', 'filing', 'research'];

const matterNamePrefixes = [
  'Breach of Contract', 'Property Dispute', 'Employment Claim', 'Debt Recovery',
  'Commercial Lease', 'Insurance Claim', 'Partnership Dissolution', 'Construction Dispute',
  'Banking Litigation', 'IP Infringement', 'Maritime Claim', 'Tax Appeal',
  'Corporate Restructuring', 'M&A Advisory', 'Joint Venture Agreement', 'Due Diligence',
  'Regulatory Compliance', 'Labor Arbitration', 'Real Estate Transaction', 'Agency Agreement',
  'Distribution Agreement', 'Franchise Dispute', 'Shareholder Dispute', 'Board Advisory',
  'Customs Dispute', 'Environmental Compliance', 'Data Privacy Advisory', 'Inheritance Dispute',
  'Family Law Matter', 'Criminal Defense',
];

const narratives = [
  'Reviewed and analyzed case documents and pleadings',
  'Drafted motion for summary judgment',
  'Attended court hearing and presented arguments',
  'Conducted legal research on applicable precedents',
  'Prepared witness statements and affidavits',
  'Drafted correspondence to opposing counsel',
  'Reviewed contract terms and conditions',
  'Attended client meeting to discuss case strategy',
  'Prepared trial preparation documents',
  'Reviewed and commented on settlement proposal',
  'Drafted commercial agreement',
  'Analyzed regulatory compliance requirements',
  'Prepared due diligence report',
  'Reviewed corporate governance documents',
  'Attended mediation session',
  'Drafted arbitration submission',
  'Prepared expert witness briefing',
  'Reviewed court filings and deadlines',
  'Conducted title search and property review',
  'Analyzed tax implications of proposed transaction',
];

const expenseDescriptions = [
  'Court filing fee', 'Process server fees', 'Expert witness fee', 'Translation services',
  'Courier and delivery charges', 'Notarization fees', 'Travel to court - Beirut',
  'Travel to court - Mount Lebanon', 'Photocopying charges', 'Government registry fees',
  'Parking at courthouse', 'Travel to client meeting', 'Document authentication',
  'Registered mail fees', 'Travel to Tripoli court', 'Stamp duty payment',
];

// ==================== GENERATION FUNCTIONS ====================

function generateLawyers(count) {
  const lawyers = [];
  const lawyerNames = [
    'Maître Khoury', 'Maître Haddad', 'Maître Nassar', 'Maître Ibrahim',
    'Maître Saad', 'Maître Rizk', 'Maître Fares', 'Maître Gemayel',
    'Maître Chamoun', 'Maître Salam',
  ];
  for (let i = 0; i < count; i++) {
    const id = generateId('LWR');
    const name = lawyerNames[i] || `Maître Lawyer${i + 1}`;
    const initials = name.split(' ').pop().substring(0, 2).toUpperCase();
    lawyers.push({
      lawyer_id: id,
      name: name,
      initials: initials,
      email: `${name.split(' ').pop().toLowerCase()}@qanuni-law.com`,
      phone: `+961 ${randomInt(1, 9)} ${randomInt(100000, 999999)}`,
      hourly_rate: randomElement([150, 200, 250, 300, 350, 400, 500]),
      hourly_rate_currency: 'USD',
      active: 1,
      created_at: now(),
      updated_at: now(),
    });
  }
  return lawyers;
}

function generateClients(count) {
  const clients = [];
  const individualCount = Math.round(count * 0.7);

  for (let i = 0; i < count; i++) {
    const id = generateId('CLT');
    const isIndividual = i < individualCount;
    const clientName = isIndividual
      ? `${randomElement(firstNames)} ${randomElement(lastNames)}`
      : `${randomElement(companyNames)} ${randomElement(entityTypes)}`;

    clients.push({
      client_id: id,
      client_name: clientName,
      client_type: isIndividual ? 'individual' : 'legal_entity',
      entity_type: isIndividual ? null : randomElement(entityTypes),
      email: `client${i + 1}@example.com`,
      phone: `+961 ${randomInt(1, 9)} ${randomInt(100000, 999999)}`,
      mobile: `+961 ${randomInt(70, 79)} ${randomInt(100000, 999999)}`,
      address: `${randomInt(1, 200)} ${randomElement(['Hamra St', 'Verdun St', 'Achrafieh', 'Jounieh Blvd', 'Byblos Rd', 'Sidon Main', 'Tripoli Ave'])}`,
      default_currency: randomElement(currencies),
      billing_terms: randomElement(['hourly', 'fixed', 'retainer']),
      active: 1,
      source: randomElement(['referral', 'website', 'walk-in', 'bar_association', 'repeat']),
      created_at: randomDate(2020, 2025) + 'T10:00:00.000Z',
      updated_at: now(),
    });
  }
  return clients;
}

function generateMatters(count, clientIds, lawyerIds) {
  const matters = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('MTR');
    // Weight distribution: top 20% clients get 60% of matters
    const clientIdx = Math.random() < 0.6
      ? randomInt(0, Math.floor(clientIds.length * 0.2) - 1)
      : randomInt(0, clientIds.length - 1);

    const matterType = randomElement(matterTypes);
    const status = randomElement(matterStatuses);
    const openDate = randomDate(2020, 2025);
    const currency = randomElement(currencies);

    matters.push({
      matter_id: id,
      client_id: clientIds[clientIdx],
      matter_name: `${randomElement(matterNamePrefixes)} - ${randomInt(1000, 9999)}`,
      matter_type: matterType,
      status: status,
      case_number: matterType === 'litigation' ? `${randomInt(100, 9999)}/${randomInt(2020, 2025)}` : null,
      court_type_id: matterType === 'litigation' ? randomInt(1, 17) : null,
      court_region_id: matterType === 'litigation' ? randomInt(1, 12) : null,
      responsible_lawyer_id: randomElement(lawyerIds),
      opening_date: openDate,
      closing_date: status === 'closed' ? randomDate(2023, 2026) : null,
      matter_stage: randomElement(matterStages),
      fee_arrangement: randomElement(feeArrangements),
      agreed_fee_amount: randomFloat(1000, 50000),
      agreed_fee_currency: currency,
      notes: `Auto-generated test matter #${i + 1}`,
      created_at: openDate + 'T09:00:00.000Z',
      updated_at: now(),
    });
  }
  return matters;
}

function generateHearings(count, matterIds) {
  const hearings = [];
  // Only litigation matters get hearings — but for simplicity, distribute across all
  for (let i = 0; i < count; i++) {
    const id = generateId('HRG');
    const date = randomDate(2021, 2026);
    const time = randomTime();
    hearings.push({
      hearing_id: id,
      matter_id: randomElement(matterIds),
      hearing_date: date,
      hearing_time: time,
      end_time: `${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:${time.split(':')[1]}`,
      court_type_id: randomInt(1, 17),
      court_region_id: randomInt(1, 12),
      judge: `Judge ${randomElement(lastNames)}`,
      purpose_id: randomInt(1, 10),
      outcome: randomElement([null, null, 'Adjourned', 'Decision reserved', 'Settled', 'Judgment rendered']),
      notes: null,
      created_at: date + 'T08:00:00.000Z',
      updated_at: now(),
    });
  }
  return hearings;
}

function generateTasks(count, matterIds, clientIds, lawyerIds) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('TSK');
    const status = randomElement(taskStatuses);
    const dueDate = randomDate(2022, 2026);
    tasks.push({
      task_id: id,
      task_number: `T-${String(i + 1).padStart(5, '0')}`,
      matter_id: randomElement(matterIds),
      client_id: randomElement(clientIds),
      task_type_id: randomInt(1, 11),
      title: `${randomElement(['Draft', 'Review', 'Prepare', 'File', 'Follow up on', 'Research', 'Analyze'])} ${randomElement(['motion', 'brief', 'memo', 'contract', 'correspondence', 'report', 'filing'])}`,
      description: `Auto-generated task #${i + 1}`,
      due_date: dueDate,
      priority: randomElement(priorities),
      status: status,
      assigned_to: randomElement(lawyerIds),
      assigned_by: randomElement(lawyerIds),
      assigned_date: dueDate,
      completed_date: status === 'done' ? randomDate(2022, 2026) : null,
      created_at: now(),
      updated_at: now(),
    });
  }
  return tasks;
}

function generateTimesheets(count, matterIds, clientIds, lawyerIds) {
  const timesheets = [];
  // Build a matter→client lookup
  // We'll just pair them randomly since we don't have the mapping in memory
  for (let i = 0; i < count; i++) {
    const id = generateId('TS');
    const date = randomDate(2022, 2026);
    const lawyerId = randomElement(lawyerIds);
    const minutes = randomElement([15, 30, 30, 45, 60, 60, 90, 120, 120, 180, 240]);

    timesheets.push({
      timesheet_id: id,
      lawyer_id: lawyerId,
      client_id: randomElement(clientIds),
      matter_id: randomElement(matterIds),
      date: date,
      minutes: minutes,
      narrative: randomElement(narratives),
      billable: Math.random() < 0.85 ? 1 : 0,
      rate_per_hour: randomElement([150, 200, 250, 300, 350, 400]),
      rate_currency: randomElement(currencies),
      status: randomElement(['draft', 'draft', 'approved', 'billed']),
      created_at: date + 'T18:00:00.000Z',
      updated_at: now(),
    });
  }
  return timesheets;
}

function generateExpenses(count, matterIds, clientIds, lawyerIds) {
  const expenses = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('EXP');
    const date = randomDate(2022, 2026);
    const currency = randomElement(currencies);
    const baseAmount = randomFloat(10, 2000);
    const amount = currency === 'LBP' ? baseAmount * 89500 : baseAmount;

    expenses.push({
      expense_id: id,
      expense_type: randomElement(['client', 'client', 'client', 'firm']),
      client_id: randomElement(clientIds),
      matter_id: randomElement(matterIds),
      lawyer_id: randomElement(lawyerIds),
      category_id: randomInt(1, 10),
      amount: parseFloat(amount.toFixed(2)),
      currency: currency,
      description: randomElement(expenseDescriptions),
      date: date,
      billable: Math.random() < 0.8 ? 1 : 0,
      status: randomElement(['pending', 'pending', 'approved', 'billed']),
      created_at: date + 'T12:00:00.000Z',
      updated_at: now(),
    });
  }
  return expenses;
}

function generateAdvances(count, clientIds, matterIds) {
  const advances = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('ADV');
    const date = randomDate(2022, 2026);
    const currency = randomElement(currencies);
    const baseAmount = randomFloat(500, 20000);
    const amount = currency === 'LBP' ? baseAmount * 89500 : baseAmount;
    const balance = parseFloat((amount * randomFloat(0, 1)).toFixed(2));

    advances.push({
      advance_id: id,
      advance_type: randomElement(advanceTypes),
      client_id: randomElement(clientIds),
      matter_id: randomElement(matterIds),
      amount: parseFloat(amount.toFixed(2)),
      currency: currency,
      date_received: date,
      payment_method: randomElement(['bank_transfer', 'check', 'cash', 'wire']),
      reference_number: `REF-${randomInt(10000, 99999)}`,
      balance_remaining: balance,
      status: balance > 0 ? 'active' : randomElement(['active', 'depleted']),
      notes: null,
      created_at: date + 'T10:00:00.000Z',
      updated_at: now(),
    });
  }
  return advances;
}

function generateInvoices(count, clientIds, matterIds) {
  const invoices = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('INV');
    const issueDate = randomDate(2022, 2026);
    const currency = randomElement(currencies);
    const baseSubtotal = randomFloat(500, 30000);
    const subtotal = currency === 'LBP' ? baseSubtotal * 89500 : baseSubtotal;
    const vatRate = randomElement([0, 0, 11]);
    const vatAmount = parseFloat((subtotal * vatRate / 100).toFixed(2));
    const total = parseFloat((subtotal + vatAmount).toFixed(2));
    const status = randomElement(invoiceStatuses);

    invoices.push({
      invoice_id: id,
      invoice_number: `INV-${String(i + 1).padStart(5, '0')}`,
      client_id: randomElement(clientIds),
      matter_id: randomElement(matterIds),
      issue_date: issueDate,
      due_date: `${parseInt(issueDate.substring(0, 4))}-${issueDate.substring(5, 7)}-${String(Math.min(28, parseInt(issueDate.substring(8, 10)) + 30)).padStart(2, '0')}`,
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total: total,
      currency: currency,
      status: status,
      paid_date: status === 'paid' ? randomDate(2022, 2026) : null,
      created_at: issueDate + 'T09:00:00.000Z',
      updated_at: now(),
    });
  }
  return invoices;
}

function generateAppointments(count, clientIds, matterIds) {
  const appointments = [];
  for (let i = 0; i < count; i++) {
    const id = generateId('APT');
    const date = randomDate(2022, 2026);
    const startTime = randomTime();
    const endH = String(parseInt(startTime.split(':')[0]) + 1).padStart(2, '0');

    appointments.push({
      appointment_id: id,
      appointment_type: randomElement(appointmentTypes),
      title: `${randomElement(['Meeting with', 'Call with', 'Review with', 'Briefing for'])} ${randomElement(firstNames)} ${randomElement(lastNames)}`,
      date: date,
      start_time: startTime,
      end_time: `${endH}:${startTime.split(':')[1]}`,
      location_type: randomElement(['office', 'court', 'client_office', 'virtual']),
      client_id: randomElement(clientIds),
      matter_id: Math.random() < 0.7 ? randomElement(matterIds) : null,
      status: randomElement(['scheduled', 'completed', 'cancelled']),
      created_at: now(),
      updated_at: now(),
    });
  }
  return appointments;
}

function generateDeadlines(count, matterIds, clientIds) {
  const deadlines = [];
  for (let i = 0; i < count; i++) {
    const date = randomDate(2023, 2026);
    deadlines.push({
      client_id: randomElement(clientIds),
      matter_id: randomElement(matterIds),
      title: `${randomElement(['File', 'Submit', 'Respond to', 'Prepare', 'Review'])} ${randomElement(['appeal', 'brief', 'motion', 'response', 'evidence', 'report', 'compliance filing'])}`,
      deadline_date: date,
      reminder_days: randomElement([3, 7, 14, 30]),
      priority: randomElement(priorities),
      status: randomElement(['pending', 'pending', 'completed', 'overdue']),
      created_at: now(),
      updated_at: now(),
    });
  }
  return deadlines;
}

// ==================== DATABASE INSERTION ====================

function insertBatch(db, sql, records, columns) {
  // Use transactions for speed
  db.run('BEGIN TRANSACTION');
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = `${sql} (${columns.join(', ')}) VALUES (${placeholders})`;

  for (const record of records) {
    const values = columns.map(col => record[col] !== undefined ? record[col] : null);
    try {
      db.run(stmt, values);
    } catch (e) {
      // Log but continue — don't fail entire batch for one record
      console.error(`\n  Error inserting record: ${e.message}`);
    }
  }
  db.run('COMMIT');
}

// ==================== MAIN ====================

async function main() {
  console.log('=== Qanuni Scale Test Data Generator ===\n');

  // 1. Find database
  const dbPath = path.join(__dirname, 'qanuni-web.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at: ${dbPath}`);
    console.error('Make sure qanuni-web.db exists (created by the API server).');
    process.exit(1);
  }

  // 2. Create backup
  const backupPath = dbPath + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`Creating backup: ${path.basename(backupPath)}`);
  fs.copyFileSync(dbPath, backupPath);
  console.log('Backup created.\n');

  // 3. Open database
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = OFF'); // Disable FK checks during bulk insert for speed

  // 4. Check existing counts
  const existingClients = db.exec('SELECT COUNT(*) FROM clients')[0].values[0][0];
  const existingMatters = db.exec('SELECT COUNT(*) FROM matters')[0].values[0][0];
  console.log(`Existing data: ${existingClients} clients, ${existingMatters} matters\n`);

  // 5. Generate data
  console.log('Generating data...');

  console.log(`  Lawyers: ${COUNTS.lawyers}`);
  const lawyers = generateLawyers(COUNTS.lawyers);
  const lawyerIds = lawyers.map(l => l.lawyer_id);

  console.log(`  Clients: ${COUNTS.clients}`);
  const clients = generateClients(COUNTS.clients);
  const clientIds = clients.map(c => c.client_id);

  console.log(`  Matters: ${COUNTS.matters}`);
  const matters = generateMatters(COUNTS.matters, clientIds, lawyerIds);
  const matterIds = matters.map(m => m.matter_id);

  console.log(`  Hearings: ${COUNTS.hearings}`);
  const hearings = generateHearings(COUNTS.hearings, matterIds);

  console.log(`  Tasks: ${COUNTS.tasks}`);
  const tasks = generateTasks(COUNTS.tasks, matterIds, clientIds, lawyerIds);

  console.log(`  Timesheets: ${COUNTS.timesheets}`);
  const timesheets = generateTimesheets(COUNTS.timesheets, matterIds, clientIds, lawyerIds);

  console.log(`  Expenses: ${COUNTS.expenses}`);
  const expenses = generateExpenses(COUNTS.expenses, matterIds, clientIds, lawyerIds);

  console.log(`  Advances: ${COUNTS.advances}`);
  const advances = generateAdvances(COUNTS.advances, clientIds, matterIds);

  console.log(`  Invoices: ${COUNTS.invoices}`);
  const invoices = generateInvoices(COUNTS.invoices, clientIds, matterIds);

  console.log(`  Appointments: ${COUNTS.appointments}`);
  const appointments = generateAppointments(COUNTS.appointments, clientIds, matterIds);

  console.log(`  Deadlines: ${COUNTS.deadlines}`);
  const deadlines = generateDeadlines(COUNTS.deadlines, matterIds, clientIds);

  console.log('\nGeneration complete. Inserting into database...\n');

  // 6. Insert data
  const startTime = Date.now();

  process.stdout.write('  Inserting lawyers...');
  insertBatch(db, 'INSERT INTO lawyers', lawyers, [
    'lawyer_id', 'name', 'initials', 'email', 'phone',
    'hourly_rate', 'hourly_rate_currency', 'active', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting clients...');
  insertBatch(db, 'INSERT INTO clients', clients, [
    'client_id', 'client_name', 'client_type', 'entity_type', 'email',
    'phone', 'mobile', 'address', 'default_currency', 'billing_terms',
    'active', 'source', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting matters...');
  insertBatch(db, 'INSERT INTO matters', matters, [
    'matter_id', 'client_id', 'matter_name', 'matter_type', 'status',
    'case_number', 'court_type_id', 'court_region_id', 'responsible_lawyer_id',
    'opening_date', 'closing_date', 'matter_stage', 'fee_arrangement',
    'agreed_fee_amount', 'agreed_fee_currency', 'notes', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting hearings...');
  insertBatch(db, 'INSERT INTO hearings', hearings, [
    'hearing_id', 'matter_id', 'hearing_date', 'hearing_time', 'end_time',
    'court_type_id', 'court_region_id', 'judge', 'purpose_id', 'outcome',
    'notes', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting tasks...');
  insertBatch(db, 'INSERT INTO tasks', tasks, [
    'task_id', 'task_number', 'matter_id', 'client_id', 'task_type_id',
    'title', 'description', 'due_date', 'priority', 'status',
    'assigned_to', 'assigned_by', 'assigned_date', 'completed_date',
    'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting timesheets...');
  insertBatch(db, 'INSERT INTO timesheets', timesheets, [
    'timesheet_id', 'lawyer_id', 'client_id', 'matter_id', 'date',
    'minutes', 'narrative', 'billable', 'rate_per_hour', 'rate_currency',
    'status', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting expenses...');
  insertBatch(db, 'INSERT INTO expenses', expenses, [
    'expense_id', 'expense_type', 'client_id', 'matter_id', 'lawyer_id',
    'category_id', 'amount', 'currency', 'description', 'date',
    'billable', 'status', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting advances...');
  insertBatch(db, 'INSERT INTO advances', advances, [
    'advance_id', 'advance_type', 'client_id', 'matter_id', 'amount',
    'currency', 'date_received', 'payment_method', 'reference_number',
    'balance_remaining', 'status', 'notes', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting invoices...');
  insertBatch(db, 'INSERT INTO invoices', invoices, [
    'invoice_id', 'invoice_number', 'client_id', 'matter_id', 'issue_date',
    'due_date', 'subtotal', 'vat_rate', 'vat_amount', 'total',
    'currency', 'status', 'paid_date', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting appointments...');
  insertBatch(db, 'INSERT INTO appointments', appointments, [
    'appointment_id', 'appointment_type', 'title', 'date', 'start_time',
    'end_time', 'location_type', 'client_id', 'matter_id', 'status',
    'created_at', 'updated_at',
  ]);
  console.log(' done');

  process.stdout.write('  Inserting deadlines...');
  insertBatch(db, 'INSERT INTO deadlines', deadlines, [
    'client_id', 'matter_id', 'title', 'deadline_date', 'reminder_days',
    'priority', 'status', 'created_at', 'updated_at',
  ]);
  console.log(' done');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 7. Save and verify
  process.stdout.write('\nSaving database to disk...');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log(' done');

  // 8. Verification
  console.log('\n=== Verification ===');
  const tables = [
    'clients', 'lawyers', 'matters', 'hearings', 'tasks',
    'timesheets', 'expenses', 'advances', 'invoices', 'appointments', 'deadlines',
  ];
  let totalRecords = 0;
  for (const table of tables) {
    const count = db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0];
    console.log(`  ${table}: ${count}`);
    totalRecords += count;
  }

  db.close();

  console.log(`\n  Total records: ${totalRecords}`);
  console.log(`  Database size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Insert time: ${elapsed}s`);
  console.log(`  Backup saved: ${path.basename(backupPath)}`);
  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
