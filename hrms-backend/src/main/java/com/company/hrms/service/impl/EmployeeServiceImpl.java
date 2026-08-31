package com.company.hrms.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.hrms.constants.CacheNames;
import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.response.EmployeeDto;
import com.company.hrms.dto.response.NextEmployeeCodeResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Role;
import com.company.hrms.entity.RoleName;
import com.company.hrms.entity.User;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.RoleRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.EmployeeService;
import com.company.hrms.service.Mail_Service.Mail_Sender_Service;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final Mail_Sender_Service mailSenderService; // Inject the Mail_Sender_Service

    @Override
    @Transactional(readOnly = true)
    public Page<EmployeeDto> getAllEmployees(String search, String department, String role, Pageable pageable) {
        boolean hasSearch = search != null && !search.trim().isEmpty();
        boolean hasDept = department != null && !department.trim().isEmpty() && !"All".equalsIgnoreCase(department.trim());
        boolean hasRole = role != null && !role.trim().isEmpty() && !"All".equalsIgnoreCase(role.trim());

        if (!hasSearch && !hasDept && !hasRole) {
            return employeeRepository.findAll(pageable).map(this::mapToDto);
        }

        Specification<Employee> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasSearch) {
                String term = "%" + search.trim().toLowerCase() + "%";
                Join<Employee, User> userJoin = root.join("user", JoinType.LEFT);

                Predicate codeMatch = cb.like(cb.lower(root.get("employeeCode")), term);
                Predicate firstNameMatch = cb.like(cb.lower(root.get("firstName")), term);
                Predicate lastNameMatch = cb.like(cb.lower(root.get("lastName")), term);
                Predicate fullNameMatch = cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), cb.coalesce(root.get("lastName"), ""))), term);
                Predicate deptMatch = cb.like(cb.lower(root.get("department")), term);
                Predicate desigMatch = cb.like(cb.lower(root.get("designation")), term);
                Predicate emailMatch = cb.like(cb.lower(userJoin.get("email")), term);

                predicates.add(cb.or(codeMatch, firstNameMatch, lastNameMatch, fullNameMatch, deptMatch, desigMatch, emailMatch));
            }

            if (hasDept) {
                predicates.add(cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase()));
            }

            if (hasRole) {
                Join<Employee, User> userJoin = root.join("user", JoinType.LEFT);
                Join<User, Role> roleJoin = userJoin.join("role", JoinType.LEFT);
                String roleSearch = role.trim().toUpperCase();
                if ("HR MANAGER".equals(roleSearch)) roleSearch = "HR";
                else if ("ADMINISTRATOR".equals(roleSearch)) roleSearch = "ADMIN";

                try {
                    RoleName roleNameEnum = RoleName.valueOf(roleSearch);
                    predicates.add(cb.equal(roleJoin.get("name"), roleNameEnum));
                } catch (Exception e) {
                    // Ignore if enum doesn't match
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Employee> employees = employeeRepository.findAll(spec, pageable);
        return employees.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.EMPLOYEE_PROFILES, key = "#id")
    public EmployeeDto getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));
        return mapToDto(employee);
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.EMPLOYEES, key = "'all'")
    public EmployeeDto createEmployee(CreateEmployeeRequest request) 
    {
        validateEmployeeRequest(request, null);

        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) 
        {
            throw new IllegalArgumentException("Employee code already exists: " + request.getEmployeeCode());
        }

        if (userRepository.existsByEmail(request.getEmail().trim())) 
        {
            throw new IllegalArgumentException("Email address already exists: " + request.getEmail());
        }

        RoleName roleName = resolveRoleName(request.getRole());

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + request.getRole()));

        User user = new User();
        user.setEmail(request.getEmail().trim());
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
        employee.setAddress(request.getAddress() != null ? request.getAddress() : request.getCurrentAddress());
        
        boolean isFresher = Boolean.TRUE.equals(request.getIsFresher());
        employee.setIsFresher(isFresher);
        employee.setTotalExperience(isFresher ? "0" : request.getTotalExperience());
        employee.setPreviousCompany(isFresher ? null : request.getPreviousCompany());
        employee.setPreviousDesignation(isFresher ? null : request.getPreviousDesignation());
        employee.setPreviousSalary(isFresher ? null : request.getPreviousSalary());
        
        employee.setCurrentSalary(request.getCurrentSalary());
        employee.setTechStack(request.getTechStack());
        employee.setEducation(request.getEducation());
        employee.setTenthQualification(request.getTenthQualification());
        employee.setTwelfthQualification(request.getTwelfthQualification());
        employee.setBachelorQualification(request.getBachelorQualification());
        
        boolean hasHighest = Boolean.TRUE.equals(request.getHasHighestQualification());
        employee.setHighestQualification(hasHighest ? request.getHighestQualification() : null);
        
        employee.setEmergencyContact1(request.getEmergencyContact1());
        employee.setEmergencyContact2(request.getEmergencyContact2());
        employee.setPhotoUrl(request.getPhotoUrl());
        
        boolean hasGap = Boolean.TRUE.equals(request.getHasGap());
        employee.setHasGap(hasGap);
        employee.setGapReason(hasGap ? request.getGapReason() : null);
        
        employee.setReferenceDetails(request.getReferenceDetails());
        employee.setCurrentAddress(request.getCurrentAddress());
        employee.setPermanentAddress(request.getPermanentAddress());
        employee.setMaritalStatus(request.getMaritalStatus());
        employee.setMarriageDate("Married".equalsIgnoreCase(request.getMaritalStatus()) ? request.getMarriageDate() : null);
        employee.setBenchStatus(request.getBenchStatus() != null ? request.getBenchStatus().trim().toUpperCase() : "NO");
        employee.setCreatedBy("ADMIN/ HR");
        employee.setUpdatedBy("ADMIN/ HR");
        employee.setActive(true);
        employee = employeeRepository.save(employee);

        // Send email notification to the employee
        System.out.println("\n Sending email to: " + user.getEmail());
        mailSenderService.sendEmployeeCredencialMail(user.getEmail(), 
                                            employee.getFirstName() + (employee.getLastName() != null ? " " + employee.getLastName() : ""), 
                                            pwd);


        return mapToDto(employee);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheNames.EMPLOYEES, key = "'all'"),
        @CacheEvict(value = CacheNames.EMPLOYEE_PROFILES, key = "#id")
    })
    public EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));

        validateEmployeeRequest(request, id);

        if (request.getEmployeeCode() != null && !request.getEmployeeCode().isBlank()) {
            if (!request.getEmployeeCode().equalsIgnoreCase(employee.getEmployeeCode()) &&
                    employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
                throw new IllegalArgumentException("Employee code already exists: " + request.getEmployeeCode());
            }
            employee.setEmployeeCode(request.getEmployeeCode());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank() && employee.getUser() != null) {
            if (!request.getEmail().equalsIgnoreCase(employee.getUser().getEmail())) {
                if (userRepository.existsByEmail(request.getEmail().trim())) {
                    throw new IllegalArgumentException("Email address already exists: " + request.getEmail());
                }
                employee.getUser().setEmail(request.getEmail().trim());
                userRepository.save(employee.getUser());
            }
        }

        if (request.getRole() != null && !request.getRole().isBlank() && employee.getUser() != null) {
            RoleName roleName = resolveRoleName(request.getRole());
            Role role = roleRepository.findByName(roleName).orElse(null);
            if (role != null) {
                employee.getUser().setRole(role);
                userRepository.save(employee.getUser());
            }
        }

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
        
        boolean isFresher = Boolean.TRUE.equals(request.getIsFresher());
        employee.setIsFresher(isFresher);
        employee.setTotalExperience(isFresher ? "0" : request.getTotalExperience());
        employee.setPreviousCompany(isFresher ? null : request.getPreviousCompany());
        employee.setPreviousDesignation(isFresher ? null : request.getPreviousDesignation());
        employee.setPreviousSalary(isFresher ? null : request.getPreviousSalary());
        
        employee.setCurrentSalary(request.getCurrentSalary());
        employee.setTechStack(request.getTechStack());
        employee.setEducation(request.getEducation());
        employee.setTenthQualification(request.getTenthQualification());
        employee.setTwelfthQualification(request.getTwelfthQualification());
        employee.setBachelorQualification(request.getBachelorQualification());
        
        boolean hasHighest = Boolean.TRUE.equals(request.getHasHighestQualification());
        employee.setHighestQualification(hasHighest ? request.getHighestQualification() : null);

        employee.setEmergencyContact1(request.getEmergencyContact1());
        employee.setEmergencyContact2(request.getEmergencyContact2());
        employee.setPhotoUrl(request.getPhotoUrl());
        
        boolean hasGap = Boolean.TRUE.equals(request.getHasGap());
        employee.setHasGap(hasGap);
        employee.setGapReason(hasGap ? request.getGapReason() : null);

        employee.setReferenceDetails(request.getReferenceDetails());
        employee.setCurrentAddress(request.getCurrentAddress());
        employee.setPermanentAddress(request.getPermanentAddress());
        employee.setMaritalStatus(request.getMaritalStatus());
        employee.setMarriageDate("Married".equalsIgnoreCase(request.getMaritalStatus()) ? request.getMarriageDate() : null);
        if (request.getBenchStatus() != null) {
            employee.setBenchStatus(request.getBenchStatus().trim().toUpperCase());
        }

        employee.setUpdatedBy("ADMIN/ HR");
        employeeRepository.save(employee);

        return mapToDto(employee);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheNames.EMPLOYEES, key = "'all'"),
        @CacheEvict(value = CacheNames.EMPLOYEE_PROFILES, key = "#id")
    })
    public void deleteEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));
        employee.setActive(false);
        employeeRepository.save(employee);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheNames.EMPLOYEES, key = "'all'"),
        @CacheEvict(value = CacheNames.EMPLOYEE_PROFILES, key = "#id")
    })
    public EmployeeDto updateBenchStatus(Long id, String benchStatus, String updatedBy) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + id));

        if (benchStatus == null || benchStatus.isBlank()) {
            throw new IllegalArgumentException("Bench status is required");
        }

        String statusUpper = benchStatus.trim().toUpperCase();
        if (!"YES".equals(statusUpper) && !"NO".equals(statusUpper)) {
            throw new IllegalArgumentException("Bench status must be either 'YES' or 'NO'");
        }

        employee.setBenchStatus(statusUpper);
        if (updatedBy != null && !updatedBy.isBlank()) {
            employee.setUpdatedBy(updatedBy);
        }
        employeeRepository.save(employee);

        return mapToDto(employee);
    }

    private RoleName resolveRoleName(String roleInput) {
        if (roleInput == null || roleInput.isBlank()) {
            return RoleName.EMPLOYEE;
        }
        String normalized = roleInput.trim().toUpperCase();
        if ("HR MANAGER".equals(normalized)) return RoleName.HR;
        if ("ADMINISTRATOR".equals(normalized)) return RoleName.ADMIN;
        try {
            return RoleName.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return RoleName.EMPLOYEE;
        }
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
                .tenthQualification(emp.getTenthQualification())
                .twelfthQualification(emp.getTwelfthQualification())
                .bachelorQualification(emp.getBachelorQualification())
                .highestQualification(emp.getHighestQualification())
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
                .benchStatus(emp.getBenchStatus() != null ? emp.getBenchStatus() : "NO")
                .build();
    }

    private void validateEmployeeRequest(CreateEmployeeRequest request, Long existingEmployeeId) {
        if (request.getJoiningDate() != null && request.getDateOfBirth() != null) {
            if (request.getDateOfBirth().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Date of birth must be in the past");
            }
            if (request.getDateOfBirth().isAfter(request.getJoiningDate().minusYears(18))) {
                throw new IllegalArgumentException("Employee must be at least 18 years old as of the joining date");
            }
        }

        if ("Married".equalsIgnoreCase(request.getMaritalStatus())) {
            if (request.getMarriageDate() == null) {
                throw new IllegalArgumentException("Marriage date is required for married employees");
            }
            if (request.getMarriageDate().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Marriage date cannot be in the future");
            }
        }

        if (Boolean.FALSE.equals(request.getIsFresher())) {
            if (request.getTotalExperience() == null || request.getTotalExperience().isBlank()) {
                throw new IllegalArgumentException("Total experience is required for experienced candidates");
            }
            if (!request.getTotalExperience().matches("^[0-9]+(\\.[0-9]{1,2})?$")) {
                throw new IllegalArgumentException("Total experience must be a valid non-negative number");
            }
            if (request.getPreviousCompany() == null || request.getPreviousCompany().isBlank() ||
                request.getPreviousCompany().length() < 2 || request.getPreviousCompany().length() > 100) {
                throw new IllegalArgumentException("Previous company is required (2-100 characters)");
            }
            if (request.getPreviousDesignation() == null || request.getPreviousDesignation().isBlank() ||
                request.getPreviousDesignation().length() < 2 || request.getPreviousDesignation().length() > 100) {
                throw new IllegalArgumentException("Previous designation is required (2-100 characters)");
            }
            if (request.getPreviousSalary() != null && !request.getPreviousSalary().isBlank()) {
                if (!request.getPreviousSalary().matches("^[0-9]+(\\.[0-9]{1,2})?$")) {
                    throw new IllegalArgumentException("Previous salary must be a valid non-negative number");
                }
            }
        }

        if (Boolean.TRUE.equals(request.getHasGap())) {
            if (request.getGapReason() == null || request.getGapReason().isBlank() ||
                request.getGapReason().length() < 5 || request.getGapReason().length() > 255) {
                throw new IllegalArgumentException("Gap reason is required (5-255 characters)");
            }
        }

        if (Boolean.TRUE.equals(request.getHasHighestQualification())) {
            if (request.getHighestQualification() == null || request.getHighestQualification().isBlank() ||
                request.getHighestQualification().length() < 2 || request.getHighestQualification().length() > 100) {
                throw new IllegalArgumentException("Highest qualification details are required (2-100 characters)");
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public NextEmployeeCodeResponse getNextEmployeeCode() {
        int maxNum = 0;
        try {
            Integer maxSuffix = employeeRepository.findMaxEmployeeCodeNumericSuffix();
            if (maxSuffix != null) {
                maxNum = maxSuffix;
            }
        } catch (Exception e) {
            maxNum = 0;
        }

        try {
            List<String> codes = employeeRepository.findAllEmployeeCodes();
            Pattern digitPattern = Pattern.compile("^TRHPL-(\\d{3})$");
            for (String code : codes) {
                if (code != null) {
                    Matcher matcher = digitPattern.matcher(code.trim());
                    if (matcher.matches()) {
                        try {
                            int num = Integer.parseInt(matcher.group(1));
                            if (num > maxNum) {
                                maxNum = num;
                            }
                        } catch (NumberFormatException ex) {
                            // Ignore
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Ignore fallback error
        }

        if (maxNum >= 999) {
            throw new IllegalStateException("Employee code range exhausted (TRHPL-999 reached)");
        }

        String nextCode = String.format("TRHPL-%03d", maxNum + 1);
        return new NextEmployeeCodeResponse(nextCode);
    }

    @Override
    public boolean employeeExists(Long employeeId) {
        return employeeRepository.existsById(employeeId);
    }
}
