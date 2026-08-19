import { Component, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { HrmsService } from '../../core/services/hrms.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  hrms = inject(HrmsService);
  router = inject(Router);
  elementRef = inject(ElementRef);

  showNotifDropdown = signal<boolean>(false);
  showUserDropdown = signal<boolean>(false);
  showProfileModal = signal<boolean>(false);
  activeProfileTab = signal<'details' | 'password'>('details');
  isChangingPassword = signal<boolean>(false);
  isUpdatingProfile = signal<boolean>(false);
  popupMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  profileForm = {
    phone: '',
    address: '',
    currentAddress: '',
    permanentAddress: '',
    avatar: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  currentEmployee = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return null;
    const employees = this.hrms.employees();
    if (!employees || employees.length === 0) return null;

    const userEmail = (user.email || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();
    const userCode = (user.employeeId || '').toLowerCase().trim();
    const userId = String(user.id || '').trim();

    return employees.find(e =>
      (userEmail && e.email && e.email.toLowerCase().trim() === userEmail) ||
      (userName && e.name && e.name.toLowerCase().trim() === userName) ||
      (userId && e.userId && String(e.userId) === userId) ||
      (userCode && e.employeeId && e.employeeId.toLowerCase().trim() === userCode) ||
      (userId && String(e.id) === userId)
    ) || null;
  });

  notifications = computed(() => {
    const list: { message: string; time: string; type: 'info' | 'success' | 'warning' }[] = [];

    const leaves = this.hrms.leaveRequests().filter(l => l.status === 'PENDING' || l.status === 'Pending');
    leaves.slice(0, 3).forEach(l => {
      list.push({
        message: `${l.employeeName} submitted a new leave request.`,
        time: l.appliedOn || 'Recently',
        type: 'info'
      });
    });

    const regs = this.hrms.regularizationRequests().filter(r => r.status === 'Pending');
    regs.slice(0, 3).forEach(r => {
      list.push({
        message: `${r.employeeName} submitted an attendance regularization request.`,
        time: r.appliedOn || 'Recently',
        type: 'warning'
      });
    });

    return list;
  });

  get unreadNotificationsCount(): number {
    return this.notifications().length;
  }

  toggleNotifDropdown() {
    this.showNotifDropdown.set(!this.showNotifDropdown());
    this.showUserDropdown.set(false);
  }

  toggleUserDropdown() {
    this.showUserDropdown.set(!this.showUserDropdown());
    this.showNotifDropdown.set(false);
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        this.router.navigate(['/auth/login']);
      }
    });
  }

  openProfileModal() {
    this.hrms.loadEmployees();
    const user = this.auth.currentUser();
    const employee = this.currentEmployee();
    this.profileForm = {
      phone: user?.phone || employee?.phone || '+91 9876543210',
      address: employee?.address || '',
      currentAddress: employee?.currentAddress || employee?.address || '',
      permanentAddress: employee?.permanentAddress || employee?.address || '',
      avatar: user?.avatar || employee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
    this.activeProfileTab.set('details');
    this.showProfileModal.set(true);
    this.showUserDropdown.set(false);
    this.passwordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileForm.avatar = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  submitProfileUpdate() {
    // Validate reason is provided
    if (!this.profileForm.address || !this.profileForm.address.trim()) {
      this.showPopup('Please provide a reason for the change.', 'error');
      return;
    }
    
    // Check if any fields have changed
    const employee = this.currentEmployee();
    const phoneChanged = this.profileForm.phone !== (employee?.phone || '');
    const currentAddressChanged = this.profileForm.currentAddress !== (employee?.currentAddress || employee?.address || '');
    const permanentAddressChanged = this.profileForm.permanentAddress !== (employee?.permanentAddress || employee?.address || '');
    
    // Validate that at least one field has changed
    if (!phoneChanged && !currentAddressChanged && !permanentAddressChanged) {
      this.showPopup('Please make at least one change to submit a profile update request.', 'error');
      return;
    }
    
    // Validate phone number if it's being changed
    if (phoneChanged && !this.profileForm.phone.trim()) {
      this.showPopup('Phone number cannot be empty.', 'error');
      return;
    }
    
    this.isUpdatingProfile.set(true);
    
    // Create change requests for each changed field
    const requests = [];
    const reason = this.profileForm.address;
    
    if (phoneChanged) {
      requests.push({
        fieldType: 'PHONE',
        newValue: this.profileForm.phone,
        reason: reason
      });
    }
    
    if (currentAddressChanged) {
      requests.push({
        fieldType: 'CURRENT_ADDRESS',
        newValue: this.profileForm.currentAddress,
        reason: reason
      });
    }
    
    if (permanentAddressChanged) {
      requests.push({
        fieldType: 'PERMANENT_ADDRESS',
        newValue: this.profileForm.permanentAddress,
        reason: reason
      });
    }
    
    // Submit each request
    let completedRequests = 0;
    let hasError = false;
    
    requests.forEach(req => {
      this.hrms.createProfileChangeRequest(req).subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === requests.length) {
            this.isUpdatingProfile.set(false);
            if (!hasError) {
              this.showPopup('Profile change request submitted for approval!', 'success');
              setTimeout(() => this.showProfileModal.set(false), 1500);
            }
          }
        },
        error: (err: any) => {
          hasError = true;
          completedRequests++;
          if (completedRequests === requests.length) {
            this.isUpdatingProfile.set(false);
            const msg = err?.error?.message || 'Failed to submit profile change request.';
            this.showPopup(msg, 'error');
          }
        }
      });
    });
  }

  submitPasswordChange() {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.showPopup('New passwords do not match.', 'error');
      return;
    }
    if (this.passwordForm.currentPassword && this.passwordForm.newPassword) {
      this.isChangingPassword.set(true);
      this.auth.changePassword({
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword
      }).subscribe({
        next: () => {
          this.isChangingPassword.set(false);
          this.showPopup('Password updated successfully!', 'success');
          setTimeout(() => this.showProfileModal.set(false), 1500);
        },
        error: (err) => {
          this.isChangingPassword.set(false);
          const msg = err?.error?.message || 'Failed to change password.';
          this.showPopup(msg, 'error');
        }
      });
    }
  }

  showPopup(text: string, type: 'success' | 'error') {
    this.popupMessage.set({ text, type });
    setTimeout(() => this.popupMessage.set(null), 3000);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showUserDropdown.set(false);
      this.showNotifDropdown.set(false);
    }
  }
}
