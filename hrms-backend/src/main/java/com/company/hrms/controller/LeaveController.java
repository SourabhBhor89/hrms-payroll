package com.company.hrms.controller;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateEmployeeDayStatusRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
import com.company.hrms.dto.response.EmployeeLeaveDataResponse;
import com.company.hrms.dto.response.EmployeeLeaveWfhSummaryDto;
import com.company.hrms.dto.response.EmployeeSearchResultDto;
import com.company.hrms.dto.response.LeaveResponse;
import com.company.hrms.dto.response.LeaveTypeResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.security.CustomUserDetails;
import com.company.hrms.service.LeaveBalanceSchedulerService;
import com.company.hrms.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
        boolean isAdminOrHr = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN") ||
                        a.getAuthority().equals("ROLE_HR") || a.getAuthority().equals("HR") ||
                        a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("MANAGER") ||
                        a.getAuthority().equals("ROLE_COORDINATOR") || a.getAuthority().equals("COORDINATOR") ||
                        a.getAuthority().equals("LEAVE_APPROVE") ||
                        a.getAuthority().equals("LEAVE_VIEW_ALL"));

        if (year == null) {
            year = java.time.Year.now().getValue();
        }
        if (month == null) {
            month = java.time.LocalDate.now().getMonthValue();
        }
        EmployeeLeaveDataResponse data = leaveService.getEmployeeLeaveData(employeeId, year, month, isAdminOrHr);
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
    @PreAuthorize("hasAnyAuthority('LEAVE_APPROVE', 'LEAVE_VIEW_ALL')")
    public ResponseEntity<List<LeaveResponse>> getPendingApprovals(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Long approverId = getEmployeeIdFromAuthentication(authentication);
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        List<LeaveResponse> leaves = leaveService.getPendingApprovals(approverId, pageable);
        return ResponseEntity.ok(leaves);
    }

    // Get available leave types
    @GetMapping("/types")
    @PreAuthorize("hasAnyAuthority('LEAVE_VIEW', 'LEAVE_APPLY', 'LEAVE_SETUP_VIEW', 'LEAVE_TYPE_VIEW')")
    public ResponseEntity<List<LeaveTypeResponse>> getAllLeaveTypes() {
        List<LeaveTypeResponse> leaveTypes = leaveService.getAllLeaveTypes();
        return ResponseEntity.ok(leaveTypes);
    }

    // Get available leave types for current employee (based on tenure)
    @GetMapping("/types/available")
    @PreAuthorize("hasAuthority('LEAVE_APPLY')")
    public ResponseEntity<List<LeaveTypeResponse>> getAvailableLeaveTypesForEmployee(Authentication authentication) {
        Long employeeId = getEmployeeIdFromAuthentication(authentication);
        List<LeaveTypeResponse> leaveTypes = leaveService.getAvailableLeaveTypesForEmployee(employeeId);
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

    @GetMapping("/employee-search")
    @PreAuthorize("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')")
    public ResponseEntity<List<EmployeeSearchResultDto>> searchEmployees(
            @RequestParam(required = false, defaultValue = "") String query
    ) {
        return ResponseEntity.ok(leaveService.searchEmployees(query));
    }

    @PutMapping("/employee-status")
    @PreAuthorize("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')")
    public ResponseEntity<Map<String, String>> updateEmployeeDayStatus(
            @Valid @RequestBody UpdateEmployeeDayStatusRequest request
    ) {
        leaveService.updateEmployeeDayStatus(request);
        return ResponseEntity.ok(Map.of("message", "Employee day status updated successfully"));
    }

    @GetMapping("/employee-summary/{employeeId}")
    @PreAuthorize("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')")
    public ResponseEntity<EmployeeLeaveWfhSummaryDto> getEmployeeLeaveWfhSummary(
            @PathVariable Long employeeId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        return ResponseEntity.ok(leaveService.getEmployeeLeaveWfhSummary(employeeId, year, month));
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
