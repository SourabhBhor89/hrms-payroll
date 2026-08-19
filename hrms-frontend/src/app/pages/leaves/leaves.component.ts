import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaveRequest, EmployeeLeaveBalanceDetail, LeaveTypeItem } from '../../core/models/hrms.model';

import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaves.component.html',
  styleUrl: './leaves.component.css'
})
export class LeavesComponent implements OnInit {
  hrms = inject(HrmsService);
  auth = inject(AuthService);
  notify = inject(NotificationService);

  currentPage = signal<number>(1);
  pageSize = 10;

  private _activeTab: 'my_leaves' | 'pending_approvals' = 'my_leaves';
  get activeTab() { return this._activeTab; }
  set activeTab(val: 'my_leaves' | 'pending_approvals') {
    this._activeTab = val;
    this.currentPage.set(1);
  }

  private _filterStatus: string = 'All';
  get filterStatus() { return this._filterStatus; }
  set filterStatus(val: string) {
    this._filterStatus = val;
    this.currentPage.set(1);
  }

  paginatedRequests(): LeaveRequest[] {
    const list = this.filteredRequests();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  getLeavePages(): number[] {
    const total = this.filteredRequests().length;
    const totalPages = Math.ceil(total / this.pageSize);
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTotalLeavePages(): number {
    return Math.ceil(this.filteredRequests().length / this.pageSize);
  }

  goToLeavePage(page: number) {
    const totalPages = this.getTotalLeavePages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }

  // Modal Signals
  showModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId: string | number | null = null;

  // Rejection Modal Signals
  showRejectModal = signal<boolean>(false);
  rejectingLeaveId: string | number | null = null;
  rejectionReasonInput: string = '';

  formData = {
    leaveTypeId: 1,
    startDate: '',
    endDate: '',
    totalDays: 1,
    reason: ''
  };

  ngOnInit() {
    this.hrms.loadLeaveTypes();
    this.hrms.loadLeaves(); // This loads both leave balances and leave requests
    if (this.canApprove()) {
      this.hrms.loadPendingLeaveApprovals();
    }
    // Admin users always see pending_approvals tab
    if (this.isAdmin()) {
      this.activeTab = 'pending_approvals';
    }
    
    // Debug: log leave requests after loading
    setTimeout(() => {
      console.log('Leave requests after load:', this.hrms.leaveRequests());
      console.log('Current user:', this.auth.currentUser());
      console.log('Active tab:', this.activeTab);
      console.log('Filtered requests:', this.filteredRequests());
    }, 1000);
  }

  canApprove(): boolean {
    return this.auth.hasPermission('LEAVE_APPROVE') || this.auth.hasPermission('LEAVE_VIEW_ALL');
  }

  isReadOnly(): boolean {
    return this.auth.hasPermission('LEAVE_READ_ONLY') && !this.isAdmin();
  }

  isAdmin(): boolean {
    return this.auth.currentRole() === 'Admin';
  }

  get activeLeaveTypes() {
    const types = this.hrms.leaveTypes();
    if (types && types.length > 0) {
      // Filter out ineligible leave types
      return types.filter(type => this.isLeaveTypeEligible(type));
    }

    const balances = this.hrms.leaveBalances();
    if (balances && balances.length > 0) {
      return balances.map(b => ({
        id: b.leaveTypeId,
        code: b.leaveTypeCode,
        name: b.leaveTypeName
      }));
    }
    return [];
  }

  get displayedBalances(): EmployeeLeaveBalanceDetail[] {
    // Filter out deactivated leave types (CASUAL, SICK) and ineligible leave types
    const eligibleLeaveTypeCodes = this.activeLeaveTypes.map(t => t.code);
    return this.hrms.leaveBalances().filter(b =>
      eligibleLeaveTypeCodes.includes(b.leaveTypeCode)
    );
  }

  isWFHLeaveType(leaveTypeCode: string): boolean {
    return leaveTypeCode === 'WFH' || leaveTypeCode === 'LOP';
  }

  filteredRequests(): LeaveRequest[] {
    const isAdminOrHr = this.auth.currentRole() === 'Admin' || this.auth.currentRole() === 'HR Manager' || this.auth.currentRole() === 'Manager' || this.auth.currentRole() === 'Coordinator';

    let sourceList: LeaveRequest[] = [];

    // For admin users, show all leave requests (approvals pending view)
    if (this.isAdmin()) {
      sourceList = [...this.hrms.leaveRequests()];
    } else if (this.activeTab === 'pending_approvals') {
      // For coordinators, show all leaves (not just pending) like HR/Admin/Manager
      if (isAdminOrHr) {
        sourceList = [...this.hrms.leaveRequests()];
      } else {
        sourceList = [...this.hrms.pendingLeaveApprovals()];
      }
    } else {
      const currentUserEmail = this.auth.currentUser()?.email;
      const currentUserName = this.auth.currentUser()?.name?.trim();
      
      console.log('Filtering for current user:', { currentUserEmail, currentUserName });
      console.log('Available leave requests:', this.hrms.leaveRequests());
      
      // Get current user's employee record for better matching
      const currentUserEmployee = this.hrms.employees().find(e => 
        e.email === currentUserEmail || e.name === currentUserName
      );
      
      sourceList = this.hrms.leaveRequests().filter(r => {
        const requestName = r.employeeName?.trim() || '';
        const requestCode = r.employeeCode?.trim() || '';
        
        // Match by employee ID if we have the current user's employee record
        const idMatch = currentUserEmployee && r.employeeId && String(r.employeeId) === currentUserEmployee.id;
        
        // Match by email (employeeCode might contain email in some systems)
        const emailMatch = currentUserEmail && requestCode === currentUserEmail;
        
        // Match by name (with trimming and case-insensitive comparison)
        const nameMatch = currentUserName && requestName.toLowerCase() === currentUserName.toLowerCase();
        
        // Match by employee code if we have the current user's employee record
        const codeMatch = currentUserEmployee && requestCode === currentUserEmployee.employeeId;
        
        console.log('Request filtering check:', { 
          request: r.employeeName, 
          requestCode,
          idMatch, 
          emailMatch, 
          nameMatch,
          codeMatch,
          currentUserEmployeeId: currentUserEmployee?.id
        });
        
        return idMatch || emailMatch || nameMatch || codeMatch;
      });
    }

    let result = sourceList;
    if (this.filterStatus !== 'All') {
      result = sourceList.filter(r => {
        const s = (r.status || '').toUpperCase();
        const target = this.filterStatus.toUpperCase();
        return s === target;
      });
    }

    // Sort requests: Pending status requests on top of other data, then by date descending
    return [...result].sort((a, b) => {
      const aIsPending = (a.status || '').toUpperCase() === 'PENDING';
      const bIsPending = (b.status || '').toUpperCase() === 'PENDING';
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;

      const dateA = a.appliedOn || a.startDate || '';
      const dateB = b.appliedOn || b.startDate || '';
      return dateB.localeCompare(dateA);
    });
  }

  openApplyModal() {
    if (this.auth.currentRole() === 'Admin') {
      this.notify.showAlert('Administrators do not submit self-leave applications.');
      return;
    }
    const types = this.activeLeaveTypes;
    const firstType = types && types.length > 0 ? types[0] : null;
    this.formData = {
      leaveTypeId: firstType ? firstType.id : 0,
      startDate: this.hrms.getTodayStr(),
      endDate: this.hrms.getTodayStr(),
      totalDays: 1,
      reason: ''
    };
    this.editingId = null;
    this.isEditMode.set(false);
    this.showModal.set(true);
  }

  isLeaveTypeEligible(leaveType: LeaveTypeItem): boolean {
    // If eligible is explicitly false, mark as not eligible
    return leaveType.eligible !== false;
  }

  openEditModal(req: LeaveRequest) {
    const firstType = this.activeLeaveTypes[0];
    this.editingId = req.id;
    this.formData = {
      leaveTypeId: req.leaveTypeId || (firstType ? firstType.id : 0),
      startDate: req.startDate || '',
      endDate: req.endDate || req.startDate || '',
      totalDays: req.totalDays || 1,
      reason: req.reason || ''
    };
    this.isEditMode.set(true);
    this.showModal.set(true);
  }

  onDateChange() {
    if (this.formData.startDate && this.formData.endDate) {
      const start = new Date(this.formData.startDate);
      const end = new Date(this.formData.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        this.formData.totalDays = diffDays;
      }
    }
  }

  submitForm() {
    if (!this.formData.startDate || !this.formData.reason) return;

    let targetLeaveTypeId = Number(this.formData.leaveTypeId);
    if (!targetLeaveTypeId || targetLeaveTypeId === 0) {
      const types = this.activeLeaveTypes;
      if (types && types.length > 0) {
        targetLeaveTypeId = types[0].id;
      }
    }

    if (!targetLeaveTypeId || targetLeaveTypeId === 0) {
      this.notify.showAlert('Leave type not found. Please ensure leave categories are loaded from the backend.');
      return;
    }

    if (this.isEditMode() && this.editingId) {
      this.hrms.updateLeave(this.editingId, {
        leaveTypeId: targetLeaveTypeId,
        startDate: this.formData.startDate,
        endDate: this.formData.endDate || this.formData.startDate,
        totalDays: Number(this.formData.totalDays),
        reason: this.formData.reason
      }).subscribe((res) => {
        if (res) this.showModal.set(false);
      });
    } else {
      this.hrms.applyLeave({
        leaveTypeId: targetLeaveTypeId,
        startDate: this.formData.startDate,
        endDate: this.formData.endDate || this.formData.startDate,
        totalDays: Number(this.formData.totalDays),
        reason: this.formData.reason
      }).subscribe((res) => {
        if (res) this.showModal.set(false);
      });
    }
  }

  // Cancel Confirm Modal Signals
  showCancelConfirmModal = signal<boolean>(false);
  leaveIdToCancel = signal<string | number | null>(null);

  cancelRequest(id: string | number) {
    this.leaveIdToCancel.set(id);
    this.showCancelConfirmModal.set(true);
  }

  proceedCancelLeave() {
    const id = this.leaveIdToCancel();
    if (id !== null) {
      this.hrms.cancelLeave(id).subscribe();
      this.showCancelConfirmModal.set(false);
      this.leaveIdToCancel.set(null);
    }
  }

  approve(id: string | number) {
    this.hrms.approveLeave(id, true).subscribe();
  }

  promptReject(id: string | number) {
    this.rejectingLeaveId = id;
    this.rejectionReasonInput = '';
    this.showRejectModal.set(true);
  }

  confirmReject() {
    if (this.rejectingLeaveId) {
      this.hrms.approveLeave(this.rejectingLeaveId, false, this.rejectionReasonInput).subscribe(() => {
        this.showRejectModal.set(false);
        this.rejectingLeaveId = null;
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return 'badge-success';
    if (s === 'REJECTED') return 'badge-danger';
    if (s === 'CANCELLED') return 'badge-secondary';
    return 'badge-warning';
  }

  getStatusDisplay(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') return 'Pending';
    if (s === 'APPROVED') return 'Approved';
    if (s === 'REJECTED') return 'Rejected';
    if (s === 'CANCELLED') return 'Cancelled';
    return status;
  }
}

