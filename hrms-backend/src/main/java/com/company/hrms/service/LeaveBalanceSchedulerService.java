package com.company.hrms.service;

public interface LeaveBalanceSchedulerService {

    /**
     * Processes monthly leave balance update.
     * When run in January, automatically includes year-end reset logic.
     */
    void processMonthlyLeaveBalanceUpdate();

//    /**
//     * Initializes monthly balances for new employees.
//     * Runs daily to check for new employees and create their leave balances.
//     */
//    void initializeMonthlyBalancesForNewEmployees();
}