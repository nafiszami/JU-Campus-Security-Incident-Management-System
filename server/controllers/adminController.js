const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Create a new user account.
 * @route   POST /api/admin/users
 * @access  Admin only
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, role, password, phone, assigned_gate } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'name, email, role, and password are required' });
    }

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash: passwordHash, role, phone, assigned_gate });

    await AuditLog.log(req.user.id, 'CREATE_USER', `Admin created user ${email} with role ${role}`);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all users with optional filters.
 * @route   GET /api/admin/users
 * @access  Admin only
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, is_active } = req.query;
    const users = await User.findAll({ role, is_active });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a user's role.
 * @route   PUT /api/admin/users/:id/role
 * @access  Admin only
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await User.update(id, { role });
    await AuditLog.log(req.user.id, 'UPDATE_ROLE', `Changed role of ${user.email} to ${role}`);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

/**
 * Deactivate a user account.
 * @route   PUT /api/admin/users/:id/deactivate
 * @access  Admin only
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === parseInt(id, 10)) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await User.update(id, { is_active: false });
    await AuditLog.log(req.user.id, 'DEACTIVATE_USER', `Deactivated user ${user.email}`);
    return res.json({ message: 'User deactivated', user: updated });
  } catch (error) {
    return next(error);
  }
};

/**
 * Reactivate a user account.
 * @route   PUT /api/admin/users/:id/activate
 * @access  Admin only
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
const reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await User.update(id, { is_active: true });
    await AuditLog.log(req.user.id, 'REACTIVATE_USER', `Reactivated user ${user.email}`);
    return res.json({ message: 'User reactivated', user: updated });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createUser, getUsers, updateRole, deactivateUser, reactivateUser };