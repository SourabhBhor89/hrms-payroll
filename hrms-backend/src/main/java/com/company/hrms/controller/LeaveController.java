package com.company.hrms.controller;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
import com.company.hrms.dto.response.EmployeeLeaveDataResponse;
import com.company.hrms.dto.response.LeaveResponse;
import com.company.hrms.dto.response.LeaveTypeResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.security.CustomUserDetails;
import com.company.hrms.service.LeaveBalanceSchedulerService;
import com.company.hrms.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final EmployeeRepository employeeRepository;
    private  final LeaveBalanceSchedulerService leaveBalanceSchedulerService;

    @PostMapping
    @PreAuthorize("hasAuthority('LEAVE_APPLY')")
    public ResponseEntity<LeaveResponse> applyLeave(
            @Valid @RequestBody CreateLeaveRequest request,
            Authentication authentication
    ) {
        Long employeeId = getEmployeeIdFromAuthentication(authentication);
        LeaveResponse response = leaveService.createLeave(request, employeeId);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('LEAVE_VIEW')")
    public ResponseEntity<EmployeeLeaveDataResponse> getEmployeeLeaveData(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Authentication authentication
    ) {
        Long employeeId = getEmployeeIdFromAuthentication(authentication);
        if (year == null) {
            year = java.time.Year.now().getValue();
        }
        if (month == null) {
            month = java.time.LocalDate.now().getMonthValue();
        }
        EmployeeLeaveDataResponse data = leaveService.getEmployeeLeaveData(employeeId, year, month);
        return ResponseEntity.ok(data);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('LEAVE_APPLY')")
    public ResponseEntity<LeaveResponse> updateLeave(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLeaveRequest request,
            Authentication authentication
    ) {
        Long employeeId = getEmployeeIdFromAuthentication(authentication);
        LeaveResponse leave = leaveService.updateLeave(id, request, employeeId);
        return ResponseEntity.ok(leave);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('LEAVE_APPLY')")
    public ResponseEntity<Void> cancelLeave(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long employeeId = getEmployeeIdFromAuthentication(authentication);
        leaveService.cancelLeave(id, employeeId);
        return ResponseEntity.noContent().build();
    }

    // Leave approval operations
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public ResponseEntity<LeaveResponse> approveLeave(
            @PathVariable Long id,
            @Valid @RequestBody ApproveLeaveRequest request,
            Authentication authentication
    ) {
        Long approverId = getEmployeeIdFromAuthentication(authentication);
        LeaveResponse leave = leaveService.approveLeave(id, request, approverId);
        return ResponseEntity.ok(leave);
    }

    @GetMapping("/approvals/pending")
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public ResponseEntity<List<LeaveResponse>> getPendingApprovals(Authentication authentication) {
        Long approverId = getEmployeeIdFromAuthentication(authentication);
        List<LeaveResponse> leaves = leaveService.getPendingApprovals(approverId);
        return ResponseEntity.ok(leaves);
    }

    // Get available leave types
    @GetMapping("/types")
    @PreAuthorize("hasAuthority('LEAVE_TYPE_VIEW')")
    public ResponseEntity<List<LeaveTypeResponse>> getAllLeaveTypes() {
        List<LeaveTypeResponse> leaveTypes = leaveService.getAllLeaveTypes();
        return ResponseEntity.ok(leaveTypes);
    }

    @PostMapping("/cron/monthly-leave-balance")
    @PreAuthorize("hasAuthority('LEAVE_SETUP_VIEW')")
    public ResponseEntity<Map<String, String>> triggerMonthlyLeaveBalanceUpdate() {
        try {
            leaveBalanceSchedulerService.processMonthlyLeaveBalanceUpdate();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Monthly leave balance update completed successfully (includes year-end reset if January)"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "status", "error",
                    "message", "Failed to process monthly leave balance update: " + e.getMessage()
            ));
        }
    }

    // Helper method to extract employee ID from authentication
    private Long getEmployeeIdFromAuthentication(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUserId();
        
        Employee employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found for user ID: " + userId));
        
        return employee.getId();
    }
}
