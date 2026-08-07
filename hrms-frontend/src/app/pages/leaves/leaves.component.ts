import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaveRequest, LeaveType } from '../../core/models/hrms.model';

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaves.component.html',
  styleUrl: './leaves.component.css'
})
export class LeavesComponent {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  filterStatus = 'All';
  showModal = signal<boolean>(false);

  newRequest = {
    leaveType: 'Casual Leave' as LeaveType,
    startDate: '',
    endDate: '',
    totalDays: 1,
    reason: ''
  };

  filteredRequests() {
    if (this.filterStatus === 'All') return this.hrms.leaveRequests();
    return this.hrms.leaveRequests().filter(r => r.status === this.filterStatus);
  }

  canApprove(): boolean {
    return this.auth.hasRole(['Admin', 'HR Manager', 'Team Lead']);
  }

  openRequestModal() {
    this.showModal.set(true);
  }

  submitForm() {
    if (this.newRequest.startDate && this.newRequest.reason) {
      const user = this.auth.currentUser();
      this.hrms.submitLeaveRequest({
        employeeId: user?.employeeId || 'EMP-001',
        employeeName: user?.name || 'User',
        employeeAvatar: user?.avatar || '',
        department: user?.department || 'Engineering',
        leaveType: this.newRequest.leaveType,
        startDate: this.newRequest.startDate,
        endDate: this.newRequest.endDate || this.newRequest.startDate,
        totalDays: this.newRequest.totalDays,
        reason: this.newRequest.reason
      });
      this.showModal.set(false);
    }
  }

  approve(id: string) {
    this.hrms.updateLeaveStatus(id, 'Approved', `Approved by ${this.auth.currentUser()?.name}`);
  }

  reject(id: string) {
    this.hrms.updateLeaveStatus(id, 'Rejected', `Rejected by ${this.auth.currentUser()?.name}`);
  }
}
