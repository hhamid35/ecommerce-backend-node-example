'use strict';

/**
 * Wraps an async Express route handler so that any thrown error or rejected
 * promise is forwarded to Express' error-handling middleware via `next(err)`.
 *
 * Removes the need for a try/catch block in every controller.
 *
 * @param {Function} fn async (req, res, next) => {...}
 * @returns {Function} Express-compatible handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
