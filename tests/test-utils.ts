// Test utilities for consistent testing patterns
import { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { sequelize } from '../server/db';
import { QueryTypes } from 'sequelize';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-super-long-for-security';

// Test user IDs for consistent testing
export const TEST_USER_IDS = {
  MAIN_ADMIN: '550e8400-e29b-41d4-a716-446655440021',
  SUPER_ADMIN: '550e8400-e29b-41d4-a716-446655440022',
  STATION_ADMIN: '550e8400-e29b-41d4-a716-446655440023',
  STATION_STAFF: '550e8400-e29b-41d4-a716-446655440024',
  CITIZEN: '550e8400-e29b-41d4-a716-446655440025',
};

export const TEST_ORG_IDS = {
  POLICE: '550e8400-e29b-41d4-a716-446655440001',
  FIRE: '550e8400-e29b-41d4-a716-446655440002',
  MEDICAL: '550e8400-e29b-41d4-a716-446655440003',
};

export const TEST_STATION_IDS = {
  POLICE_STATION: '550e8400-e29b-41d4-a716-446655440011',
  FIRE_STATION: '550e8400-e29b-41d4-a716-446655440012',
  MEDICAL_STATION: '550e8400-e29b-41d4-a716-446655440013',
};

export const TEST_INCIDENT_IDS = {
  EMERGENCY: '550e8400-e29b-41d4-a716-446655440031',
  ASSIGNED: '550e8400-e29b-41d4-a716-446655440032',
};

// Authentication helpers
export class TestAuth {
  /**
   * Generate JWT token for testing
   */
  static generateToken(userRole: string, userId: string, options: any = {}) {
    const payload = {
      userId,
      email: `${userRole}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      role: userRole,
      organizationId: options.organizationId || null,
      stationId: options.stationId || null,
      ...options,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  /**
   * Get authentication header for API requests
   */
  static getAuthHeader(userRole: string, userId?: string, options: any = {}) {
    const actualUserId = userId || TEST_USER_IDS[userRole.toUpperCase() as keyof typeof TEST_USER_IDS];
    const token = this.generateToken(userRole, actualUserId, options);
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Login and get token for testing
   */
  static async loginUser(app: Express, email: string, password: string = 'test123456') {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    
    return response.body.token;
  }
}

// Database test helpers
export class TestDB {
  /**
   * Clean specific tables for isolated testing
   */
  static async cleanTables(tables: string[]) {
    for (const table of tables) {
      await sequelize.query(`DELETE FROM ${table} WHERE id NOT LIKE '550e8400-e29b-41d4-a716-44665544%'`);
    }
  }

  /**
   * Create test incident
   */
  static async createTestIncident(data: any = {}) {
    const incidentData = {
      title: 'Test Incident',
      description: 'Test incident description',
      type: 'other',
      priority: 'medium',
      status: 'reported',
      location: JSON.stringify({ address: 'Test Location', lat: -1.9441, lng: 30.0619 }),
      stationId: TEST_STATION_IDS.POLICE_STATION,
      organisationId: TEST_ORG_IDS.POLICE,
      reportedById: TEST_USER_IDS.CITIZEN,
      ...data,
    };

    const result = await sequelize.query(`
      INSERT INTO incidents (
        id, title, description, type, priority, status, location,
        "stationId", "organisationId", "reportedById", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :title, :description, :type, :priority, :status, :location,
        :stationId, :organisationId, :reportedById, NOW(), NOW()
      ) RETURNING *
    `, {
      replacements: incidentData,
      type: QueryTypes.SELECT
    });

    return result[0];
  }

  /**
   * Create test user
   */
  static async createTestUser(data: any = {}) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(data.password || 'test123456', 10);
    
    const userData = {
      email: `test-${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'citizen',
      isActive: true,
      ...data,
    };

    const result = await sequelize.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", phone, role,
        "organisationId", "stationId", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role,
        :organisationId, :stationId, :isActive, NOW(), NOW()
      ) RETURNING *
    `, {
      replacements: userData,
      type: QueryTypes.SELECT
    });

    return result[0];
  }

  /**
   * Get test user by role
   */
  static async getTestUser(role: string) {
    const result = await sequelize.query(
      'SELECT * FROM users WHERE role = :role AND email LIKE \'%@test.com\' LIMIT 1',
      {
        replacements: { role },
        type: QueryTypes.SELECT
      }
    );
    return result[0];
  }
}

// API test helpers
export class TestAPI {
  /**
   * Make authenticated API request
   */
  static async makeAuthenticatedRequest(
    app: Express,
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    userRole: string,
    data?: any,
    userId?: string
  ) {
    const authHeader = TestAuth.getAuthHeader(userRole, userId);
    let req = request(app)[method](endpoint).set(authHeader);
    
    if (data && (method === 'post' || method === 'put')) {
      req = req.send(data);
    }
    
    return req;
  }

  /**
   * Test role-based access control
   */
  static async testRoleAccess(
    app: Express,
    endpoint: string,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    allowedRoles: string[] = [],
    data?: any
  ) {
    const allRoles = ['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'];
    const results: { [role: string]: number } = {};

    for (const role of allRoles) {
      try {
        const response = await this.makeAuthenticatedRequest(app, method, endpoint, role, data);
        results[role] = response.status;
      } catch (error) {
        results[role] = 500;
      }
    }

    // Check that allowed roles get 200/201, others get 403
    for (const role of allRoles) {
      if (allowedRoles.includes(role)) {
        expect([200, 201]).toContain(results[role]);
      } else {
        expect([401, 403]).toContain(results[role]);
      }
    }

    return results;
  }

  /**
   * Test unauthenticated access
   */
  static async testUnauthenticatedAccess(
    app: Express,
    endpoint: string,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    data?: any
  ) {
    let req = request(app)[method](endpoint);
    
    if (data && (method === 'post' || method === 'put')) {
      req = req.send(data);
    }
    
    const response = await req;
    expect(response.status).toBe(401);
    return response;
  }
}

// Mock factories
export class TestMocks {
  /**
   * Create mock incident data
   */
  static createIncidentMock(overrides: any = {}) {
    return {
      id: 'test-incident-id',
      title: 'Test Emergency',
      description: 'Test emergency description',
      type: 'other',
      priority: 'high',
      status: 'reported',
      location: { address: 'Test Location', lat: -1.9441, lng: 30.0619 },
      stationId: TEST_STATION_IDS.POLICE_STATION,
      organisationId: TEST_ORG_IDS.POLICE,
      reportedById: TEST_USER_IDS.CITIZEN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create mock user data
   */
  static createUserMock(role: string = 'citizen', overrides: any = {}) {
    return {
      id: `test-${role}-id`,
      email: `${role}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Mock external services
   */
  static mockExternalServices() {
    // Mock email service
    jest.mock('../server/email', () => ({
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      generateInvitationEmail: jest.fn().mockReturnValue({
        subject: 'Test Invitation',
        html: '<p>Test email</p>',
        text: 'Test email'
      })
    }));

    // Mock SMS service
    jest.mock('../server/communication', () => ({
      sendEmailMessage: jest.fn().mockResolvedValue({ success: true }),
      sendSMSMessage: jest.fn().mockResolvedValue({ success: true }),
      generateEmergencyEmailTemplate: jest.fn().mockReturnValue('<p>Emergency template</p>'),
      generateEmergencySMSMessage: jest.fn().mockReturnValue('Emergency SMS')
    }));
  }
}

// Test assertion helpers
export class TestAssertions {
  /**
   * Assert valid JWT token
   */
  static assertValidJWT(token: string, expectedRole?: string) {
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email');
    expect(decoded).toHaveProperty('role');
    
    if (expectedRole) {
      expect(decoded.role).toBe(expectedRole);
    }
    
    return decoded;
  }

  /**
   * Assert incident structure
   */
  static assertIncidentStructure(incident: any) {
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('title');
    expect(incident).toHaveProperty('description');
    expect(incident).toHaveProperty('type');
    expect(incident).toHaveProperty('priority');
    expect(incident).toHaveProperty('status');
    expect(incident).toHaveProperty('stationId');
    expect(incident).toHaveProperty('createdAt');
    
    // Validate enums
    expect(['fire', 'medical', 'police', 'other']).toContain(incident.type);
    expect(['low', 'medium', 'high', 'critical']).toContain(incident.priority);
    expect(['reported', 'assigned', 'in_progress', 'resolved', 'escalated']).toContain(incident.status);
  }

  /**
   * Assert user structure
   */
  static assertUserStructure(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('role');
    expect(user).not.toHaveProperty('password'); // Should be filtered out
    
    // Validate role enum
    expect(['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen']).toContain(user.role);
  }

  /**
   * Assert API error response
   */
  static assertApiError(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('message');
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }
}

// Performance test helpers
export class TestPerformance {
  /**
   * Test API response time
   */
  static async testResponseTime(
    app: Express,
    endpoint: string,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    maxResponseTime: number = 1000,
    userRole?: string
  ) {
    const startTime = Date.now();
    
    let req = request(app)[method](endpoint);
    
    if (userRole) {
      const authHeader = TestAuth.getAuthHeader(userRole);
      req = req.set(authHeader);
    }
    
    await req;
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(maxResponseTime);
    
    return responseTime;
  }

  /**
   * Test concurrent requests
   */
  static async testConcurrentRequests(
    app: Express,
    endpoint: string,
    concurrency: number = 10,
    userRole?: string
  ) {
    const requests = Array(concurrency).fill(null).map(() => {
      let req = request(app).get(endpoint);
      
      if (userRole) {
        const authHeader = TestAuth.getAuthHeader(userRole);
        req = req.set(authHeader);
      }
      
      return req;
    });

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect([200, 201]).toContain(response.status);
    });

    // Average response time should be reasonable
    const avgResponseTime = totalTime / concurrency;
    expect(avgResponseTime).toBeLessThan(2000);

    return { responses, totalTime, avgResponseTime };
  }
} 