package com.company.hrms.security;

import com.company.hrms.entity.User;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user = userRepository
                .findByEmailAndActiveTrue(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "User not found or inactive"
                        )
                );

        Set<String> permissions = permissionService.getPermissionsForUser(user);

        return new CustomUserDetails(user, permissions);
    }
}