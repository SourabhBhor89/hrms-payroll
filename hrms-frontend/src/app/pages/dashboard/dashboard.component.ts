import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
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
export class DashboardComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  hrms = inject(HrmsService);

  // Live ticking clock & toast signals
  liveTime = signal<string>('');
  toastMessage = signal<string | null>(null);
  private liveTimerInterval: any = null;

  // Modal Signals for Profile Change Rejection
  showRejectModal = signal<boolean>(false);
  rejectingRequestId: number | null = null;
  rejectionReasonInput: string = '';

  get greetingMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Modal Signals for Profile Change Cancellation
  showCancelModal = signal<boolean>(false);
  cancellingRequestId: number | null = null;

  // Tab State for Profile Update Requests
  activeProfileTab = signal<'my-requests' | 'approvals'>('approvals');

  // Pagination State for Profile Change Requests
  profileChangeCurrentPage = signal<number>(0);
  profileChangePageSize = 10;

  ngOnInit() {
    this.hrms.refreshAllData();
    this.updateLiveTime();
    this.liveTimerInterval = setInterval(() => {
      this.updateLiveTime();
    }, 1000);

    // Load profile change requests for activity feed
    if (this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE') ||
        this.auth.currentRole() === 'Admin' ||
        this.auth.currentRole() === 'HR Manager' ||
        this.auth.currentRole() === 'Manager') {
      this.hrms.loadPendingProfileChangeRequests(); // Load all pending for approval tab
      this.hrms.loadMyProfileChangeRequests(); // Load own requests for my-requests tab
    } else {
      // Load own requests for regular employees and coordinators
      this.hrms.loadMyProfileChangeRequests();
    }
  }

  ngOnDestroy() {
    if (this.liveTimerInterval) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }
  }

  updateLiveTime() {
    const now = new Date();
    this.liveTime.set(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
           this.auth.hasPermission('LEAVE_APPROVE') ||
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

  handleCheckIn() {
    this.checkIn();
    this.toastMessage.set('⚡ Checked In successfully! Have a productive work day.');
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  handleCheckOut() {
    this.checkOut();
    this.toastMessage.set('👋 Checked Out successfully! See you tomorrow.');
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  getElapsedSeconds(): number {
    // Consume liveTime signal to trigger reactive change detection every second
    const _tick = this.liveTime();

    const inStr = this.hrms.todayClockInTime();
    if (!inStr || inStr === '--') return 0;

    const outStr = this.hrms.todayClockOutTime();
    const now = new Date();

    const parseTimeToDate = (timeStr: string): Date | null => {
      try {
        const todayYMD = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        let d = new Date(`${todayYMD} ${timeStr}`);
        if (!isNaN(d.getTime())) return d;

        const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (match) {
          let hrs = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const secs = match[3] ? parseInt(match[3], 10) : 0;
          const ampm = match[4]?.toUpperCase();
          if (ampm === 'PM' && hrs < 12) hrs += 12;
          if (ampm === 'AM' && hrs === 12) hrs = 0;
          d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hrs, mins, secs);
          if (!isNaN(d.getTime())) return d;
        }
        return null;
      } catch (_) {
        return null;
      }
    };

    const inTime = parseTimeToDate(inStr);
    if (!inTime) return this.hrms.clockDurationSeconds();

    const outTime = (outStr && outStr !== '--') ? parseTimeToDate(outStr) : now;
    if (!outTime) return this.hrms.clockDurationSeconds();

    const diffSec = Math.floor((outTime.getTime() - inTime.getTime()) / 1000);
    return diffSec > 0 ? diffSec : 0;
  }

  formattedLiveDuration(): string {
    const secs = this.getElapsedSeconds();
    if (secs === 0) return '00h 00m 00s';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }

  getShiftProgressPercent(): number {
    const secs = this.getElapsedSeconds();
    if (secs === 0) return 0;
    const targetSecs = 9 * 3600; // 9 Hours standard day
    const pct = Math.min(100, Math.round((secs / targetSecs) * 100));
    return pct;
  }

  getRemainingShiftTime(): string {
    const secs = this.getElapsedSeconds();
    const targetSecs = 9 * 3600;
    if (secs >= targetSecs) return 'Goal Reached 🎉';
    const remSecs = targetSecs - secs;
    const hrs = Math.floor(remSecs / 3600);
    const mins = Math.floor((remSecs % 3600) / 60);
    return `${hrs}h ${mins}m left`;
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

  getProfileRequestStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return 'badge-success';
    if (s === 'REJECTED') return 'badge-danger';
    if (s === 'CANCELLED') return 'badge-secondary';
    return 'badge-warning';
  }

  setProfileTab(tab: 'my-requests' | 'approvals') {
    this.activeProfileTab.set(tab);
    this.profileChangeCurrentPage.set(0); // Reset to first page when switching tabs
  }

  getProfileChangeTotalPages(): number {
    // For employees/coordinators (no tabs)
    if (this.auth.currentRole() === 'Employee' || this.auth.currentRole() === 'Coordinator') {
      return Math.ceil(this.getEmployeePendingRequestsTotal() / this.profileChangePageSize);
    }
    // For HR/Manager/Admin (with tabs)
    const total = this.activeProfileTab() === 'approvals'
      ? this.getOtherEmployeesPendingRequestsTotal()
      : this.getMyPendingRequestsTotal();
    return Math.ceil(total / this.profileChangePageSize);
  }

  getProfileChangePages(): number[] {
    const totalPages = this.getProfileChangeTotalPages();
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToProfileChangePage(page: number) {
    const totalPages = this.getProfileChangeTotalPages();
    if (page >= 0 && page < totalPages) {
      this.profileChangeCurrentPage.set(page);
    }
  }

  getMyPendingRequests(): any[] {
    const allMyRequests = this.hrms.profileChangeRequests();
    const currentUser = this.auth.currentUser();

    console.log('All my requests from service:', allMyRequests);
    console.log('Current user:', currentUser);

    const filtered = allMyRequests.filter(req => {
      const isMyRequest = req.employeeName === currentUser?.name ||
                          req.employeeId === currentUser?.id;

      // Strict pending status filtering
      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING';

      console.log(`Request ${req.id}: Employee=${req.employeeName}, Status="${req.status}" (normalized="${status}"), IsMy=${isMyRequest}, IsPending=${isPending}`);

      return isMyRequest && isPending;
    });

    console.log('Filtered my pending requests:', filtered);

    // Apply pagination
    const start = this.profileChangeCurrentPage() * this.profileChangePageSize;
    return filtered.slice(start, start + this.profileChangePageSize);
  }

  getMyPendingRequestsTotal(): number {
    const allMyRequests = this.hrms.profileChangeRequests();
    const currentUser = this.auth.currentUser();

    const filtered = allMyRequests.filter(req => {
      const isMyRequest = req.employeeName === currentUser?.name ||
                          req.employeeId === currentUser?.id;
      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING';
      return isMyRequest && isPending;
    });

    return filtered.length;
  }

  getEmployeePendingRequests(): any[] {
    const allMyRequests = this.hrms.profileChangeRequests();
    const currentUser = this.auth.currentUser();

    console.log('=== Employee Pending Requests Debug ===');
    console.log('All requests from service:', allMyRequests);
    console.log('Current user:', currentUser);
    console.log('Current user name:', currentUser?.name);
    console.log('Current user name trimmed:', currentUser?.name?.trim());
    console.log('Current user id:', currentUser?.id);
    console.log('Current user employeeId:', currentUser?.employeeId);

    if (!allMyRequests || allMyRequests.length === 0) {
      console.log('No requests found in service');
      return [];
    }

    const filtered = allMyRequests.filter(req => {
      // Try multiple matching strategies with trimmed values
      const userName = currentUser?.name?.trim();
      const reqName = req.employeeName?.trim();
      const nameMatch = reqName === userName;

      const userId = String(currentUser?.id || '');
      const reqEmployeeId = String(req.employeeId || '');
      const idMatch = reqEmployeeId === userId;

      const userEmployeeId = String(currentUser?.employeeId || '');
      const employeeIdMatch = reqEmployeeId === userEmployeeId;

      const isMyRequest = nameMatch || idMatch || employeeIdMatch;

      // Less strict pending status filtering
      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING' || status === 'Pending';

      console.log(`Request ${req.id}:`, {
        employeeName: req.employeeName,
        employeeNameTrimmed: reqName,
        employeeId: req.employeeId,
        status: req.status,
        normalizedStatus: status,
        userName,
        userId,
        userEmployeeId,
        nameMatch,
        idMatch,
        employeeIdMatch,
        isMyRequest,
        isPending
      });

      return isMyRequest && isPending;
    });

    console.log('Filtered employee pending requests:', filtered);
    console.log('=== End Debug ===');

    // Apply pagination
    const start = this.profileChangeCurrentPage() * this.profileChangePageSize;
    return filtered.slice(start, start + this.profileChangePageSize);
  }

  getEmployeePendingRequestsTotal(): number {
    const allMyRequests = this.hrms.profileChangeRequests();
    const currentUser = this.auth.currentUser();

    if (!allMyRequests || allMyRequests.length === 0) {
      return 0;
    }

    const filtered = allMyRequests.filter(req => {
      const userName = currentUser?.name?.trim();
      const reqName = req.employeeName?.trim();
      const nameMatch = reqName === userName;

      const userId = String(currentUser?.id || '');
      const reqEmployeeId = String(req.employeeId || '');
      const idMatch = reqEmployeeId === userId;

      const userEmployeeId = String(currentUser?.employeeId || '');
      const employeeIdMatch = reqEmployeeId === userEmployeeId;

      const isMyRequest = nameMatch || idMatch || employeeIdMatch;

      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING' || status === 'Pending';

      return isMyRequest && isPending;
    });

    return filtered.length;
  }

  getOtherEmployeesPendingRequests(): any[] {
    const allRequests = this.hrms.pendingProfileChangeRequests();
    const currentUser = this.auth.currentUser();

    console.log('All requests from pendingProfileChangeRequests:', allRequests);
    console.log('Current user:', currentUser);

    const filtered = allRequests.filter(req => {
      // Show ALL pending requests (both own and other employees') for HR/Manager
      // Strict pending status filtering
      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING';

      console.log(`Request ${req.id}: Employee=${req.employeeName}, Status="${req.status}" (normalized="${status}"), IsPending=${isPending}`);

      return isPending;
    });

    console.log('Filtered all pending requests for HR/Manager:', filtered);

    // Apply pagination
    const start = this.profileChangeCurrentPage() * this.profileChangePageSize;
    return filtered.slice(start, start + this.profileChangePageSize);
  }

  getOtherEmployeesPendingRequestsTotal(): number {
    const allRequests = this.hrms.pendingProfileChangeRequests();

    const filtered = allRequests.filter(req => {
      const status = (req.status || '').toUpperCase().trim();
      const isPending = status === 'PENDING';
      return isPending;
    });

    return filtered.length;
  }

  quickApproveProfileChange(id: number) {
    this.hrms.approveProfileChangeRequest(id, 'Quick approved from dashboard').subscribe({
      next: () => {
        this.hrms.loadPendingProfileChangeRequests();
        this.hrms.loadMyProfileChangeRequests();
        this.profileChangeCurrentPage.set(0);
      },
      error: (err) => {
        console.error('Error approving profile change:', err);
        alert('Failed to approve profile change request');
      }
    });
  }

  promptRejectProfileChange(id: number) {
    this.rejectingRequestId = id;
    this.rejectionReasonInput = '';
    this.showRejectModal.set(true);
  }

  cancelProfileChangeRequest(requestId: number) {
    this.cancellingRequestId = requestId;
    this.showCancelModal.set(true);
  }

  confirmCancelProfileChange() {
    if (this.cancellingRequestId) {
      this.hrms.cancelProfileChangeRequest(this.cancellingRequestId).subscribe({
        next: () => {
          this.hrms.loadMyProfileChangeRequests();
          this.hrms.loadPendingProfileChangeRequests();
          this.showCancelModal.set(false);
          this.cancellingRequestId = null;
          this.profileChangeCurrentPage.set(0);
        },
        error: (err) => {
          console.error('Failed to cancel profile change request:', err);
          alert('Failed to cancel profile change request');
          this.showCancelModal.set(false);
          this.cancellingRequestId = null;
        }
      });
    }
  }

  cancelCancelModal() {
    this.showCancelModal.set(false);
    this.cancellingRequestId = null;
  }

  confirmRejectProfileChange() {
    if (this.rejectingRequestId && this.rejectionReasonInput.trim()) {
      this.hrms.rejectProfileChangeRequest(this.rejectingRequestId, this.rejectionReasonInput).subscribe({
        next: () => {
          this.showRejectModal.set(false);
          this.rejectingRequestId = null;
          this.rejectionReasonInput = '';
          this.hrms.loadPendingProfileChangeRequests();
          this.hrms.loadMyProfileChangeRequests();
          this.profileChangeCurrentPage.set(0);
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
