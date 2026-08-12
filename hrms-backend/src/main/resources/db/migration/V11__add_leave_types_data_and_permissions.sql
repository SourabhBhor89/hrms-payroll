-- Insert additional leave types if they don't already exist
INSERT INTO leave_types
    (code, name, description, default_days_per_year, paid, requires_approval, active, max_carry_forward_days, created_at, updated_at)
VALUES
    ('CASUAL', 'Casual Leave', 'Paid casual leave for personal reasons', 12, TRUE, TRUE, TRUE, 3.00,NOW(6), NOW(6)),
    ('SICK', 'Sick Leave', 'Paid sick leave for medical reasons', 12, TRUE, TRUE, TRUE, 3.00,NOW(6), NOW(6)),
    ('WFH', 'Work From Home', 'Work from home allowance', 180, TRUE, TRUE, TRUE, 0.00, NOW(6), NOW(6)),
    ('UNPAID', 'Unpaid Leave', 'Unpaid leave for personal reasons', 120, FALSE, TRUE, TRUE, 0.00, NOW(6), NOW(6));

-- ============================================================
-- ADD LEAVE TYPE MANAGEMENT PERMISSION
-- ============================================================

-- Assign permissions to ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN'
  AND p.name IN ('LEAVE_TYPE_VIEW')
    ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign permissions to HR role if HR role exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR'
  AND p.name IN ('LEAVE_TYPE_VIEW')
    ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign CREATE permission to EMPLOYEE role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'EMPLOYEE'
AND p.name IN ('LEAVE_TYPE_VIEW')
ON DUPLICATE KEY UPDATE role_id = role_id;
