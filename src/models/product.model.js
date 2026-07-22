'use strict';

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String, trim: true },
    externalId: { type: String, trim: true },
    price: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'categories' },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ sku: 1 });
productSchema.index({ externalId: 1 });

module.exports = mongoose.model('product', productSchema);
