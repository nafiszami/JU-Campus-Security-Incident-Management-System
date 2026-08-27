const GuardSchedule = require('../models/GuardSchedule');
const GuardAvailability = require('../models/GuardAvailability');
const Checkpoint = require('../models/Checkpoint');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Assign a guard to a checkpoint for a given date and shift.
 * Validates the guard, checkpoint, availability, and any scheduling conflicts
 * before creating the schedule entry.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function assignGuard(req, res) {
  try {
    const { guard_id, checkpoint_id, date, shift, notes } = req.body;

    if (!guard_id || !checkpoint_id || !date || !shift) {
      return res.status(400).json({
        error: 'Guard ID, checkpoint ID, date, and shift are required',
      });
    }

    if (!['Morning', 'Day', 'Night'].includes(shift)) {
      return res.status(400).json({ error: 'Invalid shift' });
    }

    const guard = await User.findById(guard_id);
    if (!guard) return res.status(404).json({ error: 'Guard not found' });
    if (guard.role !== 'Guard') return res.status(400).json({ error: 'User is not a guard' });
    if (!guard.is_active) return res.status(400).json({ error: 'Guard account is deactivated' });

    const checkpoint = await Checkpoint.findById(checkpoint_id);
    if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });
    if (!checkpoint.is_active) return res.status(400).json({ error: 'Checkpoint is deactivated' });

    const isAvailable = await GuardAvailability.isAvailable(guard_id, date);
    if (!isAvailable) return res.status(400).json({ error: 'Guard is on leave on this date' });

    const hasConflict = await GuardSchedule.checkConflict(guard_id, date, shift);
    if (hasConflict) {
      return res.status(409).json({
        error: 'Guard is already assigned to a different checkpoint on this date and shift',
      });
    }

    const schedule = await GuardSchedule.create({
      guard_id,
      checkpoint_id,
      date,
      shift,
      assigned_by: req.user.id,
      notes: notes || null,
    });

    await AuditLog.log(
      req.user.id,
      'ASSIGN_GUARD',
      `Assigned guard ${guard.name} to ${checkpoint.name} on ${date} (${shift})`,
      req
    );

    return res.status(201).json(schedule);
  } catch (error) {
    console.error('Assign guard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all schedule entries for a given date (defaults to today).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getSchedules(req, res) {
  try {
    const { date } = req.query;
    const scheduleDate = date || new Date().toISOString().split('T')[0];
    const schedules = await GuardSchedule.findByDate(scheduleDate);
    return res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get today's checkpoint coverage roster.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getTodayRoster(req, res) {
  try {
    const roster = await GuardSchedule.getTodayRoster();
    return res.json(roster);
  } catch (error) {
    console.error('Get today roster error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get schedule entries for a specific guard, optionally filtered by date range.
 * Guards may only view their own schedule; Security Officers and Admins may view any.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getGuardSchedules(req, res) {
  try {
    const { guardId } = req.params;
    const { date_from, date_to } = req.query;
    const id = guardId === 'me' ? req.user.id : guardId;

    if (
      req.user.role !== 'Security Officer' &&
      req.user.role !== 'Admin' &&
      req.user.id !== parseInt(id, 10)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedules = await GuardSchedule.findByGuard(
      parseInt(id, 10),
      date_from || null,
      date_to || null
    );
    return res.json(schedules);
  } catch (error) {
    console.error('Get guard schedules error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update an existing schedule entry. Re-validates guard availability and
 * scheduling conflicts if the guard, date, or shift changes.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function updateSchedule(req, res) {
  try {
    const { id } = req.params;
    const { guard_id, checkpoint_id, date, shift, notes } = req.body;

    const existing = await GuardSchedule.findById(id);
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    if (guard_id && guard_id !== existing.guard_id) {
      const guard = await User.findById(guard_id);
      if (!guard || guard.role !== 'Guard') return res.status(400).json({ error: 'Invalid guard' });
      if (!guard.is_active) return res.status(400).json({ error: 'Guard is deactivated' });

      const scheduleDate = date || existing.date;
      const scheduleShift = shift || existing.shift;

      const isAvailable = await GuardAvailability.isAvailable(guard_id, scheduleDate);
      if (!isAvailable) return res.status(400).json({ error: 'Guard is on leave on this date' });

      const hasConflict = await GuardSchedule.checkConflict(
        guard_id,
        scheduleDate,
        scheduleShift,
        id
      );
      if (hasConflict) {
        return res.status(409).json({ error: 'Guard already assigned to a different checkpoint' });
      }
    }

    if (checkpoint_id) {
      const checkpoint = await Checkpoint.findById(checkpoint_id);
      if (!checkpoint || !checkpoint.is_active) {
        return res.status(400).json({ error: 'Invalid or inactive checkpoint' });
      }
    }

    const updated = await GuardSchedule.update(id, {
      guard_id: guard_id || existing.guard_id,
      checkpoint_id: checkpoint_id || existing.checkpoint_id,
      date: date || existing.date,
      shift: shift || existing.shift,
      notes: notes || existing.notes,
    });

    await AuditLog.log(req.user.id, 'UPDATE_SCHEDULE', `Updated schedule ${id}`, req);
    return res.json(updated);
  } catch (error) {
    console.error('Update schedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a schedule entry.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function deleteSchedule(req, res) {
  try {
    const { id } = req.params;
    const existing = await GuardSchedule.findById(id);
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });
    await GuardSchedule.delete(id);
    await AuditLog.log(req.user.id, 'DELETE_SCHEDULE', `Deleted schedule ${id}`, req);
    return res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all unassigned checkpoint/shift slots for a given date (defaults to today).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getUnassigned(req, res) {
  try {
    const { date } = req.query;
    const scheduleDate = date || new Date().toISOString().split('T')[0];
    const unassigned = await GuardSchedule.getUnassigned(scheduleDate);
    return res.json(unassigned);
  } catch (error) {
    console.error('Get unassigned error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Set (create or update) a guard's availability for a date.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function setAvailability(req, res) {
  try {
    const { guard_id, date, is_available, reason, notes } = req.body;
    if (!guard_id || !date)
      return res.status(400).json({ error: 'Guard ID and date are required' });
    const guard = await User.findById(guard_id);
    if (!guard || guard.role !== 'Guard') return res.status(400).json({ error: 'Invalid guard' });
    const availability = await GuardAvailability.create({
      guard_id,
      date,
      is_available: is_available !== undefined ? is_available : true,
      reason: reason || null,
      notes: notes || null,
    });
    await AuditLog.log(
      req.user.id,
      'SET_AVAILABILITY',
      `Set availability for guard ${guard.name} on ${date}: ${
        is_available ? 'Available' : 'Unavailable'
      }`,
      req
    );
    return res.json(availability);
  } catch (error) {
    console.error('Set availability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a guard's availability records within a date range.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getAvailability(req, res) {
  try {
    const { guardId } = req.params;
    const { date_from, date_to } = req.query;
    if (!date_from || !date_to) return res.status(400).json({ error: 'Date range is required' });
    const availability = await GuardAvailability.getRange(
      parseInt(guardId, 10),
      date_from,
      date_to
    );
    return res.json(availability);
  } catch (error) {
    console.error('Get availability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new checkpoint.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function addCheckpoint(req, res) {
  try {
    const { name, location, description } = req.body;
    if (!name || !location)
      return res.status(400).json({ error: 'Name and location are required' });
    const checkpoint = await Checkpoint.create({ name, location, description });
    await AuditLog.log(req.user.id, 'ADD_CHECKPOINT', `Added checkpoint: ${name}`, req);
    return res.status(201).json(checkpoint);
  } catch (error) {
    console.error('Add checkpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get checkpoints, optionally filtered to active ones only.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function getCheckpoints(req, res) {
  try {
    const { active_only } = req.query;
    const checkpoints =
      active_only === 'true' ? await Checkpoint.findAllActive() : await Checkpoint.findAll();
    return res.json(checkpoints);
  } catch (error) {
    console.error('Get checkpoints error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update an existing checkpoint.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function updateCheckpoint(req, res) {
  try {
    const { id } = req.params;
    const { name, location, description, is_active } = req.body;
    const existing = await Checkpoint.findById(id);
    if (!existing) return res.status(404).json({ error: 'Checkpoint not found' });
    const updated = await Checkpoint.update(id, {
      name: name || existing.name,
      location: location || existing.location,
      description: description !== undefined ? description : existing.description,
      is_active: is_active !== undefined ? is_active : existing.is_active,
    });
    await AuditLog.log(
      req.user.id,
      'UPDATE_CHECKPOINT',
      `Updated checkpoint: ${existing.name}`,
      req
    );
    return res.json(updated);
  } catch (error) {
    console.error('Update checkpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete (deactivate) a checkpoint.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function deleteCheckpoint(req, res) {
  try {
    const { id } = req.params;
    const existing = await Checkpoint.findById(id);
    if (!existing) return res.status(404).json({ error: 'Checkpoint not found' });
    await Checkpoint.delete(id);
    await AuditLog.log(
      req.user.id,
      'DELETE_CHECKPOINT',
      `Deleted checkpoint: ${existing.name}`,
      req
    );
    return res.json({ message: 'Checkpoint deleted successfully' });
  } catch (error) {
    console.error('Delete checkpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
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
};
