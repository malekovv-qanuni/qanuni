// ============================================
// UTILITIES - Qanuni Legal ERP
// ============================================
// Contains: validators, useFormValidation hook, formatters
// 
// Usage:
//   import { validators, useFormValidation, formatDate, generateID } from './utils';
// ============================================

import { useState, useCallback } from 'react';

// ============================================
// VALIDATORS
// ============================================
export const validators = {
  required: (value, message) => (!value || (typeof value === 'string' && !value.trim())) ? message : null,
  email: (value, message) => {
    if (!value) return null; // Not required check, just format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? message : null;
  },
  phone: (value, message) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
    return !phoneRegex.test(value) ? message : null;
  },
  minLength: (value, min, message) => {
    if (!value) return null;
    return value.length < min ? message.replace('{min}', min) : null;
  },
  maxLength: (value, max, message) => {
    if (!value) return null;
    return value.length > max ? message.replace('{max}', max) : null;
  }
};

// ============================================
// FORM VALIDATION HOOK
// ============================================
export const useFormValidation = (initialValues, validationRules, translations, language) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      let error = null;
      if (rule.type === 'required') {
        error = validators.required(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'email') {
        error = validators.email(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'phone') {
        error = validators.phone(value, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'minLength') {
        error = validators.minLength(value, rule.min, translations[language][rule.message] || rule.message);
      } else if (rule.type === 'maxLength') {
        error = validators.maxLength(value, rule.max, translations[language][rule.message] || rule.message);
      }
      if (error) return error;
    }
    return null;
  }, [validationRules, translations, language]);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error on change if field was touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  }, [values, validationRules, validateField]);

  const resetForm = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    setValues
  };
};

// ============================================
// FORMATTERS & GENERATORS
// ============================================
export const generateID = (prefix) => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${year}-${random}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
};


// ============================================
// TEMPLATE FORMATTER (v46.58)
// Usage: tf(t[language].nExpensesAdded, { n: count })
// ============================================
export function tf(template, vars) {
  if (!template) return '';
  return Object.entries(vars).reduce((str, [key, val]) => 
    str.replace('{' + key + '}', String(val)), template);
}

// Default export for convenience
export default {
  validators,
  useFormValidation,
  generateID,
  formatDate,
  tf
};
