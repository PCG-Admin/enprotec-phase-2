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

-- Operations/Workflow tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_workflows') THEN
    TRUNCATE TABLE en_workflows CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_workflow_attachments') THEN
    TRUNCATE TABLE en_workflow_attachments CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_stock') THEN
    TRUNCATE TABLE en_stock CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_stock_receipts') THEN
    TRUNCATE TABLE en_stock_receipts CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_salvage_bookings') THEN
    TRUNCATE TABLE en_salvage_bookings CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'en_departments') THEN
    TRUNCATE TABLE en_departments CASCADE;
  END IF;
END $$;

-- Audit logs
TRUNCATE TABLE en_audit_logs CASCADE;

-- Re-enable triggers
SET session_replication_role = 'default';

-- Log the cleanup
INSERT INTO en_audit_logs (action, table_name, details)
VALUES ('DATABASE_CLEANUP', 'multiple', 'Cleared all transactional data, kept sites/users/vehicles');
