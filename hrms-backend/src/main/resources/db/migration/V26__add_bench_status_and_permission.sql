-- ============================================================
-- HRMS DATABASE MIGRATION V26: BENCH STATUS & PERMISSIONS
-- ============================================================

-- 1. Add bench_status column to employees table with NOT NULL and DEFAULT 'NO'
ALTER TABLE employees
    ADD COLUMN bench_status VARCHAR(10) NOT NULL DEFAULT 'NO';

-- 2. Add CHECK constraint for valid bench_status values ('YES', 'NO')
ALTER TABLE employees
    ADD CONSTRAINT chk_employees_bench_status CHECK (bench_status IN ('YES', 'NO'));

-- 3. Create EMPLOYEE_BENCH_STATUS_UPDATE permission
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES ('EMPLOYEE_BENCH_STATUS_UPDATE', 'Ability to update employee bench/project status', NOW(), NOW());

-- 4. Grant permission strictly to ADMIN, MANAGER, and COORDINATOR roles (Exclude HR and EMPLOYEE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ADMIN', 'MANAGER', 'COORDINATOR')
  AND p.name = 'EMPLOYEE_BENCH_STATUS_UPDATE';
