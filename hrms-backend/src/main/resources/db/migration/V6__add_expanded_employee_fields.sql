-- ============================================================
-- HRMS DATABASE MIGRATION V6: ADD EXPANDED EMPLOYEE FIELDS
-- ============================================================

ALTER TABLE employees
    ADD COLUMN department VARCHAR(100) NULL,
    ADD COLUMN designation VARCHAR(100) NULL,
    ADD COLUMN address VARCHAR(255) NULL,
    ADD COLUMN is_fresher BOOLEAN NULL DEFAULT FALSE,
    ADD COLUMN total_experience VARCHAR(50) NULL,
    ADD COLUMN previous_company VARCHAR(100) NULL,
    ADD COLUMN previous_designation VARCHAR(100) NULL,
    ADD COLUMN previous_salary VARCHAR(50) NULL,
    ADD COLUMN current_salary VARCHAR(50) NULL,
    ADD COLUMN tech_stack VARCHAR(255) NULL,
    ADD COLUMN education VARCHAR(255) NULL,
    ADD COLUMN emergency_contact_1 VARCHAR(100) NULL,
    ADD COLUMN emergency_contact_2 VARCHAR(100) NULL,
    ADD COLUMN photo_url VARCHAR(255) NULL,
    ADD COLUMN has_gap BOOLEAN NULL DEFAULT FALSE,
    ADD COLUMN gap_reason VARCHAR(255) NULL,
    ADD COLUMN reference_details VARCHAR(255) NULL;
