package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionResponseDto {

    private Long id;
    private String name;
    private String description;
    private Long assignedBy;
    private LocalDateTime assignedAt;
    private Boolean isActive;
}
