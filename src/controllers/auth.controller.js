'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const PasswordResetToken = require('../models/passwordResetToken.model');
const { config } = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { sendPasswordResetOtp } = require('../utils/recoveryEmail');

const SALT_ROUNDS = 10;

const NEUTRAL_RESET_MESSAGE = 'If an account exists, reset instructions have been sent.';

function generateAuthToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function hashEmailForLog(email) {
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 12);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const normalized = normalizeEmail(email);
  return normalized.includes('@') && normalized.length >= 6;
}

function validateNewPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    return 'Password must be 6 characters long';
  }
  return null;
}

function generateOtp(length = config.passwordResetOtpLength) {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, '0');
}

/** Remove sensitive fields before returning a user to the client. */
function sanitizeUser(userDoc) {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  return user;
}

/**
 * POST /register
 * Body: { email, password, name, userType }
 */
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: 'email or password is empty' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ ...req.body, password: hashedPassword });

  return res.json({
    success: true,
    message: 'user registered successfully',
    data: sanitizeUser(user),
  });
});

/**
 * POST /login
 * Body: { email, password }
 * Returns the user document (including a freshly-minted `token`) in `data`.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    return res.json({
      success: false,
      status: 400,
      message: 'user does not exist with this email and password',
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.json({ success: false, status: 400, message: 'user credentials are not correct' });
  }

  const token = generateAuthToken({ _id: user._id, email: user.email });
  user.token = token;
  await user.save();

  return res.json({
    success: true,
    status: 200,
    message: 'user Logged in',
    data: sanitizeUser(user),
  });
});

/**
 * POST /update-user?id=:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
  if (!updatedUser) {
    return res.json({ success: false, message: 'user does not exist' });
  }

  return res.json({
    success: true,
    message: 'user updated successfully',
    data: sanitizeUser(updatedUser),
  });
});

/**
 * GET /user?id=:id
 */
const userById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const user = await User.findById(id).select('-password');
  if (!user) {
    return res.json({ success: false, message: 'user does not exist' });
  }

  return res.json({ success: true, message: 'user found', data: user });
});

/**
 * GET /delete-user?id=:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) {
    return res.json({ success: false, message: 'user does not exist' });
  }

  return res.json({ success: true, message: 'user deleted successfully' });
});

/**
 * POST /reset-password?id=:id
 * Body: { password, newPassword }
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { password, newPassword } = req.body;
  const { id } = req.query;

  if (!password || !newPassword || !id) {
    return res.json({ success: false, message: 'Fields are empty' });
  }

  const passwordError = validateNewPassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.json({ success: false, message: 'user does not exist' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.json({ success: false, message: 'wrong password' });
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  await user.save();

  return res.json({ success: true, message: 'password updated successfully' });
});

/**
 * POST /forgot-password
 * Body: { email }
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const requestIp = req.ip;
  const userAgent = req.get('user-agent') || '';

  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email is not valid' });
  }

  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashEmailForLog(normalizedEmail);
  const expiresInMinutes = config.passwordResetOtpTtlMinutes;

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    logger.info('password_reset_requested_unknown', { emailHash, requestIp, userAgent });
    return res.json({
      success: true,
      message: NEUTRAL_RESET_MESSAGE,
      data: { expiresInMinutes, deliveryMethod: 'email' },
    });
  }

  await PasswordResetToken.invalidateActiveForUser(user._id);

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await PasswordResetToken.create({
    user: user._id,
    email: normalizedEmail,
    otpHash,
    expiresAt,
    createdFromIp: requestIp,
    createdFromUserAgent: userAgent,
  });

  try {
    await sendPasswordResetOtp({ to: normalizedEmail, otp, expiresInMinutes });
  } catch (err) {
    logger.error('password_reset_email_send_failed', {
      emailHash,
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Unable to send reset instructions at this time',
    });
  }

  logger.info('password_reset_requested', {
    emailHash,
    userType: user.userType,
    requestIp,
    userAgent,
    expiresInMinutes,
  });

  const response = {
    success: true,
    message: NEUTRAL_RESET_MESSAGE,
    data: { expiresInMinutes, deliveryMethod: 'email' },
  };

  if (!config.isProduction) {
    response.debugOtp = otp;
  }

  return res.json(response);
});

/**
 * POST /reset-forgotten-password
 * Body: { email, otp, newPassword }
 */
const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const requestIp = req.ip;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, code, and new password are required',
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email is not valid' });
  }

  const passwordError = validateNewPassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const otpPattern = new RegExp(`^\\d{${config.passwordResetOtpLength}}$`);
  if (!otpPattern.test(String(otp))) {
    return res.status(400).json({
      success: false,
      message: 'Reset code is invalid or expired',
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashEmailForLog(normalizedEmail);
  const resetToken = await PasswordResetToken.findActiveByEmail(normalizedEmail);

  if (!resetToken) {
    return res.status(400).json({
      success: false,
      message: 'Reset code is invalid or expired',
    });
  }

  if (resetToken.attemptCount >= config.passwordResetMaxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many invalid attempts. Request a new code.',
    });
  }

  const otpMatches = await bcrypt.compare(String(otp), resetToken.otpHash);
  if (!otpMatches) {
    resetToken.attemptCount += 1;
    resetToken.lastAttemptAt = new Date();
    await resetToken.save();

    logger.warn('password_reset_attempt_failed', {
      emailHash,
      reason: 'invalid_otp',
      attemptCount: resetToken.attemptCount,
    });

    if (resetToken.attemptCount >= config.passwordResetMaxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many invalid attempts. Request a new code.',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Reset code is invalid or expired',
    });
  }

  const user = await User.findById(resetToken.user);
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Reset code is invalid or expired',
    });
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  user.token = undefined;
  resetToken.usedAt = new Date();

  await user.save();
  await resetToken.save();

  logger.info('password_reset_completed', {
    userId: user._id,
    userType: user.userType,
    requestIp,
  });

  return res.json({ success: true, message: 'Password reset successfully' });
});

module.exports = {
  register,
  login,
  updateUser,
  userById,
  deleteUser,
  resetPassword,
  requestPasswordReset,
  resetForgottenPassword,
  normalizeEmail,
  validateEmail,
  validateNewPassword,
  generateOtp,
};
