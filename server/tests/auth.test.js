const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123', 10);
    await query(
      'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      ['Test Student', 'teststudent@juniv.edu', hash, 'Student', true]
    );
  });

  test('rejects invalid credentials with generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teststudent@juniv.edu', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('logs in successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teststudent@juniv.edu', password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});