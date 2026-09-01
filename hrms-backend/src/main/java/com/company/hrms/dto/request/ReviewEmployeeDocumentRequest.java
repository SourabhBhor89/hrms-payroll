package com.company.hrms.dto.request;

import com.company.hrms.entity.EmployeeDocumentStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewEmployeeDocumentRequest {

    @NotNull
    private EmployeeDocumentStatus status;

    private String reason;
}
