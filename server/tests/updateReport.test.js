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
  
});