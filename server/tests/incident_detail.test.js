/**
 * Sprint 2 — Day 2 Tests
 * Individual Report View (RBAC), CSV Export, and Status History Timeline
 * Member 1 (Abdur Rob Mridha - ARM)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// Mock the Incident model at module level
jest.mock('../models/Incident', () => ({
  Incident: {
    create: jest.fn(),
    generateReportId: jest.fn(),
    findByReportId: jest.fn(),
    findById: jest.fn(),
    findByReporter: jest.fn(),
    findAll: jest.fn(),
    findAllWithFilters: jest.fn(),
    getTimeline: jest.fn(),
  },
  REPORT_TYPES: [
    'Theft',
    'Harassment',
    'Suspicious Activity',
    'Vandalism',
    'Accident',
    'Gate Violation',
    'Unauthorized Entry',
    'Investigation Report',
  ],
  PRIORITIES: ['High', 'Medium', 'Low'],
  STATUSES: [
    'Submitted',
    'Assigned',
    'Under Investigation',
    'Resolved',
    'Closed',
    'Revision Required',
    'Deleted',
  ],
}));

// Mock database query to prevent database calls during test initialization
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { getConnection: jest.fn(), execute: jest.fn() },
}));

describe('Sprint 2 — Day 2: Incident Details, CSV Export, and Timeline', () => {
  // eslint-disable-next-line global-require
  const { Incident } = require('../models/Incident');

  const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret_key');

  const studentToken = makeToken({ id: 10, role: 'Student' });
  const otherStudentToken = makeToken({ id: 11, role: 'Student' });
  const officerToken = makeToken({
    id: 20,
    role: 'Security Officer',
    is_head_security_officer: false,
  });
  const otherOfficerToken = makeToken({
    id: 21,
    role: 'Security Officer',
    is_head_security_officer: false,
  });
  const headOfficerToken = makeToken({
    id: 30,
    role: 'Security Officer',
    is_head_security_officer: true,
  });
  const adminToken = makeToken({ id: 40, role: 'Admin' });
  const gateOperatorToken = makeToken({ id: 50, role: 'Gate Operator' });

  const mockIncidentData = (overrides = {}) => ({
    id: 1,
    report_id: 'RPT-20260901-0001',
    reported_by: 10,
    reporter_name: 'Student User',
    reporter_email: 'student@juniv.edu',
    assigned_to: 20,
    assigned_officer_name: 'Officer User',
    report_type: 'Theft',
    title: 'Stolen Bicycle',
    description: 'Bicycle stolen from dorm area.',
    location: 'Dorm Rack A',
    priority: 'High',
    status: 'Assigned',
    evidence_path: 'uploads/evidence.png',
    investigation_notes: 'Investigation in progress',
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T09:00:00.000Z',
    ...overrides,
  });

  const mockTimelineData = () => [
    {
      id: 1,
      incident_id: 1,
      changed_by: 10,
      changed_by_name: 'Student User',
      changed_by_role: 'Student',
      old_status: null,
      new_status: 'Submitted',
      notes: 'Initial submission',
      changed_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 2,
      incident_id: 1,
      changed_by: 30,
      changed_by_name: 'Head Officer',
      changed_by_role: 'Security Officer',
      old_status: 'Submitted',
      new_status: 'Assigned',
      notes: 'Assigned to Officer User',
      changed_at: '2026-09-01T09:00:00.000Z',
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. GET /api/incidents/:id (Report Details with RBAC)
  // ===========================================================================
  describe('GET /api/incidents/:id - Individual Report Details', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/incidents/1');
      expect(res.status).toBe(401);
    });

    it('should return 404 when the incident report does not exist', async () => {
      Incident.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/incidents/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should allow a Student to access their own incident report', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ reported_by: 10 }));

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.reported_by).toBe(10);
    });

    it('should reject a Student from accessing another student report with 403', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ reported_by: 10 }));

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should allow an assigned Security Officer to access the report', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ assigned_to: 20 }));

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assigned_to).toBe(20);
    });

    it('should reject an unassigned Security Officer with 403', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ assigned_to: 20 }));

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${otherOfficerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should allow Head Security Officer to access any report regardless of assignment', async () => {
      Incident.findById.mockResolvedValueOnce(
        mockIncidentData({ reported_by: 10, assigned_to: 20 })
      );

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${headOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it('should allow Admin to access any report', async () => {
      Incident.findById.mockResolvedValueOnce(
        mockIncidentData({ reported_by: 10, assigned_to: 20 })
      );

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it('should reject unauthorized roles with 403', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData());

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${gateOperatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should return 500 if database query fails', async () => {
      Incident.findById.mockRejectedValueOnce(new Error('Database query failed'));

      const res = await request(app)
        .get('/api/incidents/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database query failed');
    });
  });

  // ===========================================================================
  // 2. GET /api/incidents/export (CSV Export)
  // ===========================================================================
  describe('GET /api/incidents/export - CSV Export', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/incidents/export');
      expect(res.status).toBe(401);
    });

    it('should return 403 when Student attempts to export reports', async () => {
      const res = await request(app)
        .get('/api/incidents/export')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should successfully export CSV for Admin with all headers and escaped fields', async () => {
      const mockList = [
        mockIncidentData({
          report_id: 'RPT-20260901-0001',
          title: 'Stolen "Bicycle", Red',
          description: 'Special description',
        }),
      ];
      Incident.findAllWithFilters.mockResolvedValueOnce({
        data: mockList,
        total: 1,
        page: 1,
        limit: 10000,
      });

      const res = await request(app)
        .get('/api/incidents/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain(
        'Report ID,Title,Report Type,Priority,Status,Reported By,Assigned To,Location,Created At'
      );
      expect(res.text).toContain('RPT-20260901-0001');
      expect(res.text).toContain('"Stolen ""Bicycle"", Red"');
    });

    it('should scope CSV export to assigned reports for a regular Security Officer', async () => {
      Incident.findAllWithFilters.mockResolvedValueOnce({
        data: [mockIncidentData({ assigned_to: 20 })],
        total: 1,
        page: 1,
        limit: 10000,
      });

      const res = await request(app)
        .get('/api/incidents/export?status=Assigned')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: 20,
          status: 'Assigned',
        })
      );
    });

    it('should forward query filters (date range, type, priority) during export', async () => {
      Incident.findAllWithFilters.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
      });

      const res = await request(app)
        .get(
          '/api/incidents/export?date_from=2026-09-01&date_to=2026-09-02&report_type=Theft&priority=High'
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-09-01',
          dateTo: '2026-09-02',
          reportType: 'Theft',
          priority: 'High',
        })
      );
    });

    it('should return 500 if CSV export query fails', async () => {
      Incident.findAllWithFilters.mockRejectedValueOnce(new Error('Export query error'));

      const res = await request(app)
        .get('/api/incidents/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Export query error');
    });
  });

  // ===========================================================================
  // 3. GET /api/incidents/:id/timeline (Status History Timeline)
  // ===========================================================================
  describe('GET /api/incidents/:id/timeline - Status History Timeline', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/incidents/1/timeline');
      expect(res.status).toBe(401);
    });

    it('should return 404 if the incident does not exist', async () => {
      Incident.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/incidents/999/timeline')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should allow a Student to access timeline for their own report', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ reported_by: 10 }));
      Incident.getTimeline.mockResolvedValueOnce(mockTimelineData());

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].new_status).toBe('Submitted');
      expect(Incident.getTimeline).toHaveBeenCalledWith(1);
    });

    it('should reject a Student from accessing timeline of another student report with 403', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ reported_by: 10 }));

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
      expect(Incident.getTimeline).not.toHaveBeenCalled();
    });

    it('should allow an assigned Officer to access timeline', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ assigned_to: 20 }));
      Incident.getTimeline.mockResolvedValueOnce(mockTimelineData());

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should reject an unassigned Officer from accessing timeline with 403', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData({ assigned_to: 20 }));

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${otherOfficerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should allow Head Security Officer and Admin to access timeline of any report', async () => {
      Incident.findById.mockResolvedValueOnce(
        mockIncidentData({ reported_by: 10, assigned_to: 20 })
      );
      Incident.getTimeline.mockResolvedValueOnce(mockTimelineData());

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${headOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return 500 if getTimeline fails', async () => {
      Incident.findById.mockResolvedValueOnce(mockIncidentData());
      Incident.getTimeline.mockRejectedValueOnce(new Error('Timeline query failed'));

      const res = await request(app)
        .get('/api/incidents/1/timeline')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Timeline query failed');
    });
  });
});
