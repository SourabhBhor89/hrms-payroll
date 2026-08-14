package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLeaveDataResponse {

    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String email;
    private String department;
    private String designation;
    private Integer year;
    private Integer month;
    private List<EmployeeLeaveBalanceDetail> leaveBalances;
    private List<LeaveResponse> leaves;
}