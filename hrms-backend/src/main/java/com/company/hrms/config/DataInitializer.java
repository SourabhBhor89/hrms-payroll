package com.company.hrms.config;

import com.company.hrms.entity.Role;
import com.company.hrms.entity.RoleName;
import com.company.hrms.entity.User;
import com.company.hrms.repository.RoleRepository;
import com.company.hrms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@hrms.local}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@12345}")
    private String adminPassword;

    @Override
    public void run(String... args) {

        Role adminRole = roleRepository
                .findByName(RoleName.ADMIN)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "ADMIN role not found"
                        )
                );

        if (!userRepository.existsByEmail(adminEmail)) {

            User admin = new User();

            admin.setEmail(adminEmail);
            admin.setPassword(
                    passwordEncoder.encode(adminPassword)
            );
            admin.setRole(adminRole);
            admin.setActive(true);

            userRepository.save(admin);

            System.out.println(
                    "Default HRMS admin user created: "
                            + adminEmail
            );
        }

        roleRepository.findByName(RoleName.EMPLOYEE).ifPresent(employeeRole -> {
            String empEmail = "employee@hrms.local";
            if (!userRepository.existsByEmail(empEmail)) {
                User emp = new User();
                emp.setEmail(empEmail);
                emp.setPassword(passwordEncoder.encode("Employee@12345"));
                emp.setRole(employeeRole);
                emp.setActive(true);
                userRepository.save(emp);
                System.out.println("Default HRMS employee user created: " + empEmail);
            }
        });
    }
}