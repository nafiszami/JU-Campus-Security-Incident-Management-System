/**
 * Sprint 2 — GET /api/incidents
 * View & Filter Reports — Member 1 (Abdur Rob Mridha)
 *
 * Uses Incident model-level mock per SPRINT_2_MASTER_CONTEXT.md pattern.
 * Kept in a separate file to prevent Jest mock hoisting from interfering
 * with the Sprint 1 database-level mocks in incident.test.js.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// Mock the Incident model at module level (Jest hoists this to file top)
jest.mock('../models/Incident', () => ({
  Incident: {
    create: jest.fn(),
    generateReportId: jest.fn(),
    findByReportId: jest.fn(),
    findById: jest.fn(),
    findByReporter: jest.fn(),
    findAll: jest.fn(),
    findAllWithFilters: jest.fn(),
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

// Also mock the database to prevent real connection attempts in app startup
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { getConnection: jest.fn(), execute: jest.fn() },
}));

describe('GET /api/incidents - View & Filter Reports API', () => {
  // eslint-disable-next-line global-require
  const { Incident } = require('../models/Incident');

  /**
   * Generate a signed JWT for a given user payload.
   * @param {Object} payload - JWT claims.
   * @returns {string} Signed JWT.
   */
  const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret_key');

  const studentToken = makeToken({ id: 10, role: 'Student' });
  const officerToken = makeToken({
    id: 20,
    role: 'Security Officer',
    is_head_security_officer: false,
  });
  const headOfficerToken = makeToken({
    id: 30,
    role: 'Security Officer',
    is_head_security_officer: true,
  });
  const adminToken = makeToken({ id: 40, role: 'Admin' });

  /**
   * Build a minimal mock incident record.
   * @param {Object} overrides - Field overrides.
   * @returns {Object} Mock incident row.
   */
  const mockIncident = (overrides = {}) => ({
    id: 1,
    report_id: 'RPT-20260831-0001',
    reported_by: 10,
    assigned_to: 20,
    report_type: 'Theft',
    title: 'Stolen Bicycle',
    description: 'Bicycle stolen from dorm.',
    location: 'Dorm A',
    priority: 'High',
    status: 'Submitted',
    evidence_path: null,
    created_at: '2026-08-31T10:00:00.000Z',
    updated_at: '2026-08-31T10:00:00.000Z',
    ...overrides,
  });

  /**
   * Build a mock paginated response as returned by Incident.findAllWithFilters.
   * @param {Object[]} data - Array of incident rows.
   * @param {number} total - Total record count.
   * @param {number} page - Current page.
   * @param {number} limit - Page size.
   * @returns {{ data: Object[], total: number, page: number, limit: number }}
   */
  const mockPaginatedResult = (data = [mockIncident()], total = 1, page = 1, limit = 20) => ({
    data,
    total,
    page,
    limit,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Authentication guard
  // ---------------------------------------------------------------------------

  it('should return 401 when no authentication token is provided', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Role-based visibility — Student
  // ---------------------------------------------------------------------------

  it('should scope results to own reports for a Student', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident({ reported_by: 10 })])
    );

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ reportedBy: 10 })
    );
  });

  // ---------------------------------------------------------------------------
  // Role-based visibility — Security Officer (not head)
  // ---------------------------------------------------------------------------

  it('should scope results to assigned reports for a Security Officer', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident({ assigned_to: 20 })])
    );

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: 20 })
    );
  });

  // ---------------------------------------------------------------------------
  // Role-based visibility — Head Security Officer
  // ---------------------------------------------------------------------------

  it('should allow a Head Security Officer to see all reports without scoping', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident(), mockIncident({ id: 2, reported_by: 11 })])
    );

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${headOfficerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(Incident.findAllWithFilters).not.toHaveBeenCalledWith(
      expect.objectContaining({ reportedBy: expect.anything() })
    );
    expect(Incident.findAllWithFilters).not.toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: expect.anything() })
    );
  });

  // ---------------------------------------------------------------------------
  // Role-based visibility — Admin
  // ---------------------------------------------------------------------------

  it('should allow an Admin to see all reports without scoping', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident(), mockIncident({ id: 3, reported_by: 12 })])
    );

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(Incident.findAllWithFilters).not.toHaveBeenCalledWith(
      expect.objectContaining({ reportedBy: expect.anything() })
    );
    expect(Incident.findAllWithFilters).not.toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: expect.anything() })
    );
  });

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  it('should forward status filter to the model', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident({ status: 'Resolved' })])
    );

    const res = await request(app)
      .get('/api/incidents?status=Resolved')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Resolved' })
    );
  });

  it('should forward priority filter to the model', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident({ priority: 'High' })])
    );

    const res = await request(app)
      .get('/api/incidents?priority=High')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'High' })
    );
  });

  it('should forward report_type filter to the model as reportType', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(
      mockPaginatedResult([mockIncident({ report_type: 'Theft' })])
    );

    const res = await request(app)
      .get('/api/incidents?report_type=Theft')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ reportType: 'Theft' })
    );
  });

  it('should forward date_from and date_to filters to the model', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(mockPaginatedResult());

    const res = await request(app)
      .get('/api/incidents?date_from=2026-08-01&date_to=2026-08-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  it('should forward sort_by and sort_order to the model', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(mockPaginatedResult());

    const res = await request(app)
      .get('/api/incidents?sort_by=created_at&sort_order=asc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'created_at', sortOrder: 'asc' })
    );
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  it('should return correct pagination metadata from query params', async () => {
    Incident.findAllWithFilters.mockResolvedValueOnce(mockPaginatedResult([], 50, 2, 10));

    const res = await request(app)
      .get('/api/incidents?page=2&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({
      total: 50,
      page: 2,
      limit: 10,
    });
    expect(Incident.findAllWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 })
    );
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('should return 500 when findAllWithFilters throws an unexpected error', async () => {
    Incident.findAllWithFilters.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB failure');
  });
});
