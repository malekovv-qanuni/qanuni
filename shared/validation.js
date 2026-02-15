/**
 * Qanuni Input Validation
 * 
 * Validates data BEFORE it reaches the database.
 * Every IPC handler that writes data should validate first.
 * 
 * Returns { valid: true } or { valid: false, errors: [...] }
 * 
 * @version 1.0.0 (Phase 1 Hardening)
 */

// ==================== CORE VALIDATORS ====================

/**
 * Validate an object against a schema.
 * 
 * Usage:
 *   const result = validate(clientData, schemas.client);
 *   if (!result.valid) return { success: false, errors: result.errors };
 */
function validate(data, schema) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: '_root', message: 'Data must be an object' }] };
  }

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rules.label ? `${rules.label} is required` : `${field} is required`,
        code: 'REQUIRED'
      });
      continue; // Skip other checks if required field is missing
    }

    // Skip further checks if value is empty and not required
    if (value === undefined || value === null || value === '') continue;

    // Type checks
    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push({ field, message: `${field} must be a string`, code: 'TYPE_STRING' });
    }

    if (rules.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push({ field, message: `${field} must be a number`, code: 'TYPE_NUMBER' });
      } else {
        if (rules.min !== undefined && num < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}`, code: 'MIN' });
        }
        if (rules.max !== undefined && num > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}`, code: 'MAX' });
        }
      }
    }

    if (rules.type === 'date') {
      if (typeof value === 'string' && value.length > 0) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          errors.push({ field, message: `${field} must be YYYY-MM-DD format`, code: 'DATE_FORMAT' });
        } else {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            errors.push({ field, message: `${field} is not a valid date`, code: 'DATE_INVALID' });
          }
        }
      }
    }

    if (rules.type === 'datetime') {
      if (typeof value === 'string' && value.length > 0) {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          errors.push({ field, message: `${field} is not a valid datetime`, code: 'DATETIME_INVALID' });
        }
      }
    }

    // String length - minimum
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({
        field,
        message: rules.label
          ? `${rules.label} must be at least ${rules.minLength} characters`
          : `${field} must be at least ${rules.minLength} characters`,
        code: 'MIN_LENGTH'
      });
    }

    // String length - maximum
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({ field, message: `${field} exceeds maximum length of ${rules.maxLength}`, code: 'MAX_LENGTH' });
    }

    // Enum check
    if (rules.oneOf && !rules.oneOf.includes(value)) {
      errors.push({ field, message: `${field} must be one of: ${rules.oneOf.join(', ')}`, code: 'ENUM' });
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors.push({ field, message: rules.patternMessage || `${field} has invalid format`, code: 'PATTERN' });
    }

    // Custom validator
    if (rules.custom) {
      const customError = rules.custom(value, data);
      if (customError) {
        errors.push({ field, message: customError, code: 'CUSTOM' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ==================== SCHEMAS ====================

const schemas = {
  client: {
    client_name: {
      required: true,
      type: 'string',
      maxLength: 255,
      label: 'Client name'
    },
    client_name_arabic: {
      type: 'string',
      maxLength: 255
    },
    client_type: {
      required: true,
      type: 'string',
      oneOf: ['individual', 'legal_entity'],
      label: 'Client type'
    },
    entity_type: {
      type: 'string'
    },
    email: {
      type: 'string',
      maxLength: 255,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Invalid email format'
    },
    phone: { type: 'string', maxLength: 50 },
    mobile: { type: 'string', maxLength: 50 },
    default_currency: { type: 'string', maxLength: 10 }
  },

  matter: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    matter_name: {
      required: true,
      type: 'string',
      maxLength: 500,
      label: 'Matter name'
    },
    matter_type: {
      type: 'string',
      oneOf: ['litigation', 'advisory', 'transactional', 'corporate', 'other']
    },
    status: {
      type: 'string',
      oneOf: ['active', 'closed', 'pending', 'archived', 'on_hold']
    },
    opening_date: {
      type: 'date'
    }
  },

  hearing: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    hearing_date: {
      required: true,
      type: 'date',
      label: 'Hearing date'
    },
    court_type_id: {
      type: 'number'
    },
    court_region_id: {
      type: 'number'
    }
  },

  task: {
    title: {
      required: true,
      type: 'string',
      maxLength: 500,
      label: 'Task title'
    },
    status: {
      type: 'string',
      oneOf: ['assigned', 'in_progress', 'done', 'cancelled']
    },
    priority: {
      type: 'string',
      oneOf: ['high', 'medium', 'low']
    },
    due_date: {
      type: 'date'
    }
  },

  timesheet: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    lawyer_id: {
      required: true,
      type: 'string',
      label: 'Lawyer'
    },
    date: {
      required: true,
      type: 'date',
      label: 'Date'
    },
    minutes: {
      required: true,
      type: 'number',
      min: 1,
      max: 1440,
      label: 'Minutes'
    },
    rate: {
      type: 'number',
      min: 0,
      label: 'Rate'
    }
  },

  expense: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    date: {
      required: true,
      type: 'date',
      label: 'Date'
    },
    amount: {
      required: true,
      type: 'number',
      min: 0.01,
      label: 'Amount'
    },
    description: {
      required: true,
      type: 'string',
      maxLength: 1000,
      label: 'Description'
    }
  },

  judgment: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    hearing_id: {
      type: 'string'
    },
    expected_date: {
      type: 'date',
      label: 'Expected date'
    },
    status: {
      type: 'string',
      oneOf: ['pending', 'favorable', 'unfavorable', 'partial', 'dismissed', 'settled', 'appealed', 'moved_to_hearing']
    }
  },

  invoice: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    issue_date: {
      required: true,
      type: 'date',
      label: 'Issue date'
    },
    total: {
      required: true,
      type: 'number',
      min: 0,
      label: 'Total'
    },
    status: {
      type: 'string',
      oneOf: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'written_off']
    }
  },

  advance: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    amount: {
      required: true,
      type: 'number',
      min: 0.01,
      label: 'Amount'
    },
    date_received: {
      required: true,
      type: 'date',
      label: 'Date received'
    },
    advance_type: {
      required: true,
      type: 'string',
      label: 'Advance type'
    }
  },

  appointment: {
    title: {
      required: true,
      type: 'string',
      maxLength: 500,
      label: 'Title'
    },
    appointment_date: {
      required: true,
      type: 'date',
      label: 'Date'
    }
  },

  deadline: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    deadline_date: {
      required: true,
      type: 'date',
      label: 'Deadline date'
    },
    title: {
      required: true,
      type: 'string',
      label: 'Title'
    }
  },

  diary_entry: {
    matter_id: {
      required: true,
      type: 'string',
      label: 'Matter'
    },
    entry_date: {
      required: true,
      type: 'date',
      label: 'Entry date'
    },
    entry_type: {
      required: true,
      type: 'string',
      oneOf: ['note', 'call', 'meeting', 'correspondence', 'filing', 'research', 'other'],
      label: 'Entry type'
    }
  },

  lookup_item: {
    name_en: {
      required: true,
      type: 'string',
      maxLength: 255,
      label: 'Name (English)'
    },
    name_ar: {
      type: 'string',
      maxLength: 255,
      label: 'Name (Arabic)'
    },
    name_fr: {
      type: 'string',
      maxLength: 255,
      label: 'Name (French)'
    },
    icon: {
      type: 'string',
      maxLength: 50,
      label: 'Icon'
    },
    code: {
      type: 'string',
      maxLength: 20,
      label: 'Code'
    },
    sort_order: {
      type: 'number',
      min: 0,
      label: 'Sort Order'
    }
  },

  lawyer: {
    full_name: {
      required: true,
      type: 'string',
      maxLength: 255,
      label: 'Lawyer name'
    }
  },

  corporate_entity: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    }
  },

  shareholder: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    name: {
      required: true,
      type: 'string',
      label: 'Shareholder name'
    },
    shares_owned: {
      required: true,
      type: 'number',
      min: 0,
      label: 'Number of shares'
    }
  },

  director: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    name: {
      required: true,
      type: 'string',
      label: 'Director name'
    }
  },

  share_transfer: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    shares_transferred: {
      required: true,
      type: 'number',
      min: 1,
      label: 'Shares transferred'
    },
    transfer_type: {
      required: true,
      type: 'string',
      oneOf: ['transfer', 'issuance', 'redemption'],
      label: 'Transfer type'
    },
    transfer_date: {
      required: true,
      type: 'date',
      label: 'Transfer date'
    }
  },

  filing: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    filing_type: {
      required: true,
      type: 'string',
      maxLength: 100,
      label: 'Filing type'
    },
    filing_date: {
      required: true,
      type: 'date',
      label: 'Filing date'
    }
  },

  meeting: {
    client_id: {
      required: true,
      type: 'string',
      label: 'Client'
    },
    meeting_type: {
      required: true,
      type: 'string',
      maxLength: 100,
      label: 'Meeting type'
    },
    meeting_date: {
      required: true,
      type: 'date',
      label: 'Meeting date'
    }
  },

  currency: {
    code: {
      required: true,
      type: 'string',
      maxLength: 10,
      label: 'Currency code'
    },
    name: {
      required: true,
      type: 'string',
      maxLength: 100,
      label: 'Currency name'
    }
  },

  exchange_rate: {
    from_currency: {
      required: true,
      type: 'string',
      label: 'From currency'
    },
    to_currency: {
      required: true,
      type: 'string',
      label: 'To currency'
    },
    rate: {
      required: true,
      type: 'number',
      min: 0.000001,
      label: 'Exchange rate'
    },
    effective_date: {
      required: true,
      type: 'date',
      label: 'Effective date'
    }
  },

  // ==================== AUTH SCHEMAS (SaaS) ====================

  register: {
    email: {
      required: true,
      type: 'string',
      maxLength: 255,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Invalid email format',
      label: 'Email'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 128,
      label: 'Password'
    },
    firm_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 255,
      label: 'Firm name'
    },
    full_name: {
      required: false,
      type: 'string',
      maxLength: 255,
      label: 'Full name'
    }
  },

  login: {
    email: {
      required: true,
      type: 'string',
      label: 'Email'
    },
    password: {
      required: true,
      type: 'string',
      label: 'Password'
    }
  },

  // ==================== SaaS CLIENT SCHEMA ====================
  // Separate from desktop 'client' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.

  // ==================== SaaS MATTER SCHEMA ====================
  // Separate from desktop 'matter' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.
  // client_ids and primary_client_id are validated in route handler (not here).

  matter_saas: {
    matter_number: {
      required: true,
      type: 'string',
      maxLength: 50,
      label: 'Matter number'
    },
    matter_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 500,
      label: 'Matter name'
    },
    matter_name_arabic: {
      type: 'string',
      maxLength: 500
    },
    matter_type: {
      type: 'string',
      required: false,
      oneOf: ['litigation', 'advisory', 'corporate', 'transactional', 'other']
    },
    matter_status: {
      type: 'string',
      required: false,
      oneOf: ['active', 'pending', 'closed', 'archived']
    },
    court_name: { type: 'string', maxLength: 200 },
    court_name_arabic: { type: 'string', maxLength: 200 },
    case_number: { type: 'string', maxLength: 100 },
    case_year: { type: 'number' },
    hourly_rate: { type: 'number' },
    flat_fee: { type: 'number' },
    billing_type: {
      type: 'string',
      required: false,
      oneOf: ['hourly', 'flat_fee', 'contingency', 'pro_bono']
    },
    date_opened: { type: 'date' },
    date_closed: { type: 'date' },
    statute_of_limitations: { type: 'date' },
    description: { type: 'string' },
    notes: { type: 'string' },
    is_active: { required: false }
  },

  client_saas: {
    client_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 255,
      label: 'Client name'
    },
    client_name_arabic: {
      type: 'string',
      maxLength: 255
    },
    client_type: {
      type: 'string',
      required: false,
      oneOf: ['individual', 'legal_entity']
    },
    email: {
      type: 'string',
      maxLength: 255,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Invalid email format'
    },
    phone: { type: 'string', maxLength: 50 },
    mobile: { type: 'string', maxLength: 50 },
    address: { type: 'string', maxLength: 500 },
    address_arabic: { type: 'string', maxLength: 500 },
    notes: { type: 'string' },
    is_active: { required: false }
  },

  // ==================== SaaS LAWYER SCHEMA ====================
  // Separate from desktop 'lawyer' schema to avoid conflicts.
  // SaaS uses full_name/full_name_arabic directly in DB columns.
  // Desktop uses name/name_arabic in DB, aliased to full_name in queries.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.

  lawyer_saas: {
    full_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 200,
      label: 'Lawyer name'
    },
    full_name_arabic: {
      type: 'string',
      maxLength: 200
    },
    email: {
      type: 'string',
      maxLength: 255
    },
    phone: { type: 'string', maxLength: 50 },
    mobile: { type: 'string', maxLength: 50 },
    role: {
      type: 'string',
      required: false,
      oneOf: ['partner', 'senior_associate', 'associate', 'paralegal', 'clerk', 'of_counsel']
    },
    hourly_rate: { type: 'number' },
    hourly_rate_currency: { type: 'string', maxLength: 10 },
    hire_date: { type: 'string' },
    is_active: { required: false },
    user_id: { type: 'number' },
    notes: { type: 'string' }
  },

  // ==================== SaaS HEARING SCHEMA ====================
  // Separate from desktop 'hearing' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.
  // matter_id existence is validated in route handler (FK check).

  // ==================== SaaS DIARY SCHEMA ====================
  // Separate from desktop 'diary_entry' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.
  // matter_id existence is validated in route handler (FK check).

  diary_saas: {
    matter_id: { required: true, type: 'number', label: 'Matter' },
    entry_date: { required: true, type: 'date', label: 'Entry date' },
    entry_type: { type: 'string', oneOf: ['note', 'call', 'meeting', 'correspondence', 'filing', 'research', 'other'] },
    title: { required: true, type: 'string', minLength: 1, maxLength: 500, label: 'Title' },
    description: { type: 'string', maxLength: 10000 }
  },

  // ==================== SaaS TASK SCHEMA ====================
  // Separate from desktop 'task' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.
  // Optional FKs (matter_id, client_id, hearing_id, assigned_to) validated in route handler.

  task_saas: {
    title: { required: true, type: 'string', minLength: 2, maxLength: 500, label: 'Task title' },
    description: { type: 'string', maxLength: 10000 },
    instructions: { type: 'string', maxLength: 10000 },
    due_date: { type: 'date', label: 'Due date' },
    due_time: { type: 'string', label: 'Due time' },
    time_budget_minutes: { type: 'number', min: 1, max: 9999, label: 'Time budget (minutes)' },
    priority: { type: 'string', oneOf: ['high', 'medium', 'low'], label: 'Priority' },
    status: { type: 'string', oneOf: ['assigned', 'in_progress', 'done', 'cancelled'], label: 'Status' },
    matter_id: { type: 'number', label: 'Matter' },
    client_id: { type: 'number', label: 'Client' },
    hearing_id: { type: 'number', label: 'Hearing' },
    assigned_to: { type: 'number', label: 'Assigned to' },
    completion_notes: { type: 'string', maxLength: 10000 },
    notes: { type: 'string', maxLength: 10000 }
  },

  // ==================== SaaS JUDGMENT SCHEMA ====================
  // Separate from desktop 'judgment' schema to avoid conflicts.
  // firm_id comes from JWT token (req.user.firm_id), not from request body.
  // matter_id existence is validated in route handler (FK check).

  judgment_saas: {
    matter_id: { required: true, type: 'number', label: 'Matter' },
    hearing_id: { type: 'number', label: 'Hearing' },
    judgment_type: { type: 'string', oneOf: ['first_instance', 'appeal', 'cassation', 'arbitration'], label: 'Judgment type' },
    expected_date: { type: 'date', label: 'Expected date' },
    actual_date: { type: 'date', label: 'Actual date' },
    reminder_days: { type: 'number', min: 0, max: 365, label: 'Reminder days' },
    judgment_outcome: { type: 'string', maxLength: 500, label: 'Judgment outcome' },
    judgment_summary: { type: 'string', maxLength: 10000, label: 'Judgment summary' },
    amount_awarded: { type: 'number', min: 0, label: 'Amount awarded' },
    currency: { type: 'string', maxLength: 10, label: 'Currency' },
    in_favor_of: { type: 'string', maxLength: 500, label: 'In favor of' },
    appeal_deadline: { type: 'date', label: 'Appeal deadline' },
    status: { type: 'string', oneOf: ['pending', 'favorable', 'unfavorable', 'partial', 'dismissed', 'settled', 'appealed', 'moved_to_hearing'], label: 'Status' },
    notes: { type: 'string', maxLength: 10000 }
  },

  deadline_saas: {
    matter_id: { required: true, type: 'number', label: 'Matter' },
    judgment_id: { type: 'number', label: 'Judgment' },
    title: { required: true, type: 'string', minLength: 1, label: 'Title' },
    deadline_date: { required: true, type: 'date', label: 'Deadline date' },
    reminder_days: { type: 'number', min: 0, max: 365, label: 'Reminder days' },
    priority: { type: 'string', oneOf: ['low', 'medium', 'high', 'urgent'], label: 'Priority' },
    status: { type: 'string', oneOf: ['pending', 'completed', 'overdue', 'cancelled'], label: 'Status' },
    notes: { type: 'string', maxLength: 10000 }
  },

  timesheet_saas: {
    matter_id: { type: 'number', label: 'Matter' },
    client_id: { type: 'number', label: 'Client' },
    lawyer_id: { type: 'number', label: 'Lawyer' },
    entry_date: { required: true, type: 'date', label: 'Date' },
    minutes: { required: true, type: 'number', min: 1, max: 1440, label: 'Minutes' },
    narrative: { required: true, type: 'string', minLength: 1, label: 'Narrative' },
    billable: { type: 'boolean', label: 'Billable' },
    rate_per_hour: { type: 'number', min: 0, label: 'Rate per hour' },
    rate_currency: { type: 'string', maxLength: 10, label: 'Currency' },
    status: { type: 'string', oneOf: ['draft', 'submitted', 'approved', 'billed'], label: 'Status' }
  },

  expense_saas: {
    matter_id: { type: 'number', label: 'Matter' },
    lawyer_id: { type: 'number', label: 'Lawyer' },
    expense_type: { type: 'string', oneOf: ['client', 'firm', 'personal'], label: 'Expense type' },
    date: { required: true, type: 'date', label: 'Date' },
    amount: { required: true, type: 'number', min: 0.01, label: 'Amount' },
    currency: { type: 'string', maxLength: 10, label: 'Currency' },
    description: { required: true, type: 'string', minLength: 1, maxLength: 1000, label: 'Description' },
    category: { type: 'string', maxLength: 100, label: 'Category' },
    billable: { type: 'boolean', label: 'Billable' },
    markup_percent: { type: 'number', min: 0, max: 100, label: 'Markup percent' },
    paid_by_firm: { type: 'boolean', label: 'Paid by firm' },
    paid_by_lawyer_id: { type: 'number', label: 'Paid by lawyer' },
    status: { type: 'string', oneOf: ['pending', 'approved', 'reimbursed', 'billed', 'rejected'], label: 'Status' },
    notes: { type: 'string', maxLength: 10000, label: 'Notes' }
  },

  advance_saas: {
    advance_type: {
      required: true,
      type: 'string',
      oneOf: ['client_expense_advance', 'client_retainer', 'lawyer_advance', 'fee_payment_initial', 'fee_payment_interim', 'fee_payment_final'],
      label: 'Advance type'
    },
    client_id: { type: 'number', label: 'Client' },
    matter_id: { type: 'number', label: 'Matter' },
    lawyer_id: { type: 'number', label: 'Lawyer' },
    amount: { required: true, type: 'number', min: 0.01, label: 'Amount' },
    currency: { type: 'string', maxLength: 3, label: 'Currency' },
    date_received: { required: true, type: 'date', label: 'Date received' },
    payment_method: { type: 'string', maxLength: 50, label: 'Payment method' },
    reference_number: { type: 'string', maxLength: 100, label: 'Reference number' },
    balance_remaining: { type: 'number', min: 0, label: 'Balance remaining' },
    minimum_balance_alert: { type: 'number', min: 0, label: 'Minimum balance alert' },
    fee_description: { type: 'string', maxLength: 500, label: 'Fee description' },
    notes: { type: 'string', maxLength: 10000, label: 'Notes' },
    status: { type: 'string', oneOf: ['active', 'depleted', 'refunded'], label: 'Status' }
  },

  invoice_saas: {
    client_id: { required: true, type: 'number', label: 'Client' },
    matter_id: { type: 'number', label: 'Matter' },
    invoice_number: { type: 'string', maxLength: 50, label: 'Invoice number' },
    invoice_content_type: { type: 'string', oneOf: ['combined', 'time_only', 'expense_only', 'separate'], label: 'Content type' },
    issue_date: { required: true, type: 'date', label: 'Issue date' },
    due_date: { type: 'date', label: 'Due date' },
    period_start: { type: 'date', label: 'Period start' },
    period_end: { type: 'date', label: 'Period end' },
    subtotal: { type: 'number', min: 0, label: 'Subtotal' },
    discount_type: { type: 'string', oneOf: ['none', 'percentage', 'fixed'], label: 'Discount type' },
    discount_value: { type: 'number', min: 0, label: 'Discount value' },
    discount_amount: { type: 'number', min: 0, label: 'Discount amount' },
    retainer_applied: { type: 'number', min: 0, label: 'Retainer applied' },
    taxable_amount: { type: 'number', min: 0, label: 'Taxable amount' },
    vat_rate: { type: 'number', min: 0, max: 100, label: 'VAT rate' },
    vat_amount: { type: 'number', min: 0, label: 'VAT amount' },
    total: { required: true, type: 'number', min: 0, label: 'Total' },
    currency: { type: 'string', maxLength: 3, label: 'Currency' },
    status: { type: 'string', oneOf: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'written_off'], label: 'Status' },
    client_reference: { type: 'string', maxLength: 200, label: 'Client reference' },
    notes_to_client: { type: 'string', maxLength: 10000, label: 'Notes to client' },
    internal_notes: { type: 'string', maxLength: 10000, label: 'Internal notes' }
  },

  appointment_saas: {
    title: { type: 'string', required: true, label: 'Title', maxLength: 500 },
    appointment_date: { type: 'string', required: true, label: 'Date' },
    appointment_type: { type: 'string', required: false, label: 'Type' },
    description: { type: 'string', required: false, label: 'Description' },
    start_time: { type: 'string', required: false, label: 'Start Time' },
    end_time: { type: 'string', required: false, label: 'End Time' },
    all_day: { type: 'boolean', required: false, label: 'All Day' },
    location_type: { type: 'string', required: false, label: 'Location Type' },
    location_details: { type: 'string', required: false, label: 'Location Details', maxLength: 500 },
    client_id: { type: 'number', required: false, label: 'Client' },
    matter_id: { type: 'number', required: false, label: 'Matter' },
    billable: { type: 'boolean', required: false, label: 'Billable' },
    attendees: { type: 'string', required: false, label: 'Attendees' },
    notes: { type: 'string', required: false, label: 'Notes' },
    status: { type: 'string', required: false, label: 'Status' }
  },

  hearing_saas: {
    matter_id: {
      required: true,
      type: 'number',
      label: 'Matter'
    },
    hearing_date: {
      required: true,
      type: 'date',
      label: 'Hearing date'
    },
    hearing_time: {
      type: 'string',
      pattern: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
      patternMessage: 'Hearing time must be HH:MM or HH:MM:SS format'
    },
    hearing_type: {
      type: 'string',
      oneOf: ['initial', 'status', 'trial', 'sentencing', 'appeal', 'other']
    },
    court_name: { type: 'string', maxLength: 200 },
    court_room: { type: 'string', maxLength: 50 },
    judge_name: { type: 'string', maxLength: 200 },
    outcome: {
      type: 'string',
      oneOf: ['pending', 'continued', 'decided', 'settled', 'dismissed']
    },
    outcome_notes: { type: 'string' },
    next_hearing_date: { type: 'date' },
    reminder_days: { type: 'number', min: 0, max: 365 }
  }
};

// ==================== HELPER ====================

/**
 * Validate and return clean result for IPC handlers.
 * 
 * Usage in IPC handler:
 *   const check = validation.check(data, 'client');
 *   if (!check.valid) return check.result;  // Returns { success: false, errors: [...] }
 */
function check(data, schemaName) {
  const schema = schemas[schemaName];
  if (!schema) {
    return {
      valid: false,
      result: { success: false, error: `Unknown schema: ${schemaName}`, errors: [] }
    };
  }

  const result = validate(data, schema);
  if (!result.valid) {
    return {
      valid: false,
      result: {
        success: false,
        error: result.errors.map(e => e.message).join('; '),
        errors: result.errors
      }
    };
  }

  return { valid: true };
}

// ==================== EXPORTS ====================

module.exports = {
  validate,
  check,
  schemas
};
