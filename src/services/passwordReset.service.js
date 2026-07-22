'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const PasswordResetToken = require('../models/passwordResetToken.model');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { config } = require('../config/env');
const { sendPasswordResetOtp } = require('./email.service');

const SALT_ROUNDS = 10;
const NEUTRAL_REQUEST_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';
const INVALID_OTP_MESSAGE =
  'Reset code is invalid or expired. Request a new code and try again.';

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

function validateRecoveryEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
    throw ApiError.badRequest('Please enter a valid email address');
  }
}

function validateNewPassword(newPassword) {
  const minLength = config.passwordResetMinPasswordLength;
  if (typeof newPassword !== 'string' || newPassword.length < minLength) {
    throw ApiError.badRequest(
      'Password must be at least 8 characters and include a letter and a number'
    );
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw ApiError.badRequest(
      'Password must be at least 8 characters and include a letter and a number'
    );
  }
}

function generateOtp(length = config.passwordResetOtpLength) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, '0');
}

function hashIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return undefined;
  }
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function hashEmailForLog(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function emailDomain(email) {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : 'unknown';
}

async function requestPasswordReset({ email, ip, userAgent }) {
  validateRecoveryEmail(email);
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    logger.info(
      `password_reset_request_unknown_email emailHash=${hashEmailForLog(normalizedEmail)} domain=${emailDomain(normalizedEmail)}`
    );
    return { message: NEUTRAL_REQUEST_MESSAGE };
  }

  await PasswordResetToken.updateMany(
    { user: user._id, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + config.passwordResetOtpTtlMinutes * 60 * 1000);

  await PasswordResetToken.create({
    user: user._id,
    email: normalizedEmail,
    otpHash,
    expiresAt,
    requestIpHash: hashIp(ip),
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 256) : undefined,
  });

  try {
    await sendPasswordResetOtp({ to: user.email, otp, expiresAt });
  } catch (err) {
    logger.error(`password_reset_delivery_failed userId=${user._id} reason=${err.message}`);
    throw err;
  }

  logger.info(`password_reset_requested userId=${user._id} expiresAt=${expiresAt.toISOString()}`);
  return { message: NEUTRAL_REQUEST_MESSAGE };
}

async function completePasswordReset({ email, otp, newPassword }) {
  validateRecoveryEmail(email);
  const normalizedEmail = normalizeEmail(email);

  if (!/^\d{6}$/.test(String(otp || ''))) {
    throw ApiError.badRequest(INVALID_OTP_MESSAGE);
  }

  validateNewPassword(newPassword);

  const proof = await PasswordResetToken.findOne({
    email: normalizedEmail,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!proof) {
    throw ApiError.badRequest(INVALID_OTP_MESSAGE);
  }

  if (proof.attempts >= config.passwordResetMaxAttempts) {
    proof.consumedAt = new Date();
    await proof.save();
    throw ApiError.badRequest(INVALID_OTP_MESSAGE);
  }

  proof.attempts += 1;
  await proof.save();

  const otpMatches = await bcrypt.compare(String(otp), proof.otpHash);
  if (!otpMatches) {
    logger.info(
      `password_reset_invalid_attempt emailHash=${hashEmailForLog(normalizedEmail)} attempts=${proof.attempts}`
    );
    throw ApiError.badRequest(INVALID_OTP_MESSAGE);
  }

  const user = await User.findById(proof.user);
  if (!user) {
    proof.consumedAt = new Date();
    await proof.save();
    throw ApiError.badRequest(INVALID_OTP_MESSAGE);
  }

  const sameAsPrevious = await bcrypt.compare(newPassword, user.password);
  if (sameAsPrevious) {
    throw ApiError.badRequest('New password must be different from your previous password');
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.token = null;
  await user.save();

  proof.consumedAt = new Date();
  await proof.save();

  logger.info(`password_reset_completed userId=${user._id} proofId=${proof._id}`);
  return { message: 'Password reset successfully. Please log in with your new password.' };
}

module.exports = {
  normalizeEmail,
  validateRecoveryEmail,
  validateNewPassword,
  generateOtp,
  hashIp,
  requestPasswordReset,
  completePasswordReset,
};
