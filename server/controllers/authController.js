const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { httpError } = require("../utils/httpError");

// Privileged roles (incharge, osa_dean, admin) are provisioned by administration / seed script
const SELF_SIGNUP_ROLES = ["student", "organizer"];

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || "dev_secret_key",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function toPublicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    noShowCount: user.noShowCount,
    bannedUntil: user.bannedUntil,
  };
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const { name, email, password, role = "student", department } = req.body;

    if (!name || !email || !password) {
      throw httpError(400, "name, email and password are required");
    }
    if (String(password).length < 6) {
      throw httpError(400, "Password must be at least 6 characters");
    }
    if (!SELF_SIGNUP_ROLES.includes(role)) {
      throw httpError(
        403,
        "In-Charge, OSA Dean and Admin accounts are provisioned by campus administration"
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      throw httpError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      department: department || "CSE",
    });

    return res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw httpError(400, "email and password are required");
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    const valid = user && (await bcrypt.compare(String(password), user.passwordHash));
    if (!valid) {
      throw httpError(401, "Invalid email or password");
    }

    return res.json({ token: signToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}

module.exports = { signup, login, me };
