import { Injectable, signal, computed } from '@angular/core';
import { 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  Holiday, 
  Timesheet,
  LeaveType,
  TimesheetEntry,
  RegularizationRequest
} from '../models/hrms.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsService {
  // State Signals
  employees = signal<Employee[]>([
    {
      id: 'emp-1',
      employeeId: 'EMP-001',
      name: 'Alexandra Vance',
      email: 'alexandra.vance@hrms.io',
      phone: '+1 (555) 234-5678',
      role: 'Admin',
      department: 'Engineering',
      designation: 'Chief Technology Officer',
      joinDate: '2021-03-15',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      salary: 165000,
      location: 'San Francisco, CA',
      leaveBalance: { casual: 10, sick: 7, paid: 15, wfh: 8 }
    },
    {
      id: 'emp-2',
      employeeId: 'EMP-002',
      name: 'Marcus Chen',
      email: 'marcus.chen@hrms.io',
      phone: '+1 (555) 876-5432',
      role: 'Team Lead',
      department: 'Engineering',
      designation: 'Lead Frontend Engineer',
      joinDate: '2022-01-10',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      salary: 135000,
      location: 'Austin, TX',
      leaveBalance: { casual: 8, sick: 5, paid: 12, wfh: 6 }
    },
    {
      id: 'emp-3',
      employeeId: 'EMP-003',
      name: 'Elena Rostova',
      email: 'elena.rostova@hrms.io',
      phone: '+1 (555) 345-6789',
      role: 'Employee',
      department: 'Design',
      designation: 'Senior Product Designer',
      joinDate: '2022-06-01',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      salary: 110000,
      location: 'New York, NY',
      leaveBalance: { casual: 6, sick: 4, paid: 10, wfh: 10 }
    },
    {
      id: 'emp-4',
      employeeId: 'EMP-004',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@hrms.io',
      phone: '+1 (555) 987-6543',
      role: 'HR Manager',
      department: 'Human Resources',
      designation: 'Head of People Operations',
      joinDate: '2020-11-20',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      salary: 125000,
      location: 'Seattle, WA',
      leaveBalance: { casual: 12, sick: 7, paid: 18, wfh: 5 }
    },
    {
      id: 'emp-5',
      employeeId: 'EMP-005',
      name: 'David Kim',
      email: 'david.kim@hrms.io',
      phone: '+1 (555) 456-7890',
      role: 'Employee',
      department: 'Marketing',
      designation: 'Growth Marketing Manager',
      joinDate: '2023-02-14',
      status: 'Remote',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      salary: 95000,
      location: 'Chicago, IL',
      leaveBalance: { casual: 7, sick: 6, paid: 11, wfh: 12 }
    },
    {
      id: 'emp-6',
      employeeId: 'EMP-006',
      name: 'Sophia Patel',
      email: 'sophia.patel@hrms.io',
      phone: '+1 (555) 567-8901',
      role: 'Employee',
      department: 'Finance',
      designation: 'Senior Financial Analyst',
      joinDate: '2022-09-01',
      status: 'On Leave',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      salary: 105000,
      location: 'Boston, MA',
      leaveBalance: { casual: 3, sick: 2, paid: 5, wfh: 4 }
    }
  ]);

  attendanceRecords = signal<AttendanceRecord[]>([
    {
      id: 'att-1',
      employeeId: 'EMP-001',
      employeeName: 'Alexandra Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-06',
      clockIn: '08:45 AM',
      clockOut: '05:30 PM',
      totalHours: '8h 45m',
      status: 'Present',
      notes: 'On time'
    },
    {
      id: 'att-2',
      employeeId: 'EMP-002',
      employeeName: 'Marcus Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-06',
      clockIn: '09:05 AM',
      clockOut: '--',
      totalHours: 'In Progress',
      status: 'Present',
      notes: 'Logged in from Austin'
    },
    {
      id: 'att-3',
      employeeId: 'EMP-003',
      employeeName: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-06',
      clockIn: '09:15 AM',
      clockOut: '--',
      totalHours: 'In Progress',
      status: 'WFH',
      notes: 'Approved remote session'
    },
    {
      id: 'att-4',
      employeeId: 'EMP-004',
      employeeName: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-06',
      clockIn: '08:30 AM',
      clockOut: '05:15 PM',
      totalHours: '8h 45m',
      status: 'Present'
    },
    {
      id: 'att-5',
      employeeId: 'EMP-006',
      employeeName: 'Sophia Patel',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-06',
      clockIn: '--',
      clockOut: '--',
      totalHours: '0h',
      status: 'Leave',
      notes: 'Approved Annual Leave'
    }
  ]);

  leaveRequests = signal<LeaveRequest[]>([
    {
      id: 'lv-101',
      employeeId: 'EMP-003',
      employeeName: 'Elena Rostova',
      employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      department: 'Design',
      leaveType: 'Casual Leave',
      startDate: '2026-08-12',
      endDate: '2026-08-14',
      totalDays: 3,
      reason: 'Family event and personal work in New York.',
      status: 'Pending',
      appliedOn: '2026-08-04'
    },
    {
      id: 'lv-102',
      employeeId: 'EMP-005',
      employeeName: 'David Kim',
      employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      department: 'Marketing',
      leaveType: 'Work From Home',
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      totalDays: 2,
      reason: 'Home renovation internet maintenance.',
      status: 'Pending',
      appliedOn: '2026-08-05'
    },
    {
      id: 'lv-103',
      employeeId: 'EMP-006',
      employeeName: 'Sophia Patel',
      employeeAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      department: 'Finance',
      leaveType: 'Paid Leave',
      startDate: '2026-08-05',
      endDate: '2026-08-07',
      totalDays: 3,
      reason: 'Annual medical wellness checkups.',
      status: 'Approved',
      appliedOn: '2026-07-28',
      managerNotes: 'Approved by HR Operations.'
    },
    {
      id: 'lv-104',
      employeeId: 'EMP-002',
      employeeName: 'Marcus Chen',
      employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      department: 'Engineering',
      leaveType: 'Sick Leave',
      startDate: '2026-07-20',
      endDate: '2026-07-21',
      totalDays: 2,
      reason: 'Fever and viral flu recovery.',
      status: 'Approved',
      appliedOn: '2026-07-19',
      managerNotes: 'Get well soon!'
    }
  ]);

  holidays = signal<Holiday[]>([
    {
      id: 'hol-1',
      title: 'Independence Day',
      date: '2026-08-15',
      day: 'Saturday',
      type: 'Mandatory',
      description: 'National holiday honoring independence.',
      isUpcoming: true
    },
    {
      id: 'hol-2',
      title: 'Labor Day',
      date: '2026-09-07',
      day: 'Monday',
      type: 'Mandatory',
      description: 'Federal holiday celebrating workers achievements.',
      isUpcoming: true
    },
    {
      id: 'hol-3',
      title: 'Autumn Equinox',
      date: '2026-09-22',
      day: 'Tuesday',
      type: 'Optional',
      description: 'Seasonal cultural festival option.',
      isUpcoming: true
    },
    {
      id: 'hol-4',
      title: 'Thanksgiving Day',
      date: '2026-11-26',
      day: 'Thursday',
      type: 'Mandatory',
      description: 'National harvest celebration.',
      isUpcoming: false
    },
    {
      id: 'hol-5',
      title: 'Winter Solstice',
      date: '2026-12-25',
      day: 'Friday',
      type: 'Mandatory',
      description: 'Annual winter holiday break.',
      isUpcoming: false
    }
  ]);

  timesheets = signal<Timesheet[]>([
    {
      id: 'ts-01',
      employeeId: 'EMP-003',
      employeeName: 'Elena Rostova',
      employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      weekStartDate: '2026-08-03',
      weekEndDate: '2026-08-09',
      status: 'Submitted',
      totalHours: 40,
      submittedOn: '2026-08-05',
      entries: [
        {
          id: 'ent-1',
          project: 'HRMS Mobile & Web Redesign',
          task: 'UI Component Design & Tokens',
          hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 }
        }
      ]
    },
    {
      id: 'ts-02',
      employeeId: 'EMP-002',
      employeeName: 'Marcus Chen',
      employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      weekStartDate: '2026-08-03',
      weekEndDate: '2026-08-09',
      status: 'Submitted',
      totalHours: 42,
      submittedOn: '2026-08-05',
      entries: [
        {
          id: 'ent-2',
          project: 'HRMS Angular Architecture',
          task: 'Standalone components & Signal state',
          hours: { mon: 9, tue: 8, wed: 9, thu: 8, fri: 8, sat: 0, sun: 0 }
        }
      ]
    },
    {
      id: 'ts-03',
      employeeId: 'EMP-005',
      employeeName: 'David Kim',
      employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      weekStartDate: '2026-08-03',
      weekEndDate: '2026-08-09',
      status: 'Draft',
      totalHours: 32,
      entries: [
        {
          id: 'ent-3',
          project: 'Q3 Marketing Campaign',
          task: 'Landing page copy & Social strategy',
          hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 0, sat: 0, sun: 0 }
        }
      ]
    }
  ]);

  regularizationRequests = signal<RegularizationRequest[]>([
    {
      id: 'reg-01',
      employeeId: 'EMP-003',
      employeeName: 'Elena Rostova',
      employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-11', // Let's use a date in future or past cell
      checkIn: '09:00 AM',
      checkOut: '06:00 PM',
      reason: 'Forgot to clock in/out due to morning field client onboarding session.',
      status: 'Pending',
      appliedOn: '2026-08-05'
    },
    {
      id: 'reg-02',
      employeeId: 'EMP-002',
      employeeName: 'Marcus Chen',
      employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      date: '2026-08-05',
      checkIn: '08:48 AM',
      checkOut: '06:00 PM',
      reason: 'System sync error on office entrance badge check reader.',
      status: 'Approved',
      appliedOn: '2026-08-05',
      notes: 'Verified with supervisor'
    }
  ]);

  // Clock-in live widget state
  isClockedIn = signal<boolean>(false);
  clockInTime = signal<string | null>(null);
  clockDurationSeconds = signal<number>(0);
  private timerInterval: any = null;

  // Computed metrics
  pendingLeavesCount = computed(() => this.leaveRequests().filter(l => l.status === 'Pending').length);
  pendingTimesheetsCount = computed(() => this.timesheets().filter(t => t.status === 'Submitted').length);
  totalEmployeesCount = computed(() => this.employees().length);
  onLeaveTodayCount = computed(() => this.attendanceRecords().filter(a => a.status === 'Leave').length);

  // Clock Actions
  toggleClockIn() {
    if (!this.isClockedIn()) {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.isClockedIn.set(true);
      this.clockInTime.set(formattedTime);
      this.clockDurationSeconds.set(0);
      
      this.timerInterval = setInterval(() => {
        this.clockDurationSeconds.update(s => s + 1);
      }, 1000);
    } else {
      this.isClockedIn.set(false);
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
  }

  // Employee Methods
  addEmployee(newEmp: Omit<Employee, 'id'>) {
    const id = `emp-${Date.now()}`;
    const employee: Employee = { ...newEmp, id };
    this.employees.update(list => [employee, ...list]);
  }

  updateEmployee(updated: Employee) {
    this.employees.update(list => list.map(e => e.id === updated.id ? updated : e));
  }

  deleteEmployee(id: string) {
    this.employees.update(list => list.filter(e => e.id !== id));
  }

  // Leave Methods
  submitLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) {
    const newReq: LeaveRequest = {
      ...request,
      id: `lv-${Date.now()}`,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0]
    };
    this.leaveRequests.update(list => [newReq, ...list]);
  }

  updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', managerNotes?: string) {
    this.leaveRequests.update(list => list.map(l => {
      if (l.id === id) {
        return { ...l, status, managerNotes: managerNotes || l.managerNotes };
      }
      return l;
    }));
  }

  // Timesheet Methods
  submitTimesheet(id: string) {
    this.timesheets.update(list => list.map(t => {
      if (t.id === id) {
        return { ...t, status: 'Submitted', submittedOn: new Date().toISOString().split('T')[0] };
      }
      return t;
    }));
  }

  updateTimesheetStatus(id: string, status: 'Approved' | 'Rejected', approverName: string) {
    this.timesheets.update(list => list.map(t => {
      if (t.id === id) {
        return { ...t, status, approvedBy: approverName };
      }
      return t;
    }));
  }

  // Regularization Methods
  submitRegularization(request: Omit<RegularizationRequest, 'id' | 'status' | 'appliedOn'>) {
    const newReq: RegularizationRequest = {
      ...request,
      id: `reg-${Date.now()}`,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0]
    };
    this.regularizationRequests.update(list => [newReq, ...list]);
  }

  approveRegularization(id: string) {
    this.regularizationRequests.update(list => list.map(r => {
      if (r.id === id) {
        return { ...r, status: 'Approved', notes: 'Approved by Manager' };
      }
      return r;
    }));
  }

  rejectRegularization(id: string, notes?: string) {
    this.regularizationRequests.update(list => list.map(r => {
      if (r.id === id) {
        return { ...r, status: 'Rejected', notes: notes || 'Rejected' };
      }
      return r;
    }));
  }
}
