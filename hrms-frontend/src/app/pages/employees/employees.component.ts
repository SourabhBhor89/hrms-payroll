import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  router = inject(Router);

  ngOnInit() {
    this.loadEmployeesPage();
  }

  viewMode = signal<'grid' | 'table'>('grid');

  currentPage = signal<number>(0);
  pageSize = 10;
  sortBy = signal<string>('id');
  sortDir = signal<string>('asc');

  private searchTimeout: any = null;
  private _searchQuery = '';
  get searchQuery() { return this._searchQuery; }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.currentPage.set(0);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadEmployeesPage();
    }, 750);
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

  toggleSort(columnKey: string) {
    if (this.sortBy() === columnKey) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(columnKey);
      this.sortDir.set('asc');
    }
    this.currentPage.set(0);
    this.loadEmployeesPage();
  }

  paginatedEmployees() {
    return this.hrms.employees();
  }

  loadEmployeesPage() {
    let sortField = this.sortBy();
    if (sortField === 'employeeId') {
      sortField = 'employeeCode';
    }
    this.hrms.loadEmployees(
      this.currentPage(),
      this.pageSize,
      sortField,
      this.sortDir(),
      this.searchQuery,
      this.selectedDept,
      this.selectedRoleFilter
    );
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

  canViewEmployeeLeaveWfh(): boolean {
    const role = (this.auth.currentRole() || '').toUpperCase();
    return role === 'ADMIN' || role === 'HR MANAGER' || role === 'HR' || role === 'MANAGER' || role === 'COORDINATOR';
  }

  onEmployeeClick(emp: Employee) {
    if (this.canViewEmployeeLeaveWfh()) {
      this.router.navigate(['/employee-leave-wfh'], {
        queryParams: {
          employeeId: emp.id,
          employeeCode: emp.employeeId,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          avatar: emp.avatar
        }
      });
    }
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

  openAddModal() {
    this.showPassword.set(false);
    this.activeTab.set('basic');
    this.newEmp = {
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
    this.showAddModal.set(true);
    this.hrms.getNextEmployeeCode().subscribe({
      next: (res) => {
        if (res && res.employeeCode) {
          this.newEmp.employeeCode = res.employeeCode;
        }
      },
      error: (err) => {
        console.error('Failed to fetch next employee code:', err);
      }
    });
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
    else if (emp.role === 'Manager') roleCode = 'MANAGER';
    else if (emp.role === 'Coordinator') roleCode = 'COORDINATOR';
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
      tenthQualification: emp.tenthQualification || '',
      twelfthQualification: emp.twelfthQualification || '',
      bachelorQualification: emp.bachelorQualification || '',
      hasHighestQualification: !!emp.highestQualification,
      highestQualification: emp.highestQualification || '',
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
