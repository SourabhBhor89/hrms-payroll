import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, UserRole } from '../models/hrms.model';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: number;
    name: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/auth';

  currentUser = signal<User | null>(this.loadStoredUser());
  userPermissions = signal<string[]>(this.loadStoredPermissions());

  isAuthenticated = computed(() => this.currentUser() !== null);
  currentRole = computed<UserRole>(() => {
    const r = (this.currentUser()?.role || '') as string;
    if (r === 'ADMIN' || r === 'Admin') return 'Admin';
    if (r === 'HR' || r === 'HR Manager') return 'HR Manager';
    if (r === 'TEAM_LEAD' || r === 'Team Lead') return 'Team Lead';
    return 'Employee';
  });

  constructor() {
    // Refresh permissions state if token exists
    const token = localStorage.getItem('access_token');
    if (token) {
      this.userPermissions.set(this.extractPermissionsFromToken(token));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res && res.accessToken) {
          localStorage.setItem('access_token', res.accessToken);

          const perms = this.extractPermissionsFromToken(res.accessToken);
          this.userPermissions.set(perms);
          localStorage.setItem('user_permissions', JSON.stringify(perms));

          const mappedUser: User = {
            id: String(res.user?.id || '1'),
            employeeId: `EMP-00${res.user?.id || 1}`,
            name: res.user?.name || email.split('@')[0],
            email: email,
            phone: '+91 9876543210',
            role: this.mapRole(res.user?.role),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: res.user?.role === 'ADMIN' ? 'Executive' : 'Operations',
            designation: res.user?.role === 'ADMIN' ? 'Administrator' : 'Staff Member'
          };

          this.currentUser.set(mappedUser);
          localStorage.setItem('user_info', JSON.stringify(mappedUser));
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_permissions');
    this.currentUser.set(null);
    this.userPermissions.set([]);
  }

  changePassword(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, payload);
  }

  updateProfile(payload: { phone?: string; avatar?: string }): Observable<any> {
    const user = this.currentUser();
    if (user) {
      const updatedUser: User = {
        ...user,
        phone: payload.phone !== undefined ? payload.phone : user.phone,
        avatar: payload.avatar !== undefined ? payload.avatar : user.avatar
      };
      this.currentUser.set(updatedUser);
      localStorage.setItem('user_info', JSON.stringify(updatedUser));
    }
    return this.http.put<any>(`${this.apiUrl}/profile`, payload).pipe(
      catchError(() => throwError(() => new Error('Local update applied.')))
    );
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.currentRole();
    return allowedRoles.includes(role);
  }

  hasPermission(permission: string): boolean {
    const perms = this.userPermissions();
    if (!perms || perms.length === 0) {
      // If role is Admin, default grant permissions
      return this.currentRole() === 'Admin';
    }
    return perms.includes(permission) || this.currentRole() === 'Admin';
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  private mapRole(roleStr?: string): UserRole {
    if (!roleStr) return 'Employee';
    const r = roleStr.toUpperCase();
    if (r === 'ADMIN') return 'Admin';
    if (r === 'HR') return 'HR Manager';
    if (r === 'TEAM_LEAD') return 'Team Lead';
    return 'Employee';
  }

  private extractPermissionsFromToken(token: string): string[] {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return [];
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return Array.isArray(parsed.permissions) ? parsed.permissions : [];
    } catch (e) {
      console.error('Failed to parse JWT permissions claim:', e);
      return [];
    }
  }

  private loadStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('user_info');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private loadStoredPermissions(): string[] {
    try {
      const stored = localStorage.getItem('user_permissions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}
