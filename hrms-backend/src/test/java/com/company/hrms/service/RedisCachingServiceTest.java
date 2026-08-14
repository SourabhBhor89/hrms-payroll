package com.company.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.company.hrms.constants.CacheNames;

class RedisCachingServiceTest {

    @Test
    @DisplayName("Verify central CacheNames constants adhere to specification")
    void testCacheNamesConstants() {
        assertEquals("user_permissions", CacheNames.USER_PERMISSIONS);
        assertEquals("employees", CacheNames.EMPLOYEES);
        assertEquals("employee_profiles", CacheNames.EMPLOYEE_PROFILES);
        assertEquals("leave_types", CacheNames.LEAVE_TYPES);
        assertEquals("holidays", CacheNames.HOLIDAYS);
    }
}
