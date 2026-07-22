'use strict';

const express = require('express');
const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const { isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/categories', getCategories);
router.post('/category', isAdmin, addCategory);
router.post('/update-category', isAdmin, updateCategory);
router.get('/delete-category', isAdmin, deleteCategory);

module.exports = router;
