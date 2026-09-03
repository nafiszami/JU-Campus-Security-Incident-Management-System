const express = require('express');
const {
  checkIn,
  checkOut,
  getDailySummary,
  getGuardHistory
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// Guard check-in (Only Guards)
router.post(
  '/checkin',
  protect,
  authorize(['Guard']),
  checkIn
);

// Guard check-out (Only Guards)
router.post(
  '/checkout',
  protect,
  authorize(['Guard']),
  checkOut
);

// Daily summary (Security Officers and Admins)
router.get(
  '/daily',
  protect,
  authorize(['Security Officer', 'Admin']),
  getDailySummary
);

// Specific guard's history (Guards, Security Officers, Admins)
router.get(
  '/guard/:guardId',
  protect,
  authorize(['Guard', 'Security Officer', 'Admin']),
  getGuardHistory
);

module.exports = router;
