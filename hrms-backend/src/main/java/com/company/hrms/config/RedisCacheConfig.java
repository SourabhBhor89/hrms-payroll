package com.company.hrms.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.company.hrms.constants.CacheNames;

@Configuration
public class RedisCacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheConfig.class);

    @Value("${spring.cache.ttl.user-permissions:30m}")
    private Duration userPermissionsTtl;

    @Value("${spring.cache.ttl.employees:5m}")
    private Duration employeesTtl;

    @Value("${spring.cache.ttl.employee-profiles:10m}")
    private Duration employeeProfilesTtl;

    @Value("${spring.cache.ttl.leave-types:24h}")
    private Duration leaveTypesTtl;

    @Value("${spring.cache.ttl.holidays:24h}")
    private Duration holidaysTtl;

    @Bean
    public RedisCacheConfiguration defaultCacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.json()));
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = defaultCacheConfiguration();

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put(CacheNames.USER_PERMISSIONS, defaultConfig.entryTtl(userPermissionsTtl));
        cacheConfigurations.put(CacheNames.EMPLOYEES, defaultConfig.entryTtl(employeesTtl));
        cacheConfigurations.put(CacheNames.EMPLOYEE_PROFILES, defaultConfig.entryTtl(employeeProfilesTtl));
        cacheConfigurations.put(CacheNames.LEAVE_TYPES, defaultConfig.entryTtl(leaveTypesTtl));
        cacheConfigurations.put(CacheNames.HOLIDAYS, defaultConfig.entryTtl(holidaysTtl));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.warn("Redis cache GET error for key '{}' in cache '{}': {}. Falling back to direct execution.", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, org.springframework.cache.Cache cache, Object key, Object value) {
                log.warn("Redis cache PUT error for key '{}' in cache '{}': {}.", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.warn("Redis cache EVICT error for key '{}' in cache '{}': {}.", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, org.springframework.cache.Cache cache) {
                log.warn("Redis cache CLEAR error in cache '{}': {}.", cache.getName(), exception.getMessage());
            }
        };
    }
}
