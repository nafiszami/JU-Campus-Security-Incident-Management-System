const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const { query } = require('../config/database');

jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: {
    getConnection: jest.fn(),
    execute: jest.fn(),
  },
}));

// =============================================================================
// Sprint 1 — POST /api/incidents (Submit Reports — Member 1 ARM)
// =============================================================================

describe('POST /api/incidents - Submit Reports API', () => {
  let token;
  const mockUser = { id: 1, role: 'Student' };
  const tempFilePath = path.join(__dirname, 'test-evidence.png');

  beforeAll(() => {
    token = jwt.sign(mockUser, process.env.JWT_SECRET || 'jwt_secret_key');
    fs.writeFileSync(tempFilePath, 'fake image data content');
  });

  afterAll(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully submit an incident report without evidence', async () => {
    query.mockResolvedValueOnce([]); // Mock generateReportId query
    query.mockResolvedValueOnce([{ insertId: 1 }]); // Mock insert query
    const mockCreatedIncident = {
      id: 1,
      report_id: 'RPT-20260825-0001',
      reported_by: 1,
      report_type: 'Theft',
      title: 'Stolen Bicycle',
      description: 'My bicycle was stolen from the dorm rack.',
      location: 'Dorm Rack A',
      priority: 'High',
      status: 'Submitted',
      evidence_path: null,
    };
    query.mockResolvedValueOnce([mockCreatedIncident]); // Mock findByReportId query

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reportType: 'Theft',
        title: 'Stolen Bicycle',
        description: 'My bicycle was stolen from the dorm rack.',
        location: 'Dorm Rack A',
        priority: 'High',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report_id).toBe('RPT-20260825-0001');
    expect(res.body.data.reported_by).toBe(1);
    expect(res.body.data.status).toBe('Submitted');
  });

  it('should successfully submit an incident report with evidence file attachment', async () => {
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([{ insertId: 2 }]);
    const mockCreatedWithEvidence = {
      id: 2,
      report_id: 'RPT-20260825-0002',
      reported_by: 1,
      report_type: 'Harassment',
      title: 'Harassment at Main Gate',
      description: 'Verbal harassment occurred near the main gate.',
      location: 'Main Gate',
      priority: 'Medium',
      status: 'Submitted',
      evidence_path: 'uploads/evidence-123.png',
    };
    query.mockResolvedValueOnce([mockCreatedWithEvidence]);

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('reportType', 'Harassment')
      .field('title', 'Harassment at Main Gate')
      .field('description', 'Verbal harassment occurred near the main gate.')
      .field('location', 'Main Gate')
      .field('priority', 'Medium')
      .attach('evidence', tempFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report_id).toBe('RPT-20260825-0002');
  });

  it('should fail with 401 if authentication token is missing', async () => {
    const res = await request(app).post('/api/incidents').send({
      reportType: 'Theft',
      title: 'Stolen Bicycle',
      description: 'My bicycle was stolen.',
      location: 'Dorm Rack A',
      priority: 'High',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Not authorized, no token');
  });

  it('should fail with 401 if authentication token is invalid', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', 'Bearer invalid_token_123')
      .send({
        reportType: 'Theft',
        title: 'Stolen Bicycle',
        description: 'My bicycle was stolen.',
        location: 'Dorm Rack A',
        priority: 'High',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Not authorized, token failed');
  });

  it('should fail with 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Stolen Bicycle',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should fail with 400 if reportType is invalid', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reportType: 'InvalidType',
        title: 'Stolen Bicycle',
        description: 'My bicycle was stolen.',
        location: 'Dorm Rack A',
        priority: 'High',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid report type');
  });

  it('should fail with 400 if priority is invalid', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reportType: 'Theft',
        title: 'Stolen Bicycle',
        description: 'My bicycle was stolen.',
        location: 'Dorm Rack A',
        priority: 'Urgent',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid priority');
  });

  it('should fail with 400 if unsupported file extension is uploaded', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .attach('evidence', Buffer.from('plain text'), 'test-file.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only JPG, PNG, and PDF');
  });

  it('should return 500 when database throws an unexpected error', async () => {
    query.mockRejectedValueOnce(new Error('Database connection lost'));

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reportType: 'Theft',
        title: 'Stolen Bicycle',
        description: 'My bicycle was stolen.',
        location: 'Dorm Rack A',
        priority: 'High',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Database connection lost');
  });
});
