package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {

    private long totalEmployees;
    private long presentToday;
    private long absentToday;
    private double attendanceRate;
    private long pendingLeaves;
    private long activeProjects;
    private long upcomingHolidays;
}
