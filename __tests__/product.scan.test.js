'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeScanCode,
  buildScannableDuplicateQuery,
} = require('../src/controllers/product.controller');

describe('product scan helpers', () => {
  it('normalizeScanCode trims whitespace', () => {
    assert.equal(normalizeScanCode('  GAR-001  '), 'GAR-001');
    assert.equal(normalizeScanCode(''), '');
    assert.equal(normalizeScanCode(null), '');
  });

  it('buildScannableDuplicateQuery builds sku and externalId conditions', () => {
    const query = buildScannableDuplicateQuery({
      sku: ' GAR-001 ',
      externalId: '1234567890123',
    });
    assert.deepEqual(query.$or, [
      { sku: 'GAR-001' },
      { externalId: '1234567890123' },
    ]);
  });

  it('buildScannableDuplicateQuery excludes current product on update', () => {
    const query = buildScannableDuplicateQuery({
      sku: 'GAR-001',
      excludeId: 'prod001',
    });
    assert.equal(query._id.$ne, 'prod001');
  });

  it('buildScannableDuplicateQuery returns null when no identifiers', () => {
    assert.equal(buildScannableDuplicateQuery({ sku: '', externalId: '' }), null);
  });
});
