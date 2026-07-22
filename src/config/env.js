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
  port: parseInt(process.env.PORT, 10) || 3000,

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
}

module.exports = { config, validateConfig };
