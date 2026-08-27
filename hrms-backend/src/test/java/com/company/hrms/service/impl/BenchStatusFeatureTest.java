package com.company.hrms.service.impl;

import com.company.hrms.dto.request.CreateEmployeeRequest;
import com.company.hrms.dto.request.CreateLeaveRequest;
import com.company.hrms.dto.response.EmployeeDto;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.LeaveType;
import com.company.hrms.entity.Role;
import com.company.hrms.entity.RoleName;
import com.company.hrms.entity.User;
import com.company.hrms.repository.AttendanceRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.repository.LeaveBalanceRepository;
import com.company.hrms.repository.LeaveRepository;
import com.company.hrms.repository.LeaveTypeRepository;
import com.company.hrms.repository.RoleRepository;
import com.company.hrms.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Bench Status Feature Unit & Integration Test Suite")
class BenchStatusFeatureTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private com.company.hrms.service.Mail_Service.Mail_Sender_Service mailSenderService;

    @Mock
    private LeaveRepository leaveRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private com.company.hrms.service.Google_Calendar_Service.GoogleCalendarService googleCalendarService;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    @InjectMocks
    private LeaveServiceImpl leaveService;

    private Employee mockEmployee;
    private User mockUser;
    private LeaveType wfhLeaveType;
    private LeaveType casualLeaveType;

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setId(1L);
        role.setName(RoleName.EMPLOYEE);

        mockUser = new User();
        mockUser.setId(10L);
        mockUser.setEmail("bench.test@example.com");
        mockUser.setRole(role);

        mockEmployee = new Employee();
        mockEmployee.setId(1L);
        mockEmployee.setUser(mockUser);
        mockEmployee.setEmployeeCode("EMP-999");
        mockEmployee.setFirstName("John");
        mockEmployee.setLastName("Doe");
        mockEmployee.setBenchStatus("NO");

        wfhLeaveType = new LeaveType();
        wfhLeaveType.setId(100L);
        wfhLeaveType.setCode("WFH");
        wfhLeaveType.setName("Work From Home");
        wfhLeaveType.setDefaultDaysPerYear(0);
        wfhLeaveType.setPaid(false);

        casualLeaveType = new LeaveType();
        casualLeaveType.setId(101L);
        casualLeaveType.setCode("CASUAL");
        casualLeaveType.setName("Casual Leave");
        casualLeaveType.setDefaultDaysPerYear(12);
        casualLeaveType.setPaid(true);
    }

    @Test
    @DisplayName("updateBenchStatus - Successfully updates status to YES")
    void testUpdateBenchStatusToYes() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto result = employeeService.updateBenchStatus(1L, "YES", "admin@company.com");

        assertNotNull(result);
        assertEquals("YES", result.getBenchStatus());
        assertEquals("YES", mockEmployee.getBenchStatus());
        assertEquals("admin@company.com", mockEmployee.getUpdatedBy());
        verify(employeeRepository).save(mockEmployee);
    }

    @Test
    @DisplayName("updateBenchStatus - Successfully updates status to NO")
    void testUpdateBenchStatusToNo() {
        mockEmployee.setBenchStatus("YES");
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto result = employeeService.updateBenchStatus(1L, "NO", "manager@company.com");

        assertNotNull(result);
        assertEquals("NO", result.getBenchStatus());
        assertEquals("NO", mockEmployee.getBenchStatus());
        verify(employeeRepository).save(mockEmployee);
    }

    @Test
    @DisplayName("updateBenchStatus - Throws IllegalArgumentException for invalid status string")
    void testUpdateBenchStatusInvalid() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                employeeService.updateBenchStatus(1L, "INVALID_STATUS", "admin@company.com")
        );

        assertTrue(ex.getMessage().contains("Bench status must be either 'YES' or 'NO'"));
    }

    @Test
    @DisplayName("createEmployee - Defaults benchStatus to NO when omitted in request")
    void testCreateEmployeeDefaultBenchStatus() {
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setEmployeeCode("EMP-888");
        request.setFirstName("Jane");
        request.setEmail("jane.test@example.com");
        request.setRole("EMPLOYEE");
        request.setTenthQualification("10th Pass");
        request.setTwelfthQualification("12th Pass");
        request.setBachelorQualification("B.Tech");

        Role role = new Role();
        role.setId(1L);
        role.setName(RoleName.EMPLOYEE);

        when(employeeRepository.existsByEmployeeCode("EMP-888")).thenReturn(false);
        when(userRepository.existsByEmail("jane.test@example.com")).thenReturn(false);
        when(roleRepository.findByName(RoleName.EMPLOYEE)).thenReturn(Optional.of(role));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto result = employeeService.createEmployee(request);

        assertNotNull(result);
        assertEquals("NO", result.getBenchStatus());
    }

    @Test
    @DisplayName("createLeave - Bench Employee (bench_status = YES) rejected when applying for WFH")
    void testCreateLeaveWfhRejectedForBenchEmployee() {
        CreateLeaveRequest request = new CreateLeaveRequest();
        request.setLeaveTypeId(100L);
        request.setStartDate(LocalDate.now().plusDays(1));
        request.setEndDate(LocalDate.now().plusDays(2));
        request.setReason("Need WFH for focus work");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(leaveTypeRepository.findById(100L)).thenReturn(Optional.of(wfhLeaveType));
        when(employeeRepository.findBenchStatusByEmployeeId(1L)).thenReturn(Optional.of("YES"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                leaveService.createLeave(request, 1L)
        );

        assertEquals("Employees currently on Bench are not eligible to apply for Work From Home (WFH).", ex.getMessage());
    }

    @Test
    @DisplayName("createLeave - Project Employee (bench_status = NO) allowed when applying for WFH")
    void testCreateLeaveWfhAllowedForProjectEmployee() {
        CreateLeaveRequest request = new CreateLeaveRequest();
        request.setLeaveTypeId(100L);
        request.setStartDate(LocalDate.now().plusDays(1));
        request.setEndDate(LocalDate.now().plusDays(2));
        request.setReason("WFH for project work");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(leaveTypeRepository.findById(100L)).thenReturn(Optional.of(wfhLeaveType));
        when(employeeRepository.findBenchStatusByEmployeeId(1L)).thenReturn(Optional.of("NO"));
        when(leaveRepository.findOverlappingLeaves(any(), any(), any(), any())).thenReturn(new java.util.ArrayList<>());
        when(leaveBalanceRepository.findByEmployeeAndLeaveTypeAndYearAndMonth(any(), any(), anyInt(), anyInt()))
                .thenReturn(Optional.empty());
        when(leaveRepository.save(any())).thenAnswer(i -> {
            com.company.hrms.entity.Leave l = i.getArgument(0);
            l.setId(99L);
            return l;
        });

        assertDoesNotThrow(() -> leaveService.createLeave(request, 1L));
    }
}
