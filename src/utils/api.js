/**
 * API Wrapper for Qanuni Frontend (v47.0 Phase 3)
 * 
 * Handles structured error responses from hardened backend.
 * GET operations: unwrap arrays, handle error objects
 * WRITE operations: check success flag, extract errors
 */

/**
 * Safely call a GET/list API method.
 * Returns the data array, or empty array on failure.
 * Shows toast on error if showToast provided.
 */
export async function apiGet(apiFn, args = [], { showToast, language, fallback = [] } = {}) {
  try {
    const result = await apiFn(...args);
    
    // If result is an error object (structured response), handle it
    if (result && typeof result === 'object' && result.success === false) {
      if (showToast) {
        const errorMsg = language === 'ar' 
          ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
          : 'Failed to load data';
        showToast(errorMsg, 'error');
      }
      console.error('API GET error:', result.errors || result.error);
      return fallback;
    }
    
    // If result is an array, return it
    if (Array.isArray(result)) {
      return result;
    }
    
    // If result has a data property, return that
    if (result && result.data && Array.isArray(result.data)) {
      return result.data;
    }
    
    // Otherwise return the result itself (might be a single object)
    return result || fallback;
  } catch (error) {
    if (showToast) {
      const errorMsg = language === 'ar' 
        ? '\u062d\u062f\u062a\u062b \u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0639\u0645\u0644\u064a\u0629'
        : 'An error occurred';
      showToast(errorMsg, 'error');
    }
    console.error('API GET exception:', error);
    return fallback;
  }
}

/**
 * Safely call a WRITE API method (add/update/delete).
 * Returns { ok: true, id } on success, { ok: false, errors } on failure.
 * Shows toast on success/failure if showToast provided.
 */
export async function apiWrite(apiFn, args = [], { showToast, language, successMsg, errorMsg } = {}) {
  try {
    const result = await apiFn(...args);
    
    // Handle structured response from new backend
    if (result && typeof result === 'object') {
      if (result.success === false) {
        // Backend validation error
        const firstError = result.errors?.[0];
        const displayMsg = errorMsg || firstError?.message || (language === 'ar' 
          ? '\u0641\u0634\u0644\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629'
          : 'Operation failed');
        
        if (showToast) {
          showToast(displayMsg, 'error');
        }
        
        return { ok: false, errors: result.errors || [] };
      }
      
      if (result.success === true) {
        // Backend success
        if (showToast && successMsg) {
          showToast(successMsg, 'success');
        }
        
        return { 
          ok: true, 
          id: result.clientId || result.matterId || result.hearingId || result.taskId || 
              result.timesheetId || result.expenseId || result.advanceId || result.invoiceId ||
              result.judgmentId || result.deadlineId || result.appointmentId || result.diaryId ||
              result.id
        };
      }
    }
    
    // Old backend pattern (no structured response) — assume success if no error thrown
    if (showToast && successMsg) {
      showToast(successMsg, 'success');
    }
    
    return { ok: true, id: result };
  } catch (error) {
    const displayMsg = errorMsg || (language === 'ar' 
      ? '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639'
      : 'An unexpected error occurred');
    
    if (showToast) {
      showToast(displayMsg, 'error');
    }
    
    console.error('API WRITE exception:', error);
    return { ok: false, errors: [{ message: error.message }] };
  }
}

/**
 * Show field-level errors in a form.
 * Converts backend error format to UI-friendly display.
 * 
 * Usage in forms:
 * const result = await apiWrite(...);
 * if (!result.ok) {
 *   const fieldErrors = formatFieldErrors(result.errors);
 *   // Show fieldErrors in UI (e.g., highlight fields, show messages)
 * }
 */
export function formatFieldErrors(errors = []) {
  const fieldMap = {};
  errors.forEach(err => {
    if (err.field) {
      fieldMap[err.field] = err.message;
    }
  });
  return fieldMap;
}

/**
 * Get a user-friendly error message from error object.
 * Useful for displaying a single error message instead of field-by-field.
 */
export function getErrorMessage(errors = [], language = 'en') {
  if (!errors || errors.length === 0) {
    return language === 'ar' 
      ? '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f'
      : 'An unknown error occurred';
  }
  
  const firstError = errors[0];
  return firstError.message || (language === 'ar' 
    ? '\u0641\u0634\u0644\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629'
    : 'Operation failed');
}
