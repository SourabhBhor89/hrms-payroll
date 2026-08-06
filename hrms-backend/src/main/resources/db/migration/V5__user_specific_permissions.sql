-- ============================================================
-- HRMS DATABASE MIGRATION V5: USER-SPECIFIC PERMISSIONS
-- ============================================================

DROP TABLE IF EXISTS user_permissions;

-- 1. CREATE USER_PERMISSIONS TABLE
CREATE TABLE user_permissions
(
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    assigned_by BIGINT NULL,
    assigned_at DATETIME(6) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(6) NOT NULL DEFAULT NOW(6),
    created_by BIGINT NULL,
    updated_at DATETIME(6) NULL,
    updated_by BIGINT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_user_permissions_user_perm
        UNIQUE (user_id, permission_id),

    CONSTRAINT fk_user_permissions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_permissions_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- 2. INDEXES
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(is_active);

-- 3. INITIAL MIGRATION OF ROLE PERMISSIONS TO USER_PERMISSIONS FOR EXISTING USERS
INSERT INTO user_permissions (user_id, permission_id, assigned_by, assigned_at, is_active, created_at, updated_at)
SELECT u.id, rp.permission_id, NULL, NOW(6), TRUE, NOW(6), NOW(6)
FROM users u
JOIN role_permissions rp ON u.role_id = rp.role_id
ON DUPLICATE KEY UPDATE is_active = TRUE;
