/**
 * Assignment API tests.
 *
 * @file assignment.test.js
 */

const request = require('supertest');

jest.mock('../models/IncidentQuery', () => ({
  findIncidentById: jest.fn(),
  findIncidents: jest.fn(),
  findIncidentsAssignedTo: jest.fn(),
  findActiveIncidentForOfficer: jest.fn(),
  assignIncidentToOfficer: jest.fn(),
  recordAssignment: jest.fn(),
  findAssignmentHistoryForIncident: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findUserById: jest.fn(),
  findActiveSecurityOfficers: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  recordAuditEntry: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      id: 1,
      role: 'Security Officer',
      is_head_security_officer: true,
    };
    next();
  }),
}));

jest.mock('../middleware/loadCurrentUser', () => ({
  loadCurrentUser: jest.fn((req, res, next) => {
    req.user = {
      id: 1,
      role: 'Security Officer',
      is_head_security_officer: true,
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
const assignmentRoutes = require('../routes/assignmentRoutes');

const app = express();

app.use(express.json());
app.use('/api/assignments', assignmentRoutes);

const {
  findIncidentById,
  findIncidents,
  findIncidentsAssignedTo,
  findActiveIncidentForOfficer,
  assignIncidentToOfficer,
  recordAssignment,
  findAssignmentHistoryForIncident,
} = require('../models/IncidentQuery');

const {
  findUserById,
  findActiveSecurityOfficers,
} = require('../models/User');

const { recordAuditEntry } = require('../models/AuditLog');

describe('Assignment API', () => {
  const incident = {
    id: 1, report_id: 'RPT-20260825-0001', reported_by: 3,
    report_type: 'Theft', title: 'Stolen Bicycle',
    description: 'Bicycle stolen from dormitory.', location: 'Dormitory',
    priority: 'High', status: 'Submitted', assigned_to: null,
  };

  const officer = {
    id: 2, name: 'John Officer', email: 'john@example.com',
    role: 'Security Officer', is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findIncidentById.mockResolvedValue(incident);
    findIncidents.mockResolvedValue([incident]);
    findIncidentsAssignedTo.mockResolvedValue([]);
    findActiveIncidentForOfficer.mockResolvedValue(null);
    findUserById.mockResolvedValue(officer);
    findActiveSecurityOfficers.mockResolvedValue([officer]);
    assignIncidentToOfficer.mockResolvedValue({
      ...incident, assigned_to: 2, status: 'Assigned',
    });
    recordAssignment.mockResolvedValue(1);
    findAssignmentHistoryForIncident.mockResolvedValue([]);
    recordAuditEntry.mockResolvedValue(1);
  });

  it('should successfully retrieve assignments', async () => {
    const res = await request(app).get('/api/assignments');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([incident]);
    expect(findIncidents).toHaveBeenCalledWith(undefined);
  });

  it('should return 404 when incident does not exist', async () => {
    findIncidentById.mockResolvedValue(null);

    const res = await request(app).get('/api/assignments/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Incident not found');
  });

  it('should successfully retrieve available officers', async () => {
    const res = await request(app)
      .get('/api/assignments/officers/available');

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(2);
    expect(res.body[0].available).toBe(true);
    expect(findActiveSecurityOfficers).toHaveBeenCalledTimes(1);
  });

  it('should successfully assign an incident to an officer', async () => {
    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 2 });

    expect(res.status).toBe(200);
    expect(res.body.assigned_to).toBe(2);
    expect(res.body.status).toBe('Assigned');
    expect(findIncidentById).toHaveBeenCalledWith('1');
    expect(findUserById).toHaveBeenCalledWith(2);
    expect(findActiveIncidentForOfficer).toHaveBeenCalledWith(2, '1');
    expect(assignIncidentToOfficer).toHaveBeenCalledWith('1', 2);
    expect(recordAssignment).toHaveBeenCalledWith({
      incidentId: '1', assignedFrom: null, assignedTo: 2,
      assignedBy: 1, reason: undefined,
    });
  });

  it('should fail when no officer is selected', async () => {
    const res = await request(app)
      .put('/api/assignments/1/assign').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please select a Security Officer.');
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should fail when the officer is already assigned', async () => {
    findActiveIncidentForOfficer.mockResolvedValue({
      id: 10, report_id: 'RPT-20260825-0010', status: 'Assigned',
    });

    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('John Officer is already assigned');
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should fail when assigning a closed incident', async () => {
    findIncidentById.mockResolvedValue({ ...incident, status: 'Closed' });

    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Closed reports cannot be assigned or reassigned.',
    );
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should fail when the selected officer is invalid', async () => {
    findUserById.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 99 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Selected user is not an active Security Officer.',
    );
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should require a reason when reassigning an incident', async () => {
    findIncidentById.mockResolvedValue({
      ...incident, assigned_to: 3, status: 'Assigned',
    });

    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'A reason is required when reassigning a report.',
    );
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should successfully reassign an incident', async () => {
    findIncidentById.mockResolvedValue({
      ...incident, assigned_to: 3, status: 'Assigned',
    });

    assignIncidentToOfficer.mockResolvedValue({
      ...incident, assigned_to: 2, status: 'Assigned',
    });

    const res = await request(app)
      .put('/api/assignments/1/assign')
      .send({ officerId: 2, reason: 'Workload redistribution' });

    expect(res.status).toBe(200);
    expect(res.body.assigned_to).toBe(2);
    expect(recordAssignment).toHaveBeenCalledWith({
      incidentId: '1', assignedFrom: 3, assignedTo: 2, assignedBy: 1,
      reason: 'Workload redistribution',
    });
  });

  it('should fail when assigning to the current officer', async () => {
    findIncidentById.mockResolvedValue({
      ...incident, assigned_to: 2, status: 'Assigned',
    });

    const res = await request(app)
      .put('/api/assignments/1/assign')
      .send({ officerId: 2, reason: 'Changing assignment' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'This report is already assigned to that officer.',
    );
    expect(assignIncidentToOfficer).not.toHaveBeenCalled();
  });

  it('should successfully retrieve assignment history', async () => {
    const history = [{
      id: 1, incident_id: 1, assigned_from: null,
      assigned_to: 2, assigned_by: 1, reason: null,
    }];

    findAssignmentHistoryForIncident.mockResolvedValue(history);

    const res = await request(app)
      .get('/api/assignments/1/assignment-history');

    expect(res.status).toBe(200);
    expect(res.body.report).toEqual(incident);
    expect(res.body.history).toEqual(history);
    expect(findAssignmentHistoryForIncident).toHaveBeenCalledWith('1');
  });

  it('should return 500 when assignment fails unexpectedly', async () => {
    assignIncidentToOfficer.mockRejectedValue(new Error('Assignment failed'));

    const res = await request(app)
      .put('/api/assignments/1/assign').send({ officerId: 2 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
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