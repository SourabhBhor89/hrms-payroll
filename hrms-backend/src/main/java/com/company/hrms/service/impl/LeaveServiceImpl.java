package com.company.hrms.service.impl;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
import com.company.hrms.dto.response.EmployeeLeaveBalanceDetail;
import com.company.hrms.dto.response.EmployeeLeaveDataResponse;
import com.company.hrms.dto.response.LeaveResponse;
import com.company.hrms.dto.response.LeaveTypeResponse;
import com.company.hrms.entity.Attendance;
import com.company.hrms.entity.AttendanceStatus;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Leave;
import com.company.hrms.entity.LeaveBalance;
import com.company.hrms.entity.LeaveType;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveBalanceRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.LeaveTypeRepository;
import com.company.hrms.service.LeaveService;
import com.company.hrms.constants.CacheNames;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveServiceImpl implements LeaveService {

    private final LeaveRepository leaveRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.LEAVES, allEntries = true)
    public LeaveResponse createLeave(CreateLeaveRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Leave type not found with ID: " + request.getLeaveTypeId()));

        // Check 6-month employment rule for paid leaves (skip for unlimited leave types)
        if (leaveType.getDefaultDaysPerYear() > 0 && leaveType.getPaid() && !isEmployeeEligibleForPaidLeaves(employee)) {
            throw new IllegalArgumentException("You are not eligible for paid leaves yet. Paid leaves are available after 6 months of employment. Please use LOP instead.");
        }

        // Validate date range
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        // Calculate total days if not provided
        Double totalDays = request.getTotalDays();
        if (totalDays == null) {
            totalDays = calculateTotalDays(request.getStartDate(), request.getEndDate());
        }

        // Check for overlapping leaves
        List<Leave> overlappingLeaves = leaveRepository.findOverlappingLeaves(
                employee, Leave.LeaveStatus.PENDING, request.getStartDate(), request.getEndDate());
        overlappingLeaves.addAll(leaveRepository.findOverlappingLeaves(
                employee, Leave.LeaveStatus.APPROVED, request.getStartDate(), request.getEndDate()));

        if (!overlappingLeaves.isEmpty()) {
            throw new IllegalArgumentException("Overlapping leave requests exist for the given date range");
        }

        // Check leave balance (skip for unlimited leave types like WFH, LOP)
        Integer currentYear = Year.now().getValue();
        Integer currentMonth = java.time.LocalDate.now().getMonthValue();
        LeaveBalance leaveBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, currentYear, currentMonth)
                .orElseGet(() -> createInitialLeaveBalance(employee, leaveType, currentYear, currentMonth));

        // Only check balance for limited leave types (defaultDaysPerYear > 0)
        if (leaveType.getDefaultDaysPerYear() > 0) {
            // Special handling for Earned Leave: check if 2+ days are already pending
            if (leaveType.getCode().equals("EARNED")) {
                BigDecimal pendingDays = leaveBalance.getPendingDays();
                if (pendingDays.compareTo(BigDecimal.valueOf(2)) >= 0) {
                    throw new IllegalArgumentException("You already have " + pendingDays + " days of Earned Leave pending approval. Maximum 2 days can be pending at a time. Please wait for approval before applying for more.");
                }
            }

            // Calculate available balance (current balance minus pending days)
            BigDecimal availableBalance = leaveBalance.getBalanceDays().subtract(leaveBalance.getPendingDays());

            // Ensure available balance is not negative
            if (availableBalance.compareTo(BigDecimal.ZERO) < 0) {
                availableBalance = BigDecimal.ZERO;
            }

            // Special handling for Earned Leave: max 2 days per request (simplified monthly limit)
            if (leaveType.getCode().equals("EARNED") && totalDays > 2) {
                // For Earned Leave requests > 2 days, use earned balance for 2 days, rest is LOP
                int earnedDays = 2;
                int lopDays = (int) (totalDays - earnedDays);

                // Check if 2 days are available in earned balance
                if (availableBalance.compareTo(BigDecimal.valueOf(earnedDays)) < 0) {
                    throw new IllegalArgumentException("Insufficient earned leave balance. Available: " +
                            availableBalance + " days, Required: " + earnedDays + " days for earned leave. Maximum 2 days allowed per request.");
                }

                // Get LOP (Loss of Pay) Leave type
                LeaveType lopLeaveType = leaveTypeRepository.findByCode("LOP")
                        .orElseThrow(() -> new IllegalArgumentException("LOP leave type not found"));

                // Create Earned Leave record for 2 days
                Leave earnedLeave = new Leave();
                earnedLeave.setEmployee(employee);
                earnedLeave.setLeaveType(leaveType);
                earnedLeave.setStartDate(request.getStartDate());
                earnedLeave.setEndDate(request.getEndDate());
                earnedLeave.setTotalDays((double) earnedDays);
                earnedLeave.setReason(request.getReason());
                earnedLeave.setStatus(Leave.LeaveStatus.PENDING);
                earnedLeave = leaveRepository.save(earnedLeave);

                // Update earned leave balance
                leaveBalance.setPendingDays(leaveBalance.getPendingDays().add(BigDecimal.valueOf(earnedDays)));
                leaveBalanceRepository.save(leaveBalance);

                // Create LOP Leave record for remaining days
                Leave lopLeave = new Leave();
                lopLeave.setEmployee(employee);
                lopLeave.setLeaveType(lopLeaveType);
                lopLeave.setStartDate(request.getStartDate());
                lopLeave.setEndDate(request.getEndDate());
                lopLeave.setTotalDays((double) lopDays);
                lopLeave.setReason(request.getReason() + " (Exceeds 2-day earned leave limit)");
                lopLeave.setStatus(Leave.LeaveStatus.PENDING);
                lopLeave = leaveRepository.save(lopLeave);

                // Update LOP leave balance
                LeaveBalance lopBalance = leaveBalanceRepository
                        .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, lopLeaveType, currentYear, currentMonth)
                        .orElseGet(() -> createInitialLeaveBalance(employee, lopLeaveType, currentYear, currentMonth));
                lopBalance.setPendingDays(lopBalance.getPendingDays().add(BigDecimal.valueOf(lopDays)));
                leaveBalanceRepository.save(lopBalance);

                return mapToLeaveResponse(earnedLeave);
            }

            if (availableBalance.compareTo(BigDecimal.valueOf(totalDays)) < 0) {
                throw new IllegalArgumentException("Insufficient leave balance. Available: " +
                        availableBalance + " days (Current: " + leaveBalance.getBalanceDays() +
                        ", Pending: " + leaveBalance.getPendingDays() + "), Requested: " + totalDays + " days");
            }
        }

        Leave leave = new Leave();
        leave.setEmployee(employee);
        leave.setLeaveType(leaveType);
        leave.setStartDate(request.getStartDate());
        leave.setEndDate(request.getEndDate());
        leave.setTotalDays(totalDays);
        leave.setReason(request.getReason());
