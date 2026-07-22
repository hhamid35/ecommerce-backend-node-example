'use strict';

const Product = require('../models/product.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const normalizeScanCode = (value) => String(value || '').trim();

const buildScannableDuplicateQuery = ({ sku, externalId, excludeId }) => {
  const conditions = [];
  const normalizedSku = sku ? String(sku).trim() : '';
  const normalizedExternalId = externalId ? String(externalId).trim() : '';

  if (normalizedSku) {
    conditions.push({ sku: normalizedSku });
  }
  if (normalizedExternalId) {
    conditions.push({ externalId: normalizedExternalId });
  }

  if (conditions.length === 0) {
    return null;
  }

  const query = { $or: conditions };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return query;
};

const assertUniqueScannableIdentifiers = async ({ sku, externalId, excludeId }) => {
  const query = buildScannableDuplicateQuery({ sku, externalId, excludeId });
  if (!query) {
    return;
  }

  const existing = await Product.findOne(query);
  if (existing) {
    throw ApiError.badRequest('A product with this SKU or external ID already exists');
  }
};

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
 * GET /products/scan?code=:scannedCode
 * Resolves a scanned barcode or QR value against sku or externalId.
 */
const resolveProductByScan = asyncHandler(async (req, res) => {
  const rawCode = req.query.code;

  if (rawCode === undefined || rawCode === null || normalizeScanCode(rawCode) === '') {
    logger.warn('product_scan_invalid_code', { event: 'product_scan_invalid_code', reason: 'missing' });
    return res.status(400).json({
      success: false,
      status: 400,
      code: 'PRODUCT_SCAN_CODE_REQUIRED',
      message: 'A scanned code is required',
      data: null,
    });
  }

  const code = normalizeScanCode(rawCode);

  if (code.length > 128) {
    logger.warn('product_scan_invalid_code', {
      event: 'product_scan_invalid_code',
      reason: 'too_long',
      codeLength: code.length,
    });
    return res.status(400).json({
      success: false,
      status: 400,
      code: 'PRODUCT_SCAN_CODE_TOO_LONG',
      message: 'Scanned code exceeds maximum length of 128 characters',
      data: null,
    });
  }

  const matches = await Product.find({
    $or: [{ sku: code }, { externalId: code }],
  }).populate('category');

  if (matches.length === 0) {
    logger.warn('product_scan_not_found', {
      event: 'product_scan_not_found',
      codeLength: code.length,
    });
    return res.status(404).json({
      success: false,
      status: 404,
      code: 'PRODUCT_SCAN_NOT_FOUND',
      message: 'No product found for scanned code',
      data: null,
    });
  }

  if (matches.length > 1) {
    logger.warn('product_scan_duplicate', {
      event: 'product_scan_duplicate',
      codeLength: code.length,
      matchCount: matches.length,
    });
    return res.status(409).json({
      success: false,
      status: 409,
      code: 'PRODUCT_SCAN_DUPLICATE',
      message: 'Multiple products share this scanned code',
      data: null,
    });
  }

  const product = matches[0];
  const matchedField = product.sku === code ? 'sku' : 'externalId';

  logger.info('product_scan_resolved', {
    event: 'product_scan_resolved',
    matchedField,
    productId: product._id.toString(),
    codeLength: code.length,
  });

  return res.json({
    success: true,
    status: 200,
    message: 'product resolved from scanned code',
    data: product,
    matchedField,
  });
});

/**
 * POST /product   (admin)
 * Body: { title, sku, price, image, description, category, quantity, externalId? }
 */
const addProduct = asyncHandler(async (req, res) => {
  const { title, sku, price } = req.body;

  if (!title || !sku || !price) {
    return res.json({ success: false, message: 'Fields are empty' });
  }

  const payload = { ...req.body };
  if (payload.sku) {
    payload.sku = String(payload.sku).trim();
  }
  if (payload.externalId) {
    payload.externalId = String(payload.externalId).trim();
  } else {
    delete payload.externalId;
  }

  await assertUniqueScannableIdentifiers({
    sku: payload.sku,
    externalId: payload.externalId,
  });

  const product = await Product.create(payload);

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

  const payload = { ...req.body };
  if (payload.sku) {
    payload.sku = String(payload.sku).trim();
  }
  if (payload.externalId !== undefined) {
    payload.externalId = payload.externalId ? String(payload.externalId).trim() : '';
  }

  await assertUniqueScannableIdentifiers({
    sku: payload.sku,
    externalId: payload.externalId,
    excludeId: id,
  });

  const updatedProduct = await Product.findByIdAndUpdate(id, payload, { new: true });
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
  normalizeScanCode,
  buildScannableDuplicateQuery,
  assertUniqueScannableIdentifiers,
  getAllProducts,
  resolveProductByScan,
  addProduct,
  updateProduct,
  deleteProduct,
};
