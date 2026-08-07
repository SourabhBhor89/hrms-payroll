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
    joiningDate: new Date().toISOString().split('T')[0]
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

  openAddModal() {
    const nextNum = this.hrms.employees().length + 1;
    this.showPassword.set(false);
    this.newEmp = {
      employeeCode: `EMP-${String(nextNum).padStart(3, '0')}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      designation: '',
      role: 'EMPLOYEE',
      password: '',
      joiningDate: new Date().toISOString().split('T')[0]
    };
    this.showAddModal.set(true);
  }

  saveNewEmployee() {
    if (this.newEmp.firstName && this.newEmp.email && this.newEmp.employeeCode) {
      this.hrms.addEmployee({
        employeeCode: this.newEmp.employeeCode,
        firstName: this.newEmp.firstName,
        lastName: this.newEmp.lastName,
        email: this.newEmp.email,
        phone: this.newEmp.phone,
        department: this.newEmp.department,
        designation: this.newEmp.designation,
        role: this.newEmp.role,
        password: this.newEmp.password,
        joiningDate: this.newEmp.joiningDate
      });
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
