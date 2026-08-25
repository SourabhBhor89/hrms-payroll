import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '../services/loader.service';
import { finalize } from 'rxjs/operators';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const isEmployeeListRequest = req.method === 'GET' && req.url.replace(/\/$/, '').endsWith('/api/v1/employees');

  if (isEmployeeListRequest) {
    return next(req);
  }

  // Show the loader when request starts
  loaderService.show();

  return next(req).pipe(
    finalize(() => {
      // Hide the loader when request completes, errors, or is cancelled
      loaderService.hide();
    })
  );
};
