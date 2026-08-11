package com.company.hrms.service.impl;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
import com.company.hrms.dto.response.EmployeeLeaveBalanceDetail;
import com.company.hrms.dto.response.EmployeeLeaveDataResponse;
import com.company.hrms.dto.response.LeaveResponse;
import com.company.hrms.dto.response.LeaveTypeResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.Leave;
import com.company.hrms.entity.LeaveBalance;
import com.company.hrms.entity.LeaveType;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveBalanceRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.LeaveTypeRepository;
import com.company.hrms.service.LeaveService;
import lombok.RequiredArgsConstructor;
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

    @Override
    @Transactional
    public LeaveResponse createLeave(CreateLeaveRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Leave type not found with ID: " + request.getLeaveTypeId()));

        // Check 6-month employment rule for paid leaves
        if (leaveType.getPaid() && !isEmployeeEligibleForPaidLeaves(employee)) {
            throw new IllegalArgumentException("You are not eligible for paid leaves yet. Paid leaves are available after 6 months of employment. Please use unpaid leaves instead.");
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

        // Check leave balance (skip for unlimited leave types like WFH, unpaid)
        Integer currentYear = Year.now().getValue();
        Integer currentMonth = java.time.LocalDate.now().getMonthValue();
        LeaveBalance leaveBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, currentYear, currentMonth)
                .orElseGet(() -> createInitialLeaveBalance(employee, leaveType, currentYear, currentMonth));

        // Only check balance for limited leave types (defaultDaysPerYear > 0)
        if (leaveType.getDefaultDaysPerYear() > 0 && 
            leaveBalance.getBalanceDays().compareTo(BigDecimal.valueOf(totalDays)) < 0) {
            throw new IllegalArgumentException("Insufficient leave balance. Available: " + 
                    leaveBalance.getBalanceDays() + ", Requested: " + totalDays);
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

        // Update pending days in balance
        leaveBalance.setPendingDays(leaveBalance.getPendingDays().add(BigDecimal.valueOf(totalDays)));
        leaveBalanceRepository.save(leaveBalance);

        return mapToLeaveResponse(leave);
    }

    @Override
    @Transactional
    public EmployeeLeaveDataResponse getEmployeeLeaveData(Long employeeId, Integer year, Integer month) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        // Get all active leave types
        List<LeaveType> allLeaveTypes = leaveTypeRepository.findAll().stream()
                .filter(LeaveType::getActive)
                .collect(Collectors.toList());

        List<EmployeeLeaveBalanceDetail> balanceDetails = new java.util.ArrayList<>();

        for (LeaveType leaveType : allLeaveTypes) {
            // Try to get existing balance
            LeaveBalance balance = leaveBalanceRepository
                    .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, year, month)
                    .orElseGet(() -> createInitialLeaveBalance(employee, leaveType, year, month));

            EmployeeLeaveBalanceDetail detail = EmployeeLeaveBalanceDetail.builder()
                    .leaveTypeId(leaveType.getId())
                    .leaveTypeCode(leaveType.getCode())
                    .leaveTypeName(leaveType.getName())
                    .totalDays(balance.getTotalDays())
                    .usedDays(balance.getUsedDays())
                    .pendingDays(balance.getPendingDays())
                    .balanceDays(balance.getBalanceDays())
                    .carriedForwardDays(balance.getCarriedForwardDays())
                    .paid(leaveType.getPaid())
                    .build();

            balanceDetails.add(detail);
        }

        // Get leaves for the employee
        List<Leave> leaves = leaveRepository.findByEmployeeId(employeeId);
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
    public void cancelLeave(Long id, Long employeeId) {
        Leave leave = leaveRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Leave not found with ID: " + id));

        if (leave.getStatus() == Leave.LeaveStatus.CANCELLED) {
            throw new IllegalArgumentException("Leave is already cancelled");
        }

        if (leave.getStatus() == Leave.LeaveStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot cancel rejected leave");
        }

        // If it was approved, restore used days before changing status
        if (leave.getStatus() == Leave.LeaveStatus.APPROVED) {
            Integer currentYear = Year.now().getValue();
            Integer currentMonth = java.time.LocalDate.now().getMonthValue();
            LeaveBalance leaveBalance = leaveBalanceRepository
                    .findByEmployeeAndLeaveTypeAndYearAndMonth(leave.getEmployee(), leave.getLeaveType(), currentYear, currentMonth)
                    .orElseThrow(() -> new IllegalArgumentException("Leave balance not found"));

            leaveBalance.setUsedDays(leaveBalance.getUsedDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalance.setBalanceDays(leaveBalance.getBalanceDays().add(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalanceRepository.save(leaveBalance);
        }

        leave.setStatus(Leave.LeaveStatus.CANCELLED);
        leaveRepository.save(leave);
    }

    @Override
    @Transactional
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
            leaveBalance.setPendingDays(leaveBalance.getPendingDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalance.setUsedDays(leaveBalance.getUsedDays().add(BigDecimal.valueOf(leave.getTotalDays())));
            leaveBalance.setBalanceDays(leaveBalance.getBalanceDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
        } else {
            leave.setStatus(Leave.LeaveStatus.REJECTED);
            leave.setRejectionReason(request.getRejectionReason());

            // Restore pending days
            leaveBalance.setPendingDays(leaveBalance.getPendingDays().subtract(BigDecimal.valueOf(leave.getTotalDays())));
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
    public List<LeaveTypeResponse> getAllLeaveTypes() {
        return leaveTypeRepository.findAll().stream()
                .filter(LeaveType::getActive)
                .map(this::mapToLeaveTypeResponse)
                .collect(Collectors.toList());
    }



    private LeaveBalance createInitialLeaveBalance(Employee employee, LeaveType leaveType, Integer year, Integer month) {
        // Check 6-month employment rule for paid leaves
        boolean eligibleForPaidLeaves = isEmployeeEligibleForPaidLeaves(employee);
        
        BigDecimal monthlyAllocation;
        
        if (leaveType.getPaid() && !eligibleForPaidLeaves) {
            // Employee not eligible for paid leaves yet
            monthlyAllocation = BigDecimal.ZERO;
        } else if (leaveType.getDefaultDaysPerYear() == 0) {
            // Unlimited leave types (WFH, unpaid, etc.) - track usage but no limit
            monthlyAllocation = BigDecimal.ZERO; // No allocation, but we track usage
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
                .hasMonthlyLimit(leaveType.getHasMonthlyLimit())
                .build();
    }


}