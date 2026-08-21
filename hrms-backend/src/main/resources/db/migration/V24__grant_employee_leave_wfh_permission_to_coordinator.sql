-- ============================================================
-- HRMS DATABASE MIGRATION V24: GRANT EMPLOYEE_LEAVE_WFH_VIEW TO COORDINATOR
-- ============================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'EMPLOYEE_LEAVE_WFH_VIEW'
  AND r.name = 'COORDINATOR'
ON CONFLICT (role_id, permission_id) DO NOTHING;
