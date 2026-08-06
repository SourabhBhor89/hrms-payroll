package com.company.hrms.service;

import com.company.hrms.dto.request.LoginRequest;
import com.company.hrms.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);
}