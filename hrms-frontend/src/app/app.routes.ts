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
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Auth Routes
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', component: ResetPasswordComponent },

  // App Shell Layout Protected Routes
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'employees', component: EmployeesComponent },
      { path: 'attendance', component: AttendanceComponent },
      { path: 'leaves', component: LeavesComponent },
      { path: 'holidays', component: HolidaysComponent },
      { path: 'timesheets', component: TimesheetsComponent },
      { path: 'profile-changes', component: ProfileChangesComponent } // Keep route for dashboard access
    ]
  },

  { path: '**', redirectTo: 'auth/login' }
];
