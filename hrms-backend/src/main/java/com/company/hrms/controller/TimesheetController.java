package com.company.hrms.controller;

import com.company.hrms.config.RateLimit;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/timesheets")
@RateLimit(requests = 50, period = 60, type = RateLimit.RateLimitType.USER)
public class TimesheetController {

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getTimesheets(Authentication authentication) {
        List<Map<String, Object>> timesheets = List.of(
                Map.of(
                        "id", "ts-101",
                        "employeeName", authentication.getName(),
                        "weekStartDate", "2026-08-03",
                        "weekEndDate", "2026-08-09",
                        "totalHours", 40,
                        "status", "Submitted",
                        "project", "HRMS Platform Revamp"
                )
        );
        return ResponseEntity.ok(timesheets);
    }
}
