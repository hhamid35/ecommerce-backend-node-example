'use strict';

const Category = require('../models/category.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /categories
 * Response: { success, status, message, categories: Category[], count }
 * NOTE: the mobile client reads `categories` (not `data`) here.
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  const count = await Category.countDocuments();

  return res.json({
    success: true,
    status: 200,
    message: 'list of all categories',
    categories,
    count,
  });
});

/**
 * POST /category   (admin)
 * Body: { title, image, description }
 */
const addCategory = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.json({ success: false, message: 'Fields are empty' });
  }

  const category = await Category.create(req.body);

  return res.json({
    success: true,
    message: 'category inserted successfully',
    data: category,
  });
});

/**
 * POST /update-category?id=:id   (admin)
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
  if (!updatedCategory) {
    return res.json({ success: false, status: 400, message: 'category does not exist' });
  }

  return res.json({
    success: true,
    status: 200,
    message: 'category updated successfully',
    data: updatedCategory,
  });
});

/**
 * GET /delete-category?id=:id   (admin)
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.json({ success: false, message: 'category does not exist' });
  }

  return res.json({ success: true, message: 'category deleted successfully' });
});

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
};
