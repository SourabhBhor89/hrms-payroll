package com.company.hrms.service;

import com.company.hrms.entity.AttendanceStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class AttendanceCalculationService {

    // Standard Office Schedule Settings: 10:00 AM - 07:00 PM
    private static final LocalTime SHIFT_START = LocalTime.of(10, 0);
    private static final LocalTime LATE_THRESHOLD = LocalTime.of(10, 15);
    private static final double FULL_DAY_HOURS = 8.0;
    private static final double HALF_DAY_HOURS = 4.0;

    /**
     * Calculates total working hours between clock-in and clock-out.
     */
    public double calculateWorkingHours(LocalDateTime clockIn, LocalDateTime clockOut) {
        if (clockIn == null || clockOut == null || clockOut.isBefore(clockIn)) {
            return 0.0;
        }
        Duration duration = Duration.between(clockIn, clockOut);
        double minutes = duration.toMinutes();
        double hours = minutes / 60.0;
        return Math.round(hours * 100.0) / 100.0;
    }

    /**
     * Determines the AttendanceStatus based on working hours and clock-in time.
     */
    public AttendanceStatus calculateStatus(LocalDateTime clockIn, LocalDateTime clockOut, AttendanceStatus currentStatus) {
        if (currentStatus == AttendanceStatus.LEAVE || currentStatus == AttendanceStatus.HOLIDAY || currentStatus == AttendanceStatus.WEEKEND || currentStatus == AttendanceStatus.WFH) {
            return currentStatus;
        }

        if (clockIn == null) {
            return AttendanceStatus.ABSENT;
        }

        // Active clock-in (employee has checked in but not yet checked out)
        if (clockOut == null) {
            if (clockIn.toLocalTime().isAfter(LATE_THRESHOLD)) {
                return AttendanceStatus.LATE;
            }
            return AttendanceStatus.PRESENT;
        }

        double hours = calculateWorkingHours(clockIn, clockOut);

        if (hours >= FULL_DAY_HOURS) {
            if (clockIn.toLocalTime().isAfter(LATE_THRESHOLD)) {
                return AttendanceStatus.LATE;
            }
            return AttendanceStatus.PRESENT;
        } else if (hours >= HALF_DAY_HOURS) {
            return AttendanceStatus.HALF_DAY;
        } else {
            return AttendanceStatus.ABSENT;
        }
    }
}
