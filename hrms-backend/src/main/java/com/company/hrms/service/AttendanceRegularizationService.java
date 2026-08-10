package com.company.hrms.service;

import com.company.hrms.dto.request.CreateRegularizationRequest;
import com.company.hrms.dto.request.ReviewRegularizationRequest;
import com.company.hrms.dto.response.AttendanceRegularizationDto;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceRegularizationService {

    AttendanceRegularizationDto createRegularization(String userEmail, CreateRegularizationRequest request);

    List<AttendanceRegularizationDto> getMyRegularizations(String userEmail);

    AttendanceRegularizationDto getRegularizationById(Long id, String userEmail);

    AttendanceRegularizationDto cancelRegularization(Long id, String userEmail);

    List<AttendanceRegularizationDto> getAllRegularizations(String status, String department, Long employeeId, LocalDate startDate, LocalDate endDate);

    AttendanceRegularizationDto approveRegularization(Long id, String reviewerEmail, ReviewRegularizationRequest request);

    AttendanceRegularizationDto rejectRegularization(Long id, String reviewerEmail, ReviewRegularizationRequest request);
}
