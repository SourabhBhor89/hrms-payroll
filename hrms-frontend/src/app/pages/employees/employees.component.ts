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

  formErrors = signal<Record<string, string>>({});
  formTouched = signal<boolean>(false);
  tabErrors = signal<{ basic: number; experience: number; education: number; contact: number }>({
    basic: 0,
    experience: 0,
    education: 0,
    contact: 0
  });

  getFieldError(field: string): string | null {
    if (!this.formTouched()) return null;
    return this.formErrors()[field] || null;
  }

  switchToEditFromView() {
    const emp = this.selectedEmployee();
    if (emp) {
      this.openEditModal(emp);
    }
  }

  recalculateTabErrors(errors: Record<string, string>) {
    const basicFields = ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'designation', 'role', 'password', 'joiningDate', 'dateOfBirth', 'maritalStatus', 'marriageDate'];
    const expFields = ['isFresher', 'totalExperience', 'previousCompany', 'previousDesignation', 'previousSalary', 'currentSalary', 'techStack'];
    const eduFields = ['tenthQualification', 'twelfthQualification', 'bachelorQualification', 'hasHighestQualification', 'highestQualification', 'hasGap', 'gapReason'];
    const contactFields = ['currentAddress', 'permanentAddress', 'emergencyContact1', 'emergencyContact2', 'photoUrl', 'referenceDetails'];

    const basicCount = basicFields.filter(f => !!errors[f]).length;
    const expCount = expFields.filter(f => !!errors[f]).length;
    const eduCount = eduFields.filter(f => !!errors[f]).length;
    const contactCount = contactFields.filter(f => !!errors[f]).length;

    this.tabErrors.set({
      basic: basicCount,
      experience: expCount,
      education: eduCount,
      contact: contactCount
    });

    if (basicCount > 0) this.activeTab.set('basic');
    else if (expCount > 0) this.activeTab.set('experience');
    else if (eduCount > 0) this.activeTab.set('education');
    else if (contactCount > 0) this.activeTab.set('contact');
  }

  validateEmployeeData(emp: any): boolean {
    const errors: Record<string, string> = {};
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
    const phoneRegex = /^[0-9]{10}$/;
    const empCodeRegex = /^TRHPL-[0-9]{3}$/;
    const numRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
    const pwdRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,20}$/;

    if (!emp.employeeCode || !emp.employeeCode.trim()) {
      errors['employeeCode'] = 'Employee code is required';
    } else if (!empCodeRegex.test(emp.employeeCode.trim())) {
      errors['employeeCode'] = 'Employee code must follow TRHPL-001 format';
    }

    if (!emp.firstName || !emp.firstName.trim()) {
      errors['firstName'] = 'First name is required';
    } else if (emp.firstName.trim().length < 2 || emp.firstName.trim().length > 50) {
      errors['firstName'] = 'First name must be between 2 and 50 characters';
    } else if (!nameRegex.test(emp.firstName.trim())) {
      errors['firstName'] = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (emp.lastName && emp.lastName.trim()) {
      if (emp.lastName.trim().length > 50) {
        errors['lastName'] = 'Last name cannot exceed 50 characters';
      } else if (!nameRegex.test(emp.lastName.trim())) {
        errors['lastName'] = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
      }
    }

    if (!emp.email || !emp.email.trim()) {
      errors['email'] = 'Email is required';
    } else if (!emailRegex.test(emp.email.trim())) {
      errors['email'] = 'Please enter a valid work email address';
    }

    if (!emp.phone || !emp.phone.trim()) {
      errors['phone'] = 'Phone number is required';
    } else if (!phoneRegex.test(emp.phone.trim())) {
      errors['phone'] = 'Phone number must be a valid 10-digit number';
    }

    const validDepts = ['Engineering', 'Human Resources', 'Design', 'Marketing', 'Finance'];
    if (!emp.department || !validDepts.includes(emp.department)) {
      errors['department'] = 'Please select a valid department';
    }

    if (!emp.designation || !emp.designation.trim()) {
      errors['designation'] = 'Designation is required';
    } else if (emp.designation.trim().length < 2 || emp.designation.trim().length > 100) {
      errors['designation'] = 'Designation must be between 2 and 100 characters';
    }

    const validRoles = ['EMPLOYEE', 'HR', 'MANAGER', 'COORDINATOR', 'ADMIN'];
    if (!emp.role || !validRoles.includes(emp.role)) {
      errors['role'] = 'Please select a valid role';
    }

    if (emp.password && emp.password.trim()) {
      if (!pwdRegex.test(emp.password.trim())) {
        errors['password'] = 'Password must be 8-20 characters long with uppercase, lowercase, digit, and special character';
      }
    }

    if (!emp.joiningDate) {
      errors['joiningDate'] = 'Joining date is required';
    }

    if (!emp.dateOfBirth) {
      errors['dateOfBirth'] = 'Date of birth is required';
    } else {
      const dob = new Date(emp.dateOfBirth);
      const today = new Date();
      if (dob >= today) {
        errors['dateOfBirth'] = 'Date of birth must be in the past';
      } else if (emp.joiningDate) {
        const joinDate = new Date(emp.joiningDate);
        const minJoinDate = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
        if (joinDate < minJoinDate) {
          errors['dateOfBirth'] = 'Employee must be at least 18 years old as of the joining date';
        }
      }
    }

    const validMarital = ['Single', 'Married', 'Divorced', 'Widowed'];
    if (!emp.maritalStatus || !validMarital.includes(emp.maritalStatus)) {
      errors['maritalStatus'] = 'Please select a valid marital status';
    } else if (emp.maritalStatus === 'Married') {
      if (!emp.marriageDate) {
        errors['marriageDate'] = 'Marriage date is required for married employees';
      } else {
        const mDate = new Date(emp.marriageDate);
        if (mDate > new Date()) {
          errors['marriageDate'] = 'Marriage date cannot be in the future';
        }
      }
    }

    if (emp.isFresher === null || emp.isFresher === undefined) {
      errors['isFresher'] = 'Fresher status is required';
    } else if (!emp.isFresher) {
      if (!emp.totalExperience || !emp.totalExperience.toString().trim()) {
        errors['totalExperience'] = 'Total experience is required for experienced candidates';
      } else if (!numRegex.test(emp.totalExperience.toString().trim())) {
        errors['totalExperience'] = 'Total experience must be a valid non-negative number';
      }

      if (!emp.previousCompany || !emp.previousCompany.trim()) {
        errors['previousCompany'] = 'Previous company is required';
      } else if (emp.previousCompany.trim().length < 2 || emp.previousCompany.trim().length > 100) {
        errors['previousCompany'] = 'Previous company must be between 2 and 100 characters';
      }

      if (!emp.previousDesignation || !emp.previousDesignation.trim()) {
        errors['previousDesignation'] = 'Previous designation is required';
      } else if (emp.previousDesignation.trim().length < 2 || emp.previousDesignation.trim().length > 100) {
        errors['previousDesignation'] = 'Previous designation must be between 2 and 100 characters';
      }

      if (emp.previousSalary && emp.previousSalary.toString().trim()) {
        if (!numRegex.test(emp.previousSalary.toString().trim())) {
          errors['previousSalary'] = 'Previous salary must be a valid non-negative number';
        }
      }
    }

    if (!emp.currentSalary || !emp.currentSalary.toString().trim()) {
      errors['currentSalary'] = 'Current salary is required';
    } else if (!numRegex.test(emp.currentSalary.toString().trim())) {
      errors['currentSalary'] = 'Current salary must be a valid non-negative number';
    }

    if (emp.techStack && emp.techStack.length > 255) {
      errors['techStack'] = 'Tech stack cannot exceed 255 characters';
    }

    if (!emp.tenthQualification || !emp.tenthQualification.trim()) {
      errors['tenthQualification'] = '10th qualification details are required';
    } else if (emp.tenthQualification.trim().length < 2 || emp.tenthQualification.trim().length > 100) {
      errors['tenthQualification'] = '10th qualification must be between 2 and 100 characters';
    }

    if (!emp.twelfthQualification || !emp.twelfthQualification.trim()) {
      errors['twelfthQualification'] = '12th qualification details are required';
    } else if (emp.twelfthQualification.trim().length < 2 || emp.twelfthQualification.trim().length > 100) {
      errors['twelfthQualification'] = '12th qualification must be between 2 and 100 characters';
    }

    if (!emp.bachelorQualification || !emp.bachelorQualification.trim()) {
      errors['bachelorQualification'] = 'Bachelor qualification details are required';
    } else if (emp.bachelorQualification.trim().length < 2 || emp.bachelorQualification.trim().length > 100) {
      errors['bachelorQualification'] = 'Bachelor qualification must be between 2 and 100 characters';
    }

    if (emp.hasHighestQualification) {
      if (!emp.highestQualification || !emp.highestQualification.trim()) {
        errors['highestQualification'] = 'Highest qualification details are required';
      } else if (emp.highestQualification.trim().length < 2 || emp.highestQualification.trim().length > 100) {
        errors['highestQualification'] = 'Highest qualification must be between 2 and 100 characters';
      }
    }

    if (emp.hasGap) {
      if (!emp.gapReason || !emp.gapReason.trim()) {
        errors['gapReason'] = 'Gap reason is required';
      } else if (emp.gapReason.trim().length < 5 || emp.gapReason.trim().length > 255) {
        errors['gapReason'] = 'Gap reason must be between 5 and 255 characters';
      }
    }

    if (!emp.currentAddress || !emp.currentAddress.trim()) {
      errors['currentAddress'] = 'Current address is required';
    } else if (emp.currentAddress.trim().length < 5 || emp.currentAddress.trim().length > 500) {
      errors['currentAddress'] = 'Current address must be between 5 and 500 characters';
    }

    if (!emp.permanentAddress || !emp.permanentAddress.trim()) {
      errors['permanentAddress'] = 'Permanent address is required';
    } else if (emp.permanentAddress.trim().length < 5 || emp.permanentAddress.trim().length > 500) {
      errors['permanentAddress'] = 'Permanent address must be between 5 and 500 characters';
    }

    if (!emp.emergencyContact1 || !emp.emergencyContact1.trim()) {
      errors['emergencyContact1'] = 'Emergency contact 1 is required';
    } else if (emp.emergencyContact1.trim().length > 100) {
      errors['emergencyContact1'] = 'Emergency contact 1 cannot exceed 100 characters';
    }

    if (emp.emergencyContact2 && emp.emergencyContact2.trim().length > 100) {
      errors['emergencyContact2'] = 'Emergency contact 2 cannot exceed 100 characters';
    }

    if (emp.photoUrl && emp.photoUrl.trim().length > 255) {
      errors['photoUrl'] = 'Photo URL cannot exceed 255 characters';
    }

    if (emp.referenceDetails && emp.referenceDetails.trim().length > 255) {
      errors['referenceDetails'] = 'Reference details cannot exceed 255 characters';
    }

    if (emp.benchStatus && !['YES', 'NO'].includes(emp.benchStatus.toUpperCase())) {
      errors['benchStatus'] = 'Bench status must be YES or NO';
    }

    this.formErrors.set(errors);
    this.recalculateTabErrors(errors);

    return Object.keys(errors).length === 0;
  }

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
    referenceDetails: '',
    benchStatus: 'NO'
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

  canUpdateBenchStatus(): boolean {
    return this.auth.hasPermission('EMPLOYEE_BENCH_STATUS_UPDATE');
  }

  isEmployeeRole(emp: Employee): boolean {
    if (!emp || !emp.role) return true;
    const r = emp.role.toString().trim().toUpperCase();
    return r === 'EMPLOYEE';
  }

  isEligibleForBenchStatus(emp: Employee): boolean {
    if (!emp) return false;
    const isEmpRole = this.isEmployeeRole(emp);
    const isNotTerminated = emp.status !== 'Terminated';
    return isEmpRole && isNotTerminated;
  }

  onBenchStatusChange(emp: Employee, newStatus: 'YES' | 'NO') {
    if (!this.canUpdateBenchStatus()) return;
    this.hrms.updateBenchStatus(emp.id, newStatus).subscribe({
      next: () => {
        this.popupMessage.set({ text: `Bench status updated to ${newStatus === 'YES' ? 'BENCH' : 'PROJECT'}`, type: 'success' });
        setTimeout(() => this.popupMessage.set(null), 3000);
      },
      error: (err) => {
        this.popupMessage.set({ text: err.error?.message || 'Failed to update bench status', type: 'error' });
        setTimeout(() => this.popupMessage.set(null), 4000);
      }
    });
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
    this.formTouched.set(false);
    this.formErrors.set({});
    this.tabErrors.set({ basic: 0, experience: 0, education: 0, contact: 0 });

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
      referenceDetails: '',
      benchStatus: 'NO'
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
    this.formTouched.set(true);
    if (!this.validateEmployeeData(this.newEmp)) {
      const firstError = Object.values(this.formErrors())[0] || 'Please fix validation errors before submitting.';
      this.showPopup(firstError, 'error');
      return;
    }
    this.isSaving.set(true);
    this.hrms.addEmployee({ ...this.newEmp }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.showAddModal.set(false);
        this.showPopup('Employee created successfully!', 'success');
      },
      error: (err) => {
        this.isSaving.set(false);
        let errorMsg = 'Failed to create employee. Please try again.';
        if (err?.error?.details && Object.keys(err.error.details).length > 0) {
          this.formErrors.set(err.error.details);
          this.recalculateTabErrors(err.error.details);
          errorMsg = Object.values(err.error.details)[0] as string;
        } else if (err?.error?.message && err.error.message !== 'Validation failed') {
          errorMsg = err.error.message;
        }
        this.showPopup(errorMsg, 'error');
      }
    });
  }

  openEditModal(emp: Employee) {
    this.editingEmployeeId.set(emp.id);
    this.formTouched.set(false);
    this.formErrors.set({});
    this.tabErrors.set({ basic: 0, experience: 0, education: 0, contact: 0 });

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
      referenceDetails: emp.referenceDetails || '',
      benchStatus: emp.benchStatus || 'NO'
    };

    this.activeTab.set('basic');
    this.isEditMode.set(true);
  }

  saveUpdatedEmployee() {
    const id = this.editingEmployeeId();
    if (!id) return;
    this.formTouched.set(true);
    if (!this.validateEmployeeData(this.editEmp)) {
      const firstError = Object.values(this.formErrors())[0] || 'Please fix validation errors before submitting.';
      this.showPopup(firstError, 'error');
      return;
    }
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
        let errorMsg = 'Failed to update employee. Please try again.';
        if (err?.error?.details && Object.keys(err.error.details).length > 0) {
          this.formErrors.set(err.error.details);
          this.recalculateTabErrors(err.error.details);
          errorMsg = Object.values(err.error.details)[0] as string;
        } else if (err?.error?.message && err.error.message !== 'Validation failed') {
          errorMsg = err.error.message;
        }
        this.showPopup(errorMsg, 'error');
      }
    });
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
