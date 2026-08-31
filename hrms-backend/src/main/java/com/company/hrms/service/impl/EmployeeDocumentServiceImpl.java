package com.company.hrms.service.impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.entity.EmployeeDocument;
import com.company.hrms.repository.EmployeeDocumentRepository;
import com.company.hrms.service.EmployeeDocumentService;
import com.company.hrms.service.EmployeeService;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmployeeDocumentServiceImpl implements EmployeeDocumentService
{

    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final EmployeeService employeeService;

    public EmployeeDocumentServiceImpl(EmployeeDocumentRepository employeeDocumentRepository, EmployeeService employeeService) {
        this.employeeDocumentRepository = employeeDocumentRepository;
        this.employeeService = employeeService;
    }

    @Value("${app.file-storage.location}")
    private String storageLocation; // root directory for storing files

    @Override
    public EmployeeDocument uploadDocument(String employeeCode,String documentType, String documentNumber,MultipartFile file)
    {

        // 1. Check employee
        if(!employeeService.employeeExists(employeeCode))
                throw new RuntimeException("Employee not found");
        
        

        // 2. Check duplicate document type
        if (employeeDocumentRepository.existsByEmployeeCodeAndDocumentType(employeeCode, documentType)) 
                throw new RuntimeException("Document already exists for this employee");
        

        // 3. Validate file
        if (file == null || file.isEmpty()) 
                throw new RuntimeException("File is required");

        try 
        {
                
             // 4. Create employee folder if it doesn't exist
             Path employeeFolder = Paths.get(storageLocation,"employee", employeeCode.toString());
             Files.createDirectories(employeeFolder);  //Folder exists? yes -> Continue | No -> Create folder
                
             // 5. Save file to the employee folder
             String originalFileName = file.getOriginalFilename();
             Path filePath = employeeFolder.resolve(originalFileName);
                
             // Save the file to the specified path
             file.transferTo(filePath );

             // 6. Save document  log for info
            

        }
        catch (IOException e) 
        {
              log.error("Error saving document for employee {}: {}", employeeCode, e.getMessage());
              throw new RuntimeException("Failed to save document", e);
        }


        // 7. Create and save EmployeeDocument entity   
        EmployeeDocument document = new EmployeeDocument();

        document.setEmployeeCode(employeeCode);
        document.setDocumentType(documentType);
        document.setDocumentNumber(documentNumber);
        document.setFileName(file.getOriginalFilename());
        document.setFilePath("employee/" + employeeCode + "/" + file.getOriginalFilename());
        document.setFileSize(file.getSize());
        document.setContentType(file.getContentType());
        document.setUploadedAt(LocalDateTime.now());

        employeeDocumentRepository.save(document);

        // 8. Log the successful save
        log.info("Document {} saved for employee {}", file.getOriginalFilename(), employeeCode);

        
        return document;
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


}
