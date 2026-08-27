import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveTypeItem,
  EmployeeLeaveBalanceDetail,
  CreateLeavePayload,
  UpdateLeavePayload,
  ApproveLeavePayload,
  Holiday,
  Timesheet,
  RegularizationRequest,
  RegularizationStatus,
  EmployeeSearchResult,
  EmployeeLeaveWfhSummary
} from '../models/hrms.model';

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  activeProjects: number;
  upcomingHolidays: number;
  attendanceRate?: number;
}

import { NotificationService } from './notification.service';
import { GeolocationService } from './geolocation.service';

@Injectable({
  providedIn: 'root'
})
export class HrmsService {
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  private geoService = inject(GeolocationService);

  isPunchLoading = signal<boolean>(false);



  private getCurrentUserInfo(): { id?: string; email?: string; name?: string } {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem('user_info');
    if (!raw) return {};
    try {
      const user = JSON.parse(raw);
      return {
        id: user?.id ? String(user.id) : undefined,
        email: user?.email ? String(user.email).toLowerCase() : undefined,
        name: user?.name ? String(user.name).toLowerCase() : undefined
      };
    } catch (_) {
      return {};
    }
  }

  private restoreClockState() {
    const today = this.getTodayStr();
    const userInfo = this.getCurrentUserInfo();
    const userKeySuffix = userInfo.id ? `_${userInfo.id}` : '';

    const storedDate = localStorage.getItem(`hrms_today_date${userKeySuffix}`);
    if (storedDate === today) {
      const savedIn = localStorage.getItem(`hrms_today_clock_in${userKeySuffix}`);
      const savedOut = localStorage.getItem(`hrms_today_clock_out${userKeySuffix}`);
      if (savedIn) {
        this.clockInTime.set(savedIn);
        this.isClockedIn.set(!savedOut);
      }
      if (savedOut) {
        this.clockOutTimeSignal.set(savedOut);
      }
    } else if (storedDate) {
      localStorage.removeItem(`hrms_today_date${userKeySuffix}`);
      localStorage.removeItem(`hrms_today_clock_in${userKeySuffix}`);
      localStorage.removeItem(`hrms_today_clock_out${userKeySuffix}`);
    }
  }

  private saveClockState(inTime?: string, outTime?: string) {
    const today = this.getTodayStr();
    const userInfo = this.getCurrentUserInfo();
    const userKeySuffix = userInfo.id ? `_${userInfo.id}` : '';

    localStorage.setItem(`hrms_today_date${userKeySuffix}`, today);
    if (inTime) localStorage.setItem(`hrms_today_clock_in${userKeySuffix}`, inTime);
    if (outTime) localStorage.setItem(`hrms_today_clock_out${userKeySuffix}`, outTime);
  }

  // State Signals
  employees = signal<Employee[]>([]);
  attendanceRecords = signal<AttendanceRecord[]>([]);
  leaveRequests = signal<LeaveRequest[]>([]);
  leaveTypes = signal<LeaveTypeItem[]>([]);
  leaveBalances = signal<EmployeeLeaveBalanceDetail[]>([]);
  pendingLeaveApprovals = signal<LeaveRequest[]>([]);
  holidays = signal<Holiday[]>([]);
  timesheets = signal<Timesheet[]>([]);
  regularizationRequests = signal<RegularizationRequest[]>([]);
  profileChangeRequests = signal<any[]>([]);
  pendingProfileChangeRequests = signal<any[]>([]);
  allProfileChangeRequests = signal<any[]>([]);

  // Pagination state
  employeePagination = signal<{ totalElements: number; totalPages: number; currentPage: number; pageSize: number }>({
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: 10
  });
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
  clockOutTimeSignal = signal<string | null>(null);
  clockDurationSeconds = signal<number>(0);
  private timerInterval: any = null;

