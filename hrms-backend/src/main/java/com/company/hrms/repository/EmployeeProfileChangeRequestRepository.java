package com.company.hrms.repository;

import com.company.hrms.entity.Employee;
import com.company.hrms.entity.EmployeeProfileChangeRequest;
import com.company.hrms.entity.EmployeeProfileChangeRequest.ProfileChangeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeProfileChangeRequestRepository extends JpaRepository<EmployeeProfileChangeRequest, Long> {

    @Query("SELECT r FROM EmployeeProfileChangeRequest r WHERE r.employee.id = :employeeId ORDER BY r.submittedAt DESC")
    List<EmployeeProfileChangeRequest> findByEmployeeId(@Param("employeeId") Long employeeId);

//    List<EmployeeProfileChangeRequest> findByEmployeeId(Long employeeId);

    List<EmployeeProfileChangeRequest> findByEmployeeIdAndStatus(Long employeeId, ProfileChangeStatus status);

    Page<EmployeeProfileChangeRequest> findByStatus(ProfileChangeStatus status, Pageable pageable);

    @Query("SELECT r FROM EmployeeProfileChangeRequest r WHERE r.status = :status ORDER BY r.submittedAt DESC")
    Page<EmployeeProfileChangeRequest> findByStatusOrderBySubmittedAtDesc(@Param("status") ProfileChangeStatus status, Pageable pageable);

    Optional<EmployeeProfileChangeRequest> findByEmployeeIdAndId(Long employeeId, Long id);

    @Query("SELECT r FROM EmployeeProfileChangeRequest r WHERE r.status IN :statuses ORDER BY r.submittedAt DESC")
    Page<EmployeeProfileChangeRequest> findByStatusInOrderBySubmittedAtDesc(@Param("statuses") List<ProfileChangeStatus> statuses, Pageable pageable);

    @Query("SELECT r FROM EmployeeProfileChangeRequest r ORDER BY r.submittedAt DESC")
    Page<EmployeeProfileChangeRequest> findAllByOrderBySubmittedAtDesc(Pageable pageable);
}
