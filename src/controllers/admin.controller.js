'use strict';

const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const asyncHandler = require('../utils/asyncHandler');

const VALID_STATUSES = ['pending', 'shipped', 'delivered'];

function getCurrentDate() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  return `${months[today.getMonth()]} ${day}, ${today.getFullYear()}`;
}

/**
 * GET /dashboard   (admin)
 */
const dashboardData = asyncHandler(async (req, res) => {
  const [ordersCount, usersCount, productsCount, categoriesCount] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments(),
    Product.countDocuments(),
    Category.countDocuments(),
  ]);

  return res.json({
    success: true,
    message: 'dashboard data',
    data: { ordersCount, usersCount, productsCount, categoriesCount },
  });
});

/**
 * GET /admin/users   (admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -token');
  return res.json({ success: true, message: 'all users', data: users });
});

/**
 * GET /admin/orders   (admin)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate({ path: 'user', select: '-password -token' })
    .populate('items.productId')
    .populate('items.categoryId');

  const ordersCount = await Order.countDocuments();

  return res.json({
    success: true,
    status: 200,
    message: 'all orders',
    data: orders,
    ordersCount,
  });
});

/**
 * GET /admin/order-status?orderId=:id&status=:status   (admin)
 */
const changeStatusOfOrder = asyncHandler(async (req, res) => {
  const { status, orderId } = req.query;

  if (!orderId || !status) {
    return res.json({ success: false, message: 'status or order Id is missing' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.json({ success: false, message: 'wrong status' });
  }

  const update = { status };
  if (status === 'shipped') update.shippedOn = getCurrentDate();
  if (status === 'delivered') update.deliveredOn = getCurrentDate();

  const updatedOrder = await Order.findByIdAndUpdate(orderId, update, { new: true });

  return res.json({
    success: true,
    status: 200,
    message: 'status updated successfully',
    data: updatedOrder,
  });
});

module.exports = {
  dashboardData,
  getAllUsers,
  getAllOrders,
  changeStatusOfOrder,
};
