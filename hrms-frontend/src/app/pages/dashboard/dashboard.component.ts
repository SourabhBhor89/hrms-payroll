import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HrmsService } from '../../core/services/hrms.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  hrms = inject(HrmsService);

  ngOnInit() {
    this.hrms.refreshAllData();
  }

  // Today's check-in / check-out state
  isCheckedIn = signal<boolean>(false);
  checkInTime = signal<string>('');
  checkOutTime = signal<string>('');
  todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  formattedTimer(): string {
    const totalSecs = this.hrms.clockDurationSeconds();
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  canAddEmployee(): boolean {
    return this.auth.hasPermission('EMPLOYEE_MANAGEMENT_CREATE');
  }

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

  getDayFromDate(dateStr?: string): string {
    if (!dateStr) return '15';
    const parts = dateStr.split('-');
    return parts.length >= 3 ? parts[2] : '15';
  }

  getMonthFromDate(dateStr?: string): string {
    if (!dateStr) return 'AUG';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const idx = parseInt(parts[1], 10) - 1;
      return months[idx] || 'AUG';
    }
    return 'AUG';
  }
}
