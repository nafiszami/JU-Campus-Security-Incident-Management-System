const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  checkIn,
  checkOut,
  getDailySummary,
  getGuardHistory,
} = require('../controllers/attendanceController');

const router = express.Router();

router.use(authenticate);

router.post('/checkin', authorize(['Guard']), checkIn);
router.post('/checkout', authorize(['Guard']), checkOut);
router.get('/daily', authorize(['Security Officer', 'Admin']), getDailySummary);
router.get('/guard/:guardId', authorize(['Guard', 'Security Officer', 'Admin']), getGuardHistory);

module.exports = router;
