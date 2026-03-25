-- Clear all data from database except sites, users (profiles), and vehicles
-- This script will remove all transactional data while keeping the core reference tables

-- Disable triggers temporarily to avoid issues with cascading deletes
SET session_replication_role = 'replica';

-- Fleet Management tables
TRUNCATE TABLE inspections CASCADE;
TRUNCATE TABLE licenses CASCADE;
TRUNCATE TABLE costs CASCADE;
TRUNCATE TABLE compliance_schedule CASCADE;
TRUNCATE TABLE templates CASCADE;

-- Audit logs
TRUNCATE TABLE en_audit_logs CASCADE;

-- Re-enable triggers
SET session_replication_role = 'default';

-- Log the cleanup
INSERT INTO en_audit_logs (action, table_name, details)
VALUES ('DATABASE_CLEANUP', 'multiple', 'Cleared all transactional data, kept sites/users/vehicles');
