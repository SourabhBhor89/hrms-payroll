package com.company.hrms.service;

import com.company.hrms.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SessionCleanupScheduler {

    private final UserSessionRepository userSessionRepository;

    /**
     * Periodically clean up expired or revoked sessions (older than 24 hours).
     * Runs every 15 minutes.
     */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusHours(24);
        userSessionRepository.deleteExpiredSessions(now, cutoff);
    }
}
