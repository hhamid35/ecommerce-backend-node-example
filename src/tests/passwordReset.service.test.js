'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const PasswordResetService = require('../services/passwordReset.service');
const ApiError = require('../utils/ApiError');

describe('PasswordResetService helpers', () => {
  it('normalizeEmail trims and lowercases valid input', () => {
    assert.equal(PasswordResetService.normalizeEmail('  User@Example.COM '), 'user@example.com');
    assert.equal(PasswordResetService.normalizeEmail(123), '');
  });

  it('validateRecoveryEmail rejects malformed addresses', () => {
    assert.throws(
      () => PasswordResetService.validateRecoveryEmail('not-an-email'),
      (err) => err instanceof ApiError && err.statusCode === 400
    );
    assert.throws(() => PasswordResetService.validateRecoveryEmail(''), ApiError);
  });

  it('validateRecoveryEmail accepts syntactically valid email', () => {
    assert.doesNotThrow(() => PasswordResetService.validateRecoveryEmail('user@example.com'));
  });

  it('validateNewPassword enforces length and letter+number rule', () => {
    assert.throws(() => PasswordResetService.validateNewPassword('short1'), ApiError);
    assert.throws(() => PasswordResetService.validateNewPassword('allletters'), ApiError);
    assert.throws(() => PasswordResetService.validateNewPassword('12345678'), ApiError);
    assert.doesNotThrow(() => PasswordResetService.validateNewPassword('newpass123'));
  });

  it('generateOtp returns a 6-digit zero-padded string', () => {
    const otp = PasswordResetService.generateOtp(6);
    assert.match(otp, /^\d{6}$/);
  });

  it('hashIp returns sha256 hex for non-empty IP', () => {
    const hashed = PasswordResetService.hashIp('127.0.0.1');
    assert.equal(typeof hashed, 'string');
    assert.equal(hashed.length, 64);
    assert.equal(PasswordResetService.hashIp(''), undefined);
  });
});
