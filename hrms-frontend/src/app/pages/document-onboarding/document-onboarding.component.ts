import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { EmployeeDocument, EmployeeDocumentService, DocumentVerificationStatus } from '../../core/services/employee-document.service';
import { AuthService } from '../../core/services/auth.service';

export interface RequiredDocument {
  type: string;
  label: string;
  category: string;
  description: string;
  numberLabel: string;
  hasNumber: boolean;
  isOptional?: boolean;
  file?: File;
  previewUrl?: string;
}

@Component({
  selector: 'app-document-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-onboarding.component.html',
  styleUrl: './document-onboarding.component.css'
})
export class DocumentOnboardingComponent implements OnInit {
  private documentsApi = inject(EmployeeDocumentService);
  private sanitizer = inject(DomSanitizer);
  public auth = inject(AuthService);

  status: DocumentVerificationStatus = 'NOT_SUBMITTED';
  documents: EmployeeDocument[] = [];
  isLoading = true;
  isSubmitting = false;
  isSingleUploading: Record<string, boolean> = {};
  isAdminWithoutProfile = false;
  errorMessage = '';
  successMessage = '';

  // Preview sub-modal state
  previewDocUrl = signal<SafeResourceUrl | null>(null);
  previewDocType = signal<string | null>(null);
  previewDocName = signal<string | null>(null);
  previewDocIsPdf = signal<boolean>(false);
  private currentObjectUrl: string | null = null;

  requiredDocuments: RequiredDocument[] = [
    {
      type: 'AADHAAR',
      label: 'Aadhaar Card',
      category: 'Identity Proof',
      description: 'Clear copy of front & back of Aadhaar card',
      numberLabel: 'Aadhaar Number (12 digits)',
      hasNumber: true
    },
    {
      type: 'PAN',
      label: 'PAN Card',
      category: 'Identity & Tax',
      description: 'Signed PAN card copy for tax & payroll',
      numberLabel: 'PAN Number (10 characters)',
      hasNumber: true
    },
    {
      type: 'TEN_MARKSHEET',
      label: '10th Marksheet / Certificate',
      category: 'Secondary Education',
      description: '10th standard mark sheet as proof of date of birth',
      numberLabel: '',
      hasNumber: false
    },
    {
      type: 'TWELVE_MARKSHEET',
      label: '12th Marksheet / Diploma',
      category: 'Higher Secondary Education',
      description: '12th standard mark sheet or polytechnic diploma',
      numberLabel: '',
      hasNumber: false
    },
    {
      type: 'UG_MARKSHEET',
      label: 'Undergraduate (UG) Marksheet',
      category: 'Graduation',
      description: 'Consolidated final marksheet or all semester marksheets',
      numberLabel: '',
      hasNumber: false
    },
    {
      type: 'UG_DEGREE',
      label: 'Undergraduate (UG) Degree',
      category: 'Graduation',
      description: 'Final degree certificate or provisional passing degree',
      numberLabel: '',
      hasNumber: false
    },
    {
      type: 'PG_DEGREE',
      label: 'Postgraduate (PG) Degree',
      category: 'Post Graduation',
      description: 'Master\'s degree or diploma (if applicable)',
      numberLabel: '',
      hasNumber: false,
      isOptional: true
    }
  ];

  documentNumbers: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.isAdminWithoutProfile = false;

