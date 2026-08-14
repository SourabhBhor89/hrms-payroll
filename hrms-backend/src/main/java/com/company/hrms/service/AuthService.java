package com.company.hrms.service;

import com.company.hrms.dto.request.LoginRequest;
import com.company.hrms.dto.response.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

public interface AuthService {

    LoginResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse);

    LoginResponse login(LoginRequest request);

    LoginResponse refreshToken(HttpServletRequest request, HttpServletResponse response);

    Map<String, String> heartbeat(HttpServletRequest request);

    void logout(HttpServletRequest request, HttpServletResponse response);
}