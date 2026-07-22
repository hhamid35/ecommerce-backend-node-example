'use strict';

const mongoose = require('mongoose');
const { config } = require('./env');
const logger = require('../utils/logger');

// Fail fast on malformed queries instead of silently ignoring unknown fields.
mongoose.set('strictQuery', true);

/**
 * Establish the MongoDB connection.
 * Returns the mongoose connection so callers can await readiness.
 */
async function connectDatabase() {
  if (!config.dbConnectionString) {
    logger.warn('DB_CON_STRING is not set - skipping database connection.');
    return null;
  }

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(config.dbConnectionString);
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
}

module.exports = { connectDatabase, disconnectDatabase };
