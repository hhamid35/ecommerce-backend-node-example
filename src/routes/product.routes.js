'use strict';

const express = require('express');
const {
  getAllProducts,
  resolveProductByScan,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const { isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/products/resolve-scan', resolveProductByScan);
router.get('/products', getAllProducts);
router.post('/product', isAdmin, addProduct);
router.post('/update-product', isAdmin, updateProduct);
router.get('/delete-product', isAdmin, deleteProduct);

module.exports = router;
