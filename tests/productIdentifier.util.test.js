'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeScanCode,
  withNormalizedIdentifiers,
  buildScanLookupQuery,
} = require('../src/utils/productIdentifier.util');

describe('normalizeScanCode', () => {
  it('returns empty string for nullish values', () => {
    assert.equal(normalizeScanCode(null), '');
    assert.equal(normalizeScanCode(undefined), '');
    assert.equal(normalizeScanCode(''), '');
  });

  it('trims, removes internal whitespace, and uppercases', () => {
    assert.equal(normalizeScanCode('  gar-001  '), 'GAR-001');
    assert.equal(normalizeScanCode('gar 001'), 'GAR001');
  });

  it('preserves leading zeroes', () => {
    assert.equal(normalizeScanCode('012345678905'), '012345678905');
  });

  it('preserves punctuation', () => {
    assert.equal(normalizeScanCode('GAR-001'), 'GAR-001');
  });
});

describe('withNormalizedIdentifiers', () => {
  it('adds normalized fields when identifiers are present', () => {
    const result = withNormalizedIdentifiers({ sku: 'gar-001', externalId: '012345678905' });
    assert.equal(result.skuNormalized, 'GAR-001');
    assert.equal(result.externalIdNormalized, '012345678905');
  });

  it('omits normalized fields for blank identifiers', () => {
    const result = withNormalizedIdentifiers({ sku: '  ', externalId: '' });
    assert.equal(result.skuNormalized, undefined);
    assert.equal(result.externalIdNormalized, undefined);
  });
});

describe('buildScanLookupQuery', () => {
  it('throws for blank input', () => {
    assert.throws(() => buildScanLookupQuery('   '), /Scan code is required/);
  });

  it('builds normalized and exact lookup clauses', () => {
    const query = buildScanLookupQuery('gar-001');
    assert.deepEqual(query.$or, [
      { skuNormalized: 'GAR-001' },
      { externalIdNormalized: 'GAR-001' },
      { sku: 'gar-001' },
      { externalId: 'gar-001' },
    ]);
  });
});
