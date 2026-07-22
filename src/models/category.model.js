'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, default: null },
    icon: { type: String, default: null },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

// Keep the collection name as "categories" (matches existing data and the
// `ref: 'categories'` used by the product model).
module.exports = mongoose.model('categories', categorySchema);
