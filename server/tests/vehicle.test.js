/**
 * @module tests/vehicle
 * @description Integration and unit tests for Vehicle Entry and Exit Management
 * (SRS Feature 8, FR-8.1 - FR-8.10).
 * Tests all vehicle entry registration, exit recording, restriction checks,
 * active vehicle tracking, and movement history querying with RBAC.
 */

require('dotenv').config();

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { query } = require('../config/database');

const TEST_PLATE_PREFIX = `TEST-${Date.now().toString().slice(-6)}`;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

describe('Vehicle Entry and Exit API (Sprint 2 - AA)', () => {
  let gateOperatorToken;
  let securityOfficerToken;
  let studentToken;
  let createdVehicleId;
  const testPlate1 = `${TEST_PLATE_PREFIX}-A1`;
  const testPlate2 = `${TEST_PLATE_PREFIX}-EMERGENCY`;
  const testRestrictedPlate = `${TEST_PLATE_PREFIX}-BLACK`;

  beforeAll(async () => {
    // Generate valid tokens for role-based authorization tests
    gateOperatorToken = jwt.sign(
      { id: 3, role: 'Gate Operator', name: 'Gate Operator Test', assigned_gate: 'Main Gate' },
      JWT_SECRET
    );
    securityOfficerToken = jwt.sign(
      { id: 2, role: 'Security Officer', name: 'Officer Test' },
      JWT_SECRET
    );
    studentToken = jwt.sign(
      { id: 5, role: 'Student', name: 'Student Test' },
      JWT_SECRET
    );

    // Pre-insert a restricted vehicle for blacklisting test (FR-8.8)
    await query(
      `INSERT INTO restricted_vehicles (plate_number, reason, restriction_type, added_by, is_active)
       VALUES (?, ?, 'Permanent', 2, TRUE)`,
      [testRestrictedPlate, 'Security threat vehicle']
    );
  });

  afterAll(async () => {
    // Clean up created records
    await query('DELETE FROM vehicle_entries WHERE plate_number LIKE ?', [`${TEST_PLATE_PREFIX}%`]);
    await query('DELETE FROM restricted_vehicles WHERE plate_number LIKE ?', [`${TEST_PLATE_PREFIX}%`]);
    await query('DELETE FROM audit_logs WHERE description LIKE ?', [`%${TEST_PLATE_PREFIX}%`]);
  });

  // ==========================================
  // 1. RBAC & AUTHENTICATION TESTS
  // ==========================================
  describe('RBAC & Authentication Guards', () => {
    it('rejects unauthenticated request to vehicle endpoints with 401', async () => {
      const res = await request(app).get('/api/vehicles/active');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects unauthorized roles (Student) with 403', async () => {
      const res = await request(app)
        .get('/api/vehicles/active')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/denied|insufficient/i);
    });

    it('allows Gate Operator access to vehicle endpoints', async () => {
      const res = await request(app)
        .get('/api/vehicles/active')
        .set('Authorization', `Bearer ${gateOperatorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ==========================================
  // 2. VEHICLE ENTRY REGISTRATION (FR-8.1, FR-8.2, FR-8.3, FR-8.4, FR-8.5)
  // ==========================================
  describe('POST /api/vehicles/entry - Vehicle Entry Registration', () => {
    it('registers a visitor vehicle entry successfully (FR-8.1, FR-8.3, FR-8.9)', async () => {
      const payload = {
        plate_number: testPlate1,
        vehicle_type: 'Car',
        category: 'Visitor',
        driver_name: 'Karim Uddin',
        driver_phone: '01711223344',
        driver_identity: 'NID-99887766',
        purpose: 'Meeting with Registrar',
        host_or_destination: 'Registrar Building',
        entry_gate: 'Main Gate',
      };

      const res = await request(app)
        .post('/api/vehicles/entry')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('vehicle');
      expect(res.body.vehicle.plate_number).toBe(testPlate1);
      expect(res.body.vehicle.status).toBe('Inside');
      expect(res.body.vehicle).toHaveProperty('pass_number');
      expect(res.body.vehicle.pass_number).toMatch(/^VP-/);
      expect(res.body.vehicle.entry_gate).toBe('Main Gate');

      createdVehicleId = res.body.vehicle.id;
    });

    it('rejects vehicle entry missing required fields (plate or driver name)', async () => {
      const payload = {
        vehicle_type: 'Car',
        // plate_number missing
        driver_name: 'Incomplete Driver',
      };

      const res = await request(app)
        .post('/api/vehicles/entry')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects duplicate entry for a vehicle already recorded as Inside', async () => {
      const payload = {
        plate_number: testPlate1, // already inside from previous test
        vehicle_type: 'Car',
        category: 'Visitor',
        driver_name: 'Duplicate Attempt',
        driver_phone: '01711000000',
      };

      const res = await request(app)
        .post('/api/vehicles/entry')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already inside/i);
    });

    it('registers emergency vehicle with priority flag (FR-8.10)', async () => {
      const payload = {
        plate_number: testPlate2,
        vehicle_type: 'Emergency',
        category: 'Emergency',
        driver_name: 'Ambulance Driver',
        driver_phone: '01911998877',
        purpose: 'Medical Emergency',
        host_or_destination: 'Medical Centre',
        is_emergency: true,
      };

      const res = await request(app)
        .post('/api/vehicles/entry')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.vehicle.is_emergency).toBeTruthy();
      expect(res.body.vehicle.status).toBe('Inside');
    });
  });

  // ==========================================
  // 3. RESTRICTED & BLACKLISTED VEHICLES (FR-8.8)
  // ==========================================
  describe('Restricted / Blacklisted Vehicle Handling (FR-8.8)', () => {
    it('checks restricted vehicle status via API', async () => {
      const res = await request(app)
        .get(`/api/vehicles/check-restricted/${testRestrictedPlate}`)
        .set('Authorization', `Bearer ${gateOperatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restricted).toBe(true);
      expect(res.body).toHaveProperty('reason');
    });

    it('blocks entry of blacklisted vehicle with 403 and creates audit log (FR-8.8)', async () => {
      const payload = {
        plate_number: testRestrictedPlate,
        vehicle_type: 'Car',
        category: 'Visitor',
        driver_name: 'Suspicious Driver',
        driver_phone: '01811223344',
      };

      const res = await request(app)
        .post('/api/vehicles/entry')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/restricted|blacklisted/i);

      // Verify audit log entry
      const audit = await query(
        'SELECT * FROM audit_logs WHERE action = ? AND description LIKE ?',
        ['RESTRICTED_VEHICLE_ENTRY_ATTEMPT', `%${testRestrictedPlate}%`]
      );
      expect(audit.length).toBeGreaterThan(0);
    });

    it('allows Security Officer to add a vehicle to the restricted list', async () => {
      const newRestrictedPlate = `${TEST_PLATE_PREFIX}-NEWRESTRICT`;
      const res = await request(app)
        .post('/api/vehicles/restricted')
        .set('Authorization', `Bearer ${securityOfficerToken}`)
        .send({
          plate_number: newRestrictedPlate,
          reason: 'Violated campus speed regulations',
          restriction_type: 'Temporary',
        });

      expect(res.status).toBe(201);
      expect(res.body.restrictedVehicle.plate_number).toBe(newRestrictedPlate);
    });
  });

  // ==========================================
  // 4. VEHICLE EXIT RECORDING (FR-8.6)
  // ==========================================
  describe('PUT /api/vehicles/:id/exit - Vehicle Exit Recording', () => {
    it('records vehicle exit, computes duration and updates status (FR-8.6)', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${createdVehicleId}/exit`)
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send({ exit_gate: 'Science Faculty Gate', remarks: 'Normal departure' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vehicle');
      expect(res.body.vehicle.status).toBe('Exited');
      expect(res.body.vehicle.exit_gate).toBe('Science Faculty Gate');
      expect(res.body.vehicle.exit_time).not.toBeNull();
      expect(typeof res.body.vehicle.duration_minutes).toBe('number');
    });

    it('rejects exit for a vehicle that has already exited', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${createdVehicleId}/exit`)
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send({ exit_gate: 'Main Gate' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not inside|already exited/i);
    });

    it('returns 404 when attempting to exit a non-existent vehicle ID', async () => {
      const res = await request(app)
        .put('/api/vehicles/999999/exit')
        .set('Authorization', `Bearer ${gateOperatorToken}`)
        .send({ exit_gate: 'Main Gate' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ==========================================
  // 5. VEHICLE MONITORING & HISTORY (FR-8.7)
  // ==========================================
  describe('Vehicle Tracking & Movement History (FR-8.7)', () => {
    it('returns list of vehicles currently inside campus', async () => {
      const res = await request(app)
        .get('/api/vehicles/active')
        .set('Authorization', `Bearer ${gateOperatorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Emergency vehicle should still be inside
      const found = res.body.find((v) => v.plate_number === testPlate2);
      expect(found).toBeDefined();
      expect(found.status).toBe('Inside');
    });

    it('returns vehicle movement history with filters', async () => {
      const res = await request(app)
        .get('/api/vehicles/history')
        .query({ search: TEST_PLATE_PREFIX })
        .set('Authorization', `Bearer ${securityOfficerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('fetches specific vehicle entry details by database ID', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${createdVehicleId}`)
        .set('Authorization', `Bearer ${gateOperatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdVehicleId);
      expect(res.body.plate_number).toBe(testPlate1);
      expect(res.body).toHaveProperty('entered_by_name');
    });
  });
});
