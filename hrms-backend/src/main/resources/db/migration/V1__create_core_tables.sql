-- ============================================================
-- HRMS CORE DATABASE
-- Version: V1
-- ============================================================

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles
(
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_roles_name
        UNIQUE (name)
);

-- ============================================================
-- USERS
-- Authentication-related information
-- ============================================================

CREATE TABLE users
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,

    role_id BIGINT NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_users_email
        UNIQUE (email),

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id),

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_users_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

-- ============================================================
-- EMPLOYEES
-- Business/profile information
-- ============================================================

CREATE TABLE employees
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    user_id BIGINT NOT NULL,

    employee_code VARCHAR(50) NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),

    phone VARCHAR(30),

    date_of_birth DATE,
    joining_date DATE,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_employees_user
        UNIQUE (user_id),

    CONSTRAINT uk_employees_code
        UNIQUE (employee_code),

    CONSTRAINT fk_employees_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_employees_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_employees_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

-- ============================================================
-- EMPLOYEE WORK DETAILS
-- ============================================================

CREATE TABLE employee_work_details
(
    id BIGINT NOT NULL AUTO_INCREMENT,

    employee_id BIGINT NOT NULL,

    department VARCHAR(100),
    designation VARCHAR(100),

    reporting_manager_id BIGINT NULL,

    work_week_id BIGINT NULL,

    employment_type VARCHAR(50),

    work_location VARCHAR(150),

    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NULL,

    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_employee_work_details_employee
        UNIQUE (employee_id),

    CONSTRAINT fk_work_details_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id),

    CONSTRAINT fk_work_details_manager
        FOREIGN KEY (reporting_manager_id)
        REFERENCES employees(id),

    CONSTRAINT fk_work_details_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_work_details_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_role_id
    ON users(role_id);

CREATE INDEX idx_users_active
    ON users(active);

CREATE INDEX idx_employees_active
    ON employees(active);

CREATE INDEX idx_employees_first_name
    ON employees(first_name);

CREATE INDEX idx_employees_last_name
    ON employees(last_name);

CREATE INDEX idx_employees_phone
    ON employees(phone);

CREATE INDEX idx_employees_dob
    ON employees(date_of_birth);

CREATE INDEX idx_work_details_department
    ON employee_work_details(department);

CREATE INDEX idx_work_details_designation
    ON employee_work_details(designation);

-- ============================================================
-- INITIAL ROLES
-- ============================================================

INSERT INTO roles
    (name, created_at, updated_at, created_by, updated_by)
VALUES
    ('ADMIN', NOW(6), NOW(6), NULL, NULL),
    ('EMPLOYEE', NOW(6), NOW(6), NULL, NULL);