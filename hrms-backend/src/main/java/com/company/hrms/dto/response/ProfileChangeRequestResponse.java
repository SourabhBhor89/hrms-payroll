package com.company.hrms.dto.response;

import com.company.hrms.entity.EmployeeProfileChangeRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileChangeRequestResponse {

    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String fieldType;
    private String oldValue;
    private String newValue;
    private String reason;
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewedByName;
    private String reviewRemarks;

    public static ProfileChangeRequestResponse fromEntity(EmployeeProfileChangeRequest request) {
        return ProfileChangeRequestResponse.builder()
                .id(request.getId())
                .employeeId(request.getEmployee() != null ? request.getEmployee().getId() : null)
                .employeeCode(request.getEmployee() != null ? request.getEmployee().getEmployeeCode() : null)
                .employeeName(request.getEmployee() != null ? 
                    request.getEmployee().getFirstName() + " " + request.getEmployee().getLastName() : null)
                .fieldType(request.getFieldType())
                .oldValue(request.getOldValue())
                .newValue(request.getNewValue())
                .reason(request.getReason())
                .status(request.getStatus() != null ? request.getStatus().name() : null)
                .submittedAt(request.getSubmittedAt())
                .reviewedAt(request.getReviewedAt())
                .reviewedByName(request.getReviewedBy() != null ? 
                    request.getReviewedBy().getFirstName() + " " + request.getReviewedBy().getLastName() : null)
                .reviewRemarks(request.getReviewRemarks())
                .build();
    }
}
