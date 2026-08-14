package com.company.hrms.service.impl;

import com.company.hrms.dto.response.PermissionResponseDto;
import com.company.hrms.entity.Permission;
import com.company.hrms.entity.RoleName;
import com.company.hrms.entity.User;
import com.company.hrms.entity.UserPermission;
import com.company.hrms.repository.PermissionRepository;
import com.company.hrms.repository.UserPermissionRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import com.company.hrms.constants.CacheNames;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Set<String> getPermissionsForUser(User user) {
        if (user == null || user.getId() == null) {
            return Set.of();
        }
        return getPermissionsByUserId(user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.USER_PERMISSIONS, key = "#userId")
    public Set<String> getPermissionsByUserId(Long userId) {
        if (userId == null) {
            return Set.of();
        }

        // If user has specific user_permission records configured, return those active permissions
        if (userPermissionRepository.existsByUserId(userId)) {
            return userPermissionRepository.findActivePermissionNamesByUserId(userId);
        }

        // Otherwise fall back to default role permissions + direct employee permissions
        Set<String> permissions = new HashSet<>(
                permissionRepository.findRolePermissionsByUserId(userId)
        );
        permissions.addAll(
                permissionRepository.findDirectEmployeePermissionsByUserId(userId)
        );
        return permissions;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponseDto> getUserPermissions(Long targetUserId, String actorEmail) {
        User actor = getUserByEmail(actorEmail);
        User targetUser = getUserById(targetUserId);

        validatePermissionManagementAccess(actor, targetUser);

        List<UserPermission> userPerms = userPermissionRepository.findByUserIdAndIsActiveTrue(targetUserId);
        if (!userPerms.isEmpty()) {
            return userPerms.stream()
                    .map(this::mapToDto)
                    .toList();
        }

        // If no user_permissions records exist yet, synthesize default response from role permissions
        return permissionRepository.findAll().stream()
                .map(p -> PermissionResponseDto.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .description(p.getDescription())
                        .assignedBy(null)
                        .assignedAt(p.getCreatedAt())
                        .isActive(getPermissionsByUserId(targetUserId).contains(p.getName()))
                        .build())
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.USER_PERMISSIONS, key = "#targetUserId")
    public List<PermissionResponseDto> replaceUserPermissions(Long targetUserId, Set<Long> permissionIds, String actorEmail) {
        User actor = getUserByEmail(actorEmail);
        User targetUser = getUserById(targetUserId);

        validatePermissionManagementAccess(actor, targetUser);

        // Deactivate existing user permissions
        List<UserPermission> existing = userPermissionRepository.findByUserIdAndIsActiveTrue(targetUserId);
        for (UserPermission up : existing) {
            up.setIsActive(false);
            userPermissionRepository.save(up);
        }

        // Add requested permissions
        if (permissionIds != null && !permissionIds.isEmpty()) {
            for (Long permId : permissionIds) {
                Permission perm = permissionRepository.findById(permId)
                        .orElseThrow(() -> new IllegalArgumentException("Permission not found with ID: " + permId));

                Optional<UserPermission> upOpt = userPermissionRepository.findByUserIdAndPermissionId(targetUserId, permId);
                UserPermission up;
                if (upOpt.isPresent()) {
                    up = upOpt.get();
                    up.setIsActive(true);
                    up.setAssignedBy(actor);
                } else {
                    up = new UserPermission(targetUser, perm, actor);
                }
                userPermissionRepository.save(up);
            }
        }

        return getUserPermissions(targetUserId, actorEmail);
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.USER_PERMISSIONS, key = "#targetUserId")
    public List<PermissionResponseDto> addPermissionToUser(Long targetUserId, Long permissionId, String actorEmail) {
        User actor = getUserByEmail(actorEmail);
        User targetUser = getUserById(targetUserId);

        validatePermissionManagementAccess(actor, targetUser);

        Permission perm = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new IllegalArgumentException("Permission not found with ID: " + permissionId));

        Optional<UserPermission> upOpt = userPermissionRepository.findByUserIdAndPermissionId(targetUserId, permissionId);
        UserPermission up;
        if (upOpt.isPresent()) {
            up = upOpt.get();
            up.setIsActive(true);
            up.setAssignedBy(actor);
        } else {
            up = new UserPermission(targetUser, perm, actor);
        }
        userPermissionRepository.save(up);

        return getUserPermissions(targetUserId, actorEmail);
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.USER_PERMISSIONS, key = "#targetUserId")
    public List<PermissionResponseDto> removePermissionFromUser(Long targetUserId, Long permissionId, String actorEmail) {
        User actor = getUserByEmail(actorEmail);
        User targetUser = getUserById(targetUserId);

        validatePermissionManagementAccess(actor, targetUser);

        Optional<UserPermission> upOpt = userPermissionRepository.findByUserIdAndPermissionId(targetUserId, permissionId);
        if (upOpt.isPresent()) {
            UserPermission up = upOpt.get();
            up.setIsActive(false);
            userPermissionRepository.save(up);
        }

        return getUserPermissions(targetUserId, actorEmail);
    }

    private void validatePermissionManagementAccess(User actor, User targetUser) {
        RoleName actorRole = actor.getRole().getName();
        RoleName targetRole = targetUser.getRole().getName();

        if (actorRole == RoleName.EMPLOYEE) {
            throw new AccessDeniedException("EMPLOYEE users cannot manage permissions");
        }

        if (targetRole == RoleName.ADMIN) {
            throw new AccessDeniedException("ADMIN permissions cannot be modified via permission management APIs");
        }

        if (actorRole == RoleName.HR) {
            if (targetRole == RoleName.HR || targetRole == RoleName.ADMIN) {
                throw new AccessDeniedException("HR users can only manage EMPLOYEE permissions, not HR or ADMIN permissions");
            }
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.findByEmailAndActiveTrue(email)
                        .orElseThrow(() -> new IllegalArgumentException("User not found: " + email)));
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found with ID: " + userId));
    }

    private PermissionResponseDto mapToDto(UserPermission up) {
        return PermissionResponseDto.builder()
                .id(up.getPermission().getId())
                .name(up.getPermission().getName())
                .description(up.getPermission().getDescription())
                .assignedBy(up.getAssignedBy() != null ? up.getAssignedBy().getId() : null)
                .assignedAt(up.getAssignedAt())
                .isActive(up.getIsActive())
                .build();
    }
}
