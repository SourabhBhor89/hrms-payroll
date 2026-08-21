-- ============================================================
-- HRMS DATABASE MIGRATION V20: ADD EMPLOYEE LEAVE & WFH PERMISSION
-- ============================================================

-- 1. Insert EMPLOYEE_LEAVE_WFH_VIEW permission if not already present
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES ('EMPLOYEE_LEAVE_WFH_VIEW', 'View employee leave and WFH summary reports', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Grant EMPLOYEE_LEAVE_WFH_VIEW permission to ADMIN and HR roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'EMPLOYEE_LEAVE_WFH_VIEW'
  AND r.name IN ('ADMIN', 'HR')
ON CONFLICT (role_id, permission_id) DO NOTHING;
