-- Update LOP to be treated as unlimited (same as WFH)
UPDATE leave_types
SET default_days_per_year = 0, 
    description = 'Loss of Pay leave for personal reasons',
    updated_at = NOW()
WHERE code = 'LOP';
