package com.company.hrms.security;

import com.company.hrms.config.JwtProperties;
import com.company.hrms.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    public String generateToken(User user, Collection<String> permissions) {

        Map<String, Object> claims = new HashMap<>();

        claims.put("userId", user.getId());
        claims.put("role", user.getRole().getName().name());
        claims.put("permissions", permissions != null ? new ArrayList<>(permissions) : List.of());

        Date issuedAt = new Date();
        Date expiration = new Date(
                issuedAt.getTime() + jwtProperties.getExpiration()
        );

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateToken(User user) {
        return generateToken(user, List.of());
    }

    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("type", "REFRESH");

        Date issuedAt = new Date();
        // 7 days expiration for refresh token
        Date expiration = new Date(issuedAt.getTime() + (7L * 24 * 60 * 60 * 1000));

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        Number userId = extractAllClaims(token)
                .get("userId", Number.class);

        return userId != null ? userId.longValue() : null;
    }

    public String extractRole(String token) {
        return extractAllClaims(token)
                .get("role", String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        Object rawPermissions = extractAllClaims(token).get("permissions");
        if (rawPermissions instanceof List<?>) {
            List<?> list = (List<?>) rawPermissions;
            List<String> permissions = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof String) {
                    permissions.add((String) item);
                }
            }
            return permissions;
        }
        return List.of();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);

        return username.equals(userDetails.getUsername())
                && !isTokenExpired(token);
    }

    public boolean isTokenValid(String token, String username) {
        String tokenUsername = extractUsername(token);

        return tokenUsername.equals(username)
                && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token)
                .getExpiration()
                .before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(
                jwtProperties.getSecret()
        );

        return Keys.hmacShaKeyFor(keyBytes);
    }
}