'use strict';

const express = require('express');
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} = require('../controllers/wishlist.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/add-to-wishlist', checkAuth, addToWishlist);
router.get('/wishlist', checkAuth, getWishlist);
router.get('/remove-from-wishlist', checkAuth, removeFromWishlist);

module.exports = router;
