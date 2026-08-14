import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { ToastService } from './toast.service';
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
  RegularizationStatus
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
  private toastService = inject(ToastService);



  private restoreClockState() {
    const today = this.getTodayStr();
    const storedDate = localStorage.getItem('hrms_today_date');
    if (storedDate === today) {
      const savedIn = localStorage.getItem('hrms_today_clock_in');
      const savedOut = localStorage.getItem('hrms_today_clock_out');
      if (savedIn) {
        this.clockInTime.set(savedIn);
        this.isClockedIn.set(!savedOut);
      }
      if (savedOut) {
        this.clockOutTimeSignal.set(savedOut);
      }
    } else if (storedDate) {
      localStorage.removeItem('hrms_today_date');
      localStorage.removeItem('hrms_today_clock_in');
      localStorage.removeItem('hrms_today_clock_out');
    }
  }

  private saveClockState(inTime?: string, outTime?: string) {
    const today = this.getTodayStr();
    localStorage.setItem('hrms_today_date', today);
    if (inTime) localStorage.setItem('hrms_today_clock_in', inTime);
    if (outTime) localStorage.setItem('hrms_today_clock_out', outTime);
  }

  // State Signals
  employees = signal<Employee[]>([]);
  attendanceRecords = signal<AttendanceRecord[]>([]);
  leaveRequests = signal<LeaveRequest[]>([]);
  leaveTypes = signal<LeaveTypeItem[]>([]);
  leaveBalances = signal<EmployeeLeaveBalanceDetail[]>([]);
  pendingLeaveApprovals = signal<LeaveRequest[]>([]);
  approvedRejectedLeaves = signal<LeaveRequest[]>([]);
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

  // Computed today's attendance record from backend API
  todayRecord = computed(() => {
    const today = this.getTodayStr();
    const matches = this.attendanceRecords().filter(a => a.date === today);
    if (matches.length === 0) return undefined;
    return matches[matches.length - 1];
  });

  todayAttendanceState = signal<{
    clockIn: string;
    clockOut: string;
    isClockedIn: boolean;
    isClockedOut: boolean;
  }>({
    clockIn: '',
    clockOut: '',
    isClockedIn: false,
    isClockedOut: false
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
    const apiSummary = this.dashboardSummary().pendingLeaves;
    const myPending = this.leaveRequests().filter(l => l.status === 'Pending' || l.status === 'PENDING').length;
    const approverPending = this.pendingLeaveApprovals().filter(l => l.status === 'Pending' || l.status === 'PENDING').length;
    return Math.max(apiSummary, myPending, approverPending);
  });

  pendingTimesheetsCount = computed(() => this.timesheets().filter(t => t.status === 'Submitted').length);
  totalEmployeesCount = computed(() => Math.max(this.dashboardSummary().totalEmployees, this.employees().length));
  onLeaveTodayCount = computed(() => this.attendanceRecords().filter(a => a.status === 'Leave').length);

  constructor() {
    this.restoreClockState();
    this.refreshAllData();
  }

  refreshAllData() {
    this.loadDashboardSummary();
    this.loadTodayAttendance();
    this.loadAttendance();
    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadPendingLeaveApprovals();
    this.loadHolidays();
    this.loadRegularizations();
  }

  clearState() {
    this.employees.set([]);
    this.attendanceRecords.set([]);
    this.leaveRequests.set([]);
    this.pendingLeaveApprovals.set([]);
    this.approvedRejectedLeaves.set([]);
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
      if (res && res.hasRecord) {
        const inStr = res.clockInFormatted || '';
        const outStr = res.clockOutFormatted || '';
        const inState = !!res.isClockedIn;
        const outState = !!res.isClockedOut;

        this.todayAttendanceState.set({
          clockIn: inStr,
          clockOut: outStr,
          isClockedIn: inState,
          isClockedOut: outState
        });

        if (inStr) this.clockInTime.set(inStr);
        if (outStr) this.clockOutTimeSignal.set(outStr);
        this.isClockedIn.set(inState);

        const today = this.getTodayStr();
        localStorage.setItem('hrms_today_date', today);
        if (inStr) localStorage.setItem('hrms_today_clock_in', inStr);
        if (outStr) localStorage.setItem('hrms_today_clock_out', outStr);
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
        leaveBalance: { casual: 10, sick: 7, paid: 15, wfh: 8 }
      }));

      this.employees.set(mapped.length > 0 ? mapped : this.getFallbackEmployees());
    });
  }

  addEmployee(newEmp: any): Observable<any> {
    return this.http.post<any>('/api/v1/employees', {
      employeeCode: newEmp.employeeCode || `EMP-00${this.employees().length + 1}`,
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
      emergencyContact1: newEmp.emergencyContact1,
      emergencyContact2: newEmp.emergencyContact2,
      photoUrl: newEmp.photoUrl,
      hasGap: newEmp.hasGap,
      gapReason: newEmp.hasGap ? newEmp.gapReason : '',
      referenceDetails: newEmp.referenceDetails
    }).pipe(
      tap(() => {
        this.loadEmployees();
      })
    );
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

  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`/api/v1/employees/${id}`).pipe(
      tap(() => {
        this.loadEmployees();
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
          if (a.status === 'LATE') statusStr = 'Present';
          else if (a.status === 'HALF_DAY') statusStr = 'Half Day';
          else if (a.status === 'ABSENT') statusStr = 'Absent';
          else if (a.status === 'LEAVE') statusStr = 'Leave';
          else if (a.status === 'HOLIDAY') statusStr = 'Holiday';
          else if (a.status === 'WEEKEND') statusStr = 'Week Off';
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
        const msg = err?.error?.message || 'Failed to submit regularization request.';
        alert(msg);
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
        const msg = err?.error?.message || 'Failed to approve request.';
        alert(msg);
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
        const msg = err?.error?.message || 'Failed to reject request.';
        alert(msg);
        return of(null);
      })
    ).subscribe(() => {
      this.loadRegularizations();
      this.loadAttendance();
    });
  }

  // Leave API Integration
  loadLeaveTypes() {
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
      if (res && res.leaves) {
        if (res.leaveBalances) {
          // Convert BigDecimal values to numbers for proper display
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
        const mapped: LeaveRequest[] = res.leaves.map((l: any, idx: number) => ({
          id: l.id || idx + 1,
          employeeId: l.employeeId,
          employeeName: l.employeeName || res.employeeName || 'Employee',
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

        // Load approved/rejected leaves for HR/Admin users
        if (res.approvedRejectedLeaves) {
          const mappedApprovedRejected: LeaveRequest[] = res.approvedRejectedLeaves.map((l: any, idx: number) => ({
            id: l.id || idx + 1,
            employeeId: l.employeeId,
            employeeName: l.employeeName || 'Employee',
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
          this.approvedRejectedLeaves.set(mappedApprovedRejected);
        }
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

  loadPendingLeaveApprovals() {
    // Restrict this API call to HR and ADMIN roles only
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      try {
        const user = JSON.parse(userInfoStr);
        const role = (user?.role || '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'HR' && role !== 'HR MANAGER') {
          return;
        }
      } catch (e) {
        return;
      }
    } else {
      return;
    }

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
        this.toastService.showError(msg);
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
        this.toastService.showError(msg);
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
        this.toastService.showError(msg);
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
        this.toastService.showError(msg);
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
  loadHolidays() {
    this.http.get<any[]>('/api/v1/holidays').pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const mapped: Holiday[] = data
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
          .filter(h => h.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date));

        this.holidays.set(mapped);
      } else {
        this.holidays.set([]);
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

    const onLeaveOrWfh = leaves.some(l => {
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
    if (this.isOnLeaveOrWfhToday()) {
      alert('Clock In and Clock Out are disabled for today because you are on approved Work From Home (WFH) or Leave.');
      return;
    }
    if (this.isClockedOutToday()) {
      return;
    }
    if (!this.isClockedInComputed()) {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.isClockedIn.set(true);
      this.clockInTime.set(formattedTime);
      this.clockDurationSeconds.set(0);
      this.saveClockState(formattedTime, undefined);

      this.http.post('/api/v1/attendance/clock-in', {}).pipe(catchError(() => of(null))).subscribe(() => {
        this.loadTodayAttendance();
        this.loadAttendance();
      });

      if (!this.timerInterval) {
        this.timerInterval = setInterval(() => {
          this.clockDurationSeconds.update(s => s + 1);
        }, 1000);
      }
    } else {
      this.isClockedIn.set(false);
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.http.post<any>('/api/v1/attendance/clock-out', {}).pipe(catchError(() => of(null))).subscribe((res) => {
        let timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (res && res.time) {
          const dt = this.parseDateTime(res.time);
          if (dt) {
            timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          }
        }
        this.clockOutTimeSignal.set(timeStr);
        this.saveClockState(this.clockInTime() || undefined, timeStr);
        this.loadTodayAttendance();
        this.loadAttendance();
      });
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
