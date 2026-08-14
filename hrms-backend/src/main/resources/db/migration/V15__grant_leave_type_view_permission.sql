-- Insert LEAVE_TYPE_VIEW permission if not already existing
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES ('LEAVE_TYPE_VIEW', 'View available leave types', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Grant LEAVE_TYPE_VIEW permission to all roles (ADMIN, HR, EMPLOYEE, TEAM_LEAD)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'LEAVE_TYPE_VIEW'
ON CONFLICT (role_id, permission_id) DO NOTHING;
