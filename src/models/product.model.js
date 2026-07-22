'use strict';

const mongoose = require('mongoose');
const { normalizeScanCode } = require('../utils/productIdentifier.util');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String, trim: true },
    skuNormalized: { type: String, trim: true, uppercase: true, index: true },
    externalId: { type: String, trim: true },
    externalIdNormalized: { type: String, trim: true, uppercase: true, index: true },
    price: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'categories' },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ skuNormalized: 1 }, { unique: true, sparse: true });
productSchema.index({ externalIdNormalized: 1 }, { unique: true, sparse: true });

productSchema.pre('save', function preSaveNormalizeIdentifiers(next) {
  const skuNormalized = normalizeScanCode(this.sku);
  const externalIdNormalized = normalizeScanCode(this.externalId);

  this.skuNormalized = skuNormalized || undefined;
  this.externalIdNormalized = externalIdNormalized || undefined;
  next();
});

module.exports = mongoose.model('product', productSchema);
