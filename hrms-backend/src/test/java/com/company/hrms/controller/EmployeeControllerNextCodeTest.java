package com.company.hrms.controller;

import com.company.hrms.dto.response.NextEmployeeCodeResponse;
import com.company.hrms.service.EmployeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeController Next Employee Code Endpoint Test Suite")
class EmployeeControllerNextCodeTest {

    private MockMvc mockMvc;

    @Mock
    private EmployeeService employeeService;

    @InjectMocks
    private EmployeeController employeeController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(employeeController).build();
    }

    @Test
    @DisplayName("GET /api/v1/employees/next-code should return 200 OK with expected next employee code")
    void testGetNextEmployeeCodeEndpoint() throws Exception {
        when(employeeService.getNextEmployeeCode()).thenReturn(new NextEmployeeCodeResponse("EMP-066"));

        mockMvc.perform(get("/api/v1/employees/next-code")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeCode").value("EMP-066"));
    }
}
