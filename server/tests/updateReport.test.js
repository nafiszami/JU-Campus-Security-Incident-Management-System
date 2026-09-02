const request = require('supertest');

jest.mock('../models/IncidentQuery', () => ({
  findIncidentById: jest.fn(),
  updateIncidentStatusFields: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  recordAuditEntry: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      id: 5,
      role: 'Security Officer',
      is_head_security_officer: false,
    };
    next();
  }),
}));

jest.mock('../middleware/loadCurrentUser', () => ({
  loadCurrentUser: jest.fn((req, res, next) => {
    req.user = {
      id: 5,
      role: 'Security Officer',
      is_head_security_officer: false,
    };
    next();
  }),
}));

jest.mock('../middleware/role', () => ({
  authorize: jest.fn(() => (req, res, next) => next()),
  requireHeadSecurityOfficer: jest.fn((req, res, next) => next()),
}));

jest.mock('../routes/authRoutes', () => {
  const express = require('express');
  return express.Router();
});

const express = require('express');
const updateReportRoutes = require('../routes/updateReportRoutes');

const app = express();

app.use(express.json());
app.use('/api/reports', updateReportRoutes);

const {
  findIncidentById,
  updateIncidentStatusFields,
} = require('../models/IncidentQuery');

const { recordAuditEntry } = require('../models/AuditLog');

const { authenticate } = require('../middleware/auth');
const { loadCurrentUser } = require('../middleware/loadCurrentUser');

const headOfficer = { id: 7, role: 'Security Officer', is_head_security_officer: true };

/**
 * Overrides the default authenticated user for exactly one upcoming
 * request, since the module-level mocks always log in as the same
 * assigned officer otherwise.
 *
 * @param {Object} user - The user to authenticate as for one request.
 * @returns {void}
 */
function loginAs(user) {
  authenticate.mockImplementationOnce((req, res, next) => {
    req.user = user;
    next();
  });
  loadCurrentUser.mockImplementationOnce((req, res, next) => {
    req.user = user;
    next();
  });
}

describe('Update Report API', () => {
  const incident = {
    id: 4, report_id: 'INC-2026-0004', status: 'Assigned', assigned_to: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findIncidentById.mockResolvedValue(incident);
    updateIncidentStatusFields.mockResolvedValue({
      ...incident, status: 'Under Investigation',
    });
    recordAuditEntry.mockResolvedValue(1);
  });

  /**
   * The Security Officer assigned to the report moves it from
   * Assigned to Under Investigation.
   */
  it('should successfully move an Assigned report to Under Investigation', async () => {
    const res = await request(app)
      .patch('/api/reports/4/status').send({ status: 'Under Investigation' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Under Investigation');
    expect(updateIncidentStatusFields).toHaveBeenCalledWith('4', {
      status: 'Under Investigation',
      investigationSummary: undefined,
      markResolvedNow: false,
    });
    expect(recordAuditEntry).toHaveBeenCalled();
  });

  /**
   * A Security Officer the report is not assigned to must be
   * blocked from changing its status.
   */
  it('should fail when the officer is not assigned to the report', async () => {
    findIncidentById.mockResolvedValue({ ...incident, assigned_to: 9 });

    const res = await request(app)
      .patch('/api/reports/4/status').send({ status: 'Under Investigation' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Only the assigned Security Officer can update this report.');
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });
    /**
   * Marking a report Resolved without investigation findings must
   * be rejected before anything is written to the database.
   */
  it('should fail to resolve a report with no investigation findings', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Under Investigation' });

    const res = await request(app)
      .patch('/api/reports/4/status').send({ status: 'Resolved' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Investigation findings are required to mark this report as Resolved.');
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });

  /**
   * Resolving a report with findings provided must store those
   * findings and stamp resolved_at on the incident.
   */
  it('should successfully resolve a report and store the findings', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Under Investigation' });
    updateIncidentStatusFields.mockResolvedValue({
      ...incident, status: 'Resolved', investigation_notes: 'Reviewed CCTV, matter confirmed.',
    });

    const res = await request(app)
      .patch('/api/reports/4/status')
      .send({ status: 'Resolved', investigationSummary: 'Reviewed CCTV, matter confirmed.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Resolved');
    expect(updateIncidentStatusFields).toHaveBeenCalledWith('4', {
      status: 'Resolved',
      investigationSummary: 'Reviewed CCTV, matter confirmed.',
      markResolvedNow: true,
    });
  });

    /**
   * A report must move through Under Investigation before it can be
   * Resolved - skipping straight from Assigned is not a valid
   * transition.
   */
  it('should fail when skipping directly from Assigned to Resolved', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Assigned' });

    const res = await request(app)
      .patch('/api/reports/4/status')
      .send({ status: 'Resolved', investigationSummary: 'Trying to skip ahead.' });

    expect(res.status).toBe(400);
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });

  /**
   * A Closed report is read-only - no status change should be
   * accepted through this endpoint once it reaches Closed.
   */
  it('should fail to change the status of a Closed report', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Closed' });

    const res = await request(app)
      .patch('/api/reports/4/status').send({ status: 'Under Investigation' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This report is closed and cannot be modified.');
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });

    /**
   * A Head Security Officer reviewing a Resolved report should be
   * able to close it, moving it to its final Closed state.
   */
  it('should allow a Head Security Officer to close a Resolved report', async () => {
    loginAs(headOfficer);
    findIncidentById.mockResolvedValue({ ...incident, status: 'Resolved' });
    updateIncidentStatusFields.mockResolvedValue({ ...incident, status: 'Closed' });

    const res = await request(app).put('/api/reports/4/close');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Closed');
    expect(recordAuditEntry).toHaveBeenCalled();
  });

  /**
   * The Security Officer assigned to a report is not the one
   * authorized to close it - only the Head Security Officer can.
   */
  it('should fail when a non-head officer tries to close a report', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Resolved' });

    const res = await request(app).put('/api/reports/4/close');

    expect(res.status).toBe(403);
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });
  
});