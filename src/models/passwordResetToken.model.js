'use strict';

const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
    attempts: { type: Number, default: 0 },
    requestIpHash: { type: String },
    userAgent: { type: String, maxlength: 256 },
  },
  { timestamps: true, collection: 'password_reset_tokens' }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ user: 1, consumedAt: 1, createdAt: -1 });
passwordResetTokenSchema.index({ email: 1, consumedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('passwordResetToken', passwordResetTokenSchema);
