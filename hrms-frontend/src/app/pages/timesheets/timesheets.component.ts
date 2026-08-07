import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService } from '../../core/services/hrms.service';
import { AuthService } from '../../core/services/auth.service';
import { Timesheet, TimesheetEntry } from '../../core/models/hrms.model';

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheets.component.html',
  styleUrl: './timesheets.component.css'
})
export class TimesheetsComponent {
  hrms = inject(HrmsService);
  auth = inject(AuthService);

  activeTimesheet = signal<Timesheet>(this.hrms.timesheets()[0]);

  canApprove(): boolean {
    return this.auth.hasPermission('TIMESHEET_CATEGORIES_VIEW');
  }

  calculateRowTotal(entry: TimesheetEntry): number {
    const h = entry.hours;
    return (h.mon || 0) + (h.tue || 0) + (h.wed || 0) + (h.thu || 0) + (h.fri || 0) + (h.sat || 0) + (h.sun || 0);
  }

  calculateDayTotal(day: keyof TimesheetEntry['hours']): number {
    const entries = this.activeTimesheet()?.entries || [];
    return entries.reduce((sum, e) => sum + (e.hours[day] || 0), 0);
  }

  calculateGrandTotal(): number {
    const entries = this.activeTimesheet()?.entries || [];
    return entries.reduce((sum, e) => sum + this.calculateRowTotal(e), 0);
  }

  addProjectRow() {
    const current = this.activeTimesheet();
    if (current) {
      const newEntry: TimesheetEntry = {
        id: `ent-${Date.now()}`,
        project: 'Internal Operations & Training',
        task: 'Documentation & Sprint Planning',
        hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
      };
      const updated = { ...current, entries: [...current.entries, newEntry] };
      this.activeTimesheet.set(updated);
    }
  }

  submitActiveTimesheet() {
    const current = this.activeTimesheet();
    if (current) {
      this.hrms.submitTimesheet(current.id);
      this.activeTimesheet.set({ ...current, status: 'Submitted' });
    }
  }

  approveTs(id: string) {
    this.hrms.updateTimesheetStatus(id, 'Approved', this.auth.currentUser()?.name || 'Manager');
  }

  rejectTs(id: string) {
    this.hrms.updateTimesheetStatus(id, 'Rejected', this.auth.currentUser()?.name || 'Manager');
  }
}
