import { Injectable, signal } from '@angular/core';

export interface AlertModalConfig {
  open: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  modalState = signal<AlertModalConfig>({
    open: false,
    title: '',
    message: '',
    type: 'error'
  });

  showAlert(message: string, title?: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') {
    const defaultTitle = type === 'error' ? 'Action Restricted' :
                         type === 'warning' ? 'Warning' :
                         type === 'success' ? 'Success' : 'Information';
    this.modalState.set({
      open: true,
      title: title || defaultTitle,
      message,
      type
    });
  }

  closeModal() {
    this.modalState.set({
      open: false,
      title: '',
      message: '',
      type: 'error'
    });
  }
}
