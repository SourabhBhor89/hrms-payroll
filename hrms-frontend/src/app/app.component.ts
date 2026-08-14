import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertModalComponent } from './core/components/alert-modal/alert-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-alert-modal></app-alert-modal>
  `,
  styles: []
})
export class AppComponent {
  title = 'NexusHR Dashboard';
}
