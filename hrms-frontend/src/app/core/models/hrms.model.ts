export type UserRole = 'Admin' | 'HR Manager' | 'Team Lead' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
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
  leaveBalance: {
    casual: number;
    sick: number;
    paid: number;
    wfh: number;
  };
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'WFH' | 'Holiday' | 'Leave';

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
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Paid Leave' | 'Work From Home';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  managerNotes?: string;
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

export type RegularizationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  date: string; // YYYY-MM-DD
  checkIn: string;
  checkOut: string;
  reason: string;
  status: RegularizationStatus;
  appliedOn: string;
  notes?: string;
}

