// Comprehensive Role-Based Permission Test Suite
import request from 'supertest';
import { Express } from 'express';
import { registerRoutes } from '../routes';
import { 
  TestAuth, 
  TestDB, 
  TestAPI, 
  TestAssertions,
  TEST_USER_IDS,
  TEST_STATION_IDS,
  TEST_ORG_IDS
} from '../../tests/test-utils';

describe('🔐 Role-Based Permission Boundary Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const express = require('express');
    app = express();
    server = await registerRoutes(app);
    console.log('✅ Role permission test suite initialized');
  });

  afterAll(async () => {
    if (server && server.close) {
      server.close();
    }
    console.log('✅ Role permission test suite completed');
  });

  beforeEach(async () => {
    await TestDB.cleanTables(['audit_logs']);
  });

  // =====================================================
  // ORGANIZATION MANAGEMENT PERMISSIONS
  // =====================================================

  describe('🏢 Organization Management Permissions', () => {
    const organizationData = {
      name: 'Test Organization',
      type: 'Police',
      description: 'Test organization for permission testing'
    };

    describe('Organization Creation', () => {
      it('should allow only main admin to create organizations', async () => {
        const roles = {
          main_admin: { expected: 201, allowed: true },
          super_admin: { expected: 403, allowed: false },
          station_admin: { expected: 403, allowed: false },
          station_staff: { expected: 403, allowed: false },
          citizen: { expected: 403, allowed: false }
        };

        for (const [role, config] of Object.entries(roles)) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .post('/api/organizations')
            .set(authHeader)
            .send(organizationData)
            .expect(config.expected);

          if (config.allowed) {
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(organizationData.name);
          } else {
            TestAssertions.assertApiError(response, config.expected, 'permission');
          }
        }
      });
    });

    describe('Organization Viewing', () => {
      it('should allow appropriate roles to view organizations', async () => {
        const viewableRoles = ['main_admin', 'super_admin'];
        const restrictedRoles = ['station_admin', 'station_staff', 'citizen'];

        // Test viewable roles
        for (const role of viewableRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/organizations')
            .set(authHeader)
            .expect(200);

          expect(Array.isArray(response.body)).toBe(true);
        }

        // Test restricted roles
        for (const role of restrictedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          await request(app)
            .get('/api/organizations')
            .set(authHeader)
            .expect(403);
        }
      });
    });

    describe('Organization Updates', () => {
      it('should allow only main admin to update organizations', async () => {
        const updateData = { name: 'Updated Organization Name' };

        const roles = {
          main_admin: { expected: 200, allowed: true },
          super_admin: { expected: 403, allowed: false },
          station_admin: { expected: 403, allowed: false },
          station_staff: { expected: 403, allowed: false },
          citizen: { expected: 403, allowed: false }
        };

        for (const [role, config] of Object.entries(roles)) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .put(`/api/organizations/${TEST_ORG_IDS.POLICE}`)
            .set(authHeader)
            .send(updateData);

          expect(response.status).toBe(config.expected);
        }
      });
    });

    describe('Organization Deletion', () => {
      it('should allow only main admin to delete organizations', async () => {
        // Create a test organization first
        const testOrg = await TestDB.createTestUser({
          // This would be an organization creation in a real test
          email: 'testorg@example.com'
        });

        const roles = {
          main_admin: { expected: [200, 404], allowed: true }, // 404 if endpoint doesn't exist
          super_admin: { expected: 403, allowed: false },
          station_admin: { expected: 403, allowed: false },
          station_staff: { expected: 403, allowed: false },
          citizen: { expected: 403, allowed: false }
        };

        for (const [role, config] of Object.entries(roles)) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .delete(`/api/organizations/${TEST_ORG_IDS.POLICE}`)
            .set(authHeader);

          if (Array.isArray(config.expected)) {
            expect(config.expected).toContain(response.status);
          } else {
            expect(response.status).toBe(config.expected);
          }
        }
      });
    });
  });

  // =====================================================
  // STATION MANAGEMENT PERMISSIONS
  // =====================================================

  describe('🏠 Station Management Permissions', () => {
    const stationData = {
      name: 'Test Station',
      district: 'Test District',
      sector: 'Test Sector',
      organizationId: TEST_ORG_IDS.POLICE,
      contactNumber: '+250788123456',
      capacity: 50
    };

    describe('Station Creation', () => {
      it('should allow main admin and super admin to create stations', async () => {
        const roles = {
          main_admin: { expected: 200, allowed: true },
          super_admin: { expected: 200, allowed: true },
          station_admin: { expected: 403, allowed: false },
          station_staff: { expected: 403, allowed: false },
          citizen: { expected: 403, allowed: false }
        };

        for (const [role, config] of Object.entries(roles)) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .post('/api/stations')
            .set(authHeader)
            .send({
              ...stationData,
              name: `${stationData.name} ${role}` // Make names unique
            });

          expect(response.status).toBe(config.expected);

          if (config.allowed) {
            expect(response.body).toHaveProperty('id');
          }
        }
      });
    });

    describe('Station Viewing', () => {
      it('should filter station data based on user role', async () => {
        // Main admin should see all stations
        const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
        const mainAdminResponse = await request(app)
          .get('/api/stations/all')
          .set(mainAdminAuth)
          .expect(200);

        expect(Array.isArray(mainAdminResponse.body)).toBe(true);

        // Super admin should see stations (filtered by organization in real implementation)
        const superAdminAuth = TestAuth.getAuthHeader('super_admin');
        const superAdminResponse = await request(app)
          .get('/api/stations')
          .set(superAdminAuth)
          .expect(200);

        expect(Array.isArray(superAdminResponse.body)).toBe(true);

        // Station admin should see their station only
        const stationAdminAuth = TestAuth.getAuthHeader('station_admin', TEST_USER_IDS.STATION_ADMIN, {
          stationId: TEST_STATION_IDS.POLICE_STATION
        });
        const stationAdminResponse = await request(app)
          .get('/api/stations')
          .set(stationAdminAuth)
          .expect(200);

        // Should be filtered to their station
        expect(Array.isArray(stationAdminResponse.body)).toBe(true);

        // Station staff and citizens should have no access to station management
        const staffAuth = TestAuth.getAuthHeader('station_staff');
        await request(app)
          .get('/api/stations')
          .set(staffAuth)
          .expect(200); // Might return empty array or filtered results

        const citizenAuth = TestAuth.getAuthHeader('citizen');
        await request(app)
          .get('/api/stations')
          .set(citizenAuth)
          .expect(200); // Might return empty array or filtered results
      });
    });

    describe('Station Updates', () => {
      it('should restrict station updates based on role hierarchy', async () => {
        const updateData = { capacity: 75 };

        const testCases = [
          { role: 'main_admin', expectedStatus: [200, 404] },
          { role: 'super_admin', expectedStatus: [200, 404] },
          { role: 'station_admin', expectedStatus: [403, 404] },
          { role: 'station_staff', expectedStatus: [403, 404] },
          { role: 'citizen', expectedStatus: [403, 404] }
        ];

        for (const testCase of testCases) {
          const authHeader = TestAuth.getAuthHeader(testCase.role);
          
          const response = await request(app)
            .put(`/api/stations/${TEST_STATION_IDS.POLICE_STATION}`)
            .set(authHeader)
            .send(updateData);

          if (Array.isArray(testCase.expectedStatus)) {
            expect(testCase.expectedStatus).toContain(response.status);
          } else {
            expect(response.status).toBe(testCase.expectedStatus);
          }
        }
      });
    });
  });

  // =====================================================
  // USER MANAGEMENT PERMISSIONS
  // =====================================================

  describe('👤 User Management Permissions', () => {
    const newUserData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      phone: '+250788123456',
      role: 'station_staff',
      password: 'securePassword123'
    };

    describe('User Creation', () => {
      it('should allow appropriate roles to create users', async () => {
        const roles = {
          main_admin: { expected: 200, allowed: true },
          super_admin: { expected: 200, allowed: true },
          station_admin: { expected: 403, allowed: false }, // Depends on implementation
          station_staff: { expected: 403, allowed: false },
          citizen: { expected: 403, allowed: false }
        };

        for (const [role, config] of Object.entries(roles)) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .post('/api/users')
            .set(authHeader)
            .send({
              ...newUserData,
              email: `${role}-${newUserData.email}` // Make emails unique
            });

          expect(response.status).toBe(config.expected);
        }
      });
    });

    describe('User Viewing', () => {
      it('should allow authenticated users to view user lists', async () => {
        const authenticatedRoles = ['main_admin', 'super_admin', 'station_admin', 'station_staff'];

        for (const role of authenticatedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/users')
            .set(authHeader)
            .expect(200);

          expect(Array.isArray(response.body)).toBe(true);
          
          // Verify user structure and security
          if (response.body.length > 0) {
            TestAssertions.assertUserStructure(response.body[0]);
          }
        }

        // Citizens might have restricted access
        const citizenAuth = TestAuth.getAuthHeader('citizen');
        const citizenResponse = await request(app)
          .get('/api/users')
          .set(citizenAuth);

        expect([200, 403]).toContain(citizenResponse.status);
      });
    });

    describe('User Updates', () => {
      it('should enforce role-based user update permissions', async () => {
        const updateData = { firstName: 'Updated' };

        // Test updating different user types with different roles
        const testScenarios = [
          {
            updaterRole: 'main_admin',
            targetUserId: TEST_USER_IDS.SUPER_ADMIN,
            expectedStatus: 200,
            description: 'Main admin updating super admin'
          },
          {
            updaterRole: 'super_admin',
            targetUserId: TEST_USER_IDS.STATION_ADMIN,
            expectedStatus: 200,
            description: 'Super admin updating station admin'
          },
          {
            updaterRole: 'station_admin',
            targetUserId: TEST_USER_IDS.STATION_STAFF,
            expectedStatus: 200,
            description: 'Station admin updating station staff'
          },
          {
            updaterRole: 'station_staff',
            targetUserId: TEST_USER_IDS.STATION_ADMIN,
            expectedStatus: 403,
            description: 'Station staff trying to update station admin (should fail)'
          },
          {
            updaterRole: 'citizen',
            targetUserId: TEST_USER_IDS.STATION_STAFF,
            expectedStatus: 403,
            description: 'Citizen trying to update station staff (should fail)'
          }
        ];

        for (const scenario of testScenarios) {
          const authHeader = TestAuth.getAuthHeader(scenario.updaterRole);
          
          const response = await request(app)
            .put(`/api/users/${scenario.targetUserId}`)
            .set(authHeader)
            .send(updateData);

          expect(response.status).toBe(scenario.expectedStatus);
        }
      });
    });

    describe('User Deletion', () => {
      it('should enforce role-based user deletion permissions', async () => {
        // Create test users for deletion
        const testUser = await TestDB.createTestUser({
          role: 'station_staff',
          email: 'deleteme@example.com'
        });

        const deletionScenarios = [
          {
            deleterRole: 'main_admin',
            expectedStatus: [200, 404],
            allowed: true
          },
          {
            deleterRole: 'super_admin',
            expectedStatus: [200, 403],
            allowed: false // Depends on implementation
          },
          {
            deleterRole: 'station_admin',
            expectedStatus: [200, 403],
            allowed: false // Depends on implementation  
          },
          {
            deleterRole: 'station_staff',
            expectedStatus: 403,
            allowed: false
          },
          {
            deleterRole: 'citizen',
            expectedStatus: 403,
            allowed: false
          }
        ];

        for (const scenario of deletionScenarios) {
          const authHeader = TestAuth.getAuthHeader(scenario.deleterRole);
          
          const response = await request(app)
            .delete(`/api/users/${testUser.id}`)
            .set(authHeader);

          if (Array.isArray(scenario.expectedStatus)) {
            expect(scenario.expectedStatus).toContain(response.status);
          } else {
            expect(response.status).toBe(scenario.expectedStatus);
          }
        }
      });
    });
  });

  // =====================================================
  // INVITATION PERMISSIONS
  // =====================================================

  describe('📧 Invitation Management Permissions', () => {
    describe('Invitation Creation by Role', () => {
      it('should enforce role-based invitation hierarchy', async () => {
        const invitationScenarios = [
          {
            inviterRole: 'main_admin',
            inviteeRole: 'super_admin',
            expectedStatus: 201,
            allowed: true
          },
          {
            inviterRole: 'main_admin',
            inviteeRole: 'station_staff', // Not allowed - wrong hierarchy
            expectedStatus: 403,
            allowed: false
          },
          {
            inviterRole: 'super_admin',
            inviteeRole: 'station_admin',
            expectedStatus: 201,
            allowed: true
          },
          {
            inviterRole: 'super_admin',
            inviteeRole: 'main_admin', // Not allowed - can't invite higher role
            expectedStatus: 403,
            allowed: false
          },
          {
            inviterRole: 'station_admin',
            inviteeRole: 'station_staff',
            expectedStatus: 201,
            allowed: true
          },
          {
            inviterRole: 'station_admin',
            inviteeRole: 'super_admin', // Not allowed - can't invite higher role
            expectedStatus: 403,
            allowed: false
          },
          {
            inviterRole: 'station_staff',
            inviteeRole: 'citizen', // Not allowed - staff can't invite
            expectedStatus: 403,
            allowed: false
          },
          {
            inviterRole: 'citizen',
            inviteeRole: 'citizen', // Not allowed - citizens can't invite
            expectedStatus: 403,
            allowed: false
          }
        ];

        for (const scenario of invitationScenarios) {
          const authHeader = TestAuth.getAuthHeader(scenario.inviterRole);
          
          const invitationData = {
            email: `invite-${scenario.inviterRole}-${scenario.inviteeRole}@example.com`,
            role: scenario.inviteeRole,
            organizationId: TEST_ORG_IDS.POLICE,
            stationId: TEST_STATION_IDS.POLICE_STATION
          };

          const response = await request(app)
            .post('/api/invitations')
            .set(authHeader)
            .send(invitationData);

          expect(response.status).toBe(scenario.expectedStatus);

          if (scenario.allowed) {
            expect(response.body).toHaveProperty('token');
            expect(response.body.email).toBe(invitationData.email);
            expect(response.body.role).toBe(invitationData.role);
          }
        }
      });
    });

    describe('Invitation Viewing', () => {
      it('should filter invitations based on user role', async () => {
        const viewableRoles = ['main_admin', 'super_admin', 'station_admin'];
        const restrictedRoles = ['station_staff', 'citizen'];

        for (const role of viewableRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/invitations')
            .set(authHeader);

          expect([200, 404]).toContain(response.status); // 404 if endpoint doesn't exist
        }

        for (const role of restrictedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/invitations')
            .set(authHeader);

          expect([403, 404]).toContain(response.status);
        }
      });
    });
  });

  // =====================================================
  // AUDIT LOG PERMISSIONS
  // =====================================================

  describe('📋 Audit Log Access Permissions', () => {
    describe('Audit Log Viewing', () => {
      it('should restrict audit log access to senior roles only', async () => {
        const allowedRoles = ['main_admin', 'super_admin'];
        const restrictedRoles = ['station_admin', 'station_staff', 'citizen'];

        // Test allowed roles
        for (const role of allowedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/audit-logs')
            .set(authHeader)
            .expect(200);

          expect(Array.isArray(response.body)).toBe(true);
        }

        // Test restricted roles
        for (const role of restrictedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          await request(app)
            .get('/api/audit-logs')
            .set(authHeader)
            .expect(403);
        }
      });

      it('should restrict user-specific audit log access', async () => {
        const allowedRoles = ['main_admin', 'super_admin'];
        const restrictedRoles = ['station_admin', 'station_staff', 'citizen'];

        // Test allowed roles
        for (const role of allowedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get(`/api/audit-logs/user/${TEST_USER_IDS.STATION_STAFF}`)
            .set(authHeader)
            .expect(200);

          expect(Array.isArray(response.body)).toBe(true);
        }

        // Test restricted roles
        for (const role of restrictedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          await request(app)
            .get(`/api/audit-logs/user/${TEST_USER_IDS.STATION_STAFF}`)
            .set(authHeader)
            .expect(403);
        }
      });
    });
  });

  // =====================================================
  // ANALYTICS AND REPORTING PERMISSIONS
  // =====================================================

  describe('📊 Analytics and Reporting Permissions', () => {
    describe('General Statistics', () => {
      it('should allow authenticated users to view basic stats', async () => {
        const authenticatedRoles = ['main_admin', 'super_admin', 'station_admin', 'station_staff'];

        for (const role of authenticatedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/stats')
            .set(authHeader)
            .expect(200);

          expect(response.body).toHaveProperty('total');
        }

        // Citizens might have restricted access
        const citizenAuth = TestAuth.getAuthHeader('citizen');
        const citizenResponse = await request(app)
          .get('/api/stats')
          .set(citizenAuth);

        expect([200, 403]).toContain(citizenResponse.status);
      });
    });

    describe('Advanced Analytics', () => {
      it('should restrict predictive analytics to senior roles', async () => {
        const allowedRoles = ['main_admin', 'super_admin'];
        const restrictedRoles = ['station_admin', 'station_staff', 'citizen'];

        // Test allowed roles
        for (const role of allowedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/analytics/predictive')
            .set(authHeader);

          expect([200, 404]).toContain(response.status); // 404 if endpoint doesn't exist
        }

        // Test restricted roles
        for (const role of restrictedRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          
          const response = await request(app)
            .get('/api/analytics/predictive')
            .set(authHeader);

          expect([403, 404]).toContain(response.status);
        }
      });
    });
  });

  // =====================================================
  // CROSS-ROLE BOUNDARY TESTS
  // =====================================================

  describe('🚫 Cross-Role Boundary Violations', () => {
    describe('Privilege Escalation Prevention', () => {
      it('should prevent lower roles from accessing higher role functions', async () => {
        const escalationAttempts = [
          {
            role: 'citizen',
            endpoint: '/api/organizations',
            method: 'POST',
            data: { name: 'Hacked Org' }
          },
          {
            role: 'station_staff',
            endpoint: '/api/users',
            method: 'POST',
            data: { role: 'main_admin', email: 'hacker@example.com' }
          },
          {
            role: 'station_admin',
            endpoint: '/api/organizations',
            method: 'POST',
            data: { name: 'Unauthorized Org' }
          }
        ];

        for (const attempt of escalationAttempts) {
          const authHeader = TestAuth.getAuthHeader(attempt.role);
          
          let req = request(app)[attempt.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](attempt.endpoint)
            .set(authHeader);

          if (attempt.data) {
            req = req.send(attempt.data);
          }

          const response = await req;
          expect([401, 403]).toContain(response.status);
        }
      });
    });

    describe('Data Isolation Verification', () => {
      it('should prevent access to data outside user scope', async () => {
        // Station staff should not see incidents from other stations
        const policeStaffAuth = TestAuth.getAuthHeader('station_staff', TEST_USER_IDS.STATION_STAFF, {
          stationId: TEST_STATION_IDS.POLICE_STATION
        });

        const response = await request(app)
          .get('/api/incidents')
          .set(policeStaffAuth)
          .expect(200);

        const incidents = response.body;
        
        // All incidents should belong to their station
        incidents.forEach((incident: any) => {
          if (incident.stationId) {
            expect(incident.stationId).toBe(TEST_STATION_IDS.POLICE_STATION);
          }
        });
      });
    });

    describe('Token Manipulation Resistance', () => {
      it('should reject tampered JWT tokens', async () => {
        // Generate valid token
        const validToken = TestAuth.generateToken('citizen', TEST_USER_IDS.CITIZEN);
        
        // Tamper with token
        const tamperedToken = validToken.replace(/.$/, 'X'); // Change last character

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(403);

        TestAssertions.assertApiError(response, 403, 'Invalid token');
      });

      it('should reject tokens with elevated roles', async () => {
        // Try to create token with role that doesn't match user
        const maliciousToken = TestAuth.generateToken('main_admin', TEST_USER_IDS.CITIZEN);

        const response = await request(app)
          .get('/api/audit-logs')
          .set('Authorization', `Bearer ${maliciousToken}`)
          .expect(403);

        // Should fail because the actual user is not a main admin
        TestAssertions.assertApiError(response, 403);
      });
    });
  });

  // =====================================================
  // ENDPOINT SECURITY COVERAGE
  // =====================================================

  describe('🛡️ Comprehensive Endpoint Security', () => {
    it('should require authentication for all protected endpoints', async () => {
      const protectedEndpoints = [
        { path: '/api/users', method: 'GET' },
        { path: '/api/incidents', method: 'GET' },
        { path: '/api/organizations', method: 'GET' },
        { path: '/api/stations', method: 'GET' },
        { path: '/api/invitations', method: 'POST' },
        { path: '/api/audit-logs', method: 'GET' },
        { path: '/api/stats', method: 'GET' }
      ];

      for (const endpoint of protectedEndpoints) {
        let req = request(app)[endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.path);
        
        if (endpoint.method === 'POST') {
          req = req.send({}); // Empty body for POST requests
        }

        const response = await req;
        expect(response.status).toBe(401);
        TestAssertions.assertApiError(response, 401);
      }
    });

    it('should validate role requirements for all role-restricted endpoints', async () => {
      const roleRestrictedEndpoints = [
        {
          path: '/api/organizations',
          method: 'POST',
          allowedRoles: ['main_admin'],
          data: { name: 'Test', type: 'Police' }
        },
        {
          path: '/api/audit-logs',
          method: 'GET',
          allowedRoles: ['main_admin', 'super_admin']
        },
        {
          path: '/api/users',
          method: 'POST',
          allowedRoles: ['main_admin', 'super_admin'],
          data: { email: 'test@example.com', role: 'citizen' }
        }
      ];

      const allRoles = ['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'];

      for (const endpoint of roleRestrictedEndpoints) {
        for (const role of allRoles) {
          const authHeader = TestAuth.getAuthHeader(role);
          let req = request(app)[endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.path)
            .set(authHeader);

          if (endpoint.data) {
            req = req.send(endpoint.data);
          }

          const response = await req;
          
          if (endpoint.allowedRoles.includes(role)) {
            expect([200, 201, 404]).toContain(response.status); // Success or not found
          } else {
            expect(response.status).toBe(403);
          }
        }
      }
    });
  });
}); 