package com.company.hrms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProfileChangeRequest {

    @NotNull(message = "Field type is required")
    private String fieldType; // PHONE, ADDRESS, CURRENT_ADDRESS, PERMANENT_ADDRESS

    @NotBlank(message = "New value is required")
    private String newValue;

    private String reason;
}
