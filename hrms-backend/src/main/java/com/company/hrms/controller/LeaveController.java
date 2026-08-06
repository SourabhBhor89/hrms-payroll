package com.company.hrms.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/leaves")
public class LeaveController {

    @GetMapping
    @PreAuthorize("hasAuthority('LEAVE_VIEW')")
    public Map<String, Object> getLeaves(Authentication authentication) {
        return Map.of(
                "message", "Leave records retrieved successfully",
                "username", authentication.getName()
        );
    }

    @PostMapping("/apply")
    @PreAuthorize("hasAuthority('LEAVE_APPLY')")
    public Map<String, Object> applyLeave(Authentication authentication) {
        return Map.of(
                "message", "Leave application submitted successfully",
                "username", authentication.getName()
        );
    }

    @PostMapping("/approve")
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public Map<String, Object> approveLeave(Authentication authentication) {
        return Map.of(
                "message", "Leave application approved successfully",
                "username", authentication.getName()
        );
    }

    @GetMapping("/setup")
    @PreAuthorize("hasAuthority('LEAVE_SETUP_VIEW')")
    public Map<String, Object> getLeaveSetup(Authentication authentication) {
        return Map.of(
                "message", "Leave setup configuration loaded",
                "username", authentication.getName()
        );
    }
}
