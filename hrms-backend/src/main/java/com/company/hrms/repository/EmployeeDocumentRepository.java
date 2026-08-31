package com.company.hrms.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.company.hrms.entity.EmployeeDocument;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> 
{
    Optional<EmployeeDocument> findByEmployeeCodeAndDocumentType(String employeeCode, String documentType);

    boolean existsByEmployeeCodeAndDocumentType(String employeeCode,String documentType);

    List<EmployeeDocument> findByEmployeeCode(String employeeCode);

    Optional<EmployeeDocument> findByIdAndEmployeeCode(Long documentId, String employeeCode);

}
