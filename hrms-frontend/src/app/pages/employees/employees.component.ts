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
    this.loadEmployeesPage();
  }

  viewMode = signal<'grid' | 'table'>('grid');
  
  currentPage = signal<number>(0);
  pageSize = 10;
  sortBy = signal<string>('id');
  sortDir = signal<string>('asc');

  private _searchQuery = '';
  get searchQuery() { return this._searchQuery; }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.currentPage.set(0);
    this.loadEmployeesPage();
  }

  private _selectedDept = 'All';
  get selectedDept() { return this._selectedDept; }
  set selectedDept(val: string) {
    this._selectedDept = val;
    this.currentPage.set(0);
    this.loadEmployeesPage();
  }

  private _selectedRoleFilter = 'All';
  get selectedRoleFilter() { return this._selectedRoleFilter; }
  set selectedRoleFilter(val: string) {
    this._selectedRoleFilter = val;
    this.currentPage.set(0);
    this.loadEmployeesPage();
  }

  paginatedEmployees() {
    return this.hrms.employees();
  }

  loadEmployeesPage() {
    this.hrms.loadEmployees(this.currentPage(), this.pageSize, this.sortBy(), this.sortDir());
  }

  getEmployeePages(): number[] {
    const pagination = this.hrms.employeePagination();
    const totalPages = pagination.totalPages;
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTotalEmployeePages(): number {
    return this.hrms.employeePagination().totalPages;
  }

  goToEmployeePage(page: number) {
    const totalPages = this.getTotalEmployeePages();
    if (page >= 0 && page < totalPages) {
      this.currentPage.set(page);
      this.loadEmployeesPage();
    }
  }

  showAddModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingEmployeeId = signal<string | null>(null);
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
    tenthQualification: '',
    twelfthQualification: '',
    bachelorQualification: '',
    hasHighestQualification: false,
    highestQualification: '',
    emergencyContact1: '',
    emergencyContact2: '',
    photoUrl: '',
    hasGap: false,
    gapReason: '',
    referenceDetails: ''
  };

  editEmp: any = {
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: '',
    role: 'EMPLOYEE',
    joiningDate: '',
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
    // With server-side pagination, we return the current page data
    // Client-side filtering is disabled for now since backend handles pagination
    return this.hrms.employees();
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

  onHighestQualificationToggle() {
    if (!this.newEmp.hasHighestQualification) {
      this.newEmp.highestQualification = '';
    }
  }

  onEditFresherToggle() {
    if (this.editEmp.isFresher) {
      this.editEmp.totalExperience = '0';
      this.editEmp.previousCompany = '';
      this.editEmp.previousDesignation = '';
      this.editEmp.previousSalary = '';
    }
  }

  onEditGapToggle() {
    if (!this.editEmp.hasGap) {
      this.editEmp.gapReason = '';
    }
  }

  onEditMaritalStatusChange() {
    if (this.editEmp.maritalStatus !== 'Married') {
      this.editEmp.marriageDate = '';
    }
  }

  onEditSameAddressToggle() {
    if (this.editEmp.sameAsCurrentAddress) {
      this.editEmp.permanentAddress = this.editEmp.currentAddress;
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
      tenthQualification: '',
      twelfthQualification: '',
      bachelorQualification: '',
      hasHighestQualification: false,
      highestQualification: '',
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

  openEditModal(emp: Employee) {
    this.editingEmployeeId.set(emp.id);
    const nameParts = (emp.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let roleCode = 'EMPLOYEE';
    if (emp.role === 'Admin') roleCode = 'ADMIN';
    else if (emp.role === 'HR Manager') roleCode = 'HR';
    else if (typeof emp.role === 'string') roleCode = emp.role.toUpperCase();

    this.editEmp = {
      employeeCode: emp.employeeId || '',
      firstName,
      lastName,
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || 'Engineering',
      designation: emp.designation || '',
      role: roleCode,
      joiningDate: emp.joinDate || '',
      dateOfBirth: emp.dateOfBirth || '',
      address: emp.address || '',
      currentAddress: emp.currentAddress || emp.address || '',
      permanentAddress: emp.permanentAddress || emp.address || '',
      sameAsCurrentAddress: !!(emp.currentAddress && emp.currentAddress === emp.permanentAddress),
      maritalStatus: emp.maritalStatus || 'Single',
      marriageDate: emp.marriageDate || '',
      isFresher: emp.isFresher || false,
      totalExperience: emp.totalExperience || '',
      previousCompany: emp.previousCompany || '',
      previousDesignation: emp.previousDesignation || '',
      previousSalary: emp.previousSalary || '',
      currentSalary: emp.currentSalary || '',
      techStack: emp.techStack || '',
      education: emp.education || '',
      emergencyContact1: emp.emergencyContact1 || '',
      emergencyContact2: emp.emergencyContact2 || '',
      photoUrl: emp.photoUrl || emp.avatar || '',
      hasGap: emp.hasGap || false,
      gapReason: emp.gapReason || '',
      referenceDetails: emp.referenceDetails || ''
    };

    this.activeTab.set('basic');
    this.isEditMode.set(true);
  }

  switchToEditFromView() {
    const emp = this.selectedEmployee();
    if (emp) {
      this.openEditModal(emp);
    }
  }

  saveUpdatedEmployee() {
    const id = this.editingEmployeeId();
    if (!id) return;
    if (this.editEmp.firstName && this.editEmp.email && this.editEmp.employeeCode) {
      this.isSaving.set(true);
      this.hrms.updateEmployee(id, { ...this.editEmp }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isEditMode.set(false);
          this.editingEmployeeId.set(null);
          
          // Update selectedEmployee signal if viewing
          const updatedInList = this.hrms.employees().find(e => e.id === id);
          if (updatedInList) {
            this.selectedEmployee.set(updatedInList);
          } else {
            this.selectedEmployee.set(null);
          }

          this.showPopup('Employee updated successfully!', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          const errorMsg = err?.error?.message || 'Failed to update employee. Please try again.';
          this.showPopup(errorMsg, 'error');
        }
      });
    }
  }

  cancelEdit() {
    this.isEditMode.set(false);
    this.editingEmployeeId.set(null);
    if (!this.selectedEmployee()) {
      this.activeTab.set('basic');
    }
  }

  closeViewModal() {
    this.selectedEmployee.set(null);
    this.isEditMode.set(false);
    this.editingEmployeeId.set(null);
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
    this.isEditMode.set(false);
  }
}
