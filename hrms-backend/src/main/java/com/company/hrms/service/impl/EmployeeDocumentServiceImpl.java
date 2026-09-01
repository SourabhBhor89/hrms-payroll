package com.company.hrms.service.impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.entity.EmployeeDocument;
import com.company.hrms.entity.EmployeeDocumentStatus;
import com.company.hrms.entity.DocumentVerificationStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.repository.EmployeeDocumentRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.service.EmployeeDocumentService;
import com.company.hrms.service.EmployeeService;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmployeeDocumentServiceImpl implements EmployeeDocumentService
{

    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;

    private static final Set<String> REQUIRED_DOCUMENT_TYPES = Set.of(
            "AADHAAR", "PAN", "TEN_MARKSHEET", "TWELVE_MARKSHEET", "UG_MARKSHEET", "UG_DEGREE"
    );

    private static final Set<String> VALID_DOCUMENT_TYPES = Set.of(
            "AADHAAR", "PAN", "TEN_MARKSHEET", "TWELVE_MARKSHEET", "UG_MARKSHEET", "UG_DEGREE", "PG_DEGREE"
    );


    public EmployeeDocumentServiceImpl(EmployeeDocumentRepository employeeDocumentRepository, EmployeeService employeeService,
            EmployeeRepository employeeRepository) {
        this.employeeDocumentRepository = employeeDocumentRepository;
        this.employeeService = employeeService;
        this.employeeRepository = employeeRepository;
    }

    @Value("${app.file-storage.location}")
    private String storageLocation; // root directory for storing files

    @Override
    public EmployeeDocument uploadDocument(String employeeCode,String documentType, String documentNumber,MultipartFile file)
    {
        String normalizedDocumentType = documentType == null ? "" : documentType.trim().toUpperCase(Locale.ROOT);

        // 1. Check employee
        if(!employeeService.employeeExists(employeeCode))
                throw new RuntimeException("Employee not found");

        // 2. Check duplicate document type
        if (!VALID_DOCUMENT_TYPES.contains(normalizedDocumentType))
                throw new IllegalArgumentException("Unsupported document type");

        if (employeeDocumentRepository.existsByEmployeeCodeAndDocumentType(employeeCode, normalizedDocumentType))
                throw new RuntimeException("Document already exists for this employee");

        // 3. Validate file
        validateFile(file);

        StoredFile storedFile = storeFile(employeeCode, file);


        // 7. Create and save EmployeeDocument entity   
        EmployeeDocument document = new EmployeeDocument();

        document.setEmployeeCode(employeeCode);
        document.setDocumentType(normalizedDocumentType);
        document.setDocumentNumber(documentNumber);
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(storedFile.relativePath());
        document.setFileSize(file.getSize());
        document.setContentType(file.getContentType());
        document.setUploadedAt(LocalDateTime.now());

        EmployeeDocument savedDocument = employeeDocumentRepository.save(document);
        recalculateEmployeeDocumentStatus(employeeCode);

        // 8. Log the successful save
        log.info("Document {} saved for employee {}", file.getOriginalFilename(), employeeCode);

        
        return savedDocument;
    }

    @Override
    public List<EmployeeDocument> getEmployeeDocuments(String employeeCode) 
    {
       // 1. Check employee
        if(!employeeService.employeeExists(employeeCode))
                throw new RuntimeException("Employee not found");

        return employeeDocumentRepository.findByEmployeeCode(employeeCode);
    }

    @Override
    public Resource getDocument(Long documentId,String employeeCode) 
    {
        // 1. get document by documentId and employeeCode
        EmployeeDocument document = employeeDocumentRepository
                                                .findByIdAndEmployeeCode(documentId, employeeCode)
                                                .orElseThrow(()->new RuntimeException("Document not found for employee " + 
                                                        employeeCode + " with document ID " + documentId));

        // 2. Check if file exists in the storage location
        Path filePath = Paths.get(storageLocation, document.getFilePath());

        // 3. If file does not exist, throw an exception
        if (!Files.exists(filePath)) 
                throw new RuntimeException("File not found");

        // 4. Return the file as a Resource
        try 
        {
            log.info("Loading document {} for employee {}", document.getFileName(), employeeCode);

            return new UrlResource(filePath.toUri());
        } 
        catch (MalformedURLException e) 
        {
                throw new RuntimeException("Unable to load file", e);
        }

         
    }

    @Override
    public EmployeeDocument resubmitDocument(String employeeCode, Long documentId, String documentNumber, MultipartFile file) {
        validateFile(file);

        EmployeeDocument document = employeeDocumentRepository.findByIdAndEmployeeCode(documentId, employeeCode)
                .orElseThrow(() -> new RuntimeException("Document not found for employee " + employeeCode));
        if (document.getReviewStatus() != EmployeeDocumentStatus.REJECTED) {
            throw new IllegalStateException("Only rejected documents can be resubmitted");
        }

        String oldRelativePath = document.getFilePath();
        StoredFile storedFile = storeFile(employeeCode, file);

        // Delete old file after successfully storing the new one
        if (oldRelativePath != null) {
            try {
                Path oldFilePath = Paths.get(storageLocation, oldRelativePath).normalize();
                Files.deleteIfExists(oldFilePath);
            } catch (IOException e) {
                log.warn("Failed to delete old document file {}: {}", oldRelativePath, e.getMessage());
            }
        }
        document.setDocumentNumber(documentNumber);
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(storedFile.relativePath());
        document.setFileSize(file.getSize());
        document.setContentType(file.getContentType());
        document.setUploadedAt(LocalDateTime.now());
        document.setReviewStatus(EmployeeDocumentStatus.PENDING_REVIEW);
        document.setReviewNote(null);
        document.setReviewedAt(null);
        document.setReviewedBy(null);

        EmployeeDocument resubmittedDocument = employeeDocumentRepository.save(document);
        recalculateEmployeeDocumentStatus(employeeCode);
        return resubmittedDocument;
    }

    @Override
    public EmployeeDocument reviewDocument(String employeeCode, Long documentId, EmployeeDocumentStatus status, String reason,
            String reviewerEmail) {
        if (status == EmployeeDocumentStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("A document can only be approved or rejected during review");
        }
        if (status == EmployeeDocumentStatus.REJECTED && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("A rejection reason is required");
        }

        EmployeeDocument document = employeeDocumentRepository.findByIdAndEmployeeCode(documentId, employeeCode)
                .orElseThrow(() -> new RuntimeException("Document not found for employee " + employeeCode));
        document.setReviewStatus(status);
        document.setReviewNote(status == EmployeeDocumentStatus.REJECTED ? reason.trim() : null);
        document.setReviewedAt(LocalDateTime.now());
        document.setReviewedBy(reviewerEmail);

        EmployeeDocument reviewedDocument = employeeDocumentRepository.save(document);
        recalculateEmployeeDocumentStatus(employeeCode);
        return reviewedDocument;
    }

    @Override
    public DocumentVerificationStatus getDocumentVerificationStatus(String employeeCode) {
        return getEmployee(employeeCode).getDocumentVerificationStatus();
    }

    @Override
    public List<EmployeeDocument> getDocumentsForReview() {
        return employeeDocumentRepository.findByReviewStatus(EmployeeDocumentStatus.PENDING_REVIEW);
    }

    private void recalculateEmployeeDocumentStatus(String employeeCode) {
        Employee employee = getEmployee(employeeCode);
        List<EmployeeDocument> documents = employeeDocumentRepository.findByEmployeeCode(employeeCode);

        boolean allRequiredDocumentsUploaded = REQUIRED_DOCUMENT_TYPES.stream()
                .allMatch(requiredType -> documents.stream()
                        .anyMatch(document -> requiredType.equals(document.getDocumentType())));

        if (!allRequiredDocumentsUploaded) {
            employee.setDocumentVerificationStatus(DocumentVerificationStatus.NOT_SUBMITTED);
        } else if (documents.stream().anyMatch(document -> REQUIRED_DOCUMENT_TYPES.contains(document.getDocumentType())
                && document.getReviewStatus() == EmployeeDocumentStatus.REJECTED)) {
            employee.setDocumentVerificationStatus(DocumentVerificationStatus.REJECTED);
        } else if (REQUIRED_DOCUMENT_TYPES.stream().allMatch(requiredType -> documents.stream()
                .anyMatch(document -> requiredType.equals(document.getDocumentType())
                        && document.getReviewStatus() == EmployeeDocumentStatus.APPROVED))) {
            employee.setDocumentVerificationStatus(DocumentVerificationStatus.APPROVED);
        } else {
            employee.setDocumentVerificationStatus(DocumentVerificationStatus.PENDING_REVIEW);
        }
        employeeRepository.save(employee);
    }

    private Employee getEmployee(String employeeCode) {
        return employeeRepository.findByEmployeeCode(employeeCode)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    private StoredFile storeFile(String employeeCode, MultipartFile file) {
        try {
            Path employeeFolder = Paths.get(storageLocation, "employee", employeeCode).normalize();
            Files.createDirectories(employeeFolder);

            String originalFileName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
            String extension = "";
            int extensionIndex = originalFileName.lastIndexOf('.');
            if (extensionIndex >= 0) {
                extension = originalFileName.substring(extensionIndex);
            }
            String storedFileName = UUID.randomUUID() + extension;
            Path filePath = employeeFolder.resolve(storedFileName).normalize();
            if (!filePath.startsWith(employeeFolder)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            file.transferTo(filePath);
            return new StoredFile("employee/" + employeeCode + "/" + storedFileName);
        } catch (IOException e) {
            log.error("Error saving document for employee {}: {}", employeeCode, e.getMessage());
            throw new RuntimeException("Failed to save document", e);
        }
    }

    private record StoredFile(String relativePath) {
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        // 1 MB limit (1,048,576 bytes)
        if (file.getSize() > 1048576) {
            throw new IllegalArgumentException("File size exceeds the 1 MB limit");
        }
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            throw new IllegalArgumentException("Invalid file name");
        }
        String lowerName = originalFileName.toLowerCase(Locale.ROOT);
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".jpg") && !lowerName.endsWith(".jpeg") && !lowerName.endsWith(".png")) {
            throw new IllegalArgumentException("Unsupported file type. Only PDF and image (.jpg, .jpeg, .png) files are allowed.");
        }
    }

}
