package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLeaveWfhSummaryDto {

    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String designation;
    private String email;

    private Integer selectedYear;
    private Integer selectedMonth;

    private Double monthLeaveTakenTotal;
    private Double monthWfhTakenTotal;

    private Double ytdLeaveTakenTotal;
    private Double ytdWfhTakenTotal;

    private List<CalendarDayEntry> calendarEntries;
    private List<LeaveTypeSummaryItem> leaveTypeSummaries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CalendarDayEntry {
        private LocalDate date;
        private String dayOfWeek;
        private Boolean isWeekend;
        private Boolean isHoliday;
        private String holidayTitle;
        private Boolean isLeave;
        private Boolean isWfh;
        private Boolean isPresent;
        private String status;
        private String leaveTypeCode;
        private String leaveTypeName;
        private Double totalDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveTypeSummaryItem {
        private Long leaveTypeId;
        private String leaveTypeCode;
        private String leaveTypeName;
        private Double monthTakenDays;
        private BigDecimal balanceDays;
        private Integer defaultDaysPerYear;
        private Boolean paid;
    }
}
