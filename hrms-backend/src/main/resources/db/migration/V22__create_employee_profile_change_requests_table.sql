-- ============================================================
-- HRMS DATABASE MIGRATION V22: CREATE EMPLOYEE PROFILE CHANGE REQUESTS TABLE
-- ============================================================

-- Create employee_profile_change_requests table
CREATE TABLE employee_profile_change_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    field_type VARCHAR(50) NOT NULL COMMENT 'PHONE, ADDRESS, CURRENT_ADDRESS, PERMANENT_ADDRESS',
    old_value VARCHAR(500),
    new_value VARCHAR(500),
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED, CANCELLED',
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by BIGINT,
    review_remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX idx_profile_change_employee_id ON employee_profile_change_requests(employee_id);
CREATE INDEX idx_profile_change_status ON employee_profile_change_requests(status);
CREATE INDEX idx_profile_change_field_type ON employee_profile_change_requests(field_type);
CREATE INDEX idx_profile_change_submitted_at ON employee_profile_change_requests(submitted_at);

-- Add table comment
ALTER TABLE employee_profile_change_requests COMMENT = 'Stores employee profile change requests for approval workflow';
