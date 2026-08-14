-- Insert additional leave types if they don't already exist
INSERT INTO leave_types
    (code, name, description, default_days_per_year, paid, requires_approval, active, max_carry_forward_days, created_at, updated_at)
VALUES
    ('CASUAL', 'Casual Leave', 'Paid casual leave for personal reasons', 12, TRUE, TRUE, TRUE, 3.00, NOW(), NOW()),
    ('SICK', 'Sick Leave', 'Paid sick leave for medical reasons', 12, TRUE, TRUE, TRUE, 3.00, NOW(), NOW()),
    ('WFH', 'Work From Home', 'Work from home allowance', 180, TRUE, TRUE, TRUE, 0.00, NOW(), NOW()),
    ('UNPAID', 'Unpaid Leave', 'Unpaid leave for personal reasons', 120, FALSE, TRUE, TRUE, 0.00, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;