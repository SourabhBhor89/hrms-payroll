package com.company.hrms.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    @GetMapping
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    public Map<String, Object> getAttendance(Authentication authentication) {
        return Map.of(
                "message", "Attendance records retrieved successfully",
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ATTENDANCE_CREATE')")
    public Map<String, Object> createAttendance(Authentication authentication) {
        return Map.of(
                "message", "Attendance record created successfully",
                "username", authentication.getName()
        );
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ATTENDANCE_UPDATE')")
    public Map<String, Object> updateAttendance(Authentication authentication) {
        return Map.of(
                "message", "Attendance record updated successfully",
                "username", authentication.getName()
        );
    }
}
