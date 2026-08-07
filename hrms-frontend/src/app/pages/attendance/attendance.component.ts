import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceStatus } from '../../core/models/hrms.model';

interface CalendarCell {
  dayNumber: number;
  otherMonth?: boolean;
  isToday?: boolean;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  isWeekend?: boolean;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Today's check-in / check-out state
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

  calendarCells: CalendarCell[] = [
    { dayNumber: 27, otherMonth: true },
    { dayNumber: 28, otherMonth: true },
    { dayNumber: 29, otherMonth: true },
    { dayNumber: 30, otherMonth: true },
    { dayNumber: 31, otherMonth: true },
    { dayNumber: 1, status: 'Weekend', checkIn: '09:02 AM', checkOut: '06:15 PM' },
    { dayNumber: 2, status: 'Weekend', checkIn: '08:55 AM', checkOut: '06:05 PM' },
    { dayNumber: 3, status: 'Present', checkIn: '09:10 AM', checkOut: '06:30 PM' },
    { dayNumber: 4, status: 'WFH', checkIn: '09:30 AM', checkOut: '07:00 PM' },
    { dayNumber: 5, status: 'Present', checkIn: '08:48 AM', checkOut: '06:00 PM' },
    { dayNumber: 6, status: 'Present', isToday: true, checkIn: '09:00 AM', checkOut: '' },
    { dayNumber: 7, status: 'Present', checkIn: '09:05 AM', checkOut: '06:20 PM' },
    { dayNumber: 8, status: 'Weekend', isWeekend: true },
    { dayNumber: 9, status: 'Weekend', isWeekend: true },
    { dayNumber: 10, status: 'Present', checkIn: '08:58 AM', checkOut: '06:10 PM' },
    { dayNumber: 11, status: 'Leave' },
    { dayNumber: 12, status: 'Present', checkIn: '09:15 AM', checkOut: '06:25 PM' },
    { dayNumber: 13, status: 'Present', checkIn: '09:00 AM', checkOut: '06:00 PM' },
    { dayNumber: 14, status: 'Present', checkIn: '08:50 AM', checkOut: '06:05 PM' },
    { dayNumber: 15, status: 'Weekend' },
    { dayNumber: 16, status: 'Weekend' },
    { dayNumber: 17, status: '' },
    { dayNumber: 18, status: '' },
    { dayNumber: 19, status: '' },
    { dayNumber: 20, status: '' },
    { dayNumber: 21, status: '' },
    { dayNumber: 22, status: '' },
    { dayNumber: 23, status: '' },
    { dayNumber: 24, status: '' },
    { dayNumber: 25, status: '' },
    { dayNumber: 26, status: '' },
    { dayNumber: 27, status: '' },
    { dayNumber: 28, status: '' },
    { dayNumber: 29, status: '' },
    { dayNumber: 30, status: '' },
  ];

  checkIn() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.checkInTime.set(timeStr);
    this.isCheckedIn.set(true);
    this.hrms.toggleClockIn();

    const todayCell = this.calendarCells.find(c => c.isToday);
    if (todayCell) {
      todayCell.checkIn = timeStr;
    }
  }

  checkOut() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.checkOutTime.set(timeStr);
    this.isCheckedIn.set(false);
    this.hrms.toggleClockIn();

    const todayCell = this.calendarCells.find(c => c.isToday);
    if (todayCell) {
      todayCell.checkOut = timeStr;
    }
  }

  getWorkDuration(): string {
    if (!this.checkInTime()) return '--';
    const inTime = new Date(`2000-01-01 ${this.checkInTime()}`);
    const outTime = this.checkOutTime() ? new Date(`2000-01-01 ${this.checkOutTime()}`) : new Date();
    const diffMs = outTime.getTime() - inTime.getTime();
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  }

  getBadgeClass(status: AttendanceStatus): string {
    switch (status) {
      case 'Present': return 'badge-success';
      case 'WFH': return 'badge-info';
      case 'Leave': return 'badge-warning';
      case 'Holiday': return 'badge-purple';
      default: return 'badge-danger';
    }
  }

  hoveredCell = signal<CalendarCell | null>(null);

  setHoveredCell(cell: CalendarCell | null) {
    if (cell && !cell.otherMonth && !cell.isWeekend && (cell.checkIn || cell.checkOut)) {
      this.hoveredCell.set(cell);
    } else {
      this.hoveredCell.set(null);
    }
  }

  // Regularization UI State & Logic
  showRegModal = signal<boolean>(false);
  regForm = { date: '', checkIn: '', checkOut: '', reason: '' };

  openRegModal() {
    this.regForm = { date: '', checkIn: '', checkOut: '', reason: '' };
    this.showRegModal.set(true);
  }

  submitRegRequest() {
    const user = this.auth.currentUser();
    if (user && this.regForm.date && this.regForm.checkIn && this.regForm.checkOut && this.regForm.reason) {
      this.showRegModal.set(false);
    }
  }

  approveRequest(id: string) {
    const req = this.hrms.regularizationRequests().find(r => r.id === id);
    const user = this.auth.currentUser();
    if (req && user && req.employeeId === user.employeeId) {
      const dateNum = parseInt(req.date.split('-')[2], 10);
      const cell = this.calendarCells.find(c => c.dayNumber === dateNum && !c.otherMonth);
      if (cell) {
        cell.checkIn = req.checkIn;
        cell.checkOut = req.checkOut;
        cell.status = 'Present';
      }
    }
  }

  rejectRequest(id: string) {
    prompt('Enter rejection notes/reason:');
  }

  canApproveRequests(): boolean {
    return this.auth.hasPermission('ATTENDANCE_UPDATE');
  }

  myRegularizations = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.hrms.regularizationRequests().filter(r => r.employeeId === user.employeeId);
  });

  pendingApprovals = computed(() => {
    return this.hrms.regularizationRequests().filter(r => r.status === 'Pending');
  });
}
