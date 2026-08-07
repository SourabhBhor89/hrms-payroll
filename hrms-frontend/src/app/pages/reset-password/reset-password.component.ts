import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  router = inject(Router);

  newPassword = '';
  confirmPassword = '';
  strengthScore = 0;
  strengthLabel = 'Weak';
  strengthClass = 'weak';

  checkStrength() {
    let score = 0;
    if (this.newPassword.length >= 8) score++;
    if (/[A-Z]/.test(this.newPassword) && /[0-9]/.test(this.newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(this.newPassword)) score++;

    this.strengthScore = score;
    if (score === 1) {
      this.strengthLabel = 'Weak';
      this.strengthClass = 'weak';
    } else if (score === 2) {
      this.strengthLabel = 'Medium';
      this.strengthClass = 'medium';
    } else if (score === 3) {
      this.strengthLabel = 'Strong';
      this.strengthClass = 'strong';
    }
  }

  isFormValid(): boolean {
    return this.newPassword.length >= 6 && this.newPassword === this.confirmPassword;
  }

  onSubmit() {
    if (this.isFormValid()) {
      this.router.navigate(['/auth/login']);
    }
  }
}
