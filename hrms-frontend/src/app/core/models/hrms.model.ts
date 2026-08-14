export type UserRole = 'Admin' | 'HR Manager' | 'Team Lead' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar: string;
  department: string;
  designation: string;
  employeeId: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: 'Engineering' | 'Human Resources' | 'Design' | 'Marketing' | 'Sales' | 'Finance';
  designation: string;
  joinDate: string;
  dateOfBirth?: string;
  status: 'Active' | 'On Leave' | 'Remote' | 'Terminated';
  avatar: string;
  salary: number;
  location: string;
  address?: string;
  isFresher?: boolean;
  totalExperience?: string;
  previousCompany?: string;
  previousDesignation?: string;
  previousSalary?: string;
  currentSalary?: string;
  techStack?: string;
  education?: string;
  emergencyContact1?: string;
  emergencyContact2?: string;
  photoUrl?: string;
  hasGap?: boolean;
  gapReason?: string;
  referenceDetails?: string;
  currentAddress?: string;
  permanentAddress?: string;
  maritalStatus?: string;
  marriageDate?: string;
  leaveBalance: {
    casual: number;
    sick: number;
    paid: number;
    wfh: number;
  };
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'WFH' | 'Holiday' | 'Leave' | 'Week Off';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar: string;
  date: string; // YYYY-MM-DD
  clockIn: string;
  clockOut: string;
  totalHours: string;
  status: AttendanceStatus;
  notes?: string;
  isLocked?: boolean;
  regularizationStatus?: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
}

export type LeaveType = string;
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveTypeItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  defaultDaysPerYear?: number;
  isPaid?: boolean;
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;
  eligible?: boolean; // Added for eligibility check based on tenure
}

export interface EmployeeLeaveBalanceDetail {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  totalDays: number | string;  // Handle BigDecimal serialization
  usedDays: number | string;
  pendingDays: number | string;
  balanceDays: number | string;
  carriedForwardDays: number | string;
  paid: boolean | Boolean;  // Handle Java Boolean vs boolean
}

export interface LeaveRequest {
  id: string | number;
  employeeId?: string | number;
  employeeName?: string;
  employeeCode?: string;
  employeeAvatar?: string;
  department?: string;
  leaveTypeId?: number;
  leaveType?: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedOn?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string | number;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  managerNotes?: string;
}

export interface CreateLeavePayload {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
}

export interface UpdateLeavePayload {
  leaveTypeId?: number;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  reason?: string;
  attachmentUrl?: string;
}

export interface ApproveLeavePayload {
  approved: boolean;
  rejectionReason?: string;
}


export type HolidayType = 'Mandatory' | 'Optional' | 'Regional';

export interface Holiday {
  id: string;
  title: string;
  date: string;
  day: string;
  type: HolidayType;
  description: string;
  isUpcoming: boolean;
}

export interface TimesheetEntry {
  id: string;
  project: string;
  task: string;
  hours: {
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
  };
}

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  weekStartDate: string;
  weekEndDate: string;
  status: TimesheetStatus;
  totalHours: number;
  entries: TimesheetEntry[];
  submittedOn?: string;
  approvedBy?: string;
}

export type RegularizationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface RegularizationRequest {
  id: string;
  attendanceId?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  employeeAvatar: string;
  department?: string;
  date: string; // YYYY-MM-DD
  correctionType?: 'CLOCK_IN' | 'CLOCK_OUT' | 'BOTH';
  originalClockIn?: string;
  originalClockOut?: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  checkIn: string;
  checkOut: string;
  originalWorkingHours?: number;
  requestedWorkingHours?: number;
  reason: string;
  attachmentUrl?: string;
  status: RegularizationStatus;
  appliedOn: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  reviewedBy?: string;
  reviewRemarks?: string;
  notes?: string;
}

