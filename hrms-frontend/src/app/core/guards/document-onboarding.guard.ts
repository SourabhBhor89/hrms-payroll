import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { EmployeeDocumentService } from '../services/employee-document.service';
import { AuthService } from '../services/auth.service';

export const documentOnboardingGuard: CanActivateFn = () => {
  const documentsApi = inject(EmployeeDocumentService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const role = auth.currentRole();
  if (role === 'Admin' || role === 'HR Manager') {
    return true;
  }

  return documentsApi.getMyStatus().pipe(
    map(status => status === 'APPROVED' ? true : router.createUrlTree(['/my-documents'])),
    catchError(() => of(true))
  );
};
