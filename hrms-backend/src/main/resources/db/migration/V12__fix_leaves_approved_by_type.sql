-- ============================================================
-- HRMS DATABASE MIGRATION V12: FIX LEAVES APPROVED_BY COLUMN TYPE
-- ============================================================
-- This migration fixes the approved_by column type from VARCHAR(255) to BIGINT
-- to match the Leave entity's Employee relationship requirement.

-- Drop the existing foreign key constraint if it exists
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS fk_leaves_approved_by;

-- Convert approved_by from VARCHAR(255) to BIGINT
-- First, set all NULL values to NULL (safe default)
ALTER TABLE leaves ALTER COLUMN approved_by TYPE BIGINT USING NULL::bigint;

-- Re-add the foreign key constraint
ALTER TABLE leaves 
    ADD CONSTRAINT fk_leaves_approved_by 
    FOREIGN KEY (approved_by) 
    REFERENCES employees(id);
