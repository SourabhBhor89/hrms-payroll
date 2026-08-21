import { Component, inject, signal, ElementRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeSearchResult, EmployeeLeaveWfhSummary, CalendarDayEntry, LeaveTypeSummary } from '../../core/models/hrms.model';

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-employee-leave-wfh',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-leave-wfh.component.html',
  styleUrl: './employee-leave-wfh.component.css'
})
export class EmployeeLeaveWfhComponent implements OnInit {
  private hrmsService = inject(HrmsService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  @ViewChild('searchInput') searchInput!: ElementRef;

  // Search state
  searchQuery = signal<string>('');
  searchResults = signal<EmployeeSearchResult[]>([]);
  isSearching = signal<boolean>(false);
  showDropdown = signal<boolean>(false);
  searchTimeout: any = null;

  // Selected Employee state
  selectedEmployee = signal<EmployeeSearchResult | null>(null);

  // Month & Year state
  selectedYear = signal<number>(new Date().getFullYear());
  selectedMonth = signal<number>(new Date().getMonth() + 1); // 1-12

  yearsList: number[] = [];
  monthsList: MonthOption[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Summary report state
  summaryData = signal<EmployeeLeaveWfhSummary | null>(null);
  isLoadingSummary = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Day Status Edit Modal state
  showEditModal = signal<boolean>(false);
  selectedDayCell = signal<CalendarDayEntry | null>(null);
  editStatus = signal<string>('PRESENT'); // PRESENT, ABSENT, WFH, LEAVE
  editLeaveTypeId = signal<number | null>(null);
  editReason = signal<string>('');
  isSavingStatus = signal<boolean>(false);

  constructor() {
    const currentYr = new Date().getFullYear();
    for (let y = currentYr - 2; y <= currentYr + 2; y++) {
      this.yearsList.push(y);
    }
    this.hrmsService.loadLeaveTypes();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['employeeId']) {
        const empId = Number(params['employeeId']);
        const empSearchResult: EmployeeSearchResult = {
          id: empId,
          employeeCode: params['employeeCode'] || `EMP-00${empId}`,
          name: params['name'] || 'Employee',
          department: params['department'] || 'Staff',
          designation: params['designation'] || 'Staff Member',
          avatar: params['avatar'] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        this.selectEmployee(empSearchResult);
      }
    });
  }

  get availableLeaveTypes() {
    const summary = this.summaryData();
    if (!summary || !summary.leaveTypeSummaries) {
      return this.hrmsService.leaveTypes().filter(lt => lt.code !== 'WFH');
    }

    const availableSummaries = summary.leaveTypeSummaries.filter(item => {
      if (item.leaveTypeCode && item.leaveTypeCode.toUpperCase() === 'WFH') {
        return false;
      }
      const balance = typeof item.balanceDays === 'number' ? item.balanceDays : parseFloat(String(item.balanceDays || '0'));
      return item.defaultDaysPerYear === 0 || balance > 0;
    });

    if (availableSummaries.length > 0) {
      return availableSummaries.map(item => ({
        id: item.leaveTypeId,
        code: item.leaveTypeCode,
        name: item.leaveTypeName,
        balanceDays: item.balanceDays
      }));
    }

    return this.hrmsService.leaveTypes()
      .filter(lt => lt.code !== 'WFH')
      .map(lt => ({
        id: lt.id,
        code: lt.code,
        name: lt.name,
        balanceDays: 0
      }));
  }

  canEdit(): boolean {
    const role = (this.auth.currentRole() || '').toUpperCase();
    return role === 'ADMIN' || role === 'HR MANAGER' || role === 'HR' || role === 'MANAGER';
  }

  openEditModal(cell: CalendarDayEntry) {
    if (!this.canEdit()) return;
    this.selectedDayCell.set(cell);
    if (cell.isWfh) {
      this.editStatus.set('WFH');
    } else if (cell.isLeave) {
      this.editStatus.set('LEAVE');
    } else if (cell.isPresent) {
      this.editStatus.set('PRESENT');
    } else {
      this.editStatus.set('ABSENT');
    }
    this.editReason.set('');

    const types = this.availableLeaveTypes;
    if (types && types.length > 0) {
      this.editLeaveTypeId.set(types[0].id);
    }
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedDayCell.set(null);
  }

