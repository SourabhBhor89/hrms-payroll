package com.company.hrms.controller;

import com.company.hrms.dto.response.EmployeeLeaveWfhSummaryDto;
import com.company.hrms.dto.response.EmployeeSearchResultDto;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.service.LeaveBalanceSchedulerService;
import com.company.hrms.service.LeaveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveController Security & Method Authorization Test Suite")
class LeaveControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private LeaveService leaveService;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveBalanceSchedulerService leaveBalanceSchedulerService;

    @InjectMocks
    private LeaveController leaveController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(leaveController).build();
    }

    @Test
    @DisplayName("Verify @PreAuthorize('hasAuthority(\"EMPLOYEE_LEAVE_WFH_VIEW\")') annotation on searchEmployees endpoint")
    void testSearchEmployees_PreAuthorizeAnnotation() throws Exception {
        Method method = LeaveController.class.getMethod("searchEmployees", String.class);
        assertTrue(method.isAnnotationPresent(PreAuthorize.class));
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertEquals("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')", annotation.value());
    }

    @Test
    @DisplayName("Verify @PreAuthorize('hasAuthority(\"EMPLOYEE_LEAVE_WFH_VIEW\")') annotation on getEmployeeLeaveWfhSummary endpoint")
    void testGetSummary_PreAuthorizeAnnotation() throws Exception {
        Method method = LeaveController.class.getMethod("getEmployeeLeaveWfhSummary", Long.class, Integer.class, Integer.class);
        assertTrue(method.isAnnotationPresent(PreAuthorize.class));
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertEquals("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')", annotation.value());
    }

    @Test
    @DisplayName("Verify @PreAuthorize('hasAuthority(\"EMPLOYEE_LEAVE_WFH_VIEW\")') annotation on updateEmployeeDayStatus endpoint")
    void testUpdateEmployeeDayStatus_PreAuthorizeAnnotation() throws Exception {
        Method method = LeaveController.class.getMethod("updateEmployeeDayStatus", com.company.hrms.dto.request.UpdateEmployeeDayStatusRequest.class);
        assertTrue(method.isAnnotationPresent(PreAuthorize.class));
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertEquals("hasAuthority('EMPLOYEE_LEAVE_WFH_VIEW')", annotation.value());
    }

    @Test
    @DisplayName("searchEmployees endpoint returns HTTP 200 OK with results")
    void testSearchEmployees_Success() throws Exception {
        when(leaveService.searchEmployees(anyString())).thenReturn(Collections.singletonList(
                EmployeeSearchResultDto.builder().id(1L).employeeCode("EMP001").name("John Doe").build()
        ));

        mockMvc.perform(get("/api/v1/leaves/employee-search?query=John"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("getEmployeeLeaveWfhSummary endpoint returns HTTP 200 OK with summary payload")
    void testGetSummary_Success() throws Exception {
        EmployeeLeaveWfhSummaryDto summaryDto = EmployeeLeaveWfhSummaryDto.builder()
                .employeeId(1L)
                .employeeCode("EMP001")
                .employeeName("Test User")
                .calendarEntries(Collections.emptyList())
                .leaveTypeSummaries(Collections.emptyList())
                .build();

        when(leaveService.getEmployeeLeaveWfhSummary(eq(1L), anyInt(), anyInt())).thenReturn(summaryDto);

        mockMvc.perform(get("/api/v1/leaves/employee-summary/1?year=2026&month=8"))
                .andExpect(status().isOk());
    }
}
