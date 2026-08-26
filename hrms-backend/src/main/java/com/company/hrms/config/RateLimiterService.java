package com.company.hrms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class RateLimiterService {

    private final Map<String, RateLimitBucket> cache = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, int requests, int periodSeconds) {
        long currentTime = System.currentTimeMillis();
        RateLimitBucket bucket = cache.compute(key, (k, existing) -> {
            if (existing == null || currentTime - existing.resetTime > periodSeconds * 1000L) {
                return new RateLimitBucket(requests, currentTime + periodSeconds * 1000L);
            }
            return existing;
        });

        synchronized (bucket) {
            if (bucket.remainingTokens.get() > 0) {
                bucket.remainingTokens.decrementAndGet();
                return true;
            }
            return false;
        }
    }

    public long getAvailableTokens(String key) {
        RateLimitBucket bucket = cache.get(key);
        return bucket != null ? bucket.remainingTokens.get() : 0;
    }

    private static class RateLimitBucket {
        final AtomicInteger remainingTokens;
        final long resetTime;

        RateLimitBucket(int capacity, long resetTime) {
            this.remainingTokens = new AtomicInteger(capacity);
            this.resetTime = resetTime;
        }
    }
}