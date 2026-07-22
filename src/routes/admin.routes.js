'use strict';

const express = require('express');
const {
  dashboardData,
  getAllUsers,
  getAllOrders,
  changeStatusOfOrder,
} = require('../controllers/admin.controller');
const { isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/dashboard', isAdmin, dashboardData);
router.get('/admin/orders', isAdmin, getAllOrders);
router.get('/admin/order-status', isAdmin, changeStatusOfOrder);
router.get('/admin/users', isAdmin, getAllUsers);

module.exports = router;
