const GuardSchedule = require('../models/GuardSchedule');
const Attendance = require('../models/Attendance');
const { recordAuditEntry } = require('../models/AuditLog');

/**
 * Determine attendance status by comparing check-in time to the shift start.
 *
 * @param {string} shiftStart - Scheduled shift start time (HH:MM:SS).
 * @param {string} checkInTime - Actual check-in time (HH:MM:SS).
 * @returns {'Present'|'Late'} Attendance status.
 */
const determineStatus = (shiftStart, checkInTime) =>
  checkInTime > shiftStart ? 'Late' : 'Present';

/**
 * Record a guard's check-in for a scheduled shift.
 * @route POST /api/attendance/checkin
 * @access Guard
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const checkIn = async (req, res, next) => {
  try {
    const { schedule_id: scheduleId } = req.body;
    if (!scheduleId) return res.status(400).json({ error: 'schedule_id is required' });

    const schedule = await GuardSchedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    if (schedule.guard_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your assigned shift' });
    }

    const date = schedule.date || new Date().toISOString().split('T')[0];
    const existing = await Attendance.findBySchedule(scheduleId, date);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'Already checked in for this shift' });
    }

    const now = new Date();
    const checkInTime = now.toTimeString().split(' ')[0];
    const status = determineStatus(schedule.shift_start, checkInTime);

    const created = await Attendance.create({
      schedule_id: scheduleId,
      guard_id: req.user.id,
      date,
      shift: schedule.shift,
      check_in_time: checkInTime,
      status,
    });

    await recordAuditEntry(
      req.user.id,
      'GUARD_CHECK_IN',
      `Guard checked in for schedule ${scheduleId} (${status})`
    );

    return res.json({ message: 'Check-in recorded', attendance: created });
  } catch (error) {
    return next(error);
  }
};

/**
 * Record a guard's check-out for a scheduled shift.
 * @route POST /api/attendance/checkout
 * @access Guard
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const checkOut = async (req, res, next) => {
  try {
    const { schedule_id: scheduleId } = req.body;
    if (!scheduleId) return res.status(400).json({ error: 'schedule_id is required' });

    const schedule = await GuardSchedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    if (schedule.guard_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your assigned shift' });
    }

    const date = schedule.date || new Date().toISOString().split('T')[0];
    const existing = await Attendance.findBySchedule(scheduleId, date);
    if (!existing || !existing.check_in_time) {
      return res.status(400).json({ error: 'No check-in record found' });
    }

    const checkOutTime = new Date().toTimeString().split(' ')[0];
    const updated = await Attendance.checkOut(scheduleId, req.user.id, date, checkOutTime);

    await recordAuditEntry(
      req.user.id,
      'GUARD_CHECK_OUT',
      `Guard checked out for schedule ${scheduleId}`
    );

    return res.json({ message: 'Check-out recorded', attendance: updated });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get the daily attendance summary for all scheduled guards.
 * @route GET /api/attendance/daily
 * @access Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const getDailySummary = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const summary = await Attendance.getDailySummary(date);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get attendance history for a specific guard.
 * Guards may only view their own history; Security Officers/Admins may view any.
 * @route GET /api/attendance/guard/:guardId
 * @access Guard (own), Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const getGuardHistory = async (req, res, next) => {
  try {
    const { guardId } = req.params;
    const { date_from: dateFrom, date_to: dateTo } = req.query;

    if (req.user.role === 'Guard' && req.user.id !== parseInt(guardId, 10)) {
      return res.status(403).json({ error: 'You can only view your own attendance history.' });
    }

    const history = await Attendance.getGuardHistory(guardId, dateFrom || null, dateTo || null);
    return res.json(history);
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkIn, checkOut, getDailySummary, getGuardHistory };
