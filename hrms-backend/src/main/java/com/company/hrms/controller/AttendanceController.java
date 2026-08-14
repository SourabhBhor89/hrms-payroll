package com.company.hrms.controller;

import com.company.hrms.dto.response.AttendanceDto;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.AttendanceRegularization;
import com.company.hrms.entity.AttendanceStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.RegularizationStatus;
import com.company.hrms.entity.User;
import com.company.hrms.entity.Leave;
import com.company.hrms.repository.AttendanceRegularizationRepository;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.AttendanceCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Slf4j
@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AttendanceRegularizationRepository regularizationRepository;
    private final AttendanceCalculationService calculationService;
    private final LeaveRepository leaveRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAttendance(
            Authentication authentication,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Long employeeId
    ) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByEmailAndActiveTrue(email).orElse(null));

            LocalDate now = LocalDate.now();
            int y = year != null ? year : now.getYear();
            int m = month != null ? month : now.getMonthValue();
            LocalDate start = LocalDate.of(y, m, 1);
            LocalDate end = start.plusMonths(1).minusDays(1);

            boolean isAdminOrHr = authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN") ||
                            a.getAuthority().equals("ROLE_HR") || a.getAuthority().equals("HR") ||
                            a.getAuthority().equals("ATTENDANCE_REGULARIZATION_VIEW_ALL") ||
                            a.getAuthority().equals("ATTENDANCE_UPDATE"));

            List<Attendance> records;
            if (employeeId != null) {
                records = attendanceRepository.findByEmployeeIdAndDateBetween(employeeId, start, end);
            } else if (isAdminOrHr) {
                records = attendanceRepository.findByDateBetween(start, end);
                if (records.isEmpty()) {
                    records = attendanceRepository.findAll();
                }
            } else if (user != null) {
                Employee emp = getOrCreateEmployee(user);
                records = attendanceRepository.findByEmployeeIdAndDateBetween(emp.getId(), start, end);
            } else {
                records = attendanceRepository.findByDateBetween(start, end);
                if (records.isEmpty()) {
                    records = attendanceRepository.findAll();
                }
            }

            List<AttendanceDto> dtos = records.stream().map(a -> {
                String regStatus = null;
                List<AttendanceRegularization> regs = regularizationRepository
                        .findByAttendanceIdAndStatusIn(a.getId(), List.of(RegularizationStatus.PENDING, RegularizationStatus.APPROVED, RegularizationStatus.REJECTED));
                if (!regs.isEmpty()) {
                    regStatus = regs.get(0).getStatus().name();
                }

                Employee emp = a.getEmployee();
                return AttendanceDto.builder()
                        .id(a.getId())
                        .employeeId(emp != null ? emp.getId() : null)
                        .employeeCode(emp != null ? emp.getEmployeeCode() : "N/A")
                        .employeeName(emp != null ? (emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : "")).trim() : "Staff")
                        .avatar(emp != null && emp.getPhotoUrl() != null ? emp.getPhotoUrl() : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")
                        .date(a.getDate())
                        .clockIn(a.getClockIn())
                        .clockOut(a.getClockOut())
                        .totalHours(a.getTotalHours())
                        .status(a.getStatus())
                        .isLocked(a.getIsLocked())
                        .notes(a.getNotes())
                        .regularizationStatus(regStatus)
                        .build();
            }).collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Error in getAttendance", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/today")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getTodayAttendance(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByEmailAndActiveTrue(email).orElse(null));

            if (user == null) {
                return ResponseEntity.ok(Map.of("hasRecord", false));
            }

            Employee emp = getOrCreateEmployee(user);
            LocalDate today = LocalDate.now();

            Optional<Attendance> attOpt = attendanceRepository.findByEmployeeIdAndDate(emp.getId(), today);
            if (attOpt.isEmpty()) {
                List<Attendance> userRecords = attendanceRepository.findByDateBetween(today, today).stream()
                        .filter(a -> a.getEmployee() != null && a.getEmployee().getUser() != null && a.getEmployee().getUser().getId().equals(user.getId()))
                        .collect(Collectors.toList());
                if (!userRecords.isEmpty()) {
                    attOpt = Optional.of(userRecords.get(userRecords.size() - 1));
                }
            }

            if (attOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of("hasRecord", false));
            }

            Attendance att = attOpt.get();
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");

            String inFormatted = att.getClockIn() != null ? att.getClockIn().format(formatter) : "";
            String outFormatted = att.getClockOut() != null ? att.getClockOut().format(formatter) : "";
            boolean isClockedIn = att.getClockIn() != null && att.getClockOut() == null;
            boolean isClockedOut = att.getClockIn() != null && att.getClockOut() != null;

            return ResponseEntity.ok(Map.of(
                    "hasRecord", true,
                    "clockIn", att.getClockIn() != null ? att.getClockIn().toString() : "",
                    "clockOut", att.getClockOut() != null ? att.getClockOut().toString() : "",
                    "clockInFormatted", inFormatted,
                    "clockOutFormatted", outFormatted,
                    "status", att.getStatus() != null ? att.getStatus().name() : "PRESENT",
                    "totalHours", att.getTotalHours() != null ? att.getTotalHours() : 0.0,
                    "isClockedIn", isClockedIn,
                    "isClockedOut", isClockedOut
            ));
        } catch (Exception e) {
            log.error("Error in getTodayAttendance", e);
            return ResponseEntity.ok(Map.of("hasRecord", false));
        }
    }

    @PostMapping({"", "/clock-in"})
    @PreAuthorize("hasAuthority('ATTENDANCE_CREATE')")
    public ResponseEntity<Map<String, Object>> clockIn(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByEmailAndActiveTrue(email).orElse(null));

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }
            Employee emp = getOrCreateEmployee(user);

            LocalDate today = LocalDate.now();
            List<Leave> activeLeaves = leaveRepository.findByEmployeeId(emp.getId());
            boolean isOnLeaveOrWfh = activeLeaves.stream().anyMatch(l -> {
                boolean isApproved = l.getStatus() == Leave.LeaveStatus.APPROVED;
                if (!isApproved || l.getStartDate() == null || l.getEndDate() == null) return false;
                return !today.isBefore(l.getStartDate()) && !today.isAfter(l.getEndDate());
            });

            if (isOnLeaveOrWfh) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Clock in and clock out are disabled for today because you are on approved Work From Home (WFH) or Leave."));
            }

            Attendance att = attendanceRepository.findByEmployeeIdAndDate(emp.getId(), today)
                    .orElseGet(() -> {
                        Attendance a = new Attendance();
                        a.setEmployee(emp);
                        a.setDate(today);
                        a.setCreatedBy(email);
                        return a;
                    });

            if (att.getClockOut() != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "You have already clocked out for today"));
            }

            att.setClockIn(LocalDateTime.now());
            att.setClockOut(null); // Keep clockOut null on check-in
            att.setStatus(calculationService.calculateStatus(att.getClockIn(), att.getClockOut(), att.getStatus()));
            att.setTotalHours(calculationService.calculateWorkingHours(att.getClockIn(), att.getClockOut()));
            att.setUpdatedBy(email);
            att = attendanceRepository.save(att);

            return ResponseEntity.ok(Map.of(
                    "message", "Clocked in successfully",
                    "time", att.getClockIn().toString(),
                    "status", att.getStatus().name()
            ));
        } catch (Exception e) {
            log.error("Error in clockIn", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to clock in: " + e.getMessage()));
        }
    }

    @PostMapping("/clock-out")
    @PutMapping("/clock-out")
    @PreAuthorize("hasAuthority('ATTENDANCE_CREATE')")
    public ResponseEntity<Map<String, Object>> clockOut(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByEmailAndActiveTrue(email).orElse(null));

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }
            Employee emp = getOrCreateEmployee(user);

            LocalDate today = LocalDate.now();
            List<Leave> activeLeaves = leaveRepository.findByEmployeeId(emp.getId());
            boolean isOnLeaveOrWfh = activeLeaves.stream().anyMatch(l -> {
                boolean isApproved = l.getStatus() == Leave.LeaveStatus.APPROVED;
                if (!isApproved || l.getStartDate() == null || l.getEndDate() == null) return false;
                return !today.isBefore(l.getStartDate()) && !today.isAfter(l.getEndDate());
            });

            if (isOnLeaveOrWfh) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Clock in and clock out are disabled for today because you are on approved Work From Home (WFH) or Leave."));
            }
            Attendance att = attendanceRepository.findByEmployeeIdAndDate(emp.getId(), today)
                    .orElseGet(() -> {
                        Attendance a = new Attendance();
                        a.setEmployee(emp);
                        a.setDate(today);
                        a.setClockIn(LocalDateTime.now().minusHours(8));
                        a.setCreatedBy(email);
                        return a;
                    });

            att.setClockOut(LocalDateTime.now());
            att.setTotalHours(calculationService.calculateWorkingHours(att.getClockIn(), att.getClockOut()));
            att.setStatus(calculationService.calculateStatus(att.getClockIn(), att.getClockOut(), att.getStatus()));
            att.setUpdatedBy(email);
            att = attendanceRepository.save(att);

            return ResponseEntity.ok(Map.of(
                    "message", "Clocked out successfully",
                    "time", att.getClockOut().toString(),
                    "status", att.getStatus().name()
            ));
        } catch (Exception e) {
            log.error("Error in clockOut", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to clock out: " + e.getMessage()));
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
