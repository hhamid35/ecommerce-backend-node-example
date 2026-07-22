'use strict';

function extractCodeFromUrl(rawCode) {
  try {
    if (/^https?:\/\//i.test(rawCode)) {
      const url = new URL(rawCode);
      const params = ['sku', 'code', 'barcode', 'externalId'];
      for (const param of params) {
        const value = url.searchParams.get(param);
        if (value) return value;
      }
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    }
  } catch (error) {
    // Fall through to raw code when the payload is not a valid URL.
  }
  return rawCode;
}

function normalizeScanCode(rawCode) {
  if (typeof rawCode !== 'string') return '';
  const trimmed = rawCode.trim();
  if (!trimmed) return '';
  return extractCodeFromUrl(trimmed).trim().toUpperCase();
}

function buildScanLookup(normalizedCode) {
  return {
    $or: [{ sku: normalizedCode }, { externalIds: normalizedCode }],
  };
}

module.exports = {
  extractCodeFromUrl,
  normalizeScanCode,
  buildScanLookup,
};
