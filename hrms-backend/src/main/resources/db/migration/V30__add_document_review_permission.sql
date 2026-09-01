-- V30: Add Document Review Permission and Unique Constraint

-- 1. Create the new permission
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES ('EMPLOYEE_DOCUMENT_REVIEW', 'Ability to view and review employee onboarding documents', NOW(), NOW());

-- 2. Grant the permission to ADMIN and HR roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ADMIN', 'HR')
  AND p.name = 'EMPLOYEE_DOCUMENT_REVIEW';

-- 3. Add unique constraint on employee_code and document_type
ALTER TABLE employee_documents
    ADD CONSTRAINT uk_employee_document_type UNIQUE (employee_code, document_type);
