package com.company.hrms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class CreateRegularizationRequest {

    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    private String correctionType = "BOTH"; // CLOCK_IN, CLOCK_OUT, BOTH

    @NotNull(message = "Requested clock in time is required")
    private LocalDateTime requestedClockIn;

    @NotNull(message = "Requested clock out time is required")
    private LocalDateTime requestedClockOut;

    @NotBlank(message = "Reason for regularization is required")
    private String reason;

    private String attachmentUrl;
}
