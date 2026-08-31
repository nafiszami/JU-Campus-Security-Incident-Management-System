const request = require('supertest');
const express = require('express');

jest.mock('../models/IncidentQuery', () => ({
  findIncidentById: jest.fn(),
  updateIncidentStatusFields: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  recordAuditEntry: jest.fn(),
}));

const {
  findIncidentById,
  updateIncidentStatusFields,
} = require('../models/IncidentQuery');
const { recordAuditEntry } = require('../models/AuditLog');

const { updateInvestigationStatus } = require('../controllers/updateReportController');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.patch('/:id/status', updateInvestigationStatus);
  return app;
}

const assignedOfficer = { id: 5, role: 'Security Officer', is_head_security_officer: false };
const otherOfficer = { id: 9, role: 'Security Officer', is_head_security_officer: false };

describe('PATCH /:id/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('moves an Assigned report to Under Investigation for the assigned officer', async () => {
    findIncidentById.mockResolvedValue({
      id: 4, report_id: 'INC-2026-0004', status: 'Assigned', assigned_to: 5,
    });
    updateIncidentStatusFields.mockResolvedValue({
      id: 4, report_id: 'INC-2026-0004', status: 'Under Investigation',
    });

    const response = await request(buildApp(assignedOfficer))
      .patch('/4/status')
      .send({ status: 'Under Investigation' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('Under Investigation');
    expect(recordAuditEntry).toHaveBeenCalled();
  });

  test('rejects a status update from an officer the report is not assigned to', async () => {
    findIncidentById.mockResolvedValue({
      id: 4, report_id: 'INC-2026-0004', status: 'Assigned', assigned_to: 5,
    });

    const response = await request(buildApp(otherOfficer))
      .patch('/4/status')
      .send({ status: 'Under Investigation' });

    expect(response.status).toBe(403);
    expect(updateIncidentStatusFields).not.toHaveBeenCalled();
  });
});