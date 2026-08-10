package com.company.hrms.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class    UpdateLeaveRequest {

    private Long leaveTypeId;

    private LocalDate startDate;

    private LocalDate endDate;

    @Positive(message = "Total days must be positive")
    private Double totalDays;

    private String reason;

    private String attachmentUrl;
}