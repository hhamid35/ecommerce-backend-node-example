'use strict';

const app = require('./app');
const { config, validateConfig } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');

async function start() {
  validateConfig();

  try {
    await connectDatabase();
  } catch (err) {
    logger.error(`Failed to connect to the database: ${err.message}`);
    if (config.isProduction) process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} (${config.env})`);
    logger.info(`API docs available at http://localhost:${config.port}/api-docs`);
  });

  // --- Graceful shutdown ----------------------------------------------------
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force-exit if connections do not drain in time.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.stack || err.message}`);
    process.exit(1);
  });
}

start();
