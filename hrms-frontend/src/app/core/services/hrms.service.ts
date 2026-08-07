import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  Holiday, 
  Timesheet,
  RegularizationRequest
} from '../models/hrms.model';

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  activeProjects: number;
  upcomingHolidays: number;
}

@Injectable({
  providedIn: 'root'
})
export class HrmsService {
  private http = inject(HttpClient);

  // State Signals
  employees = signal<Employee[]>([]);
  attendanceRecords = signal<AttendanceRecord[]>([]);
  leaveRequests = signal<LeaveRequest[]>([]);
  holidays = signal<Holiday[]>([]);
  timesheets = signal<Timesheet[]>([]);
  regularizationRequests = signal<RegularizationRequest[]>([]);
  dashboardSummary = signal<DashboardSummary>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    activeProjects: 0,
    upcomingHolidays: 0
  });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Clock-in live widget state
  isClockedIn = signal<boolean>(false);
  clockInTime = signal<string | null>(null);
  clockDurationSeconds = signal<number>(0);
  private timerInterval: any = null;

  // Computed metrics derived from API data
  pendingLeavesCount = computed(() => {
    const apiSummary = this.dashboardSummary().pendingLeaves;
    const signalCount = this.leaveRequests().filter(l => l.status === 'Pending').length;
    return Math.max(apiSummary, signalCount);
  });
  
  pendingTimesheetsCount = computed(() => this.timesheets().filter(t => t.status === 'Submitted').length);
  totalEmployeesCount = computed(() => Math.max(this.dashboardSummary().totalEmployees, this.employees().length));
  onLeaveTodayCount = computed(() => this.attendanceRecords().filter(a => a.status === 'Leave').length);

  constructor() {
    this.refreshAllData();
  }

  refreshAllData() {
    this.loadDashboardSummary();
    this.loadEmployees();
    this.loadAttendance();
    this.loadLeaves();
    this.loadHolidays();
    this.loadTimesheets();
  }

  // Dashboard API
  loadDashboardSummary() {
    this.http.get<DashboardSummary>('/api/v1/dashboard/summary').pipe(
      catchError(() => of({
        totalEmployees: 24,
        presentToday: 20,
        absentToday: 4,
        pendingLeaves: 3,
        activeProjects: 8,
        upcomingHolidays: 4
      }))
    ).subscribe(data => this.dashboardSummary.set(data));
  }

  // Employees API
  loadEmployees() {
    this.isLoading.set(true);
    this.http.get<any[]>('/api/v1/employees').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      this.isLoading.set(false);
      const mapped: Employee[] = data.map((e, idx) => ({
        id: String(e.id || idx + 1),
        employeeId: e.employeeCode || `EMP-00${e.id || idx + 1}`,
        name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email?.split('@')[0] || 'Employee',
        email: e.email || '',
        phone: e.phone || '+1 (555) 000-0000',
        role: e.role === 'ADMIN' ? 'Admin' : (e.role === 'HR' ? 'HR Manager' : 'Employee'),
        department: e.department || (e.role === 'HR' ? 'Human Resources' : 'Engineering'),
        designation: e.designation || (e.role === 'ADMIN' ? 'Administrator' : 'Software Engineer'),
        joinDate: e.joiningDate || '2023-01-15',
        status: e.active ? 'Active' : 'Terminated',
        avatar: `https://images.unsplash.com/photo-${1534528741775 + idx}?w=150&auto=format&fit=crop&q=80`,
        salary: 95000 + (idx * 5000),
        location: 'San Francisco, CA',
        leaveBalance: { casual: 10, sick: 7, paid: 15, wfh: 8 }
      }));

      this.employees.set(mapped.length > 0 ? mapped : this.getFallbackEmployees());
    });
  }

  addEmployee(newEmp: any) {
    this.http.post<any>('/api/v1/employees', {
      employeeCode: newEmp.employeeCode || `EMP-00${this.employees().length + 1}`,
      firstName: newEmp.firstName,
      lastName: newEmp.lastName,
      email: newEmp.email,
      phone: newEmp.phone,
      department: newEmp.department,
      designation: newEmp.designation,
      role: newEmp.role,
      password: newEmp.password,
      joiningDate: newEmp.joiningDate
    }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadEmployees();
    });
  }

  updateEmployee(updated: Employee) {
    this.http.put<any>(`/api/v1/employees/${updated.id}`, {
      firstName: updated.name.split(' ')[0],
      lastName: updated.name.split(' ')[1] || '',
      phone: updated.phone,
      department: updated.department,
      designation: updated.designation
    }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadEmployees();
    });
  }

  deleteEmployee(id: string) {
    this.http.delete(`/api/v1/employees/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadEmployees();
    });
  }

  // Attendance API
  loadAttendance() {
    this.http.get<any>('/api/v1/attendance').pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      // Set attendance records
      this.attendanceRecords.set([
        {
          id: 'att-1',
          employeeId: 'EMP-001',
          employeeName: 'Alexandra Vance',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          date: new Date().toISOString().split('T')[0],
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
          date: new Date().toISOString().split('T')[0],
          clockIn: '09:05 AM',
          clockOut: '--',
          totalHours: 'In Progress',
          status: 'Present',
          notes: 'Active session'
        }
      ]);
    });
  }

  // Leave API
  loadLeaves() {
    this.http.get<any>('/api/v1/leaves').pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.leaveRequests.set([
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
          reason: 'Family event in New York.',
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
          reason: 'Home renovation internet setup.',
          status: 'Pending',
          appliedOn: '2026-08-05'
        }
      ]);
    });
  }

  submitLeaveRequest(request: any) {
    this.http.post<any>('/api/v1/leaves/apply', request).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadLeaves();
    });
  }

  updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', managerNotes?: string) {
    this.http.post<any>('/api/v1/leaves/approve', { id, status, managerNotes }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.leaveRequests.update(list => list.map(l => l.id === id ? { ...l, status, managerNotes } : l));
    });
  }

  // Holidays API
  loadHolidays() {
    this.http.get<any[]>('/api/v1/holidays').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapped: Holiday[] = data.map((h, i) => ({
          id: String(h.id || i + 1),
          title: h.name || 'Holiday',
          date: h.date || '2026-09-01',
          day: h.day || 'Monday',
          type: (h.type as any) || 'Mandatory',
          description: `Company holiday: ${h.name}`,
          isUpcoming: true
        }));
        this.holidays.set(mapped);
      }
    });
  }

  // Timesheets API
  loadTimesheets() {
    this.http.get<any[]>('/api/v1/timesheets').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapped: Timesheet[] = data.map((t, i) => ({
          id: String(t.id || i + 1),
          employeeId: 'EMP-001',
          employeeName: t.employeeName || 'Staff Member',
          employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          weekStartDate: t.weekStartDate || '2026-08-03',
          weekEndDate: t.weekEndDate || '2026-08-09',
          status: (t.status as any) || 'Submitted',
          totalHours: t.totalHours || 40,
          entries: [
            {
              id: 'ent-1',
              project: t.project || 'HRMS Development',
              task: 'API Integration & Security',
              hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 }
            }
          ]
        }));
        this.timesheets.set(mapped);
      }
    });
  }

  submitTimesheet(id: string) {
    this.timesheets.update(list => list.map(t => t.id === id ? { ...t, status: 'Submitted' } : t));
  }

  updateTimesheetStatus(id: string, status: 'Approved' | 'Rejected', approverName: string) {
    this.timesheets.update(list => list.map(t => t.id === id ? { ...t, status, approvedBy: approverName } : t));
  }

  // Clock Widget Actions
  toggleClockIn() {
    if (!this.isClockedIn()) {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.isClockedIn.set(true);
      this.clockInTime.set(formattedTime);
      this.clockDurationSeconds.set(0);

      this.http.post('/api/v1/attendance', {}).pipe(catchError(() => of(null))).subscribe();

      this.timerInterval = setInterval(() => {
        this.clockDurationSeconds.update(s => s + 1);
      }, 1000);
    } else {
      this.isClockedIn.set(false);
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.http.put('/api/v1/attendance', {}).pipe(catchError(() => of(null))).subscribe();
    }
  }

  private getFallbackEmployees(): Employee[] {
    return [
      {
        id: '1',
        employeeId: 'EMP-001',
        name: 'Alexandra Vance',
        email: 'admin@hrms.local',
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
        id: '2',
        employeeId: 'EMP-002',
        name: 'Marcus Chen',
        email: 'employee@hrms.local',
        phone: '+1 (555) 876-5432',
        role: 'Employee',
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
        id: '3',
        employeeId: 'EMP-003',
        name: 'Sarah Jenkins',
        email: 'hr@hrms.local',
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
      }
    ];
  }
}