  saveDayStatus() {
    const cell = this.selectedDayCell();
    const emp = this.selectedEmployee();
    if (!cell || !emp) return;

    this.isSavingStatus.set(true);
    const payload = {
      employeeId: emp.id,
      date: cell.date,
      status: this.editStatus(),
      leaveTypeId: this.editStatus() === 'LEAVE' ? (this.editLeaveTypeId() || undefined) : undefined,
      reason: this.editReason()
    };

    this.hrmsService.updateEmployeeDayStatus(payload).subscribe({
      next: () => {
        this.isSavingStatus.set(false);
        this.closeEditModal();
        this.loadSummaryData();
      },
      error: (err) => {
        console.error('Failed to update day status:', err);
        this.isSavingStatus.set(false);
        this.closeEditModal();
        this.loadSummaryData();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.searchInput && !this.searchInput.nativeElement.contains(event.target)) {
      this.showDropdown.set(false);
    }
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query || query.trim().length === 0) {
      this.searchResults.set([]);
      this.showDropdown.set(false);
      this.isSearching.set(false);
      return;
    }

    this.searchTimeout = setTimeout(() => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      this.isSearching.set(true);
      this.hrmsService.searchEmployees(trimmedQuery).subscribe({
        next: (results) => {
          this.searchResults.set(results || []);
          this.showDropdown.set(true);
          this.isSearching.set(false);
        },
        error: (err) => {
          console.error('Employee search error:', err);
          this.searchResults.set([]);
          this.isSearching.set(false);
        }
      });
    }, 750);
  }

  selectEmployee(emp: EmployeeSearchResult) {
    this.selectedEmployee.set(emp);
    this.searchQuery.set(`${emp.name} (${emp.employeeCode})`);
    this.showDropdown.set(false);
    this.loadSummaryData();
  }

  onMonthChange(newMonth: number) {
    this.selectedMonth.set(Number(newMonth));
    if (this.selectedEmployee()) {
      this.loadSummaryData();
    }
  }

  onYearChange(newYear: number) {
    this.selectedYear.set(Number(newYear));
    if (this.selectedEmployee()) {
      this.loadSummaryData();
    }
  }

  loadSummaryData() {
    const emp = this.selectedEmployee();
    if (!emp) return;

    this.isLoadingSummary.set(true);
    this.errorMessage.set(null);

    this.hrmsService.getEmployeeLeaveWfhSummary(emp.id, this.selectedYear(), this.selectedMonth()).subscribe({
      next: (data) => {
        this.summaryData.set(data);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        console.error('Failed to load employee summary:', err);
        if (err.status === 403) {
          this.errorMessage.set('Access Denied: You do not have permission (EMPLOYEE_LEAVE_WFH_VIEW) to view Employee Leave & WFH reports.');
        } else {
          this.errorMessage.set('Failed to load leave & WFH summary for the selected employee.');
        }
        this.isLoadingSummary.set(false);
      }
    });
  }

  // Padding cells for month grid start
  get paddingCells(): number[] {
    const summary = this.summaryData();
    if (!summary || !summary.calendarEntries || summary.calendarEntries.length === 0) return [];

    const firstEntry = summary.calendarEntries[0];
    const dateObj = new Date(firstEntry.date);
    let startDayOfWeek = dateObj.getDay() - 1; // Mon=0, Sun=6
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    return Array(startDayOfWeek).fill(0);
  }

  getSelectedMonthName(): string {
    const m = this.monthsList.find(item => item.value === this.selectedMonth());
    return m ? `${m.label} ${this.selectedYear()}` : `${this.selectedYear()}`;
  }

  private formatDateStr(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal;
    if (Array.isArray(dateVal)) {
      const y = dateVal[0];
      const m = String(dateVal[1]).padStart(2, '0');
      const d = String(dateVal[2]).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(dateVal);
  }

  private getTodayStr(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getDayNumber(dateVal: any): number {
    if (Array.isArray(dateVal)) {
      return dateVal[2];
    }
    const dStr = this.formatDateStr(dateVal);
    if (!dStr) return 1;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return parseInt(parts[2], 10);
    }
    return new Date(dStr).getDate();
  }

  private parseCellDate(dateVal: any): Date | null {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      const parts = dateVal.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (Array.isArray(dateVal)) {
      return new Date(dateVal[0], dateVal[1] - 1, dateVal[2]);
    }
    return new Date(dateVal);
  }

  isToday(cell: CalendarDayEntry): boolean {
    if (!cell || !cell.date) return false;
    const cellDate = this.parseCellDate(cell.date);
    if (!cellDate) return false;
    const now = new Date();
    return cellDate.getFullYear() === now.getFullYear() &&
           cellDate.getMonth() === now.getMonth() &&
           cellDate.getDate() === now.getDate();
  }

  isAbsent(cell: CalendarDayEntry): boolean {
    if (!cell || !cell.date) return false;
    if (cell.isWeekend || cell.isHoliday || cell.isWfh || cell.isLeave || cell.isPresent) {
      return false;
    }

    const cellDate = this.parseCellDate(cell.date);
    if (!cellDate) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Only past dates and today's date can be ABSENT
    return cellDate.getTime() <= today.getTime();
  }
}
