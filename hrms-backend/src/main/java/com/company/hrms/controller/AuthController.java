package com.company.hrms.controller;

import com.company.hrms.config.RateLimit;
import com.company.hrms.dto.request.LoginRequest;
import com.company.hrms.dto.response.LoginResponse;
import com.company.hrms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@RateLimit(requests = 10, period = 60, type = RateLimit.RateLimitType.IP)
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @RateLimit(requests = 5, period = 60, type = RateLimit.RateLimitType.IP)
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return authService.login(request, httpRequest, httpResponse);
    }

    @PostMapping("/refresh")
    public LoginResponse refreshToken(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        return authService.refreshToken(request, response);
    }

    @PostMapping("/heartbeat")
    public Map<String, String> heartbeat(HttpServletRequest request) {
        return authService.heartbeat(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authService.logout(request, response);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}