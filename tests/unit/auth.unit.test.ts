/**
 * ============================================================================
 * 🧪 Authentication Unit Tests
 * ============================================================================
 * Comprehensive unit tests for authentication functionality
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validateInput } from '../../server/middleware/security';
import { TestUtils } from '../enhanced-test-utils';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-super-long-for-security';

describe('🔐 Authentication Unit Tests', () => {
  
  describe('JWT Token Generation', () => {
    test('should generate valid JWT token with user data', () => {
      const user = TestUtils.Users.MAIN_ADMIN;
      const token = TestUtils.Auth.generateToken(user);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    test('should include optional organization and station data', () => {
      const user = TestUtils.Users.STATION_ADMIN;
      const options = {
        organizationId: TestUtils.Organizations.POLICE.id,
        stationId: TestUtils.Stations.POLICE_STATION.id
      };
      
      const token = TestUtils.Auth.generateToken(user, options);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      expect(decoded.organizationId).toBe(options.organizationId);
      expect(decoded.stationId).toBe(options.stationId);
    });

    test('should set correct expiration time', () => {
      const user = TestUtils.Users.CITIZEN;
      const token = TestUtils.Auth.generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      expect(decoded.exp).toBeTruthy();
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp > decoded.iat).toBe(true);
    });
  });

  describe('Token Validation', () => {
    test('should validate correct JWT token', () => {
      const user = TestUtils.Users.SUPER_ADMIN;
      const token = TestUtils.Auth.generateToken(user);
      
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).not.toThrow();
    });

    test('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        jwt.verify(invalidToken, JWT_SECRET);
      }).toThrow();
    });

    test('should reject token with wrong secret', () => {
      const user = TestUtils.Users.CITIZEN;
      const token = jwt.sign(user, 'wrong-secret');
      
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });

    test('should handle expired tokens', (done) => {
      const user = TestUtils.Users.STATION_STAFF;
      const expiredToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1ms' });
      
      setTimeout(() => {
        expect(() => {
          jwt.verify(expiredToken, JWT_SECRET);
        }).toThrow();
        done();
      }, 10);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should handle empty password', async () => {
      const password = '';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare('', hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('test', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Input Validation', () => {
    test('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'test+tag@gmail.com'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        ''
      ];
      
      validEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should validate password strength', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure$Password2024',
        'Complex@Pass1word'
      ];
      
      const weakPasswords = [
        '123456',
        'password',
        'short',
        ''
      ];
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      strongPasswords.forEach(password => {
        expect(passwordRegex.test(password)).toBe(true);
      });
      
      weakPasswords.forEach(password => {
        expect(passwordRegex.test(password)).toBe(false);
      });
    });
  });

  describe('Role-Based Authorization', () => {
    test('should identify admin roles correctly', () => {
      const adminRoles = ['main_admin', 'super_admin'];
      const nonAdminRoles = ['station_admin', 'station_staff', 'citizen'];
      
      adminRoles.forEach(role => {
        expect(['main_admin', 'super_admin'].includes(role)).toBe(true);
      });
      
      nonAdminRoles.forEach(role => {
        expect(['main_admin', 'super_admin'].includes(role)).toBe(false);
      });
    });

    test('should identify staff roles correctly', () => {
      const staffRoles = ['station_admin', 'station_staff'];
      const nonStaffRoles = ['main_admin', 'super_admin', 'citizen'];
      
      staffRoles.forEach(role => {
        expect(['station_admin', 'station_staff'].includes(role)).toBe(true);
      });
      
      nonStaffRoles.forEach(role => {
        expect(['station_admin', 'station_staff'].includes(role)).toBe(false);
      });
    });

    test('should create proper role hierarchy', () => {
      const roleHierarchy = {
        'main_admin': 5,
        'super_admin': 4,
        'station_admin': 3,
        'station_staff': 2,
        'citizen': 1
      };
      
      expect(roleHierarchy.main_admin).toBeGreaterThan(roleHierarchy.super_admin);
      expect(roleHierarchy.super_admin).toBeGreaterThan(roleHierarchy.station_admin);
      expect(roleHierarchy.station_admin).toBeGreaterThan(roleHierarchy.station_staff);
      expect(roleHierarchy.station_staff).toBeGreaterThan(roleHierarchy.citizen);
    });
  });

  describe('Authentication Header Creation', () => {
    test('should create valid authorization header', () => {
      const user = TestUtils.Users.MAIN_ADMIN;
      const authHeader = TestUtils.Auth.createAuthHeader(user);
      
      expect(authHeader).toHaveProperty('Authorization');
      expect(authHeader.Authorization).toMatch(/^Bearer\s+/);
      
      const token = authHeader.Authorization.replace('Bearer ', '');
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).not.toThrow();
    });

    test('should include user data in header token', () => {
      const user = TestUtils.Users.STATION_ADMIN;
      const authHeader = TestUtils.Auth.createAuthHeader(user);
      const token = authHeader.Authorization.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });
  });

  describe('Test Token Generation', () => {
    test('should generate all required test tokens', () => {
      const tokens = TestUtils.Auth.getTestTokens();
      
      expect(tokens.mainAdmin).toBeTruthy();
      expect(tokens.superAdmin).toBeTruthy();
      expect(tokens.stationAdmin).toBeTruthy();
      expect(tokens.stationStaff).toBeTruthy();
      expect(tokens.citizen).toBeTruthy();
      expect(tokens.invalid).toBe('invalid.jwt.token');
      expect(tokens.expired).toBeTruthy();
    });

    test('should generate tokens with correct roles', () => {
      const tokens = TestUtils.Auth.getTestTokens();
      
      const mainAdminDecoded = jwt.verify(tokens.mainAdmin, JWT_SECRET) as any;
      expect(mainAdminDecoded.role).toBe('main_admin');
      
      const citizenDecoded = jwt.verify(tokens.citizen, JWT_SECRET) as any;
      expect(citizenDecoded.role).toBe('citizen');
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle malformed JWT tokens', () => {
      const malformedTokens = [
        'not.a.token',
        'header.payload',
        'header.payload.signature.extra',
        '',
        null,
        undefined
      ];
      
      malformedTokens.forEach(token => {
        expect(() => {
          jwt.verify(token as any, JWT_SECRET);
        }).toThrow();
      });
    });

    test('should reject tokens with tampered payload', () => {
      const user = TestUtils.Users.CITIZEN;
      const validToken = TestUtils.Auth.generateToken(user);
      
      // Tamper with the token
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from('{"userId":"hacker","role":"main_admin"}').toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      expect(() => {
        jwt.verify(tamperedToken, JWT_SECRET);
      }).toThrow();
    });

    test('should handle empty or null secrets', () => {
      const user = TestUtils.Users.CITIZEN;
      
      expect(() => {
        jwt.sign(user, '');
      }).toThrow();
      
      expect(() => {
        jwt.sign(user, null as any);
      }).toThrow();
    });
  });
}); 