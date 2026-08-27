/**
 * @file Unit tests for scheduleController.
 *
 * Covers guard assignment, schedule CRUD, guard availability, and
 * checkpoint management. All model modules are mocked so the controller
 * logic (validation, status codes, audit logging) is tested in isolation
 * from the database layer.
 */

const scheduleController = require('../controllers/scheduleController');
const GuardSchedule = require('../models/GuardSchedule');
const GuardAvailability = require('../models/GuardAvailability');
const Checkpoint = require('../models/Checkpoint');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

jest.mock('../models/GuardSchedule');
jest.mock('../models/GuardAvailability');
jest.mock('../models/Checkpoint');

// User and AuditLog are owned by other in-progress branches (auth /
// audit-log features) and are still empty stub files here, so jest's
// automock can't infer their methods. Mock them explicitly with the
// shape scheduleController actually relies on, so this suite is
// self-contained and doesn't depend on those branches being merged.
jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));
jest.mock('../models/AuditLog', () => ({
  log: jest.fn(),
}));

/**
 * Build a mock Express response object with jest spies for the methods
 * the controller calls, so assertions can check status codes and payloads.
 *
 * @returns {import('express').Response} Mocked response object.
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Build a mock authenticated Express request object.
 *
 * @param {Object} [overrides] - Fields to merge into the base request (body, params, query, user).
 * @returns {import('express').Request} Mocked request object.
 */
function mockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 1, role: 'Security Officer' },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scheduleController.assignGuard', () => {
  it('returns 400 when required fields are missing', async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('required') })
    );
  });

  it('returns 400 for an invalid shift value', async () => {
    const req = mockRequest({
      body: {
        guard_id: 4,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Afternoon',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid shift' });
  });

  it('returns 404 when the guard does not exist', async () => {
    User.findById.mockResolvedValue(null);
    const req = mockRequest({
      body: {
        guard_id: 999,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Guard not found' });
  });

  it('returns 400 when the user is not a guard', async () => {
    User.findById.mockResolvedValue({ id: 1, role: 'Student', is_active: true });
    const req = mockRequest({
      body: {
        guard_id: 1,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'User is not a guard' });
  });

  it('returns 400 when the guard is on leave', async () => {
    User.findById.mockResolvedValue({ id: 4, role: 'Guard', is_active: true, name: 'Guard 1' });
    Checkpoint.findById.mockResolvedValue({ id: 1, is_active: true, name: 'Main Gate' });
    GuardAvailability.isAvailable.mockResolvedValue(false);
    const req = mockRequest({
      body: {
        guard_id: 4,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Guard is on leave on this date' });
  });

  it('returns 409 when the guard already has a conflicting assignment', async () => {
    User.findById.mockResolvedValue({ id: 4, role: 'Guard', is_active: true, name: 'Guard 1' });
    Checkpoint.findById.mockResolvedValue({ id: 1, is_active: true, name: 'Main Gate' });
    GuardAvailability.isAvailable.mockResolvedValue(true);
    GuardSchedule.checkConflict.mockResolvedValue(true);
    const req = mockRequest({
      body: {
        guard_id: 4,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('creates the schedule and logs the assignment on success', async () => {
    User.findById.mockResolvedValue({ id: 4, role: 'Guard', is_active: true, name: 'Guard 1' });
    Checkpoint.findById.mockResolvedValue({ id: 1, is_active: true, name: 'Main Gate' });
    GuardAvailability.isAvailable.mockResolvedValue(true);
    GuardSchedule.checkConflict.mockResolvedValue(false);
    GuardSchedule.create.mockResolvedValue({ id: 10, guard_id: 4, checkpoint_id: 1 });

    const req = mockRequest({
      body: {
        guard_id: 4,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
        notes: 'Test',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(GuardSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({ guard_id: 4, checkpoint_id: 1, assigned_by: 1 })
    );
    expect(AuditLog.log).toHaveBeenCalledWith(1, 'ASSIGN_GUARD', expect.any(String), req);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 10, guard_id: 4, checkpoint_id: 1 });
  });

  it('returns 500 when the model throws', async () => {
    User.findById.mockRejectedValue(new Error('DB down'));
    const req = mockRequest({
      body: {
        guard_id: 4,
        checkpoint_id: 1,
        date: '2026-09-01',
        shift: 'Morning',
      },
    });
    const res = mockResponse();

    await scheduleController.assignGuard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('scheduleController.getSchedules', () => {
  it('defaults to today when no date query param is given', async () => {
    GuardSchedule.findByDate.mockResolvedValue([{ id: 1 }]);
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await scheduleController.getSchedules(req, res);

    expect(GuardSchedule.findByDate).toHaveBeenCalledWith(expect.any(String));
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('uses the provided date query param', async () => {
    GuardSchedule.findByDate.mockResolvedValue([]);
    const req = mockRequest({ query: { date: '2026-09-01' } });
    const res = mockResponse();

    await scheduleController.getSchedules(req, res);

    expect(GuardSchedule.findByDate).toHaveBeenCalledWith('2026-09-01');
  });
});

describe('scheduleController.getTodayRoster', () => {
  it('returns the roster from GuardSchedule.getTodayRoster', async () => {
    const roster = [{ checkpoint_id: 1, coverage: {} }];
    GuardSchedule.getTodayRoster.mockResolvedValue(roster);
    const req = mockRequest();
    const res = mockResponse();

    await scheduleController.getTodayRoster(req, res);

    expect(res.json).toHaveBeenCalledWith(roster);
  });
});

describe('scheduleController.getGuardSchedules', () => {
  it('resolves "me" to the requesting user\'s id', async () => {
    GuardSchedule.findByGuard.mockResolvedValue([]);
    const req = mockRequest({ params: { guardId: 'me' }, user: { id: 4, role: 'Guard' } });
    const res = mockResponse();

    await scheduleController.getGuardSchedules(req, res);

    expect(GuardSchedule.findByGuard).toHaveBeenCalledWith(4, null, null);
  });

  it("returns 403 when a guard requests another guard's schedule", async () => {
    const req = mockRequest({ params: { guardId: '5' }, user: { id: 4, role: 'Guard' } });
    const res = mockResponse();

    await scheduleController.getGuardSchedules(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows a Security Officer to view any guard's schedule", async () => {
    GuardSchedule.findByGuard.mockResolvedValue([]);
    const req = mockRequest({
      params: { guardId: '5' },
      user: { id: 1, role: 'Security Officer' },
    });
    const res = mockResponse();

    await scheduleController.getGuardSchedules(req, res);

    expect(GuardSchedule.findByGuard).toHaveBeenCalledWith(5, null, null);
  });
});

describe('scheduleController.updateSchedule', () => {
  it('returns 404 when the schedule does not exist', async () => {
    GuardSchedule.findById.mockResolvedValue(null);
    const req = mockRequest({ params: { id: '99' }, body: {} });
    const res = mockResponse();

    await scheduleController.updateSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 409 on a conflicting re-assignment', async () => {
    GuardSchedule.findById.mockResolvedValue({
      id: 10,
      guard_id: 4,
      checkpoint_id: 1,
      date: '2026-09-01',
      shift: 'Morning',
    });
    User.findById.mockResolvedValue({ id: 5, role: 'Guard', is_active: true });
    GuardAvailability.isAvailable.mockResolvedValue(true);
    GuardSchedule.checkConflict.mockResolvedValue(true);

    const req = mockRequest({ params: { id: '10' }, body: { guard_id: 5 } });
    const res = mockResponse();

    await scheduleController.updateSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('updates the schedule and logs the change on success', async () => {
    GuardSchedule.findById.mockResolvedValue({
      id: 10,
      guard_id: 4,
      checkpoint_id: 1,
      date: '2026-09-01',
      shift: 'Morning',
      notes: null,
    });
    GuardSchedule.update.mockResolvedValue({ id: 10, notes: 'Updated' });

    const req = mockRequest({ params: { id: '10' }, body: { notes: 'Updated' } });
    const res = mockResponse();

    await scheduleController.updateSchedule(req, res);

    expect(AuditLog.log).toHaveBeenCalledWith(1, 'UPDATE_SCHEDULE', expect.any(String), req);
    expect(res.json).toHaveBeenCalledWith({ id: 10, notes: 'Updated' });
  });
});

describe('scheduleController.deleteSchedule', () => {
  it('returns 404 when the schedule does not exist', async () => {
    GuardSchedule.findById.mockResolvedValue(null);
    const req = mockRequest({ params: { id: '99' } });
    const res = mockResponse();

    await scheduleController.deleteSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletes the schedule and logs the action on success', async () => {
    GuardSchedule.findById.mockResolvedValue({ id: 10 });
    GuardSchedule.delete.mockResolvedValue(true);
    const req = mockRequest({ params: { id: '10' } });
    const res = mockResponse();

    await scheduleController.deleteSchedule(req, res);

    expect(GuardSchedule.delete).toHaveBeenCalledWith('10');
    expect(AuditLog.log).toHaveBeenCalledWith(1, 'DELETE_SCHEDULE', expect.any(String), req);
    expect(res.json).toHaveBeenCalledWith({ message: 'Schedule deleted successfully' });
  });
});

describe('scheduleController.getUnassigned', () => {
  it('defaults to today and returns unassigned slots', async () => {
    const unassigned = [{ checkpoint_id: 1, shift: 'Night' }];
    GuardSchedule.getUnassigned.mockResolvedValue(unassigned);
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await scheduleController.getUnassigned(req, res);

    expect(res.json).toHaveBeenCalledWith(unassigned);
  });
});

describe('scheduleController.setAvailability', () => {
  it('returns 400 when guard_id or date is missing', async () => {
    const req = mockRequest({ body: { guard_id: 4 } });
    const res = mockResponse();

    await scheduleController.setAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the target user is not a guard', async () => {
    User.findById.mockResolvedValue({ id: 6, role: 'Student' });
    const req = mockRequest({ body: { guard_id: 6, date: '2026-09-01' } });
    const res = mockResponse();

    await scheduleController.setAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid guard' });
  });

  it('sets availability and logs the action on success', async () => {
    User.findById.mockResolvedValue({ id: 4, role: 'Guard', name: 'Guard 1' });
    GuardAvailability.create.mockResolvedValue({ id: 1, is_available: false });
    const req = mockRequest({
      body: {
        guard_id: 4,
        date: '2026-09-01',
        is_available: false,
        reason: 'Sick leave',
      },
    });
    const res = mockResponse();

    await scheduleController.setAvailability(req, res);

    expect(AuditLog.log).toHaveBeenCalledWith(1, 'SET_AVAILABILITY', expect.any(String), req);
    expect(res.json).toHaveBeenCalledWith({ id: 1, is_available: false });
  });
});

describe('scheduleController.getAvailability', () => {
  it('returns 400 when the date range is missing', async () => {
    const req = mockRequest({ params: { guardId: '4' }, query: {} });
    const res = mockResponse();

    await scheduleController.getAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns availability records for a valid range', async () => {
    GuardAvailability.getRange.mockResolvedValue([{ id: 1 }]);
    const req = mockRequest({
      params: { guardId: '4' },
      query: { date_from: '2026-09-01', date_to: '2026-09-07' },
    });
    const res = mockResponse();

    await scheduleController.getAvailability(req, res);

    expect(GuardAvailability.getRange).toHaveBeenCalledWith(4, '2026-09-01', '2026-09-07');
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });
});

describe('scheduleController.addCheckpoint', () => {
  it('returns 400 when name or location is missing', async () => {
    const req = mockRequest({ body: { name: 'Main Gate' } });
    const res = mockResponse();

    await scheduleController.addCheckpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates the checkpoint and logs the action on success', async () => {
    Checkpoint.create.mockResolvedValue({ id: 1, name: 'Main Gate', location: 'Entrance' });
    const req = mockRequest({ body: { name: 'Main Gate', location: 'Entrance' } });
    const res = mockResponse();

    await scheduleController.addCheckpoint(req, res);

    expect(AuditLog.log).toHaveBeenCalledWith(1, 'ADD_CHECKPOINT', expect.any(String), req);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('scheduleController.getCheckpoints', () => {
  it('returns only active checkpoints when active_only=true', async () => {
    Checkpoint.findAllActive.mockResolvedValue([{ id: 1 }]);
    const req = mockRequest({ query: { active_only: 'true' } });
    const res = mockResponse();

    await scheduleController.getCheckpoints(req, res);

    expect(Checkpoint.findAllActive).toHaveBeenCalled();
    expect(Checkpoint.findAll).not.toHaveBeenCalled();
  });

  it('returns all checkpoints by default', async () => {
    Checkpoint.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await scheduleController.getCheckpoints(req, res);

    expect(Checkpoint.findAll).toHaveBeenCalled();
  });
});

describe('scheduleController.updateCheckpoint', () => {
  it('returns 404 when the checkpoint does not exist', async () => {
    Checkpoint.findById.mockResolvedValue(null);
    const req = mockRequest({ params: { id: '99' }, body: {} });
    const res = mockResponse();

    await scheduleController.updateCheckpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates the checkpoint and logs the action on success', async () => {
    Checkpoint.findById.mockResolvedValue({
      id: 1,
      name: 'Main Gate',
      location: 'Entrance',
      description: null,
      is_active: true,
    });
    Checkpoint.update.mockResolvedValue({ id: 1, name: 'Main Gate Updated' });
    const req = mockRequest({ params: { id: '1' }, body: { name: 'Main Gate Updated' } });
    const res = mockResponse();

    await scheduleController.updateCheckpoint(req, res);

    expect(AuditLog.log).toHaveBeenCalledWith(1, 'UPDATE_CHECKPOINT', expect.any(String), req);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Main Gate Updated' });
  });
});

describe('scheduleController.deleteCheckpoint', () => {
  it('returns 404 when the checkpoint does not exist', async () => {
    Checkpoint.findById.mockResolvedValue(null);
    const req = mockRequest({ params: { id: '99' } });
    const res = mockResponse();

    await scheduleController.deleteCheckpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletes the checkpoint and logs the action on success', async () => {
    Checkpoint.findById.mockResolvedValue({ id: 1, name: 'Main Gate' });
    Checkpoint.delete.mockResolvedValue(true);
    const req = mockRequest({ params: { id: '1' } });
    const res = mockResponse();

    await scheduleController.deleteCheckpoint(req, res);

    expect(AuditLog.log).toHaveBeenCalledWith(1, 'DELETE_CHECKPOINT', expect.any(String), req);
    expect(res.json).toHaveBeenCalledWith({ message: 'Checkpoint deleted successfully' });
  });
});
