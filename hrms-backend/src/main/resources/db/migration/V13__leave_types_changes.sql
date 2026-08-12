INSERT INTO leave_types
(code, name, description, default_days_per_year, paid, requires_approval, active, max_carry_forward_days, created_at, updated_at)
VALUES
    ('EARNED', 'Earned Leave', 'Paid earned leave for employees with 6+ months tenure', 12, TRUE, TRUE, TRUE, 3.00, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

UPDATE leave_types
SET active = FALSE, updated_at = NOW()
WHERE code IN ('CASUAL', 'SICK');

UPDATE leave_types
SET default_days_per_year = 0, paid = FALSE, updated_at = NOW()
WHERE code = 'WFH';
