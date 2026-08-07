package com.company.hrms.dto.response;

import com.company.hrms.entity.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDto {

    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String avatar;
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime clockIn;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime clockOut;
    private Double totalHours;
    private AttendanceStatus status;
    private Boolean isLocked;
    private String notes;
    private String regularizationStatus; // PENDING, APPROVED, REJECTED, or null
}
