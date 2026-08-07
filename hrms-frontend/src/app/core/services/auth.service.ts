import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole } from '../models/hrms.model';

export const MOCK_USERS: Record<UserRole, User> = {
  'Admin': {
    id: 'usr-1',
    employeeId: 'EMP-001',
    name: 'Alexandra Vance',
    email: 'alexandra.vance@hrms.io',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    department: 'Executive Management',
    designation: 'Chief Technology Officer'
  },
  'HR Manager': {
    id: 'usr-2',
    employeeId: 'EMP-004',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@hrms.io',
    role: 'HR Manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    department: 'Human Resources',
    designation: 'Head of People Operations'
  },
  'Team Lead': {
    id: 'usr-3',
    employeeId: 'EMP-002',
    name: 'Marcus Chen',
    email: 'marcus.chen@hrms.io',
    role: 'Team Lead',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    designation: 'Lead Architect'
  },
  'Employee': {
    id: 'usr-4',
    employeeId: 'EMP-003',
    name: 'Elena Rostova',
    email: 'elena.rostova@hrms.io',
    role: 'Employee',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    department: 'Design',
    designation: 'Senior Product Designer'
  }
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Active authenticated user signal
  currentUser = signal<User | null>(MOCK_USERS['Admin']);
  
  isAuthenticated = computed(() => this.currentUser() !== null);
  currentRole = computed(() => this.currentUser()?.role || 'Employee');

  login(email: string, password: string): boolean {
    // Role is derived from the API response (matched user's permissions)
    const matchedUser = Object.values(MOCK_USERS).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser || !password) {
      return false;
    }

    this.currentUser.set(matchedUser);
    localStorage.setItem('active_role', matchedUser.role);
    return true;
  }

  quickRoleSelect(role: UserRole) {
    this.currentUser.set(MOCK_USERS[role]);
    localStorage.setItem('active_role', role);
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('active_role');
  }

  switchRole(role: UserRole) {
    if (this.currentUser()) {
      const updatedUser = { ...this.currentUser()!, role };
      this.currentUser.set(updatedUser);
      localStorage.setItem('active_role', role);
    }
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.currentRole();
    return allowedRoles.includes(role);
  }
}
