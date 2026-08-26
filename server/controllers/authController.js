const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { isValidPassword } = require('../utils/validators');

// FR-11.1 — Login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  const user = users[0];

  // Generic error — never reveal whether email or password was wrong
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Inactive account check
  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account is inactive. Contact the Admin.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await query(
    'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
    [user.id, 'LOGIN', `User ${user.email} logged in`, req.ip]
  );

  return res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

// FR-11.2 — Logout
async function logout(req, res) {
  await query(
    'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
    [req.user.id, 'LOGOUT', `User ${req.user.email} logged out`, req.ip]
  );
  return res.status(200).json({ message: 'Logged out successfully' });
}

// FR-11.5 — Change Password
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
  const user = users[0];

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include a letter and a number',
    });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

  await query(
    'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
    [userId, 'PASSWORD_CHANGE', `User ${user.email} changed password`, req.ip]
  );

  return res.status(200).json({ message: 'Password changed successfully' });
}

// Get current logged-in user
async function getMe(req, res) {
  const users = await query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  return res.status(200).json({ user: users[0] });
}

module.exports = { login, logout, changePassword, getMe };