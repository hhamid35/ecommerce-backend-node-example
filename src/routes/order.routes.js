'use strict';

const express = require('express');
const { checkout, getMyOrders } = require('../controllers/order.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/orders', checkAuth, getMyOrders);
router.post('/checkout', checkAuth, checkout);

module.exports = router;
