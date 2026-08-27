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
    @DisplayName("Should return TRHPL-001 when database contains no employees")
    void testNextCodeWhenDatabaseIsEmpty() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(0);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-001", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return TRHPL-001 when max suffix is null")
    void testNextCodeWhenMaxSuffixIsNull() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(null);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-001", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return TRHPL-054 when max numeric suffix is 53")
    void testNextCodeWhenMaxSuffixIs53() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(53);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-054", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return TRHPL-066 when highest code in DB is TRHPL-065 regardless of pagination view")
    void testNextCodeWhenMaxSuffixIs65() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(65);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-066", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should handle 3-digit boundary transition TRHPL-099 -> TRHPL-100")
    void testThreeDigitBoundaryTransition99To100() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(99);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-100", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should handle 3-digit increment TRHPL-100 -> TRHPL-101")
    void testThreeDigitIncrement100To101() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(100);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-101", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should return MAX + 1 even when sequence has gaps")
    void testNextCodeWithGapsInSequence() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenReturn(55);

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-056", response.getEmployeeCode());
    }

    @Test
    @DisplayName("Should fallback gracefully to in-memory extraction if native query fails")
    void testFallbackWhenNativeQueryFails() {
        when(employeeRepository.findMaxEmployeeCodeNumericSuffix()).thenThrow(new RuntimeException("Native query unsupported"));
        when(employeeRepository.findAllEmployeeCodes()).thenReturn(java.util.List.of("TRHPL-001", "TRHPL-065", "TRHPL-020"));

        NextEmployeeCodeResponse response = employeeService.getNextEmployeeCode();

        assertNotNull(response);
        assertEquals("TRHPL-066", response.getEmployeeCode());
    }
}
