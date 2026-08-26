package com.company.hrms.service.impl;

import com.company.hrms.dto.request.AttendancePunchRequest;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Leave;
import com.company.hrms.entity.User;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.AttendanceCalculationService;
import com.company.hrms.service.AttendanceService;
import com.company.hrms.service.GeofenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final LeaveRepository leaveRepository;
    private final AttendanceCalculationService calculationService;
    private final GeofenceService geofenceService;

    @Override
    @Transactional
    public Map<String, Object> clockIn(String userEmail, AttendancePunchRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseGet(() -> userRepository.findByEmailAndActiveTrue(userEmail)
                        .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail)));

        Employee emp = getOrCreateEmployee(user);
        LocalDate today = LocalDate.now();

        // 1. WFH / Leave check
        checkLeaveOrWfhStatus(emp.getId(), today);

        // 2. Geofence location validation
        Double lat = request != null ? request.getLatitude() : null;
        Double lon = request != null ? request.getLongitude() : null;
        Double distanceMeters = geofenceService.validateLocation(lat, lon);

        // 3. Existing attendance check
        Attendance att = attendanceRepository.findByEmployeeIdAndDate(emp.getId(), today)
                .orElseGet(() -> {
                    Attendance a = new Attendance();
                    a.setEmployee(emp);
                    a.setDate(today);
                    a.setCreatedBy(userEmail);
                    return a;
                });

        if (att.getClockOut() != null) {
            throw new IllegalStateException("You have already clocked out for today");
        }

        att.setClockIn(LocalDateTime.now());
        att.setClockOut(null); // Keep clockOut null on check-in
        att.setStatus(calculationService.calculateStatus(att.getClockIn(), att.getClockOut(), att.getStatus()));
        att.setTotalHours(calculationService.calculateWorkingHours(att.getClockIn(), att.getClockOut()));
        att.setUpdatedBy(userEmail);

        if (distanceMeters != null) {
            att.setClockInLatitude(lat);
            att.setClockInLongitude(lon);
            att.setClockInDistanceMeters(distanceMeters);
        }

        att = attendanceRepository.save(att);
        log.info("Clock-in recorded successfully for employeeId={} at {}", emp.getId(), att.getClockIn());

        return Map.of(
                "message", "Clocked in successfully",
                "time", att.getClockIn().toString(),
                "status", att.getStatus().name()
        );
    }

    @Override
    @Transactional
    public Map<String, Object> clockOut(String userEmail, AttendancePunchRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseGet(() -> userRepository.findByEmailAndActiveTrue(userEmail)
                        .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail)));

        Employee emp = getOrCreateEmployee(user);
        LocalDate today = LocalDate.now();

        // 1. WFH / Leave check
        checkLeaveOrWfhStatus(emp.getId(), today);

        // 2. Geofence location validation
        Double lat = request != null ? request.getLatitude() : null;
        Double lon = request != null ? request.getLongitude() : null;
        Double distanceMeters = geofenceService.validateLocation(lat, lon);

        // 3. Attendance record handling
        Attendance att = attendanceRepository.findByEmployeeIdAndDate(emp.getId(), today)
                .orElseGet(() -> {
                    Attendance a = new Attendance();
                    a.setEmployee(emp);
                    a.setDate(today);
                    a.setClockIn(LocalDateTime.now().minusHours(8));
                    a.setCreatedBy(userEmail);
                    return a;
                });

        att.setClockOut(LocalDateTime.now());
        att.setTotalHours(calculationService.calculateWorkingHours(att.getClockIn(), att.getClockOut()));
        att.setStatus(calculationService.calculateStatus(att.getClockIn(), att.getClockOut(), att.getStatus()));
        att.setUpdatedBy(userEmail);

        if (distanceMeters != null) {
            att.setClockOutLatitude(lat);
            att.setClockOutLongitude(lon);
            att.setClockOutDistanceMeters(distanceMeters);
        }

        att = attendanceRepository.save(att);
        log.info("Clock-out recorded successfully for employeeId={} at {}", emp.getId(), att.getClockOut());

        return Map.of(
                "message", "Clocked out successfully",
                "time", att.getClockOut().toString(),
                "status", att.getStatus().name()
        );
    }

    private void checkLeaveOrWfhStatus(Long employeeId, LocalDate date) {
        List<Leave> activeLeaves = leaveRepository.findByEmployeeId(employeeId);
        boolean isOnLeaveOrWfh = activeLeaves.stream().anyMatch(l -> {
            boolean isApproved = l.getStatus() == Leave.LeaveStatus.APPROVED;
            if (!isApproved || l.getStartDate() == null || l.getEndDate() == null) return false;
            return !date.isBefore(l.getStartDate()) && !date.isAfter(l.getEndDate());
        });

        if (isOnLeaveOrWfh) {
            throw new IllegalStateException("Clock in and clock out are disabled for today because you are on approved Work From Home (WFH) or Leave.");
        }
    }

    private Employee getOrCreateEmployee(User user) {
        Optional<Employee> existing = employeeRepository.findByUserId(user.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Employee newEmp = new Employee();
        newEmp.setUser(user);
        String email = user.getEmail();
        String prefix = email.split("@")[0];
        String namePart = prefix.replace(".", " ");
        String[] parts = namePart.split(" ");
        String firstName = parts[0].substring(0, 1).toUpperCase() + (parts[0].length() > 1 ? parts[0].substring(1) : "");
        String lastName = parts.length > 1 ? (parts[1].substring(0, 1).toUpperCase() + (parts[1].length() > 1 ? parts[1].substring(1) : "")) : "Staff";

        newEmp.setFirstName(firstName);
        newEmp.setLastName(lastName);

        String code = "EMP-" + String.format("%03d", user.getId());
        if (employeeRepository.existsByEmployeeCode(code)) {
            code = "EMP-U" + user.getId() + "-" + (System.currentTimeMillis() % 10000);
        }
        newEmp.setEmployeeCode(code);
        newEmp.setDepartment("Engineering");
        newEmp.setDesignation("Software Engineer");
        newEmp.setJoiningDate(LocalDate.now());
        newEmp.setActive(true);
        newEmp.setCreatedBy(user.getEmail());
        return employeeRepository.save(newEmp);
    }
}
