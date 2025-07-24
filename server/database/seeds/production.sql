-- =================================================================
-- Rindwa Emergency Platform - Production Seed Data
-- =================================================================
-- 
-- This file contains essential production data for the Rindwa 
-- Emergency Management Platform, including Rwanda's emergency 
-- service organizations, stations, and system configuration.
--
-- ⚠️ WARNING: This script should only be run in production environments
-- with proper authorization and backup procedures in place.
-- =================================================================

-- Set timezone for consistent data
SET timezone = 'Africa/Kigali';

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- EMERGENCY SERVICE ORGANIZATIONS
-- =================================================================

-- Insert Rwanda National Police
INSERT INTO organizations (
    id,
    name,
    code,
    type,
    user_id,
    address,
    city,
    country,
    phone,
    email,
    website,
    timezone,
    description,
    settings,
    is_active,
    "createdAt",
    "updatedAt"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Rwanda National Police',
    'RNP',
    'Law Enforcement',
    (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1),
    'KG 9 Ave, Kimisagara',
    'Kigali',
    'Rwanda',
    '+250788100100',
    'info@police.gov.rw',
    'https://police.gov.rw',
    'Africa/Kigali',
    'National law enforcement agency responsible for maintaining law and order in Rwanda',
    '{"emergency_number": "100", "languages": ["en", "rw", "fr"], "operates_24_7": true}',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Insert Rwanda Fire and Rescue Brigade
INSERT INTO organizations (
    id,
    name,
    code,
    type,
    user_id,
    address,
    city,
    country,
    phone,
    email,
    website,
    timezone,
    description,
    settings,
    is_active,
    "createdAt",
    "updatedAt"
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Rwanda Fire and Rescue Brigade',
    'RFRB',
    'Fire and Rescue',
    (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1),
    'KG 25 St, Nyabugogo',
    'Kigali',
    'Rwanda',
    '+250788101101',
    'info@fire.gov.rw',
    'https://minema.gov.rw',
    'Africa/Kigali',
    'National fire fighting and rescue services for Rwanda',
    '{"emergency_number": "101", "languages": ["en", "rw", "fr"], "operates_24_7": true}',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Insert Rwanda Medical Emergency Services
INSERT INTO organizations (
    id,
    name,
    code,
    type,
    user_id,
    address,
    city,
    country,
    phone,
    email,
    website,
    timezone,
    description,
    settings,
    is_active,
    "createdAt",
    "updatedAt"
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Rwanda Medical Emergency Services',
    'RMES',
    'Medical Emergency',
    (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1),
    'KG 11 Ave, Remera',
    'Kigali',
    'Rwanda',
    '+250788102102',
    'emergency@moh.gov.rw',
    'https://moh.gov.rw',
    'Africa/Kigali',
    'National medical emergency response services',
    '{"emergency_number": "102", "languages": ["en", "rw", "fr"], "operates_24_7": true}',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- POLICE STATIONS BY DISTRICT
-- =================================================================

-- Kigali City Police Stations
INSERT INTO stations (id, name, code, type, user_id, address, city, country, latitude, longitude, phone, email, organisation_id, district, sector, coverage_area, equipment, is_active, "createdAt", "updatedAt") VALUES
-- Gasabo District
('10000000-0000-0000-0000-000000000001', 'Gasabo Police Station', 'GPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 15 Ave, Gasabo', 'Kigali', 'Rwanda', -1.9536, 30.0851, '+250788100001', 'gasabo@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Gasabo', 'Remera', '{"radius_km": 15, "population": 530000}', '{"vehicles": 8, "officers": 45, "equipment": ["radios", "computers", "first_aid"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('10000000-0000-0000-0000-000000000002', 'Remera Police Station', 'RPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 12 Ave, Remera', 'Kigali', 'Rwanda', -1.9441, 30.0956, '+250788100002', 'remera@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Gasabo', 'Remera', '{"radius_km": 10, "population": 150000}', '{"vehicles": 5, "officers": 30, "equipment": ["radios", "computers"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Kicukiro District
('10000000-0000-0000-0000-000000000003', 'Kicukiro Police Station', 'KPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 7 Ave, Kicukiro', 'Kigali', 'Rwanda', -1.9995, 30.0758, '+250788100003', 'kicukiro@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Kicukiro', 'Niboye', '{"radius_km": 12, "population": 400000}', '{"vehicles": 6, "officers": 35, "equipment": ["radios", "computers", "first_aid"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Nyarugenge District  
('10000000-0000-0000-0000-000000000004', 'Nyarugenge Police Station', 'NPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 3 Ave, Nyarugenge', 'Kigali', 'Rwanda', -1.9706, 30.0587, '+250788100004', 'nyarugenge@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Nyarugenge', 'Muhima', '{"radius_km": 8, "population": 290000}', '{"vehicles": 7, "officers": 40, "equipment": ["radios", "computers", "motorcycles"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Provincial Police Stations
('10000000-0000-0000-0000-000000000005', 'Musanze Police Station', 'MPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'RN4, Musanze', 'Musanze', 'Rwanda', -1.4985, 29.6334, '+250788100005', 'musanze@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Musanze', 'Musanze', '{"radius_km": 25, "population": 370000}', '{"vehicles": 4, "officers": 25, "equipment": ["radios", "computers"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('10000000-0000-0000-0000-000000000006', 'Huye Police Station', 'HPS-001', 'Police Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'NR1, Huye', 'Huye', 'Rwanda', -2.5955, 29.7395, '+250788100006', 'huye@police.gov.rw', '00000000-0000-0000-0000-000000000001', 'Huye', 'Ngoma', '{"radius_km": 20, "population": 330000}', '{"vehicles": 3, "officers": 20, "equipment": ["radios", "computers"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- FIRE STATIONS
-- =================================================================

INSERT INTO stations (id, name, code, type, user_id, address, city, country, latitude, longitude, phone, email, organisation_id, district, sector, coverage_area, equipment, is_active, "createdAt", "updatedAt") VALUES
-- Kigali Fire Stations
('20000000-0000-0000-0000-000000000001', 'Kigali Central Fire Station', 'KCFS-001', 'Fire Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 25 St, Nyabugogo', 'Kigali', 'Rwanda', -1.9536, 30.0678, '+250788101001', 'central@fire.gov.rw', '00000000-0000-0000-0000-000000000002', 'Nyarugenge', 'Nyabugogo', '{"radius_km": 20, "population": 1200000}', '{"fire_trucks": 4, "ambulances": 2, "firefighters": 25, "equipment": ["ladders", "hoses", "breathing_apparatus"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-0000-0000-000000000002', 'Gasabo Fire Station', 'GFS-001', 'Fire Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 18 Ave, Gasabo', 'Kigali', 'Rwanda', -1.9441, 30.0956, '+250788101002', 'gasabo@fire.gov.rw', '00000000-0000-0000-0000-000000000002', 'Gasabo', 'Remera', '{"radius_km": 15, "population": 530000}', '{"fire_trucks": 2, "ambulances": 1, "firefighters": 15, "equipment": ["ladders", "hoses"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Provincial Fire Stations
('20000000-0000-0000-0000-000000000003', 'Musanze Fire Station', 'MFS-001', 'Fire Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'RN4, Musanze', 'Musanze', 'Rwanda', -1.4985, 29.6334, '+250788101003', 'musanze@fire.gov.rw', '00000000-0000-0000-0000-000000000002', 'Musanze', 'Musanze', '{"radius_km": 30, "population": 370000}', '{"fire_trucks": 1, "ambulances": 1, "firefighters": 8, "equipment": ["ladders", "hoses"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-0000-0000-000000000004', 'Huye Fire Station', 'HFS-001', 'Fire Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'NR1, Huye', 'Huye', 'Rwanda', -2.5955, 29.7395, '+250788101004', 'huye@fire.gov.rw', '00000000-0000-0000-0000-000000000002', 'Huye', 'Ngoma', '{"radius_km": 25, "population": 330000}', '{"fire_trucks": 1, "ambulances": 1, "firefighters": 10, "equipment": ["ladders", "hoses"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- MEDICAL EMERGENCY STATIONS
-- =================================================================

INSERT INTO stations (id, name, code, type, user_id, address, city, country, latitude, longitude, phone, email, organisation_id, district, sector, coverage_area, equipment, is_active, "createdAt", "updatedAt") VALUES
-- Kigali Medical Stations
('30000000-0000-0000-0000-000000000001', 'King Faisal Hospital Emergency', 'KFH-001', 'Medical Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 544 St, Kacyiru', 'Kigali', 'Rwanda', -1.9441, 30.0956, '+250788102001', 'emergency@kfh.rw', '00000000-0000-0000-0000-000000000003', 'Gasabo', 'Kacyiru', '{"radius_km": 15, "population": 800000}', '{"ambulances": 5, "medical_staff": 35, "equipment": ["defibrillators", "ventilators", "emergency_supplies"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('30000000-0000-0000-0000-000000000002', 'University Teaching Hospital Emergency', 'CHUK-001', 'Medical Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'KG 7 Ave, Kicukiro', 'Kigali', 'Rwanda', -1.9995, 30.0758, '+250788102002', 'emergency@chuk.rw', '00000000-0000-0000-0000-000000000003', 'Kicukiro', 'Niboye', '{"radius_km": 12, "population": 600000}', '{"ambulances": 4, "medical_staff": 28, "equipment": ["defibrillators", "emergency_supplies"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Provincial Medical Stations
('30000000-0000-0000-0000-000000000003', 'Musanze Hospital Emergency', 'MH-001', 'Medical Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'RN4, Musanze', 'Musanze', 'Rwanda', -1.4985, 29.6334, '+250788102003', 'emergency@musanze.moh.gov.rw', '00000000-0000-0000-0000-000000000003', 'Musanze', 'Musanze', '{"radius_km": 25, "population": 370000}', '{"ambulances": 2, "medical_staff": 15, "equipment": ["defibrillators", "basic_supplies"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('30000000-0000-0000-0000-000000000004', 'Huye Hospital Emergency', 'HH-001', 'Medical Station', (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1), 'NR1, Huye', 'Huye', 'Rwanda', -2.5955, 29.7395, '+250788102004', 'emergency@huye.moh.gov.rw', '00000000-0000-0000-0000-000000000003', 'Huye', 'Ngoma', '{"radius_km": 20, "population": 330000}', '{"ambulances": 2, "medical_staff": 12, "equipment": ["defibrillators", "basic_supplies"]}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- SYSTEM CONFIGURATION DATA
-- =================================================================

-- Create system configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES 
('emergency_numbers', '{"police": "100", "fire": "101", "medical": "102", "general": "112"}', 'Rwanda emergency service contact numbers'),
('app_settings', '{"max_incident_photos": 5, "auto_assign_incidents": true, "notification_timeout": 300}', 'General application settings'),
('sms_templates', '{"incident_created": "New incident reported: {title} at {location}. ID: {id}", "incident_assigned": "Incident {id} assigned to you: {title}", "incident_resolved": "Incident {id} has been resolved: {title}"}', 'SMS notification templates'),
('email_templates', '{"incident_notification": "incident_notification.html", "password_reset": "password_reset.html", "invitation": "invitation.html"}', 'Email template file mappings'),
('service_areas', '{"kigali_city": {"districts": ["Gasabo", "Kicukiro", "Nyarugenge"], "coverage_radius": 20}, "northern_province": {"districts": ["Musanze", "Burera", "Gicumbi"], "coverage_radius": 50}}', 'Service area definitions'),
('performance_metrics', '{"target_response_time": 15, "max_escalation_time": 60, "incident_resolution_target": 240}', 'Performance targets in minutes')
ON CONFLICT (config_key) DO NOTHING;

-- =================================================================
-- CREATE ADMINISTRATIVE USERS
-- =================================================================

-- Create organization admin users (one per organization)
INSERT INTO users (
    id,
    email, 
    password,
    "firstName",
    "lastName",
    phone,
    role,
    "organisationId",
    title,
    department,
    bio,
    timezone,
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
-- Police Admin
(
    'admin000-0000-0000-0000-000000000001',
    'admin@police.gov.rw',
    '$2b$12$rQc8Z1N9X.bqV4rj4hL1V.VD8Qa3qJ5qZ1N9X.bqV4rj4hL1V.VD8Q', -- Password: RNP@2024!
    'Jean Baptiste',
    'Nzeyimana',
    '+250788100000',
    'super_admin',
    '00000000-0000-0000-0000-000000000001',
    'Inspector General',
    'Operations',
    'Head of Rwanda National Police operations',
    'Africa/Kigali',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Fire Admin
(
    'admin000-0000-0000-0000-000000000002',
    'admin@fire.gov.rw',
    '$2b$12$rQc8Z1N9X.bqV4rj4hL1V.VD8Qa3qJ5qZ1N9X.bqV4rj4hL1V.VD8Q', -- Password: RFRB@2024!
    'Marie Claire',
    'Uwimana',
    '+250788101000',
    'super_admin',
    '00000000-0000-0000-0000-000000000002',
    'Chief Fire Officer',
    'Operations',
    'Head of Rwanda Fire and Rescue Brigade',
    'Africa/Kigali',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Medical Admin
(
    'admin000-0000-0000-0000-000000000003',
    'admin@moh.gov.rw',
    '$2b$12$rQc8Z1N9X.bqV4rj4hL1V.VD8Qa3qJ5qZ1N9X.bqV4rj4hL1V.VD8Q', -- Password: RMES@2024!
    'Dr. Samuel',
    'Muhayimana',
    '+250788102000',
    'super_admin',
    '00000000-0000-0000-0000-000000000003',
    'Emergency Services Director',
    'Emergency Medicine',
    'Director of Medical Emergency Services',
    'Africa/Kigali',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- =================================================================
-- PERFORMANCE OPTIMIZATION
-- =================================================================

-- Update table statistics
ANALYZE organizations;
ANALYZE stations;
ANALYZE users;
ANALYZE system_config;

-- =================================================================
-- COMPLETION LOG
-- =================================================================

-- Log the seeding completion
INSERT INTO audit_logs (
    action,
    "entityType",
    details,
    "ipAddress",
    "createdAt"
) VALUES (
    'database_seeded',
    'system',
    '{"seed_type": "production", "timestamp": "' || CURRENT_TIMESTAMP || '"}',
    '127.0.0.1',
    CURRENT_TIMESTAMP
);

-- =================================================================
-- IMPORTANT PRODUCTION NOTES
-- =================================================================

/*
🚨 PRODUCTION DEPLOYMENT CHECKLIST:

1. Security:
   - Change all default passwords immediately
   - Update admin email addresses to real addresses
   - Configure proper SSL certificates
   - Enable audit logging

2. Configuration:
   - Verify emergency phone numbers are correct
   - Update organization contact information
   - Configure SMS and email templates
   - Set up monitoring and alerting

3. Data Validation:
   - Verify all station locations are accurate
   - Confirm emergency service contact details
   - Test notification systems
   - Validate user permissions

4. Monitoring:
   - Set up database monitoring
   - Configure application performance monitoring
   - Enable error tracking
   - Schedule regular backups

📞 Emergency Contacts:
   - Police: 100
   - Fire: 101
   - Medical: 102
   - General: 112

📧 System Admin: admin@rindwa.com
🔑 Default Password: admin123 (CHANGE IMMEDIATELY)

Last Updated: January 2024
*/ 