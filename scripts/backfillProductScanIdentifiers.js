'use strict';

/**
 * Idempotent backfill for skuNormalized and externalIdNormalized on existing products.
 * Run: node scripts/backfillProductScanIdentifiers.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { config } = require('../src/config/env');
const Product = require('../src/models/product.model');
const { normalizeScanCode } = require('../src/utils/productIdentifier.util');

async function backfill() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  let updated = 0;
  let unchanged = 0;

  for (const product of products) {
    const skuNormalized = normalizeScanCode(product.sku);
    const externalIdNormalized = normalizeScanCode(product.externalId);
    const nextSkuNormalized = skuNormalized || undefined;
    const nextExternalIdNormalized = externalIdNormalized || undefined;

    const skuChanged = product.skuNormalized !== nextSkuNormalized;
    const externalChanged = product.externalIdNormalized !== nextExternalIdNormalized;

    if (skuChanged || externalChanged) {
      product.skuNormalized = nextSkuNormalized;
      product.externalIdNormalized = nextExternalIdNormalized;
      await product.save();
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${unchanged} unchanged, ${products.length} total`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
