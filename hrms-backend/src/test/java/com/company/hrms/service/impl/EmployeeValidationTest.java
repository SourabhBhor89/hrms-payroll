package com.company.hrms.service.impl;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("CreateEmployeeRequest Bean Validation Tests")
class EmployeeValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private CreateEmployeeRequest buildValidRequest() {
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setEmployeeCode("TRHPL-001");
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john.doe@company.io");
        request.setPhone("9876543210");
        request.setDepartment("Engineering");
        request.setDesignation("Software Engineer");
        request.setRole("EMPLOYEE");
        request.setJoiningDate(LocalDate.now());
        request.setDateOfBirth(LocalDate.now().minusYears(25));
        request.setCurrentAddress("123 Main Street, City, State, 12345");
        request.setPermanentAddress("123 Main Street, City, State, 12345");
        request.setMaritalStatus("Single");
        request.setIsFresher(true);
        request.setCurrentSalary("500000");
        request.setTenthQualification("10th CBSE - 85%");
        request.setTwelfthQualification("12th CBSE - 80%");
        request.setBachelorQualification("B.Tech Computer Science");
        request.setHasHighestQualification(false);
        request.setEmergencyContact1("Father: Alex Doe - 9123456789");
        request.setHasGap(false);
        request.setBenchStatus("NO");
        return request;
    }

    @Test
    @DisplayName("Valid request should pass validation")
    void testValidRequest() {
        CreateEmployeeRequest request = buildValidRequest();
        Set<ConstraintViolation<CreateEmployeeRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Valid request should not produce violations");
    }

    @Test
    @DisplayName("Invalid employeeCode formats should fail validation")
    void testEmployeeCodeValidation() {
        CreateEmployeeRequest request = buildValidRequest();

        String[] invalidCodes = {"EMP-001", "TRHPL-1", "TRHPL-01", "TRHPL-0001", "TRHPL-ABC", "TRHPL001"};
        for (String code : invalidCodes) {
            request.setEmployeeCode(code);
            Set<ConstraintViolation<CreateEmployeeRequest>> violations = validator.validate(request);
            assertFalse(violations.isEmpty(), "Code " + code + " should be invalid");
        }

        request.setEmployeeCode("TRHPL-999");
        Set<ConstraintViolation<CreateEmployeeRequest>> validViolations = validator.validate(request);
        assertTrue(validViolations.isEmpty(), "TRHPL-999 should be valid");
    }

    @Test
    @DisplayName("First name validation rules")
    void testFirstNameValidation() {
        CreateEmployeeRequest request = buildValidRequest();

        request.setFirstName("J");
        assertFalse(validator.validate(request).isEmpty(), "1 character name should be invalid");

        request.setFirstName("John123");
        assertFalse(validator.validate(request).isEmpty(), "Numbers in name should be invalid");

        request.setFirstName("John@Doe");
        assertFalse(validator.validate(request).isEmpty(), "Special character @ should be invalid");

        request.setFirstName("John-O'Connor");
        assertTrue(validator.validate(request).isEmpty(), "Hyphen and apostrophe in name should be valid");
    }

    @Test
    @DisplayName("Phone validation rules")
    void testPhoneValidation() {
        CreateEmployeeRequest request = buildValidRequest();

        String[] invalidPhones = {"987654321", "+919876543210", "98765abc10", "12345678901"};
        for (String phone : invalidPhones) {
            request.setPhone(phone);
            assertFalse(validator.validate(request).isEmpty(), "Phone " + phone + " should be invalid");
        }

        request.setPhone("9876543210");
        assertTrue(validator.validate(request).isEmpty(), "10 digit numeric phone should be valid");
    }

    @Test
    @DisplayName("Current salary validation rules")
    void testCurrentSalaryValidation() {
        CreateEmployeeRequest request = buildValidRequest();

        String[] invalidSalaries = {"-5000", "50K", "5 LPA", "abc", "50000.555"};
        for (String sal : invalidSalaries) {
            request.setCurrentSalary(sal);
            assertFalse(validator.validate(request).isEmpty(), "Salary " + sal + " should be invalid");
        }

        request.setCurrentSalary("50000.50");
        assertTrue(validator.validate(request).isEmpty(), "Numeric decimal salary should be valid");
    }

    @Test
    @DisplayName("Bench status validation rules")
    void testBenchStatusValidation() {
        CreateEmployeeRequest request = buildValidRequest();

        request.setBenchStatus("ABC");
        assertFalse(validator.validate(request).isEmpty(), "Bench status ABC should be invalid");

        request.setBenchStatus("YES");
        assertTrue(validator.validate(request).isEmpty(), "Bench status YES should be valid");

        request.setBenchStatus("NO");
        assertTrue(validator.validate(request).isEmpty(), "Bench status NO should be valid");
    }
}
