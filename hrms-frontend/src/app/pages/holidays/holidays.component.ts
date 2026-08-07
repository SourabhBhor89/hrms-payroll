import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrmsService } from '../../core/services/hrms.service';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './holidays.component.html',
  styleUrl: './holidays.component.css'
})
export class HolidaysComponent {
  hrms = inject(HrmsService);

  getMonthName(dateStr: string): string {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
    return months[monthIndex] || 'AUG';
  }
}
