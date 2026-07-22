'use strict';

/**
 * Minimal structured logger.
 *
 * Kept dependency-free on purpose so the project stays lightweight. Swap this
 * module for pino/winston later without touching call sites.
 */

function timestamp() {
  return new Date().toISOString();
}

/* eslint-disable no-console */
const logger = {
  info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${timestamp()}] [DEBUG]`, ...args);
    }
  },
};
/* eslint-enable no-console */

module.exports = logger;
