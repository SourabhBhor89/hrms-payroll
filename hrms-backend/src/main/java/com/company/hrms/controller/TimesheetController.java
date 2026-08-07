package com.company.hrms.controller;

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
public class TimesheetController {

    @GetMapping
    @PreAuthorize("hasAuthority('TIMESHEET_CATEGORIES_VIEW')")
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
