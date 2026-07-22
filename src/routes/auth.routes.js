'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  updateUser,
  userById,
  deleteUser,
  resetPassword,
  forgotPassword,
  completePasswordReset,
} = require('../controllers/auth.controller');
const { config } = require('../config/env');

const router = express.Router();

const passwordRecoveryRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.passwordResetRequestLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
  },
});

const passwordRecoveryCompleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.passwordResetCompleteLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
});

router.post('/register', register);
router.post('/login', login);

router.post('/update-user', updateUser);
router.get('/user', userById);
router.get('/delete-user', deleteUser);
router.post('/reset-password', resetPassword);

router.post('/forgot-password', passwordRecoveryRequestLimiter, forgotPassword);
router.post('/complete-password-reset', passwordRecoveryCompleteLimiter, completePasswordReset);

module.exports = router;
