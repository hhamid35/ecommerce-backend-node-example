'use strict';

const mongoose = require('mongoose');

function normalizeSku(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : trimmed;
}

function normalizeExternalIds(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((id) => (typeof id === 'string' ? id.trim().toUpperCase() : ''))
    .filter((id) => id.length > 0);
}

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String },
    externalIds: { type: [String], default: [] },
    price: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'categories' },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.pre('save', function normalizeIdentifiers(next) {
  if (this.sku) {
    this.sku = normalizeSku(this.sku);
  }
  this.externalIds = normalizeExternalIds(this.externalIds);
  next();
});

productSchema.pre('findOneAndUpdate', function normalizeIdentifiersOnUpdate(next) {
  const update = this.getUpdate() || {};
  const payload = update.$set || update;

  if (payload.sku !== undefined) {
    payload.sku = normalizeSku(payload.sku);
  }
  if (payload.externalIds !== undefined) {
    payload.externalIds = normalizeExternalIds(payload.externalIds);
  }

  if (update.$set) {
    update.$set = payload;
  } else {
    Object.assign(update, payload);
  }

  this.setUpdate(update);
  next();
});

productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string', $gt: '' } } }
);

productSchema.index(
  { externalIds: 1 },
  { unique: true, partialFilterExpression: { externalIds: { $exists: true, $ne: [] } } }
);

module.exports = mongoose.model('product', productSchema);
