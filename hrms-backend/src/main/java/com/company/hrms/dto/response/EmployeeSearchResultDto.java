package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSearchResultDto {
    private Long id;
    private String employeeCode;
    private String name;
    private String department;
    private String designation;
    private String email;
}
