const User = require('../models/User');

/**
 * Refreshes req.user with the current database row for the
 * authenticated user, so fields like is_head_security_officer and
 * is_active reflect the latest state rather than whatever was baked
 * into the JWT at login time.
 *
 * Runs after the shared authenticate middleware. Does not modify or
 * replace it — this only applies to routes that explicitly use it.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Object|void} Error response or next middleware.
 */
async function loadCurrentUser(req, res, next) {
  try {
    const user = await User.findUserById(req.user.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid user session' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { loadCurrentUser };