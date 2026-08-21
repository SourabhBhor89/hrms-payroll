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

import com.company.hrms.repository.PermissionRepository;
import java.util.HashSet;

import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@hrms.local}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@12345}")
    private String adminPassword;

    @Override
    @Transactional
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

        roleRepository.findByName(RoleName.HR).ifPresent(hrRole -> {
            String hrEmail = "hr@hrms.local";
            if (!userRepository.existsByEmail(hrEmail)) {
                User hr = new User();
                hr.setEmail(hrEmail);
                hr.setPassword(passwordEncoder.encode("Hr@12345"));
                hr.setRole(hrRole);
                hr.setActive(true);
                userRepository.save(hr);
                System.out.println("Default HRMS HR user created: " + hrEmail);
            }
        });

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

        if (roleRepository.findByName(RoleName.MANAGER).isEmpty()) {
            Role r = new Role();
            r.setName(RoleName.MANAGER);
            roleRepository.save(r);
        }

        if (roleRepository.findByName(RoleName.COORDINATOR).isEmpty()) {
            Role r = new Role();
            r.setName(RoleName.COORDINATOR);
            roleRepository.save(r);
        }

        roleRepository.findByName(RoleName.MANAGER).ifPresent(managerRole -> {
            permissionRepository.findByName("EMPLOYEE_LEAVE_WFH_VIEW").ifPresent(perm -> {
                if (managerRole.getPermissions() == null) {
                    managerRole.setPermissions(new HashSet<>());
                }
                if (!managerRole.getPermissions().contains(perm)) {
                    managerRole.getPermissions().add(perm);
                    roleRepository.save(managerRole);
                }
            });
        });

        roleRepository.findByName(RoleName.COORDINATOR).ifPresent(coordRole -> {
            permissionRepository.findByName("EMPLOYEE_LEAVE_WFH_VIEW").ifPresent(perm -> {
                if (coordRole.getPermissions() == null) {
                    coordRole.setPermissions(new HashSet<>());
                }
                if (!coordRole.getPermissions().contains(perm)) {
                    coordRole.getPermissions().add(perm);
                    roleRepository.save(coordRole);
                }
            });
        });
    }
}