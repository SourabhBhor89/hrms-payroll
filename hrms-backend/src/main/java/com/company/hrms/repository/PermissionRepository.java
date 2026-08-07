package com.company.hrms.repository;

import com.company.hrms.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByName(String name);

    @Query("SELECT p.name FROM User u JOIN u.role r JOIN r.permissions p WHERE u.id = :userId")
    Set<String> findRolePermissionsByUserId(@Param("userId") Long userId);

    @Query("SELECT p.name FROM Employee e JOIN e.permissions p WHERE e.user.id = :userId")
    Set<String> findDirectEmployeePermissionsByUserId(@Param("userId") Long userId);
}
