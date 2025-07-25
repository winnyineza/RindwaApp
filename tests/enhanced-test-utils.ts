/**
 * ============================================================================
 * 🧪 Rindwa Emergency Platform - Enhanced Test Utilities
 * ============================================================================
 * Comprehensive testing utilities for unit, integration, and E2E tests
 */

import { Express } from 'express';
import request from 'supertest';
import jwt, { SignOptions } from 'jsonwebtoken';
import { sequelize } from '../server/db';
import { QueryTypes } from 'sequelize';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-super-long-for-security';

// Test configuration
export const TEST_CONFIG = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    name: process.env.TEST_DB_NAME || 'rindwa_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password'
  },
  jwt: {
    secret: JWT_SECRET,
    expiresIn: '1h'
  },
  timeout: 30000
};

// Test user IDs for consistent testing
export const TEST_USERS = {
  MAIN_ADMIN: {
    id: '550e8400-e29b-41d4-a716-446655440021',
    email: 'main.admin@test.com',
    firstName: 'Main',
    lastName: 'Admin',
    role: 'main_admin'
  },
  SUPER_ADMIN: {
    id: '550e8400-e29b-41d4-a716-446655440022',
    email: 'super.admin@test.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin'
  },
  STATION_ADMIN: {
    id: '550e8400-e29b-41d4-a716-446655440023',
    email: 'station.admin@test.com',
    firstName: 'Station',
    lastName: 'Admin',
    role: 'station_admin'
  },
  STATION_STAFF: {
    id: '550e8400-e29b-41d4-a716-446655440024',
    email: 'station.staff@test.com',
    firstName: 'Station',
    lastName: 'Staff',
    role: 'station_staff'
  },
  CITIZEN: {
    id: '550e8400-e29b-41d4-a716-446655440025',
    email: 'citizen@test.com',
    firstName: 'Test',
    lastName: 'Citizen',
    role: 'citizen'
  }
};

export const TEST_ORGANIZATIONS = {
  POLICE: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Police Department',
    type: 'police'
  },
  FIRE: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Test Fire Department',
    type: 'fire'
  },
  MEDICAL: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Test Medical Services',
    type: 'medical'
  }
};

export const TEST_STATIONS = {
  POLICE_STATION: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Test Police Station',
    organizationId: TEST_ORGANIZATIONS.POLICE.id
  },
  FIRE_STATION: {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Test Fire Station',
    organizationId: TEST_ORGANIZATIONS.FIRE.id
  },
  MEDICAL_STATION: {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Test Medical Station',
    organizationId: TEST_ORGANIZATIONS.MEDICAL.id
  }
};

/**
 * Enhanced Database Management for Tests
 */
