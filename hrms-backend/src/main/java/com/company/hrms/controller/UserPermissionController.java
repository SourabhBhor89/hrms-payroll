package com.company.hrms.controller;

import com.company.hrms.dto.request.AssignPermissionsRequest;
import com.company.hrms.dto.response.PermissionResponseDto;
import com.company.hrms.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserPermissionController {

    private final PermissionService permissionService;

    @GetMapping("/{userId}/permissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'MANAGER')")
    public ResponseEntity<List<PermissionResponseDto>> getUserPermissions(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.getUserPermissions(userId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @PutMapping("/{userId}/permissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'MANAGER')")
    public ResponseEntity<List<PermissionResponseDto>> replaceUserPermissions(
            @PathVariable Long userId,
            @Valid @RequestBody AssignPermissionsRequest request,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.replaceUserPermissions(userId, request.getPermissionIds(), authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @PostMapping("/{userId}/permissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'MANAGER')")
    public ResponseEntity<List<PermissionResponseDto>> addPermissionToUser(
            @PathVariable Long userId,
            @RequestParam Long permissionId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.addPermissionToUser(userId, permissionId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }

    @DeleteMapping("/{userId}/permissions/{permissionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'MANAGER')")
    public ResponseEntity<List<PermissionResponseDto>> removePermissionFromUser(
            @PathVariable Long userId,
            @PathVariable Long permissionId,
            Authentication authentication
    ) {
        List<PermissionResponseDto> permissions = permissionService.removePermissionFromUser(userId, permissionId, authentication.getName());
        return ResponseEntity.ok(permissions);
    }
}
