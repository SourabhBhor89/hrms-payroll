import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile-changes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-changes.component.html',
  styleUrl: './profile-changes.component.css'
})
export class ProfileChangesComponent implements OnInit {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  currentPage = signal<number>(0);
  pageSize = 10;

  // Modal Signals
  showRejectModal = signal<boolean>(false);
  rejectingRequestId: number | null = null;
  rejectionReasonInput: string = '';

  profileChangeRequests = computed(() => this.hrms.profileChangeRequests());
  pendingRequests = computed(() => this.hrms.pendingProfileChangeRequests());
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);

  ngOnInit() {
    if (this.canApprove()) {
      this.hrms.loadPendingProfileChangeRequests();
    } else {
      this.hrms.loadMyProfileChangeRequests();
    }
  }

  canApprove(): boolean {
    return this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE') || 
           this.auth.hasPermission('LEAVE_APPROVE') ||
           this.auth.currentRole() === 'Admin' ||
           this.auth.currentRole() === 'HR Manager' ||
           this.auth.currentRole() === 'Manager';
  }

  refreshRequests() {
    if (this.canApprove()) {
      this.hrms.loadPendingProfileChangeRequests();
    } else {
      this.hrms.loadMyProfileChangeRequests();
    }
  }

  paginatedRequests(): any[] {
    const list = this.filteredRequests();
    const start = this.currentPage() * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  getPages(): number[] {
    const total = this.filteredRequests().length;
    const totalPages = Math.ceil(total / this.pageSize);
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredRequests().length / this.pageSize);
  }

  goToPage(page: number) {
    const totalPages = this.getTotalPages();
    if (page >= 0 && page < totalPages) {
      this.currentPage.set(page);
    }
  }

  filteredRequests(): any[] {
    let sourceList: any[] = [];

    if (this.canApprove()) {
      sourceList = [...this.pendingRequests()];
    } else {
      sourceList = [...this.profileChangeRequests()];
    }

    return [...sourceList].sort((a, b) => {
      const dateA = a.submittedAt || '';
      const dateB = b.submittedAt || '';
      return dateB.localeCompare(dateA);
    });
  }

  approve(id: number) {
    this.hrms.approveProfileChangeRequest(id, 'Approved by manager').subscribe(() => {
      this.refreshRequests();
    });
  }

  promptReject(id: number) {
    this.rejectingRequestId = id;
    this.rejectionReasonInput = '';
    this.showRejectModal.set(true);
  }

  confirmReject() {
    if (this.rejectingRequestId) {
      this.hrms.rejectProfileChangeRequest(this.rejectingRequestId, this.rejectionReasonInput).subscribe(() => {
        this.showRejectModal.set(false);
        this.rejectingRequestId = null;
        this.refreshRequests();
      });
    }
  }

  cancelRequest(id: number) {
    this.hrms.cancelProfileChangeRequest(id).subscribe(() => {
      this.refreshRequests();
    });
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
}
