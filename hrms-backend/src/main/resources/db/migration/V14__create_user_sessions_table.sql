CREATE TABLE user_sessions
(
    id BIGSERIAL NOT NULL,

    user_id BIGINT NOT NULL,

    session_id VARCHAR(100) NOT NULL,

    refresh_token_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMP NOT NULL,

    revoked_at TIMESTAMP NULL,

    created_by_ip VARCHAR(50) NULL,

    user_agent VARCHAR(255) NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_user_sessions_session_id
        UNIQUE (session_id),

    CONSTRAINT uk_user_sessions_token_hash
        UNIQUE (refresh_token_hash),

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id
    ON user_sessions(user_id);

CREATE INDEX idx_user_sessions_hash
    ON user_sessions(refresh_token_hash);

CREATE INDEX idx_user_sessions_expires_at
    ON user_sessions(expires_at);

CREATE INDEX idx_user_sessions_revoked_at
    ON user_sessions(revoked_at);
