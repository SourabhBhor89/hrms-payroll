import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HrmsService } from '../../core/services/hrms.service';
import { ThemeService } from '../../core/services/theme.service';
import { UserRole } from '../../core/models/hrms.model';

interface NavItem {
  path: string;
  title: string;
  icon: string;
  roles: UserRole[];
  badge?: () => number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  auth = inject(AuthService);
  hrms = inject(HrmsService);
  theme = inject(ThemeService);

  isCollapsed = signal<boolean>(false);

  navItems: NavItem[] = [
    {
      path: '/dashboard',
      title: 'Dashboard',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee']
    },
    {
      path: '/employees',
      title: 'Employees',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee']
    },
    {
      path: '/attendance',
      title: 'Attendance',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee']
    },
    {
      path: '/leaves',
      title: 'Leave Requests',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee'],
      badge: () => this.hrms.pendingLeavesCount()
    },
    {
      path: '/holidays',
      title: 'Holidays',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee']
    },
    {
      path: '/timesheets',
      title: 'Timesheets',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      roles: ['Admin', 'HR Manager', 'Team Lead', 'Employee'],
      badge: () => this.hrms.pendingTimesheetsCount()
    }
  ];

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  handleHeaderBtnClick() {
    if (window.innerWidth <= 768) {
      this.theme.closeMobileSidebar();
    } else {
      this.toggleCollapse();
    }
  }

  canAccess(roles: UserRole[]): boolean {
    return this.auth.hasRole(roles);
  }

  onNavLinkClick() {
    this.theme.closeMobileSidebar();
  }
}
