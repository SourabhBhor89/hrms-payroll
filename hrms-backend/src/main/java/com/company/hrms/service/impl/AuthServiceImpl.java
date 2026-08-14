package com.company.hrms.service.impl;

import com.company.hrms.config.JwtProperties;
import com.company.hrms.dto.request.LoginRequest;
import com.company.hrms.dto.response.LoginResponse;
import com.company.hrms.entity.User;
import com.company.hrms.entity.UserSession;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.repository.UserSessionRepository;
import com.company.hrms.security.JwtService;
import com.company.hrms.service.AuthService;
import com.company.hrms.service.PermissionService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final UserSessionRepository userSessionRepository;
    private final JwtService jwtService;
    private final PermissionService permissionService;
    private final JwtProperties jwtProperties;

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElseGet(() -> userRepository.findByEmailAndActiveTrue(request.getEmail())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user could not be found")));

        Set<String> permissions = permissionService.getPermissionsForUser(user);

        // Generate Access Token (15 min expiration)
        String accessToken = jwtService.generateToken(user, permissions);

        // Generate Opaque Refresh Token
        String rawRefreshToken = jwtService.generateOpaqueRefreshToken();
        String hashedRefreshToken = jwtService.hashToken(rawRefreshToken);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plus(jwtProperties.getRefreshTokenIdleTimeout());

        // Save session in PostgreSQL
        UserSession session = new UserSession();
        session.setUser(user);
        session.setSessionId(UUID.randomUUID().toString());
        session.setRefreshTokenHash(hashedRefreshToken);
        session.setCreatedAt(now);
        session.setLastActivityAt(now);
        session.setExpiresAt(expiresAt);
        if (httpRequest != null) {
            session.setCreatedByIp(httpRequest.getRemoteAddr());
            session.setUserAgent(httpRequest.getHeader("User-Agent"));
        }
        userSessionRepository.save(session);

        // Attach HttpOnly cookie if httpResponse is available
        if (httpResponse != null) {
            setRefreshTokenCookie(httpResponse, rawRefreshToken, jwtProperties.getRefreshTokenIdleTimeout().getSeconds());
        }

        String name = employeeRepository.findByUserId(user.getId())
                .map(emp -> {
                    if (emp.getLastName() != null && !emp.getLastName().isBlank()) {
                        return emp.getFirstName() + " " + emp.getLastName();
                    }
                    return emp.getFirstName();
                })
                .orElse(user.getEmail());

        long expiresInSeconds = jwtProperties.getAccessTokenExpiration().getSeconds();

        return LoginResponse.builder()
                .accessToken(accessToken)
//                .refreshToken(rawRefreshToken)
                .expiresIn(expiresInSeconds)
                .user(LoginResponse.UserSummary.builder()
                        .id(user.getId())
                        .name(name)
                        .role(user.getRole().getName().name())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        return login(request, null, null);
    }

    @Override
    @Transactional
    public LoginResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractRefreshTokenFromCookie(request);
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token cookie missing");
        }

        String hashedToken = jwtService.hashToken(rawRefreshToken);
        Optional<UserSession> sessionOpt = userSessionRepository.findByRefreshTokenHash(hashedToken);

        if (sessionOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token session");
        }

        UserSession session = sessionOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // Check if session was revoked or expired
        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(now)) {
            // Potential token reuse / replay attack attempt: revoke all active sessions for this user for security
            userSessionRepository.revokeAllUserSessions(session.getUser().getId(), now);
            clearRefreshTokenCookie(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired or revoked. Please log in again.");
        }

        User user = session.getUser();
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
            clearRefreshTokenCookie(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account is inactive or disabled");
        }

        // Transactionally Safe Atomic Session Rotation: Revoke current session atomically
        int revokedRows = userSessionRepository.revokeSessionIfValid(session.getId(), now, now);
        if (revokedRows == 0) {
            // Race condition: session was already revoked concurrently!
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Concurrent session refresh detected");
        }

        // Create NEW rotated session
        String newRawRefreshToken = jwtService.generateOpaqueRefreshToken();
        String newHashedRefreshToken = jwtService.hashToken(newRawRefreshToken);
        LocalDateTime newExpiresAt = now.plus(jwtProperties.getRefreshTokenIdleTimeout());

        UserSession newSession = new UserSession();
        newSession.setUser(user);
        newSession.setSessionId(UUID.randomUUID().toString());
        newSession.setRefreshTokenHash(newHashedRefreshToken);
        newSession.setCreatedAt(now);
        newSession.setLastActivityAt(now);
        newSession.setExpiresAt(newExpiresAt);
        if (request != null) {
            newSession.setCreatedByIp(request.getRemoteAddr());
            newSession.setUserAgent(request.getHeader("User-Agent"));
        }
        userSessionRepository.save(newSession);

        // Update HttpOnly Cookie with new rotated refresh token
        setRefreshTokenCookie(response, newRawRefreshToken, jwtProperties.getRefreshTokenIdleTimeout().getSeconds());

        // Generate NEW Access Token (15 mins)
        Set<String> permissions = permissionService.getPermissionsForUser(user);
        String accessToken = jwtService.generateToken(user, permissions);

        String name = employeeRepository.findByUserId(user.getId())
                .map(emp -> {
                    if (emp.getLastName() != null && !emp.getLastName().isBlank()) {
                        return emp.getFirstName() + " " + emp.getLastName();
                    }
                    return emp.getFirstName();
                })
                .orElse(user.getEmail());

        long expiresInSeconds = jwtProperties.getAccessTokenExpiration().getSeconds();

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRawRefreshToken)
                .expiresIn(expiresInSeconds)
                .user(LoginResponse.UserSummary.builder()
                        .id(user.getId())
                        .name(name)
                        .role(user.getRole().getName().name())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public Map<String, String> heartbeat(HttpServletRequest request) {
        String rawRefreshToken = extractRefreshTokenFromCookie(request);
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token cookie missing");
        }

        String hashedToken = jwtService.hashToken(rawRefreshToken);
        Optional<UserSession> sessionOpt = userSessionRepository.findByRefreshTokenHash(hashedToken);

        if (sessionOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid session");
        }

        UserSession session = sessionOpt.get();
        LocalDateTime now = LocalDateTime.now();

        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired or revoked");
        }

        User user = session.getUser();
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account is inactive");
        }

        // Database Write Optimization: Update last_activity_at & extend expires_at ONLY IF activity_update_interval has passed
        LocalDateTime lastActivity = session.getLastActivityAt();
        long updateIntervalSecs = jwtProperties.getActivityUpdateInterval().getSeconds();

        if (lastActivity == null || lastActivity.plusSeconds(updateIntervalSecs).isBefore(now)) {
            LocalDateTime newExpiresAt = now.plus(jwtProperties.getRefreshTokenIdleTimeout());
            userSessionRepository.updateActivityAndExpiry(session.getId(), now, newExpiresAt);
        }

        return Map.of("status", "ok", "message", "Session updated successfully");
    }

    @Override
    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractRefreshTokenFromCookie(request);
        LocalDateTime now = LocalDateTime.now();

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hashedToken = jwtService.hashToken(rawRefreshToken);
            userSessionRepository.findByRefreshTokenHash(hashedToken)
                    .ifPresent(session -> {
                        userSessionRepository.revokeSessionIfValid(session.getId(), now, now);
                    });
        }

        if (response != null) {
            clearRefreshTokenCookie(response);
        }
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String tokenValue, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, tokenValue)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/api/v1/auth")
                .maxAge(maxAgeSeconds)
                .sameSite(jwtProperties.getCookieSameSite())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite(jwtProperties.getCookieSameSite())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}