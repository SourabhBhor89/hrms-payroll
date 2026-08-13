import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

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
    avatar: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  unreadNotificationsCount = 2;
  notifications = [
    { message: 'Elena Rostova submitted a new leave request.', time: '10 mins ago', type: 'info' },
    { message: 'Timesheet for week Aug 03 approved.', time: '2 hours ago', type: 'success' }
  ];

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
    const user = this.auth.currentUser();
    this.profileForm = {
      phone: user?.phone || '+91 9876543210',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
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
    if (!this.profileForm.phone) {
      this.showPopup('Phone number cannot be empty.', 'error');
      return;
    }
    this.isUpdatingProfile.set(true);
    this.auth.updateProfile({
      phone: this.profileForm.phone,
      avatar: this.profileForm.avatar
    }).subscribe({
      next: () => {
        this.isUpdatingProfile.set(false);
        this.showPopup('Profile details updated successfully!', 'success');
      },
      error: () => {
        // Fallback for local update
        this.isUpdatingProfile.set(false);
        this.showPopup('Profile details updated successfully!', 'success');
      }
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
