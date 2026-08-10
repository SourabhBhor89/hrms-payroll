package com.company.hrms.service.impl;

import com.company.hrms.dto.request.CreateRegularizationRequest;
import com.company.hrms.dto.request.ReviewRegularizationRequest;
import com.company.hrms.dto.response.AttendanceRegularizationDto;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.AttendanceRegularization;
import com.company.hrms.entity.AttendanceStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.EmployeeWorkDetails;
import com.company.hrms.entity.RegularizationStatus;
import com.company.hrms.entity.User;
import com.company.hrms.repository.AttendanceRegularizationRepository;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.UserRepository;
import com.company.hrms.service.AttendanceCalculationService;
import com.company.hrms.service.AttendanceRegularizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceRegularizationServiceImpl implements AttendanceRegularizationService {

    private final AttendanceRegularizationRepository regularizationRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AttendanceCalculationService calculationService;

    @Override
    @Transactional
    public AttendanceRegularizationDto createRegularization(String userEmail, CreateRegularizationRequest request) {
        User user = userRepository.findByEmailAndActiveTrue(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        Employee employee = getOrCreateEmployee(user);

        LocalDate date = request.getAttendanceDate();

        // 1. Check payroll lock & active month rule
        LocalDate now = LocalDate.now();
        if (date.isAfter(now)) {
            throw new IllegalArgumentException("Cannot submit regularization for future dates.");
        }

        // 2. Fetch or create base attendance record for date
        Attendance attendance = attendanceRepository.findByEmployeeIdAndDate(employee.getId(), date)
                .orElseGet(() -> {
                    Attendance newAtt = new Attendance();
                    newAtt.setEmployee(employee);
                    newAtt.setDate(date);
                    newAtt.setStatus(AttendanceStatus.ABSENT);
                    newAtt.setIsLocked(false);
                    newAtt.setCreatedBy(userEmail);
                    return attendanceRepository.save(newAtt);
                });

        // 3. Eligibility Checks
        if (Boolean.TRUE.equals(attendance.getIsLocked())) {
            throw new IllegalStateException("Attendance for " + date + " is locked by payroll and cannot be regularized.");
        }

        if (attendance.getStatus() == AttendanceStatus.LEAVE ||
            attendance.getStatus() == AttendanceStatus.HOLIDAY ||
            attendance.getStatus() == AttendanceStatus.WEEKEND) {
            throw new IllegalStateException("Regularization is not allowed for " + attendance.getStatus() + " days.");
        }

        // Check for existing PENDING or APPROVED requests
        List<AttendanceRegularization> existingRequests = regularizationRepository
                .findByAttendanceIdAndStatusIn(attendance.getId(), List.of(RegularizationStatus.PENDING, RegularizationStatus.APPROVED));

        for (AttendanceRegularization req : existingRequests) {
            if (req.getStatus() == RegularizationStatus.PENDING) {
                throw new IllegalStateException("A regularization request for " + date + " is already pending review.");
            }
            if (req.getStatus() == RegularizationStatus.APPROVED) {
                throw new IllegalStateException("Attendance for " + date + " has already been regularized.");
            }
        }

        double requestedHours = calculationService.calculateWorkingHours(request.getRequestedClockIn(), request.getRequestedClockOut());

        AttendanceRegularization reg = new AttendanceRegularization();
        reg.setAttendance(attendance);
        reg.setEmployee(employee);
        reg.setCorrectionType(request.getCorrectionType() != null ? request.getCorrectionType() : "BOTH");
        reg.setOriginalClockIn(attendance.getClockIn());
        reg.setOriginalClockOut(attendance.getClockOut());
        reg.setRequestedClockIn(request.getRequestedClockIn());
        reg.setRequestedClockOut(request.getRequestedClockOut());
        reg.setOriginalWorkingHours(attendance.getTotalHours() != null ? attendance.getTotalHours() : 0.0);
        reg.setRequestedWorkingHours(requestedHours);
        reg.setReason(request.getReason());
        reg.setAttachmentUrl(request.getAttachmentUrl());
        reg.setStatus(RegularizationStatus.PENDING);
        reg.setSubmittedAt(LocalDateTime.now());
        reg.setCreatedBy(userEmail);
        reg.setUpdatedBy(userEmail);

        reg = regularizationRepository.save(reg);

        return mapToDto(reg);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceRegularizationDto> getMyRegularizations(String userEmail) {
        User user = userRepository.findByEmailAndActiveTrue(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        Employee employee = getOrCreateEmployee(user);

        return regularizationRepository.findByEmployeeIdOrderBySubmittedAtDesc(employee.getId())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceRegularizationDto getRegularizationById(Long id, String userEmail) {
        AttendanceRegularization reg = regularizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found with ID: " + id));
        return mapToDto(reg);
    }

    @Override
    @Transactional
    public AttendanceRegularizationDto cancelRegularization(Long id, String userEmail) {
        AttendanceRegularization reg = regularizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found with ID: " + id));

        if (reg.getStatus() != RegularizationStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be cancelled.");
        }

        reg.setStatus(RegularizationStatus.CANCELLED);
        reg.setCancelledAt(LocalDateTime.now());
        reg.setUpdatedBy(userEmail);

        reg = regularizationRepository.save(reg);
        return mapToDto(reg);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceRegularizationDto> getAllRegularizations(String status, String department, Long employeeId, LocalDate startDate, LocalDate endDate) {
        List<AttendanceRegularization> list = regularizationRepository.findAllByOrderBySubmittedAtDesc();

        return list.stream()
                .filter(r -> status == null || status.equalsIgnoreCase("ALL") || r.getStatus().name().equalsIgnoreCase(status))
                .filter(r -> employeeId == null || r.getEmployee().getId().equals(employeeId))
                .filter(r -> {
                    if (startDate == null && endDate == null) return true;
                    LocalDate attDate = r.getAttendance().getDate();
                    if (startDate != null && attDate.isBefore(startDate)) return false;
                    if (endDate != null && attDate.isAfter(endDate)) return false;
                    return true;
                })
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AttendanceRegularizationDto approveRegularization(Long id, String reviewerEmail, ReviewRegularizationRequest request) {
        AttendanceRegularization reg = regularizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found with ID: " + id));

        if (reg.getStatus() != RegularizationStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state.");
        }

        Attendance attendance = reg.getAttendance();
        if (Boolean.TRUE.equals(attendance.getIsLocked())) {
            throw new IllegalStateException("Attendance is locked by payroll.");
        }

        // 1. Recalculate attendance parameters using policy engine
        LocalDateTime reqIn = reg.getRequestedClockIn();
        LocalDateTime reqOut = reg.getRequestedClockOut();

        double newWorkingHours = calculationService.calculateWorkingHours(reqIn, reqOut);
        AttendanceStatus newStatus = calculationService.calculateStatus(reqIn, reqOut, attendance.getStatus());

        // 2. Update Attendance Record
        attendance.setClockIn(reqIn);
        attendance.setClockOut(reqOut);
        attendance.setTotalHours(newWorkingHours);
        attendance.setStatus(newStatus);
        attendance.setNotes("Regularized on " + LocalDate.now() + " (" + reg.getReason() + ")");
        attendance.setUpdatedBy(reviewerEmail);
        attendanceRepository.save(attendance);

        // 3. Mark Regularization Request APPROVED
        reg.setStatus(RegularizationStatus.APPROVED);
        reg.setApprovedAt(LocalDateTime.now());
        reg.setReviewedBy(reviewerEmail);
        reg.setReviewRemarks(request != null ? request.getReviewRemarks() : "Approved by Manager/HR");
        reg.setUpdatedBy(reviewerEmail);

        reg = regularizationRepository.save(reg);

        return mapToDto(reg);
    }

    @Override
    @Transactional
    public AttendanceRegularizationDto rejectRegularization(Long id, String reviewerEmail, ReviewRegularizationRequest request) {
        AttendanceRegularization reg = regularizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found with ID: " + id));

        if (reg.getStatus() != RegularizationStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state.");
        }

        reg.setStatus(RegularizationStatus.REJECTED);
        reg.setRejectedAt(LocalDateTime.now());
        reg.setReviewedBy(reviewerEmail);
        reg.setReviewRemarks(request != null ? request.getReviewRemarks() : "Rejected by Manager/HR");
        reg.setUpdatedBy(reviewerEmail);

        reg = regularizationRepository.save(reg);

        return mapToDto(reg);
    }

    private AttendanceRegularizationDto mapToDto(AttendanceRegularization reg) {
        Employee emp = reg.getEmployee();
        User u = emp != null ? emp.getUser() : null;

        String dept = (emp != null && emp.getDepartment() != null && !emp.getDepartment().isBlank()) ? emp.getDepartment() : "Engineering";

        return AttendanceRegularizationDto.builder()
                .id(reg.getId())
                .attendanceId(reg.getAttendance().getId())
                .employeeId(emp != null ? emp.getId() : null)
                .employeeCode(emp != null ? emp.getEmployeeCode() : "N/A")
                .employeeName(emp != null ? (emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : "")).trim() : "Unknown")
                .employeeAvatar(emp != null && emp.getPhotoUrl() != null ? emp.getPhotoUrl() : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")
                .department(dept)
                .attendanceDate(reg.getAttendance().getDate())
                .correctionType(reg.getCorrectionType())
                .originalClockIn(reg.getOriginalClockIn())
                .originalClockOut(reg.getOriginalClockOut())
                .requestedClockIn(reg.getRequestedClockIn())
                .requestedClockOut(reg.getRequestedClockOut())
                .originalWorkingHours(reg.getOriginalWorkingHours())
                .requestedWorkingHours(reg.getRequestedWorkingHours())
                .reason(reg.getReason())
                .attachmentUrl(reg.getAttachmentUrl())
                .status(reg.getStatus())
                .submittedAt(reg.getSubmittedAt())
                .approvedAt(reg.getApprovedAt())
                .rejectedAt(reg.getRejectedAt())
                .cancelledAt(reg.getCancelledAt())
                .reviewedBy(reg.getReviewedBy())
                .reviewRemarks(reg.getReviewRemarks())
                .build();
    }

    private Employee getOrCreateEmployee(User user) {
        return employeeRepository.findByUserId(user.getId()).orElseGet(() -> {
            Employee newEmp = new Employee();
            newEmp.setUser(user);
            String prefix = user.getEmail().split("@")[0];
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
        });
    }
}
