import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-backdrop" *ngIf="notify.modalState().open" (click)="notify.closeModal()">
      <div class="alert-dialog" (click)="$event.stopPropagation()">
        <div class="alert-icon-wrapper" [ngClass]="notify.modalState().type">
          <svg *ngIf="notify.modalState().type === 'error'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <svg *ngIf="notify.modalState().type === 'warning'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg *ngIf="notify.modalState().type === 'success'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg *ngIf="notify.modalState().type === 'info'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <h3 class="alert-title">{{ notify.modalState().title }}</h3>
        <p class="alert-message">{{ notify.modalState().message }}</p>

        <button class="alert-btn" (click)="notify.closeModal()">Got it</button>
      </div>
    </div>
  `,
  styles: [`
    .alert-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: fadeIn 0.18s ease-out;
    }

    .alert-dialog {
      background: #ffffff;
      border-radius: 20px;
      width: 90%;
      max-width: 420px;
      padding: 28px 24px 24px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.9);
      text-align: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .alert-icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .alert-icon-wrapper.error {
      background: #fef2f2;
      color: #ef4444;
      border: 1px solid #fecaca;
    }

    .alert-icon-wrapper.warning {
      background: #fffbe5;
      color: #f59e0b;
      border: 1px solid #fde68a;
    }

    .alert-icon-wrapper.success {
      background: #f0fdf4;
      color: #10b981;
      border: 1px solid #bbf7d0;
    }

    .alert-icon-wrapper.info {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }

    .alert-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px;
      letter-spacing: -0.01em;
    }

    .alert-message {
      font-size: 0.95rem;
      line-height: 1.55;
      color: #475569;
      margin: 0 0 24px;
      word-break: break-word;
    }

    .alert-btn {
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.15s ease;
    }

    .alert-btn:hover {
      background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
    }

    .alert-btn:active {
      transform: translateY(0);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class AlertModalComponent {
  notify = inject(NotificationService);
}
