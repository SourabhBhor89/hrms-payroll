package com.company.hrms.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/holidays")
public class HolidayController {

    @GetMapping
    @PreAuthorize("hasAuthority('HOLIDAY_VIEW')")
    public ResponseEntity<List<Map<String, Object>>> getHolidays() {
        List<Map<String, Object>> holidays = List.of(
                Map.of("id", 1, "name", "New Year's Day", "date", "2026-01-01", "type", "National", "day", "Thursday"),
                Map.of("id", 2, "name", "Memorial Day", "date", "2026-05-25", "type", "National", "day", "Monday"),
                Map.of("id", 3, "name", "Independence Day", "date", "2026-07-04", "type", "National", "day", "Saturday"),
                Map.of("id", 4, "name", "Labor Day", "date", "2026-09-07", "type", "National", "day", "Monday"),
                Map.of("id", 5, "name", "Thanksgiving Day", "date", "2026-11-26", "type", "National", "day", "Thursday"),
                Map.of("id", 6, "name", "Christmas Day", "date", "2026-12-25", "type", "National", "day", "Friday")
        );
        return ResponseEntity.ok(holidays);
    }
}
