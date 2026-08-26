package com.company.hrms.service;

import com.company.hrms.dto.request.AttendancePunchRequest;

import java.util.Map;

public interface AttendanceService {

    /**
     * Clocks in the employee identified by the given email after validating authentication,
     * WFH/Leave status, duplicate clock-in status, and geofence location requirements.
     *
     * @param userEmail Email of the authenticated user
     * @param request   AttendancePunchRequest containing device latitude and longitude
     * @return Result map containing success message, clock-in time, and status
     */
    Map<String, Object> clockIn(String userEmail, AttendancePunchRequest request);

    /**
     * Clocks out the employee identified by the given email after validating authentication,
     * WFH/Leave status, and geofence location requirements.
     *
     * @param userEmail Email of the authenticated user
     * @param request   AttendancePunchRequest containing device latitude and longitude
     * @return Result map containing success message, clock-out time, and status
     */
    Map<String, Object> clockOut(String userEmail, AttendancePunchRequest request);
}
