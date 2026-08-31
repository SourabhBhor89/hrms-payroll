package com.company.hrms.controller;


import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.request.UpdateBenchStatusRequest;
import com.company.hrms.dto.response.EmployeeDto;
import com.company.hrms.dto.response.NextEmployeeCodeResponse;
import com.company.hrms.entity.EmployeeDocument;
import com.company.hrms.service.EmployeeDocumentService;
import com.company.hrms.service.EmployeeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDocumentService employeeDocumentService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<EmployeeDto>> getAllEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String role
    ) {
        String sortProperty = sortBy;
        if ("employeeId".equalsIgnoreCase(sortBy) || "employee_code".equalsIgnoreCase(sortBy)) {
            sortProperty = "employeeCode";
        } else if ("name".equalsIgnoreCase(sortBy)) {
            sortProperty = "firstName";
        } else if ("role".equalsIgnoreCase(sortBy)) {
            sortProperty = "user.role.name";
        } else if ("status".equalsIgnoreCase(sortBy)) {
            sortProperty = "active";
        }

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortProperty).descending() : Sort.by(sortProperty).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(employeeService.getAllEmployees(search, department, role, pageable));
    }

    @GetMapping("/next-code")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_CREATE', 'EMPLOYEE_MANAGEMENT_VIEW')")
    public ResponseEntity<NextEmployeeCodeResponse> getNextEmployeeCode() {
        return ResponseEntity.ok(employeeService.getNextEmployeeCode());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_VIEW')")
    public ResponseEntity<EmployeeDto> getEmployeeById(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_CREATE')")
    public ResponseEntity<EmployeeDto> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) 
    {
        EmployeeDto created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_UPDATE')")
    public ResponseEntity<EmployeeDto> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody CreateEmployeeRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR', 'ROLE_MANAGER', 'MANAGER', 'EMPLOYEE_MANAGEMENT_DELETE', 'EMPLOYEE_MANAGEMENT_UPDATE')")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/bench-status")
    @PreAuthorize("hasAuthority('EMPLOYEE_BENCH_STATUS_UPDATE')")
    public ResponseEntity<EmployeeDto> updateBenchStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBenchStatusRequest request,
            Authentication authentication
    ) {
        String updatedBy = authentication != null ? authentication.getName() : "SYSTEM";
        return ResponseEntity.ok(employeeService.updateBenchStatus(id, request.getBenchStatus(), updatedBy));
    }

/**************************************************[ Employee Documnet ]************************************************/


    @PostMapping("/{employeeCode}/documents")
    public ResponseEntity<EmployeeDocument> uploadDocument(
        @PathVariable String employeeCode,
        @RequestParam String documentType,
        @RequestParam(required = false) String documentNumber,
        @RequestParam MultipartFile file) 
    {

        EmployeeDocument document = employeeDocumentService.uploadDocument(
                                    employeeCode, documentType, documentNumber, file);

        return ResponseEntity.status(HttpStatus.CREATED).body(document);
    }


    @GetMapping("/{employeeCode}/documents")
    public ResponseEntity<?> employeeDocuments(@PathVariable String employeeCode) 
    {
        return ResponseEntity.ok(employeeDocumentService.getEmployeeDocuments(employeeCode));
    }

    @GetMapping("/{employeeCode}/documents/{documentId}")
    public ResponseEntity<Resource> getDocument(@PathVariable String employeeCode, @PathVariable Long documentId) 
    {
        Resource resource = employeeDocumentService.getDocument( documentId, employeeCode);
        
        return ResponseEntity.ok().contentType((MediaType) MediaType.parseMediaTypes(List.of("application/pdf","application/image"))).body(resource);
    }
    
}
