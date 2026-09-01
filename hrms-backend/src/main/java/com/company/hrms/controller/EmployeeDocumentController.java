package com.company.hrms.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.dto.request.ReviewEmployeeDocumentRequest;
import com.company.hrms.entity.DocumentVerificationStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.EmployeeDocument;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.EmployeeDocumentRepository;
import com.company.hrms.service.EmployeeDocumentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/employee-documents")
@RequiredArgsConstructor
public class EmployeeDocumentController {

    private final EmployeeDocumentService employeeDocumentService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentRepository employeeDocumentRepository;

    @PostMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeDocument> uploadMyDocument(Authentication authentication,
            @RequestParam String documentType,
            @RequestParam(required = false) String documentNumber,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeDocumentService.uploadDocument(
                getAuthenticatedEmployee(authentication).getEmployeeCode(), documentType, documentNumber, file));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EmployeeDocument>> getMyDocuments(Authentication authentication) {
        return ResponseEntity.ok(employeeDocumentService.getEmployeeDocuments(
                getAuthenticatedEmployee(authentication).getEmployeeCode()));
    }

    @GetMapping("/me/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentVerificationStatus> getMyDocumentStatus(Authentication authentication) {
        return ResponseEntity.ok(employeeDocumentService.getDocumentVerificationStatus(
                getAuthenticatedEmployee(authentication).getEmployeeCode()));
    }

    @GetMapping("/me/{documentId}/file")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> getMyDocumentFile(Authentication authentication, @PathVariable Long documentId) {
        String empCode = getAuthenticatedEmployee(authentication).getEmployeeCode();
        EmployeeDocument doc = employeeDocumentRepository.findByIdAndEmployeeCode(documentId, empCode)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        Resource resource = employeeDocumentService.getDocument(documentId, empCode);
        String contentType = doc.getContentType() != null ? doc.getContentType() : "application/octet-stream";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(resource);
    }

    @PostMapping("/me/{documentId}/resubmit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeDocument> resubmitMyDocument(Authentication authentication, @PathVariable Long documentId,
            @RequestParam(required = false) String documentNumber, @RequestParam MultipartFile file) {
        return ResponseEntity.ok(employeeDocumentService.resubmitDocument(
                getAuthenticatedEmployee(authentication).getEmployeeCode(), documentId, documentNumber, file));
    }

    @GetMapping("/review-queue")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR')")
    public ResponseEntity<List<EmployeeDocument>> getReviewQueue() {
        return ResponseEntity.ok(employeeDocumentService.getDocumentsForReview());
    }

    @GetMapping("/employees/{employeeCode}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR')")
    public ResponseEntity<List<EmployeeDocument>> getEmployeeDocuments(@PathVariable String employeeCode) {
        return ResponseEntity.ok(employeeDocumentService.getEmployeeDocuments(employeeCode));
    }

    @GetMapping("/employees/{employeeCode}/{documentId}/file")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR')")
    public ResponseEntity<Resource> getEmployeeDocumentFile(@PathVariable String employeeCode, @PathVariable Long documentId) {
        EmployeeDocument doc = employeeDocumentRepository.findByIdAndEmployeeCode(documentId, employeeCode)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        Resource resource = employeeDocumentService.getDocument(documentId, employeeCode);
        String contentType = doc.getContentType() != null ? doc.getContentType() : "application/octet-stream";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(resource);
    }

    @PatchMapping("/employees/{employeeCode}/{documentId}/review")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_HR', 'HR')")
    public ResponseEntity<EmployeeDocument> reviewDocument(@PathVariable String employeeCode, @PathVariable Long documentId,
            @Valid @RequestBody ReviewEmployeeDocumentRequest request, Authentication authentication) {
        return ResponseEntity.ok(employeeDocumentService.reviewDocument(employeeCode, documentId, request.getStatus(),
                request.getReason(), authentication.getName()));
    }

    private Employee getAuthenticatedEmployee(Authentication authentication) {
        return employeeRepository.findByUserEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Employee profile not found for the logged-in user"));
    }

    private ResponseEntity<Resource> documentFile(Resource resource) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(resource);
    }
}
