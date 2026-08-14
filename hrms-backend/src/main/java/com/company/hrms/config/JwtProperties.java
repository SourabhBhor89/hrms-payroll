package com.company.hrms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Getter
@Setter
@ConfigurationProperties(prefix = "security.jwt")
public class JwtProperties {

    private String secret;

    private Duration accessTokenExpiration = Duration.ofMinutes(15);

    private Duration refreshTokenIdleTimeout = Duration.ofMinutes(30);

    private Duration activityUpdateInterval = Duration.ofMinutes(5);

    private boolean cookieSecure = false;

    private String cookieSameSite = "Lax";

    // Backward compatibility helper
    public long getExpiration() {
        return accessTokenExpiration != null ? accessTokenExpiration.toMillis() : 900000L;
    }
}