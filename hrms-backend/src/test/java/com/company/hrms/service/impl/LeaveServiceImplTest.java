package com.company.hrms.service.impl;

import com.company.hrms.dto.request.ApproveLeaveRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.request.UpdateLeaveRequest;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveServiceImpl Test Suite")
class LeaveServiceImplTest {

    @Mock
    private LeaveRepository leaveRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private LeaveServiceImpl leaveService;

    private Employee testEmployee;
    private LeaveType paidLeaveType;
    private LeaveType wfhLeaveType;
    private LeaveBalance leaveBalance;
    private CreateLeaveRequest createLeaveRequest;
    private UpdateLeaveRequest updateLeaveRequest;
    private ApproveLeaveRequest approveLeaveRequest;

    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setId(1L);
        testEmployee.setEmployeeCode("EMP001");
        testEmployee.setFirstName("John");
        testEmployee.setLastName("Doe");
        testEmployee.setJoiningDate(LocalDate.of(2023, 1, 1));

        paidLeaveType = new LeaveType();
        paidLeaveType.setId(1L);
        paidLeaveType.setCode("SICK");
        paidLeaveType.setName("Sick Leave");
        paidLeaveType.setDefaultDaysPerYear(12);
        paidLeaveType.setPaid(true);
        paidLeaveType.setActive(true);

        wfhLeaveType = new LeaveType();
        wfhLeaveType.setId(4L);
        wfhLeaveType.setCode("WFH");
        wfhLeaveType.setName("Work From Home");
        wfhLeaveType.setDefaultDaysPerYear(0);
        wfhLeaveType.setPaid(true);
        wfhLeaveType.setActive(true);

        leaveBalance = new LeaveBalance();
        leaveBalance.setId(1L);
        leaveBalance.setEmployee(testEmployee);
        leaveBalance.setLeaveType(paidLeaveType);
        leaveBalance.setTotalDays(BigDecimal.valueOf(12.0));
        leaveBalance.setUsedDays(BigDecimal.ZERO);
        leaveBalance.setPendingDays(BigDecimal.ZERO);
        leaveBalance.setBalanceDays(BigDecimal.valueOf(12.0));
        leaveBalance.setCarriedForwardDays(BigDecimal.ZERO);
        leaveBalance.setYear(Year.now().getValue());
        leaveBalance.setMonth(LocalDate.now().getMonthValue());

