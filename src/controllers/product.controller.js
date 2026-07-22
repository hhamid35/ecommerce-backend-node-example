'use strict';

const crypto = require('crypto');
const Product = require('../models/product.model');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const {
  normalizeScanCode,
  buildScanLookup,
} = require('../utils/scanCode');

const MAX_SCAN_CODE_LENGTH = 512;

function hashScanCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex').slice(0, 16);
}

function detectMatchField(product, normalizedCode) {
  if (product.sku === normalizedCode) return 'sku';
  if (Array.isArray(product.externalIds) && product.externalIds.includes(normalizedCode)) {
    return 'externalIds';
  }
  return 'unknown';
}

/**
 * GET /products?search=:term
 * Returns products (optionally filtered by title) with the category populated.
 * Response: { success, status, message, data: Product[] }
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const search = req.query.search || '';

  const products = await Product.find({
    title: { $regex: search, $options: 'i' },
  }).populate('category');

  return res.json({
    success: true,
    status: 200,
    message: 'list of products',
    data: products,
  });
});

/**
 * GET /products/resolve?code=:rawCode
 * Resolves a scanned barcode or QR payload against sku or externalIds.
 */
const getProductByScanCode = asyncHandler(async (req, res) => {
  const rawCode = req.query.code;

  if (typeof rawCode !== 'string' || rawCode.trim() === '') {
    return res.status(400).json({
      success: false,
      status: 400,
      reason: 'INVALID_SCAN_CODE',
      message: 'Scan code is required',
    });
  }

  if (rawCode.length > MAX_SCAN_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      status: 400,
      reason: 'INVALID_SCAN_CODE',
      message: 'Scan code is required',
    });
  }

  const normalizedCode = normalizeScanCode(rawCode);
  if (!normalizedCode) {
    return res.status(400).json({
      success: false,
      status: 400,
      reason: 'INVALID_SCAN_CODE',
      message: 'Scan code is required',
    });
  }

  const codeHash = hashScanCode(normalizedCode);
  const matches = await Product.find(buildScanLookup(normalizedCode))
    .populate('category')
    .limit(2);

  if (matches.length === 0) {
    logger.info('product_scan_resolve_not_found', { codeHash });
    return res.status(404).json({
      success: false,
      status: 404,
      reason: 'PRODUCT_NOT_FOUND',
      message: 'No product found for this code',
    });
  }

  if (matches.length > 1) {
    logger.warn('product_scan_resolve_duplicate', {
      codeHash,
      productIds: matches.map((product) => product._id.toString()),
    });
    return res.status(409).json({
      success: false,
      status: 409,
      reason: 'DUPLICATE_SCAN_CODE',
      message: 'Multiple products share this scan code',
    });
  }

  const product = matches[0];
  logger.info('product_scan_resolve_success', {
    codeHash,
    matchField: detectMatchField(product, normalizedCode),
    productId: product._id.toString(),
  });

  return res.json({
    success: true,
    status: 200,
    message: 'product resolved',
    data: product,
  });
});

/**
 * POST /product   (admin)
 * Body: { title, sku, price, image, description, category, quantity, externalIds }
 */
const addProduct = asyncHandler(async (req, res) => {
  const { title, sku, price } = req.body;

  if (!title || !sku || !price) {
    return res.json({ success: false, message: 'Fields are empty' });
  }

  const product = await Product.create(req.body);

  return res.json({
    success: true,
    message: 'Product inserted successfully',
    data: product,
  });
});

/**
 * POST /update-product?id=:id   (admin)
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
  if (!updatedProduct) {
    return res.json({ success: false, status: 400, message: 'product does not exist' });
  }

  return res.json({
    success: true,
    status: 200,
    message: 'product updated successfully',
    data: updatedProduct,
  });
});

/**
 * GET /delete-product?id=:id   (admin)
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    return res.json({ success: false, message: 'product does not exist' });
  }

  return res.json({ success: true, message: 'product deleted successfully' });
});

module.exports = {
  getAllProducts,
  getProductByScanCode,
  addProduct,
  updateProduct,
  deleteProduct,
};
