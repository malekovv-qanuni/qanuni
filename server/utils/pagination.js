/**
 * Qanuni SaaS - Pagination Utilities
 *
 * Standard pagination helpers for all list endpoints.
 * Defaults: page 1, limit 50, max 100.
 *
 * @version 1.0.0 (Week 2 Day 8)
 */

/**
 * Parse and sanitize pagination params from query string
 * @param {string|number} page - Page number (1-based)
 * @param {string|number} limit - Items per page
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(page, limit) {
  const rawPage = parseInt(page);
  const rawLimit = parseInt(limit);
  const p = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const l = Math.min(100, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
  return {
    page: p,
    limit: l,
    offset: (p - 1) * l
  };
}

/**
 * Build pagination metadata for response
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total record count
 * @returns {{ page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
function buildPaginationResponse(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

module.exports = { parsePagination, buildPaginationResponse };
