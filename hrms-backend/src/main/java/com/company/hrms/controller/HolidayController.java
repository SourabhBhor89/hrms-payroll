package com.company.hrms.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.hrms.dto.response.HolidayDto;
import com.company.hrms.service.Google_Calendar_Service.GoogleCalendarService;

@RestController
@RequestMapping("/api/v1/holidays")
public class HolidayController {

    @Autowired
    private GoogleCalendarService googleCalendarService;

    @GetMapping
    @PreAuthorize("hasAuthority('HOLIDAY_VIEW')")
    public ResponseEntity<List<HolidayDto>> getHolidays() {
        return ResponseEntity.ok(googleCalendarService.getPublicHolidays());
    }

    @PostMapping("/clear-cache")
    @PreAuthorize("hasAuthority('HOLIDAY_VIEW')")
    public ResponseEntity<List<HolidayDto>> clearCacheAndRefresh() {
        googleCalendarService.clearHolidaysCache();
        return ResponseEntity.ok(googleCalendarService.getPublicHolidays());
    }
}