//        leave.setAttachmentUrl(request.getAttachmentUrl());
        leave.setStatus(Leave.LeaveStatus.PENDING);

        leave = leaveRepository.save(leave);

        // Update pending days in balance (only for limited leave types)
        if (leaveType.getDefaultDaysPerYear() > 0) {
            leaveBalance.setPendingDays(leaveBalance.getPendingDays().add(BigDecimal.valueOf(totalDays)));
            leaveBalanceRepository.save(leaveBalance);
        }

        return mapToLeaveResponse(leave);
    }

    @Override
    @Transactional
    public EmployeeLeaveDataResponse getEmployeeLeaveData(Long employeeId, Integer year, Integer month) {
        return getEmployeeLeaveData(employeeId, year, month, false);
    }

    @Override
    @Transactional
    @Cacheable(value = CacheNames.LEAVES, key = "#employeeId + '_' + #year + '_' + #month + '_' + #isAdminOrHr")
    public EmployeeLeaveDataResponse getEmployeeLeaveData(Long employeeId, Integer year, Integer month, boolean isAdminOrHr) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        // Get all active leave types
        List<LeaveType> allLeaveTypes = leaveTypeRepository.findAll().stream()
                .filter(LeaveType::getActive)
                .collect(Collectors.toList());

        List<EmployeeLeaveBalanceDetail> balanceDetails = new java.util.ArrayList<>();

        // Pre-fetch employee leaves once to avoid N+1 queries inside loop
        List<Leave> empLeaves = leaveRepository.findByEmployeeId(employee.getId());

        for (LeaveType leaveType : allLeaveTypes) {
            // Try to get existing balance
            LeaveBalance balance = leaveBalanceRepository
                    .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, year, month)
                    .orElseGet(() -> createInitialLeaveBalance(employee, leaveType, year, month));

            BigDecimal usedDaysVal = balance.getUsedDays() != null ? balance.getUsedDays() : BigDecimal.ZERO;
            if ("WFH".equalsIgnoreCase(leaveType.getCode()) || (leaveType.getName() != null && leaveType.getName().toLowerCase().contains("work from home"))) {
                double wfhSum = empLeaves.stream()
                        .filter(l -> l.getLeaveType() != null && l.getLeaveType().getId().equals(leaveType.getId()))
                        .filter(l -> l.getStatus() == Leave.LeaveStatus.APPROVED)
                        .mapToDouble(l -> l.getTotalDays() != null ? l.getTotalDays() : 0.0)
                        .sum();
                if (wfhSum > 0) {
                    usedDaysVal = BigDecimal.valueOf(wfhSum);
                }
            }

            EmployeeLeaveBalanceDetail detail = EmployeeLeaveBalanceDetail.builder()
                    .leaveTypeId(leaveType.getId())
                    .leaveTypeCode(leaveType.getCode())
                    .leaveTypeName(leaveType.getName())
                    .totalDays(balance.getTotalDays())
                    .usedDays(usedDaysVal)
                    .pendingDays(balance.getPendingDays())
                    .balanceDays(balance.getBalanceDays())
                    .carriedForwardDays(balance.getCarriedForwardDays())
                    .paid(leaveType.getPaid())
                    .build();

            balanceDetails.add(detail);
        }

        // Get leaves for the employee (or all leaves if admin/hr)
        List<Leave> leaves = isAdminOrHr ? leaveRepository.findAll() : empLeaves;
        List<LeaveResponse> leaveResponses = leaves.stream()
                .map(this::mapToLeaveResponse)
                .collect(Collectors.toList());

        return EmployeeLeaveDataResponse.builder()
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getFirstName() + " " + employee.getLastName())
                .email(employee.getUser() != null ? employee.getUser().getEmail() : null)
                .department(employee.getDepartment())
                .designation(employee.getDesignation())
                .year(year)
                .month(month)
                .leaveBalances(balanceDetails)
                .leaves(leaveResponses)
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.LEAVES, allEntries = true)
    public LeaveResponse updateLeave(Long id, UpdateLeaveRequest request, Long employeeId) {
        Leave leave = leaveRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Leave not found with ID: " + id));

        if (leave.getStatus() != Leave.LeaveStatus.PENDING) {
            throw new IllegalArgumentException("Only pending leaves can be updated");
        }

        if (request.getLeaveTypeId() != null) {
            LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                    .orElseThrow(() -> new IllegalArgumentException("Leave type not found with ID: " + request.getLeaveTypeId()));
            leave.setLeaveType(leaveType);
        }

        boolean datesChanged = false;
        LocalDate newStartDate = leave.getStartDate();
        LocalDate newEndDate = leave.getEndDate();

        if (request.getStartDate() != null) {
            leave.setStartDate(request.getStartDate());
            newStartDate = request.getStartDate();
            datesChanged = true;
        }

        if (request.getEndDate() != null) {
            leave.setEndDate(request.getEndDate());
            newEndDate = request.getEndDate();
            datesChanged = true;
        }

        // Recalculate totalDays if dates changed but totalDays not provided
        if (datesChanged && request.getTotalDays() == null) {
            leave.setTotalDays(calculateTotalDays(newStartDate, newEndDate));
        } else if (request.getTotalDays() != null) {
            leave.setTotalDays(request.getTotalDays());
        }

        if (request.getReason() != null) {
            leave.setReason(request.getReason());
        }

        if (request.getAttachmentUrl() != null) {
            leave.setAttachmentUrl(request.getAttachmentUrl());
        }

        leave = leaveRepository.save(leave);
        return mapToLeaveResponse(leave);
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.LEAVES, allEntries = true)
    public void cancelLeave(Long id, Long employeeId) {
        Leave leave = leaveRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Leave not found with ID: " + id));

        if (leave.getStatus() == Leave.LeaveStatus.CANCELLED) {
            throw new IllegalArgumentException("Leave is already cancelled");
        }

        if (leave.getStatus() == Leave.LeaveStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot cancel rejected leave");
        }

        // If it was approved, restore used days before changing status (only for limited leave types)
        if (leave.getStatus() == Leave.LeaveStatus.APPROVED && leave.getLeaveType().getDefaultDaysPerYear() > 0) {
            Integer currentYear = Year.now().getValue();
            Integer currentMonth = java.time.LocalDate.now().getMonthValue();
            LeaveBalance leaveBalance = leaveBalanceRepository
                    .findByEmployeeAndLeaveTypeAndYearAndMonth(leave.getEmployee(), leave.getLeaveType(), currentYear, currentMonth)
                    .orElseThrow(() -> new IllegalArgumentException("Leave balance not found"));

            leaveBalance.setUsedDays(leaveBalance.getUsedDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalance.setBalanceDays(leaveBalance.getBalanceDays().add(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalanceRepository.save(leaveBalance);
        }

        // If it was pending, restore pending days (only for limited leave types)
        if (leave.getStatus() == Leave.LeaveStatus.PENDING && leave.getLeaveType().getDefaultDaysPerYear() > 0) {
            Integer currentYear = Year.now().getValue();
            Integer currentMonth = java.time.LocalDate.now().getMonthValue();
            LeaveBalance leaveBalance = leaveBalanceRepository
                    .findByEmployeeAndLeaveTypeAndYearAndMonth(leave.getEmployee(), leave.getLeaveType(), currentYear, currentMonth)
                    .orElseThrow(() -> new IllegalArgumentException("Leave balance not found"));

            leaveBalance.setPendingDays(leaveBalance.getPendingDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalanceRepository.save(leaveBalance);
        }

        leave.setStatus(Leave.LeaveStatus.CANCELLED);
        leaveRepository.save(leave);
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheNames.LEAVES, allEntries = true)
    public LeaveResponse approveLeave(Long id, ApproveLeaveRequest request, Long approverId) {
        Leave leave = leaveRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave not found with ID: " + id));

        if (leave.getStatus() != Leave.LeaveStatus.PENDING) {
            throw new IllegalArgumentException("Only pending leaves can be approved/rejected");
        }

        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new IllegalArgumentException("Approver not found with ID: " + approverId));

        Integer currentYear = Year.now().getValue();
        Integer currentMonth = java.time.LocalDate.now().getMonthValue();
        LeaveBalance leaveBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(leave.getEmployee(), leave.getLeaveType(), currentYear, currentMonth)
                .orElseThrow(() -> new IllegalArgumentException("Leave balance not found"));

        if (request.getApproved()) {
            leave.setStatus(Leave.LeaveStatus.APPROVED);
            leave.setApprovedBy(approver);
            leave.setApprovedAt(LocalDateTime.now());

            // Update balance
            if (leave.getLeaveType().getDefaultDaysPerYear() > 0) {
                leaveBalance.setPendingDays(leaveBalance.getPendingDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
                leaveBalance.setUsedDays(leaveBalance.getUsedDays().add(BigDecimal.valueOf(leave.getTotalDays())));
                leaveBalance.setBalanceDays(leaveBalance.getBalanceDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            } else {
                leaveBalance.setUsedDays((leaveBalance.getUsedDays() != null ? leaveBalance.getUsedDays() : BigDecimal.ZERO).add(BigDecimal.valueOf(leave.getTotalDays())));
            }

            // Sync Attendance records for approved WFH or Leave date range
            if (leave.getLeaveType() != null) {
                boolean isWfh = "WFH".equalsIgnoreCase(leave.getLeaveType().getCode()) ||
                        (leave.getLeaveType().getName() != null && leave.getLeaveType().getName().toLowerCase().contains("work from home"));

                AttendanceStatus statusToSet = isWfh ? AttendanceStatus.WFH : AttendanceStatus.LEAVE;

                final Employee targetEmp = leave.getEmployee();
                LocalDate curDate = leave.getStartDate();
                LocalDate endDate = leave.getEndDate();
                while (curDate != null && endDate != null && !curDate.isAfter(endDate)) {
                    final LocalDate targetDate = curDate;
                    Attendance att = attendanceRepository.findByEmployeeIdAndDate(targetEmp.getId(), targetDate)
                            .orElseGet(() -> {
                                Attendance a = new Attendance();
                                a.setEmployee(targetEmp);
                                a.setDate(targetDate);
                                a.setCreatedBy("SYSTEM_LEAVE_APPROVAL");
                                return a;
                            });
                    att.setStatus(statusToSet);
                    if (att.getNotes() == null || att.getNotes().isBlank()) {
                        att.setNotes(isWfh ? "Approved Work From Home" : "Approved Leave: " + leave.getLeaveType().getName());
                    }
                    att.setUpdatedBy("SYSTEM_LEAVE_APPROVAL");
                    attendanceRepository.save(att);

                    curDate = curDate.plusDays(1);
                }
            }
        } else {
            leave.setStatus(Leave.LeaveStatus.REJECTED);
            leave.setRejectionReason(request.getRejectionReason());

            // Restore pending days (only for limited leave types)
            if (leave.getLeaveType().getDefaultDaysPerYear() > 0) {
                leaveBalance.setPendingDays(leaveBalance.getPendingDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            }
        }

        leaveBalanceRepository.save(leaveBalance);
        leave = leaveRepository.save(leave);

        return mapToLeaveResponse(leave);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaveResponse> getPendingApprovals(Long approverId) {
        List<Leave.LeaveStatus> statuses = List.of(Leave.LeaveStatus.PENDING);
        List<Leave> leaves = leaveRepository.findByStatusIn(statuses);
        return leaves.stream().map(this::mapToLeaveResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.LEAVE_TYPES, key = "'all'")
    public List<LeaveTypeResponse> getAllLeaveTypes() {
        return leaveTypeRepository.findAll().stream()
                .filter(lt -> Boolean.TRUE.equals(lt.getActive()))
                .map(this::mapToLeaveTypeResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaveTypeResponse> getAvailableLeaveTypesForEmployee(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        boolean eligibleForPaidLeaves = isEmployeeEligibleForPaidLeaves(employee);

        return leaveTypeRepository.findAll().stream()
                .filter(LeaveType::getActive)
                .map(leaveType -> {
                    LeaveTypeResponse response = mapToLeaveTypeResponse(leaveType);
                    // Mark EARNED as not eligible for employees with < 6 months tenure
                    if (leaveType.getCode().equals("EARNED") && !eligibleForPaidLeaves) {
                        response.setEligible(false);
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }



    private LeaveBalance createInitialLeaveBalance(Employee employee, LeaveType leaveType, Integer year, Integer month) {
        // Check 6-month employment rule for paid leaves
        boolean eligibleForPaidLeaves = isEmployeeEligibleForPaidLeaves(employee);

        BigDecimal monthlyAllocation;

        // Unlimited leave types (defaultDaysPerYear == 0) bypass 6-month check
        if (leaveType.getDefaultDaysPerYear() == 0) {
            // Unlimited leave types (WFH, LOP, etc.) - track usage but no limit
            monthlyAllocation = BigDecimal.ZERO; // No allocation, but we track usage
        } else if (leaveType.getPaid() && !eligibleForPaidLeaves) {
            // Employee not eligible for paid leaves yet
            monthlyAllocation = BigDecimal.ZERO;
        } else {
            // Calculate monthly allocation (yearly / 12)
            monthlyAllocation = BigDecimal.valueOf(leaveType.getDefaultDaysPerYear())
                    .divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP);
        }

        LeaveBalance balance = new LeaveBalance();
        balance.setEmployee(employee);
        balance.setLeaveType(leaveType);
        balance.setTotalDays(monthlyAllocation);
        balance.setUsedDays(BigDecimal.ZERO);
        balance.setPendingDays(BigDecimal.ZERO);
        balance.setBalanceDays(monthlyAllocation);
        balance.setCarriedForwardDays(BigDecimal.ZERO);
        balance.setYear(year);
        balance.setMonth(month);
        return leaveBalanceRepository.save(balance);
    }

    private boolean isEmployeeEligibleForPaidLeaves(Employee employee) {
        if (employee.getJoiningDate() == null) {
            return false;
        }

        LocalDate joiningDate = employee.getJoiningDate();
        LocalDate sixMonthsAfterJoining = joiningDate.plusMonths(6);
        
        return LocalDate.now().isAfter(sixMonthsAfterJoining) || 
               LocalDate.now().isEqual(sixMonthsAfterJoining);
    }

    private Double calculateTotalDays(LocalDate startDate, LocalDate endDate) {
        long totalDays = 0;
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            // Exclude weekends (Saturday = 6, Sunday = 7)
            if (current.getDayOfWeek().getValue() <= 5) {
                totalDays++;
            }
            current = current.plusDays(1);
        }
        
        return (double) totalDays;
    }

    private LeaveResponse mapToLeaveResponse(Leave leave) {
        return LeaveResponse.builder()
                .id(leave.getId())
                .employeeId(leave.getEmployee() != null ? leave.getEmployee().getId() : null)
                .employeeName(leave.getEmployee() != null ? 
                        leave.getEmployee().getFirstName() + " " + leave.getEmployee().getLastName() : null)
                .employeeCode(leave.getEmployee() != null ? leave.getEmployee().getEmployeeCode() : null)
                .leaveTypeId(leave.getLeaveType() != null ? leave.getLeaveType().getId() : null)
                .leaveTypeName(leave.getLeaveType() != null ? leave.getLeaveType().getName() : null)
                .leaveTypeCode(leave.getLeaveType() != null ? leave.getLeaveType().getCode() : null)
                .startDate(leave.getStartDate())
                .endDate(leave.getEndDate())
                .totalDays(leave.getTotalDays())
                .reason(leave.getReason())
                .status(leave.getStatus())
                .approvedBy(leave.getApprovedBy() != null ? leave.getApprovedBy().getId() : null)
                .approvedByName(leave.getApprovedBy() != null ? 
                        leave.getApprovedBy().getFirstName() + " " + leave.getApprovedBy().getLastName() : null)
                .approvedAt(leave.getApprovedAt())
                .rejectionReason(leave.getRejectionReason())
//                .attachmentUrl(leave.getAttachmentUrl())
                .createdAt(leave.getCreatedAt())
                .updatedAt(leave.getUpdatedAt())
                .build();
    }

    private LeaveTypeResponse mapToLeaveTypeResponse(LeaveType leaveType) {
        return LeaveTypeResponse.builder()
                .id(leaveType.getId())
                .code(leaveType.getCode())
                .name(leaveType.getName())
                .description(leaveType.getDescription())
                .defaultDaysPerYear(leaveType.getDefaultDaysPerYear())
                .paid(leaveType.getPaid())
                .requiresApproval(leaveType.getRequiresApproval())
                .active(leaveType.getActive())
                .maxCarryForwardDays(leaveType.getMaxCarryForwardDays())
//                .hasMonthlyLimit(leaveType.getHasMonthlyLimit())
                .build();
    }


}