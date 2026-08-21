-- ============================================================
-- HRMS DATABASE MIGRATION V23: GRANT EMPLOYEE_LEAVE_WFH_VIEW TO MANAGER
-- ============================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'EMPLOYEE_LEAVE_WFH_VIEW'
  AND r.name = 'MANAGER'
ON CONFLICT (role_id, permission_id) DO NOTHING;
