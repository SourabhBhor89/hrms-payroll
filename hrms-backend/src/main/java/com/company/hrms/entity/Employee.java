package com.company.hrms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
public class Employee extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "employee_code", nullable = false, unique = true, length = 50)
    private String employeeCode;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String designation;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(length = 255)
    private String address;

    @Column(name = "is_fresher")
    private Boolean isFresher = false;

    @Column(name = "total_experience", length = 50)
    private String totalExperience;

    @Column(name = "previous_company", length = 100)
    private String previousCompany;

    @Column(name = "previous_designation", length = 100)
    private String previousDesignation;

    @Column(name = "previous_salary", length = 50)
    private String previousSalary;

    @Column(name = "current_salary", length = 50)
    private String currentSalary;

    @Column(name = "tech_stack", length = 255)
    private String techStack;

    @Column(length = 255)
    private String education;

    @Column(name = "tenth_qualification", length = 255)
    private String tenthQualification;

    @Column(name = "twelfth_qualification", length = 255)
    private String twelfthQualification;

    @Column(name = "bachelor_qualification", length = 255)
    private String bachelorQualification;

    @Column(name = "highest_qualification", length = 255)
    private String highestQualification;

    @Column(name = "emergency_contact_1", length = 100)
    private String emergencyContact1;

    @Column(name = "emergency_contact_2", length = 100)
    private String emergencyContact2;

    @Column(name = "photo_url", length = 255)
    private String photoUrl;

    @Column(name = "has_gap")
    private Boolean hasGap = false;

    @Column(name = "gap_reason", length = 255)
    private String gapReason;

    @Column(name = "reference_details", length = 255)
    private String referenceDetails;

    @Column(name = "current_address", length = 500)
    private String currentAddress;

    @Column(name = "permanent_address", length = 500)
    private String permanentAddress;

    @Column(name = "marital_status", length = 50)
    private String maritalStatus;

    @Column(name = "marriage_date")
    private LocalDate marriageDate;

    @Column(name = "bench_status", nullable = false, length = 10)
    private String benchStatus = "NO";

    @Column(nullable = false)
    private Boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_verification_status", nullable = false, length = 30)
    private DocumentVerificationStatus documentVerificationStatus = DocumentVerificationStatus.NOT_SUBMITTED;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "employee_permissions",
            joinColumns = @JoinColumn(name = "employee_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
}
