package com.company.hrms.repository;

import com.company.hrms.entity.AttendanceRegularization;
import com.company.hrms.entity.RegularizationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRegularizationRepository extends JpaRepository<AttendanceRegularization, Long> {

    List<AttendanceRegularization> findByEmployeeIdOrderBySubmittedAtDesc(Long employeeId);

    List<AttendanceRegularization> findByAttendanceIdAndStatusIn(Long attendanceId, List<RegularizationStatus> statuses);

    List<AttendanceRegularization> findByAttendanceIdInAndStatusIn(java.util.Collection<Long> attendanceIds, java.util.Collection<RegularizationStatus> statuses);

    List<AttendanceRegularization> findAllByOrderBySubmittedAtDesc();

    List<AttendanceRegularization> findByStatus(RegularizationStatus status);
}
