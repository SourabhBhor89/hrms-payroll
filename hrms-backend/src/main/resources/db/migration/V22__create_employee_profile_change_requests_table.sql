-- ============================================================
-- HRMS DATABASE MIGRATION V22: CREATE EMPLOYEE PROFILE CHANGE REQUESTS TABLE
-- ============================================================

-- Create employee_profile_change_requests table
CREATE TABLE employee_profile_change_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    old_value VARCHAR(500),
    new_value VARCHAR(500),
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by BIGINT,
    review_remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    CONSTRAINT fk_profile_change_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_profile_change_reviewer FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX idx_profile_change_employee_id ON employee_profile_change_requests(employee_id);
CREATE INDEX idx_profile_change_status ON employee_profile_change_requests(status);
CREATE INDEX idx_profile_change_field_type ON employee_profile_change_requests(field_type);
CREATE INDEX idx_profile_change_submitted_at ON employee_profile_change_requests(submitted_at);

-- Add table comment
COMMENT ON TABLE employee_profile_change_requests IS 'Stores employee profile change requests for approval workflow';
COMMENT ON COLUMN employee_profile_change_requests.field_type IS 'PHONE, ADDRESS, CURRENT_ADDRESS, PERMANENT_ADDRESS';
COMMENT ON COLUMN employee_profile_change_requests.status IS 'PENDING, APPROVED, REJECTED, CANCELLED';
