package com.company.hrms.repository;

import com.company.hrms.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByUserId(Long userId);

    Optional<Employee> findByEmployeeCode(String employeeCode);

    boolean existsByEmployeeCode(String employeeCode);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 'TRHPL-([0-9]{3})') AS INTEGER)), 0) FROM employees WHERE employee_code LIKE 'TRHPL-%'", nativeQuery = true)
    Integer findMaxEmployeeCodeNumericSuffix();

    @Query("SELECT e.employeeCode FROM Employee e")
    List<String> findAllEmployeeCodes();

    long countByActiveTrue();

    Page<Employee> findAllByOrderByActiveDesc(Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(CONCAT(e.firstName, ' ', COALESCE(e.lastName, ''))) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.department) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.designation) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.user.email) LIKE LOWER(CONCAT('%', :search, '%')))" +
           " AND (:department IS NULL OR :department = 'All' OR LOWER(e.department) = LOWER(:department))" +
           " AND (:role IS NULL OR :role = 'All' OR LOWER(e.user.role.name) = LOWER(:role))")
    Page<Employee> searchEmployeesPage(
            @Param("search") String search,
            @Param("department") String department,
            @Param("role") String role,
            Pageable pageable
    );

    @Query("SELECT e FROM Employee e WHERE LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(e.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(e.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(CONCAT(e.firstName, ' ', COALESCE(e.lastName, ''))) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Employee> searchEmployees(@Param("query") String query, Pageable pageable);

    @Query("SELECT e.benchStatus FROM Employee e WHERE e.id = :id")
    Optional<String> findBenchStatusByEmployeeId(@Param("id") Long id);
}