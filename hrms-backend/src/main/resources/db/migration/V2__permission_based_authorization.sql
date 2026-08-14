-- ============================================================
-- HRMS DATABASE MIGRATION V2: PERMISSION-BASED AUTHORIZATION
-- ============================================================

-- 1. Ensure HR role exists
INSERT INTO roles (name, created_at, updated_at, created_by, updated_by)
SELECT 'HR', NOW(), NOW(), NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'HR');

-- 2. PERMISSIONS TABLE
CREATE TABLE permissions
(
    id BIGSERIAL NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,

    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NULL,

    updated_at TIMESTAMP NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_permissions_name
        UNIQUE (name)
);

-- 3. ROLE_PERMISSIONS JOIN TABLE
CREATE TABLE role_permissions
(
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

-- 4. EMPLOYEE_PERMISSIONS JOIN TABLE (Direct employee override permissions)
CREATE TABLE employee_permissions
(
    employee_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (employee_id, permission_id),

    CONSTRAINT fk_employee_permissions_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_employee_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

-- 5. INDEXES
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_employee_permissions_employee ON employee_permissions(employee_id);

-- 6. INITIAL PERMISSIONS SEED
INSERT INTO permissions (name, description, created_at, updated_at) VALUES
('ATTENDANCE_VIEW', 'View attendance records', NOW(), NOW()),
('ATTENDANCE_CREATE', 'Create attendance records', NOW(), NOW()),
('ATTENDANCE_UPDATE', 'Update attendance records', NOW(), NOW()),
('LEAVE_VIEW', 'View leave requests and balances', NOW(), NOW()),
('LEAVE_APPLY', 'Apply for leave', NOW(), NOW()),
('LEAVE_APPROVE', 'Approve or reject leave requests', NOW(), NOW()),
('EMPLOYEE_MANAGEMENT_VIEW', 'View employee profiles and work details', NOW(), NOW()),
('EMPLOYEE_MANAGEMENT_CREATE', 'Create new employee profiles', NOW(), NOW()),
('EMPLOYEE_MANAGEMENT_UPDATE', 'Update employee profiles and status', NOW(), NOW()),
('HOLIDAY_VIEW', 'View company holidays', NOW(), NOW()),
('WORK_WEEK_VIEW', 'View work week schedules', NOW(), NOW()),
('PROJECTS_VIEW', 'View assigned projects', NOW(), NOW()),
('TIMESHEET_CATEGORIES_VIEW', 'View timesheet categories', NOW(), NOW()),
('LEAVE_SETUP_VIEW', 'View leave configuration and policies', NOW(), NOW()),
('ATTENDANCE_SETUP_VIEW', 'View attendance configuration and rules', NOW(), NOW());

-- 7. ASSIGN ALL PERMISSIONS TO ADMIN ROLE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN';

-- 8. ASSIGN PERMISSIONS TO HR ROLE
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
WHERE r.name = 'HR';

-- 9. ASSIGN PERMISSIONS TO EMPLOYEE ROLE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'ATTENDANCE_VIEW', 'ATTENDANCE_CREATE',
    'LEAVE_VIEW', 'LEAVE_APPLY',
    'HOLIDAY_VIEW', 'WORK_WEEK_VIEW', 'PROJECTS_VIEW'
)
WHERE r.name = 'EMPLOYEE';
