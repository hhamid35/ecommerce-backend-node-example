'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');

// Ensure the upload directory exists on boot.
const uploadPath = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const parts = file.originalname.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const base = parts.join('.') || 'file';
    cb(null, `${base}-${Date.now()}${ext ? `.${ext}` : ''}`);
  },
});

const ALLOWED_MIME = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(ApiError.badRequest('Only image files (png, jpg, jpeg, webp, gif) are allowed'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxUploadBytes },
});

module.exports = upload;
