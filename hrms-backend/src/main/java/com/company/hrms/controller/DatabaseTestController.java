package com.company.hrms.controller;

import com.company.hrms.entity.Role;
import com.company.hrms.entity.RoleName;
import com.company.hrms.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
public class DatabaseTestController {

    private final RoleRepository roleRepository;

    @GetMapping("/roles")
    public List<RoleResponse> getRoles() {

        return roleRepository.findAll()
                .stream()
                .map(role -> new RoleResponse(
                        role.getId(),
                        role.getName().name()
                ))
                .toList();
    }

    public record RoleResponse(
            Long id,
            String name
    ) {
    }
}