        createLeaveRequest = CreateLeaveRequest.builder()
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2024, 8, 20))
                .endDate(LocalDate.of(2024, 8, 22))
                .totalDays(3.0)
                .reason("Medical appointment")
                .build();

        updateLeaveRequest = UpdateLeaveRequest.builder()
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2024, 8, 21))
                .endDate(LocalDate.of(2024, 8, 23))
                .totalDays(3.0)
                .reason("Updated reason")
                .build();

        approveLeaveRequest = ApproveLeaveRequest.builder()
                .approved(true)
                .rejectionReason(null)
                .build();
    }

    @Test
    @DisplayName("createLeave - Successfully create leave request")
    void testCreateLeave_Success() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(paidLeaveType));
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.PENDING), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.APPROVED), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));
        when(leaveRepository.save(any(Leave.class))).thenAnswer(invocation -> {
            Leave leave = invocation.getArgument(0);
            leave.setId(1L);
            return leave;
        });
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenReturn(leaveBalance);

        LeaveResponse response = leaveService.createLeave(createLeaveRequest, 1L);

        assertNotNull(response);
        assertEquals(1L, response.getEmployeeId());
        assertEquals("SICK", response.getLeaveTypeCode());
        assertEquals(Leave.LeaveStatus.PENDING, response.getStatus());
        verify(leaveRepository, times(1)).save(any(Leave.class));
        verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
    }

    @Test
    @DisplayName("createLeave - Insufficient leave balance throws exception")
    void testCreateLeave_InsufficientBalance() {
        leaveBalance.setBalanceDays(BigDecimal.valueOf(1.0));
        createLeaveRequest.setTotalDays(3.0);

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(paidLeaveType));
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.PENDING), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.APPROVED), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            leaveService.createLeave(createLeaveRequest, 1L);
        });

        assertTrue(exception.getMessage().contains("Insufficient leave balance"));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    @DisplayName("createLeave - Overlapping leaves throws exception")
    void testCreateLeave_OverlappingLeaves() {
        Leave existingLeave = new Leave();
        existingLeave.setId(1L);

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(paidLeaveType));
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.PENDING), any(), any()))
                .thenReturn(Arrays.asList(existingLeave));
        when(leaveRepository.findOverlappingLeaves(eq(testEmployee), eq(Leave.LeaveStatus.APPROVED), any(), any()))
                .thenReturn(Collections.emptyList());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            leaveService.createLeave(createLeaveRequest, 1L);
        });

        assertEquals("Overlapping leave requests exist for the given date range", exception.getMessage());
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    @DisplayName("getEmployeeLeaveData - Successfully retrieve employee leave data")
    void testGetEmployeeLeaveData_Success() {
        Leave leave = new Leave();
        leave.setId(1L);
        leave.setEmployee(testEmployee);
        leave.setLeaveType(paidLeaveType);
        leave.setStartDate(LocalDate.of(2024, 8, 20));
        leave.setEndDate(LocalDate.of(2024, 8, 22));
        leave.setTotalDays(3.0);
        leave.setStatus(Leave.LeaveStatus.PENDING);

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(leaveTypeRepository.findAll()).thenReturn(Arrays.asList(paidLeaveType, wfhLeaveType));
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));
        when(leaveRepository.findByEmployeeId(1L)).thenReturn(Arrays.asList(leave));

        EmployeeLeaveDataResponse response = leaveService.getEmployeeLeaveData(1L, 2024, 8, false);

        assertNotNull(response);
        assertEquals(1L, response.getEmployeeId());
        assertEquals("John Doe", response.getEmployeeName());
        assertEquals(2, response.getLeaveBalances().size());
        assertEquals(1, response.getLeaves().size());
    }

    @Test
    @DisplayName("updateLeave - Successfully update pending leave")
    void testUpdateLeave_Success() {
        Leave existingLeave = new Leave();
        existingLeave.setId(1L);
        existingLeave.setEmployee(testEmployee);
        existingLeave.setLeaveType(paidLeaveType);
        existingLeave.setStatus(Leave.LeaveStatus.PENDING);

        when(leaveRepository.findByIdAndEmployeeId(1L, 1L)).thenReturn(Optional.of(existingLeave));
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(paidLeaveType));
        when(leaveRepository.save(any(Leave.class))).thenReturn(existingLeave);

        LeaveResponse response = leaveService.updateLeave(1L, updateLeaveRequest, 1L);

        assertNotNull(response);
        verify(leaveRepository, times(1)).save(any(Leave.class));
    }

    @Test
    @DisplayName("updateLeave - Cannot update leave to start date before DOJ")
    void testUpdateLeave_StartDateBeforeDoj() {
        Leave existingLeave = new Leave();
        existingLeave.setId(1L);
        existingLeave.setEmployee(testEmployee);
        existingLeave.setStatus(Leave.LeaveStatus.PENDING);
        existingLeave.setStartDate(LocalDate.of(2024, 8, 20));
        existingLeave.setEndDate(LocalDate.of(2024, 8, 22));

        updateLeaveRequest.setStartDate(LocalDate.of(2022, 8, 20)); // Before DOJ (2023-01-01)
        updateLeaveRequest.setEndDate(LocalDate.of(2024, 8, 22));
        updateLeaveRequest.setLeaveTypeId(null); // Don't change leave type

        when(leaveRepository.findByIdAndEmployeeId(1L, 1L)).thenReturn(Optional.of(existingLeave));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            leaveService.updateLeave(1L, updateLeaveRequest, 1L);
        });

        assertNotNull(exception);
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    @DisplayName("cancelLeave - Successfully cancel pending leave")
    void testCancelLeave_PendingLeave() {
        Leave pendingLeave = new Leave();
        pendingLeave.setId(1L);
        pendingLeave.setEmployee(testEmployee);
        pendingLeave.setLeaveType(paidLeaveType);
        pendingLeave.setTotalDays(3.0);
        pendingLeave.setStatus(Leave.LeaveStatus.PENDING);

        when(leaveRepository.findByIdAndEmployeeId(1L, 1L)).thenReturn(Optional.of(pendingLeave));
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));
        when(leaveRepository.save(any(Leave.class))).thenReturn(pendingLeave);
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenReturn(leaveBalance);

        leaveService.cancelLeave(1L, 1L);

        verify(leaveRepository, times(1)).save(any(Leave.class));
        verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
        assertEquals(Leave.LeaveStatus.CANCELLED, pendingLeave.getStatus());
    }

    @Test
    @DisplayName("approveLeave - Successfully approve leave")
    void testApproveLeave_Success() {
        Leave pendingLeave = new Leave();
        pendingLeave.setId(1L);
        pendingLeave.setEmployee(testEmployee);
        pendingLeave.setLeaveType(paidLeaveType);
        pendingLeave.setTotalDays(3.0);
        pendingLeave.setStatus(Leave.LeaveStatus.PENDING);

        Employee approver = new Employee();
        approver.setId(2L);
        approver.setFirstName("Admin");
        approver.setLastName("User");

        when(leaveRepository.findById(1L)).thenReturn(Optional.of(pendingLeave));
        when(employeeRepository.findById(2L)).thenReturn(Optional.of(approver));
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));
        when(leaveRepository.save(any(Leave.class))).thenReturn(pendingLeave);
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenReturn(leaveBalance);

        LeaveResponse response = leaveService.approveLeave(1L, approveLeaveRequest, 2L);

        assertNotNull(response);
        assertEquals(Leave.LeaveStatus.APPROVED, response.getStatus());
        assertEquals(2L, response.getApprovedBy());
        assertNotNull(response.getApprovedAt());
        verify(leaveRepository, times(1)).save(any(Leave.class));
        verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
    }

    @Test
    @DisplayName("approveLeave - Successfully reject leave")
    void testApproveLeave_Reject() {
        approveLeaveRequest.setApproved(false);
        approveLeaveRequest.setRejectionReason("Insufficient balance");

        Leave pendingLeave = new Leave();
        pendingLeave.setId(1L);
        pendingLeave.setEmployee(testEmployee);
        pendingLeave.setLeaveType(paidLeaveType);
        pendingLeave.setTotalDays(3.0);
        pendingLeave.setStatus(Leave.LeaveStatus.PENDING);

        Employee approver = new Employee();
        approver.setId(2L);

        when(leaveRepository.findById(1L)).thenReturn(Optional.of(pendingLeave));
        when(employeeRepository.findById(2L)).thenReturn(Optional.of(approver));
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), any(), any()))
                .thenReturn(Optional.of(leaveBalance));
        when(leaveRepository.save(any(Leave.class))).thenReturn(pendingLeave);
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenReturn(leaveBalance);

        LeaveResponse response = leaveService.approveLeave(1L, approveLeaveRequest, 2L);

        assertNotNull(response);
        assertEquals(Leave.LeaveStatus.REJECTED, response.getStatus());
        assertEquals("Insufficient balance", response.getRejectionReason());
        verify(leaveRepository, times(1)).save(any(Leave.class));
        verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
    }

    @Test
    @DisplayName("getPendingApprovals - Successfully retrieve pending approvals")
    void testGetPendingApprovals_Success() {
        Leave pendingLeave = new Leave();
        pendingLeave.setId(1L);
        pendingLeave.setEmployee(testEmployee);
        pendingLeave.setLeaveType(paidLeaveType);
        pendingLeave.setStatus(Leave.LeaveStatus.PENDING);

        when(leaveRepository.findByStatusIn(anyList())).thenReturn(Arrays.asList(pendingLeave));

        List<LeaveResponse> responses = leaveService.getPendingApprovals(2L);

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals(Leave.LeaveStatus.PENDING, responses.get(0).getStatus());
        verify(leaveRepository, times(1)).findByStatusIn(anyList());
    }

    @Test
    @DisplayName("getAllLeaveTypes - Successfully retrieve all active leave types")
    void testGetAllLeaveTypes_Success() {
        LeaveType inactiveType = new LeaveType();
        inactiveType.setId(6L);
        inactiveType.setCode("OLD");
        inactiveType.setName("Old Leave Type");
        inactiveType.setActive(false);

        when(leaveTypeRepository.findAll()).thenReturn(Arrays.asList(paidLeaveType, inactiveType, wfhLeaveType));

        List<LeaveTypeResponse> responses = leaveService.getAllLeaveTypes();

        assertNotNull(responses);
        assertEquals(2, responses.size()); // Only active types
        assertTrue(responses.stream().allMatch(LeaveTypeResponse::getActive));
        verify(leaveTypeRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("getAvailableLeaveTypesForEmployee - Eligible employee gets all leave types")
    void testGetAvailableLeaveTypesForEmployee_Eligible() {
        testEmployee.setJoiningDate(LocalDate.now().minusYears(1));

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(leaveTypeRepository.findAll()).thenReturn(Arrays.asList(paidLeaveType, wfhLeaveType));

        List<LeaveTypeResponse> responses = leaveService.getAvailableLeaveTypesForEmployee(1L);

        assertNotNull(responses);
        assertEquals(2, responses.size());
        assertTrue(responses.stream().allMatch(LeaveTypeResponse::getActive));
        verify(employeeRepository, times(1)).findById(1L);
    }
}