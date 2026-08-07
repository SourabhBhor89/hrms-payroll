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
        employee.setDesignation(request.getDesignation());
        employee.setJoiningDate(request.getJoiningDate());
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
                .active(emp.getActive())
                .build();
    }
}
