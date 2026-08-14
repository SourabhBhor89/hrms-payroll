import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './layout/loader/loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent],
  template: `
    <app-loader></app-loader>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {
  title = 'NexusHR Dashboard';
}
