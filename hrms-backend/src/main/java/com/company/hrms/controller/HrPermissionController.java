package com.company.hrms.controller;

import com.company.hrms.config.RateLimit;
import com.company.hrms.dto.request.AssignPermissionsRequest;
import com.company.hrms.dto.response.PermissionResponseDto;
import com.company.hrms.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr")
@RequiredArgsConstructor
@RateLimit(requests = 50, period = 60, type = RateLimit.RateLimitType.USER)
public class HrPermissionController {

    private final PermissionService permissionService;

    @GetMapping("/{userId}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionResponseDto>> getHrPermissions(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.getUserPermissions(userId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @PutMapping("/{userId}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionResponseDto>> replaceHrPermissions(
            @PathVariable Long userId,
            @Valid @RequestBody AssignPermissionsRequest request,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.replaceUserPermissions(userId, request.getPermissionIds(), authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @PostMapping("/{userId}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionResponseDto>> addPermissionToHr(
            @PathVariable Long userId,
            @RequestParam Long permissionId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.addPermissionToUser(userId, permissionId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @DeleteMapping("/{userId}/permissions/{permissionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionResponseDto>> removePermissionFromHr(
            @PathVariable Long userId,
            @PathVariable Long permissionId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.removePermissionFromUser(userId, permissionId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }
}
