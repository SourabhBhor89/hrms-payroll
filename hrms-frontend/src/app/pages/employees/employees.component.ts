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
  selectedEmployee = signal<Employee | null>(null);

  newEmp: any = {
    name: '',
    email: '',
    department: 'Engineering',
    designation: '',
    role: 'Employee'
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
    return this.auth.hasRole(['Admin', 'HR Manager']);
  }

  openAddModal() {
    this.newEmp = { name: '', email: '', department: 'Engineering', designation: '', role: 'Employee' };
    this.showAddModal.set(true);
  }

  saveNewEmployee() {
    if (this.newEmp.name && this.newEmp.email) {
      this.hrms.addEmployee({
        employeeId: `EMP-00${this.hrms.employees().length + 1}`,
        name: this.newEmp.name,
        email: this.newEmp.email,
        phone: '+1 (555) 000-1122',
        role: this.newEmp.role as UserRole,
        department: this.newEmp.department,
        designation: this.newEmp.designation || 'Specialist',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        salary: 90000,
        location: 'San Francisco, CA',
        leaveBalance: { casual: 10, sick: 7, paid: 15, wfh: 10 }
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
