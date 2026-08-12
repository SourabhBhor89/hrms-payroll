package com.company.hrms.repository;

import com.company.hrms.entity.Employee;
import com.company.hrms.entity.LeaveBalance;
import com.company.hrms.entity.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {

    Optional<LeaveBalance> findByEmployeeIdAndLeaveTypeIdAndYearAndMonth(Long employeeId, Long leaveTypeId, Integer year, Integer month);

    Optional<LeaveBalance> findByEmployeeAndLeaveTypeAndYearAndMonth(Employee employee, LeaveType leaveType, Integer year, Integer month);
}