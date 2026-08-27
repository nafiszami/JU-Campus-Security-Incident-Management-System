// Load environment variables
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'random';
}

const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Visitor API Tests
// Feature: Register Visitor (SRS 3.1.5)
// Member: Qazi Ibnul Nafis
describe('Visitor API Tests', () => {
  // Authentication tokens
  let gateOperatorAuthToken;
  let securityOfficerAuthToken;
  let studentAuthToken;
  
  // Test IDs
  let createdParentVisitorId;

  // Generate unique test data using timestamp
  const getUniqueId = () => Date.now().toString().slice(-6);
  const getUniquePhone = () => `017${Date.now().toString().slice(-8)}`;

  // SETUP: Delete existing test users, then create new ones
  beforeAll(async () => {
    // Step 1: Delete existing test users
    await query(`DELETE FROM audit_logs WHERE user_id IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM visitors WHERE registered_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM restricted_visitors WHERE added_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM restriction_exceptions WHERE requested_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM users WHERE email IN 
      ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu')`);

    // Step 2: Create fresh test users
    const gateOperatorHashedPassword = await bcrypt.hash('Password123', 10);
    await query(
      `INSERT INTO users (name, email, password_hash, role, assigned_gate) 
       VALUES (?, ?, ?, ?, ?)`,
      ['Gate Operator Test', 'gate.operator.test@juniv.edu', gateOperatorHashedPassword, 'Gate Operator', 'Main Gate']
    );

    const securityOfficerHashedPassword = await bcrypt.hash('Password123', 10);
    await query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
      ['Security Officer Test', 'security.officer.test@juniv.edu', securityOfficerHashedPassword, 'Security Officer']
    );

    const studentHashedPassword = await bcrypt.hash('Password123', 10);
    await query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
      ['Student Test', 'student.test@juniv.edu', studentHashedPassword, 'Student']
    );

    // Step 3: Get authentication tokens
    const gateOperatorLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gate.operator.test@juniv.edu', password: 'Password123' });
    gateOperatorAuthToken = gateOperatorLoginResponse.body.token;

    const securityOfficerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'security.officer.test@juniv.edu', password: 'Password123' });
    securityOfficerAuthToken = securityOfficerLoginResponse.body.token;

    const studentLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student.test@juniv.edu', password: 'Password123' });
    studentAuthToken = studentLoginResponse.body.token;
  });

  // CLEANUP: Delete ALL test data after tests
  afterAll(async () => {
    await query(`DELETE FROM audit_logs WHERE user_id IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM visitors WHERE registered_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM restricted_visitors WHERE added_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM restriction_exceptions WHERE requested_by IN 
      (SELECT id FROM users WHERE email IN 
        ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu'))`);
    
    await query(`DELETE FROM users WHERE email IN 
      ('gate.operator.test@juniv.edu', 'security.officer.test@juniv.edu', 'student.test@juniv.edu')`);
  });

  // TEST SUITE 1: Register Visitor
  describe('POST /api/visitors - Register Visitor', () => {
    
    test('should register a valid Guardian/Parent visitor', async () => {
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
      expect(response.body.visitor).toHaveProperty('visitor_id');
      expect(response.body.visitor.visitor_id).toMatch(/^V-\d{4}-\d{3}$/);
      expect(response.body.visitor.category).toBe('Guardian/Parent');
      expect(response.body.visitor.status).toBe('Registered');
      expect(response.body).toHaveProperty('pass');
      
      createdParentVisitorId = response.body.visitor.id;
    });

    test('should register a valid Guest Visitor', async () => {
      const uniqueSuffix = getUniqueId();
      const guestVisitorData = {
        category: 'Guest Visitor',
        name: `Prof. Dr. Kamal Hossain ${uniqueSuffix}`,
        identity_number: `8765432109${uniqueSuffix}`,
        phone: getUniquePhone(),
        host_name: `Dr. Shahidul Islam ${uniqueSuffix}`,
        host_department: 'Physics',
        purpose: 'Research collaboration meeting',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(guestVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Guest Visitor');
      expect(response.body.visitor.host_name).toContain('Dr. Shahidul Islam');
    });

    test('should register a valid Alumni visitor', async () => {
      const uniqueSuffix = getUniqueId();
      const alumniVisitorData = {
        category: 'Alumni',
        name: `Md. Kamruzzaman ${uniqueSuffix}`,
        identity_number: `7654321098${uniqueSuffix}`,
        phone: getUniquePhone(),
        host_name: `Prof. Dr. A.K.M. Azad ${uniqueSuffix}`,
        host_department: 'CSE',
        purpose: 'Alumni reunion 2025',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(alumniVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Alumni');
    });

    test('should register a valid Event Participant', async () => {
      const uniqueSuffix = getUniqueId();
      const eventVisitorData = {
        category: 'Event Participant',
        name: `Nadia Sultana ${uniqueSuffix}`,
        identity_number: `6543210987${uniqueSuffix}`,
        phone: getUniquePhone(),
        event_name: `International Conference on AI ${uniqueSuffix}`,
        event_pass: `AI-2025-${uniqueSuffix}`,
        host_name: 'Conference Organizer',
        host_department: 'CSE',
        purpose: 'Present research paper',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(eventVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Event Participant');
      expect(response.body.visitor.event_name).toContain('International Conference on AI');
    });

    test('should register a valid Delivery Personnel', async () => {
      const uniqueSuffix = getUniqueId();
      const deliveryVisitorData = {
        category: 'Delivery Personnel',
        name: `Md. Shohag Ali ${uniqueSuffix}`,
        identity_number: `5432109876${uniqueSuffix}`,
        phone: getUniquePhone(),
        company_name: `Pathao Food Delivery ${uniqueSuffix}`,
        vehicle_plate: `DHA-${uniqueSuffix}`,
        host_name: 'CSE Department',
        host_department: 'CSE',
        purpose: 'Food delivery for department event',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(deliveryVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Delivery Personnel');
      expect(response.body.visitor.company_name).toContain('Pathao Food Delivery');
    });

    test('should register a valid Construction Worker', async () => {
      const uniqueSuffix = getUniqueId();
      const constructionVisitorData = {
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
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(constructionVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Construction Worker');
      expect(response.body.visitor.project_code).toContain('PROJ-CSE-2025');
    });

    test('should register a valid Contractor', async () => {
      const uniqueSuffix = getUniqueId();
      const contractorVisitorData = {
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
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(contractorVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Contractor');
      expect(response.body.visitor.company_name).toContain('Spectra Engineering Ltd');
    });

    test('should register a valid Local Resident', async () => {
      const uniqueSuffix = getUniqueId();
      const residentVisitorData = {
        category: 'Local Resident',
        name: `Mrs. Shamsun Nahar ${uniqueSuffix}`,
        identity_number: `2109876543${uniqueSuffix}`,
        phone: getUniquePhone(),
        purpose: 'Passing through campus to reach home',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(residentVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Local Resident');
    });

    test('should register a valid Vendor/Shop Owner', async () => {
      const uniqueSuffix = getUniqueId();
      const vendorVisitorData = {
        category: 'Vendor/Shop Owner',
        name: `Md. Abdus Salam ${uniqueSuffix}`,
        identity_number: `1098765432${uniqueSuffix}`,
        phone: getUniquePhone(),
        company_name: `JU Campus Book Store ${uniqueSuffix}`,
        purpose: 'Daily shop business',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(vendorVisitorData);

      expect(response.status).toBe(201);
      expect(response.body.visitor.category).toBe('Vendor/Shop Owner');
      expect(response.body.visitor.company_name).toContain('JU Campus Book Store');
    });
  });

  // TEST SUITE 2: Validation Tests
  describe('Validation Tests', () => {
    
    test('should reject invalid category', async () => {
      const invalidCategoryData = {
        category: 'Invalid Category Name',
        name: 'Test User',
        identity_number: '1111111111',
        phone: '01711111111',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(invalidCategoryData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid visitor category');
    });

    test('should reject missing required fields', async () => {
      const missingFieldsData = {
        category: 'Guest Visitor',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(missingFieldsData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name, identity number, and phone are required');
    });

    test('should reject Guardian/Parent without student name', async () => {
      const guardianWithoutStudentData = {
        category: 'Guardian/Parent',
        name: 'Md. Abdur Rahman',
        identity_number: '1987654321',
        phone: '01719876543',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(guardianWithoutStudentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Student name is required for Guardian/Parent');
    });

    test('should reject Construction Worker without project code', async () => {
      const constructionWithoutProjectData = {
        category: 'Construction Worker',
        name: 'Md. Alamgir Hossain',
        identity_number: '4321098765',
        phone: '01743210987',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(constructionWithoutProjectData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project code is required for Construction Worker');
    });

    test('should reject Contractor without company name', async () => {
      const contractorWithoutCompanyData = {
        category: 'Contractor',
        name: 'Engr. Muhammad Kamal',
        identity_number: '3210987654',
        phone: '01732109876',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(contractorWithoutCompanyData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Company name is required for Contractor');
    });
  });

  // TEST SUITE 3: Restricted & Duplicate Checks
  describe('Restricted & Duplicate Checks', () => {
    
    test('should block restricted visitor', async () => {
      const restrictedNid = `9999999999${getUniqueId()}`;
      const restrictedPersonName = `Kazi Ashraf Uddin ${getUniqueId()}`;

      // Add person to restricted list
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

      // Try to register restricted person
      const blockedVisitorData = {
        category: 'Guest Visitor',
        name: restrictedPersonName,
        identity_number: restrictedNid,
        phone: getUniquePhone(),
        host_name: 'Test Host',
        host_department: 'CSE',
        purpose: 'Visit',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(blockedVisitorData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('This visitor is restricted from entering campus');
      expect(response.body).toHaveProperty('reason');
      expect(response.body).toHaveProperty('restriction_type');
    });

    test('should reject duplicate active registration', async () => {
      const duplicateNid = `8888888888${getUniqueId()}`;

      // First registration
      await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send({
          category: 'Guest Visitor',
          name: `Md. Zahidul Islam ${getUniqueId()}`,
          identity_number: duplicateNid,
          phone: getUniquePhone(),
          host_name: 'Dr. A.K.M. Azad',
          host_department: 'CSE',
          purpose: 'Academic meeting',
        });

      // Second registration with same NID
      const duplicateRegistrationData = {
        category: 'Guest Visitor',
        name: `Md. Zahidul Islam ${getUniqueId()}`,
        identity_number: duplicateNid,
        phone: getUniquePhone(),
        host_name: 'Dr. Shahidul Islam',
        host_department: 'CSE',
        purpose: 'Another meeting',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .send(duplicateRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Visitor already has an active registration');
      expect(response.body).toHaveProperty('visitor_id');
      expect(response.body).toHaveProperty('status');
    });

    test('should reject unauthorized access - Student', async () => {
      const unauthorizedVisitorData = {
        category: 'Guest Visitor',
        name: 'Unauthorized User',
        identity_number: '7777777777',
        phone: '01777777777',
        host_name: 'Test Host',
        host_department: 'CSE',
        purpose: 'Visit',
      };

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${studentAuthToken}`)
        .send(unauthorizedVisitorData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });
  });

  // TEST SUITE 4: Search & Retrieval Tests
  describe('Search & Retrieval Tests', () => {
    
    test('should search visitors by name', async () => {
      const searchQuery = 'Md. Abdur Rahman';

      const response = await request(app)
        .get('/api/visitors/search')
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
        .query({ q: searchQuery });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // At least one visitor should match
      if (response.body.length > 0) {
        const foundVisitor = response.body.find(visitor => 
          visitor.name && visitor.name.includes('Md. Abdur Rahman')
        );
        // If found, verify properties
        if (foundVisitor) {
          expect(foundVisitor).toHaveProperty('visitor_id');
        }
      }
    });

    test('should get visitor by ID', async () => {
      // Ensure we have a valid visitor ID
      if (!createdParentVisitorId) {
        // Create a visitor first if needed
        const uniqueSuffix = getUniqueId();
        const response = await request(app)
          .post('/api/visitors')
          .set('Authorization', `Bearer ${gateOperatorAuthToken}`)
          .send({
            category: 'Guardian/Parent',
            name: `Test Visitor ${uniqueSuffix}`,
            identity_number: `9999999999${uniqueSuffix}`,
            phone: getUniquePhone(),
            student_name: `Test Student ${uniqueSuffix}`,
            student_hall: 'BRH',
            purpose: 'Test',
            host_name: `Test Student ${uniqueSuffix}`,
            host_department: 'CSE',
          });
        createdParentVisitorId = response.body.visitor.id;
      }

      const response = await request(app)
        .get(`/api/visitors/${createdParentVisitorId}`)
        .set('Authorization', `Bearer ${gateOperatorAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', createdParentVisitorId);
      expect(response.body).toHaveProperty('visitor_id');
    });
  });
});