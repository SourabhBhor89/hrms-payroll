package com.company.hrms.service.impl;

import com.company.hrms.dto.request.LoginRequest;
import com.company.hrms.dto.response.LoginResponse;
import com.company.hrms.entity.User;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.security.JwtService;
import com.company.hrms.service.AuthService;
import com.company.hrms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final PermissionService permissionService;

    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository
                .findByEmailAndActiveTrue(request.getEmail())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user could not be found"
                        )
                );

        Set<String> permissions = permissionService.getPermissionsForUser(user);

        String accessToken = jwtService.generateToken(user, permissions);
        String refreshToken = jwtService.generateRefreshToken(user);

        String name = employeeRepository.findByUserId(user.getId())
                .map(emp -> {
                    if (emp.getLastName() != null && !emp.getLastName().isBlank()) {
                        return emp.getFirstName() + " " + emp.getLastName();
                    }
                    return emp.getFirstName();
                })
                .orElse(user.getEmail());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(3600)
                .user(LoginResponse.UserSummary.builder()
                        .id(user.getId())
                        .name(name)
                        .role(user.getRole().getName().name())
                        .build())
                .build();
    }
}