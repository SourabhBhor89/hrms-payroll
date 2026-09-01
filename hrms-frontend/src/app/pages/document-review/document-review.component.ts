import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EmployeeDocumentService, EmployeeDocument } from '../../core/services/employee-document.service';
import { HrmsService } from '../../core/services/hrms.service';

export interface EmployeeGroup {
  employeeCode: string;
  employeeName: string;
  documents: EmployeeDocument[];
}

@Component({
  selector: 'app-document-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-review.component.html',
  styleUrl: './document-review.component.css'
})
export class DocumentReviewComponent implements OnInit, OnDestroy {
  private documentsApi = inject(EmployeeDocumentService);
  private hrms = inject(HrmsService);
  private sanitizer = inject(DomSanitizer);

  queue = signal<EmployeeDocument[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Selection state
  selectedEmployeeGroup = signal<EmployeeGroup | null>(null);
  selectedDocument = signal<EmployeeDocument | null>(null);
  selectedFileUrl = signal<SafeResourceUrl | null>(null);
  selectedFileType = signal<'pdf' | 'image' | null>(null);
  private currentObjectUrl: string | null = null;

  // Rejection modal/state
  showRejectModal = signal<boolean>(false);
  rejectionReason = '';

  // Search filter
  searchQuery = signal<string>('');

  // Group queue by employee code
  groupedQueue = computed<EmployeeGroup[]>(() => {
    const q = this.queue();
    const groupsMap = new Map<string, EmployeeDocument[]>();

    q.forEach(doc => {
      const list = groupsMap.get(doc.employeeCode) || [];
      list.push(doc);
      groupsMap.set(doc.employeeCode, list);
    });

    const groups: EmployeeGroup[] = [];
    groupsMap.forEach((docs, code) => {
      groups.push({
        employeeCode: code,
        employeeName: this.getEmployeeName(code),
        documents: docs
      });
    });

    return groups;
  });

  // Filter groups based on search query
  filteredGroups = computed<EmployeeGroup[]>(() => {
    const groups = this.groupedQueue();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return groups;

    return groups.filter(g =>
      g.employeeName.toLowerCase().includes(query) ||
      g.employeeCode.toLowerCase().includes(query) ||
      g.documents.some(d => d.documentType.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.loadQueue();
    // Ensure employees are loaded so we can resolve names
    if (this.hrms.employees().length === 0) {
      this.hrms.loadEmployees(0, 1000, 'id', 'asc');
    }
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }

  loadQueue(preserveSelection: boolean = false): void {
    const prevGroupCode = this.selectedEmployeeGroup()?.employeeCode;
    const prevDocId = this.selectedDocument()?.id;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.documentsApi.getReviewQueue().subscribe({
      next: (docs) => {
        this.queue.set(docs);
        this.isLoading.set(false);

        // Recalculate selection
        const groups = this.groupedQueue();

        if (preserveSelection && prevGroupCode) {
          const currentGroup = groups.find(g => g.employeeCode === prevGroupCode);
          if (currentGroup) {
            this.selectedEmployeeGroup.set(currentGroup);
            // Select the same doc if still pending, or fall back to the first available doc in group
            const nextDoc = currentGroup.documents.find(d => d.id === prevDocId) || currentGroup.documents[0];
            if (nextDoc) {
              this.selectDocument(nextDoc);
            } else {
              this.selectedDocument.set(null);
              this.cleanupObjectUrl();
            }
          } else {
            // Selected employee has no more pending documents
            this.selectedEmployeeGroup.set(null);
            this.selectedDocument.set(null);
            this.cleanupObjectUrl();
            
            // Auto select the first group in the new queue if available
            if (groups.length > 0) {
              this.selectEmployeeGroup(groups[0]);
            }
          }
        } else {
          // Default: select the first group in the queue
          if (groups.length > 0) {
            this.selectEmployeeGroup(groups[0]);
          } else {
            this.selectedEmployeeGroup.set(null);
            this.selectedDocument.set(null);
            this.cleanupObjectUrl();
          }
        }
      },
      error: () => {
        this.errorMessage.set('Failed to fetch the document review queue.');
        this.isLoading.set(false);
      }
    });
  }

  getEmployeeName(code: string): string {
    const emp = this.hrms.employees().find(e => e.employeeId === code);
    return emp ? emp.name : code;
  }

  selectEmployeeGroup(group: EmployeeGroup): void {
    this.selectedEmployeeGroup.set(group);
    if (group.documents.length > 0) {
      this.selectDocument(group.documents[0]);
    } else {
      this.selectedDocument.set(null);
      this.cleanupObjectUrl();
    }
  }

  selectDocument(doc: EmployeeDocument): void {
    this.selectedDocument.set(doc);
    this.cleanupObjectUrl();
    this.errorMessage.set('');
    this.successMessage.set('');

    const isPdf = doc.fileName.toLowerCase().endsWith('.pdf');
    this.selectedFileType.set(isPdf ? 'pdf' : 'image');

    this.documentsApi.getDocumentFileBlob(doc.employeeCode, doc.id).subscribe({
      next: (blob) => {
        const fileBlob = new Blob([blob], { type: blob.type || (isPdf ? 'application/pdf' : 'image/png') });
        const url = URL.createObjectURL(fileBlob);
        this.currentObjectUrl = url;
        this.selectedFileUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: () => {
        this.errorMessage.set(`Failed to retrieve file for ${doc.fileName}`);
        this.selectedFileUrl.set(null);
      }
    });
  }

  approveDocument(): void {
    const doc = this.selectedDocument();
    if (!doc) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.documentsApi.review(doc.employeeCode, doc.id, 'APPROVED').subscribe({
      next: () => {
        this.successMessage.set(`Approved ${doc.documentType.replace('_', ' ')} for employee ${doc.employeeCode}`);
        this.isSubmitting.set(false);
        this.loadQueue(true); // Preserve selected employee
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Approval request failed.');
        this.isSubmitting.set(false);
      }
    });
  }

  openRejectDialog(): void {
    this.rejectionReason = '';
    this.showRejectModal.set(true);
  }

  closeRejectDialog(): void {
    this.showRejectModal.set(false);
  }

  rejectDocument(): void {
    const doc = this.selectedDocument();
    if (!doc || !this.rejectionReason.trim()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showRejectModal.set(false);

    this.documentsApi.review(doc.employeeCode, doc.id, 'REJECTED', this.rejectionReason.trim()).subscribe({
      next: () => {
        this.successMessage.set(`Rejected ${doc.documentType.replace('_', ' ')} for employee ${doc.employeeCode}`);
        this.isSubmitting.set(false);
        this.loadQueue(true); // Preserve selected employee
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Rejection request failed.');
        this.isSubmitting.set(false);
      }
    });
  }

  private cleanupObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
      this.selectedFileUrl.set(null);
    }
  }
}
