-- ============================================================
-- LEAVE MANAGEMENT TABLES
-- Version: V10
-- ============================================================

-- ============================================================
-- LEAVE TYPES
-- Configuration for different types of leaves
-- ============================================================

CREATE TABLE leave_types
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),

    default_days_per_year INT NOT NULL,

    paid BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    max_carry_forward_days DECIMAL(10, 2),
--     has_monthly_limit BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_leave_types_code
        UNIQUE (code)
);

-- ============================================================
-- LEAVES
-- Individual leave requests/applications
-- ============================================================

CREATE TABLE leaves
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    employee_id BIGINT NOT NULL,
    leave_type_id BIGINT NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DOUBLE NOT NULL,

    reason VARCHAR(500),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    approved_by BIGINT NULL,
    approved_at DATETIME(6) NULL,

    rejection_reason VARCHAR(500),

    attachment_url VARCHAR(500),

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_leaves_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id),

    CONSTRAINT fk_leaves_leave_type
        FOREIGN KEY (leave_type_id)
        REFERENCES leave_types(id),

    CONSTRAINT fk_leaves_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES employees(id),

    CONSTRAINT chk_leaves_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),

    CONSTRAINT chk_leaves_dates
        CHECK (end_date >= start_date),

    CONSTRAINT chk_leaves_total_days
        CHECK (total_days > 0)
);

-- ============================================================
-- LEAVE BALANCES
-- Track leave balance for each employee per leave type per year
-- ============================================================

CREATE TABLE leave_balances
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    employee_id BIGINT NOT NULL,
    leave_type_id BIGINT NOT NULL,

    total_days DECIMAL(10, 2) NOT NULL,
    used_days DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    pending_days DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    balance_days DECIMAL(10, 2) NOT NULL,
    carried_forward_days DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    year INT NOT NULL,
    month INT NOT NULL,

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_leave_balances_employee_type_year_month
        UNIQUE (employee_id, leave_type_id, year, month),

    CONSTRAINT fk_leave_balances_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id),

    CONSTRAINT fk_leave_balances_leave_type
        FOREIGN KEY (leave_type_id)
        REFERENCES leave_types(id),

    CONSTRAINT chk_leave_balances_days
        CHECK (total_days >= 0 AND used_days >= 0 AND pending_days >= 0 AND balance_days >= 0)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_leave_types_active
    ON leave_types(active);

CREATE INDEX idx_leave_types_code
    ON leave_types(code);

CREATE INDEX idx_leaves_employee_id
    ON leaves(employee_id);

CREATE INDEX idx_leaves_leave_type_id
    ON leaves(leave_type_id);

CREATE INDEX idx_leaves_status
    ON leaves(status);

CREATE INDEX idx_leaves_start_date
    ON leaves(start_date);

CREATE INDEX idx_leaves_end_date
    ON leaves(end_date);

CREATE INDEX idx_leaves_approved_by
    ON leaves(approved_by);

CREATE INDEX idx_leave_balances_employee_id
    ON leave_balances(employee_id);

CREATE INDEX idx_leave_balances_leave_type_id
    ON leave_balances(leave_type_id);

CREATE INDEX idx_leave_balances_year
    ON leave_balances(year);

CREATE INDEX idx_leave_balances_month
    ON leave_balances(month);