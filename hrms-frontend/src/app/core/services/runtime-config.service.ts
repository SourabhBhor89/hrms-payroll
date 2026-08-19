import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, tap } from 'rxjs';

export interface RuntimeConfig {
  backendUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class RuntimeConfigService {
  private http = inject(HttpClient);

  // Default fallback for local environment
  private backendUrlSignal = signal<string>('http://localhost:8080');

  get backendUrl(): string {
    return this.backendUrlSignal();
  }

  get apiBaseUrl(): string {
    return `${this.backendUrlSignal()}/api/v1`;
  }

  /**
   * Loads runtime configuration from Vercel Serverless Function (/api/config)
   */
  loadConfig(): Promise<void> {
    return firstValueFrom(
      this.http.get<RuntimeConfig>('/api/config').pipe(
        tap((config) => {
          if (config && config.backendUrl) {
            const cleanUrl = config.backendUrl.trim().replace(/\/$/, '');
            this.backendUrlSignal.set(cleanUrl);
            console.log('[RuntimeConfig] Dynamic Backend URL loaded from Vercel:', cleanUrl);
          }
        }),
        catchError((err) => {
          console.warn('[RuntimeConfig] Could not fetch Vercel config, using local fallback:', this.backendUrlSignal());
          return of({ backendUrl: this.backendUrlSignal() });
        })
      )
    ).then(() => void 0);
  }

  getBackendUrl(): string {
    return this.backendUrlSignal();
  }
}
