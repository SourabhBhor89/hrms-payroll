package com.company.hrms.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.lang.reflect.Method;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        Method method = handlerMethod.getMethod();
        
        // Check method level annotation
        RateLimit methodRateLimit = method.getAnnotation(RateLimit.class);
        // Check class level annotation
        RateLimit classRateLimit = handlerMethod.getBeanType().getAnnotation(RateLimit.class);
        
        RateLimit rateLimit = methodRateLimit != null ? methodRateLimit : classRateLimit;
        
        if (rateLimit == null) {
            return true;
        }

        String key = generateRateLimitKey(request, rateLimit);
        boolean allowed = rateLimiterService.tryConsume(key, rateLimit.requests(), rateLimit.period());

        if (!allowed) {
            response.setStatus(429); // HTTP 429 Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too Many Requests\", \"message\": \"Rate limit exceeded. Please try again later.\"}");
            log.warn("Rate limit exceeded for key: {} on endpoint: {}", key, request.getRequestURI());
            return false;
        }

        // Add rate limit headers
        response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit.requests()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(rateLimiterService.getAvailableTokens(key)));
        response.setHeader("X-RateLimit-Period", String.valueOf(rateLimit.period()));

        return true;
    }

    private String generateRateLimitKey(HttpServletRequest request, RateLimit rateLimit) {
        String customKey = rateLimit.key();
        if (!customKey.isEmpty()) {
            return customKey;
        }

        switch (rateLimit.type()) {
            case USER:
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.isAuthenticated()) {
                    return "user:" + authentication.getName();
                }
                return "ip:" + getClientIp(request);
            case IP:
                return "ip:" + getClientIp(request);
            case GLOBAL:
                return "global";
            default:
                return "ip:" + getClientIp(request);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Handle multiple IPs in X-Forwarded-For
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}