import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { Employee, UserRole } from '../../core/models/hrms.model';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.css'
})
export class EmployeesComponent {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  viewMode = signal<'grid' | 'table'>('grid');
  searchQuery = '';
  selectedDept = 'All';
  selectedRoleFilter = 'All';

  showAddModal = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  activeTab = signal<'basic' | 'experience' | 'education' | 'contact'>('basic');
  selectedEmployee = signal<Employee | null>(null);

  newEmp: any = {
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: '',
    role: 'EMPLOYEE',
    password: '',
    joiningDate: new Date().toISOString().split('T')[0],
    dateOfBirth: '',
    address: '',
    isFresher: false,
    totalExperience: '',
    previousCompany: '',
    previousDesignation: '',
    previousSalary: '',
    currentSalary: '',
    techStack: '',
    education: '',
    emergencyContact1: '',
    emergencyContact2: '',
    photoUrl: '',
    hasGap: false,
    gapReason: '',
    referenceDetails: ''
  };

  filteredEmployees() {
    return this.hrms.employees().filter(e => {
      const matchSearch = e.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          e.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          e.designation.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchDept = this.selectedDept === 'All' || e.department === this.selectedDept;
      const matchRole = this.selectedRoleFilter === 'All' || e.role === this.selectedRoleFilter;
      return matchSearch && matchDept && matchRole;
    });
  }

  canManage(): boolean {
    return this.auth.hasPermission('EMPLOYEE_MANAGEMENT_CREATE') || this.auth.hasPermission('EMPLOYEE_MANAGEMENT_UPDATE');
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onFresherToggle() {
    if (this.newEmp.isFresher) {
      this.newEmp.totalExperience = '0';
      this.newEmp.previousCompany = '';
      this.newEmp.previousDesignation = '';
      this.newEmp.previousSalary = '';
    }
  }

  onGapToggle() {
    if (!this.newEmp.hasGap) {
      this.newEmp.gapReason = '';
    }
  }

  generateNextEmployeeCode(): string {
    const list = this.hrms.employees();
    let maxNum = list.length;
    for (const emp of list) {
      const code = emp.employeeId || emp.id || '';
      const match = code.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  }

  openAddModal() {
    this.showPassword.set(false);
    this.activeTab.set('basic');
    this.newEmp = {
      employeeCode: this.generateNextEmployeeCode(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      designation: '',
      role: 'EMPLOYEE',
      password: '',
      joiningDate: new Date().toISOString().split('T')[0],
      dateOfBirth: '',
      address: '',
      isFresher: false,
      totalExperience: '',
      previousCompany: '',
      previousDesignation: '',
      previousSalary: '',
      currentSalary: '',
      techStack: '',
      education: '',
      emergencyContact1: '',
      emergencyContact2: '',
      photoUrl: '',
      hasGap: false,
      gapReason: '',
      referenceDetails: ''
    };
    this.showAddModal.set(true);
  }

  saveNewEmployee() {
    if (this.newEmp.firstName && this.newEmp.email && this.newEmp.employeeCode) {
      this.hrms.addEmployee({ ...this.newEmp });
      this.showAddModal.set(false);
    }
  }

  deleteEmp(id: string) {
    if (confirm('Are you sure you want to remove this employee?')) {
      this.hrms.deleteEmployee(id);
    }
  }

  viewEmployeeDetails(emp: Employee) {
    this.selectedEmployee.set(emp);
  }
}
