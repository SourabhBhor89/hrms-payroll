package com.company.hrms.service;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.response.EmployeeDto;

import java.util.List;

public interface EmployeeService {

    List<EmployeeDto> getAllEmployees();

    EmployeeDto getEmployeeById(Long id);

    EmployeeDto createEmployee(CreateEmployeeRequest request);

    EmployeeDto updateEmployee(Long id, CreateEmployeeRequest request);

    void deleteEmployee(Long id);
}
