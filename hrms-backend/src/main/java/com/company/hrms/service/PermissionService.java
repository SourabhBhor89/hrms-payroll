package com.company.hrms.service;

import com.company.hrms.dto.response.PermissionResponseDto;
import com.company.hrms.entity.User;

import java.util.List;
import java.util.Set;

public interface PermissionService {

    Set<String> getPermissionsForUser(User user);

    Set<String> getPermissionsByUserId(Long userId);

    List<PermissionResponseDto> getUserPermissions(Long targetUserId, String actorEmail);

    List<PermissionResponseDto> replaceUserPermissions(Long targetUserId, Set<Long> permissionIds, String actorEmail);

    List<PermissionResponseDto> addPermissionToUser(Long targetUserId, Long permissionId, String actorEmail);

    List<PermissionResponseDto> removePermissionFromUser(Long targetUserId, Long permissionId, String actorEmail);
}
