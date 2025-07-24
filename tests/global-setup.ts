// Global test setup - runs once before all test suites
import { execSync } from 'child_process';
import { sequelize } from '../server/db';
import dotenv from 'dotenv';

module.exports = async () => {
  // Load test environment
  dotenv.config({ path: '.env.test' });
  
  console.log('🧪 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-super-long-for-security';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/rindwa_test';
  
  try {
    // Create test database if it doesn't exist
    console.log('📋 Creating test database...');
    try {
      execSync('createdb rindwa_test', { stdio: 'ignore' });
    } catch (error) {
      // Database might already exist, continue
    }
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    
    // Sync database schema (create tables)
    console.log('🏗️ Setting up database schema...');
    await sequelize.sync({ force: true });
    
    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData();
    
    console.log('✅ Test environment ready!');
    
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    process.exit(1);
  }
};

async function seedTestData() {
  const bcrypt = require('bcrypt');
  const crypto = require('crypto');
  
  try {
    // Create test organizations
    await sequelize.query(`
      INSERT INTO organizations (id, name, type, description, "createdAt") VALUES 
      ('550e8400-e29b-41d4-a716-446655440001', 'Test Police Department', 'Police', 'Test police organization', NOW()),
      ('550e8400-e29b-41d4-a716-446655440002', 'Test Fire Department', 'Fire', 'Test fire organization', NOW()),
      ('550e8400-e29b-41d4-a716-446655440003', 'Test Medical Services', 'Medical', 'Test medical organization', NOW())
    `);
    
    // Create test stations
    await sequelize.query(`
      INSERT INTO stations (id, name, district, sector, "organizationId", "contactNumber", capacity, created_at) VALUES 
      ('550e8400-e29b-41d4-a716-446655440011', 'Test Police Station', 'Gasabo', 'Remera', '550e8400-e29b-41d4-a716-446655440001', '+250788001001', 50, NOW()),
      ('550e8400-e29b-41d4-a716-446655440012', 'Test Fire Station', 'Kicukiro', 'Niboye', '550e8400-e29b-41d4-a716-446655440002', '+250788001002', 30, NOW()),
      ('550e8400-e29b-41d4-a716-446655440013', 'Test Medical Station', 'Nyarugenge', 'Muhima', '550e8400-e29b-41d4-a716-446655440003', '+250788001003', 40, NOW())
    `);
    
    // Create test users with different roles
    const hashedPassword = await bcrypt.hash('test123456', 10);
    await sequelize.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", phone, role, 
        "organisationId", "stationId", "isActive", "createdAt", "updatedAt"
      ) VALUES 
      ('550e8400-e29b-41d4-a716-446655440021', 'mainadmin@test.com', :password, 'Main', 'Admin', '+250788001021', 'main_admin', NULL, NULL, true, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440022', 'superadmin@test.com', :password, 'Super', 'Admin', '+250788001022', 'super_admin', '550e8400-e29b-41d4-a716-446655440001', NULL, true, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440023', 'stationadmin@test.com', :password, 'Station', 'Admin', '+250788001023', 'station_admin', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', true, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440024', 'stationstaff@test.com', :password, 'Station', 'Staff', '+250788001024', 'station_staff', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', true, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440025', 'citizen@test.com', :password, 'Test', 'Citizen', '+250788001025', 'citizen', NULL, NULL, true, NOW(), NOW())
    `, {
      replacements: { password: hashedPassword }
    });
    
    // Create test incidents
    await sequelize.query(`
      INSERT INTO incidents (
        id, title, description, type, priority, status, location, 
        "stationId", "organisationId", "reportedById", "createdAt", "updatedAt"
      ) VALUES 
      ('550e8400-e29b-41d4-a716-446655440031', 'Test Emergency Incident', 'Test incident for integration testing', 'other', 'high', 'reported', '{"address": "Test Location", "lat": -1.9441, "lng": 30.0619}', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440025', NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440032', 'Test Assigned Incident', 'Test incident already assigned', 'police', 'medium', 'assigned', '{"address": "Test Location 2", "lat": -1.9541, "lng": 30.0719}', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440025', NOW(), NOW())
    `);
    
    // Create test password reset tokens
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isUsed" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create test invitations
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await sequelize.query(`
      INSERT INTO invitations (
        id, email, token, role, organization_id, station_id, invited_by, expires_at, is_used, "createdAt"
      ) VALUES 
      ('550e8400-e29b-41d4-a716-446655440041', 'newinvite@test.com', :token, 'station_staff', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440023', NOW() + INTERVAL '72 hours', false, NOW())
    `, {
      replacements: { token: inviteToken }
    });
    
    console.log('✅ Test data seeded successfully');
    
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
} 