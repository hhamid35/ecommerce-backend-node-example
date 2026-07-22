'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const request = require('supertest');

jest.mock('../src/utils/recoveryEmail', () => ({
  sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
}));

const PasswordResetToken = require('../src/models/passwordResetToken.model');
const User = require('../src/models/user.model');
const app = require('../src/app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await PasswordResetToken.deleteMany({});
});

describe('password recovery endpoints', () => {
  test('POST /forgot-password returns neutral success for unknown email', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account exists, reset instructions have been sent.');
    expect(await PasswordResetToken.countDocuments()).toBe(0);
  });

  test('POST /forgot-password creates token for known email', async () => {
    await User.create({
      name: 'Test User',
      email: 'user@example.com',
      password: await bcrypt.hash('oldpass', 10),
      userType: 'USER',
    });

    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expiresInMinutes).toBe(10);
    expect(res.body.debugOtp).toMatch(/^\d{6}$/);
    expect(await PasswordResetToken.countDocuments()).toBe(1);
  });

  test('POST /reset-forgotten-password resets password and invalidates OTP', async () => {
    const user = await User.create({
      name: 'Reset User',
      email: 'reset@example.com',
      password: await bcrypt.hash('oldpass', 10),
      userType: 'USER',
    });

    const otp = '123456';
    await PasswordResetToken.create({
      user: user._id,
      email: 'reset@example.com',
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app)
      .post('/reset-forgotten-password')
      .send({ email: 'reset@example.com', otp, newPassword: 'newpass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password reset successfully');

    const updatedUser = await User.findById(user._id);
    expect(await bcrypt.compare('newpass1', updatedUser.password)).toBe(true);
    expect(updatedUser.passwordChangedAt).toBeTruthy();

    const token = await PasswordResetToken.findOne({ email: 'reset@example.com' });
    expect(token.usedAt).toBeTruthy();

    const reuse = await request(app)
      .post('/reset-forgotten-password')
      .send({ email: 'reset@example.com', otp, newPassword: 'another1' });

    expect(reuse.status).toBe(400);
    expect(reuse.body.message).toBe('Reset code is invalid or expired');
  });

  test('POST /reset-forgotten-password rejects weak password', async () => {
    const res = await request(app)
      .post('/reset-forgotten-password')
      .send({ email: 'user@example.com', otp: '123456', newPassword: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password must be 6 characters long');
  });
});

describe('OpenAPI recovery paths', () => {
  test('documents forgot-password and reset-forgotten-password', () => {
    const openapiSpec = require('../src/docs/openapi');
    expect(openapiSpec.paths['/forgot-password']).toBeDefined();
    expect(openapiSpec.paths['/reset-forgotten-password']).toBeDefined();
  });
});
