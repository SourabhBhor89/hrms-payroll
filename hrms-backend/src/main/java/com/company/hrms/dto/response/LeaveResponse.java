package com.company.hrms.dto.response;

import com.company.hrms.entity.Leave;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveResponse {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeCode;
    private Long leaveTypeId;
    private String leaveTypeName;
    private String leaveTypeCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double totalDays;
    private String reason;
    private Leave.LeaveStatus status;
    private Long approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectionReason;
//    private String attachmentUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}