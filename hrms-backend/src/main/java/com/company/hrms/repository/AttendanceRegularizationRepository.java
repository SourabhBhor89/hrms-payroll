package com.company.hrms.repository;

import com.company.hrms.entity.AttendanceRegularization;
import com.company.hrms.entity.RegularizationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRegularizationRepository extends JpaRepository<AttendanceRegularization, Long> {

    List<AttendanceRegularization> findByEmployeeIdOrderBySubmittedAtDesc(Long employeeId);

    Page<AttendanceRegularization> findByEmployeeIdOrderBySubmittedAtDesc(Long employeeId, Pageable pageable);

    List<AttendanceRegularization> findByAttendanceIdAndStatusIn(Long attendanceId, List<RegularizationStatus> statuses);

    List<AttendanceRegularization> findByAttendanceIdInAndStatusIn(java.util.Collection<Long> attendanceIds, java.util.Collection<RegularizationStatus> statuses);

    List<AttendanceRegularization> findAllByOrderBySubmittedAtDesc();

    Page<AttendanceRegularization> findAllByOrderBySubmittedAtDesc(Pageable pageable);

    List<AttendanceRegularization> findByStatus(RegularizationStatus status);

    Page<AttendanceRegularization> findByStatus(RegularizationStatus status, Pageable pageable);

    List<AttendanceRegularization> findByEmployeeIdAndSubmittedAtBetween(Long employeeId, LocalDateTime startDateTime, LocalDateTime endDateTime);
}
