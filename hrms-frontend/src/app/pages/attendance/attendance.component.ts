import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
}

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

  ngOnInit() {
    this.hrms.loadTodayAttendance();
    this.hrms.loadAttendance();
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

      const attRecord = records.find(r => r.date === dateStr);
      const regReq = regRequests.find(r => r.date === dateStr && r.status !== 'Cancelled');

      let status: AttendanceStatus = isWeekend ? 'Week Off' : 'Absent';
      let checkIn = '--';
      let checkOut = '--';
      let totalHours = '--';
      let isLocked = false;
      let regStatus: RegularizationStatus | undefined = regReq?.status || (attRecord?.regularizationStatus as any);

      if (attRecord) {
        status = attRecord.status;
        checkIn = attRecord.clockIn || '--';
        checkOut = attRecord.clockOut || '--';
        totalHours = attRecord.totalHours || '--';
        isLocked = attRecord.isLocked || false;
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

      // Check regularization eligibility rules (Admin cannot self-regularize)
      const isAdminUser = this.auth.currentRole() === 'Admin';
      const isPastOrToday = dateStr <= todayStr;
      const canReg = !isAdminUser && isPastOrToday && !isWeekend && status !== 'Leave' && status !== 'Week Off' && status !== 'Holiday' && !isLocked && regStatus !== 'Pending' && regStatus !== 'Approved' && regStatus !== 'Rejected';

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
        canRegularize: canReg
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
      alert('Administrators do not submit self-regularization requests. Use the Regularization Panel to review and approve employee/HR requests.');
      return;
    }
    if (cell?.regularizationStatus === 'Rejected') {
      alert('A regularization request for this date was rejected and cannot be resubmitted.');
      return;
    }
    const dateToUse = cell?.dateStr || new Date().toISOString().split('T')[0];
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
      alert('Administrators do not submit self-regularization requests.');
      return;
    }
    if (!this.regForm.attendanceDate || !this.regForm.requestedClockInTime || !this.regForm.requestedClockOutTime || !this.regForm.reason) {
      alert('Please fill all mandatory regularization fields (Date, Clock In, Clock Out, and Reason).');
      return;
    }

    const existingReq = this.hrms.regularizationRequests().find(r => r.date === this.regForm.attendanceDate);
    if (existingReq?.status === 'Rejected') {
      alert('A regularization request for this date was rejected and cannot be resubmitted.');
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

  cancelRequest(id: string) {
    if (confirm('Are you sure you want to cancel this regularization request?')) {
      this.hrms.cancelRegularizationRequest(id);
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
      alert('Please enter rejection remarks.');
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
    return this.auth.hasPermission('ATTENDANCE_REGULARIZATION_APPROVE') || this.auth.hasPermission('ATTENDANCE_UPDATE') || this.auth.currentRole() === 'Admin' || this.auth.currentRole() === 'HR Manager';
  }

  // Filters for Admin / HR Panel
  filterStatus = signal<string>('Pending');
  filterDepartment = signal<string>('All');
  searchQuery = signal<string>('');

  filteredRegularizations = computed(() => {
    let list = this.hrms.regularizationRequests().filter(r => r.status === 'Pending');

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
      return all;
    }

    return all.filter(r =>
      r.employeeId === user.id ||
      r.employeeCode === user.employeeId ||
      r.employeeId === user.employeeId ||
      (r.employeeName && user.name && r.employeeName.toLowerCase().includes(user.name.toLowerCase()))
    );
  });

  pendingApprovals = computed(() => {
    return this.hrms.regularizationRequests().filter(r => r.status === 'Pending');
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

  totalHoursWorked = computed(() => {
    let total = 0;
    this.calendarGrid().forEach(cell => {
      if (!cell.otherMonth && cell.totalHours && cell.totalHours !== '--') {
        const val = parseFloat(cell.totalHours.replace(/[^\d.]/g, ''));
        if (!isNaN(val) && (cell.status === 'Present' || cell.status === 'Half Day' || cell.status === 'WFH' || cell.regularizationStatus === 'Approved')) {
          total += val;
        }
      }
    });
    return total.toFixed(1);
  });
}
