-- ===================================================================
-- RINDWA DATABASE CLEANUP SCRIPT
-- ===================================================================
-- This script removes all mock/test data while preserving the schema
-- Run this to get a clean database for production or fresh development
-- ===================================================================

BEGIN;

-- Disable foreign key constraints temporarily for easier cleanup
SET session_replication_role = replica;

-- Clean all data tables in dependency order
TRUNCATE TABLE attachments CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE emergency_contacts CASCADE;
TRUNCATE TABLE escalation_tracking CASCADE;
TRUNCATE TABLE file_uploads CASCADE;
TRUNCATE TABLE upvotes CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE notification_preferences CASCADE;
TRUNCATE TABLE incidents CASCADE;
TRUNCATE TABLE invitations CASCADE;
TRUNCATE TABLE password_reset_tokens CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE stations CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE organisations CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Reset sequences for auto-increment fields (if any exist)
-- Note: Most tables seem to use UUIDs, but this ensures clean state

COMMIT;

-- Display cleanup summary
SELECT 
    'incidents' as table_name, COUNT(*) as remaining_rows FROM incidents
UNION ALL
SELECT 'users', COUNT(*) FROM users  
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'stations', COUNT(*) FROM stations
UNION ALL  
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'emergency_contacts', COUNT(*) FROM emergency_contacts
UNION ALL
SELECT 'escalation_tracking', COUNT(*) FROM escalation_tracking
UNION ALL
SELECT 'file_uploads', COUNT(*) FROM file_uploads
UNION ALL
SELECT 'invitations', COUNT(*) FROM invitations
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'upvotes', COUNT(*) FROM upvotes
ORDER BY table_name;

-- Success message
SELECT 'DATABASE CLEANUP COMPLETED SUCCESSFULLY! All mock data has been removed.' as status; 