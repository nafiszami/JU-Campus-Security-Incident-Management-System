const express = require('express');
const router = express.Router();
const { login, logout, changePassword, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.put('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getMe);

module.exports = router;