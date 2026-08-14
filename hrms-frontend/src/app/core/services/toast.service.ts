import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  get toast() {
    return this.toastMessage.asReadonly();
  }

  showSuccess(message: string) {
    console.log('ToastService.showSuccess:', message);
    this.toastMessage.set({ text: message, type: 'success' });
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  showError(message: string) {
    console.log('ToastService.showError:', message);
    this.toastMessage.set({ text: message, type: 'error' });
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  clear() {
    this.toastMessage.set(null);
  }
}
