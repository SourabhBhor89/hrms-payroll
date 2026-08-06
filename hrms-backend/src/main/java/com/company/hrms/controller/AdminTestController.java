package com.company.hrms.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminTestController {

    @GetMapping("/test")
    public Map<String, Object> test(
            Authentication authentication
    ) {

        return Map.of(
                "message", "Admin endpoint accessed successfully",
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        );
    }
}