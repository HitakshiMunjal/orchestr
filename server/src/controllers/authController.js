const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { isValidCampusEmail, getCampusAffiliation } = require('../utils/crypto');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * Campus Email Login / Auto-Registration
 * Strictly enforces .edu or .ac.in domain requirement!
 */
async function login(req, res) {
  try {
    const { email, name, role = 'STUDENT', department } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Campus email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT CAMPUS DOMAIN CHECK: Must end with .edu or .ac.in
    if (!isValidCampusEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'INVALID_CAMPUS_DOMAIN',
        message: 'Login restricted to verified college emails (.edu or .ac.in). Personal email providers (gmail, yahoo, etc.) are prohibited.'
      });
    }

    let user = await db.users.findOne({ email: cleanEmail });

    if (!user) {
      // Auto-register new campus member
      const affiliation = getCampusAffiliation(cleanEmail);
      user = await db.users.create({
        name: name || cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
        email: cleanEmail,
        role: role || 'STUDENT',
        department: department || `${affiliation} Member`,
        studentId: cleanEmail.endsWith('.ac.in') ? `CAMPUS-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        strikes: 0,
        strikeHistory: [],
        isBlockedUntil: null
      });

      await db.auditLogs.create({
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'CAMPUS_ACCOUNT_CREATED',
        targetType: 'SYSTEM',
        targetId: user.id,
        targetName: user.email,
        details: `New campus user account registered with verified domain ${cleanEmail}. Affiliation: ${affiliation}`,
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server failed to process campus login.' });
  }
}

/**
 * Get current authenticated user
 */
async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const freshUser = await db.users.findById(req.user.id);
    res.json({ user: freshUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
}

/**
 * List sample personas for the quick demo role switcher
 */
async function getDemoUsers(req, res) {
  try {
    const users = await db.users.find();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
}

module.exports = {
  login,
  getMe,
  getDemoUsers
};
