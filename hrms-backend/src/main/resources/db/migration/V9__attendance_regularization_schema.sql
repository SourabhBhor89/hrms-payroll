-- ============================================================
-- HRMS DATABASE MIGRATION V9: ATTENDANCE & ATTENDANCE REGULARIZATION MODULE
-- ============================================================

-- 1. ATTENDANCES TABLE
CREATE TABLE IF NOT EXISTS attendances
(
    id BIGINT NOT NULL AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    date DATE NOT NULL,
    clock_in DATETIME(6) NULL,
    clock_out DATETIME(6) NULL,
    total_hours DOUBLE NULL DEFAULT 0.0,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(255) NULL,

    created_at DATETIME(6) NOT NULL,
    created_by VARCHAR(255) NULL,
    updated_at DATETIME(6) NULL,
    updated_by VARCHAR(255) NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_attendances_employee_date UNIQUE (employee_id, date),
    CONSTRAINT fk_attendances_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_attendances_employee_id ON attendances(employee_id);
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_status ON attendances(status);
CREATE INDEX idx_attendances_is_locked ON attendances(is_locked);

-- 2. ATTENDANCE REGULARIZATIONS TABLE
CREATE TABLE IF NOT EXISTS attendance_regularizations
(
    id BIGINT NOT NULL AUTO_INCREMENT,
    attendance_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    correction_type VARCHAR(50) NOT NULL DEFAULT 'BOTH', -- CLOCK_IN, CLOCK_OUT, BOTH
    original_clock_in DATETIME(6) NULL,
    original_clock_out DATETIME(6) NULL,
    requested_clock_in DATETIME(6) NOT NULL,
    requested_clock_out DATETIME(6) NOT NULL,
    original_working_hours DOUBLE NULL DEFAULT 0.0,
    requested_working_hours DOUBLE NULL DEFAULT 0.0,
    reason VARCHAR(500) NOT NULL,
    attachment_url VARCHAR(500) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    
    submitted_at DATETIME(6) NOT NULL,
    approved_at DATETIME(6) NULL,
    rejected_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    
    reviewed_by VARCHAR(255) NULL,
    review_remarks VARCHAR(500) NULL,

    created_at DATETIME(6) NOT NULL,
    created_by VARCHAR(255) NULL,
    updated_at DATETIME(6) NULL,
    updated_by VARCHAR(255) NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_reg_attendance FOREIGN KEY (attendance_id) REFERENCES attendances(id),
    CONSTRAINT fk_reg_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_reg_attendance_id ON attendance_regularizations(attendance_id);
CREATE INDEX idx_reg_employee_id ON attendance_regularizations(employee_id);
CREATE INDEX idx_reg_status ON attendance_regularizations(status);
CREATE INDEX idx_reg_submitted_at ON attendance_regularizations(submitted_at);

-- 3. PERMISSIONS & ROLE ASSIGNMENT FOR REGULARIZATION
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES
    ('ATTENDANCE_REGULARIZATION_CREATE', 'Can submit and cancel attendance regularization requests', NOW(6), NOW(6)),
    ('ATTENDANCE_REGULARIZATION_VIEW_ALL', 'Can view all attendance regularization requests', NOW(6), NOW(6)),
    ('ATTENDANCE_REGULARIZATION_APPROVE', 'Can approve or reject attendance regularization requests', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Assign permissions to ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN'
  AND p.name IN ('ATTENDANCE_REGULARIZATION_CREATE', 'ATTENDANCE_REGULARIZATION_VIEW_ALL', 'ATTENDANCE_REGULARIZATION_APPROVE')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign permissions to HR role if HR role exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR'
  AND p.name IN ('ATTENDANCE_REGULARIZATION_CREATE', 'ATTENDANCE_REGULARIZATION_VIEW_ALL', 'ATTENDANCE_REGULARIZATION_APPROVE')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign CREATE permission to EMPLOYEE role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'EMPLOYEE'
  AND p.name = 'ATTENDANCE_REGULARIZATION_CREATE'
ON DUPLICATE KEY UPDATE role_id = role_id;
