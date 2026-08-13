import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrmsService } from '../../core/services/hrms.service';
import { Holiday } from '../../core/models/hrms.model';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './holidays.component.html',
  styleUrl: './holidays.component.css'
})
export class HolidaysComponent implements OnInit {
  hrms = inject(HrmsService);

  ngOnInit() {
    this.hrms.loadHolidays();
  }

  get nextHoliday(): Holiday | null {
    return this.hrms.holidays()[0] || null;
  }

  get countdown() {
    const next = this.nextHoliday;
    if (!next || !next.date) return { days: 0, hours: 0, mins: 0 };
    const diffMs = new Date(next.date + 'T00:00:00').getTime() - new Date().getTime();
    if (isNaN(diffMs) || diffMs <= 0) return { days: 0, hours: 0, mins: 0 };
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, mins };
  }

  getMonthName(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return 'AUG';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
    return months[monthIndex] || 'AUG';
  }
}
