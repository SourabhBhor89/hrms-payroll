package com.company.hrms.service;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
import com.company.hrms.dto.response.EmployeeLeaveDataResponse;
import com.company.hrms.dto.response.EmployeeLeaveWfhSummaryDto;
import com.company.hrms.dto.response.EmployeeSearchResultDto;
import com.company.hrms.dto.response.LeaveResponse;
import com.company.hrms.dto.response.LeaveTypeResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface LeaveService {

    // Leave CRUD operations
    LeaveResponse createLeave(CreateLeaveRequest request, Long employeeId);

    EmployeeLeaveDataResponse getEmployeeLeaveData(Long employeeId, Integer year, Integer month);

    EmployeeLeaveDataResponse getEmployeeLeaveData(Long employeeId, Integer year, Integer month, boolean isAdminOrHr);

    EmployeeLeaveWfhSummaryDto getEmployeeLeaveWfhSummary(Long employeeId, Integer year, Integer month);

    List<EmployeeSearchResultDto> searchEmployees(String query);

    void updateEmployeeDayStatus(com.company.hrms.dto.request.UpdateEmployeeDayStatusRequest request);

    LeaveResponse updateLeave(Long id, UpdateLeaveRequest request, Long employeeId);

    void cancelLeave(Long id, Long employeeId);

    // Leave approval operations
    LeaveResponse approveLeave(Long id, ApproveLeaveRequest request, Long approverId);

    List<LeaveResponse> getPendingApprovals(Long approverId);

    List<LeaveResponse> getPendingApprovals(Long approverId, Pageable pageable);

    // Leave Type operations (Read-only)
    List<LeaveTypeResponse> getAllLeaveTypes();

    List<LeaveTypeResponse> getAvailableLeaveTypesForEmployee(Long employeeId);
}