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

    // String length
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
      maxLength: 255
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
    entity_id: {
      required: true,
      type: 'string',
      label: 'Entity'
    },
    name: {
      required: true,
      type: 'string',
      label: 'Shareholder name'
    },
    shares: {
      required: true,
      type: 'number',
      min: 0,
      label: 'Number of shares'
    }
  },

  director: {
    entity_id: {
      required: true,
      type: 'string',
      label: 'Entity'
    },
    name: {
      required: true,
      type: 'string',
      label: 'Director name'
    }
  },

  currency: {
    code: {
      required: true,
      type: 'string',
      maxLength: 10,
      label: 'Currency code'
    },
    name_en: {
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
