package com.company.hrms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_profile_change_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeProfileChangeRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "field_type", nullable = false, length = 50)
    private String fieldType; // PHONE, ADDRESS, CURRENT_ADDRESS, PERMANENT_ADDRESS

    @Column(name = "old_value", length = 500)
    private String oldValue;

    @Column(name = "new_value", length = 500)
    private String newValue;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ProfileChangeStatus status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private Employee reviewedBy;

    @Column(name = "review_remarks", length = 500)
    private String reviewRemarks;

    public enum ProfileChangeStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }
}
