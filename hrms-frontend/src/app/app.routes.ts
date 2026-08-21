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
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
      { path: 'dashboard', title: 'TRH - Live To Build', component: DashboardComponent },
      { path: 'employees', title: 'TRH - Live To Build', component: EmployeesComponent },
      { path: 'attendance', title: 'TRH - Live To Build', component: AttendanceComponent },
      { path: 'leaves', title: 'TRH - Live To Build', component: LeavesComponent },
      { path: 'holidays', title: 'TRH - Live To Build', component: HolidaysComponent },
      { path: 'timesheets', title: 'TRH - Live To Build', component: TimesheetsComponent },
      { path: 'profile-changes', title: 'TRH - Live To Build', component: ProfileChangesComponent }, // Keep route for dashboard access
      { path: 'employee-leave-wfh', title: 'TRH - Live To Build', component: EmployeeLeaveWfhComponent, canActivate: [permissionGuard], data: { permission: 'EMPLOYEE_LEAVE_WFH_VIEW' } }
    ]
  },

  { path: '**', redirectTo: 'auth/login' }
];
