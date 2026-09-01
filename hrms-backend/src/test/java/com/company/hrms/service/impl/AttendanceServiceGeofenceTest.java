package com.company.hrms.service.impl;

import com.company.hrms.dto.request.AttendancePunchRequest;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.AttendanceStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.User;
import com.company.hrms.exception.GeofenceException;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.AttendanceCalculationService;
import com.company.hrms.service.GeofenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AttendanceServiceGeofenceTest {

    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LeaveRepository leaveRepository;
    @Mock
    private AttendanceCalculationService calculationService;
    @Mock
    private GeofenceService geofenceService;

    @InjectMocks
    private AttendanceServiceImpl attendanceService;

    private User testUser;
    private Employee testEmp;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("employee@company.com");

        testEmp = new Employee();
        testEmp.setId(10L);
        testEmp.setUser(testUser);
        testEmp.setEmployeeCode("EMP-001");
        testEmp.setDocumentVerificationStatus(com.company.hrms.entity.DocumentVerificationStatus.APPROVED);

        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(employeeRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testEmp));
        when(leaveRepository.findByEmployeeId(testEmp.getId())).thenReturn(Collections.emptyList());
        when(calculationService.calculateStatus(any(), any(), any())).thenReturn(AttendanceStatus.PRESENT);
        when(calculationService.calculateWorkingHours(any(), any())).thenReturn(8.0);
    }

    @Test
    @DisplayName("Clock In allowed when coordinates are within 50m radius")
    void testClockIn_WithinRadius_Success() {
        AttendancePunchRequest req = new AttendancePunchRequest(22.7528, 75.8674);
        when(geofenceService.validateLocation(22.7528, 75.8674)).thenReturn(12.5);

        when(attendanceRepository.findByEmployeeIdAndDate(eq(10L), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = attendanceService.clockIn("employee@company.com", req);

        assertNotNull(result);
        assertEquals("Clocked in successfully", result.get("message"));
        verify(attendanceRepository).save(argThat(att ->
                att.getClockInLatitude().equals(22.7528) &&
                att.getClockInLongitude().equals(75.8674) &&
                att.getClockInDistanceMeters().equals(12.5)
        ));
    }

    @Test
    @DisplayName("Clock In rejected when GeofenceService throws GeofenceException")
    void testClockIn_OutsideRadius_ThrowsException() {
        AttendancePunchRequest req = new AttendancePunchRequest(22.8000, 75.9000);
        doThrow(new GeofenceException("OUTSIDE_GEOFENCE", "You are outside the office area", 500.0, 50.0))
                .when(geofenceService).validateLocation(22.8000, 75.9000);

        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                attendanceService.clockIn("employee@company.com", req)
        );

        assertEquals("OUTSIDE_GEOFENCE", ex.getErrorCode());
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Clock Out allowed when coordinates are within 50m radius")
    void testClockOut_WithinRadius_Success() {
        AttendancePunchRequest req = new AttendancePunchRequest(22.7528, 75.8674);
        when(geofenceService.validateLocation(22.7528, 75.8674)).thenReturn(18.0);

        Attendance existing = new Attendance();
        existing.setEmployee(testEmp);
        existing.setDate(LocalDate.now());
        existing.setClockIn(LocalDateTime.now().minusHours(8));

        when(attendanceRepository.findByEmployeeIdAndDate(eq(10L), any(LocalDate.class)))
                .thenReturn(Optional.of(existing));
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = attendanceService.clockOut("employee@company.com", req);

        assertNotNull(result);
        assertEquals("Clocked out successfully", result.get("message"));
        verify(attendanceRepository).save(argThat(att ->
                att.getClockOutLatitude().equals(22.7528) &&
                att.getClockOutLongitude().equals(75.8674) &&
                att.getClockOutDistanceMeters().equals(18.0)
        ));
    }

    @Test
    @DisplayName("Clock Out rejected when coordinates are outside 50m radius")
    void testClockOut_OutsideRadius_ThrowsException() {
        AttendancePunchRequest req = new AttendancePunchRequest(22.8000, 75.9000);
        doThrow(new GeofenceException("OUTSIDE_GEOFENCE", "You are outside the office area", 500.0, 50.0))
                .when(geofenceService).validateLocation(22.8000, 75.9000);

        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                attendanceService.clockOut("employee@company.com", req)
        );

        assertEquals("OUTSIDE_GEOFENCE", ex.getErrorCode());
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Clock In & Out disabled when user has active approved WFH or Leave")
    void testClockIn_OnLeaveOrWfh_Disabled() {
        com.company.hrms.entity.Leave activeLeave = new com.company.hrms.entity.Leave();
        activeLeave.setStatus(com.company.hrms.entity.Leave.LeaveStatus.APPROVED);
        activeLeave.setStartDate(LocalDate.now().minusDays(1));
        activeLeave.setEndDate(LocalDate.now().plusDays(1));

        when(leaveRepository.findByEmployeeId(testEmp.getId())).thenReturn(Collections.singletonList(activeLeave));

        AttendancePunchRequest req = new AttendancePunchRequest(22.7528, 75.8674);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                attendanceService.clockIn("employee@company.com", req)
        );

        assertTrue(ex.getMessage().contains("Clock in and clock out are disabled for today"));
        verify(geofenceService, never()).validateLocation(any(), any());
    }
}
