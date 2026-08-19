import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { HrmsService } from '../../core/services/hrms.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  hrms = inject(HrmsService);

  // Modal Signals for Profile Change Rejection
  showRejectModal = signal<boolean>(false);
  rejectingRequestId: number | null = null;
  rejectionReasonInput: string = '';

  ngOnInit() {
    this.hrms.refreshAllData();
    // Load profile change requests for activity feed
    if (this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE') || 
        this.auth.currentRole() === 'Admin' || 
        this.auth.currentRole() === 'HR Manager' || 
        this.auth.currentRole() === 'Manager') {
      this.hrms.loadPendingProfileChangeRequests();
    }
  }

  recentActivities = computed(() => {
    const activities: { avatar: string; name: string; text: string; time: string }[] = [];

    // 1. Live Leave Requests
    const leaves = this.hrms.leaveRequests();
    leaves.slice(0, 3).forEach(l => {
      activities.push({
        avatar: l.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        name: l.employeeName || 'Employee',
        text: `applied for ${l.leaveTypeName || 'Leave'} (${l.totalDays || 1} day${(l.totalDays || 1) > 1 ? 's' : ''}).`,
        time: l.appliedOn ? `${l.appliedOn}` : 'Recently'
      });
    });

    // 2. Live Regularization Requests
    const regularizations = this.hrms.regularizationRequests();
    regularizations.slice(0, 2).forEach(r => {
      activities.push({
        avatar: r.employeeAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        name: r.employeeName || 'Employee',
        text: `submitted an Attendance Regularization request for ${r.date}.`,
        time: r.appliedOn ? `${r.appliedOn}` : 'Recently'
      });
    });

    // 3. Profile Change Requests
    const profileChanges = this.hrms.pendingProfileChangeRequests();
    profileChanges.slice(0, 2).forEach(p => {
      const fieldType = p.fieldType === 'PHONE' ? 'Phone Number' : 
                       p.fieldType === 'CURRENT_ADDRESS' ? 'Current Address' : 
                       p.fieldType === 'PERMANENT_ADDRESS' ? 'Permanent Address' : p.fieldType;
      activities.push({
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        name: p.employeeName || 'Employee',
        text: `requested to update ${fieldType}.`,
        time: p.submittedAt ? p.submittedAt.split('T')[0] : 'Recently'
      });
    });

    // 4. Registered Employees
    const employees = this.hrms.employees().filter(e => e.status !== 'Terminated');
    employees.slice(0, 2).forEach(e => {
      activities.push({
        avatar: e.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        name: e.name,
        text: `joined as ${e.designation || 'Staff Member'} in ${e.department || 'Operations'}.`,
        time: e.joinDate ? `${e.joinDate}` : 'Recently'
      });
    });

    return activities.slice(0, 5);
  });

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

  canApproveProfileChanges(): boolean {
    return this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE') ||
           this.auth.currentRole() === 'Admin' ||
           this.auth.currentRole() === 'HR Manager' ||
           this.auth.currentRole() === 'Manager';
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

  getFieldTypeDisplay(fieldType: string): string {
    const type = fieldType?.toUpperCase() || '';
    switch (type) {
      case 'PHONE': return 'Phone Number';
      case 'ADDRESS': return 'Address';
      case 'CURRENT_ADDRESS': return 'Current Address';
      case 'PERMANENT_ADDRESS': return 'Permanent Address';
      default: return fieldType;
    }
  }

  quickApproveProfileChange(id: number) {
    if (confirm('Are you sure you want to approve this profile change request?')) {
      this.hrms.approveProfileChangeRequest(id, 'Quick approved from dashboard').subscribe({
        next: () => {
          this.hrms.loadPendingProfileChangeRequests();
        },
        error: (err) => {
          console.error('Error approving profile change:', err);
          alert('Failed to approve profile change request');
        }
      });
    }
  }

  promptRejectProfileChange(id: number) {
    this.rejectingRequestId = id;
    this.rejectionReasonInput = '';
    this.showRejectModal.set(true);
  }

  confirmRejectProfileChange() {
    if (this.rejectingRequestId && this.rejectionReasonInput.trim()) {
      this.hrms.rejectProfileChangeRequest(this.rejectingRequestId, this.rejectionReasonInput).subscribe({
        next: () => {
          this.showRejectModal.set(false);
          this.rejectingRequestId = null;
          this.rejectionReasonInput = '';
          this.hrms.loadPendingProfileChangeRequests();
        },
        error: (err) => {
          console.error('Error rejecting profile change:', err);
          alert('Failed to reject profile change request');
        }
      });
    }
  }

  cancelRejectProfileChange() {
    this.showRejectModal.set(false);
    this.rejectingRequestId = null;
    this.rejectionReasonInput = '';
  }
}
