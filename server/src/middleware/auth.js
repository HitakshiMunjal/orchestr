const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'orchestr-jwt-token-secret-key-2026';

/**
 * Main authentication middleware:
 * Supports Bearer token OR rapid persona switcher header `x-user-id`
 */
async function authenticate(req, res, next) {
  try {
    let userId = null;

    // Check custom fast-switch header
    if (req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
      }
    }

    if (!userId) {
      // Default to guest or Aarav Sharma if not specified
      req.user = null;
      return next();
    }

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
}

/**
 * Require valid logged-in user
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in with a campus email.' });
  }
  next();
}

/**
 * Role-Based Access Control middleware
 */
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next(); // Super Admin has access to all routes
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Requires one of [${roles.join(', ')}] role. Current role: ${req.user.role}`
      });
    }

    next();
  };
}

/**
 * Strike Enforcement Check:
 * Blocks students with 3+ strikes from registering for new events
 */
function requireUnblockedStudent(req, res, next) {
  if (!req.user) return next();

  if (req.user.role === 'STUDENT') {
    const isBlocked = req.user.strikes >= 3 && req.user.isBlockedUntil && new Date() < new Date(req.user.isBlockedUntil);
    if (isBlocked) {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED_STRIKES',
        message: `Your account is temporarily suspended until ${new Date(req.user.isBlockedUntil).toLocaleDateString()} due to repeated event no-shows (3 strikes accrued). Contact campus administration to appeal.`
      });
    }
  }

  next();
}

module.exports = {
  authenticate,
  requireAuth,
  requireRole,
  requireUnblockedStudent,
  JWT_SECRET
};
