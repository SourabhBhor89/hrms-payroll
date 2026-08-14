import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertModalComponent } from './core/components/alert-modal/alert-modal.component';
import { LoaderComponent } from './layout/loader/loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertModalComponent, LoaderComponent],
  template: `
    <app-loader></app-loader>
    <router-outlet></router-outlet>
    <app-alert-modal></app-alert-modal>
  `,
  styles: []
})
export class AppComponent {
  title = 'NexusHR Dashboard';
}