  getTodayStr(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Computed today's attendance record from backend API for the CURRENT LOGGED-IN USER ONLY
  todayRecord = computed(() => {
    const today = this.getTodayStr();
    const userInfo = this.getCurrentUserInfo();

    const matches = this.attendanceRecords().filter(a => {
      if (a.date !== today) return false;
      if (!userInfo.id && !userInfo.email && !userInfo.name) return false;

      const idMatch = userInfo.id && String(a.employeeId) === userInfo.id;
      const nameMatch = userInfo.name && a.employeeName && a.employeeName.toLowerCase() === userInfo.name;
      return idMatch || nameMatch;
    });

    if (matches.length === 0) return undefined;
    return matches[matches.length - 1];
  });

  todayAttendanceState = signal<{
    clockIn: string;
    clockOut: string;
    isClockedIn: boolean;
    isClockedOut: boolean;
    status?: string;
  }>({
    clockIn: '',
    clockOut: '',
    isClockedIn: false,
    isClockedOut: false,
    status: ''
  });

  todayClockInTime = computed(() => {
    const apiState = this.todayAttendanceState();
    if (apiState.clockIn) return apiState.clockIn;
    const rec = this.todayRecord();
    if (rec && rec.clockIn && rec.clockIn !== '--') return rec.clockIn;
    return this.clockInTime() || '';
  });

  todayClockOutTime = computed(() => {
    const apiState = this.todayAttendanceState();
    if (apiState.clockOut) return apiState.clockOut;
    const rec = this.todayRecord();
    if (rec && rec.clockOut && rec.clockOut !== '--') return rec.clockOut;
    return this.clockOutTimeSignal() || '';
  });

  isClockedInComputed = computed(() => {
    const apiState = this.todayAttendanceState();
    if (apiState.isClockedOut) return false;
    if (apiState.isClockedIn) return true;
    const rec = this.todayRecord();
    if (rec && rec.clockIn && rec.clockIn !== '--' && (!rec.clockOut || rec.clockOut === '--')) {
      return true;
    }
    return this.isClockedIn() && !this.isClockedOutToday();
  });

  isClockedOutToday = computed(() => {
    const apiState = this.todayAttendanceState();
    if (apiState.isClockedOut) return true;
    const rec = this.todayRecord();
    if (rec && rec.clockIn && rec.clockIn !== '--' && rec.clockOut && rec.clockOut !== '--') {
      return true;
    }
    return !!(this.clockOutTimeSignal() || (rec && rec.clockOut && rec.clockOut !== '--'));
  });

  // Computed metrics derived from API data
  pendingLeavesCount = computed(() => {
    const approverPending = this.pendingLeaveApprovals().filter(l => l.status === 'Pending' || l.status === 'PENDING').length;
    const allPending = this.leaveRequests().filter(l => l.status === 'Pending' || l.status === 'PENDING').length;
    const apiSummary = this.dashboardSummary().pendingLeaves || 0;
    return Math.max(apiSummary, approverPending, allPending);
  });

  pendingTimesheetsCount = computed(() => this.timesheets().filter(t => t.status === 'Submitted').length);
  totalEmployeesCount = computed(() => {
    const activeEmployeesCount = this.employees().filter(e => e.status !== 'Terminated').length;
    return Math.max(this.dashboardSummary().totalEmployees || 0, activeEmployeesCount);
  });
  onLeaveTodayCount = computed(() => {
    const today = this.getTodayStr();
    const records = this.attendanceRecords();
    const leaves = this.leaveRequests();

    const uniqueEmpIds = new Set<string>();

    records.forEach(r => {
      if (r.date === today && r.status === 'Leave') {
        if (r.employeeId) {
          uniqueEmpIds.add(String(r.employeeId));
        }
      }
    });

    leaves.forEach(l => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
      const isWfhCategory = (l.leaveTypeCode && l.leaveTypeCode.toUpperCase() === 'WFH') ||
        (l.leaveType && l.leaveType.toLowerCase().includes('work from home')) ||
        (l.leaveTypeName && l.leaveTypeName.toLowerCase().includes('work from home'));

      if (isApproved && !isWfhCategory && l.startDate && l.endDate) {
        const start = l.startDate.split('T')[0];
        const end = l.endDate.split('T')[0];
        if (start <= today && today <= end) {
          if (l.employeeId) {
            uniqueEmpIds.add(String(l.employeeId));
          }
        }
      }
    });

    return uniqueEmpIds.size;
  });

  presentTodayCount = computed(() => {
    const today = this.getTodayStr();
    const records = this.attendanceRecords();

    const todayPresentRecords = records.filter(r => {
      const isTodayRecord = r.date === today;
      const isClockedIn = !!(r.clockIn && r.clockIn !== '--' && r.clockIn !== '');
      const isNotLeaveOrWfh = r.status !== 'Leave' && r.status !== 'WFH';
      return isTodayRecord && isClockedIn && isNotLeaveOrWfh;
    });

    const uniqueEmpKeys = new Set<string>();
    todayPresentRecords.forEach(r => {
      const key = r.employeeName ? r.employeeName.toLowerCase() : String(r.employeeId);
      uniqueEmpKeys.add(key);
    });

    const liveClockState = this.todayAttendanceState();
    if (liveClockState.isClockedIn || liveClockState.clockIn) {
      const userStr = localStorage.getItem('user_info') || localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const userKey = (user?.name || '').toLowerCase() || (user?.id ? String(user.id) : '');
          if (userKey) uniqueEmpKeys.add(userKey);
        } catch (_) {}
      }
    }

