package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLeaveBalanceDetail {

    private Long leaveTypeId;
    private String leaveTypeCode;
    private String leaveTypeName;
    private BigDecimal totalDays;
    private BigDecimal usedDays;
    private BigDecimal pendingDays;
    private BigDecimal balanceDays;
    private BigDecimal carriedForwardDays;
    private Boolean paid;
}