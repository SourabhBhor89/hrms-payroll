import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '../services/loader.service';
import { finalize } from 'rxjs/operators';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);

  // Show the loader when request starts
  loaderService.show();

  return next(req).pipe(
    finalize(() => {
      // Hide the loader when request completes, errors, or is cancelled
      loaderService.hide();
    })
  );
};
