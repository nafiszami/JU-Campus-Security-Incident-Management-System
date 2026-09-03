const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  login,
  logout,
  getCurrentUser,
  checkToken,
  changePassword,
} = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.get('/check', authenticate, checkToken);
router.put('/password', authenticate, changePassword);

module.exports = router;