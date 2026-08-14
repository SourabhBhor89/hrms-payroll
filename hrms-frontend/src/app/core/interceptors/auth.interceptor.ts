import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem('access_token');
  let authReq = req;

  // Add Bearer token to /api/ endpoints
  if (token && req.url.includes('/api/')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Exclude auth login and refresh calls from triggering refresh loop
        if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
          if (req.url.includes('/auth/refresh')) {
            authService.clearLocalSession();
            router.navigate(['/auth/login']);
          }
          return throwError(() => error);
        }

        return handle401Error(authReq, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res) => {
        isRefreshing = false;
        const newToken = res.accessToken;
        refreshTokenSubject.next(newToken);

        const newAuthReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });

        return next(newAuthReq);
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.error(err);
        refreshTokenSubject = new BehaviorSubject<string | null>(null);
        authService.clearLocalSession();
        router.navigate(['/auth/login']);
        return throwError(() => err);
      })
    );
  } else {
    // Queue failed concurrent requests until token refresh completes
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        const newAuthReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(newAuthReq);
      })
    );
  }
}
