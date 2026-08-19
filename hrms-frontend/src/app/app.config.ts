import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';
import { RuntimeConfigService } from './core/services/runtime-config.service';

export function initializeApp(runtimeConfig: RuntimeConfigService) {
  return () => runtimeConfig.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loaderInterceptor, authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [RuntimeConfigService],
      multi: true
    }
  ]
};
