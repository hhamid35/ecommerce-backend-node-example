'use strict';

const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }
  return transporter;
}

/**
 * Send a password-reset OTP email.
 * In development/test without SMTP config, logs a non-sensitive message only.
 */
async function sendPasswordResetOtp({ to, otp, expiresInMinutes }) {
  const hasSmtp = config.smtpHost && config.smtpUser && config.smtpPass;

  if (!hasSmtp) {
    if (config.isProduction) {
      throw new Error('SMTP is not configured for password recovery email delivery');
    }
    logger.info('password_reset_email_dev_fallback', {
      deliveryMethod: 'dev-fallback',
      expiresInMinutes,
    });
    return;
  }

  const from = config.passwordResetEmailFrom || config.smtpUser;
  const text =
    `Your EasyBuy password reset code is: ${otp}\n\n` +
    `This code expires in ${expiresInMinutes} minutes.\n\n` +
    'If you did not request a password reset, you can ignore this email.';

  await getTransporter().sendMail({
    from,
    to,
    subject: 'EasyBuy password reset code',
    text,
  });
}

module.exports = { sendPasswordResetOtp };
