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
  requestPasswordReset,
  resetForgottenPassword,
} = require('../controllers/auth.controller');

const router = express.Router();

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

const passwordResetCompleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset attempts. Please try again later.' },
});

router.post('/register', register);
router.post('/login', login);

router.post('/update-user', updateUser);
router.get('/user', userById);
router.get('/delete-user', deleteUser);
router.post('/reset-password', resetPassword);

router.post('/forgot-password', passwordResetRequestLimiter, requestPasswordReset);
router.post('/reset-forgotten-password', passwordResetCompleteLimiter, resetForgottenPassword);

module.exports = router;
