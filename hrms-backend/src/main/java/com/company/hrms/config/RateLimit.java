package com.company.hrms.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    
    int requests() default 100;
    
    int period() default 60; // in seconds
    
    String key() default ""; // custom key for rate limiting
    
    RateLimitType type() default RateLimitType.USER;
    
    enum RateLimitType {
        USER,      // Limit per user ID
        IP,        // Limit per IP address
        GLOBAL     // Global limit
    }
}