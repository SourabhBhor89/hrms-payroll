import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type DocumentVerificationStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type EmployeeDocumentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface EmployeeDocument {
  id: number;
  employeeCode: string;
  documentType: string;
  documentNumber?: string;
  fileName: string;
  uploadedAt: string;
  reviewStatus: EmployeeDocumentStatus;
  reviewNote?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeDocumentService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/employee-documents';

  pendingReviewsCount = signal<number>(0);

  getMyStatus(): Observable<DocumentVerificationStatus> {
    return this.http.get<DocumentVerificationStatus>(`${this.baseUrl}/me/status`);
  }

  getMyDocuments(): Observable<EmployeeDocument[]> {
    return this.http.get<EmployeeDocument[]>(`${this.baseUrl}/me`);
  }

  getEmployeeDocuments(employeeCode: string): Observable<EmployeeDocument[]> {
    return this.http.get<EmployeeDocument[]>(`${this.baseUrl}/employees/${employeeCode}`);
  }

  upload(documentType: string, file: File, documentNumber?: string): Observable<EmployeeDocument> {
    const form = this.createForm(documentType, file, documentNumber);
    return this.http.post<EmployeeDocument>(`${this.baseUrl}/me`, form);
  }

  resubmit(documentId: number, file: File, documentNumber?: string): Observable<EmployeeDocument> {
    const form = new FormData();
    form.append('file', file);
    if (documentNumber) form.append('documentNumber', documentNumber);
    return this.http.post<EmployeeDocument>(`${this.baseUrl}/me/${documentId}/resubmit`, form);
  }

  getReviewQueue(): Observable<EmployeeDocument[]> {
    return this.http.get<EmployeeDocument[]>(`${this.baseUrl}/review-queue`).pipe(
      tap(docs => this.pendingReviewsCount.set(docs.length))
    );
  }

  review(employeeCode: string, documentId: number, status: EmployeeDocumentStatus, reason?: string): Observable<EmployeeDocument> {
    return this.http.patch<EmployeeDocument>(`${this.baseUrl}/employees/${employeeCode}/${documentId}/review`, { status, reason }).pipe(
      tap(() => {
        // Decrement or reload queue count
        this.getReviewQueue().subscribe();
      })
    );
  }

  getDocumentFileBlob(employeeCode: string, documentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/employees/${employeeCode}/${documentId}/file`, { responseType: 'blob' });
  }

  getMyDocumentFileBlob(documentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/me/${documentId}/file`, { responseType: 'blob' });
  }

  private createForm(documentType: string, file: File, documentNumber?: string): FormData {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file);
    if (documentNumber) form.append('documentNumber', documentNumber);
    return form;
  }
}
