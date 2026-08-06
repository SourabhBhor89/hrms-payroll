package com.company.hrms.repository;

import com.company.hrms.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    List<UserPermission> findByUserIdAndIsActiveTrue(Long userId);

    Optional<UserPermission> findByUserIdAndPermissionId(Long userId, Long permissionId);

    @Query("SELECT up.permission.name FROM UserPermission up WHERE up.user.id = :userId AND up.isActive = true")
    Set<String> findActivePermissionNamesByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(up) > 0 FROM UserPermission up WHERE up.user.id = :userId")
    boolean existsByUserId(@Param("userId") Long userId);

    void deleteByUserIdAndPermissionId(Long userId, Long permissionId);
}