export class TestDatabase {
  /**
   * Set up test database with clean state
   */
  static async setup(): Promise<void> {
    try {
      await sequelize.authenticate();
      
      // Clean all tables
      await this.cleanAll();
      
      // Insert test data
      await this.seedTestData();
      
      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Clean all test data
   */
  static async cleanAll(): Promise<void> {
    const tables = [
      'audit_logs',
      'notifications',
      'file_uploads',
      'incidents',
      'invitations',
      'users',
      'stations',
      'organizations'
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`, {
          type: QueryTypes.DELETE
        });
      } catch (error) {
        // Table might not exist, continue
      }
    }
  }

  /**
   * Clean specific tables
   */
  static async cleanTables(tables: string[]): Promise<void> {
    for (const table of tables) {
      try {
        await sequelize.query(`DELETE FROM "${table}"`, {
          type: QueryTypes.DELETE
        });
      } catch (error) {
        // Table might not exist, continue
      }
    }
  }

  /**
   * Seed test data
   */
  static async seedTestData(): Promise<void> {
    // Insert organizations
    for (const org of Object.values(TEST_ORGANIZATIONS)) {
      await sequelize.query(`
        INSERT INTO organizations (id, name, type, "createdAt", "updatedAt")
        VALUES (:id, :name, :type, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, {
        replacements: org,
        type: QueryTypes.INSERT
      });
    }

    // Insert stations
    for (const station of Object.values(TEST_STATIONS)) {
      await sequelize.query(`
        INSERT INTO stations (id, name, "organizationId", "createdAt", "updatedAt")
        VALUES (:id, :name, :organizationId, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, {
        replacements: station,
        type: QueryTypes.INSERT
      });
    }

    // Insert users
    for (const user of Object.values(TEST_USERS)) {
      await sequelize.query(`
        INSERT INTO users (id, email, "firstName", "lastName", role, password, "isActive", "createdAt", "updatedAt")
        VALUES (:id, :email, :firstName, :lastName, :role, '$2b$10$testhashedpassword', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, {
        replacements: user,
        type: QueryTypes.INSERT
      });
    }
  }

  /**
   * Teardown test database
   */
  static async teardown(): Promise<void> {
    try {
      await this.cleanAll();
      console.log('✅ Test database teardown completed');
    } catch (error) {
      console.error('❌ Test database teardown failed:', error);
    }
  }
}

/**
 * Authentication utilities for tests
 */
export class TestAuth {
  /**
   * Generate JWT token for testing
   */
  static generateToken(user: any, options: any = {}): string {
    const payload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: options.organizationId || null,
      stationId: options.stationId || null,
      ...options
    };

    const options: SignOptions = {
      expiresIn: TEST_CONFIG.jwt.expiresIn
    };
    return jwt.sign(payload, TEST_CONFIG.jwt.secret as string, options);
  }

  /**
   * Create authorization header
   */
  static createAuthHeader(user: any, options: any = {}): { Authorization: string } {
    const token = this.generateToken(user, options);
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Test different authentication scenarios
   */
  static getTestTokens() {
    return {
      mainAdmin: this.generateToken(TEST_USERS.MAIN_ADMIN),
      superAdmin: this.generateToken(TEST_USERS.SUPER_ADMIN),
      stationAdmin: this.generateToken(TEST_USERS.STATION_ADMIN),
      stationStaff: this.generateToken(TEST_USERS.STATION_STAFF),
      citizen: this.generateToken(TEST_USERS.CITIZEN),
      invalid: 'invalid.jwt.token',
      expired: jwt.sign({ userId: 'test' }, TEST_CONFIG.jwt.secret, { expiresIn: '1s' })
    };
  }
}

/**
 * API testing utilities
 */
export class TestAPI {
  /**
   * Make authenticated request
   */
  static authenticatedRequest(app: Express, user: any) {
    const authHeader = TestAuth.createAuthHeader(user);
    return {
      get: (url: string) => request(app).get(url).set(authHeader),
      post: (url: string) => request(app).post(url).set(authHeader),
      put: (url: string) => request(app).put(url).set(authHeader),
      patch: (url: string) => request(app).patch(url).set(authHeader),
      delete: (url: string) => request(app).delete(url).set(authHeader)
    };
  }

  /**
   * Test API endpoint with different user roles
   */
  static async testEndpointPermissions(
    app: Express,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    expectedPermissions: { [role: string]: number },
    data?: any
  ) {
    const results: { [role: string]: any } = {};

    for (const [role, user] of Object.entries(TEST_USERS)) {
      const req = TestAPI.authenticatedRequest(app, user)[method](endpoint);
      
      if (data && (method === 'post' || method === 'put' || method === 'patch')) {
        req.send(data);
      }

      const response = await req;
      results[role] = {
        status: response.status,
        expected: expectedPermissions[role] || 403
      };

      expect(response.status).toBe(expectedPermissions[role] || 403);
    }

    return results;
  }
}

/**
 * Test assertions and validators
 */
export class TestAssertions {
  /**
   * Validate JWT token structure
   */
  static assertValidJWT(token: string, expectedRole?: string) {
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, TEST_CONFIG.jwt.secret) as any;
    expect(decoded.userId).toBeTruthy();
    expect(decoded.email).toBeTruthy();
    expect(decoded.role).toBeTruthy();

    if (expectedRole) {
      expect(decoded.role).toBe(expectedRole);
    }

    return decoded;
  }

  /**
   * Validate API error response
   */
  static assertApiError(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('message');

    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Validate incident object
   */
  static assertValidIncident(incident: any) {
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('title');
    expect(incident).toHaveProperty('description');
    expect(incident).toHaveProperty('priority');
    expect(incident).toHaveProperty('status');
    expect(incident).toHaveProperty('location');
    expect(incident).toHaveProperty('createdAt');
  }

  /**
   * Validate user object
   */
  static assertValidUser(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('role');
    expect(user).not.toHaveProperty('password'); // Should never return password
  }

  /**
   * Validate pagination response
   */
  static assertValidPagination(response: any) {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(Array.isArray(response.body.data)).toBe(true);
  }
}

/**
 * Mock data generators
 */
export class TestMocks {
  /**
   * Generate mock incident data
   */
  static createIncidentData(overrides: any = {}) {
    return {
      title: 'Test Emergency Incident',
      description: 'This is a test incident for automated testing',
      priority: 'high',
      type: 'emergency',
      location: {
        lat: -1.9441,
        lng: 30.0619,
        address: 'Test Location, Kigali, Rwanda'
      },
      reporterName: 'Test Reporter',
      reporterPhone: '+250788123456',
      ...overrides
    };
  }

  /**
   * Generate mock user data
   */
  static createUserData(overrides: any = {}) {
    const timestamp = Date.now();
    return {
      email: `test.user.${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'testPassword123!',
      role: 'citizen',
      phone: '+250788123456',
      ...overrides
    };
  }

  /**
   * Generate mock organization data
   */
  static createOrganizationData(overrides: any = {}) {
    const timestamp = Date.now();
    return {
      name: `Test Organization ${timestamp}`,
      type: 'police',
      description: 'Test organization for automated testing',
      ...overrides
    };
  }
}

/**
 * Performance testing utilities
 */
export class TestPerformance {
  /**
   * Measure endpoint response time
   */
  static async measureResponseTime(fn: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Test endpoint under load
   */
  static async loadTest(fn: () => Promise<any>, options: { concurrency: number; iterations: number }) {
    const { concurrency, iterations } = options;
    const results: { duration: number; success: boolean }[] = [];

    for (let i = 0; i < iterations; i += concurrency) {
      const batch: Promise<{ result: any; duration: number }>[] = [];
      
      for (let j = 0; j < concurrency && (i + j) < iterations; j++) {
        batch.push(this.measureResponseTime(fn));
      }

      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({ duration: result.value.duration, success: true });
        } else {
          results.push({ duration: 0, success: false });
        }
      }
    }

    const successfulResults = results.filter(r => r.success);
    const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const successRate = (successfulResults.length / results.length) * 100;

    return {
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      successRate,
      averageResponseTime,
      minResponseTime: Math.min(...successfulResults.map(r => r.duration)),
      maxResponseTime: Math.max(...successfulResults.map(r => r.duration))
    };
  }
}

/**
 * File system utilities for tests
 */
export class TestFileSystem {
  /**
   * Create temporary test file
   */
  static createTempFile(content: string, extension: string = '.txt'): string {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `test-${Date.now()}${extension}`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);
    
    return filePath;
  }

  /**
   * Clean up temporary test files
   */
  static cleanupTempFiles(): void {
    const tempDir = path.join(__dirname, '../temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Export all utilities
export const TestUtils = {
  Database: TestDatabase,
  Auth: TestAuth,
  API: TestAPI,
  Assertions: TestAssertions,
  Mocks: TestMocks,
  Performance: TestPerformance,
  FileSystem: TestFileSystem,
  Config: TEST_CONFIG,
  Users: TEST_USERS,
  Organizations: TEST_ORGANIZATIONS,
  Stations: TEST_STATIONS
}; 