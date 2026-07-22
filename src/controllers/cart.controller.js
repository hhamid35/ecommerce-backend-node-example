'use strict';

const mongoose = require('mongoose');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /add-to-cart   (auth)
 * Body: { productId, quantity }
 */
const addToCart = asyncHandler(async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.user?._id,
    { $push: { cart: req.body } },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'product pushed in cart successfully',
    data: updated,
  });
});

/**
 * GET /remove-from-cart?id=:productId   (auth)
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const updated = await User.findByIdAndUpdate(
    req.user?._id,
    { $pull: { cart: { productId: new mongoose.Types.ObjectId(id) } } },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'product removed from cart successfully',
    data: updated,
  });
});

/**
 * GET /cart   (auth)
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await User.find({ _id: req.user._id })
    .populate('cart.productId')
    .select('-password -userType');

  return res.json({ success: true, message: 'cart', data: cart });
});

module.exports = { addToCart, removeFromCart, getCart };
