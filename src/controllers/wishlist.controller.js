'use strict';

const mongoose = require('mongoose');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /add-to-wishlist   (auth)
 * Body: { productId, quantity }
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.user?._id,
    { $push: { wishlist: req.body } },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'product pushed in wishlist successfully',
    data: updated,
  });
});

/**
 * GET /remove-from-wishlist?id=:productId   (auth)
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const updated = await User.findByIdAndUpdate(
    req.user?._id,
    { $pull: { wishlist: { productId: new mongoose.Types.ObjectId(id) } } },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'product removed from wishlist successfully',
    data: updated,
  });
});

/**
 * GET /wishlist   (auth)
 * Response: { success, message, data: User[] } where the client reads
 * `data[0].wishlist` (each entry has a populated `productId`).
 */
const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await User.find({ _id: req.user._id })
    .populate('wishlist.productId')
    .select('-password -userType');

  return res.json({ success: true, message: 'Wishlist', data: wishlist });
});

module.exports = { addToWishlist, removeFromWishlist, getWishlist };
