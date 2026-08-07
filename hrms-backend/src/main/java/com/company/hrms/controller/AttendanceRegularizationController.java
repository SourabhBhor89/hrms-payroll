package com.company.hrms.controller;

import com.company.hrms.dto.request.CreateRegularizationRequest;
import com.company.hrms.dto.request.ReviewRegularizationRequest;
import com.company.hrms.dto.response.AttendanceRegularizationDto;
import com.company.hrms.service.AttendanceRegularizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance/regularizations")
@RequiredArgsConstructor
public class AttendanceRegularizationController {

    private final AttendanceRegularizationService regularizationService;

    @PostMapping
    @PreAuthorize("hasAuthority('ATTENDANCE_REGULARIZATION_CREATE')")
    public ResponseEntity<AttendanceRegularizationDto> createRegularization(
            Authentication authentication,
            @Valid @RequestBody CreateRegularizationRequest request
    ) {
        AttendanceRegularizationDto result = regularizationService.createRegularization(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ATTENDANCE_REGULARIZATION_CREATE')")
    public ResponseEntity<List<AttendanceRegularizationDto>> getMyRegularizations(Authentication authentication) {
        List<AttendanceRegularizationDto> list = regularizationService.getMyRegularizations(authentication.getName());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    public ResponseEntity<AttendanceRegularizationDto> getRegularizationById(
            Authentication authentication,
            @PathVariable Long id
    ) {
        AttendanceRegularizationDto dto = regularizationService.getRegularizationById(id, authentication.getName());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('ATTENDANCE_REGULARIZATION_CREATE')")
    public ResponseEntity<AttendanceRegularizationDto> cancelRegularization(
            Authentication authentication,
            @PathVariable Long id
    ) {
        AttendanceRegularizationDto result = regularizationService.cancelRegularization(id, authentication.getName());
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceRegularizationDto>> getAllRegularizations(
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        boolean canViewAll = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ATTENDANCE_REGULARIZATION_VIEW_ALL"));
        if (!canViewAll && authentication != null) {
            return ResponseEntity.ok(regularizationService.getMyRegularizations(authentication.getName()));
        }
        List<AttendanceRegularizationDto> list = regularizationService.getAllRegularizations(status, department, employeeId, startDate, endDate);
        return ResponseEntity.ok(list);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ATTENDANCE_REGULARIZATION_APPROVE')")
    public ResponseEntity<AttendanceRegularizationDto> approveRegularization(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) ReviewRegularizationRequest request
    ) {
        AttendanceRegularizationDto result = regularizationService.approveRegularization(id, authentication.getName(), request);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ATTENDANCE_REGULARIZATION_APPROVE')")
    public ResponseEntity<AttendanceRegularizationDto> rejectRegularization(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) ReviewRegularizationRequest request
    ) {
        AttendanceRegularizationDto result = regularizationService.rejectRegularization(id, authentication.getName(), request);
        return ResponseEntity.ok(result);
    }
}
