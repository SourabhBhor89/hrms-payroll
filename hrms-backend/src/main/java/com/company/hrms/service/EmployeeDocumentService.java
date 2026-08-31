package com.company.hrms.service;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.entity.EmployeeDocument;

public interface EmployeeDocumentService 
{
    EmployeeDocument uploadDocument(
            String employeeCode,
            String documentType,
            String documentNumber,
            MultipartFile file
    );

    List<EmployeeDocument> getEmployeeDocuments(String employeeCode);

    Resource getDocument(Long documentId, String  employeeCode);
}
