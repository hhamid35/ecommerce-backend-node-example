'use strict';

const express = require('express');
const {
  register,
  login,
  updateUser,
  userById,
  deleteUser,
  resetPassword,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.post('/update-user', updateUser);
router.get('/user', userById);
router.get('/delete-user', deleteUser);
router.post('/reset-password', resetPassword);

module.exports = router;
