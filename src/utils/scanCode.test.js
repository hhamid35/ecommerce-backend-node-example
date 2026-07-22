'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeScanCode,
  extractCodeFromUrl,
  buildScanLookup,
} = require('../utils/scanCode');

test('normalizeScanCode uppercases plain SKU values', () => {
  assert.equal(normalizeScanCode('gar-001'), 'GAR-001');
});

test('extractCodeFromUrl reads sku query params', () => {
  assert.equal(
    extractCodeFromUrl('https://shop.example.com/product?sku=elc-001'),
    'elc-001'
  );
});

test('normalizeScanCode extracts URL payloads before matching', () => {
  assert.equal(
    normalizeScanCode('https://shop.example.com/product?sku=gro-001'),
    'GRO-001'
  );
});

test('buildScanLookup matches sku and externalIds', () => {
  assert.deepEqual(buildScanLookup('GAR-001'), {
    $or: [{ sku: 'GAR-001' }, { externalIds: 'GAR-001' }],
  });
});

test('normalizeScanCode rejects blank values', () => {
  assert.equal(normalizeScanCode('   '), '');
});
