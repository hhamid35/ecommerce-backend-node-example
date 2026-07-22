'use strict';

const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null, index: true },
    attemptCount: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, default: null },
    createdFromIp: { type: String },
    createdFromUserAgent: { type: String },
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ user: 1, usedAt: 1, expiresAt: 1 });
passwordResetTokenSchema.index({ email: 1, usedAt: 1, expiresAt: 1, createdAt: -1 });

passwordResetTokenSchema.statics.invalidateActiveForUser = async function invalidateActiveForUser(userId) {
  const now = new Date();
  await this.updateMany(
    { user: userId, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
};

passwordResetTokenSchema.statics.findActiveByEmail = async function findActiveByEmail(email) {
  const now = new Date();
  return this.findOne({
    email: email.toLowerCase().trim(),
    usedAt: null,
    expiresAt: { $gt: now },
  })
    .sort({ createdAt: -1 })
    .select('+otpHash');
};

module.exports = mongoose.model('passwordresettoken', passwordResetTokenSchema);
