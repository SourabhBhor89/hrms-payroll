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

  currentPage = 0;
  pageSize = 10;

  // Tab and Filter State
  activeTab = 'approvals';
  activeFilter = 'All';

  // Modal Signals
  showRejectModal = signal<boolean>(false);
  rejectingRequestId: number | null = null;
  rejectionReasonInput: string = '';

  profileChangeRequests = computed(() => this.hrms.profileChangeRequests());
  allProfileChangeRequests = computed(() => {
    const data = this.hrms.allProfileChangeRequests();
    console.log('allProfileChangeRequests computed:', data);
    return data;
  });
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);

  ngOnInit() {
    if (this.canApprove()) {
      this.hrms.loadAllProfileChangeRequests(); // Load all for filtering
      this.hrms.loadMyProfileChangeRequests(); // Load own requests too
      
      // Debug: log profile change requests after loading
      setTimeout(() => {
        console.log('All profile change requests:', this.hrms.allProfileChangeRequests());
        console.log('My profile change requests:', this.hrms.profileChangeRequests());
        console.log('Current user:', this.auth.currentUser());
        console.log('Active tab:', this.activeTab);
        console.log('Active filter:', this.activeFilter);
        console.log('Filtered requests:', this.filteredRequests());
      }, 1000);
    } else {
      this.hrms.loadMyProfileChangeRequests();
    }
  }

  canApprove(): boolean {
    const result = this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE') || 
           this.auth.hasPermission('LEAVE_APPROVE') ||
           this.auth.currentRole() === 'Admin' ||
           this.auth.currentRole() === 'HR Manager' ||
           this.auth.currentRole() === 'Manager';
    console.log('canApprove check:', result);
    console.log('Current role:', this.auth.currentRole());
    console.log('Has EMPLOYEE_MANAGEMENT_UPDATE:', this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE'));
    console.log('Has LEAVE_APPROVE:', this.auth.hasPermission('LEAVE_APPROVE'));
    return result;
  }

  refreshRequests() {
    if (this.canApprove()) {
      this.hrms.loadAllProfileChangeRequests(); // Load all for filtering
      this.hrms.loadMyProfileChangeRequests();
    } else {
      this.hrms.loadMyProfileChangeRequests();
    }
  }

  setActiveTab(tab: 'approvals' | 'my-requests') {
    this.activeTab = tab;
    this.currentPage = 0; // Reset to first page when switching tabs
  }

  setFilter(filter: 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled') {
    this.activeFilter = filter;
    this.currentPage = 0; // Reset to first page when changing filter
  }

  getPendingCount(): number {
    return this.allProfileChangeRequests().filter(req => {
      const status = (req.status || '').toUpperCase();
      return status === 'PENDING' || status === 'Pending';
    }).length;
  }

  paginatedRequests(): any[] {
    const list = this.filteredRequests();
    const start = this.currentPage * this.pageSize;
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
      this.currentPage = page;
    }
  }

  filteredRequests(): any[] {
    let sourceList: any[] = [];

    if (this.canApprove()) {
      if (this.activeTab === 'approvals') {
        sourceList = [...this.allProfileChangeRequests()];
        console.log('Using allProfileChangeRequests for approvals tab:', sourceList);
      } else {
        sourceList = [...this.hrms.profileChangeRequests()];
        console.log('Using profileChangeRequests for my-requests tab:', sourceList);
      }
    } else {
      sourceList = [...this.hrms.profileChangeRequests()];
      console.log('Using profileChangeRequests for regular employee:', sourceList);
    }

    console.log('Source list for filtering:', sourceList);
    console.log('Current filter:', this.activeFilter);

    // Apply filter to both tabs
    const filter = this.activeFilter;
    if (filter !== 'All') {
      sourceList = sourceList.filter(req => {
        const status = (req.status || '').toUpperCase();
        console.log('Checking request status:', status, 'against filter:', filter);
        switch (filter) {
          case 'Pending':
            return status === 'PENDING' || status === 'Pending';
          case 'Approved':
            return status === 'APPROVED' || status === 'Approved';
          case 'Rejected':
            return status === 'REJECTED' || status === 'Rejected';
          case 'Cancelled':
            return status === 'CANCELLED' || status === 'Cancelled';
          default:
            return true;
        }
      });
    }

    console.log('Filtered result:', sourceList);

    return [...sourceList].sort((a, b) => {
      // Sort by status: Pending first, then by submitted date
      const statusA = (a.status || '').toUpperCase();
      const statusB = (b.status || '').toUpperCase();
      const isPendingA = statusA === 'PENDING' || statusA === 'Pending';
      const isPendingB = statusB === 'PENDING' || statusB === 'Pending';

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      // If both have same status, sort by submitted date (newest first)
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
