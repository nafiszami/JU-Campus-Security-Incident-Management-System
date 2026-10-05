/**
 * @module tests/restricted
 * @description Integration tests for Restricted Visitor Management
 * (SRS 3.1.7, FR-7.1–FR-7.6). Uses Supertest to send real HTTP requests
 * through the Express app (server/app.js -> restrictedRoutes ->
 * restrictedController -> RestrictedVisitor/ExceptionRequest models) and
 * hits whatever MySQL database is configured via the DB_* environment
 * variables at test-run time (see server/jest.config.js and
 * .github/workflows/ci.yml for how CI points this at ju_csims_test).
 *
 * NOTE: while auth is still bypassed in restrictedRoutes.js (see the
 * TEMPORARY markers there), these requests are sent without an
 * Authorization header, since there is no real auth to satisfy yet.
 * Once auth is restored, these tests will need a valid token attached
 * (e.g. via a supertest .set('Authorization', ...) call) or they will
 * start failing with 401s — that's expected and should be fixed at
 * that point, not before.
 */

const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');

// Unique per test run so repeated `npm test` runs don't collide with
// leftover rows from a previous run that wasn't cleaned up.
const TEST_ID = `JEST-${Date.now()}`;
let createdRestrictionId;

describe('Restricted Visitor Management', () => {
  afterAll(async () => {
    // Clean up every row this test file created, regardless of which
    // assertions passed or failed, so re-running the suite stays reliable.
    await query('DELETE FROM restriction_exceptions WHERE restricted_visitor_id IN (SELECT id FROM restricted_visitors WHERE identity_number = ?)', [TEST_ID]);
    await query('DELETE FROM restricted_visitors WHERE identity_number = ?', [TEST_ID]);
  });

  describe('POST /api/restricted', () => {
    it('adds a new restricted visitor with valid data', async () => {
      // Arrange
      const payload = {
        identity_number: TEST_ID,
        name: 'Jest Test Person',
        reason: 'Automated test entry',
        restriction_type: 'Permanent',
        start_date: '2026-01-01',
      };

      // Act
      const res = await request(app).post('/api/restricted').send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.identity_number).toBe(TEST_ID);
      expect(res.body.restriction_type).toBe('Permanent');

      createdRestrictionId = res.body.id;
    });

    it('rejects a submission missing required fields', async () => {
      // Arrange: no reason, restriction_type, or start_date
      const payload = { identity_number: 'JEST-INCOMPLETE', name: 'Missing Fields' };

      // Act
      const res = await request(app).post('/api/restricted').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects a duplicate active restriction for the same identity number', async () => {
      // Arrange: TEST_ID was already added and is still active from the first test above
      const payload = {
        identity_number: TEST_ID,
        name: 'Jest Test Person (duplicate attempt)',
        reason: 'Should be rejected',
        restriction_type: 'Permanent',
        start_date: '2026-01-01',
      };

      // Act
      const res = await request(app).post('/api/restricted').send(payload);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects a temporary restriction that is missing an end date', async () => {
      // Arrange
      const payload = {
        identity_number: 'JEST-NO-END-DATE',
        name: 'No End Date',
        reason: 'Testing temporary without end date',
        restriction_type: 'Temporary',
        start_date: '2026-01-01',
        // end_date intentionally omitted
      };

      // Act
      const res = await request(app).post('/api/restricted').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/end date/i);
    });
  });

  describe('GET /api/restricted/check/:identity_number', () => {
    it('reports restricted: true for a currently active restriction', async () => {
      // Act
      const res = await request(app).get(`/api/restricted/check/${TEST_ID}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.restricted).toBe(true);
      expect(res.body).toHaveProperty('reason');
    });

    it('reports restricted: false for an identity number that was never added', async () => {
      // Act
      const res = await request(app).get('/api/restricted/check/NEVER-ADDED-ID');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.restricted).toBe(false);
    });
  });

  describe('Exception request workflow', () => {
    let exceptionId;

    it('creates an exception request against the restricted visitor', async () => {
      // Arrange
      const payload = {
        restricted_visitor_id: createdRestrictionId,
        request_date_time: '2026-09-01 10:00:00',
        purpose: 'Automated test exception',
        host_authority: 'Test Authority',
      };

      // Act
      const res = await request(app).post('/api/restricted/exception').send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('Pending');

      exceptionId = res.body.id;
    });

    it('approves the pending exception request', async () => {
      // Act
      const res = await request(app)
        .put(`/api/restricted/exception/${exceptionId}`)
        .send({ status: 'Approved' });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Approved');
    });

    it('rejects updating an exception request that is already processed', async () => {
      // Act: try to approve/reject the same request again
      const res = await request(app)
        .put(`/api/restricted/exception/${exceptionId}`)
        .send({ status: 'Rejected' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});