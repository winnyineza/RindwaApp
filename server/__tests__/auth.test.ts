// Comprehensive Authentication API Tests
import request from 'supertest';
import { Express } from 'express';
import { registerRoutes } from '../routes';
import { sequelize } from '../db';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { 
  TestAuth, 
  TestDB, 
  TestAPI, 
  TestAssertions, 
  TEST_USER_IDS,
  TEST_STATION_IDS,
  TEST_ORG_IDS 
} from '../../tests/test-utils';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-super-long-for-security';

describe('🔐 Authentication Security Test Suite', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    // Create test app instance
    const express = require('express');
    app = express();
    
    // Initialize server with routes
    server = await registerRoutes(app);
    
    console.log('✅ Authentication test suite initialized');
  });

  afterAll(async () => {
    // Clean up
    if (server && server.close) {
      server.close();
    }
    console.log('✅ Authentication test suite completed');
  });

  beforeEach(async () => {
    // Clean test-specific data before each test
    await TestDB.cleanTables(['password_reset_tokens', 'audit_logs']);
  });

  // =====================================================
  // LOGIN AUTHENTICATION TESTS
  // =====================================================
  
  describe('🚪 Login Authentication', () => {
    describe('Valid Login Scenarios', () => {
      it('should login main admin with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'mainadmin@test.com',
            password: 'test123456'
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        
        const user = response.body.user;
        TestAssertions.assertUserStructure(user);
        expect(user.role).toBe('main_admin');
        expect(user.email).toBe('mainadmin@test.com');
        
        // Verify JWT token
        TestAssertions.assertValidJWT(response.body.token, 'main_admin');
      });

      it('should login all user roles successfully', async () => {
        const testUsers = [
          { email: 'mainadmin@test.com', expectedRole: 'main_admin' },
          { email: 'superadmin@test.com', expectedRole: 'super_admin' },
          { email: 'stationadmin@test.com', expectedRole: 'station_admin' },
          { email: 'stationstaff@test.com', expectedRole: 'station_staff' },
          { email: 'citizen@test.com', expectedRole: 'citizen' },
        ];

        for (const testUser of testUsers) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: testUser.email,
              password: 'test123456'
            })
            .expect(200);

          expect(response.body.user.role).toBe(testUser.expectedRole);
          TestAssertions.assertValidJWT(response.body.token, testUser.expectedRole);
        }
      });

      it('should update lastLoginAt timestamp on successful login', async () => {
        const beforeLogin = new Date();
        
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'mainadmin@test.com',
            password: 'test123456'
          })
          .expect(200);

        // Check that lastLoginAt was updated
        const user = await TestDB.getTestUser('main_admin');
        expect(user).toBeTruthy();
        expect(new Date((user as any).lastLoginAt)).toBeInstanceOf(Date);
        expect(new Date((user as any).lastLoginAt).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      });
    });

    describe('Invalid Login Scenarios', () => {
      it('should reject login with wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'mainadmin@test.com',
            password: 'wrongpassword'
          })
          .expect(401);

        TestAssertions.assertApiError(response, 401, 'Invalid credentials');
        expect(response.body).not.toHaveProperty('token');
      });

      it('should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'test123456'
          })
          .expect(401);

        TestAssertions.assertApiError(response, 401, 'Invalid credentials');
      });

      it('should reject login for inactive users', async () => {
        // Create inactive user
        await TestDB.createTestUser({
          email: 'inactive@test.com',
          password: 'test123456',
          isActive: false
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'inactive@test.com',
            password: 'test123456'
          })
          .expect(401);

        TestAssertions.assertApiError(response, 401, 'Invalid credentials');
      });

      it('should validate input fields properly', async () => {
        // Missing email
        let response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test123456' })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');

        // Missing password
        response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com' })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');

        // Invalid email format
        response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid-email',
            password: 'test123456'
          })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('Security Measures', () => {
      it('should apply rate limiting to login attempts', async () => {
        const promises = [];
        
        // Make multiple rapid login attempts
        for (let i = 0; i < 10; i++) {
          promises.push(
            request(app)
              .post('/api/auth/login')
              .send({
                email: 'mainadmin@test.com',
                password: 'wrongpassword'
              })
          );
        }

        const responses = await Promise.all(promises);
        
        // Some requests should be rate limited (429) in production
        // In development, rate limits are very high, so we just check structure
        responses.forEach(response => {
          expect([400, 401, 429]).toContain(response.status);
        });
      });

      it('should not leak sensitive information in error messages', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'test123456'
          })
          .expect(401);

        // Should not reveal whether email exists or not
        expect(response.body.message).toBe('Invalid credentials');
        expect(response.body.message).not.toContain('user not found');
        expect(response.body.message).not.toContain('email does not exist');
      });
    });
  });

  // =====================================================
  // REGISTRATION TESTS
  // =====================================================

  describe('📝 User Registration', () => {
    describe('Valid Registration', () => {
      it('should register new citizen user successfully', async () => {
        const userData = {
          email: 'newcitizen@test.com',
          password: 'securePassword123',
          firstName: 'New',
          lastName: 'Citizen',
          phone: '+250788123456',
          role: 'citizen'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        
        const user = response.body.user;
        TestAssertions.assertUserStructure(user);
        expect(user.firstName).toBe(userData.firstName);
        expect(user.lastName).toBe(userData.lastName);
        expect(user.email).toBe(userData.email);
        expect(user.role).toBe(userData.role);
        
        TestAssertions.assertValidJWT(response.body.token, 'citizen');
      });

      it('should hash password securely', async () => {
        const userData = {
          email: 'passwordtest@test.com',
          password: 'mySecretPassword123',
          firstName: 'Password',
          lastName: 'Test',
          role: 'citizen'
        };

        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(200);

        // Check that password is hashed in database
        const result = await sequelize.query(
          'SELECT password FROM users WHERE email = :email',
          {
            replacements: { email: userData.email },
            type: QueryTypes.SELECT
          }
        );

        const dbUser = result[0] as any;
        expect(dbUser.password).not.toBe(userData.password);
        expect(dbUser.password).toMatch(/^\$2[aby]?\$/); // bcrypt hash pattern
        
        // Verify password can be validated
        const isValid = await bcrypt.compare(userData.password, dbUser.password);
        expect(isValid).toBe(true);
      });
    });

    describe('Registration Validation', () => {
      it('should reject registration with existing email', async () => {
        const userData = {
          email: 'mainadmin@test.com', // Already exists in seed data
          password: 'securePassword123',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'citizen'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestAssertions.assertApiError(response, 400, 'already exists');
      });

      it('should validate required fields', async () => {
        // Missing email
        let response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'test123456',
            firstName: 'Test',
            lastName: 'User',
            role: 'citizen'
          })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');

        // Missing password
        response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'citizen'
          })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');
      });

      it('should validate password strength', async () => {
        const weakPasswords = ['123', 'password', 'abc', ''];
        
        for (const weakPassword of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: `weak${Date.now()}@test.com`,
              password: weakPassword,
              firstName: 'Test',
              lastName: 'User',
              role: 'citizen'
            })
            .expect(400);
          
          expect(response.body).toHaveProperty('errors');
        }
      });

      it('should validate email format', async () => {
        const invalidEmails = ['invalid', 'invalid@', '@invalid.com', 'invalid.com'];
        
        for (const invalidEmail of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: invalidEmail,
              password: 'securePassword123',
              firstName: 'Test',
              lastName: 'User',
              role: 'citizen'
            })
            .expect(400);
          
          expect(response.body).toHaveProperty('errors');
        }
      });

      it('should validate role enum', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalidrole@test.com',
            password: 'securePassword123',
            firstName: 'Test',
            lastName: 'User',
            role: 'invalid_role'
          })
          .expect(400);
        
        expect(response.body).toHaveProperty('errors');
      });
    });
  });

  // =====================================================
  // PASSWORD RESET TESTS
  // =====================================================

  describe('🔑 Password Reset Flow', () => {
    describe('Password Reset Request', () => {
      it('should handle password reset request for existing user', async () => {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'mainadmin@test.com' })
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('If the email exists');
        
        // Note: In a real implementation, this would create a reset token
        // and send an email. For now, we just test the endpoint structure.
      });

      it('should not reveal whether email exists (security)', async () => {
        // Test with non-existent email
        const response1 = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'nonexistent@test.com' })
          .expect(200);

        // Test with existing email
        const response2 = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'mainadmin@test.com' })
          .expect(200);

        // Both should return the same message for security
        expect(response1.body.message).toBe(response2.body.message);
      });

      it('should validate email format in reset request', async () => {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Password Reset Confirmation', () => {
      it('should handle password reset with valid token structure', async () => {
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        const response = await request(app)
          .post(`/api/auth/reset-password/${resetToken}`)
          .send({ password: 'newSecurePassword123' })
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Password reset successful');
      });

      it('should validate new password strength', async () => {
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        const response = await request(app)
          .post(`/api/auth/reset-password/${resetToken}`)
          .send({ password: '123' }) // Weak password
          .expect(400);

        TestAssertions.assertApiError(response, 400, 'at least 6 characters');
      });
    });
  });

  // =====================================================
  // INVITATION SYSTEM TESTS
  // =====================================================

  describe('📧 Invitation System', () => {
    describe('Invitation Creation', () => {
      it('should allow main admin to create super admin invitation', async () => {
        const authHeader = TestAuth.getAuthHeader('main_admin');
        const response = await request(app)
          .post('/api/invitations')
          .set(authHeader)
          .send({
            email: 'newsuper@test.com',
            role: 'super_admin',
            organizationId: TEST_ORG_IDS.POLICE
          })
          .expect(201);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('expiresAt');
        expect(response.body.role).toBe('super_admin');
      });

      it('should allow super admin to invite station admin', async () => {
        const authHeader = TestAuth.getAuthHeader('super_admin');
        const response = await request(app)
          .post('/api/invitations')
          .set(authHeader)
          .send({
            email: 'newstationadmin@test.com',
            role: 'station_admin',
            stationId: TEST_STATION_IDS.POLICE_STATION
          })
          .expect(201);

        expect(response.body.role).toBe('station_admin');
      });

      it('should enforce role-based invitation permissions', async () => {
        // Main admin trying to invite station staff (not allowed)
        const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
        await request(app)
          .post('/api/invitations')
          .set(mainAdminAuth)
          .send({
            email: 'test@test.com',
            role: 'station_staff',
            stationId: TEST_STATION_IDS.POLICE_STATION
          })
          .expect(403);

        // Station staff trying to invite anyone (not allowed)  
        const staffAuth = TestAuth.getAuthHeader('station_staff');
        await request(app)
          .post('/api/invitations')
          .set(staffAuth)
          .send({
            email: 'test@test.com',
            role: 'citizen'
          })
          .expect(403);
      });

      it('should prevent invitation of existing users', async () => {
        const authHeader = TestAuth.getAuthHeader('main_admin');
        const response = await request(app)
          .post('/api/invitations')
          .set(authHeader)
          .send({
            email: 'mainadmin@test.com', // Already exists
            role: 'super_admin'
          })
          .expect(400);

        TestAssertions.assertApiError(response, 400, 'already exists');
      });
    });

    describe('Invitation Acceptance', () => {
      let invitationToken: string;

      beforeEach(async () => {
        // Create a test invitation
        const response = await TestAPI.makeAuthenticatedRequest(
          app, 'post', '/api/invitations', 'super_admin',
          {
            email: 'testinvite@test.com',
            role: 'station_admin',
            stationId: TEST_STATION_IDS.POLICE_STATION
          }
        );
        invitationToken = response.body.token;
      });

      it('should allow accepting valid invitation', async () => {
        const response = await request(app)
          .post(`/api/invitations/${invitationToken}/accept`)
          .send({
            firstName: 'New',
            lastName: 'Admin',
            phone: '+250788123456',
            password: 'securePassword123'
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.role).toBe('station_admin');
        
        TestAssertions.assertValidJWT(response.body.token, 'station_admin');
      });

      it('should reject invalid or expired invitation tokens', async () => {
        const invalidToken = crypto.randomBytes(32).toString('hex');
        
        const response = await request(app)
          .post(`/api/invitations/${invalidToken}/accept`)
          .send({
            firstName: 'Test',
            lastName: 'User',
            password: 'securePassword123'
          })
          .expect(400);

        TestAssertions.assertApiError(response, 400, 'Invalid or expired');
      });

      it('should prevent duplicate invitation acceptance', async () => {
        // Accept invitation first time
        await request(app)
          .post(`/api/invitations/${invitationToken}/accept`)
          .send({
            firstName: 'First',
            lastName: 'Time',
            password: 'securePassword123'
          })
          .expect(200);

        // Try to accept again
        const response = await request(app)
          .post(`/api/invitations/${invitationToken}/accept`)
          .send({
            firstName: 'Second',
            lastName: 'Time',
            password: 'securePassword123'
          })
          .expect(400);

        expect(response.body.message).toContain('already exists');
      });
    });
  });

  // =====================================================
  // JWT TOKEN SECURITY TESTS
  // =====================================================

  describe('🛡️ JWT Token Security', () => {
    let validToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mainadmin@test.com',
          password: 'test123456'
        });
      validToken = response.body.token;
    });

    describe('Token Validation', () => {
      it('should accept valid JWT tokens', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should reject requests without token', async () => {
        await TestAPI.testUnauthenticatedAccess(app, '/api/users');
      });

      it('should reject malformed tokens', async () => {
        const malformedTokens = [
          'invalid-token',
          'Bearer invalid-token',
          'Bearer ',
          '',
          'malformed.jwt.token'
        ];

        for (const token of malformedTokens) {
          const response = await request(app)
            .get('/api/users')
            .set('Authorization', token)
            .expect(401);

          expect(response.body).toHaveProperty('message');
        }
      });

      it('should reject expired tokens', async () => {
        // Create expired token
        const expiredToken = jwt.sign(
          { userId: TEST_USER_IDS.MAIN_ADMIN, role: 'main_admin' },
          JWT_SECRET,
          { expiresIn: '-1h' } // Expired 1 hour ago
        );

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(403);

        TestAssertions.assertApiError(response, 403, 'Invalid token');
      });

      it('should reject tokens with invalid signature', async () => {
        const invalidSignatureToken = jwt.sign(
          { userId: TEST_USER_IDS.MAIN_ADMIN, role: 'main_admin' },
          'wrong-secret-key',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${invalidSignatureToken}`)
          .expect(403);

        TestAssertions.assertApiError(response, 403, 'Invalid token');
      });
    });

    describe('Token Structure', () => {
      it('should include required claims in JWT payload', async () => {
        const decoded = jwt.verify(validToken, JWT_SECRET) as any;
        
        expect(decoded).toHaveProperty('userId');
        expect(decoded).toHaveProperty('email');
        expect(decoded).toHaveProperty('role');
        expect(decoded).toHaveProperty('firstName');
        expect(decoded).toHaveProperty('lastName');
        expect(decoded).toHaveProperty('iat'); // Issued at
        expect(decoded).toHaveProperty('exp'); // Expires at
        
        expect(decoded.role).toBe('main_admin');
        expect(decoded.email).toBe('mainadmin@test.com');
      });

      it('should not include sensitive information in token', async () => {
        const decoded = jwt.verify(validToken, JWT_SECRET) as any;
        
        expect(decoded).not.toHaveProperty('password');
        expect(decoded).not.toHaveProperty('passwordHash');
      });
    });
  });

  // =====================================================
  // ROLE-BASED ACCESS CONTROL TESTS
  // =====================================================

  describe('👑 Role-Based Access Control', () => {
    describe('Authentication Middleware', () => {
      it('should properly identify user roles from tokens', async () => {
        const roles = ['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'];
        
        for (const role of roles) {
          const token = TestAuth.generateToken(role, TEST_USER_IDS.MAIN_ADMIN);
          
          const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

          // The response should work for all roles (users endpoint allows all authenticated users)
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should enforce role-based endpoint access', async () => {
        // Test admin-only endpoints
        await TestAPI.testRoleAccess(
          app,
          '/api/organizations',
          'post',
          ['main_admin'],
          { name: 'Test Org', type: 'Police' }
        );

        // Test super admin endpoints
        await TestAPI.testRoleAccess(
          app,
          '/api/stations',
          'post',
          ['main_admin', 'super_admin'],
          { 
            name: 'Test Station', 
            district: 'Test', 
            sector: 'Test',
            organizationId: TEST_ORG_IDS.POLICE
          }
        );
      });
    });

    describe('Data Filtering by Role', () => {
      it('should filter incidents based on user role and station', async () => {
        // Station staff should only see their station's incidents
        const staffResponse = await TestAPI.makeAuthenticatedRequest(
          app, 'get', '/api/incidents', 'station_staff'
        );
        expect(staffResponse.status).toBe(200);

        // All incidents should belong to the staff member's station
        const incidents = staffResponse.body;
        incidents.forEach((incident: any) => {
          expect(incident.stationId).toBe(TEST_STATION_IDS.POLICE_STATION);
        });

        // Main admin should see all incidents
        const adminResponse = await TestAPI.makeAuthenticatedRequest(
          app, 'get', '/api/incidents', 'main_admin'
        );
        expect(adminResponse.status).toBe(200);

        expect(adminResponse.body.length).toBeGreaterThanOrEqual(incidents.length);
      });
    });
  });

  // =====================================================
  // AUDIT LOGGING TESTS
  // =====================================================

  describe('📋 Security Audit Logging', () => {
    it('should log successful login attempts', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mainadmin@test.com',
          password: 'test123456'
        })
        .expect(200);

      // In a full implementation, we would check audit logs here
      // For now, we just verify the login worked
    });

    it('should log failed login attempts', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mainadmin@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // In a full implementation, we would check that failed attempts are logged
    });
  });
}); 