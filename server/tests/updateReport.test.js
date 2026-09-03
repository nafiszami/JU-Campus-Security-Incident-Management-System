/* eslint-disable global-require */
const request = require('supertest');

jest.mock('../models/IncidentQuery', () => ({
  findIncidentById: jest.fn(),
  updateIncidentStatusFields: jest.fn(),
  findAssignmentHistoryForIncident: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  recordAuditEntry: jest.fn(),
  findAuditHistoryForReport: jest.fn(),
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
  findAssignmentHistoryForIncident,
} = require('../models/IncidentQuery');

const { recordAuditEntry, findAuditHistoryForReport } = require('../models/AuditLog');

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

    /**
   * A report cannot be closed until it has actually reached the
   * Resolved status - closing straight from Under Investigation is
   * not a valid transition.
   */
  it('should fail to close a report that is not yet Resolved', async () => {
    loginAs(headOfficer);
    findIncidentById.mockResolvedValue({ ...incident, status: 'Under Investigation' });

    const res = await request(app).put('/api/reports/4/close');

    expect(res.status).toBe(400);
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });

  /**
   * A report that has already been closed cannot be closed again -
   * it should be left untouched, not re-processed.
   */
  it('should fail to close a report that is already Closed', async () => {
    loginAs(headOfficer);
    findIncidentById.mockResolvedValue({ ...incident, status: 'Closed' });

    const res = await request(app).put('/api/reports/4/close');

    expect(res.status).toBe(400);
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });

    /**
   * The Security Officer currently assigned to a report can review
   * it - seeing the report, its assignment history, and its status
   * history together.
   */
  it('should allow the assigned officer to review their own report', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Resolved' });
    findAssignmentHistoryForIncident.mockResolvedValue([{ id: 1, assigned_to_name: 'Officer Five' }]);
    findAuditHistoryForReport.mockResolvedValue([{ id: 1, action: 'UPDATE_STATUS' }]);

    const res = await request(app).get('/api/reports/4/review');

    expect(res.status).toBe(200);
    expect(res.body.report.report_id).toBe('INC-2026-0004');
    expect(res.body.assignmentHistory).toHaveLength(1);
    expect(res.body.statusHistory).toHaveLength(1);
  });

  /**
   * A Head Security Officer can review any report, not just ones
   * assigned to them.
   */
  it('should allow a Head Security Officer to review any report', async () => {
    loginAs(headOfficer);
    findIncidentById.mockResolvedValue({ ...incident, status: 'Resolved', assigned_to: 5 });
    findAssignmentHistoryForIncident.mockResolvedValue([]);
    findAuditHistoryForReport.mockResolvedValue([]);

    const res = await request(app).get('/api/reports/4/review');

    expect(res.status).toBe(200);
    expect(res.body.report.report_id).toBe('INC-2026-0004');
  });

  /**
   * An officer who isn't the one assigned to a report - and isn't
   * the Head Security Officer either - must not be able to review
   * it, even though they're an authenticated Security Officer.
   */
  it('should fail when an officer not assigned to the report tries to review it', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Resolved', assigned_to: 9 });

    const res = await request(app).get('/api/reports/4/review');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('You can only review reports assigned to you.');
  });

  /**
   * Reviewing a report that doesn't exist should return a clear 404
   * rather than crashing on a missing incident.
   */
  it('should return 404 when the report does not exist', async () => {
    findIncidentById.mockResolvedValue(null);

    const res = await request(app).get('/api/reports/999/review');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Incident not found');
  });
  
});