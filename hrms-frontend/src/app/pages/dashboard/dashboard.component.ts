import { Component, inject, signal } from '@angular/core';
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
export class DashboardComponent {
  auth = inject(AuthService);
  hrms = inject(HrmsService);

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
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.checkInTime.set(timeStr);
    this.isCheckedIn.set(true);
    this.hrms.toggleClockIn();
  }

  checkOut() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.checkOutTime.set(timeStr);
    this.isCheckedIn.set(false);
    this.hrms.toggleClockIn();
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
}