    forkJoin({
      status: this.documentsApi.getMyStatus(),
      documents: this.documentsApi.getMyDocuments()
    }).subscribe({
      next: ({ status, documents }) => {
        this.status = status;
        this.documents = documents;
        // Pre-fill any existing document numbers
        documents.forEach(d => {
          if (d.documentNumber && !this.documentNumbers[d.documentType]) {
            this.documentNumbers[d.documentType] = d.documentNumber;
          }
        });
        this.isLoading = false;
      },
      error: (err) => {
        const role = this.auth.currentRole();
        if (role === 'Admin' || role === 'HR Manager') {
          this.isAdminWithoutProfile = true;
          this.status = 'APPROVED';
        } else {
          this.errorMessage = err?.error?.message || 'Unable to load your document status. Please try again.';
        }
        this.isLoading = false;
      }
    });
  }

  get totalRequiredCount(): number {
    return this.requiredDocuments.filter(d => !d.isOptional).length;
  }

  get approvedCount(): number {
    return this.documents.filter(d => d.reviewStatus === 'APPROVED').length;
  }

  get pendingCount(): number {
    return this.documents.filter(d => d.reviewStatus === 'PENDING_REVIEW').length;
  }

  get rejectedCount(): number {
    return this.documents.filter(d => d.reviewStatus === 'REJECTED').length;
  }

  get uploadedCount(): number {
    return this.documents.length;
  }

  get hasPendingFiles(): boolean {
    return this.requiredDocuments.some(d => !!d.file);
  }

  get pendingFilesCount(): number {
    return this.requiredDocuments.filter(d => !!d.file).length;
  }

  existingDocument(type: string): EmployeeDocument | undefined {
    return this.documents.find(d => d.documentType === type);
  }

  onFileSelected(document: RequiredDocument, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // 1 MB limit (1,048,576 bytes)
      if (file.size > 1048576) {
        this.errorMessage = `"${document.label}" file exceeds the 1 MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB). Please compress or choose another file.`;
        input.value = '';
        document.file = undefined;
        return;
      }
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg') && !lowerName.endsWith('.png')) {
        this.errorMessage = `Unsupported format for "${document.label}". Only PDF, JPG, and PNG are allowed.`;
        input.value = '';
        document.file = undefined;
        return;
      }
      this.errorMessage = '';
      document.file = file;
    }
  }

  removeSelectedFile(document: RequiredDocument): void {
    document.file = undefined;
  }

  previewDocument(doc: EmployeeDocument): void {
    this.errorMessage = '';
    this.cleanupObjectUrl();

    const isPdf = doc.fileName.toLowerCase().endsWith('.pdf');
    this.previewDocIsPdf.set(isPdf);
    this.previewDocType.set(doc.documentType);
    this.previewDocName.set(doc.fileName);

    this.documentsApi.getMyDocumentFileBlob(doc.id).subscribe({
      next: (blob) => {
        const fileBlob = new Blob([blob], { type: blob.type || (isPdf ? 'application/pdf' : 'image/png') });
        const url = URL.createObjectURL(fileBlob);
        this.currentObjectUrl = url;
        this.previewDocUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: () => {
        this.errorMessage = `Failed to preview file "${doc.fileName}".`;
        this.previewDocUrl.set(null);
      }
    });
  }

  closePreviewModal(): void {
    this.cleanupObjectUrl();
  }

  private cleanupObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.previewDocUrl.set(null);
    this.previewDocType.set(null);
    this.previewDocName.set(null);
  }

  downloadFile(documentId: number, fileName: string): void {
    this.errorMessage = '';
    this.documentsApi.getMyDocumentFileBlob(documentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = `Failed to download "${fileName}". Please try again.`;
      }
    });
  }

  uploadSingle(document: RequiredDocument): void {
    if (!document.file) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isSingleUploading[document.type] = true;

    const existing = this.existingDocument(document.type);
    const docNumber = this.documentNumbers[document.type]?.trim();

    const upload$ = (existing && existing.reviewStatus === 'REJECTED')
      ? this.documentsApi.resubmit(existing.id, document.file, docNumber)
      : this.documentsApi.upload(document.type, document.file, docNumber);

    upload$.subscribe({
      next: () => {
        this.successMessage = `Successfully uploaded ${document.label}.`;
        document.file = undefined;
        this.isSingleUploading[document.type] = false;
        this.load();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || `Failed to upload ${document.label}.`;
        this.isSingleUploading[document.type] = false;
      }
    });
  }

  submitAll(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const pending = this.requiredDocuments.filter(d => !!d.file);
    if (pending.length === 0) {
      this.errorMessage = 'Please select at least one document file to upload.';
      return;
    }

    const uploads = pending.map(document => {
      const existing = this.existingDocument(document.type);
      const docNumber = this.documentNumbers[document.type]?.trim();
      return (existing && existing.reviewStatus === 'REJECTED')
        ? this.documentsApi.resubmit(existing.id, document.file!, docNumber)
        : this.documentsApi.upload(document.type, document.file!, docNumber);
    });

    this.isSubmitting = true;
    forkJoin(uploads).subscribe({
      next: () => {
        this.successMessage = `Successfully submitted ${pending.length} document(s) for HR review.`;
        this.requiredDocuments.forEach(d => d.file = undefined);
        this.isSubmitting = false;
        this.load();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to submit documents. Please check file formats and sizes.';
        this.isSubmitting = false;
      }
    });
  }
}
