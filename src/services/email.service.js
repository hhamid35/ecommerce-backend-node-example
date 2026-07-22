'use strict';

const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

function hasSmtpConfig() {
  return Boolean(
    config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.passwordResetEmailFrom
  );
}

function createTransport() {
  if (config.isProduction) {
    if (!hasSmtpConfig()) {
      throw new Error(
        'SMTP configuration is required in production when password recovery is enabled'
      );
    }
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  if (hasSmtpConfig()) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  return {
  sendMail: async ({ to, subject, text }) => {
    const redactedTo = typeof to === 'string' ? to.replace(/(^.).*(@.*$)/, '$1***$2') : 'unknown';
    logger.info(`password_reset_email_log_only to=${redactedTo} subject="${subject}"`);
    if (config.passwordResetLogOtp) {
      logger.info(`password_reset_email_body ${text}`);
    }
  },
  };
}

async function sendPasswordResetOtp({ to, otp, expiresAt }) {
  const transport = createTransport();
  const expiryText = expiresAt.toISOString();
  const subject = 'Your EasyBuy password reset code';
  const text =
    `Your EasyBuy password reset code is: ${otp}\n\n` +
    `This code expires at ${expiryText}.\n\n` +
    'If you did not request a password reset, you can safely ignore this email.';

  try {
    await transport.sendMail({
      from: config.passwordResetEmailFrom || 'noreply@easybuy.local',
      to,
      subject,
      text,
    });
  } catch (err) {
    logger.error(`password_reset_delivery_failed reason=${err.message}`);
    throw ApiError.badRequest('Unable to send reset instructions. Please try again.');
  }
}

module.exports = {
  createTransport,
  sendPasswordResetOtp,
};
