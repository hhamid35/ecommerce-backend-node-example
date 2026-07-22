'use strict';

const ApiError = require('./ApiError');

const MAX_SCAN_CODE_LENGTH = 256;

/**
 * Normalize a scanned barcode or QR payload for catalog lookup.
 * Trims, removes internal whitespace, uppercases, preserves leading zeroes.
 */
function normalizeScanCode(value) {
  if (value == null) {
    return '';
  }
  return String(value).trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Decorate a product payload with normalized identifier fields for persistence.
 */
function withNormalizedIdentifiers(payload) {
  const decorated = { ...payload };
  const skuNormalized = normalizeScanCode(payload.sku);
  const externalIdNormalized = normalizeScanCode(payload.externalId);

  if (skuNormalized) {
    decorated.skuNormalized = skuNormalized;
  } else {
    delete decorated.skuNormalized;
  }

  if (externalIdNormalized) {
    decorated.externalIdNormalized = externalIdNormalized;
  } else {
    delete decorated.externalIdNormalized;
  }

  return decorated;
}

/**
 * Build a MongoDB query that matches a scanned code against normalized and exact identifiers.
 */
function buildScanLookupQuery(code) {
  const normalized = normalizeScanCode(code);
  if (!normalized) {
    throw ApiError.badRequest('Scan code is required');
  }

  const exact = String(code).trim();

  return {
    $or: [
      { skuNormalized: normalized },
      { externalIdNormalized: normalized },
      { sku: exact },
      { externalId: exact },
    ],
  };
}

module.exports = {
  MAX_SCAN_CODE_LENGTH,
  normalizeScanCode,
  withNormalizedIdentifiers,
  buildScanLookupQuery,
};
