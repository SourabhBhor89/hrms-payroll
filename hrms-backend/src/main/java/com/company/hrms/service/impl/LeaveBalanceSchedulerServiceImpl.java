package com.company.hrms.service.impl;

import com.company.hrms.entity.Employee;
import com.company.hrms.entity.LeaveBalance;
import com.company.hrms.entity.LeaveType;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveBalanceRepository;
import com.company.hrms.repository.LeaveTypeRepository;
import com.company.hrms.service.LeaveBalanceSchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveBalanceSchedulerServiceImpl implements LeaveBalanceSchedulerService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Runs on the 1st of every month at 12:00 AM
     * Processes carry-forward from previous month and initializes new month balances
     * If it's January, also performs year-end reset logic
     */
    @Override
    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void processMonthlyLeaveBalanceUpdate() {
        log.info("Starting monthly leave balance update for: {}", LocalDate.now());

        LocalDate currentDate = LocalDate.now();
        int currentYear = currentDate.getYear();
        int currentMonth = currentDate.getMonthValue();
        
        // Calculate previous month
        YearMonth previousYearMonth = YearMonth.from(currentDate).minusMonths(1);
        int previousYear = previousYearMonth.getYear();
        int previousMonth = previousYearMonth.getMonthValue();

        List<Employee> allEmployees = employeeRepository.findAll();
        // Filter out admin users - they should not receive leave credits
        List<Employee> nonAdminEmployees = allEmployees.stream()
                .filter(employee -> !isAdmin(employee))
                .toList();
        List<LeaveType> allLeaveTypes = leaveTypeRepository.findAll().stream()
                .filter(LeaveType::getActive)
                .toList();

        // If it's January, perform year-end reset first
        if (currentMonth == 1) {
            log.info("January detected - performing year-end leave reset");
            for (Employee employee : nonAdminEmployees) {
                for (LeaveType leaveType : allLeaveTypes) {
                    processYearEndResetForEmployee(employee, leaveType, previousYear, currentYear);
                }
            }
        }

        // Process monthly balance update
        for (Employee employee : nonAdminEmployees) {
            for (LeaveType leaveType : allLeaveTypes) {
                processEmployeeMonthlyBalance(employee, leaveType, previousYear, previousMonth, currentYear, currentMonth);
            }
        }

        log.info("Completed monthly leave balance update");
    }

//    /**
//     * Runs daily to check for new employees and initialize their leave balances
//     */
//    @Override
//    @Scheduled(cron = "0 0 1 * * ?")
//    @Transactional
//    public void initializeMonthlyBalancesForNewEmployees() {
//        log.info("Checking for new employees to initialize leave balances");
//
//        LocalDate currentDate = LocalDate.now();
//        int currentYear = currentDate.getYear();
//        int currentMonth = currentDate.getMonthValue();
//
//        List<Employee> allEmployees = employeeRepository.findAll();
//        List<LeaveType> allLeaveTypes = leaveTypeRepository.findAll().stream()
//                .filter(LeaveType::getActive)
//                .toList();
//
//        for (Employee employee : allEmployees) {
//            for (LeaveType leaveType : allLeaveTypes) {
//                // Check if balance exists for current month
//                leaveBalanceRepository
//                        .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, currentYear, currentMonth)
//                        .ifPresentOrElse(
//                                existingBalance -> {
//                                    // Balance exists, no action needed
//                                },
//                                () -> {
//                                    // Create new balance for current month
//                                    createMonthlyBalance(employee, leaveType, currentYear, currentMonth);
//                                }
//                        );
//            }
//        }
//
//        log.info("Completed initialization of leave balances for new employees");
//    }

    private void processEmployeeMonthlyBalance(Employee employee, LeaveType leaveType, 
                                               int previousYear, int previousMonth, 
                                               int currentYear, int currentMonth) {
        
        // Get previous month balance
        LeaveBalance previousBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, previousYear, previousMonth)
                .orElse(null);

        // Check if current month balance already exists
        LeaveBalance currentBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, currentYear, currentMonth)
                .orElse(null);

        if (currentBalance == null) {
            // Create new balance for current month
            currentBalance = createMonthlyBalance(employee, leaveType, currentYear, currentMonth);
        }

        // No carry-forward between months - all balances reset to 0 at month start
        // Only carry-forward happens if explicitly enabled (currently disabled)
    }

    private void processYearEndResetForEmployee(Employee employee, LeaveType leaveType,
                                               int previousYear, int currentYear) {

        // Skip year-end reset for unlimited leave types
        if (leaveType.getDefaultDaysPerYear() == 0) {
            return;
        }

        // No carry-forward - all balances reset to 0 at year-end
        // December balance is not carried forward to January

        // Initialize January balance for new year
        LeaveBalance januaryBalance = leaveBalanceRepository
                .findByEmployeeAndLeaveTypeAndYearAndMonth(employee, leaveType, currentYear, 1)
                .orElse(null);

        if (januaryBalance == null) {
            createMonthlyBalance(employee, leaveType, currentYear, 1);
        }
    }

    private LeaveBalance createMonthlyBalance(Employee employee, LeaveType leaveType,
                                             int year, int month) {

        // Check 6-month employment rule for paid leaves
        boolean eligibleForPaidLeaves = isEmployeeEligibleForPaidLeaves(employee);

        BigDecimal monthlyAllocation;

        // Unlimited leave types (defaultDaysPerYear == 0) bypass 6-month check
        if (leaveType.getDefaultDaysPerYear() == 0) {
            monthlyAllocation = BigDecimal.ZERO; // No allocation, but we track usage
        } else if (leaveType.getPaid() && !eligibleForPaidLeaves) {
            // Employee not eligible for paid leaves yet
            monthlyAllocation = BigDecimal.ZERO;
        } else {
            // Calculate monthly allocation (yearly / 12)
            monthlyAllocation = BigDecimal.valueOf(leaveType.getDefaultDaysPerYear())
                    .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
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

    private boolean isAdmin(Employee employee) {
        if (employee.getUser() == null || employee.getUser().getRole() == null) {
            return false;
        }
        return "ADMIN".equalsIgnoreCase(String.valueOf(employee.getUser().getRole().getName()));
    }
}