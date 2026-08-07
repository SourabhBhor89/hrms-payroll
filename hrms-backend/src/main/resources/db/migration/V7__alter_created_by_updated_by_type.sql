-- ============================================================
-- HRMS DATABASE MIGRATION V7: ALTER CREATED_BY / UPDATED_BY COLUMN TYPES TO VARCHAR
-- ============================================================

-- Drop foreign key constraints on created_by / updated_by columns if present
ALTER TABLE users DROP FOREIGN KEY fk_users_created_by;
ALTER TABLE users DROP FOREIGN KEY fk_users_updated_by;
ALTER TABLE employees DROP FOREIGN KEY fk_employees_created_by;
ALTER TABLE employees DROP FOREIGN KEY fk_employees_updated_by;
ALTER TABLE employee_work_details DROP FOREIGN KEY fk_work_details_created_by;
ALTER TABLE employee_work_details DROP FOREIGN KEY fk_work_details_updated_by;

-- Alter created_by and updated_by columns to VARCHAR(255) to match BaseEntity JPA mapping
ALTER TABLE roles MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
ALTER TABLE users MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
ALTER TABLE employees MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
ALTER TABLE employee_work_details MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
ALTER TABLE permissions MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
ALTER TABLE user_permissions MODIFY COLUMN created_by VARCHAR(255) NULL, MODIFY COLUMN updated_by VARCHAR(255) NULL;
