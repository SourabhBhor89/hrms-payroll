import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
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
export class AppComponent implements OnInit {
  title = 'TRH - Live To Build';
  private titleService = inject(Title);

  ngOnInit() {
    this.titleService.setTitle('TRH - Live To Build');
  }
}
