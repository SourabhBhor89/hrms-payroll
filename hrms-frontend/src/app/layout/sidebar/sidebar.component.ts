import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HrmsService } from '../../core/services/hrms.service';
import { ThemeService } from '../../core/services/theme.service';
import { EmployeeDocumentService } from '../../core/services/employee-document.service';

interface NavItem {
  path: string;
  title: string;
  icon: string;
  permission?: string;
  badge?: () => number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  auth = inject(AuthService);
  hrms = inject(HrmsService);
  theme = inject(ThemeService);
  documentsApi = inject(EmployeeDocumentService);

  isCollapsed = signal<boolean>(false);

  ngOnInit(): void {
    if (this.auth.hasPermission('EMPLOYEE_DOCUMENT_REVIEW')) {
      this.documentsApi.getReviewQueue().subscribe();
    }
  }

  navItems: NavItem[] = [
    {
      path: '/dashboard',
      title: 'Dashboard',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`
    },
    {
      path: '/my-documents',
      title: 'My Documents',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
    },
    {
      path: '/employees',
      title: 'Employees',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      permission: 'EMPLOYEE_MANAGEMENT_VIEW'
    },
    {
      path: '/attendance',
      title: 'Attendance',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
      permission: 'ATTENDANCE_VIEW'
    },
    {
      path: '/leaves',
      title: 'Leave Requests',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
      permission: 'LEAVE_VIEW',
      badge: () => this.hrms.pendingLeavesCount()
    },
    {
      path: '/holidays',
      title: 'Holidays',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      permission: 'HOLIDAY_VIEW'
    },
    {
      path: '/employee-leave-wfh',
      title: 'Employee Leave & WFH',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h4"/><path d="M8 18h8"/></svg>`,
      permission: 'EMPLOYEE_LEAVE_WFH_VIEW'
    },
    {
      path: '/document-review',
      title: 'Document Review',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      permission: 'EMPLOYEE_DOCUMENT_REVIEW',
      badge: () => this.documentsApi.pendingReviewsCount()
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

  canAccess(item: NavItem): boolean {
    if (!item.permission) return true;
    return this.auth.hasPermission(item.permission);
  }

  onNavLinkClick() {
    this.theme.closeMobileSidebar();
  }
}
