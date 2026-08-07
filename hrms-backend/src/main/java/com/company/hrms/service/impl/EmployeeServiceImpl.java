package com.company.hrms.service.impl;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.response.EmployeeDto;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Role;
import com.company.hrms.entity.RoleName;
import com.company.hrms.entity.User;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.RoleRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));
        return mapToDto(employee);
    }

    @Override
    @Transactional
    public EmployeeDto createEmployee(CreateEmployeeRequest request) {
        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw new IllegalArgumentException("Employee code already exists: " + request.getEmployeeCode());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email address already exists: " + request.getEmail());
        }

        RoleName roleName = RoleName.EMPLOYEE;
        if (request.getRole() != null && request.getRole().equalsIgnoreCase("HR")) {
            roleName = RoleName.HR;
        } else if (request.getRole() != null && request.getRole().equalsIgnoreCase("ADMIN")) {
            roleName = RoleName.ADMIN;
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + request.getRole()));

        User user = new User();
        user.setEmail(request.getEmail());
        String pwd = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword()
                : "Employee@12345";
        user.setPassword(passwordEncoder.encode(pwd));
        user.setRole(role);
        user.setActive(true);
        user = userRepository.save(user);

        Employee employee = new Employee();
        employee.setUser(user);
        employee.setEmployeeCode(request.getEmployeeCode());
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setPhone(request.getPhone());
        employee.setDepartment(request.getDepartment());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setDesignation(request.getDesignation());
        employee.setJoiningDate(request.getJoiningDate());
        employee.setAddress(request.getAddress());
        employee.setIsFresher(request.getIsFresher() != null ? request.getIsFresher() : false);
        employee.setTotalExperience(request.getTotalExperience());
        employee.setPreviousCompany(request.getPreviousCompany());
        employee.setPreviousDesignation(request.getPreviousDesignation());
        employee.setPreviousSalary(request.getPreviousSalary());
        employee.setCurrentSalary(request.getCurrentSalary());
        employee.setTechStack(request.getTechStack());
        employee.setEducation(request.getEducation());
        employee.setEmergencyContact1(request.getEmergencyContact1());
        employee.setEmergencyContact2(request.getEmergencyContact2());
        employee.setPhotoUrl(request.getPhotoUrl());
        employee.setHasGap(request.getHasGap() != null ? request.getHasGap() : false);
        employee.setGapReason(request.getGapReason());
        employee.setReferenceDetails(request.getReferenceDetails());
        employee.setCurrentAddress(request.getCurrentAddress());
        employee.setPermanentAddress(request.getPermanentAddress());
        employee.setMaritalStatus(request.getMaritalStatus());
        employee.setMarriageDate(request.getMarriageDate());
        employee.setCreatedBy("ADMIN/ HR");
        employee.setUpdatedBy("ADMIN/ HR");
        employee.setActive(true);
        employee = employeeRepository.save(employee);

        return mapToDto(employee);
    }

    @Override
    @Transactional
    public EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));

        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setPhone(request.getPhone());
        employee.setDepartment(request.getDepartment());
        employee.setDesignation(request.getDesignation());
        if (request.getJoiningDate() != null) {
            employee.setJoiningDate(request.getJoiningDate());
        }
        if (request.getDateOfBirth() != null) {
            employee.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getAddress() != null) employee.setAddress(request.getAddress());
        if (request.getIsFresher() != null) employee.setIsFresher(request.getIsFresher());
        if (request.getTotalExperience() != null) employee.setTotalExperience(request.getTotalExperience());
        if (request.getPreviousCompany() != null) employee.setPreviousCompany(request.getPreviousCompany());
        if (request.getPreviousDesignation() != null) employee.setPreviousDesignation(request.getPreviousDesignation());
        if (request.getPreviousSalary() != null) employee.setPreviousSalary(request.getPreviousSalary());
        if (request.getCurrentSalary() != null) employee.setCurrentSalary(request.getCurrentSalary());
        if (request.getTechStack() != null) employee.setTechStack(request.getTechStack());
        if (request.getEducation() != null) employee.setEducation(request.getEducation());
        if (request.getEmergencyContact1() != null) employee.setEmergencyContact1(request.getEmergencyContact1());
        if (request.getEmergencyContact2() != null) employee.setEmergencyContact2(request.getEmergencyContact2());
        if (request.getPhotoUrl() != null) employee.setPhotoUrl(request.getPhotoUrl());
        if (request.getHasGap() != null) employee.setHasGap(request.getHasGap());
        if (request.getGapReason() != null) employee.setGapReason(request.getGapReason());
        if (request.getReferenceDetails() != null) employee.setReferenceDetails(request.getReferenceDetails());
        if (request.getCurrentAddress() != null) employee.setCurrentAddress(request.getCurrentAddress());
        if (request.getPermanentAddress() != null) employee.setPermanentAddress(request.getPermanentAddress());
        if (request.getMaritalStatus() != null) employee.setMaritalStatus(request.getMaritalStatus());
        if (request.getMarriageDate() != null) employee.setMarriageDate(request.getMarriageDate());

        employeeRepository.save(employee);

        return mapToDto(employee);
    }

    @Override
    @Transactional
    public void deleteEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));
        employee.setActive(false);
        employeeRepository.save(employee);
    }

    private EmployeeDto mapToDto(Employee emp) {
        User u = emp.getUser();
        return EmployeeDto.builder()
                .id(emp.getId())
                .userId(u != null ? u.getId() : null)
                .employeeCode(emp.getEmployeeCode())
                .firstName(emp.getFirstName())
                .lastName(emp.getLastName())
                .email(u != null ? u.getEmail() : null)
                .phone(emp.getPhone())
                .department(emp.getDepartment())
                .designation(emp.getDesignation())
                .role(u != null && u.getRole() != null ? u.getRole().getName().name() : "EMPLOYEE")
                .joiningDate(emp.getJoiningDate())
                .dateOfBirth(emp.getDateOfBirth())
                .active(emp.getActive())
                .address(emp.getAddress())
                .isFresher(emp.getIsFresher())
                .totalExperience(emp.getTotalExperience())
                .previousCompany(emp.getPreviousCompany())
                .previousDesignation(emp.getPreviousDesignation())
                .previousSalary(emp.getPreviousSalary())
                .currentSalary(emp.getCurrentSalary())
                .techStack(emp.getTechStack())
                .education(emp.getEducation())
                .emergencyContact1(emp.getEmergencyContact1())
                .emergencyContact2(emp.getEmergencyContact2())
                .photoUrl(emp.getPhotoUrl())
                .hasGap(emp.getHasGap())
                .gapReason(emp.getGapReason())
                .referenceDetails(emp.getReferenceDetails())
                .currentAddress(emp.getCurrentAddress())
                .permanentAddress(emp.getPermanentAddress())
                .maritalStatus(emp.getMaritalStatus())
                .marriageDate(emp.getMarriageDate())
                .build();
    }
}
