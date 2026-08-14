import { Component, inject, signal, OnInit } from '@angular/core';
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
export class EmployeesComponent implements OnInit {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  ngOnInit() {
    this.hrms.loadEmployees();
  }

  viewMode = signal<'grid' | 'table'>('grid');
  searchQuery = '';
  selectedDept = 'All';
  selectedRoleFilter = 'All';

  showAddModal = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  activeTab = signal<'basic' | 'experience' | 'education' | 'contact'>('basic');
  selectedEmployee = signal<Employee | null>(null);
  isSaving = signal<boolean>(false);
  popupMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  employeeToDelete = signal<string | null>(null);

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
    currentAddress: '',
    permanentAddress: '',
    sameAsCurrentAddress: false,
    maritalStatus: 'Single',
    marriageDate: '',
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

  onMaritalStatusChange() {
    if (this.newEmp.maritalStatus !== 'Married') {
      this.newEmp.marriageDate = '';
    }
  }

  onSameAddressToggle() {
    if (this.newEmp.sameAsCurrentAddress) {
      this.newEmp.permanentAddress = this.newEmp.currentAddress;
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
      currentAddress: '',
      permanentAddress: '',
      sameAsCurrentAddress: false,
      maritalStatus: 'Single',
      marriageDate: '',
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
      this.isSaving.set(true);
      this.hrms.addEmployee({ ...this.newEmp }).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showAddModal.set(false);
          this.showPopup('Employee created successfully!', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          const errorMsg = err?.error?.message || 'Failed to create employee. Please try again.';
          this.showPopup(errorMsg, 'error');
        }
      });
    }
  }

  showPopup(text: string, type: 'success' | 'error') {
    this.popupMessage.set({ text, type });
    setTimeout(() => {
      this.popupMessage.set(null);
    }, 4000);
  }

  deleteEmp(id: string) {
    this.employeeToDelete.set(id);
  }

  confirmDelete() {
    const id = this.employeeToDelete();
    if (id) {
      this.hrms.deleteEmployee(id).subscribe({
        next: () => {
          this.employeeToDelete.set(null);
          this.showPopup('Employee removed successfully!', 'success');
        },
        error: (err) => {
          this.employeeToDelete.set(null);
          const errorMsg = err?.error?.message || 'Failed to remove employee.';
          this.showPopup(errorMsg, 'error');
        }
      });
    }
  }

  cancelDelete() {
    this.employeeToDelete.set(null);
  }

  viewEmployeeDetails(emp: Employee) {
    this.selectedEmployee.set(emp);
  }
}
