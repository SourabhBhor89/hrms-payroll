-- Performance Indexes for HRMS Database

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendances(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendances(status);

-- Attendance Regularization indexes
CREATE INDEX IF NOT EXISTS idx_regularization_attendance_status ON attendance_regularizations(attendance_id, status);
CREATE INDEX IF NOT EXISTS idx_regularization_employee_status ON attendance_regularizations(employee_id, status);

-- Leave indexes
CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON leaves(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leave_balance_emp_year_month ON leave_balances(employee_id, year, month);
