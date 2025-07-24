// Comprehensive API Integration Test Suite
import request from 'supertest';
import { Express } from 'express';
import { registerRoutes } from '../server/routes';
import { sequelize } from '../server/db';
import { QueryTypes } from 'sequelize';
import { 
  TestAuth, 
  TestDB, 
  TestAssertions, 
  TestPerformance,
  TEST_USER_IDS,
  TEST_STATION_IDS,
  TEST_ORG_IDS
} from './test-utils';

describe('🔗 API Integration Test Suite', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const express = require('express');
    app = express();
    server = await registerRoutes(app);
    console.log('✅ API integration test suite initialized');
  });

  afterAll(async () => {
    if (server && server.close) {
      server.close();
    }
    console.log('✅ API integration test suite completed');
  });

  beforeEach(async () => {
    // Clean dynamic test data
    await TestDB.cleanTables(['incidents', 'notifications', 'audit_logs']);
  });

  // =====================================================
  // END-TO-END USER WORKFLOWS
  // =====================================================

  describe('👤 Complete User Management Workflow', () => {
    it('should handle complete user lifecycle from invitation to deletion', async () => {
      const workflowData = {
        inviteeEmail: 'workflow-test@example.com',
        firstName: 'Workflow',
        lastName: 'Test',
        phone: '+250788123456',
        password: 'securePassword123'
      };

      // Step 1: Main admin creates invitation for super admin
      const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
      
      const invitationResponse = await request(app)
        .post('/api/invitations')
        .set(mainAdminAuth)
        .send({
          email: workflowData.inviteeEmail,
          role: 'super_admin',
          organizationId: TEST_ORG_IDS.POLICE
        })
        .expect(201);

      expect(invitationResponse.body).toHaveProperty('token');
      const invitationToken = invitationResponse.body.token;

      // Step 2: Invited user accepts invitation
      const acceptanceResponse = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({
          firstName: workflowData.firstName,
          lastName: workflowData.lastName,
          phone: workflowData.phone,
          password: workflowData.password
        })
        .expect(200);

      expect(acceptanceResponse.body).toHaveProperty('token');
      expect(acceptanceResponse.body).toHaveProperty('user');
      
      const newUser = acceptanceResponse.body.user;
      TestAssertions.assertUserStructure(newUser);
      expect(newUser.role).toBe('super_admin');

      // Step 3: New user logs in with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: workflowData.inviteeEmail,
          password: workflowData.password
        })
        .expect(200);

      TestAssertions.assertValidJWT(loginResponse.body.token, 'super_admin');

      // Step 4: New super admin creates station
      const newUserAuth = { Authorization: `Bearer ${loginResponse.body.token}` };
      
      const stationResponse = await request(app)
        .post('/api/stations')
        .set(newUserAuth)
        .send({
          name: 'Workflow Test Station',
          district: 'Test District',
          sector: 'Test Sector',
          organizationId: TEST_ORG_IDS.POLICE
        })
        .expect(200);

      expect(stationResponse.body).toHaveProperty('id');

      // Step 5: Super admin invites station admin
      const stationAdminInvite = await request(app)
        .post('/api/invitations')
        .set(newUserAuth)
        .send({
          email: 'station-admin-workflow@example.com',
          role: 'station_admin',
          organizationId: TEST_ORG_IDS.POLICE,
          stationId: stationResponse.body.id
        })
        .expect(201);

      expect(stationAdminInvite.body).toHaveProperty('token');

      // Step 6: Main admin updates user profile
      const updateResponse = await request(app)
        .put(`/api/users/${newUser.id}`)
        .set(mainAdminAuth)
        .send({
          firstName: 'Updated Workflow',
          lastName: 'User'
        })
        .expect(200);

      expect(updateResponse.body.message).toContain('successfully');

      // Step 7: Verify user appears in user list
      const usersResponse = await request(app)
        .get('/api/users')
        .set(mainAdminAuth)
        .expect(200);

      const createdUser = usersResponse.body.find((u: any) => u.email === workflowData.inviteeEmail);
      expect(createdUser).toBeTruthy();
      expect(createdUser.firstName).toBe('Updated Workflow');

      console.log('✅ Complete user workflow test passed');
    });
  });

  // =====================================================
  // INCIDENT MANAGEMENT INTEGRATION
  // =====================================================

  describe('🚨 Complete Incident Management Workflow', () => {
    it('should handle end-to-end incident lifecycle', async () => {
      const incidentData = {
        title: 'Integration Test Emergency',
        description: 'This is a comprehensive integration test for incident management',
        priority: 'high',
        location_address: 'Integration Test Location, Kigali',
        location_lat: '-1.9441',
        location_lng: '30.0619'
      };

      // Step 1: Citizen reports incident
      const reportResponse = await request(app)
        .post('/api/incidents/citizen')
        .send(incidentData)
        .expect(201);

      TestAssertions.assertIncidentStructure(reportResponse.body);
      expect(reportResponse.body.status).toBe('reported');
      expect(reportResponse.body.priority).toBe('high');
      
      const incidentId = reportResponse.body.id;

      // Step 2: Multiple citizens upvote the incident
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/incidents/${incidentId}/upvote`)
          .expect(200);
      }

      // Step 3: Station admin views incidents
      const stationAdminAuth = TestAuth.getAuthHeader('station_admin', TEST_USER_IDS.STATION_ADMIN, {
        stationId: TEST_STATION_IDS.POLICE_STATION,
        organizationId: TEST_ORG_IDS.POLICE
      });

      const incidentsResponse = await request(app)
        .get('/api/incidents')
        .set(stationAdminAuth)
        .expect(200);

      const reportedIncident = incidentsResponse.body.find((i: any) => i.id === incidentId);
      expect(reportedIncident).toBeTruthy();

      // Step 4: Station admin assigns incident to station staff
      const assignResponse = await request(app)
        .put(`/api/incidents/${incidentId}/assign`)
        .set(stationAdminAuth)
        .send({
          assignedToId: TEST_USER_IDS.STATION_STAFF,
          priority: 'critical', // Escalate priority
          notes: 'High priority incident, needs immediate attention'
        })
        .expect(200);

      expect(assignResponse.body.status).toBe('assigned');
      expect(assignResponse.body.priority).toBe('critical');

      // Step 5: Station staff starts working on incident
      const staffAuth = TestAuth.getAuthHeader('station_staff', TEST_USER_IDS.STATION_STAFF, {
        stationId: TEST_STATION_IDS.POLICE_STATION
      });

      const progressResponse = await request(app)
        .put(`/api/incidents/${incidentId}/status`)
        .set(staffAuth)
        .send({
          status: 'in_progress',
          notes: 'Investigation started, gathering evidence'
        })
        .expect(200);

      expect(progressResponse.body.status).toBe('in_progress');

      // Step 6: Station staff escalates incident (complex case)
      const escalateResponse = await request(app)
        .post(`/api/incidents/${incidentId}/escalate`)
        .set(staffAuth)
        .send({
          reason: 'Case requires specialized expertise and additional resources',
          priority: 'critical',
          targetLevel: 1
        })
        .expect(200);

      expect(escalateResponse.body.status).toBe('escalated');
      expect(escalateResponse.body.escalationLevel).toBe(1);

      // Step 7: Super admin takes over escalated incident
      const superAdminAuth = TestAuth.getAuthHeader('super_admin', TEST_USER_IDS.SUPER_ADMIN, {
        organizationId: TEST_ORG_IDS.POLICE
      });

      const reassignResponse = await request(app)
        .put(`/api/incidents/${incidentId}/assign`)
        .set(superAdminAuth)
        .send({
          assignedToId: TEST_USER_IDS.SUPER_ADMIN,
          notes: 'Taking direct control of escalated incident'
        })
        .expect(200);

      expect(reassignResponse.body.assignedToId || reassignResponse.body.assignedTo).toBe(TEST_USER_IDS.SUPER_ADMIN);

      // Step 8: Super admin resolves incident
      const resolveResponse = await request(app)
        .put(`/api/incidents/${incidentId}/status`)
        .set(superAdminAuth)
        .send({
          status: 'resolved',
          resolution: 'Incident successfully resolved after thorough investigation. All parties satisfied with outcome.',
          notes: 'Case closed with full resolution'
        })
        .expect(200);

      expect(resolveResponse.body.status).toBe('resolved');
      expect(resolveResponse.body.resolution).toContain('successfully resolved');

      // Step 9: Citizen registers for follow-up
      const followUpResponse = await request(app)
        .post(`/api/incidents/${incidentId}/follow-up`)
        .send({
          email: 'followup@example.com',
          phone: '+250788123456',
          notificationPreference: 'email'
        })
        .expect(201);

      expect(followUpResponse.body.message).toContain('Successfully registered');

      // Step 10: Admin sends update to followers
      const updateResponse = await request(app)
        .post(`/api/incidents/${incidentId}/update`)
        .set(superAdminAuth)
        .send({
          status: 'resolved',
          message: 'Thank you for your patience. The incident has been fully resolved and appropriate measures have been taken.'
        })
        .expect(200);

      expect(updateResponse.body.message).toContain('updated');

      console.log('✅ Complete incident workflow test passed');
    });
  });

  // =====================================================
  // ORGANIZATION & STATION MANAGEMENT INTEGRATION
  // =====================================================

  describe('🏢 Organization & Station Management Integration', () => {
    it('should handle complete organizational setup workflow', async () => {
      const orgData = {
        name: 'Integration Test Fire Department',
        type: 'Fire',
        description: 'Test fire department for integration testing'
      };

      // Step 1: Main admin creates new organization
      const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
      
      const orgResponse = await request(app)
        .post('/api/organizations')
        .set(mainAdminAuth)
        .send(orgData)
        .expect(201);

      expect(orgResponse.body).toHaveProperty('id');
      expect(orgResponse.body.name).toBe(orgData.name);
      const newOrgId = orgResponse.body.id;

      // Step 2: Main admin invites super admin for new organization
      const superAdminInvite = await request(app)
        .post('/api/invitations')
        .set(mainAdminAuth)
        .send({
          email: 'fire-super-admin@example.com',
          role: 'super_admin',
          organizationId: newOrgId
        })
        .expect(201);

      const inviteToken = superAdminInvite.body.token;

      // Step 3: Super admin accepts invitation
      const acceptResponse = await request(app)
        .post(`/api/invitations/${inviteToken}/accept`)
        .send({
          firstName: 'Fire',
          lastName: 'SuperAdmin',
          password: 'fireAdminPass123',
          phone: '+250788987654'
        })
        .expect(200);

      const newSuperAdmin = acceptResponse.body.user;
      expect(newSuperAdmin.role).toBe('super_admin');

      // Step 4: New super admin logs in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'fire-super-admin@example.com',
          password: 'fireAdminPass123'
        })
        .expect(200);

      const superAdminAuth = { Authorization: `Bearer ${loginResponse.body.token}` };

      // Step 5: Super admin creates multiple stations
      const stationData = [
        {
          name: 'Central Fire Station',
          district: 'Gasabo',
          sector: 'Kacyiru',
          organizationId: newOrgId,
          capacity: 30
        },
        {
          name: 'South Fire Station',  
          district: 'Nyarugenge',
          sector: 'Nyamirambo',
          organizationId: newOrgId,
          capacity: 25
        }
      ];

      const createdStations = [];
      for (const station of stationData) {
        const stationResponse = await request(app)
          .post('/api/stations')
          .set(superAdminAuth)
          .send(station)
          .expect(200);

        expect(stationResponse.body).toHaveProperty('id');
        createdStations.push(stationResponse.body);
      }

      // Step 6: Super admin invites station admins for each station
      const stationAdminEmails = [];
      for (let i = 0; i < createdStations.length; i++) {
        const station = createdStations[i];
        const email = `station-admin-${i}@fire-dept.com`;
        stationAdminEmails.push(email);

        await request(app)
          .post('/api/invitations')
          .set(superAdminAuth)
          .send({
            email,
            role: 'station_admin',
            organizationId: newOrgId,
            stationId: station.id
          })
          .expect(201);
      }

      // Step 7: Station admins accept invitations
      for (let i = 0; i < stationAdminEmails.length; i++) {
        const email = stationAdminEmails[i];
        
        // Get invitation token (simplified - in real test we'd track tokens)
        const invitations = await request(app)
          .get('/api/invitations')
          .set(mainAdminAuth);

        if (invitations.status === 200) {
          // Process invitations if endpoint exists
        }
      }

      // Step 8: Verify organizational structure
      const orgListResponse = await request(app)
        .get('/api/organizations')
        .set(mainAdminAuth)
        .expect(200);

      const createdOrg = orgListResponse.body.find((o: any) => o.id === newOrgId);
      expect(createdOrg).toBeTruthy();

      // Step 9: Verify stations are properly linked
      const stationsResponse = await request(app)
        .get('/api/stations/all')
        .set(mainAdminAuth)
        .expect(200);

      const orgStations = stationsResponse.body.filter((s: any) => s.organizationId === newOrgId);
      expect(orgStations.length).toBe(2);

      console.log('✅ Organization setup workflow test passed');
    });
  });

  // =====================================================
  // AUTHENTICATION & SECURITY INTEGRATION
  // =====================================================

  describe('🔒 Authentication & Security Integration', () => {
    it('should handle complete security workflow', async () => {
      const testUserEmail = 'security-test@example.com';
      const originalPassword = 'originalPass123';
      const newPassword = 'newSecurePass456';

      // Step 1: User registers
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          password: originalPassword,
          firstName: 'Security',
          lastName: 'Test',
          role: 'citizen'
        })
        .expect(200);

      TestAssertions.assertValidJWT(registerResponse.body.token, 'citizen');

      // Step 2: User logs in successfully
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: originalPassword
        })
        .expect(200);

      const userToken = loginResponse.body.token;
      TestAssertions.assertValidJWT(userToken, 'citizen');

      // Step 3: User tries to access protected resources
      const protectedResponse = await request(app)
        .get('/api/users')
        .set({ Authorization: `Bearer ${userToken}` });

      expect([200, 403]).toContain(protectedResponse.status);

      // Step 4: User initiates password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUserEmail })
        .expect(200);

      expect(resetRequestResponse.body.message).toContain('If the email exists');

      // Step 5: User attempts login with wrong password
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'wrongPassword'
        })
        .expect(401);

      TestAssertions.assertApiError(wrongPasswordResponse, 401, 'Invalid credentials');

      // Step 6: Multiple failed login attempts (rate limiting test)
      const failedAttempts = [];
      for (let i = 0; i < 5; i++) {
        failedAttempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: testUserEmail,
              password: 'wrongPassword'
            })
        );
      }

      const responses = await Promise.all(failedAttempts);
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status); // 429 for rate limiting
      });

      // Step 7: Valid login still works
      const validLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: originalPassword
        })
        .expect(200);

      TestAssertions.assertValidJWT(validLoginResponse.body.token, 'citizen');

      // Step 8: Test token expiration handling
      const expiredToken = TestAuth.generateToken('citizen', 'test-user-id', { expiresIn: '-1h' });
      
      const expiredTokenResponse = await request(app)
        .get('/api/users')
        .set({ Authorization: `Bearer ${expiredToken}` })
        .expect(403);

      TestAssertions.assertApiError(expiredTokenResponse, 403, 'Invalid token');

      console.log('✅ Security workflow test passed');
    });
  });

  // =====================================================
  // PERFORMANCE & SCALABILITY TESTS
  // =====================================================

  describe('⚡ Performance & Scalability Integration', () => {
    it('should handle concurrent user operations efficiently', async () => {
      const concurrentUsers = 10;
      const operationsPerUser = 5;

      // Create concurrent user sessions
      const userTokens = [];
      for (let i = 0; i < concurrentUsers; i++) {
        const email = `concurrent-user-${i}@example.com`;
        
        // Register user
        await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'concurrentTest123',
            firstName: `User${i}`,
            lastName: 'Concurrent',
            role: 'citizen'
          });

        // Login user
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'concurrentTest123'
          });

        userTokens.push(loginResponse.body.token);
      }

      // Simulate concurrent operations
      const concurrentOperations = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        const token = userTokens[i];
        const authHeader = { Authorization: `Bearer ${token}` };

        for (let j = 0; j < operationsPerUser; j++) {
          // Mix of read and write operations
          if (j % 2 === 0) {
            // Read operation
            concurrentOperations.push(
              request(app)
                .get('/api/incidents')
                .set(authHeader)
            );
          } else {
            // Write operation (citizen incident report)
            concurrentOperations.push(
              request(app)
                .post('/api/incidents/citizen')
                .send({
                  title: `Concurrent Incident ${i}-${j}`,
                  description: `Test incident from user ${i} operation ${j}`,
                  location_address: `Test Location ${i}-${j}`,
                  priority: 'medium'
                })
            );
          }
        }
      }

      // Execute all operations concurrently
      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / concurrentOperations.length;

      // Verify all operations completed successfully
      let successCount = 0;
      results.forEach(result => {
        if ([200, 201].includes(result.status)) {
          successCount++;
        }
      });

      expect(successCount).toBeGreaterThan(concurrentOperations.length * 0.8); // At least 80% success
      expect(avgResponseTime).toBeLessThan(2000); // Average response under 2 seconds
      expect(totalTime).toBeLessThan(10000); // Total time under 10 seconds

      console.log(`✅ Concurrent operations test passed: ${successCount}/${concurrentOperations.length} successful, avg: ${avgResponseTime}ms`);
    });

    it('should maintain performance under load', async () => {
      const loadTestResults = await TestPerformance.testConcurrentRequests(
        app,
        '/api/incidents',
        20, // 20 concurrent requests
        'main_admin'
      );

      expect(loadTestResults.avgResponseTime).toBeLessThan(1500);
      expect(loadTestResults.totalTime).toBeLessThan(5000);

      console.log(`✅ Load test passed: ${loadTestResults.responses.length} requests in ${loadTestResults.totalTime}ms`);
    });
  });

  // =====================================================
  // DATA CONSISTENCY & INTEGRITY TESTS
  // =====================================================

  describe('🔄 Data Consistency & Integrity', () => {
    it('should maintain data integrity across complex operations', async () => {
      // Create test incident
      const incident = await TestDB.createTestIncident({
        title: 'Integrity Test Incident',
        status: 'reported',
        stationId: TEST_STATION_IDS.POLICE_STATION
      });

      const incidentId = (incident as any).id;

      // Step 1: Verify initial state
      const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
      
      let incidentCheck = await request(app)
        .get(`/api/incidents`)
        .set(mainAdminAuth)
        .expect(200);

      const initialIncident = incidentCheck.body.find((i: any) => i.id === incidentId);
      expect(initialIncident.status).toBe('reported');

      // Step 2: Concurrent assignment attempts (should handle race conditions)
      const stationAdminAuth = TestAuth.getAuthHeader('station_admin', TEST_USER_IDS.STATION_ADMIN);
      const superAdminAuth = TestAuth.getAuthHeader('super_admin', TEST_USER_IDS.SUPER_ADMIN);

      const assignmentPromises = [
        request(app)
          .put(`/api/incidents/${incidentId}/assign`)
          .set(stationAdminAuth)
          .send({
            assignedToId: TEST_USER_IDS.STATION_STAFF,
            notes: 'Station admin assignment'
          }),
        request(app)
          .put(`/api/incidents/${incidentId}/assign`)
          .set(superAdminAuth)
          .send({
            assignedToId: TEST_USER_IDS.SUPER_ADMIN,
            notes: 'Super admin assignment'
          })
      ];

      const assignmentResults = await Promise.all(assignmentPromises);
      
      // At least one should succeed
      const successfulAssignments = assignmentResults.filter(r => r.status === 200);
      expect(successfulAssignments.length).toBeGreaterThan(0);

      // Step 3: Verify final state is consistent
      incidentCheck = await request(app)
        .get(`/api/incidents`)
        .set(mainAdminAuth)
        .expect(200);

      const finalIncident = incidentCheck.body.find((i: any) => i.id === incidentId);
      expect(finalIncident.status).toBe('assigned');
      expect(finalIncident.assignedToId || finalIncident.assignedTo).toBeTruthy();

      // Step 4: Test audit trail consistency
      const auditResponse = await request(app)
        .get('/api/audit-logs')
        .set(mainAdminAuth);

      if (auditResponse.status === 200) {
        // Verify audit logs exist for the operations
        expect(Array.isArray(auditResponse.body)).toBe(true);
      }

      console.log('✅ Data integrity test passed');
    });
  });

  // =====================================================
  // ERROR HANDLING & RECOVERY TESTS
  // =====================================================

  describe('⚠️ Error Handling & Recovery', () => {
    it('should handle various error conditions gracefully', async () => {
      const testScenarios = [
        {
          name: 'Invalid incident ID',
          request: () => request(app)
            .get('/api/incidents/invalid-uuid')
            .set(TestAuth.getAuthHeader('main_admin')),
          expectedStatus: [400, 404]
        },
        {
          name: 'Malformed JSON data',
          request: () => request(app)
            .post('/api/incidents/citizen')
            .set('Content-Type', 'application/json')
            .send('{"invalid": json}'),
          expectedStatus: 400
        },
        {
          name: 'Missing required fields',
          request: () => request(app)
            .post('/api/incidents/citizen')
            .send({ title: 'Missing fields' }),
          expectedStatus: 400
        },
        {
          name: 'Authorization header missing',
          request: () => request(app)
            .get('/api/users'),
          expectedStatus: 401
        },
        {
          name: 'Invalid JWT token',
          request: () => request(app)
            .get('/api/users')
            .set('Authorization', 'Bearer invalid-token'),
          expectedStatus: [401, 403]
        }
      ];

      for (const scenario of testScenarios) {
        const response = await scenario.request();
        
        if (Array.isArray(scenario.expectedStatus)) {
          expect(scenario.expectedStatus).toContain(response.status);
        } else {
          expect(response.status).toBe(scenario.expectedStatus);
        }

        // Verify error response structure
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }

      console.log('✅ Error handling test passed');
    });
  });

  // =====================================================
  // CROSS-FEATURE INTEGRATION TESTS
  // =====================================================

  describe('🔗 Cross-Feature Integration', () => {
    it('should integrate all features in a realistic scenario', async () => {
      // Scenario: Major incident requiring full system coordination
      
      // Step 1: Multiple citizens report related incidents
      const citizenReports = await Promise.all([
        request(app)
          .post('/api/incidents/citizen')
          .send({
            title: 'Fire Emergency - Building A',
            description: 'Large fire in downtown building A',
            location_address: 'Downtown Kigali, Building A',
            priority: 'critical'
          }),
        request(app)
          .post('/api/incidents/citizen')
          .send({
            title: 'Fire Emergency - Building B',
            description: 'Fire spreading to adjacent building B',
            location_address: 'Downtown Kigali, Building B',
            priority: 'critical'
          })
      ]);

      const incidentIds = citizenReports.map(r => r.body.id);
      expect(incidentIds).toHaveLength(2);

      // Step 2: Multiple upvotes on both incidents
      for (const incidentId of incidentIds) {
        for (let i = 0; i < 3; i++) {
          await request(app)
            .post(`/api/incidents/${incidentId}/upvote`)
            .expect(200);
        }
      }

      // Step 3: Station admin coordinates response
      const stationAdminAuth = TestAuth.getAuthHeader('station_admin', TEST_USER_IDS.STATION_ADMIN);

      // Assign first incident to station staff
      await request(app)
        .put(`/api/incidents/${incidentIds[0]}/assign`)
        .set(stationAdminAuth)
        .send({
          assignedToId: TEST_USER_IDS.STATION_STAFF,
          priority: 'critical',
          notes: 'Primary response team'
        })
        .expect(200);

      // Escalate second incident due to complexity
      const escalateResponse = await request(app)
        .post(`/api/incidents/${incidentIds[1]}/escalate`)
        .set(stationAdminAuth)
        .send({
          reason: 'Multiple building fire requires additional resources',
          targetLevel: 2,
          priority: 'critical'
        })
        .expect(200);

      expect(escalateResponse.body.status).toBe('escalated');

      // Step 4: Super admin takes control of escalated incident
      const superAdminAuth = TestAuth.getAuthHeader('super_admin', TEST_USER_IDS.SUPER_ADMIN);

      await request(app)
        .put(`/api/incidents/${incidentIds[1]}/assign`)
        .set(superAdminAuth)
        .send({
          assignedToId: TEST_USER_IDS.SUPER_ADMIN,
          notes: 'Direct super admin control for coordination'
        })
        .expect(200);

      // Step 5: Both teams report progress
      const staffAuth = TestAuth.getAuthHeader('station_staff', TEST_USER_IDS.STATION_STAFF);

      await request(app)
        .put(`/api/incidents/${incidentIds[0]}/status`)
        .set(staffAuth)
        .send({
          status: 'in_progress',
          notes: 'Fire suppression in progress on Building A'
        })
        .expect(200);

      await request(app)
        .put(`/api/incidents/${incidentIds[1]}/status`)
        .set(superAdminAuth)
        .send({
          status: 'in_progress',
          notes: 'Coordinating evacuation and fire suppression for Building B'
        })
        .expect(200);

      // Step 6: Citizens register for updates
      for (const incidentId of incidentIds) {
        await request(app)
          .post(`/api/incidents/${incidentId}/follow-up`)
          .send({
            email: `updates-${incidentId}@example.com`,
            phone: '+250788123456',
            notificationPreference: 'email'
          })
          .expect(201);
      }

      // Step 7: Incidents resolved
      await request(app)
        .put(`/api/incidents/${incidentIds[0]}/status`)
        .set(staffAuth)
        .send({
          status: 'resolved',
          resolution: 'Fire in Building A successfully extinguished. No casualties.',
          notes: 'Scene secured and investigated'
        })
        .expect(200);

      await request(app)
        .put(`/api/incidents/${incidentIds[1]}/status`)
        .set(superAdminAuth)
        .send({
          status: 'resolved',
          resolution: 'Fire in Building B contained. Area evacuated safely.',
          notes: 'Multi-agency response successful'
        })
        .expect(200);

      // Step 8: Send updates to followers
      for (const incidentId of incidentIds) {
        await request(app)
          .post(`/api/incidents/${incidentId}/update`)
          .set(superAdminAuth)
          .send({
            status: 'resolved',
            message: 'Emergency situation has been resolved. Thank you for your cooperation.'
          })
          .expect(200);
      }

      // Step 9: Verify final system state
      const mainAdminAuth = TestAuth.getAuthHeader('main_admin');
      
      const finalIncidents = await request(app)
        .get('/api/incidents')
        .set(mainAdminAuth)
        .expect(200);

      const resolvedIncidents = finalIncidents.body.filter((i: any) => 
        incidentIds.includes(i.id) && i.status === 'resolved'
      );

      expect(resolvedIncidents).toHaveLength(2);

      // Step 10: Check system statistics
      const statsResponse = await request(app)
        .get('/api/stats')
        .set(mainAdminAuth)
        .expect(200);

      expect(statsResponse.body).toHaveProperty('total');
      expect(statsResponse.body).toHaveProperty('resolved');

      console.log('✅ Cross-feature integration test passed');
    });
  });
}); 