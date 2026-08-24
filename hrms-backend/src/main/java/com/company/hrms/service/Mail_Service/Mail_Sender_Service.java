package com.company.hrms.service.Mail_Service;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class Mail_Sender_Service 
{
    private final JavaMailSender javaMailSender;

    @Async // This annotation indicates that the method should be executed asynchronously in a separate thread, 
          // allowing the main thread to continue without waiting for the email sending process to complete.
    public void sendEmployeeCredencialMail(String to, String employeeFullName,String password) 
    {
        // 1. Create MimeMessage using JavaMailSender
        MimeMessage message = javaMailSender.createMimeMessage();

        // 2. in try-catch block to handle exceptions and crate MimeMessageHelper to set the email details
        try 
        {
            // 3. Create MimeMessageHelper to set the email details
            MimeMessageHelper helper = new MimeMessageHelper(message,true); // true indicates multipart message

            // Set the recipient and subject of the email
            helper.setTo(to); // Set the recipient email address
            helper.setSubject("Welcome to RapidHire - Your Employee Account Credentials");
            
            // 4. Generate the HTML content for the email using ViewProvider
            String htmlContent = ViewProvider.htmlMailTamplate()
                    .replace("{{employeeName}}", employeeFullName)
                    .replace("{{employeeId}}", to) // Assuming employeeId is the same as the email for this example
                    .replace("{{password}}", password);

            // 5. Set the HTML content as the email body
            helper.setText(htmlContent, true);

            // 6. Send the email
            javaMailSender.send(message);

            // Logging
            System.out.println("\n Email sent successfully to: " + to);
        } 
        catch (Exception e) 
        {
            e.printStackTrace();
        }
    }
}
