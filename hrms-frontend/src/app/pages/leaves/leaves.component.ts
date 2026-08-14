import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaveRequest, EmployeeLeaveBalanceDetail, LeaveTypeItem } from '../../core/models/hrms.model';

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

  activeTab: 'my_leaves' | 'pending_approvals' = 'my_leaves';
  filterStatus: string = 'All';

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

  popupMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  showPopup(text: string, type: 'success' | 'error' = 'success') {
    this.popupMessage.set({ text, type });
    setTimeout(() => {
      this.popupMessage.set(null);
    }, 4000);
  }

  ngOnInit() {
    this.hrms.loadLeaveTypes();
    this.hrms.loadLeaves(); // This loads both leave balances and leave requests
    if (this.canApprove()) {
      this.hrms.loadPendingLeaveApprovals();
    }
    if (this.auth.currentRole() === 'Admin') {
      this.activeTab = 'pending_approvals';
    }
  }

  canApprove(): boolean {
    const role = this.auth.currentRole();
    return (role === 'Admin' || role === 'HR Manager') && this.auth.hasPermission('LEAVE_APPROVE');
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
    return leaveTypeCode === 'WFH';
  }

  filteredRequests(): LeaveRequest[] {
    const sourceList = this.activeTab === 'pending_approvals'
      ? this.hrms.pendingLeaveApprovals()
      : this.hrms.leaveRequests();

    if (this.filterStatus === 'All') return sourceList;

    return sourceList.filter(r => {
      const s = (r.status || '').toUpperCase();
      const target = this.filterStatus.toUpperCase();
      return s === target;
    });
  }

  openApplyModal() {
    if (this.auth.currentRole() === 'Admin') {
      alert('Administrators do not submit self-leave applications.');
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
    // 1. Validation for required fields
    const missingFields: string[] = [];
    if (!this.formData.leaveTypeId || this.formData.leaveTypeId === 0) missingFields.push('Leave Category');
    if (!this.formData.startDate) missingFields.push('Start Date');
    if (!this.formData.endDate) missingFields.push('End Date');
    if (!this.formData.reason || !this.formData.reason.trim()) missingFields.push('Reason / Justification');

    if (missingFields.length > 0) {
      this.showPopup(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    // 2. Date sequence validation
    const start = new Date(this.formData.startDate);
    const end = new Date(this.formData.endDate);
    if (end < start) {
      this.showPopup('End Date cannot be earlier than Start Date.', 'error');
      return;
    }

    let targetLeaveTypeId = Number(this.formData.leaveTypeId);
    if (!targetLeaveTypeId || targetLeaveTypeId === 0) {
      const types = this.activeLeaveTypes;
      if (types && types.length > 0) {
        targetLeaveTypeId = types[0].id;
      }
    }

    if (!targetLeaveTypeId || targetLeaveTypeId === 0) {
      this.showPopup('Leave Category not found. Please select a valid category.', 'error');
      return;
    }

    if (this.isEditMode() && this.editingId) {
      this.hrms.updateLeave(this.editingId, {
        leaveTypeId: targetLeaveTypeId,
        startDate: this.formData.startDate,
        endDate: this.formData.endDate || this.formData.startDate,
        totalDays: Number(this.formData.totalDays),
        reason: this.formData.reason
      }).subscribe({
        next: (res) => {
          this.showPopup('Leave application updated successfully!', 'success');
          this.showModal.set(false);
        },
        error: (err) => {
          this.showPopup('Failed to update leave application: ' + (err.error?.message || err.message || 'Error occurred'), 'error');
        }
      });
    } else {
      this.hrms.applyLeave({
        leaveTypeId: targetLeaveTypeId,
        startDate: this.formData.startDate,
        endDate: this.formData.endDate || this.formData.startDate,
        totalDays: Number(this.formData.totalDays),
        reason: this.formData.reason
      }).subscribe({
        next: (res) => {
          this.showPopup('Leave application submitted successfully!', 'success');
          this.showModal.set(false);
        },
        error: (err) => {
          this.showPopup('Failed to submit leave application: ' + (err.error?.message || err.message || 'Error occurred'), 'error');
        }
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

