/**
 * Qanuni SaaS - Request Validation Middleware
 *
 * Wraps shared/validation.js for use as Express middleware.
 * Validates req.body against a named schema before handler runs.
 *
 * @version 1.0.0 (Week 1 Day 3)
 */

const { validate, schemas } = require('../../shared/validation');

/**
 * Express middleware factory for request body validation.
 *
 * Usage in routes:
 *   const { validateBody } = require('../middleware/validate');
 *   router.post('/register', validateBody('register'), (req, res) => { ... });
 *
 * @param {string} schemaName - Name of the schema in shared/validation.js
 * @returns {Function} Express middleware
 */
function validateBody(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      console.error(`Validation middleware: unknown schema "${schemaName}"`);
      return res.status(500).json({
        success: false,
        error: `Server configuration error: unknown schema "${schemaName}"`
      });
    }

    const result = validate(req.body, schema);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.errors.map(e => e.message).join('; '),
        errors: result.errors
      });
    }

    // Validation passed — continue to route handler
    next();
  };
}

// ==================== EXPORTS ====================

module.exports = {
  validateBody
};
