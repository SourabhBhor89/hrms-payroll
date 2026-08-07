package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDto {

    private Long id;
    private Long userId;
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String department;
    private String designation;
    private String role;
    private LocalDate joiningDate;
    private LocalDate dateOfBirth;
    private Boolean active;

    private String address;
    private Boolean isFresher;
    private String totalExperience;
    private String previousCompany;
    private String previousDesignation;
    private String previousSalary;
    private String currentSalary;
    private String techStack;
    private String education;
    private String emergencyContact1;
    private String emergencyContact2;
    private String photoUrl;
    private Boolean hasGap;
    private String gapReason;
    private String referenceDetails;
}
