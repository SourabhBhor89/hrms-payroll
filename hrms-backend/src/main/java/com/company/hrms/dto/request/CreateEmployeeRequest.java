package com.company.hrms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateEmployeeRequest {

    @NotBlank(message = "Employee code is required")
    @Pattern(regexp = "^TRHPL-[0-9]{3}$", message = "Employee code must follow TRHPL-001 format")
    private String employeeCode;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s'-]+$", message = "First name can only contain letters, spaces, hyphens, and apostrophes")
    private String firstName;

    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s'-]+$", message = "Last name can only contain letters, spaces, hyphens, and apostrophes")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be a valid 10-digit number")
    private String phone;

    @NotBlank(message = "Department is required")
    @Pattern(regexp = "^(Engineering|Human Resources|Design|Marketing|Finance)$", message = "Invalid department selected")
    private String department;

    @NotBlank(message = "Designation is required")
    @Size(min = 2, max = 100, message = "Designation must be between 2 and 100 characters")
    private String designation;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(EMPLOYEE|HR|MANAGER|COORDINATOR|ADMIN)$", message = "Invalid role selected")
    private String role;

    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,20}$", message = "Password must be 8-20 characters long and include uppercase, lowercase, digit, and special character")
    private String password;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private LocalDate marriageDate;
    private String address;

    @NotBlank(message = "Current address is required")
    @Size(min = 5, max = 500, message = "Current address must be between 5 and 500 characters")
    private String currentAddress;

    @NotBlank(message = "Permanent address is required")
    @Size(min = 5, max = 500, message = "Permanent address must be between 5 and 500 characters")
    private String permanentAddress;

    @NotBlank(message = "Marital status is required")
    @Pattern(regexp = "^(Single|Married|Divorced|Widowed)$", message = "Marital status must be Single, Married, Divorced, or Widowed")
    private String maritalStatus;

    @NotNull(message = "Fresher status is required")
    private Boolean isFresher;

    private String totalExperience;
    private String previousCompany;
    private String previousDesignation;
    private String previousSalary;

    @NotBlank(message = "Current salary is required")
    @Pattern(regexp = "^[0-9]+(\\.[0-9]{1,2})?$", message = "Current salary must be a non-negative number")
    private String currentSalary;

    @Size(max = 255, message = "Tech stack cannot exceed 255 characters")
    private String techStack;

    private String education;

    @NotBlank(message = "10th qualification is required")
    @Size(min = 2, max = 100, message = "10th qualification must be between 2 and 100 characters")
    private String tenthQualification;

    @NotBlank(message = "12th qualification is required")
    @Size(min = 2, max = 100, message = "12th qualification must be between 2 and 100 characters")
    private String twelfthQualification;

    @NotBlank(message = "Bachelor's qualification is required")
    @Size(min = 2, max = 100, message = "Bachelor's qualification must be between 2 and 100 characters")
    private String bachelorQualification;

    private String highestQualification;

    @NotNull(message = "Highest qualification status is required")
    private Boolean hasHighestQualification;

    @NotBlank(message = "Emergency contact 1 is required")
    @Size(max = 100, message = "Emergency contact 1 cannot exceed 100 characters")
    private String emergencyContact1;

    @Size(max = 100, message = "Emergency contact 2 cannot exceed 100 characters")
    private String emergencyContact2;

    @Size(max = 255, message = "Photo URL cannot exceed 255 characters")
    private String photoUrl;

    @NotNull(message = "Gap status is required")
    private Boolean hasGap;

    private String gapReason;

    @Size(max = 255, message = "Reference details cannot exceed 255 characters")
    private String referenceDetails;

    @Pattern(regexp = "^(YES|NO)$", message = "Bench status must be either 'YES' or 'NO'")
    private String benchStatus;
}

