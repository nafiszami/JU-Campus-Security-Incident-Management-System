/* eslint-disable no-undef, no-unused-vars */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Attendance = require('../models/Attendance');

jest.mock('../models/Attendance');
describe('Guard Attendance API (Sprint 2)', () => {
  let guardToken;
  let officerToken;
  beforeAll(() => {
    guardToken = jwt.sign(
      { id: 4, role: 'Guard', name: 'Guard 1' },
      process.env.JWT_SECRET || 'jwt_secret_key'
    );
    officerToken = jwt.sign(
      { id: 2, role: 'Security Officer' },
      process.env.JWT_SECRET || 'jwt_secret_key'
    );
  });
  afterEach(() => jest.clearAllMocks());
  // ── TEST 1: Guard checks in on time → Present ─────────────────────
  it('should mark guard Present for on-time check-in', async () => {
    // guard_schedules record shows shift_start is in the past (on time)
    const schedule = {
      id: 1,
      guard_id: 4,
      shift: 'Morning',
      shift_start: '06:00:00',
      date: '2026-08-28',
    };
    const attendanceRecord = {
      id: 1,
      schedule_id: 1,
      guard_id: 4,
      status: 'Present',
      check_in_time: '06:05:00',
    };
    query
      .mockResolvedValueOnce([schedule]) // GuardSchedule.findById
      .mockResolvedValueOnce([]) // Attendance.findBySchedule (not yet)
      .mockResolvedValueOnce({ insertId: 1 }) // Attendance.create INSERT
      .mockResolvedValueOnce([attendanceRecord]) // Attendance.findById
      .mockResolvedValueOnce({ insertId: 5 }); // audit_log
    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ schedule_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.attendance.status).toBe('Present');
  });
  // ── TEST 2: Guard cannot check in for another guard's schedule ────
  it('should reject check-in for a different guard schedule', async () => {
    Model.method.mockResolvedValueOnce([
      { id: 1, guard_id: 99, shift: 'Morning', shift_start: '06:00:00' },
    ]);
    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ schedule_id: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not your assigned shift');
  });
  // ── TEST 3: Check-out without prior check-in blocked ─────────────
  it('should reject checkout if no check-in exists', async () => {
    const schedule = { id: 1, guard_id: 4, shift: 'Morning', shift_start: '06:00:00' };
    query
      .mockResolvedValueOnce([schedule]) // findById
      .mockResolvedValueOnce([{ id: 1, check_in_time: null }]); // no check-in
    const res = await request(app)
      .post('/api/attendance/checkout')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ schedule_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No check-in record found');
  });
  // ── TEST 4: Successful check-out ─────────────────────────────────
  it('should successfully record guard check-out', async () => {
    const schedule = { id: 1, guard_id: 4, shift: 'Morning', shift_start: '06:00:00' };
    const today = new Date().toISOString().split('T')[0];
    query
      .mockResolvedValueOnce([schedule])
      .mockResolvedValueOnce([
        { id: 1, schedule_id: 1, check_in_time: '06:05:00', guard_id: 4, date: today },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 1, check_out_time: '14:00:00' }])
      .mockResolvedValueOnce({ insertId: 6 });
    const res = await request(app)
      .post('/api/attendance/checkout')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ schedule_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.attendance.check_out_time).toBeDefined();
  });
  // ── TEST 5: Security Officer views daily attendance summary ───────
  it('should return daily attendance summary for Security Officer', async () => {
    const summary = { total_scheduled: 5, present: 3, late: 1, absent: 1, not_checked_in: 0 };
    Model.method.mockResolvedValueOnce([summary]);
    const res = await request(app)
      .get('/api/attendance/daily')
      .set('Authorization', `Bearer ${officerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_scheduled');
    expect(res.body).toHaveProperty('present');
    expect(res.body).toHaveProperty('absent');
  });
  // ── TEST 6: Guard views own attendance history ────────────────────
  it('should return attendance history for a guard', async () => {
    Model.method.mockResolvedValueOnce([
      { id: 1, guard_id: 4, date: '2026-08-28', status: 'Present' },
    ]);
    const res = await request(app)
      .get('/api/attendance/guard/4')
      .set('Authorization', `Bearer ${guardToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  // ── TEST 7: Guard cannot view another guard's history ─────────────
  it('should deny Guard from viewing another guard history', async () => {
    const res = await request(app)
      .get('/api/attendance/guard/99')
      .set('Authorization', `Bearer ${guardToken}`);
    expect(res.status).toBe(403);
  });
});