    const apiPresent = this.dashboardSummary().presentToday || 0;
    return Math.max(apiPresent, uniqueEmpKeys.size);
  });

  attendanceRate = computed(() => {
    const total = this.totalEmployeesCount();
    if (!total || total <= 0) return 0;
    const present = this.presentTodayCount();
    const rate = (present / total) * 100;
    return Math.min(100, Math.max(0, rate));
  });

  attendanceRateFormatted = computed(() => {
    const rate = this.attendanceRate();
    return (rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1)) + '%';
  });

  constructor() {
    this.restoreClockState();
  }

  refreshAllData() {
    this.loadDashboardSummary();
    if (this.isAdminOrHrUser()) {
      this.loadEmployees(0, 10, 'id', 'asc');
    }
    this.loadTodayAttendance();
    this.loadAttendance();
    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadPendingLeaveApprovals();
    this.loadHolidays();
    this.loadRegularizations();
    this.loadMyProfileChangeRequests();
    if (this.isAdminOrHrUser()) {
      this.loadAllProfileChangeRequests(); // Load all for filtering support
      this.loadPendingProfileChangeRequests(); // Also load pending for dashboard
    }
  }

  clearState() {
    this.employees.set([]);
    this.attendanceRecords.set([]);
    this.leaveRequests.set([]);
    this.timesheets.set([]);
    this.regularizationRequests.set([]);
    this.dashboardSummary.set({
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      pendingLeaves: 0,
      activeProjects: 0,
      upcomingHolidays: 0
    });

    // Reset clock state
    this.isClockedIn.set(false);
    this.clockInTime.set(null);
    this.clockOutTimeSignal.set(null);
    this.clockDurationSeconds.set(0);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.todayAttendanceState.set({
      clockIn: '',
      clockOut: '',
      isClockedIn: false,
      isClockedOut: false
    });

    // Clear local storage
    localStorage.removeItem('hrms_today_date');
    localStorage.removeItem('hrms_today_clock_in');
    localStorage.removeItem('hrms_today_clock_out');
  }

  loadTodayAttendance() {
    this.http.get<any>('/api/v1/attendance/today').pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      const userInfo = this.getCurrentUserInfo();
      const userKeySuffix = userInfo.id ? `_${userInfo.id}` : '';

      if (res && res.hasRecord) {
        const inStr = res.clockInFormatted || '';
        const outStr = res.clockOutFormatted || '';
        const inState = !!res.isClockedIn;
        const outState = !!res.isClockedOut;

        this.todayAttendanceState.set({
          clockIn: inStr,
          clockOut: outStr,
          isClockedIn: inState,
          isClockedOut: outState,
          status: res.status || ''
        });

        if (inStr) this.clockInTime.set(inStr);
        if (outStr) this.clockOutTimeSignal.set(outStr);
        this.isClockedIn.set(inState);

        const today = this.getTodayStr();
        localStorage.setItem(`hrms_today_date${userKeySuffix}`, today);
        if (inStr) localStorage.setItem(`hrms_today_clock_in${userKeySuffix}`, inStr);
        if (outStr) localStorage.setItem(`hrms_today_clock_out${userKeySuffix}`, outStr);
      } else {
        this.todayAttendanceState.set({
          clockIn: '',
          clockOut: '',
          isClockedIn: false,
          isClockedOut: false
        });
        this.clockInTime.set(null);
        this.clockOutTimeSignal.set(null);
        this.isClockedIn.set(false);
      }
    });
  }

  isAdminOrHrUser(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('user_info');
    if (!raw) return false;
    try {
      const user = JSON.parse(raw);
      const role = user?.role;
      return role === 'Admin' || role === 'ADMIN' || role === 'HR Manager' || role === 'HR' || role === 'Manager' || role === 'MANAGER';
    } catch {
      return false;
    }
  }

  // Dashboard API
  loadDashboardSummary() {
    if (!this.isAdminOrHrUser()) {
      this.dashboardSummary.set({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        pendingLeaves: 0,
        activeProjects: 0,
        upcomingHolidays: 0
      });
      return;
    }

    this.http.get<DashboardSummary>('/api/v1/dashboard/summary').pipe(
      catchError(() => of({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        pendingLeaves: 0,
        activeProjects: 0,
        upcomingHolidays: 0
      }))
    ).subscribe(data => this.dashboardSummary.set(data));
  }

  // Employees API
  loadEmployees(page: number = 0, size: number = 10, sortBy: string = 'id', sortDir: string = 'asc', search: string = '', department: string = 'All', role: string = 'All') {
    this.isLoading.set(true);
    const params: any = { page, size, sortBy, sortDir };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (department && department !== 'All') {
      params.department = department;
    }
    if (role && role !== 'All') {
      params.role = role;
    }

    this.http.get<any>('/api/v1/employees', { params }).pipe(
      catchError(() => of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }))
    ).subscribe(data => {
      this.isLoading.set(false);
      const content = data.content || [];
      const mapped: Employee[] = content.map((e: any, idx: number) => ({
        id: String(e.id || idx + 1),
        userId: e.userId ? String(e.userId) : undefined,
        employeeId: e.employeeCode || `EMP-00${e.id || idx + 1}`,
        name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email?.split('@')[0] || 'Employee',
        email: e.email || '',
        phone: e.phone || '+1 (555) 000-0000',
        role: e.role === 'ADMIN' ? 'Admin' : (e.role === 'HR' ? 'HR Manager' : (e.role === 'MANAGER' ? 'Manager' : (e.role === 'COORDINATOR' ? 'Coordinator' : 'Employee'))),
        department: e.department || (e.role === 'HR' ? 'Human Resources' : (e.role === 'MANAGER' ? 'Management' : 'Engineering')),
        designation: e.designation || (e.role === 'ADMIN' ? 'Administrator' : 'Software Engineer'),
        joinDate: e.joiningDate || '2023-01-15',
        dateOfBirth: e.dateOfBirth,
        status: e.active ? 'Active' : 'Terminated',
        avatar: e.photoUrl || `https://images.unsplash.com/photo-${1534528741775 + idx}?w=150&auto=format&fit=crop&q=80`,
        salary: Number(e.currentSalary) || (95000 + (idx * 5000)),
        location: e.address || 'San Francisco, CA',
        address: e.address,
        isFresher: e.isFresher,
        totalExperience: e.totalExperience,
        previousCompany: e.previousCompany,
        previousDesignation: e.previousDesignation,
        previousSalary: e.previousSalary,
        currentSalary: e.currentSalary,
        techStack: e.techStack,
        education: e.education,
        tenthQualification: e.tenthQualification,
        twelfthQualification: e.twelfthQualification,
        bachelorQualification: e.bachelorQualification,
        highestQualification: e.highestQualification,
        emergencyContact1: e.emergencyContact1,
        emergencyContact2: e.emergencyContact2,
        photoUrl: e.photoUrl,
        hasGap: e.hasGap,
        gapReason: e.gapReason,
        referenceDetails: e.referenceDetails,
        currentAddress: e.currentAddress || e.address,
        permanentAddress: e.permanentAddress || e.address,
        maritalStatus: e.maritalStatus || 'Single',
        marriageDate: e.marriageDate,
        benchStatus: e.benchStatus || 'NO',
        leaveBalance: { casual: 10, sick: 7, paid: 15, wfh: 8 }
      }));

      this.employees.set(mapped);
      this.employeePagination.set({
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
        currentPage: data.number || 0,
        pageSize: data.size || 10
      });
    });
  }

  getNextEmployeeCode(): Observable<{ employeeCode: string }> {
    return this.http.get<{ employeeCode: string }>('/api/v1/employees/next-code');
  }

  addEmployee(newEmp: any): Observable<any> {
    return this.http.post<any>('/api/v1/employees', {
      employeeCode: newEmp.employeeCode,
      firstName: newEmp.firstName,
      lastName: newEmp.lastName,
      email: newEmp.email,
      phone: newEmp.phone,
      department: newEmp.department,
      designation: newEmp.designation,
      role: newEmp.role,
      password: newEmp.password,
      joiningDate: newEmp.joiningDate,
      dateOfBirth: newEmp.dateOfBirth,
      address: newEmp.currentAddress || newEmp.address,
      currentAddress: newEmp.currentAddress,
      permanentAddress: newEmp.permanentAddress,
      maritalStatus: newEmp.maritalStatus,
      marriageDate: newEmp.maritalStatus === 'Married' ? newEmp.marriageDate : null,
      isFresher: newEmp.isFresher,
      totalExperience: newEmp.isFresher ? '0' : newEmp.totalExperience,
      previousCompany: newEmp.isFresher ? '' : newEmp.previousCompany,
      previousDesignation: newEmp.isFresher ? '' : newEmp.previousDesignation,
      previousSalary: newEmp.isFresher ? '' : newEmp.previousSalary,
      currentSalary: newEmp.currentSalary,
      techStack: newEmp.techStack,
      education: newEmp.education,
      tenthQualification: newEmp.tenthQualification,
      twelfthQualification: newEmp.twelfthQualification,
      bachelorQualification: newEmp.bachelorQualification,
      hasHighestQualification: newEmp.hasHighestQualification,
      highestQualification: newEmp.hasHighestQualification ? newEmp.highestQualification : '',
      emergencyContact1: newEmp.emergencyContact1,
      emergencyContact2: newEmp.emergencyContact2,
      photoUrl: newEmp.photoUrl,
      hasGap: newEmp.hasGap,
      gapReason: newEmp.hasGap ? newEmp.gapReason : '',
      referenceDetails: newEmp.referenceDetails
    }).pipe(
      tap(() => {
        this.loadEmployees(0, 10, 'id', 'asc');
      })
    );
  }

  updateBenchStatus(id: string | number, benchStatus: 'YES' | 'NO'): Observable<any> {
    return this.http.patch<any>(`/api/v1/employees/${id}/bench-status`, { benchStatus }).pipe(
      tap(() => {
        this.loadEmployees(this.employeePagination().currentPage, this.employeePagination().pageSize, 'id', 'asc');
      })
    );
  }

  updateEmployee(id: string, emp: any): Observable<any> {
    return this.http.put<any>(`/api/v1/employees/${id}`, {
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      role: emp.role,
      joiningDate: emp.joiningDate,
      dateOfBirth: emp.dateOfBirth,
      address: emp.currentAddress || emp.address,
      currentAddress: emp.currentAddress,
      permanentAddress: emp.permanentAddress,
      maritalStatus: emp.maritalStatus,
      marriageDate: emp.maritalStatus === 'Married' ? emp.marriageDate : null,
      isFresher: emp.isFresher,
      totalExperience: emp.isFresher ? '0' : emp.totalExperience,
      previousCompany: emp.isFresher ? '' : emp.previousCompany,
      previousDesignation: emp.isFresher ? '' : emp.previousDesignation,
      previousSalary: emp.isFresher ? '' : emp.previousSalary,
      currentSalary: emp.currentSalary,
      techStack: emp.techStack,
      education: emp.education,
      tenthQualification: emp.tenthQualification,
      twelfthQualification: emp.twelfthQualification,
      bachelorQualification: emp.bachelorQualification,
      hasHighestQualification: emp.hasHighestQualification,
      highestQualification: emp.hasHighestQualification ? emp.highestQualification : '',
      emergencyContact1: emp.emergencyContact1,
      emergencyContact2: emp.emergencyContact2,
      photoUrl: emp.photoUrl,
      hasGap: emp.hasGap,
      gapReason: emp.hasGap ? emp.gapReason : '',
      referenceDetails: emp.referenceDetails
    }).pipe(
      tap(() => {
        this.loadEmployees(0, 10, 'id', 'asc');
      })
    );
  }

  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`/api/v1/employees/${id}`).pipe(
      tap(() => {
        this.loadEmployees(0, 10, 'id', 'asc');
      })
    );
  }

  private parseDateTime(val: any): Date | null {
    if (!val) return null;
    if (Array.isArray(val)) {
      return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0);
    }
    if (typeof val === 'object') {
      const y = val.year || val.yearValue || 2026;
      const m = (val.monthValue || (typeof val.month === 'number' ? val.month : 1)) - 1;
      const d = val.dayOfMonth || val.day || 1;
      const hr = val.hour || 0;
      const min = val.minute || 0;
      const sec = val.second || 0;
      return new Date(y, m, d, hr, min, sec);
    }
    if (typeof val === 'string') {
      const cleanStr = val.replace(' ', 'T');
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  private parseDateString(val: any): string {
    if (!val) return this.getTodayStr();
    if (Array.isArray(val)) {
      const y = val[0];
      const m = String(val[1]).padStart(2, '0');
      const d = String(val[2]).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'object') {
      const y = val.year || 2026;
      const m = String(val.monthValue || (typeof val.month === 'number' ? val.month : 1)).padStart(2, '0');
      const d = String(val.dayOfMonth || val.day || 1).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(val).split('T')[0].split(' ')[0];
  }

  // Attendance API
  loadAttendance(year?: number, month?: number) {
    let params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    this.http.get<any[]>('/api/v1/attendance', { params }).pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapped: AttendanceRecord[] = data.map((a, i) => {
          const inDt = this.parseDateTime(a.clockIn);
          const outDt = this.parseDateTime(a.clockOut);
          const clockInTime = inDt ? inDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
          const clockOutTime = outDt ? outDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
          const hoursStr = a.totalHours != null ? `${a.totalHours} hrs` : '--';
          let statusStr: AttendanceStatus = 'Present';
          if (a.status === 'LATE' || a.status === 'Late') statusStr = 'Late';
          else if (a.status === 'PRESENT' || a.status === 'Present') statusStr = 'Present';
          else if (a.status === 'HALF_DAY' || a.status === 'Half Day') statusStr = 'Half Day';
          else if (a.status === 'ABSENT' || a.status === 'Absent') statusStr = 'Absent';
          else if (a.status === 'LEAVE' || a.status === 'Leave') statusStr = 'Leave';
          else if (a.status === 'HOLIDAY' || a.status === 'Holiday') statusStr = 'Holiday';
          else if (a.status === 'WEEKEND' || a.status === 'Week Off') statusStr = 'Week Off';
          else if (a.status === 'WFH') statusStr = 'WFH';

          return {
            id: String(a.id || i + 1),
            employeeId: String(a.employeeId || '1'),
            employeeName: a.employeeName || 'Staff Member',
            avatar: a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            date: this.parseDateString(a.date),
            clockIn: clockInTime,
            clockOut: clockOutTime,
            totalHours: hoursStr,
            status: statusStr,
            notes: a.notes,
            isLocked: a.isLocked,
            regularizationStatus: a.regularizationStatus ? (a.regularizationStatus.charAt(0).toUpperCase() + a.regularizationStatus.slice(1).toLowerCase() as any) : undefined
          };
        });
        this.attendanceRecords.set(mapped);
      } else {
        this.attendanceRecords.set([]);
      }
    });
  }

  // Regularization API
  loadRegularizations() {
    // Try fetching admin/all endpoint first; fallback to /me if restricted
    this.http.get<any[]>('/api/v1/attendance/regularizations').pipe(
      catchError(() => this.http.get<any[]>('/api/v1/attendance/regularizations/me').pipe(catchError(() => of([]))))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapped: RegularizationRequest[] = data.map((r, i) => {
          const reqInTime = r.requestedClockIn ? new Date(r.requestedClockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (r.checkIn || '09:00 AM');
          const reqOutTime = r.requestedClockOut ? new Date(r.requestedClockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (r.checkOut || '06:00 PM');
          const origInTime = r.originalClockIn ? new Date(r.originalClockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
          const origOutTime = r.originalClockOut ? new Date(r.originalClockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';

          let statusCap: RegularizationStatus = 'Pending';
          if (r.status === 'APPROVED' || r.status === 'Approved') statusCap = 'Approved';
          else if (r.status === 'REJECTED' || r.status === 'Rejected') statusCap = 'Rejected';
          else if (r.status === 'CANCELLED' || r.status === 'Cancelled') statusCap = 'Cancelled';

          return {
            id: String(r.id || i + 1),
            attendanceId: r.attendanceId ? String(r.attendanceId) : undefined,
            employeeId: String(r.employeeId || '1'),
            employeeCode: r.employeeCode || 'EMP-001',
            employeeName: r.employeeName || 'Staff Member',
            employeeAvatar: r.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: r.department || 'Engineering',
            date: r.attendanceDate ? String(r.attendanceDate) : (r.date || new Date().toISOString().split('T')[0]),
            correctionType: r.correctionType || 'BOTH',
            originalClockIn: origInTime,
            originalClockOut: origOutTime,
            requestedClockIn: reqInTime,
            requestedClockOut: reqOutTime,
            checkIn: reqInTime,
            checkOut: reqOutTime,
            originalWorkingHours: r.originalWorkingHours || 0.0,
            requestedWorkingHours: r.requestedWorkingHours || 9.0,
            reason: r.reason || 'Missing punch correction',
            attachmentUrl: r.attachmentUrl,
            status: statusCap,
            appliedOn: r.submittedAt ? r.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            submittedAt: r.submittedAt,
            approvedAt: r.approvedAt,
            rejectedAt: r.rejectedAt,
            cancelledAt: r.cancelledAt,
            reviewedBy: r.reviewedBy,
            reviewRemarks: r.reviewRemarks || '--',
            notes: r.reviewRemarks || ''
          };
        });
        this.regularizationRequests.set(mapped);
      } else {
        this.regularizationRequests.set([]);
      }
    });
  }

  createRegularizationPayload(payload: any) {
    return this.http.post<any>('/api/v1/attendance/regularizations', payload).pipe(
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to submit regularization request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }

  cancelRegularizationRequest(id: string) {
    this.http.put<any>(`/api/v1/attendance/regularizations/${id}/cancel`, {}).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadRegularizations();
      this.loadAttendance();
    });
  }

  approveRegularizationRequest(id: string, reviewRemarks?: string) {
    this.http.put<any>(`/api/v1/attendance/regularizations/${id}/approve`, { reviewRemarks }).pipe(
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to approve request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    ).subscribe(() => {
      this.loadRegularizations();
      this.loadAttendance();
    });
  }

  rejectRegularizationRequest(id: string, reviewRemarks?: string) {
    this.http.put<any>(`/api/v1/attendance/regularizations/${id}/reject`, { reviewRemarks }).pipe(
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to reject request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    ).subscribe(() => {
      this.loadRegularizations();
      this.loadAttendance();
    });
  }

  // Leave API Integration
  loadLeaveTypes(forceReload = false) {
    if (!forceReload && this.leaveTypes().length > 0) return;
    // Use the new endpoint that filters based on employee tenure
    this.http.get<LeaveTypeItem[]>('/api/v1/leaves/types/available').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        this.leaveTypes.set(data);
      }
    });
  }

  loadLeaves(year?: number, month?: number) {
    let params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    this.http.get<any>('/api/v1/leaves', { params }).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
//       console.log('Leave API Response:', res);

      if (res) {
        // Process leave balances
        if (res.leaveBalances && Array.isArray(res.leaveBalances)) {
          const mappedBalances: EmployeeLeaveBalanceDetail[] = res.leaveBalances.map((b: any) => ({
            leaveTypeId: b.leaveTypeId,
            leaveTypeCode: b.leaveTypeCode,
            leaveTypeName: b.leaveTypeName,
            totalDays: this.parseBigDecimal(b.totalDays),
            usedDays: this.parseBigDecimal(b.usedDays),
            pendingDays: this.parseBigDecimal(b.pendingDays),
            balanceDays: this.parseBigDecimal(b.balanceDays),
            carriedForwardDays: this.parseBigDecimal(b.carriedForwardDays),
            paid: b.paid === true || b.paid === 'true'
          }));
          this.leaveBalances.set(mappedBalances);

          // If all balances are 0, try to initialize them
          const allZero = mappedBalances.every(b => b.balanceDays === 0 && b.totalDays === 0);
          if (allZero) {
            this.initializeLeaveBalances();
          }
        }

        // Process leave requests
        if (res.leaves && Array.isArray(res.leaves)) {
          const mapped: LeaveRequest[] = res.leaves.map((l: any, idx: number) => ({
            id: l.id || idx + 1,
            employeeId: l.employeeId,
            employeeName: (l.employeeName || res.employeeName || 'Employee').trim(),
            employeeCode: l.employeeCode || res.employeeCode || '',
            employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: res.department || 'Engineering',
            leaveTypeId: l.leaveTypeId,
            leaveType: l.leaveTypeName || 'Leave',
            leaveTypeName: l.leaveTypeName,
            leaveTypeCode: l.leaveTypeCode,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays || 1,
            reason: l.reason || '',
            status: l.status || 'PENDING',
            approvedBy: l.approvedBy,
            approvedByName: l.approvedByName,
            approvedAt: l.approvedAt,
            rejectionReason: l.rejectionReason,
            appliedOn: l.createdAt ? String(l.createdAt).split('T')[0] : '',
            createdAt: l.createdAt,
            updatedAt: l.updatedAt
          }));
          this.leaveRequests.set(mapped);
//           console.log('Processed leave requests:', mapped);
        } else {
          console.log('No leaves array in response');
          this.leaveRequests.set([]);
        }
      } else {
        console.log('Response is null or undefined');
        this.leaveRequests.set([]);
      }
    });
  }

  initializeLeaveBalances() {
    this.http.post<any>('/api/v1/leaves/initialize-balances', {}).pipe(
      catchError(err => {
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        // Reload leave data after initialization
        this.loadLeaves();
      }
    });
  }

  private parseBigDecimal(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Profile Change Request API
  createProfileChangeRequest(request: { fieldType: string; newValue: string; reason: string }): Observable<any> {
    return this.http.post<any>('/api/v1/profile-changes', request).pipe(
      tap(() => {
        this.loadMyProfileChangeRequests();
      })
    );
  }

  loadMyProfileChangeRequests() {
//     console.log('Loading my profile change requests...');
    this.http.get<any[]>('/api/v1/profile-changes/my-requests').pipe(
      catchError((error) => {
        console.error('Failed to load my-requests, trying all endpoint:', error);
        // Fallback to all requests endpoint
        return this.http.get<any>('/api/v1/profile-changes');
      }),
      catchError((error) => {
        console.error('All endpoints failed:', error);
        return of([]);
      })
    ).subscribe(data => {
//       console.log('My profile change requests loaded:', data);
      // Handle different response formats
      const requests = Array.isArray(data) ? data : (data?.content || data?.data || []);
      this.profileChangeRequests.set(requests);
    });
  }

  loadPendingProfileChangeRequests() {
    this.http.get<any>('/api/v1/profile-changes/pending', { params: { page: 0, size: 10 } }).pipe(
      catchError(() => of({ content: [] }))
    ).subscribe(data => {
      this.pendingProfileChangeRequests.set(data?.content || []);
    });
  }

  loadAllProfileChangeRequests() {
//     console.log('Loading all profile change requests...');
    // Use the main endpoint which now returns all requests for HR/Manager/Admin
    this.http.get<any[]>('/api/v1/profile-changes').pipe(
      catchError((error) => {
        console.error('Main endpoint failed with error:', error);
        console.log('Trying /all endpoint as fallback');
        return this.http.get<any>('/api/v1/profile-changes/all', { params: { page: 0, size: 100, sortBy: 'submittedAt', sortDir: 'desc' } });
      }),
      catchError((error) => {
        console.error('All endpoints failed with error:', error);
        console.log('Returning empty array');
        return of([]);
      })
    ).subscribe(data => {
//       console.log('All profile change requests from API:', data);
//       console.log('Data type:', typeof data);
//       console.log('Is array:', Array.isArray(data));
//       console.log('Has content property:', data?.content);

      // Handle different response formats
      let requests: any[] = [];
      if (Array.isArray(data)) {
        requests = data;
      } else if (data?.content && Array.isArray(data.content)) {
        requests = data.content;
      } else if (data?.data && Array.isArray(data.data)) {
        requests = data.data;
      }

//       console.log('Extracted requests:', requests);
//       console.log('Number of requests:', requests.length);
//       if (requests.length > 0) {
//         console.log('Sample request:', requests[0]);
//       }

      this.allProfileChangeRequests.set(requests);
      // Also update pendingProfileChangeRequests with pending items for backward compatibility
      const pendingItems = requests.filter((req: any) =>
        (req.status || '').toUpperCase() === 'PENDING' || (req.status || '').toUpperCase() === 'Pending'
      );
      this.pendingProfileChangeRequests.set(pendingItems);
//       console.log('Pending items filtered:', pendingItems);
    });
  }

  approveProfileChangeRequest(id: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`/api/v1/profile-changes/${id}/approve`, remarks).pipe(
      tap(() => {
        this.loadPendingProfileChangeRequests();
      })
    );
  }

  rejectProfileChangeRequest(id: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`/api/v1/profile-changes/${id}/reject`, remarks).pipe(
      tap(() => {
        this.loadPendingProfileChangeRequests();
      })
    );
  }

  cancelProfileChangeRequest(id: number): Observable<any> {
    return this.http.post<any>(`/api/v1/profile-changes/${id}/cancel`, {}).pipe(
      tap(() => {
        this.loadMyProfileChangeRequests();
      })
    );
  }

  pendingProfileChangeRequestsCount = computed(() => this.pendingProfileChangeRequests().length);

  loadPendingLeaveApprovals() {
    this.http.get<any[]>('/api/v1/leaves/approvals/pending').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapped: LeaveRequest[] = data.map((l: any, idx: number) => ({
          id: l.id || idx + 1,
          employeeId: l.employeeId,
          employeeName: l.employeeName || 'Staff Member',
          employeeCode: l.employeeCode || '',
          employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          department: 'Engineering',
          leaveTypeId: l.leaveTypeId,
          leaveType: l.leaveTypeName || 'Leave',
          leaveTypeName: l.leaveTypeName,
          leaveTypeCode: l.leaveTypeCode,
          startDate: l.startDate,
          endDate: l.endDate,
          totalDays: l.totalDays || 1,
          reason: l.reason || '',
          status: l.status || 'PENDING',
          approvedBy: l.approvedBy,
          approvedByName: l.approvedByName,
          approvedAt: l.approvedAt,
          rejectionReason: l.rejectionReason,
          appliedOn: l.createdAt ? String(l.createdAt).split('T')[0] : '',
          createdAt: l.createdAt,
          updatedAt: l.updatedAt
        }));
        this.pendingLeaveApprovals.set(mapped);
      } else {
        this.pendingLeaveApprovals.set([]);
      }
    });
  }

  applyLeave(payload: CreateLeavePayload): Observable<any> {
    return this.http.post<any>('/api/v1/leaves', payload).pipe(
      tap(() => {
        this.loadLeaves();
        this.loadPendingLeaveApprovals();
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to submit leave request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }

  updateLeave(id: string | number, payload: UpdateLeavePayload): Observable<any> {
    return this.http.put<any>(`/api/v1/leaves/${id}`, payload).pipe(
      tap(() => {
        this.loadLeaves();
        this.loadPendingLeaveApprovals();
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to update leave request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }

  cancelLeave(id: string | number): Observable<any> {
    return this.http.post<any>(`/api/v1/leaves/${id}/cancel`, {}).pipe(
      tap(() => {
        this.loadLeaves();
        this.loadPendingLeaveApprovals();
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to cancel leave request.';
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }

  approveLeave(id: string | number, approved: boolean, rejectionReason?: string): Observable<any> {
    const payload: ApproveLeavePayload = { approved, rejectionReason };
    return this.http.post<any>(`/api/v1/leaves/${id}/approve`, payload).pipe(
      tap(() => {
        this.loadLeaves();
        this.loadPendingLeaveApprovals();
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || `Failed to ${approved ? 'approve' : 'reject'} leave request.`;
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }

  // Legacy helper methods
  submitLeaveRequest(request: any) {
    const leaveTypeId = request.leaveTypeId || 1;
    this.applyLeave({
      leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate || request.startDate,
      totalDays: request.totalDays,
      reason: request.reason
    }).subscribe();
  }

  updateLeaveStatus(id: string | number, status: 'Approved' | 'Rejected', managerNotes?: string) {
    const approved = status === 'Approved';
    this.approveLeave(id, approved, managerNotes).subscribe();
  }

  // Holidays API
  loadHolidays(forceReload = false) {
    if (!forceReload && this.holidays().length > 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    this.http.get<any[]>('/api/v1/holidays').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      let mapped: Holiday[] = [];
      if (data && data.length > 0) {
        mapped = data
          .map((h, i) => {
            const rawName = h.title || h.name || h.summary || 'Holiday';
            const rawDate = h.date || h.start?.date || (h.start?.dateTime ? h.start.dateTime.split('T')[0] : '2026-09-01');

            let dayName = h.day;
            if (!dayName && rawDate) {
              try {
                const d = new Date(rawDate + 'T00:00:00');
                dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
              } catch (e) {
                dayName = 'Monday';
              }
            }

            const isUpcoming = h.upcoming !== undefined ? h.upcoming : (rawDate >= todayStr);

            return {
              id: String(h.id || i + 1),
              title: rawName,
              date: rawDate,
              day: dayName || 'Monday',
              type: (h.type as any) || (h.description?.toLowerCase().includes('observance') ? 'Optional' : 'Mandatory'),
              description: h.description || `Company holiday: ${rawName}`,
              isUpcoming: isUpcoming
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      }
      this.holidays.set(mapped);
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

  todayStr = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  isOnLeaveOrWfhToday = computed(() => {
    const today = this.todayStr();
    const leaves = this.leaveRequests();
    const userInfo = this.getCurrentUserInfo();

    const userLeaves = leaves.filter(l => {
      if (!userInfo.id && !userInfo.name) return false;
      const idMatch = userInfo.id && l.employeeId && String(l.employeeId) === userInfo.id;
      const nameMatch = userInfo.name && l.employeeName && l.employeeName.toLowerCase() === userInfo.name;
      return idMatch || nameMatch;
    });

    const onLeaveOrWfh = userLeaves.some(l => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
      if (!isApproved || !l.startDate || !l.endDate) return false;
      const start = l.startDate.split('T')[0];
      const end = l.endDate.split('T')[0];
      return start <= today && today <= end;
    });

    if (onLeaveOrWfh) return true;

    const recStatus = (this.todayRecord()?.status || '').toUpperCase();
    return recStatus === 'WFH' || recStatus === 'LEAVE' || recStatus === 'HOLIDAY';
  });

  // Clock Widget Actions
  toggleClockIn() {
    if (this.isPunchLoading()) {
      return;
    }

    if (this.isOnLeaveOrWfhToday()) {
      this.notify.showAlert('Clock In and Clock Out are disabled for today because you are on approved Work From Home (WFH) or Leave.', 'Action Disabled', 'info');
      return;
    }

    if (this.isClockedOutToday()) {
      return;
    }

    const isClockingInNow = !this.isClockedInComputed();

    this.isPunchLoading.set(true);

    this.geoService.getCurrentPosition().then(coords => {
      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude
      };

      if (isClockingInNow) {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.http.post<any>('/api/v1/attendance/clock-in', payload).subscribe({
          next: (res) => {
            this.isClockedIn.set(true);
            this.clockInTime.set(formattedTime);
            this.clockDurationSeconds.set(0);
            this.saveClockState(formattedTime, undefined);

            if (!this.timerInterval) {
              this.timerInterval = setInterval(() => {
                this.clockDurationSeconds.update(s => s + 1);
              }, 1000);
            }
            this.loadTodayAttendance();
            this.loadAttendance();
            this.isPunchLoading.set(false);
          },
          error: (err) => {
            this.isPunchLoading.set(false);
            const errMsg = err?.error?.message || err?.error?.error || 'Failed to clock in. Please try again.';
            this.notify.showAlert(errMsg, 'Clock In Restricted', 'error');
          }
        });
      } else {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }

        this.http.post<any>('/api/v1/attendance/clock-out', payload).subscribe({
          next: (res) => {
            let timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            if (res && res.time) {
              const dt = this.parseDateTime(res.time);
              if (dt) {
                timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }
            }
            this.isClockedIn.set(false);
            this.clockOutTimeSignal.set(timeStr);
            this.saveClockState(this.clockInTime() || undefined, timeStr);
            this.loadTodayAttendance();
            this.loadAttendance();
            this.isPunchLoading.set(false);
          },
          error: (err) => {
            this.isPunchLoading.set(false);
            const errMsg = err?.error?.message || err?.error?.error || 'Failed to clock out. Please try again.';
            this.notify.showAlert(errMsg, 'Clock Out Restricted', 'error');
          }
        });
      }
    }).catch(geoError => {
      this.isPunchLoading.set(false);
      this.notify.showAlert(geoError, 'Location Required', 'error');
    });
  }

  // Employee Leave & WFH Report APIs
  searchEmployees(query: string): Observable<EmployeeSearchResult[]> {
    return this.http.get<EmployeeSearchResult[]>(`/api/v1/leaves/employee-search?query=${encodeURIComponent(query)}`);
  }

  getEmployeeLeaveWfhSummary(employeeId: number | string, year?: number, month?: number): Observable<EmployeeLeaveWfhSummary> {
    let url = `/api/v1/leaves/employee-summary/${employeeId}`;
    const params: string[] = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<EmployeeLeaveWfhSummary>(url);
  }

  updateEmployeeDayStatus(payload: {
    employeeId: number | string;
    date: string;
    status: string;
    leaveTypeId?: number;
    reason?: string;
  }): Observable<any> {
    return this.http.put<any>('/api/v1/leaves/employee-status', payload).pipe(
      catchError(err => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to update day status.';
        this.notify.showAlert(msg);
        return of(null);
      })
    );
  }



}
