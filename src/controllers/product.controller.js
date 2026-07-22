'use strict';

const Product = require('../models/product.model');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const {
  withNormalizedIdentifiers,
  buildScanLookupQuery,
  normalizeScanCode,
  MAX_SCAN_CODE_LENGTH,
} = require('../utils/productIdentifier.util');

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
 * GET /products/resolve-scan?code=&format=
 * Resolves a scanned barcode or QR payload to a catalog product.
 */
const resolveProductByScan = asyncHandler(async (req, res) => {
  const rawCode = req.query.code;
  const format = req.query.format;

  if (!rawCode || !String(rawCode).trim()) {
    return res.status(400).json({
      success: false,
      status: 400,
      code: 'SCAN_CODE_REQUIRED',
      message: 'Scan code is required',
      data: null,
    });
  }

  if (String(rawCode).length > MAX_SCAN_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: `Scan code exceeds maximum length of ${MAX_SCAN_CODE_LENGTH} characters`,
      data: null,
    });
  }

  const normalizedCode = normalizeScanCode(rawCode);
  const lookupQuery = buildScanLookupQuery(rawCode);

  const matches = await Product.find(lookupQuery).populate('category').limit(3);

  if (matches.length > 1) {
    logger.info('scan.resolve.duplicate', {
      format,
      normalizedCodeLength: normalizedCode.length,
      matchCount: matches.length,
    });
    return res.status(409).json({
      success: false,
      status: 409,
      code: 'PRODUCT_SCAN_DUPLICATE',
      message: 'Multiple products match the scanned code',
      data: null,
    });
  }

  if (matches.length === 0) {
    logger.info('scan.resolve.not_found', {
      format,
      normalizedCodeLength: normalizedCode.length,
    });
    return res.status(404).json({
      success: false,
      status: 404,
      code: 'PRODUCT_SCAN_NOT_FOUND',
      message: 'No product found for scanned code',
      data: null,
    });
  }

  const product = matches[0];
  logger.info('scan.resolve.success', {
    format,
    normalizedCodeLength: normalizedCode.length,
    productId: product._id,
  });

  return res.json({
    success: true,
    status: 200,
    message: 'product found',
    data: product,
  });
});

/**
 * POST /product   (admin)
 * Body: { title, sku, price, image, description, category, quantity }
 */
const addProduct = asyncHandler(async (req, res) => {
  const { title, sku, price } = req.body;

  if (!title || !sku || !price) {
    return res.json({ success: false, message: 'Fields are empty' });
  }

  const product = await Product.create(withNormalizedIdentifiers(req.body));

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

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    withNormalizedIdentifiers(req.body),
    { new: true }
  );
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
  resolveProductByScan,
  addProduct,
  updateProduct,
  deleteProduct,
};
