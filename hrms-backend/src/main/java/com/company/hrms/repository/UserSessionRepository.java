package com.company.hrms.repository;

import com.company.hrms.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    Optional<UserSession> findBySessionId(String sessionId);

    @Modifying
    @Query("UPDATE UserSession s SET s.revokedAt = :revokedAt WHERE s.id = :id AND s.revokedAt IS NULL AND s.expiresAt > :now")
    int revokeSessionIfValid(@Param("id") Long id, @Param("revokedAt") LocalDateTime revokedAt, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.lastActivityAt = :now, s.expiresAt = :newExpiresAt WHERE s.id = :id AND s.revokedAt IS NULL AND s.expiresAt > :now")
    int updateActivityAndExpiry(@Param("id") Long id, @Param("now") LocalDateTime now, @Param("newExpiresAt") LocalDateTime newExpiresAt);

    @Modifying
    @Query("UPDATE UserSession s SET s.revokedAt = :now WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    int revokeAllUserSessions(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :now OR (s.revokedAt IS NOT NULL AND s.revokedAt < :cutoff)")
    int deleteExpiredSessions(@Param("now") LocalDateTime now, @Param("cutoff") LocalDateTime cutoff);
}
