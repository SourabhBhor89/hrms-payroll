package com.company.hrms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_regularizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRegularization extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attendance_id", nullable = false)
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "correction_type", nullable = false, length = 50)
    private String correctionType = "BOTH"; // CLOCK_IN, CLOCK_OUT, BOTH

    @Column(name = "original_clock_in")
    private LocalDateTime originalClockIn;

    @Column(name = "original_clock_out")
    private LocalDateTime originalClockOut;

    @Column(name = "requested_clock_in", nullable = false)
    private LocalDateTime requestedClockIn;

    @Column(name = "requested_clock_out", nullable = false)
    private LocalDateTime requestedClockOut;

    @Column(name = "original_working_hours")
    private Double originalWorkingHours = 0.0;

    @Column(name = "requested_working_hours")
    private Double requestedWorkingHours = 0.0;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RegularizationStatus status = RegularizationStatus.PENDING;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "reviewed_by", length = 255)
    private String reviewedBy;

    @Column(name = "review_remarks", length = 500)
    private String reviewRemarks;
}
