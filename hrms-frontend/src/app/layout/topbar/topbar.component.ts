import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
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
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showUserDropdown.set(false);
      this.showNotifDropdown.set(false);
    }
  }
}
