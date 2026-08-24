package com.company.hrms.service.impl;

import com.company.hrms.dto.response.NextEmployeeCodeResponse;
import com.company.hrms.repository.EmployeeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeServiceImpl Next Employee Code Tests")
class EmployeeServiceImplNextCodeTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    @Test
    @DisplayName("Should return EMP-001 when database contains no employees")
    void testNextCodeWhenDatabaseIsEmpty() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(0);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-001", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return EMP-001 when max suffix is null")
    void testNextCodeWhenMaxSuffixIsNull() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(null);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-001", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return EMP-054 when max numeric suffix is 53")
    void testNextCodeWhenMaxSuffixIs53() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(53);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-054", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return EMP-066 when highest code in DB is EMP-065 regardless of pagination view")
    void testNextCodeWhenMaxSuffixIs65() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(65);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-066", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should handle 3-digit boundary transition EMP-099 -> EMP-100")
    void testThreeDigitBoundaryTransition99To100() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(99);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-100", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should handle 3-digit increment EMP-100 -> EMP-101")
    void testThreeDigitIncrement100To101() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(100);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-101", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return MAX + 1 even when sequence has gaps")
    void testNextCodeWithGapsInSequence() {
        // Gaps exist e.g. EMP-053 and EMP-055 present; DB MAX query returns 55
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(55);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-056", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should fallback gracefully to in-memory extraction if native query fails")
    void testFallbackWhenNativeQueryFails() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenThrow(new RuntimeException("Native query unsupported"));
        when(employeeRepository.findAllEmployeeCodes()).thenReturn(java.util.List.of("EMP-001", "EMP-065", "EMP-020"));

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("EMP-066", response.getEmployeeCode());
    }
}
