/**
 * Qanuni SaaS - Authentication Routes
 *
 * Handles login, registration, token refresh.
 *
 * @version 2.0.0 (Week 1 Day 3 - Full implementation)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../database');
const { sql } = database;
const { validateBody } = require('../middleware/validate');
const { generateToken, generateRefreshToken, authenticate, verifyRefreshToken } = require('../middleware/auth');

const BCRYPT_SALT_ROUNDS = 10;

// ==================== ROUTES ====================

/**
 * GET /api/auth/test
 * Simple test endpoint to verify routing works
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/register
 * Register a new user and create their firm.
 * Creates firm + user atomically in a transaction.
 *
 * Body: { email, password, firm_name, full_name? }
 * Returns: { success, token, refreshToken, user }
 */
router.post('/register', validateBody('register'), async (req, res) => {
  try {
    const { email, password, firm_name, full_name } = req.body;

    // Check if email already exists
    const existing = await database.getOne(
      'SELECT user_id FROM users WHERE email = @email',
      { email }
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create firm + user in transaction
    const result = await database.transaction(async (createRequest) => {
      // 1. Create firm
      const firmReq = createRequest();
      firmReq.input('firm_name', sql.NVarChar(255), firm_name);
      const firmResult = await firmReq.query(`
        INSERT INTO firms (firm_name)
        OUTPUT INSERTED.firm_id
        VALUES (@firm_name)
      `);
      const firm_id = firmResult.recordset[0].firm_id;

      // 2. Create user
      const userReq = createRequest();
      userReq.input('firm_id', sql.Int, firm_id);
      userReq.input('email', sql.NVarChar(255), email);
      userReq.input('password_hash', sql.NVarChar(255), password_hash);
      userReq.input('full_name', sql.NVarChar(255), full_name || null);
      userReq.input('role', sql.NVarChar(50), 'admin'); // First user in firm is admin
      const userResult = await userReq.query(`
        INSERT INTO users (firm_id, email, password_hash, full_name, role)
        OUTPUT INSERTED.user_id, INSERTED.firm_id, INSERTED.email, INSERTED.full_name, INSERTED.role
        VALUES (@firm_id, @email, @password_hash, @full_name, @role)
      `);
      const user = userResult.recordset[0];

      return { firm_id, user };
    });

    const { user } = result;

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        user_id: user.user_id,
        firm_id: user.firm_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password.
 *
 * Body: { email, password }
 * Returns: { success, token, refreshToken, user }
 */
router.post('/login', validateBody('login'), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include firm info)
    const user = await database.getOne(
      `SELECT u.user_id, u.firm_id, u.email, u.password_hash, u.full_name, u.role, u.is_active,
              f.firm_name
       FROM users u
       JOIN firms f ON f.firm_id = u.firm_id
       WHERE u.email = @email`,
      { email }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact your administrator.'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        user_id: user.user_id,
        firm_id: user.firm_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        firm_name: user.firm_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an expired access token using a valid refresh token.
 *
 * Body: { refreshToken }
 * Returns: { success, token, refreshToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Fetch current user data (in case role changed, account deactivated, etc.)
    const user = await database.getOne(
      `SELECT user_id, firm_id, email, full_name, role, is_active
       FROM users
       WHERE user_id = @user_id AND firm_id = @firm_id`,
      { user_id: decoded.user_id, firm_id: decoded.firm_id }
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated'
      });
    }

    // Generate new token pair
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info from token.
 * Requires authentication.
 *
 * Returns: { success, user }
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await database.getOne(
      `SELECT u.user_id, u.firm_id, u.email, u.full_name, u.role, u.is_active, u.created_at,
              f.firm_name
       FROM users u
       JOIN firms f ON f.firm_id = u.firm_id
       WHERE u.user_id = @user_id`,
      { user_id: req.user.user_id }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        firm_id: user.firm_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        firm_name: user.firm_name,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

module.exports = router;
