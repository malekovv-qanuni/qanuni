/**
 * Qanuni SaaS - Authentication Middleware
 *
 * JWT token generation and verification.
 * Used by all protected routes to enforce authentication.
 *
 * @version 1.0.0 (Week 1 Day 3)
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ==================== TOKEN GENERATION ====================

/**
 * Generate an access token for a user
 * @param {Object} user - User object { user_id, firm_id, email, role }
 * @returns {string} JWT access token
 */
function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      firm_id: user.firm_id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate a refresh token for a user
 * @param {Object} user - User object { user_id, firm_id }
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      firm_id: user.firm_id,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

// ==================== MIDDLEWARE ====================

/**
 * Express middleware to verify JWT access token.
 * Attaches decoded user info to req.user on success.
 *
 * Usage in routes:
 *   router.get('/protected', authenticate, (req, res) => {
 *     console.log(req.user.firm_id); // Available after auth
 *   });
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'No authorization header provided'
    });
  }

  // Expect "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Use: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { user_id, firm_id, email, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

/**
 * Verify a refresh token
 * @param {string} token - Refresh token string
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

// ==================== EXPORTS ====================

module.exports = {
  generateToken,
  generateRefreshToken,
  authenticate,
  verifyRefreshToken
};
