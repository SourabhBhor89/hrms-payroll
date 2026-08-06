package com.company.hrms.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;

    private String tokenType;

    private Long userId;

    private String email;

    private String role;

    private long expiresIn;
}