import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import type { LoginDto } from '@org/data';
import { AuthService } from '../../core/auth/auth.service';
import { Spinner } from '../../shared/spinner';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterModule, Spinner],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /** Collect all current validation errors into a single user-readable string. */
  private getValidationErrors(): string {
    const errors: string[] = [];
    const c = this.form.controls;

    if (c.email.hasError('required')) {
      errors.push('Email is required.');
    } else if (c.email.hasError('email')) {
      errors.push('Enter a valid email address.');
    }

    if (c.password.hasError('required')) {
      errors.push('Password is required.');
    } else if (c.password.hasError('minlength')) {
      errors.push('Password must be at least 8 characters.');
    }

    return errors.length > 0
      ? `Please fix the following: ${errors.join(' ')}`
      : 'Please correct the highlighted fields.';
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.getValidationErrors());
      return;
    }

    this.isSubmitting.set(true);
    try {
      const dto: LoginDto = this.form.getRawValue();
      await this.auth.login(dto);

      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/tasks';
      await this.router.navigateByUrl(returnUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
