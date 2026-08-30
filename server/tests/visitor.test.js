require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'random';
}

const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

describe('Visitor API Tests (Sprint 1 & 2)', () => {
  // Authentication tokens
  let gateOperatorAuthToken;
  let securityOfficerAuthToken;
  let studentAuthToken;

  // Test User IDs for cleanup
  let gateOperatorUserId;
  let securityOfficerUserId;
  let studentUserId;

  // Test Visitor IDs
  let createdParentVisitorId;

  const getUniqueId = () => Math.random().toString(36).substring(2, 10);
  const getUniquePhone = () => `017${Math.floor(10000000 + Math.random() * 90000000)}`;

  // =============================================
  // SETUP & CLEANUP
  // =============================================
  beforeAll(async () => {
    const gateEmail = `gate.${getUniqueId()}@juniv.edu`;
    const officerEmail = `officer.${getUniqueId()}@juniv.edu`;
    const studentEmail = `student.${getUniqueId()}@juniv.edu`;

    const hashedPassword = await bcrypt.hash('Password123', 10);

    const gateRes = await query(
      `INSERT INTO users (name, email, password_hash, role, assigned_gate) VALUES (?, ?, ?, ?, ?)`,
      ['Gate Operator Test', gateEmail, hashedPassword, 'Gate Operator', 'Main Gate']
    );
    gateOperatorUserId = gateRes.insertId;

    const officerRes = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['Security Officer Test', officerEmail, hashedPassword, 'Security Officer']
    );
    securityOfficerUserId = officerRes.insertId;

    const studentRes = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['Student Test', studentEmail, hashedPassword, 'Student']
    );
    studentUserId = studentRes.insertId;

    gateOperatorAuthToken = (await request(app).post('/api/auth/login').send({ email: gateEmail, password: 'Password123' })).body.token;
    securityOfficerAuthToken = (await request(app).post('/api/auth/login').send({ email: officerEmail, password: 'Password123' })).body.token;
    studentAuthToken = (await request(app).post('/api/auth/login').send({ email: studentEmail, password: 'Password123' })).body.token;
  });

  afterAll(async () => {
    const userIds = [gateOperatorUserId, securityOfficerUserId, studentUserId].filter(Boolean);
    if (userIds.length === 0) return;

    try {
      await query('SET FOREIGN_KEY_CHECKS = 0');
      await query(`DELETE FROM audit_logs WHERE user_id IN (?, ?, ?)`, userIds);
      await query(`
        DELETE FROM visitors 
        WHERE registered_by IN (?, ?, ?) 
           OR entered_by IN (?, ?, ?) 
           OR exited_by IN (?, ?, ?)
      `, [...userIds, ...userIds, ...userIds]);
      await query(`DELETE FROM restricted_visitors WHERE added_by IN (?, ?, ?)`, userIds);
      await query(`DELETE FROM users WHERE id IN (?, ?, ?)`, userIds);
    } finally {
      await query('SET FOREIGN_KEY_CHECKS = 1');
    }
  });

  // ============================================
  // SPRINT 1: Register Visitor Tests
  // ============================================
  describe('Sprint 1: Register Visitor & Retrieval', () => {
    
    test('1. should register a valid Guardian/Parent visitor', async () => {
      const uniqueSuffix = getUniqueId();
      const parentVisitorData = {
        category: 'Guardian/Parent',
        name: `Md. Abdur Rahman ${uniqueSuffix}`,
        identity_number: `1987654321${uniqueSuffix}`,
        phone: getUniquePhone(),
        student_name: `Sadia Rahman ${uniqueSuffix}`,
        student_hall: 'BRH',
        purpose: 'Visit daughter',
        host_name: `Sadia Rahman ${uniqueSuffix}`,
        host_department: 'CSE',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(parentVisitorData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('visitor');
      expect(response.body.visitor.status).toBe('Registered');
      
      createdParentVisitorId = response.body.visitor.id;
    });

    test('2. should register a valid Guest Visitor', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: `Prof. Dr. Kamal Hossain ${uniqueSuffix}`,
          identity_number: `8765432109${uniqueSuffix}`,
          phone: getUniquePhone(),
          host_name: `Dr. Shahidul Islam ${uniqueSuffix}`,
          host_department: 'Physics',
          purpose: 'Research collaboration meeting',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Guest Visitor');
    });

    test('3. should register a valid Alumni visitor', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Alumni',
          name: `Md. Kamruzzaman ${uniqueSuffix}`,
          identity_number: `7654321098${uniqueSuffix}`,
          phone: getUniquePhone(),
          host_name: `Prof. Dr. A.K.M. Azad ${uniqueSuffix}`,
          host_department: 'CSE',
          purpose: 'Alumni reunion 2025',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Alumni');
    });

    test('4. should register a valid Event Participant', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Event Participant',
          name: `Nadia Sultana ${uniqueSuffix}`,
          identity_number: `6543210987${uniqueSuffix}`,
          phone: getUniquePhone(),
          event_name: `International Conference on AI ${uniqueSuffix}`,
          event_pass: `AI-2025-${uniqueSuffix}`,
          host_name: 'Conference Organizer',
          host_department: 'CSE',
          purpose: 'Present research paper',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Event Participant');
    });

    test('5. should register a valid Delivery Personnel', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Delivery Personnel',
          name: `Md. Shohag Ali ${uniqueSuffix}`,
          identity_number: `5432109876${uniqueSuffix}`,
          phone: getUniquePhone(),
          company_name: `Pathao Food Delivery ${uniqueSuffix}`,
          vehicle_plate: `DHA-${uniqueSuffix}`,
          host_name: 'CSE Department',
          host_department: 'CSE',
          purpose: 'Food delivery for department event',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Delivery Personnel');
    });

    test('6. should register a valid Construction Worker', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Construction Worker',
          name: `Md. Alamgir Hossain ${uniqueSuffix}`,
          identity_number: `4321098765${uniqueSuffix}`,
          phone: getUniquePhone(),
          project_code: `PROJ-CSE-2025-${uniqueSuffix}`,
          work_site: 'New CSE Building Construction Site',
          company_name: `Mir Akhter Construction Ltd ${uniqueSuffix}`,
          host_name: 'Project Manager, CSE Dept',
          host_department: 'Engineering',
          purpose: 'Building construction work',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Construction Worker');
    });

    test('7. should register a valid Contractor', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Contractor',
          name: `Engr. Muhammad Kamal ${uniqueSuffix}`,
          identity_number: `3210987654${uniqueSuffix}`,
          phone: getUniquePhone(),
          company_name: `Spectra Engineering Ltd ${uniqueSuffix}`,
          project_code: `PROJ-ADMIN-2025-${uniqueSuffix}`,
          work_site: 'Admin Building',
          host_name: 'Procurement Office',
          host_department: 'Administration',
          purpose: 'Electrical work installation',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Contractor');
    });

    test('8. should register a valid Local Resident', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Local Resident',
          name: `Mrs. Shamsun Nahar ${uniqueSuffix}`,
          identity_number: `2109876543${uniqueSuffix}`,
          phone: getUniquePhone(),
          purpose: 'Passing through campus to reach home',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Local Resident');
    });

    test('9. should register a valid Vendor/Shop Owner', async () => {
      const uniqueSuffix = getUniqueId();
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Vendor/Shop Owner',
          name: `Md. Abdus Salam ${uniqueSuffix}`,
          identity_number: `1098765432${uniqueSuffix}`,
          phone: getUniquePhone(),
          company_name: `JU Campus Book Store ${uniqueSuffix}`,
          purpose: 'Daily shop business',
        });

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Vendor/Shop Owner');
    });

    test('10. should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Invalid Category Name',
          name: 'Test User',
          identity_number: `1111111111${getUniqueId()}`,
          phone: getUniquePhone(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid visitor category');
    });

    test('11. should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({ category: 'Guest Visitor' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/required/i);
    });

    test('12. should reject Guardian/Parent without student name', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guardian/Parent',
          name: 'Md. Abdur Rahman',
          identity_number: `1987654321${getUniqueId()}`,
          phone: getUniquePhone(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Student name is required for Guardian/Parent');
    });

    test('13. should reject Construction Worker without project code', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Construction Worker',
          name: 'Md. Alamgir Hossain',
          identity_number: `4321098765${getUniqueId()}`,
          phone: getUniquePhone(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project code is required for Construction Worker');
    });

    test('14. should reject Contractor without company name', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Contractor',
          name: 'Engr. Muhammad Kamal',
          identity_number: `3210987654${getUniqueId()}`,
          phone: getUniquePhone(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Company name is required for Contractor');
    });

    test('15. should block restricted visitor', async () => {
      const restrictedNid = `9999999999${getUniqueId()}`;
      const restrictedPersonName = `Kazi Ashraf Uddin ${getUniqueId()}`;

      await request(app)
        .post('/api/restricted')
        .set('Authorization', `Bearer ${securityOfficerAuthToken}`)
        .send({
          identity_number: restrictedNid,
          name: restrictedPersonName,
          reason: 'Security violation - Campus ban',
          restriction_type: 'Permanent',
          start_date: '2025-01-01',
        });

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: restrictedPersonName,
          identity_number: restrictedNid,
          phone: getUniquePhone(),
          host_name: 'Test Host',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('This visitor is restricted from entering campus');
    });

    test('16. should reject duplicate active registration', async () => {
      const duplicateNid = `8888888888${getUniqueId()}`;

      await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: `Md. Zahidul Islam`,
          identity_number: duplicateNid,
          phone: getUniquePhone(),
          host_name: 'Dr. A.K.M. Azad',
        });

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: `Md. Zahidul Islam`,
          identity_number: duplicateNid,
          phone: getUniquePhone(),
          host_name: 'Dr. Shahidul Islam',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Visitor already has an active registration');
    });

    test('17. should reject unauthorized access - Student', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${studentAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: 'Unauthorized User',
          identity_number: `7777777777${getUniqueId()}`,
          phone: getUniquePhone(),
          host_name: 'Test Host',
        });

      expect(response.status).toBe(403);
    });

    test('18. should search visitors by name', async () => {
      // Create a specific user to search for
      const searchName = `SearchTarget ${getUniqueId()}`;
      await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: searchName,
          identity_number: `SRCH${getUniqueId()}`,
          phone: getUniquePhone(),
          host_name: 'Dr. Target',
        });

      const response = await request(app)
        .get('/api/visitors/search')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .query({ q: searchName });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe(searchName);
    });

    test('19. should get visitor by ID', async () => {
      const response = await request(app)
        .get(`/api/visitors/${createdParentVisitorId}`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', createdParentVisitorId);
    });
  });

  // ============================================
  // SPRINT 2: Campus Entry & Exit Management Tests
  // ============================================
  describe('Sprint 2: Entry & Exit', () => {
    let lifecycleVisitorId;

    beforeAll(async () => {
      // Create a live visitor in the database specifically for entry/exit tests
      const createRes = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: 'Entry Lifecycle Test',
          identity_number: `ENTRY${getUniqueId()}`,
          phone: getUniquePhone(),
          host_name: 'Dr. Labib',
        });
      
      if (createRes.status === 201) {
        lifecycleVisitorId = createRes.body.visitor.id;
      }
    });

    test('20. should process visitor entry and set status to Inside', async () => {
      const res = await request(app)
        .put(`/api/visitors/${lifecycleVisitorId}/entry`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.visitor.status).toBe('Inside');
      expect(res.body.visitor.entry_gate).toBe('Main Gate');
    });

    test('21. should reject entry if visitor is already Inside', async () => {
      const res = await request(app)
        .put(`/api/visitors/${lifecycleVisitorId}/entry`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Visitor already inside campus');
    });

    test('22. should block entry if pass has expired', async () => {
      const createRes = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({ category: 'Guest Visitor', name: 'Expired User', identity_number: `EXP${getUniqueId()}`, phone: getUniquePhone(), host_name: 'Test Host' });
      
      const expiredId = createRes.body.visitor.id;

      await query(`UPDATE visitors SET pass_valid_until = '2020-01-01 00:00:00' WHERE id = ?`, [expiredId]);

      const res = await request(app)
        .put(`/api/visitors/${expiredId}/entry`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Visitor pass has expired');
    });

    test('23. should block a restricted visitor from entering', async () => {
      const restrictIdentity = `SNEAKY${getUniqueId()}`;
      
      const createRes = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({ category: 'Guest Visitor', name: 'Sneaky User', identity_number: restrictIdentity, phone: getUniquePhone(), host_name: 'Test Host' });
      
      const sneakyId = createRes.body.visitor.id;

      await request(app)
        .post('/api/restricted')
        .set('Authorization', `Bearer ${securityOfficerAuthToken}`)
        .send({ identity_number: restrictIdentity, name: 'Sneaky User', reason: 'Security threat', restriction_type: 'Permanent', start_date: '2025-01-01' });

      const res = await request(app)
        .put(`/api/visitors/${sneakyId}/entry`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Restricted visitor cannot enter campus');
    });

    test('24. should process visitor exit and set status to Exited', async () => {
      const res = await request(app)
        .put(`/api/visitors/${lifecycleVisitorId}/exit`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.visitor.status).toBe('Exited');
      expect(res.body.visitor).toHaveProperty('duration_minutes');
    });

    test('25. should block exit if visitor has not entered', async () => {
      const createRes = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({ category: 'Guest Visitor', name: 'No Entry User', identity_number: `NOENT${getUniqueId()}`, phone: getUniquePhone(), host_name: 'Test Host' });
      
      const res = await request(app)
        .put(`/api/visitors/${createRes.body.visitor.id}/exit`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Visitor has not entered campus');
    });

    test('26. should return all visitors with status Inside', async () => {
      const createRes = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({ category: 'Guest Visitor', name: 'Active User', identity_number: `ACT${getUniqueId()}`, phone: getUniquePhone(), host_name: 'Test Host' });
      
      await request(app).put(`/api/visitors/${createRes.body.visitor.id}/entry`).set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      const res = await request(app)
        .get('/api/visitors/active')
        .set('Authorization', `Bearer ${securityOfficerAuthToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      const found = res.body.find(v => v.id === createRes.body.visitor.id);
      expect(found).toBeDefined();
      expect(found.status).toBe('Inside');
    });
  });
});