package com.company.hrms.service;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.response.EmployeeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EmployeeService {

    Page<EmployeeDto> getAllEmployees(String search, String department, String role, Pageable pageable);

    EmployeeDto getEmployeeById(Long id);

    EmployeeDto createEmployee(CreateEmployeeRequest request);

    EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request);

    void deleteEmployee(Long id);

    com.company.hrms.dto.response.NextEmployeeCodeResponse getNextEmployeeCode();
}
