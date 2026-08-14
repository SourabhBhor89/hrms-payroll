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
public class LeaveTypeResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer defaultDaysPerYear;
    private Boolean paid;
    private Boolean requiresApproval;
    private Boolean active;
    private BigDecimal maxCarryForwardDays;
    private Boolean eligible; // Added for eligibility check based on tenure
//    private Boolean hasMonthlyLimit;
}