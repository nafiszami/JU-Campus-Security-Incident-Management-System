const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  assignGuard,
  getSchedules,
  getTodayRoster,
  getGuardSchedules,
  updateSchedule,
  deleteSchedule,
  getUnassigned,
  setAvailability,
  getAvailability,
  addCheckpoint,
  getCheckpoints,
  updateCheckpoint,
  deleteCheckpoint,
} = require('../controllers/scheduleController');

/**
 * Express router exposing guard scheduling, availability, and checkpoint
 * management endpoints. All routes require authentication; most write
 * operations are restricted to Security Officers and Admins.
 *
 * @type {import('express').Router}
 */
const router = express.Router();

router.use(authenticate);

// Scheduling - Security Officer only
router.post('/assign', authorize(['Security Officer', 'Admin']), assignGuard);
router.get('/', authorize(['Security Officer', 'Admin']), getSchedules);
router.get('/today', getTodayRoster);
router.get('/unassigned', authorize(['Security Officer', 'Admin']), getUnassigned);
router.put('/:id', authorize(['Security Officer', 'Admin']), updateSchedule);
router.delete('/:id', authorize(['Security Officer', 'Admin']), deleteSchedule);

// Guard schedules - Guards can view their own
router.get('/guard/:guardId', getGuardSchedules);

// Availability - Security Officer only
router.post('/availability', authorize(['Security Officer', 'Admin']), setAvailability);
router.get('/availability/:guardId', authorize(['Security Officer', 'Admin']), getAvailability);

// Checkpoints - Security Officer only
router.post('/checkpoints', authorize(['Security Officer', 'Admin']), addCheckpoint);
router.get('/checkpoints', getCheckpoints);
router.put('/checkpoints/:id', authorize(['Security Officer', 'Admin']), updateCheckpoint);
router.delete('/checkpoints/:id', authorize(['Security Officer', 'Admin']), deleteCheckpoint);

module.exports = router;
