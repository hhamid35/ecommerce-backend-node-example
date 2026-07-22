'use strict';

const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /photos/upload   (multipart/form-data, field name: "photos")
 * Returns the stored filename so the client can build an image URL of the form
 * `{serverip}/uploads/{filename}`.
 * Response: { image: "<filename>" }
 */
const uploadPhotos = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ err: 'Please upload an image', msg: 'Please upload an image' });
  }

  const file = files[0];
  return res.json({ image: file.filename });
});

module.exports = { uploadPhotos };
