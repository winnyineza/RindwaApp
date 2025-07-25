-- ===================================================================
-- CREATE MAIN SYSTEM ADMIN USER
-- ===================================================================
-- This creates the main admin@rindwa.com user that other seed data references
-- ===================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the main system admin user
INSERT INTO users (
    id,
    email, 
    password,
    "firstName",
    "lastName",
    phone,
    role,
    title,
    department,
    bio,
    timezone,
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    'admin000-0000-0000-0000-000000000000',
    'admin@rindwa.com',
    '$2b$12$LQv3c4cN7yKs5HfFYYNmk.7MXR7aA2g7T9JkxKy8sLYEw8DdRYJla', -- Password: admin123
    'System',
    'Administrator',
    '+250788000000',
    'main_admin',
    'Main System Administrator',
    'IT Operations',
    'Main system administrator for Rindwa Emergency Platform',
    'Africa/Kigali',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    title = EXCLUDED.title,
    department = EXCLUDED.department,
    bio = EXCLUDED.bio,
    timezone = EXCLUDED.timezone,
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Confirm user creation
SELECT 
    email,
    "firstName",
    "lastName", 
    role,
    title,
    "isActive",
    "createdAt"
FROM users 
WHERE email = 'admin@rindwa.com';

-- Success message
SELECT 'MAIN ADMIN USER CREATED SUCCESSFULLY!' as status,
       'Email: admin@rindwa.com' as email,
       'Password: admin123' as password,
       'Role: main_admin' as role; 