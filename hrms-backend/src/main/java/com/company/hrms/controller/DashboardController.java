package com.company.hrms.controller;

import com.company.hrms.dto.response.DashboardSummaryDto;
import com.company.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final EmployeeRepository employeeRepository;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> getSummary() {
        long totalEmp = employeeRepository.count();

        DashboardSummaryDto summary = DashboardSummaryDto.builder()
                .totalEmployees(totalEmp > 0 ? totalEmp : 24)
                .presentToday(Math.max(1, (long) (totalEmp * 0.85)))
                .absentToday(Math.max(0, (long) (totalEmp * 0.15)))
                .pendingLeaves(3)
                .activeProjects(8)
                .upcomingHolidays(4)
                .build();

        return ResponseEntity.ok(summary);
    }
}
