package com.company.hrms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateEmployeeRequest {

    @NotBlank(message = "Employee code is required")
    private String employeeCode;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String department;
    private String designation;
    private String role; // e.g. EMPLOYEE, HR
    private String password;
    private LocalDate joiningDate;
    private LocalDate dateOfBirth;
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
