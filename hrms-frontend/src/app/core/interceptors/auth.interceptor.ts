import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { RuntimeConfigService } from '../services/runtime-config.service';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const runtimeConfig = inject(RuntimeConfigService);
  const router = inject(Router);

  // Bypass interceptor for runtime configuration endpoint itself
  if (req.url.includes('/api/config')) {
    return next(req);
  }

  let targetUrl = req.url;
  if (!isDevMode() && targetUrl.startsWith('/api')) {
    const backendUrl = runtimeConfig.getBackendUrl();
    if (backendUrl) {
      targetUrl = `${backendUrl}${targetUrl}`;
    }
  }

  const token = localStorage.getItem('access_token');
  let authReq = req;

  // Add Bearer token to /api/ endpoints and ensure targetUrl is applied
  if (token && (req.url.includes('/api/') || targetUrl.includes('/api/'))) {
    authReq = req.clone({
      url: targetUrl,
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  } else if (targetUrl !== req.url) {
    authReq = req.clone({
      url: targetUrl
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Exclude auth login, logout and refresh calls from triggering refresh loop
        if (targetUrl.includes('/auth/login') || targetUrl.includes('/auth/refresh') || targetUrl.includes('/auth/logout')) {
          if (targetUrl.includes('/auth/refresh') || targetUrl.includes('/auth/logout')) {
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
