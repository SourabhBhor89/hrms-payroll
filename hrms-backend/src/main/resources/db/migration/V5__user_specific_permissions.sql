-- ============================================================
-- HRMS DATABASE MIGRATION V5: USER-SPECIFIC PERMISSIONS
-- ============================================================

DROP TABLE IF EXISTS user_permissions;

-- 1. CREATE USER_PERMISSIONS TABLE
CREATE TABLE user_permissions
(
    id BIGSERIAL NOT NULL,
    user_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    assigned_by BIGINT NULL,
    assigned_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMP NULL,
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
SELECT u.id, rp.permission_id, NULL, NOW(), TRUE, NOW(), NOW()
FROM users u
JOIN role_permissions rp ON u.role_id = rp.role_id
ON CONFLICT (user_id, permission_id) DO UPDATE SET is_active = TRUE;
