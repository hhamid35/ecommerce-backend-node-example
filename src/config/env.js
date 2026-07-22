'use strict';

/**
 * Centralized environment configuration.
 *
 * Loads variables from a local `.env` file (via dotenv) and exposes a single,
 * validated `config` object for the rest of the application to consume.
 * Nothing else in the codebase should read `process.env` directly.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load `.env` from the project root regardless of the current working directory.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = Object.freeze({
  env: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT, 10) || 3002,

  // Database
  dbConnectionString: process.env.DB_CON_STRING || '',

  // Auth
  jwtSecret: process.env.TOKEN_KEY || '',
  jwtExpiresIn: process.env.TOKEN_EXPIRES_IN || '10h',

  // CORS: comma-separated list of allowed origins, or "*" for all.
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Uploads
  uploadDir: process.env.UPLOAD_DIR || 'public/uploads',
  maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 15 * 1024 * 1024, // 15 MB

  // Password recovery
  passwordResetEnabled: process.env.PASSWORD_RESET_ENABLED !== 'false',
  passwordResetOtpTtlMinutes: parseInt(process.env.PASSWORD_RESET_OTP_TTL_MINUTES, 10) || 20,
  passwordResetOtpLength: 6,
  passwordResetRequestLimit: parseInt(process.env.PASSWORD_RESET_REQUEST_LIMIT, 10) || 5,
  passwordResetCompleteLimit: parseInt(process.env.PASSWORD_RESET_COMPLETE_LIMIT, 10) || 10,
  passwordResetMaxAttempts: parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS, 10) || 5,
  passwordResetMinPasswordLength: parseInt(process.env.PASSWORD_RESET_MIN_PASSWORD_LENGTH, 10) || 8,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 0,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  passwordResetEmailFrom: process.env.PASSWORD_RESET_EMAIL_FROM || '',
  passwordResetLogOtp: process.env.PASSWORD_RESET_LOG_OTP === 'true',
});

/**
 * Validate that required configuration is present. In production a missing
 * value is fatal; in development we log a warning so the server can still boot
 * for local exploration (e.g. viewing the Swagger docs without a database).
 */
function validateConfig() {
  const required = [
    ['DB_CON_STRING', config.dbConnectionString],
    ['TOKEN_KEY', config.jwtSecret],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (config.isProduction) {
      throw new Error(message);
    }
    // eslint-disable-next-line no-console
    console.warn(`\u26A0\uFE0F  ${message}. See .env.example. The server may not function correctly.`);
  }

  if (config.isProduction && config.passwordResetEnabled) {
    const smtpMissing = [
      ['SMTP_HOST', config.smtpHost],
      ['SMTP_PORT', config.smtpPort],
      ['SMTP_USER', config.smtpUser],
      ['SMTP_PASS', config.smtpPass],
      ['PASSWORD_RESET_EMAIL_FROM', config.passwordResetEmailFrom],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (smtpMissing.length > 0) {
      throw new Error(
        `Password recovery is enabled but SMTP configuration is incomplete: ${smtpMissing.join(', ')}`
      );
    }
  }
}

module.exports = { config, validateConfig };
