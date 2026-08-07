package com.company.hrms.dto.response;

import com.company.hrms.entity.RegularizationStatus;
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
public class AttendanceRegularizationDto {

    private Long id;
    private Long attendanceId;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String employeeAvatar;
    private String department;

    private LocalDate attendanceDate;
    private String correctionType;

    private LocalDateTime originalClockIn;
    private LocalDateTime originalClockOut;
    private LocalDateTime requestedClockIn;
    private LocalDateTime requestedClockOut;

    private Double originalWorkingHours;
    private Double requestedWorkingHours;

    private String reason;
    private String attachmentUrl;
    private RegularizationStatus status;

    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime cancelledAt;

    private String reviewedBy;
    private String reviewRemarks;
}
