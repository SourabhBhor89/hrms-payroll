package com.company.hrms.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.company.hrms.service.EmployeeDocumentService;



@RestController
@RequestMapping("/api/v1/admin")
public class AdminTestController 
{
    @Autowired
    public EmployeeDocumentService employeeDocumentService;

    
    @GetMapping("/test")
    public Map<String, Object> test(
            Authentication authentication
    ) {

        return Map.of(
                "message", "Admin endpoint accessed successfully",
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        );
    }

    @GetMapping("/view")
    public String fileForm() 
    {
        return """
                <Form method="POST" action="/api/v1/admin/file" enctype="multipart/form-data">
                    <input type="text" name="id" placeholder="Employee ID" required />
                    <input type="file" name="file" required />
                    <button type="submit">Upload</button>
                """;
    }

    @PostMapping("/file")
    public String saveFile(@RequestParam("id") String emp_code, @RequestParam ("file") MultipartFile file) 
    {
        System.out.println("File received: " + file.getOriginalFilename() + ", Size: " + file.getSize() + " bytes");
       employeeDocumentService.uploadDocument(emp_code,"Adharuu","1234", file);
        
        return "File uploaded successfully: " + file.getOriginalFilename();
    }

    @GetMapping("/list")
    public List<?> getMethodName() 
    {
        return employeeDocumentService.getEmployeeDocuments("EMP-004");
    }
    
    
    
}