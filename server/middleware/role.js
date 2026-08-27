/**
 * Authorize user by role.
 *
 * @param {Array} roles - Array of allowed roles.
 * @returns {Function} Middleware function.
 */
function authorize(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
      });
    }

    return next();
  };
}

/**
 * Restrict access to the Head Security Officer.
 *
 * The authenticated user must have the Security Officer role
 * and the is_head_security_officer flag enabled.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Object|void} Error response or next middleware.
 */
function requireHeadSecurityOfficer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (
    req.user.role !== 'Security Officer'
    || !req.user.is_head_security_officer
  ) {
    return res.status(403).json({
      error: 'Access denied. Head Security Officer privileges required.',
    });
  }

  return next();
}

module.exports = {
  authorize,
  requireHeadSecurityOfficer,
};