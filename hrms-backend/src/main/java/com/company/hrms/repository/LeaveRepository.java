package com.company.hrms.repository;

import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Leave;
import com.company.hrms.entity.LeaveType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {

    List<Leave> findByEmployeeId(Long employeeId);

    Page<Leave> findByEmployeeId(Long employeeId, Pageable pageable);

    List<Leave> findByEmployeeIdAndStatus(Long employeeId, Leave.LeaveStatus status);

    Page<Leave> findByEmployeeIdAndStatus(Long employeeId, Leave.LeaveStatus status, Pageable pageable);

    long countByStatus(Leave.LeaveStatus status);

    Optional<Leave> findByIdAndEmployeeId(Long id, Long employeeId);

    @Query("SELECT l FROM Leave l WHERE l.employee = :employee AND l.status = :status " +
           "AND ((l.startDate BETWEEN :startDate AND :endDate) " +
           "OR (l.endDate BETWEEN :startDate AND :endDate) " +
           "OR (l.startDate <= :startDate AND l.endDate >= :endDate))")
    List<Leave> findOverlappingLeaves(@Param("employee") Employee employee,
                                       @Param("status") Leave.LeaveStatus status,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);

    @Query("SELECT l FROM Leave l WHERE l.status IN :statuses")
    List<Leave> findByStatusIn(@Param("statuses") List<Leave.LeaveStatus> statuses);

    @Query("SELECT l FROM Leave l WHERE l.status IN :statuses")
    Page<Leave> findByStatusIn(@Param("statuses") List<Leave.LeaveStatus> statuses, Pageable pageable);

    List<Leave> findByApprovedById(Long approvedById);

    @Query("SELECT COUNT(l) FROM Leave l WHERE l.employee = :employee " +
           "AND l.leaveType = :leaveType " +
           "AND l.status = 'APPROVED' " +
           "AND l.startDate >= :yearStart AND l.startDate <= :yearEnd")
    Long countApprovedLeavesInYear(@Param("employee") Employee employee,
                                   @Param("leaveType") LeaveType leaveType,
                                   @Param("yearStart") LocalDate yearStart,
                                   @Param("yearEnd") LocalDate yearEnd);
}