package com.company.hrms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "leave_balances")
@Getter
@Setter
@NoArgsConstructor
public class LeaveBalance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDays;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal usedDays = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal pendingDays = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal balanceDays;

    @Column(name = "carried_forward_days", nullable = false, precision = 10, scale = 2)
    private BigDecimal carriedForwardDays = BigDecimal.ZERO;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "month", nullable = false)
    private Integer month;
}