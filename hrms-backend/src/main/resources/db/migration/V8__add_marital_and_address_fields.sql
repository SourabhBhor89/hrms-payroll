-- ============================================================
-- HRMS DATABASE MIGRATION V8: ADD MARITAL STATUS, MARRIAGE DATE, CURRENT & PERMANENT ADDRESS FIELDS
-- ============================================================

ALTER TABLE employees
    ADD COLUMN current_address VARCHAR(500) NULL,
    ADD COLUMN permanent_address VARCHAR(500) NULL,
    ADD COLUMN marital_status VARCHAR(50) NULL,
    ADD COLUMN marriage_date DATE NULL;
