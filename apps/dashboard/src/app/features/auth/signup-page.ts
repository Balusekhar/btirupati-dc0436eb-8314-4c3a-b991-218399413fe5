import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Role } from '@org/data';
import { AuthService, type SignupRequest } from '../../core/auth/auth.service';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly roles = [Role.Owner, Role.Admin, Role.Viewer] as const;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    organizationId: [''],
    role: [Role.Owner],
  });

  async submit(): Promise<void> {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const raw = this.form.getRawValue();
      const dto: SignupRequest = {
        email: raw.email,
        password: raw.password,
        role: raw.role,
        ...(raw.organizationId ? { organizationId: raw.organizationId } : {}),
      };

      await this.auth.signup(dto);
      await this.router.navigateByUrl('/tasks');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Signup failed';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
