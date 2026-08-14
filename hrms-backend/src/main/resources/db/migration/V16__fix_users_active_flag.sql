-- Ensure all user accounts and employee records have active status set to TRUE
UPDATE users SET active = TRUE WHERE active IS NULL OR active = FALSE;
UPDATE employees SET active = TRUE WHERE active IS NULL OR active = FALSE;
