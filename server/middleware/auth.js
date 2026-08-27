require('dotenv').config();

const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using a JWT token.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Object|void} Returns an error response or calls the next middleware.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'jwt_secret_key'
    );

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Alias for authentication middleware used by existing incident routes.
 */
const protect = authenticate;

module.exports = {
  authenticate,
  protect,
};