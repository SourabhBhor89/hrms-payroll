-- ============================================================
-- HRMS DATABASE MIGRATION V20: ADD MANAGER AND COORDINATOR ROLES
-- ============================================================

-- 1. ADD NEW ROLES
INSERT INTO roles (name, created_at, updated_at, created_by, updated_by)
SELECT 'MANAGER', NOW(), NOW(), NULL, NULL
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'MANAGER');

INSERT INTO roles (name, created_at, updated_at, created_by, updated_by)
SELECT 'COORDINATOR', NOW(), NOW(), NULL, NULL
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'COORDINATOR');

-- 2. ADD READ_ONLY PERMISSION FOR COORDINATORS
INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 'LEAVE_READ_ONLY', 'View leave requests only (no approval rights)', NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'LEAVE_READ_ONLY');

INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 'ATTENDANCE_READ_ONLY', 'View attendance records only (no edit rights)', NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'ATTENDANCE_READ_ONLY');

INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 'EMPLOYEE_MANAGEMENT_READ_ONLY', 'View employee profiles only (no edit rights)', NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'EMPLOYEE_MANAGEMENT_READ_ONLY');



-- ============================================================
-- HRMS DATABASE MIGRATION V21: UPDATE PERMISSIONS FOR MANAGER AND COORDINATOR
-- ============================================================

-- 1. Ensure MANAGER has all the same permissions as HR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'ATTENDANCE_VIEW', 'ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE',
    'LEAVE_VIEW', 'LEAVE_APPLY', 'LEAVE_APPROVE',
    'EMPLOYEE_MANAGEMENT_VIEW', 'EMPLOYEE_MANAGEMENT_CREATE', 'EMPLOYEE_MANAGEMENT_UPDATE',
    'HOLIDAY_VIEW', 'WORK_WEEK_VIEW', 'PROJECTS_VIEW', 'TIMESHEET_CATEGORIES_VIEW',
    'LEAVE_SETUP_VIEW', 'ATTENDANCE_SETUP_VIEW'
)
WHERE r.name = 'MANAGER'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 2. Ensure COORDINATOR has the same permissions as EMPLOYEE plus read-only access to management features
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    -- Employee permissions
    'ATTENDANCE_VIEW', 'ATTENDANCE_CREATE',
    'LEAVE_VIEW', 'LEAVE_APPLY',
    'HOLIDAY_VIEW', 'WORK_WEEK_VIEW', 'PROJECTS_VIEW',
    'EMPLOYEE_MANAGEMENT_VIEW',
    'LEAVE_READ_ONLY',
    'ATTENDANCE_READ_ONLY',
    'EMPLOYEE_MANAGEMENT_READ_ONLY',
    'TIMESHEET_CATEGORIES_VIEW',
    'LEAVE_SETUP_VIEW',
    'ATTENDANCE_SETUP_VIEW'
)
WHERE r.name = 'COORDINATOR'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================================
-- HRMS DATABASE MIGRATION V22: GRANT COORDINATOR READ-ONLY ACCESS
-- ============================================================

-- 1. Add LEAVE_VIEW_ALL permission for viewing all leave requests
INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 'LEAVE_VIEW_ALL', 'View all leave requests (read-only)', NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'LEAVE_VIEW_ALL');

-- 2. Grant ATTENDANCE_REGULARIZATION_CREATE to COORDINATOR role (to allow them to apply for regularization)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.name = 'ATTENDANCE_REGULARIZATION_CREATE'
WHERE r.name = 'COORDINATOR'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 3. Grant LEAVE_VIEW_ALL to COORDINATOR role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.name = 'LEAVE_VIEW_ALL'
WHERE r.name = 'COORDINATOR'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 4. Also grant ATTENDANCE_REGULARIZATION_VIEW_ALL to MANAGER role (if not already granted)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.name = 'ATTENDANCE_REGULARIZATION_VIEW_ALL'
WHERE r.name = 'MANAGER'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 5. Also grant LEAVE_VIEW_ALL to MANAGER role (if not already granted)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.name = 'LEAVE_VIEW_ALL'
WHERE r.name = 'MANAGER'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================================
-- HRMS DATABASE MIGRATION V24: ADD EDUCATION QUALIFICATION FIELDS
-- ============================================================

-- Add education qualification fields to employees table
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS tenth_qualification VARCHAR(255);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS twelfth_qualification VARCHAR(255);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS bachelor_qualification VARCHAR(255);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS highest_qualification VARCHAR(255);

