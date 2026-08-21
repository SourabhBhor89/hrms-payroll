import { Component, inject, signal, computed, OnInit, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceRecord, AttendanceStatus, RegularizationRequest, RegularizationStatus } from '../../core/models/hrms.model';

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  otherMonth?: boolean;
  isToday?: boolean;
  isWeekend?: boolean;
  status?: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  totalHours?: string;
  isLocked?: boolean;
  regularizationStatus?: RegularizationStatus;
  regularizationReason?: string;
  canRegularize?: boolean;
  holidayTitle?: string;
  holidayDescription?: string;
  holidayType?: string;
}

import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent implements OnInit {
  hrms = inject(HrmsService);
  auth = inject(AuthService);
  notify = inject(NotificationService);

  ngOnInit() {
    this.hrms.loadTodayAttendance();
    this.hrms.loadAttendance();
    this.hrms.loadRegularizations();
    if (this.auth.currentRole() === 'Admin' || this.auth.currentRole() === 'HR Manager' || this.auth.currentRole() === 'Manager') {
      this.hrms.loadDashboardSummary();
    }
    this.hrms.loadLeaves();
    this.hrms.loadHolidays();
  }

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Today's punch state
  isCheckedIn = signal<boolean>(false);
  checkInTime = signal<string>('');
  checkOutTime = signal<string>('');
  todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Month navigation
  currentMonth = signal<number>(new Date().getMonth()); // 0-indexed
  currentYear = signal<number>(new Date().getFullYear());

  get monthLabel(): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[this.currentMonth()]} ${this.currentYear()}`;
  }

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(this.currentYear() - 1);
    } else {
      this.currentMonth.set(this.currentMonth() - 1);
    }
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(this.currentYear() + 1);
    } else {
      this.currentMonth.set(this.currentMonth() + 1);
    }
  }

  // Dynamic calendar cells matrix
  calendarGrid = computed<CalendarDayCell[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1; // Mon=0, Sun=6
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const todayStr = new Date().toISOString().split('T')[0];
    const records = this.hrms.attendanceRecords();
    const regRequests = this.hrms.regularizationRequests();
    const companyHolidays = this.hrms.holidays();

    const cells: CalendarDayCell[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      cells.push({
        dateStr: '',
        dayNumber: pDay,
        otherMonth: true
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;

      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      const currentUser = this.auth.currentUser();
      const emp = this.currentEmployee();

      const isMatchingRecord = (rEmpId: any, rCode: any, rName: any) => {
        if (emp) {
          if (rEmpId != null && (String(rEmpId) === String(emp.id) || String(rEmpId) === String(emp.userId))) return true;
          if (rCode != null && emp.employeeId != null && String(rCode).toLowerCase() === String(emp.employeeId).toLowerCase()) return true;
          if (rName != null && emp.name != null && String(rName).toLowerCase().trim() === String(emp.name).toLowerCase().trim()) return true;
        }
        if (currentUser) {
          if (rEmpId != null && String(rEmpId) === String(currentUser.id)) return true;
          if (currentUser.employeeId != null && (String(rEmpId) === String(currentUser.employeeId) || String(rCode).toLowerCase() === String(currentUser.employeeId).toLowerCase())) return true;
          if (currentUser.name != null && String(rName).toLowerCase().trim() === String(currentUser.name).toLowerCase().trim()) return true;
        }
        return false;
      };

      const attRecord = records.find(r => r.date === dateStr && isMatchingRecord(r.employeeId, r.employeeCode, r.employeeName));
      const regReq = regRequests.find(r => r.date === dateStr && r.status !== 'Cancelled' && isMatchingRecord(r.employeeId, r.employeeCode, r.employeeName));

      const matchingHoliday = companyHolidays.find(h => h.date === dateStr);

      const isPastOrToday = dateStr <= todayStr;
      let status: AttendanceStatus = isWeekend ? 'Week Off' : (matchingHoliday ? 'Holiday' : (isPastOrToday ? 'Absent' : ('' as any)));
      let checkIn = '--';
      let checkOut = '--';
      let totalHours = '--';
      let isLocked = false;
      let regStatus: RegularizationStatus | undefined = regReq?.status || (attRecord?.regularizationStatus as any);

      if (attRecord && !isWeekend) {
        status = attRecord.status;
        checkIn = attRecord.clockIn || '--';
        checkOut = attRecord.clockOut || '--';
        totalHours = attRecord.totalHours || '--';
        isLocked = attRecord.isLocked || false;
      }

      // Merge live today clock state if applicable
      const liveState = this.hrms.todayAttendanceState();
      if (dateStr === todayStr && (liveState.isClockedIn || liveState.clockIn)) {
        if (!attRecord || status === 'Absent' || status === 'Holiday' || status === 'Week Off') {
          status = 'Present';
        }
        if (checkIn === '--' && liveState.clockIn) {
          checkIn = liveState.clockIn;
        }
        if (checkOut === '--' && liveState.clockOut) {
          checkOut = liveState.clockOut;
        }
        if (totalHours === '--') {
          totalHours = this.getWorkDuration();
        }
      }

      // Fallback hours calculation from checkIn and checkOut if totalHours is missing
      if (totalHours === '--' && checkIn !== '--' && checkOut !== '--') {
        const todayTmp = new Date().toISOString().split('T')[0];
        const inDate = new Date(`${todayTmp} ${checkIn}`);
        const outDate = new Date(`${todayTmp} ${checkOut}`);
        const diff = outDate.getTime() - inDate.getTime();
        if (!isNaN(diff) && diff > 0) {
          const hoursNum = diff / 3600000;
          totalHours = `${hoursNum.toFixed(1)} hrs`;
        }
      }

      // Check if logged-in user has an approved leave / WFH application for dateStr
      const matchingLeave = this.hrms.leaveRequests().find(l => {
        const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
        if (!isApproved || !l.startDate || !l.endDate) return false;

        const isMyLeave = isMatchingRecord(l.employeeId, l.employeeCode, l.employeeName);
        if (!isMyLeave) return false;

        const s = l.startDate.split('T')[0];
        const e = l.endDate.split('T')[0];
        return s <= dateStr && dateStr <= e;
      });

      let hasApprovedLeaveOrWfh = false;
      if (matchingLeave && !isWeekend) {
        hasApprovedLeaveOrWfh = true;
        const isWfh = (matchingLeave.leaveTypeCode && matchingLeave.leaveTypeCode.toUpperCase() === 'WFH') ||
          (matchingLeave.leaveType && matchingLeave.leaveType.toLowerCase().includes('work from home')) ||
          (matchingLeave.leaveTypeName && matchingLeave.leaveTypeName.toLowerCase().includes('work from home'));
        status = isWfh ? 'WFH' : 'Leave';
      }

      if (matchingHoliday && !isWeekend && (!attRecord || attRecord.status === 'Holiday' || (attRecord.status as string) === 'HOLIDAY' || (!attRecord.clockIn && !hasApprovedLeaveOrWfh))) {
        status = 'Holiday';
      }

      if (isWeekend) {
        status = 'Week Off';
      }

      // If regularization is approved, the attendance status for this date is Present
      if (regStatus === 'Approved') {
        status = 'Present';
        if (checkIn === '--' && regReq) {
          checkIn = regReq.requestedClockIn || regReq.checkIn || '10:00 AM';
        }
        if (checkOut === '--' && regReq) {
          checkOut = regReq.requestedClockOut || regReq.checkOut || '07:00 PM';
        }
        if (totalHours === '--') {
          totalHours = regReq ? `${regReq.requestedWorkingHours || 9.0} hrs` : '9.0 hrs';
        }
      }

      // Check regularization eligibility rules (Admin cannot self-regularize; Present, WFH, Leave, Holiday, or Admin-locked days cannot be regularized)
      const isAdminUser = this.auth.currentRole() === 'Admin';
      const minDate = this.minAllowedRegularizationDate();
      const isBeforeMinDate = dateStr < minDate;
      const isPresentDay = (status as string) === 'Present' || (status as string) === 'PRESENT';
      const canReg = !isAdminUser && isPastOrToday && !isWeekend && !hasApprovedLeaveOrWfh && !isPresentDay && (status as string) !== 'Leave' && (status as string) !== 'WFH' && (status as string) !== 'Week Off' && (status as string) !== 'Holiday' && !isLocked && regStatus !== 'Pending' && regStatus !== 'Approved' && regStatus !== 'Rejected' && !isBeforeMinDate;

      cells.push({
        dateStr,
        dayNumber: d,
        isToday: dateStr === todayStr,
        isWeekend,
        status,
        checkIn,
        checkOut,
        totalHours,
        isLocked,
        regularizationStatus: regStatus,
        regularizationReason: regReq?.reason,
        canRegularize: canReg,
        holidayTitle: matchingHoliday?.title,
        holidayDescription: matchingHoliday?.description,
        holidayType: matchingHoliday?.type
      });
    }

    // Next month padding
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        dateStr: '',
        dayNumber: i,
        otherMonth: true
      });
    }

    return cells;
  });

  checkIn() {
    this.hrms.toggleClockIn();
  }

  checkOut() {
    this.hrms.toggleClockIn();
  }

  getWorkDuration(): string {
    const inStr = this.hrms.todayClockInTime();
    if (!inStr || inStr === '--') return '--';
    const outStr = this.hrms.todayClockOutTime();
    const todayStr = new Date().toISOString().split('T')[0];
    const inTime = new Date(`${todayStr} ${inStr}`);
    const outTime = (outStr && outStr !== '--') ? new Date(`${todayStr} ${outStr}`) : new Date();
    const diffMs = outTime.getTime() - inTime.getTime();
    if (isNaN(diffMs) || diffMs < 0) return '--';
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  }

  getBadgeClass(status?: AttendanceStatus): string {
    switch (status) {
      case 'Present': return 'badge-success';
      case 'WFH': return 'badge-info';
      case 'Half Day': return 'badge-warning';
      case 'Leave': return 'badge-warning';
      case 'Holiday': return 'badge-purple';
      case 'Week Off': return 'badge-secondary';
      default: return 'badge-danger';
    }
  }

  hoveredCell = signal<CalendarDayCell | null>(null);

  setHoveredCell(cell: CalendarDayCell | null) {
    if (cell && !cell.otherMonth) {
      this.hoveredCell.set(cell);
    } else {
      this.hoveredCell.set(null);
    }
  }

  currentEmployee = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return null;
    const employees = this.hrms.employees();
    if (!employees || employees.length === 0) return null;

    const userEmail = (user.email || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();
    const userCode = (user.employeeId || '').toLowerCase().trim();
    const userId = String(user.id || '').trim();

    return employees.find(e =>
      (userEmail && e.email && e.email.toLowerCase().trim() === userEmail) ||
      (userName && e.name && e.name.toLowerCase().trim() === userName) ||
      (userId && e.userId && String(e.userId) === userId) ||
      (userCode && e.employeeId && e.employeeId.toLowerCase().trim() === userCode) ||
      (userId && String(e.id) === userId)
    ) || null;
  });

  minAllowedRegularizationDate = computed(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    const mondayStr = `${yyyy}-${mm}-${dd}`;

    const emp = this.currentEmployee();
    const joiningDateStr = emp?.joinDate;

    if (joiningDateStr && joiningDateStr > mondayStr) {
      return joiningDateStr;
    }
    return mondayStr;
  });

  maxAllowedRegularizationDate = computed(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Regularization Modal State
  showRegModal = signal<boolean>(false);
  regForm = {
    attendanceDate: new Date().toISOString().split('T')[0],
    correctionType: 'BOTH',
    requestedClockInTime: '10:00',
    requestedClockOutTime: '19:00',
    reason: '',
    attachmentUrl: ''
  };

  openRegModal(cell?: CalendarDayCell) {
    if (this.auth.currentRole() === 'Admin') {
      this.notify.showAlert('Administrators do not submit self-regularization requests. Use the Regularization Panel to review and approve employee/HR requests.');
      return;
    }
    if (cell?.regularizationStatus === 'Rejected') {
      this.notify.showAlert('A regularization request for this date was rejected and cannot be resubmitted.');
      return;
    }
    const minDate = this.minAllowedRegularizationDate();
    const maxDate = this.maxAllowedRegularizationDate();
    if (cell?.dateStr) {
      if (cell.dateStr < minDate) {
        this.notify.showAlert(`Regularization requests can only be submitted for the current week (from ${minDate} onwards).`);
        return;
      }
      if (cell.dateStr > maxDate) {
        this.notify.showAlert('Cannot submit regularization for future dates.');
        return;
      }
    }
    let dateToUse = cell?.dateStr || new Date().toISOString().split('T')[0];
    if (dateToUse < minDate) {
      dateToUse = minDate;
    } else if (dateToUse > maxDate) {
      dateToUse = maxDate;
    }
    this.regForm = {
      attendanceDate: dateToUse,
      correctionType: 'BOTH',
      requestedClockInTime: '10:00',
      requestedClockOutTime: '19:00',
      reason: '',
      attachmentUrl: ''
    };
    this.showRegModal.set(true);
  }

  submitRegRequest() {
    if (this.auth.currentRole() === 'Admin') {
      this.notify.showAlert('Administrators do not submit self-regularization requests.');
      return;
    }
    if (!this.regForm.attendanceDate || !this.regForm.requestedClockInTime || !this.regForm.requestedClockOutTime || !this.regForm.reason) {
      this.notify.showAlert('Please fill all mandatory regularization fields (Date, Clock In, Clock Out, and Reason).');
      return;
    }

    const minDate = this.minAllowedRegularizationDate();
    const maxDate = this.maxAllowedRegularizationDate();

    if (this.regForm.attendanceDate < minDate) {
      this.notify.showAlert(`Regularization requests can only be submitted for the current week (from ${minDate} onwards).`);
      return;
    }
    if (this.regForm.attendanceDate > maxDate) {
      this.notify.showAlert('Cannot submit regularization for future dates.');
      return;
    }

    const existingReq = this.hrms.regularizationRequests().find(r => r.date === this.regForm.attendanceDate);
    if (existingReq?.status === 'Rejected') {
      this.notify.showAlert('A regularization request for this date was rejected and cannot be resubmitted.');
      return;
    }

    // Validate requested duration (Max 9 hours)
    const [inH, inM] = this.regForm.requestedClockInTime.split(':').map(Number);
    const [outH, outM] = this.regForm.requestedClockOutTime.split(':').map(Number);
    const inMinutes = inH * 60 + (inM || 0);
    const outMinutes = outH * 60 + (outM || 0);
    const durationMinutes = outMinutes - inMinutes;

    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      this.notify.showAlert('Requested Clock Out time must be after Clock In time on the same day.');
      return;
    }

    if (durationMinutes > 9 * 60) {
      const requestedHrs = (durationMinutes / 60).toFixed(1);
      const inFormatted = this.formatTime12h(this.regForm.requestedClockInTime);
      const outFormatted = this.formatTime12h(this.regForm.requestedClockOutTime);
      this.notify.showAlert(`Regularization duration cannot exceed 9 hours per day. Requested duration: ${requestedHrs} hours (${inFormatted} to ${outFormatted}).`);
      return;
    }

    const payload = {
      attendanceDate: this.regForm.attendanceDate,
      correctionType: this.regForm.correctionType,
      requestedClockIn: `${this.regForm.attendanceDate}T${this.regForm.requestedClockInTime}:00`,
      requestedClockOut: `${this.regForm.attendanceDate}T${this.regForm.requestedClockOutTime}:00`,
      reason: this.regForm.reason,
      attachmentUrl: this.regForm.attachmentUrl
    };

    this.hrms.createRegularizationPayload(payload).subscribe((res) => {
      if (res) {
        this.showRegModal.set(false);
        this.hrms.refreshAllData();
      }
    });
  }

  formatTime12h(time24: string): string {
    if (!time24 || !time24.includes(':')) return time24;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = (mStr || '00').padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }

  // Cancel Modal State
  showCancelConfirmModal = signal<boolean>(false);
  reqToCancel = signal<RegularizationRequest | null>(null);

  openCancelModal(req: RegularizationRequest) {
    this.reqToCancel.set(req);
    this.showCancelConfirmModal.set(true);
  }

  cancelRequest(id: string) {
    const req = this.myRegularizations().find(r => r.id === id) || null;
    if (req) {
      this.openCancelModal(req);
    } else {
      this.reqToCancel.set({ id } as any);
      this.showCancelConfirmModal.set(true);
    }
  }

  proceedCancelRequest() {
    const req = this.reqToCancel();
    if (req && req.id) {
      this.hrms.cancelRegularizationRequest(req.id);
      this.showCancelConfirmModal.set(false);
      this.reqToCancel.set(null);
    }
  }

  // Review Modal State (Admin / HR)
  showReviewModal = signal<boolean>(false);
  reviewAction = signal<'APPROVE' | 'REJECT'>('APPROVE');
  selectedReq = signal<RegularizationRequest | null>(null);
  reviewRemarks = '';

  openReviewModal(req: RegularizationRequest, action: 'APPROVE' | 'REJECT') {
    this.selectedReq.set(req);
    this.reviewAction.set(action);
    this.reviewRemarks = action === 'APPROVE' ? 'Approved by Manager' : '';
    this.showReviewModal.set(true);
  }

  submitReview() {
    const req = this.selectedReq();
    if (!req) return;

    if (this.reviewAction() === 'REJECT' && !this.reviewRemarks.trim()) {
      this.notify.showAlert('Please enter rejection remarks.');
      return;
    }

    if (this.reviewAction() === 'APPROVE') {
      this.hrms.approveRegularizationRequest(req.id, this.reviewRemarks);
    } else {
      this.hrms.rejectRegularizationRequest(req.id, this.reviewRemarks);
    }

    this.showReviewModal.set(false);
  }

  canApproveRequests(): boolean {
    const isCoordinator = this.auth.currentRole() === 'Coordinator';
    const hasReadOnly = this.auth.hasPermission('ATTENDANCE_READ_ONLY');
    
    // Coordinators with read-only permission cannot approve requests
    if (isCoordinator && hasReadOnly) return false;
    
    // Admins, HR Managers, and Managers can approve requests
    if (this.auth.currentRole() === 'Admin' || 
        this.auth.currentRole() === 'HR Manager' || 
        this.auth.currentRole() === 'Manager') {
      return true;
    }
    
    // Users with specific permissions can approve requests
    return this.auth.hasPermission('ATTENDANCE_REGULARIZATION_APPROVE') || 
           this.auth.hasPermission('ATTENDANCE_REGULARIZATION_VIEW_ALL') || 
           this.auth.hasPermission('ATTENDANCE_UPDATE');
  }

  isReadOnly(): boolean {
    return this.auth.hasPermission('ATTENDANCE_READ_ONLY');
  }

  // Filters for Admin / HR Panel
  activePanelTab = signal<'Pending' | 'Rejected'>('Pending');
  filterDepartment = signal<string>('All');
  searchQuery = signal<string>('');

  panelCurrentPage = signal<number>(1);
  pageSize = 10;

  paginatedPanelRegularizations = computed(() => {
    const list = this.filteredRegularizations();
    const start = (this.panelCurrentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  getPanelPages = computed(() => {
    const total = this.filteredRegularizations().length;
    const totalPages = Math.ceil(total / this.pageSize);
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  });

  totalPanelPages = computed(() => {
    return Math.ceil(this.filteredRegularizations().length / this.pageSize);
  });

  goToPanelPage(page: number) {
    const total = this.totalPanelPages();
    if (page >= 1 && page <= total) {
      this.panelCurrentPage.set(page);
    }
  }

  // History pagination
  historyCurrentPage = signal<number>(1);

  paginatedMyRegularizations = computed(() => {
    const list = this.myRegularizations();
    const start = (this.historyCurrentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  getHistoryPages = computed(() => {
    const total = this.myRegularizations().length;
    const totalPages = Math.ceil(total / this.pageSize);
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  });

  totalHistoryPages = computed(() => {
    return Math.ceil(this.myRegularizations().length / this.pageSize);
  });

  goToHistoryPage(page: number) {
    const total = this.totalHistoryPages();
    if (page >= 1 && page <= total) {
      this.historyCurrentPage.set(page);
    }
  }

  constructor() {
    effect(() => {
      this.activePanelTab();
      this.filterDepartment();
      this.searchQuery();
      untracked(() => {
        this.panelCurrentPage.set(1);
      });
    });
  }

  pendingRegularizationsCount = computed(() => {
    return this.hrms.regularizationRequests().filter(r => r.status === 'Pending').length;
  });

  rejectedRegularizationsCount = computed(() => {
    return this.hrms.regularizationRequests().filter(r => r.status === 'Rejected').length;
  });

  filteredRegularizations = computed(() => {
    const targetStatus = this.activePanelTab();
    let list = this.hrms.regularizationRequests().filter(r => r.status === targetStatus);

    const dept = this.filterDepartment();
    if (dept !== 'All') {
      list = list.filter(r => r.department === dept);
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(r =>
        r.employeeName.toLowerCase().includes(query) ||
        (r.employeeCode && r.employeeCode.toLowerCase().includes(query)) ||
        r.date.includes(query)
      );
    }

    return list;
  });

  myRegularizations = computed(() => {
    const user = this.auth.currentUser();
    const isEmployeeView = !this.canApproveRequests();
    const all = this.hrms.regularizationRequests();

    if (!user) return [];

    if (isEmployeeView) {
      return all.filter(r =>
        r.employeeId === user.id ||
        r.employeeCode === user.employeeId ||
        r.employeeId === user.employeeId ||
        (r.employeeName && user.name && r.employeeName.toLowerCase().includes(user.name.toLowerCase()))
      );
    }

    return all;
  });

  pendingApprovals = computed(() => {
    return this.hrms.regularizationRequests().filter(r => r.status === 'Pending');
  });

  todayStr = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  presentTodayCount = computed(() => {
    const today = this.todayStr();
    const records = this.hrms.attendanceRecords();

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

    const liveClockState = this.hrms.todayAttendanceState();
    if (liveClockState.isClockedIn || liveClockState.clockIn) {
      const currentUser = this.auth.currentUser();
      if (currentUser) {
        const userKey = (currentUser.name || '').toLowerCase() || String(currentUser.id || '');
        if (userKey) uniqueEmpKeys.add(userKey);
      }
    }

    return uniqueEmpKeys.size;
  });

  wfhTodayCount = computed(() => {
    const today = this.todayStr();
    const records = this.hrms.attendanceRecords();
    const leaves = this.hrms.leaveRequests();

    const uniqueEmpIds = new Set<string>();

    records.forEach(r => {
      if (r.date === today) {
        const isWfhStatus = r.status === 'WFH' || (r.notes && r.notes.toLowerCase().includes('wfh'));
        if (isWfhStatus) {
          uniqueEmpIds.add(String(r.employeeId));
        }
      }
    });

    leaves.forEach(l => {
      const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
      const isWfhCategory = (l.leaveTypeCode && l.leaveTypeCode.toUpperCase() === 'WFH') ||
        (l.leaveType && l.leaveType.toLowerCase().includes('work from home')) ||
        (l.leaveTypeName && l.leaveTypeName.toLowerCase().includes('work from home'));

      if (isApproved && isWfhCategory && l.startDate && l.endDate) {
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

  leaveTodayCount = computed(() => {
    const today = this.todayStr();
    const records = this.hrms.attendanceRecords();
    const leaves = this.hrms.leaveRequests();

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

  daysPresentCount = computed(() => {
    return this.calendarGrid().filter(cell =>
      !cell.otherMonth && (cell.status === 'Present' || cell.status === 'Half Day' || cell.regularizationStatus === 'Approved')
    ).length;
  });

  wfhCount = computed(() => {
    return this.calendarGrid().filter(cell =>
      !cell.otherMonth && cell.status === 'WFH'
    ).length;
  });

  calculateCellHours(cell: CalendarDayCell): number {
    if (!cell || cell.otherMonth) return 0;

    if (cell.totalHours && cell.totalHours !== '--') {
      const str = cell.totalHours.trim();
      if (str.includes('h') && str.includes('m')) {
        const hMatch = str.match(/(\d+)\s*h/);
        const mMatch = str.match(/(\d+)\s*m/);
        const h = hMatch ? parseInt(hMatch[1], 10) : 0;
        const m = mMatch ? parseInt(mMatch[1], 10) : 0;
        return h + (m / 60);
      }
      const val = parseFloat(str.replace(/[^\d.]/g, ''));
      if (!isNaN(val) && val > 0 && val < 24) {
        return val;
      }
    }

    if (cell.checkIn && cell.checkIn !== '--') {
      const todayStr = new Date().toISOString().split('T')[0];
      const inTime = new Date(`${todayStr} ${cell.checkIn}`);
      let outTime: Date;
      if (cell.checkOut && cell.checkOut !== '--') {
        outTime = new Date(`${todayStr} ${cell.checkOut}`);
      } else if (cell.isToday) {
        outTime = new Date();
      } else {
        return 0;
      }
      const diffMs = outTime.getTime() - inTime.getTime();
      if (!isNaN(diffMs) && diffMs > 0) {
        return diffMs / (1000 * 60 * 60);
      }
    }

    return 0;
  }

  totalHoursWorked = computed(() => {
    let total = 0;
    this.calendarGrid().forEach(cell => {
      if (!cell.otherMonth && (cell.status === 'Present' || cell.status === 'Half Day' || cell.status === 'WFH' || cell.regularizationStatus === 'Approved')) {
        total += this.calculateCellHours(cell);
      }
    });
    return total.toFixed(1);
  });

  // Stat Card Detail Modal State
  showStatDetailModal = signal<boolean>(false);
  statDetailCategory = signal<'PRESENT' | 'WFH' | 'LEAVE'>('PRESENT');
  statDetailTitle = signal<string>('');

  openStatDetailModal(category: 'PRESENT' | 'WFH' | 'LEAVE') {
    if (this.auth.currentRole() !== 'Admin' && this.auth.currentRole() !== 'HR Manager' && this.auth.currentRole() !== 'Manager') {
      return;
    }
    this.statDetailCategory.set(category);
    if (category === 'PRESENT') {
      this.statDetailTitle.set('Employees Present Today');
    } else if (category === 'WFH') {
      this.statDetailTitle.set('Employees on Work From Home Today');
    } else if (category === 'LEAVE') {
      this.statDetailTitle.set('Employees on Leave Today');
    }
    this.showStatDetailModal.set(true);
  }

  closeStatDetailModal() {
    this.showStatDetailModal.set(false);
  }

  get statDetailEmployees(): Array<{
    id: string;
    name: string;
    code: string;
    avatar: string;
    department: string;
    designation: string;
    status: string;
    details: string;
  }> {
    const category = this.statDetailCategory();
    const today = this.todayStr();
    const records = this.hrms.attendanceRecords();
    const leaves = this.hrms.leaveRequests();
    const employees = this.hrms.employees();

    const empMap = new Map<string, any>();
    employees.forEach(e => {
      empMap.set(String(e.id), e);
      if (e.employeeId) empMap.set(String(e.employeeId), e);
    });

    const resultList: Array<{
      id: string;
      name: string;
      code: string;
      avatar: string;
      department: string;
      designation: string;
      status: string;
      details: string;
    }> = [];

    const addedEmpKeys = new Set<string>();

    const isEmpAlreadyAdded = (empId?: string | number, name?: string, code?: string): boolean => {
      if (empId && addedEmpKeys.has(String(empId))) return true;
      if (name && addedEmpKeys.has(name.toLowerCase())) return true;
      if (code && addedEmpKeys.has(code.toLowerCase())) return true;
      return false;
    };

    const registerEmpAdded = (empId?: string | number, name?: string, code?: string) => {
      if (empId) addedEmpKeys.add(String(empId));
      if (name) addedEmpKeys.add(name.toLowerCase());
      if (code) addedEmpKeys.add(code.toLowerCase());
    };

    if (category === 'PRESENT') {
      records.forEach(r => {
        if (r.date === today) {
          const isClockedIn = !!(r.clockIn && r.clockIn !== '--' && r.clockIn !== '');
          const isNotLeaveOrWfh = r.status !== 'Leave' && r.status !== 'WFH';

          const isPresent = isClockedIn && isNotLeaveOrWfh;

          if (isPresent && !isEmpAlreadyAdded(r.employeeId, r.employeeName, r.employeeCode)) {
            registerEmpAdded(r.employeeId, r.employeeName, r.employeeCode);
            const empInfo = empMap.get(String(r.employeeId));
            const inTime = r.clockIn && r.clockIn !== '--' ? `Clocked in at ${r.clockIn}` : 'Present';
            const outTime = r.clockOut && r.clockOut !== '--' ? ` (Clocked out at ${r.clockOut})` : '';
            resultList.push({
              id: String(r.employeeId),
              name: r.employeeName || empInfo?.name || 'Employee',
              code: empInfo?.employeeId || `EMP-00${r.employeeId}`,
              avatar: r.avatar || empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              department: empInfo?.department || 'Staff',
              designation: empInfo?.designation || 'Staff Member',
              status: r.status === 'Half Day' ? 'Half Day' : 'Present',
              details: `${inTime}${outTime}`
            });
          }
        }
      });

      const liveClockState = this.hrms.todayAttendanceState();
      if (liveClockState.isClockedIn || liveClockState.clockIn) {
        const currentUser = this.auth.currentUser();
        if (currentUser && !isEmpAlreadyAdded(currentUser.id, currentUser.name, currentUser.employeeId)) {
          registerEmpAdded(currentUser.id, currentUser.name, currentUser.employeeId);
          const empInfo = empMap.get(String(currentUser.id));
          const inTime = liveClockState.clockIn ? `Clocked in at ${liveClockState.clockIn}` : 'Present';
          const outTime = liveClockState.clockOut ? ` (Clocked out at ${liveClockState.clockOut})` : '';
          resultList.push({
            id: String(currentUser.id),
            name: currentUser.name || empInfo?.name || 'Employee',
            code: empInfo?.employeeId || currentUser.email?.split('@')[0] || `EMP-00${currentUser.id}`,
            avatar: empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: empInfo?.department || 'Staff',
            designation: empInfo?.designation || 'Staff Member',
            status: 'Present',
            details: `${inTime}${outTime}`
          });
        }
      }
    } else if (category === 'WFH') {
      records.forEach(r => {
        if (r.date === today && (r.status === 'WFH' || (r.notes && r.notes.toLowerCase().includes('wfh')))) {
          if (!isEmpAlreadyAdded(r.employeeId, r.employeeName, r.employeeCode)) {
            registerEmpAdded(r.employeeId, r.employeeName, r.employeeCode);
            const empInfo = empMap.get(String(r.employeeId));
            resultList.push({
              id: String(r.employeeId),
              name: r.employeeName || empInfo?.name || 'Employee',
              code: empInfo?.employeeId || `EMP-00${r.employeeId}`,
              avatar: r.avatar || empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              department: empInfo?.department || 'Staff',
              designation: empInfo?.designation || 'Staff Member',
              status: 'WFH',
              details: 'Approved Work From Home'
            });
          }
        }
      });

      leaves.forEach(l => {
        const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
        const isWfhCat = (l.leaveTypeCode && l.leaveTypeCode.toUpperCase() === 'WFH') ||
          (l.leaveType && l.leaveType.toLowerCase().includes('work from home')) ||
          (l.leaveTypeName && l.leaveTypeName.toLowerCase().includes('work from home'));

        if (isApproved && isWfhCat && l.startDate && l.endDate) {
          const s = l.startDate.split('T')[0];
          const e = l.endDate.split('T')[0];
          if (s <= today && today <= e && !isEmpAlreadyAdded(l.employeeId, l.employeeName, l.employeeCode)) {
            registerEmpAdded(l.employeeId, l.employeeName, l.employeeCode);
            const empInfo = empMap.get(String(l.employeeId));
            resultList.push({
              id: String(l.employeeId),
              name: l.employeeName || empInfo?.name || 'Employee',
              code: l.employeeCode || empInfo?.employeeId || `EMP-00${l.employeeId}`,
              avatar: l.employeeAvatar || empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              department: l.department || empInfo?.department || 'Staff',
              designation: empInfo?.designation || 'Staff Member',
              status: 'WFH',
              details: `Approved WFH (${s} to ${e})`
            });
          }
        }
      });
    } else if (category === 'LEAVE') {
      records.forEach(r => {
        if (r.date === today && r.status === 'Leave') {
          if (!isEmpAlreadyAdded(r.employeeId, r.employeeName, r.employeeCode)) {
            registerEmpAdded(r.employeeId, r.employeeName, r.employeeCode);
            const empInfo = empMap.get(String(r.employeeId));
            resultList.push({
              id: String(r.employeeId),
              name: r.employeeName || empInfo?.name || 'Employee',
              code: empInfo?.employeeId || `EMP-00${r.employeeId}`,
              avatar: r.avatar || empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              department: empInfo?.department || 'Staff',
              designation: empInfo?.designation || 'Staff Member',
              status: 'Leave',
              details: 'Approved Leave'
            });
          }
        }
      });

      leaves.forEach(l => {
        const isApproved = l.status === 'APPROVED' || l.status === 'Approved';
        const isWfhCat = (l.leaveTypeCode && l.leaveTypeCode.toUpperCase() === 'WFH') ||
                         (l.leaveType && l.leaveType.toLowerCase().includes('work from home')) ||
                         (l.leaveTypeName && l.leaveTypeName.toLowerCase().includes('work from home'));

        if (isApproved && !isWfhCat && l.startDate && l.endDate) {
          const s = l.startDate.split('T')[0];
          const e = l.endDate.split('T')[0];
          if (s <= today && today <= e && !isEmpAlreadyAdded(l.employeeId, l.employeeName, l.employeeCode)) {
            registerEmpAdded(l.employeeId, l.employeeName, l.employeeCode);
            const empInfo = empMap.get(String(l.employeeId));
            const leaveName = l.leaveTypeName || l.leaveType || 'Leave';
            resultList.push({
              id: String(l.employeeId),
              name: l.employeeName || empInfo?.name || 'Employee',
              code: l.employeeCode || empInfo?.employeeId || `EMP-00${l.employeeId}`,
              avatar: l.employeeAvatar || empInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              department: l.department || empInfo?.department || 'Staff',
              designation: empInfo?.designation || 'Staff Member',
              status: 'Leave',
              details: `Approved ${leaveName} (${s} to ${e})`
            });
          }
        }
      });
    }

    return resultList;
  }
}
