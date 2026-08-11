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

  myFilterStatus = 'All';
  teamFilterStatus = 'All';
  showModal = signal<boolean>(false);

  newRequest = {
    leaveType: 'Casual Leave' as LeaveType,
    startDate: '',
    endDate: '',
    totalDays: 1,
    reason: ''
  };

  myRequests() {
    const userId = this.auth.currentUser()?.employeeId || '';
    const list = this.hrms.leaveRequests().filter(r => r.employeeId === userId);
    if (this.myFilterStatus === 'All') return list;
    return list.filter(r => r.status === this.myFilterStatus);
  }

  teamRequests() {
    const userId = this.auth.currentUser()?.employeeId || '';
    const list = this.hrms.leaveRequests().filter(r => r.employeeId !== userId);
    if (this.teamFilterStatus === 'All') return list;
    return list.filter(r => r.status === this.teamFilterStatus);
  }

  canApprove(): boolean {
    return this.auth.hasPermission('LEAVE_APPROVE');
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
