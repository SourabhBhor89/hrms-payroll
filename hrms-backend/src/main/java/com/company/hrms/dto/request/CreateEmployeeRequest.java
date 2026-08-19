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
    private String role;
    private String password;
    private LocalDate joiningDate;
    private LocalDate dateOfBirth;
    private LocalDate marriageDate;
    private String address;
    private String currentAddress;
    private String permanentAddress;
    private String maritalStatus;
    private Boolean isFresher;
    private String totalExperience;
    private String previousCompany;
    private String previousDesignation;
    private String previousSalary;
    private String currentSalary;
    private String techStack;
    private String education;
    @NotBlank(message = "10th qualification is required")
    private String tenthQualification;
    @NotBlank(message = "12th qualification is required")
    private String twelfthQualification;
    @NotBlank(message = "Bachelor's qualification is required")
    private String bachelorQualification;
    private String highestQualification;
    private Boolean hasHighestQualification;
    private String emergencyContact1;
    private String emergencyContact2;
    private String photoUrl;
    private Boolean hasGap;
    private String gapReason;
    private String referenceDetails;
}
