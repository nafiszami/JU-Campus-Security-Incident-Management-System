const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes by verifying JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    [, token] = req.headers.authorization.split(' ');
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_key');
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
