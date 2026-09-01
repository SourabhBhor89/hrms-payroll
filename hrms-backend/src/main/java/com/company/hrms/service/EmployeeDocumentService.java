package com.company.hrms.service;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.entity.EmployeeDocument;
import com.company.hrms.entity.EmployeeDocumentStatus;
import com.company.hrms.entity.DocumentVerificationStatus;

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

    EmployeeDocument resubmitDocument(String employeeCode, Long documentId, String documentNumber, MultipartFile file);

    EmployeeDocument reviewDocument(String employeeCode, Long documentId, EmployeeDocumentStatus status, String reason, String reviewerEmail);

    DocumentVerificationStatus getDocumentVerificationStatus(String employeeCode);

    List<EmployeeDocument> getDocumentsForReview();
}
