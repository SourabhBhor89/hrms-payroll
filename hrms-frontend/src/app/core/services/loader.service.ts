import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = signal<number>(0);
  private timeoutId: any = null;

  // Read-only signal to expose the loading state
  public isLoading = computed(() => this.activeRequests() > 0);

  show(): void {
    this.activeRequests.update(count => count + 1);
    this.startSafetyTimeout();
  }

  hide(): void {
    this.activeRequests.update(count => Math.max(0, count - 1));
    if (this.activeRequests() === 0) {
      this.clearSafetyTimeout();
    }
  }

  reset(): void {
    this.activeRequests.set(0);
    this.clearSafetyTimeout();
  }

  private startSafetyTimeout(): void {
    this.clearSafetyTimeout();
    // Auto-hide the loader after 1.5 seconds to limit its duration
    this.timeoutId = setTimeout(() => {
      this.reset();
    }, 1000);
  }

  private clearSafetyTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
