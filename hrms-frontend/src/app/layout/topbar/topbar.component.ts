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
  isUpdatingProfile = signal<boolean>(false);
  activeProfileTab = signal<'details' | 'password'>('details');
  isChangingPassword = signal<boolean>(false);
  popupMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  canChangePassword(): boolean {
    const role = this.auth.currentRole();
    return role === 'Admin' || role === 'HR Manager' || role === 'Manager';
  }

  profileForm = {
    phone: '',
    address: '',
    currentAddress: '',
    permanentAddress: '',
    avatar: ''
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

    console.log('=== Employee Matching Debug ===');
    console.log('Current user:', user);
    console.log('Available employees:', employees);
    console.log('User email:', userEmail);
    console.log('User name:', userName);
    console.log('User employeeId:', userCode);
    console.log('User id:', userId);

    // Log all available employeeIds for debugging
    const availableEmployeeIds = employees.map(e => e.employeeId);
    console.log('Available employeeIds:', availableEmployeeIds);

    // Strict employeeId matching only
    const matched = employees.find(e => {
      const eCode = (e.employeeId || '').toLowerCase().trim();
      const eEmail = (e.email || '').toLowerCase().trim();
      const eName = (e.name || '').toLowerCase().trim();

      const codeMatch = userCode && eCode && eCode === userCode;
      const emailMatch = userEmail && eEmail && eEmail === userEmail;
      const nameMatch = userName && eName && eName === userName;

      console.log(`Employee ${e.id}:`, {
        employeeId: e.employeeId,
        email: e.email,
        name: e.name,
        matches: { codeMatch, emailMatch, nameMatch }
      });

      // Only match if employeeId matches exactly
      return codeMatch || emailMatch || nameMatch;
    });

    console.log('Matched employee:', matched);
    console.log('=== End Debug ===');

    return matched || null;
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

    const profileChanges = this.hrms.pendingProfileChangeRequests();
    profileChanges.slice(0, 3).forEach(p => {
      const fieldType = p.fieldType === 'PHONE' ? 'Phone Number' :
                       p.fieldType === 'CURRENT_ADDRESS' ? 'Current Address' :
                       p.fieldType === 'PERMANENT_ADDRESS' ? 'Permanent Address' : p.fieldType;
      list.push({
        message: `${p.employeeName} submitted a profile change request for ${fieldType}.`,
        time: p.submittedAt ? p.submittedAt.split('T')[0] : 'Recently',
        type: 'info'
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
    // Load all employees to ensure we find the current user
    this.hrms.loadEmployees(0, 1000, 'id', 'asc');

    const user = this.auth.currentUser();
    const employee = this.currentEmployee();

    console.log('=== Profile Modal Debug ===');
    console.log('User data:', user);
    console.log('Employee data:', employee);
    console.log('User role:', this.auth.currentRole());
    console.log('Has employee data:', !!employee);

    // Immediate initialization with available data
    this.profileForm = {
      phone: employee?.phone || user?.phone || '',
      address: employee?.address || '',
      currentAddress: employee?.currentAddress || '',
      permanentAddress: employee?.permanentAddress || '',
      avatar: user?.avatar || employee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    console.log('Initial profile form (immediate):', this.profileForm);

    // If no employee data found, try to match again after delay
    if (!employee) {
      console.log('No employee found immediately, retrying after delay...');
      setTimeout(() => {
        const loadedEmployee = this.currentEmployee();
        console.log('Loaded employee after retry:', loadedEmployee);

        if (loadedEmployee) {
          this.profileForm = {
            phone: loadedEmployee.phone || user?.phone || '',
            address: loadedEmployee.address || '',
            currentAddress: loadedEmployee.currentAddress || '',
            permanentAddress: loadedEmployee.permanentAddress || '',
            avatar: user?.avatar || loadedEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };
          console.log('Profile form updated with employee data:', this.profileForm);
        } else {
          console.log('Still no employee found, using user data only');
        }
      }, 500);
    }

    this.showProfileModal.set(true);
    this.showUserDropdown.set(false);
    console.log('=== End Debug ===');
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
              this.hrms.loadMyProfileChangeRequests();
              this.hrms.loadPendingProfileChangeRequests();
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
    if (!this.canChangePassword()) {
      this.showPopup('Only Admin and HR Managers can change passwords.', 'error');
      return;
    }
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
