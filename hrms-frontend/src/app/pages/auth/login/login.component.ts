import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeDocumentService } from '../../../core/services/employee-document.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  auth = inject(AuthService);
  documents = inject(EmployeeDocumentService);
  router = inject(Router);

  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.navigateAfterLogin();
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    if (!this.password.trim()) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.isLoading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Invalid email or password. Please try again.';
        } else {
          this.errorMessage = err.error?.message || 'Authentication failed. Please check server connection.';
        }
      }
    });
  }

  private navigateAfterLogin() {
    this.documents.getMyStatus().subscribe({
      next: (status) => this.router.navigate([status === 'APPROVED' ? '/dashboard' : '/my-documents']),
      error: () => this.router.navigate(['/dashboard'])
    });
  }
}
