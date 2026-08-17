package com.company.hrms.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.company.hrms.dto.response.DashboardSummaryDto;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.AttendanceStatus;
import com.company.hrms.entity.Leave;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRepository leaveRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'EMPLOYEE_MANAGEMENT_VIEW')")
    public ResponseEntity<DashboardSummaryDto> getSummary() {
        long totalEmp = employeeRepository.count();

        LocalDate today = LocalDate.now();
        List<Attendance> todayRecords = attendanceRepository.findByDateBetween(today, today);
        long presentCount = todayRecords.stream()
                .filter(a -> a.getClockIn() != null && a.getStatus() != AttendanceStatus.WFH && a.getStatus() != AttendanceStatus.LEAVE)
                .map(a -> a.getEmployee() != null ? a.getEmployee().getId() : a.getId())
                .distinct()
                .count();

        long effectiveTotal = totalEmp > 0 ? totalEmp : 1;
        double rate = (double) presentCount / effectiveTotal * 100.0;
        double roundedRate = Math.round(rate * 10.0) / 10.0;

        long realPendingLeaves = leaveRepository.countByStatus(Leave.LeaveStatus.PENDING);

        DashboardSummaryDto summary = DashboardSummaryDto.builder()
                .totalEmployees(totalEmp)
                .presentToday(presentCount)
                .absentToday(Math.max(0, totalEmp - presentCount))
                .attendanceRate(roundedRate)
                .pendingLeaves(realPendingLeaves)
                .activeProjects(8)
                .upcomingHolidays(4)
                .build();

        return ResponseEntity.ok(summary);
    }
}
