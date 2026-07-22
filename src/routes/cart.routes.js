'use strict';

const express = require('express');
const { addToCart, removeFromCart, getCart } = require('../controllers/cart.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/add-to-cart', checkAuth, addToCart);
router.get('/cart', checkAuth, getCart);
router.get('/remove-from-cart', checkAuth, removeFromCart);

module.exports = router;
