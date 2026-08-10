-- ============================================================
-- HRMS DATABASE MIGRATION V7: ALTER CREATED_BY / UPDATED_BY COLUMN TYPES TO VARCHAR
-- ============================================================

-- Drop foreign key constraints on created_by / updated_by columns if present
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_created_by;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_updated_by;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_employees_created_by;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_employees_updated_by;
ALTER TABLE employee_work_details DROP CONSTRAINT IF EXISTS fk_work_details_created_by;
ALTER TABLE employee_work_details DROP CONSTRAINT IF EXISTS fk_work_details_updated_by;

-- Alter created_by and updated_by columns to VARCHAR(255) to match BaseEntity JPA mapping
ALTER TABLE roles ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
ALTER TABLE employees ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
ALTER TABLE employee_work_details ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
ALTER TABLE permissions ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
ALTER TABLE user_permissions ALTER COLUMN created_by TYPE VARCHAR(255), ALTER COLUMN updated_by TYPE VARCHAR(255);
