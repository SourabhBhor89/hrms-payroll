package com.company.hrms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBenchStatusRequest {

    @NotBlank(message = "Bench status is required")
    @Pattern(regexp = "^(YES|NO)$", message = "Bench status must be either 'YES' or 'NO'")
    private String benchStatus;
}
