import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { AttendanceComponent } from './pages/attendance/attendance.component';
import { LeavesComponent } from './pages/leaves/leaves.component';
import { HolidaysComponent } from './pages/holidays/holidays.component';
import { TimesheetsComponent } from './pages/timesheets/timesheets.component';
import { ProfileChangesComponent } from './pages/profile-changes/profile-changes.component';
import { EmployeeLeaveWfhComponent } from './pages/employee-leave-wfh/employee-leave-wfh.component';
import { DocumentOnboardingComponent } from './pages/document-onboarding/document-onboarding.component';
import { DocumentReviewComponent } from './pages/document-review/document-review.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { documentOnboardingGuard } from './core/guards/document-onboarding.guard';

export const routes: Routes = [
  // Auth Routes
  { path: 'auth/login', title: 'TRH - Live To Build', component: LoginComponent },
  { path: 'auth/forgot-password', title: 'TRH - Live To Build', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', title: 'TRH - Live To Build', component: ResetPasswordComponent },
  // App Shell Layout Protected Routes
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', title: 'TRH - Live To Build', component: DashboardComponent, canActivate: [documentOnboardingGuard] },
      { path: 'employees', title: 'TRH - Live To Build', component: EmployeesComponent, canActivate: [documentOnboardingGuard] },
      { path: 'attendance', title: 'TRH - Live To Build', component: AttendanceComponent, canActivate: [documentOnboardingGuard] },
      { path: 'leaves', title: 'TRH - Live To Build', component: LeavesComponent, canActivate: [documentOnboardingGuard] },
      { path: 'holidays', title: 'TRH - Live To Build', component: HolidaysComponent, canActivate: [documentOnboardingGuard] },
      { path: 'timesheets', title: 'TRH - Live To Build', component: TimesheetsComponent, canActivate: [documentOnboardingGuard] },
      { path: 'profile-changes', title: 'TRH - Live To Build', component: ProfileChangesComponent, canActivate: [documentOnboardingGuard] },
      { path: 'employee-leave-wfh', title: 'TRH - Live To Build', component: EmployeeLeaveWfhComponent, canActivate: [permissionGuard, documentOnboardingGuard], data: { permission: 'EMPLOYEE_LEAVE_WFH_VIEW' } },
      { path: 'document-review', title: 'TRH - Document Review', component: DocumentReviewComponent, canActivate: [permissionGuard], data: { permission: 'EMPLOYEE_DOCUMENT_REVIEW' } },
      { path: 'my-documents', title: 'TRH - My Documents', component: DocumentOnboardingComponent },
      { path: 'document-onboarding', redirectTo: 'my-documents', pathMatch: 'full' }
    ]
  },
  { path: 'document-onboarding', redirectTo: 'my-documents', pathMatch: 'full' },

  { path: '**', redirectTo: 'auth/login' }
];
