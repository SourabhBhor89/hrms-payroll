import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // App is always in light mode – dark mode is disabled
  isDarkMode = signal<boolean>(false);

  constructor() {
    // Always force light mode regardless of saved preference
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme_preference', 'light');
  }

  // Keep method signature for compatibility but it does nothing
  toggleTheme() {
    // Light mode only – no toggle
  }

  isMobileSidebarOpen = signal<boolean>(false);

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.set(!this.isMobileSidebarOpen());
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }
}
