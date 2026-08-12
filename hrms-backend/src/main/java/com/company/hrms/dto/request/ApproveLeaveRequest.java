package com.company.hrms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveLeaveRequest {

    @NotNull(message = "Action is required")
    private Boolean approved;

    private String rejectionReason;
}