package com.company.hrms.controller;

import com.company.hrms.dto.request.CreateProfileChangeRequest;
import com.company.hrms.dto.response.ProfileChangeRequestResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.security.CustomUserDetails;
import com.company.hrms.service.EmployeeProfileChangeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile-changes")
@RequiredArgsConstructor
public class EmployeeProfileChangeController {

    private final EmployeeProfileChangeService profileChangeService;
    private final EmployeeRepository employeeRepository;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createProfileChangeRequest(
            @Valid @RequestBody CreateProfileChangeRequest request,
            Authentication authentication) {
        try {
            Long employeeId = getEmployeeIdFromAuthentication(authentication);
            ProfileChangeRequestResponse response = profileChangeService.createProfileChangeRequest(request, employeeId);
            return ResponseEntity.status(201).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to create profile change request: " + ex.getMessage()));
        }
    }

    @GetMapping("/my-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyProfileChangeRequests(
            Authentication authentication) {
        try {
            Long employeeId = getEmployeeIdFromAuthentication(authentication);
            List<ProfileChangeRequestResponse> requests = profileChangeService.getEmployeeProfileChangeRequests(employeeId);
            return ResponseEntity.ok(requests);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to retrieve profile change requests: " + ex.getMessage()));
        }
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_UPDATE')")
    public ResponseEntity<?> getPendingProfileChangeRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "submittedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        try {
            Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<ProfileChangeRequestResponse> requests = profileChangeService.getPendingProfileChangeRequests(pageable);
            return ResponseEntity.ok(requests);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to retrieve pending profile change requests: " + ex.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getProfileChangeRequestById(@PathVariable Long id) {
        try {
            ProfileChangeRequestResponse request = profileChangeService.getProfileChangeRequestById(id);
            return ResponseEntity.ok(request);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to retrieve profile change request: " + ex.getMessage()));
        }
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_UPDATE')")
    public ResponseEntity<?> approveProfileChangeRequest(
            @PathVariable Long id,
            @RequestBody(required = false) String remarks,
            Authentication authentication) {
        try {
            Long approverId = getEmployeeIdFromAuthentication(authentication);
            ProfileChangeRequestResponse response = profileChangeService.approveProfileChangeRequest(id, approverId, remarks);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to approve profile change request: " + ex.getMessage()));
        }
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_UPDATE')")
    public ResponseEntity<?> rejectProfileChangeRequest(
            @PathVariable Long id,
            @RequestBody(required = false) String remarks,
            Authentication authentication) {
        try {
            Long approverId = getEmployeeIdFromAuthentication(authentication);
            ProfileChangeRequestResponse response = profileChangeService.rejectProfileChangeRequest(id, approverId, remarks);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to reject profile change request: " + ex.getMessage()));
        }
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> cancelProfileChangeRequest(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            Long employeeId = getEmployeeIdFromAuthentication(authentication);
            ProfileChangeRequestResponse response = profileChangeService.cancelProfileChangeRequest(id, employeeId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to cancel profile change request: " + ex.getMessage()));
        }
    }

    private Long getEmployeeIdFromAuthentication(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUserId();
        
        Employee employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found for user ID: " + userId));
        
        return employee.getId();
    }
}
