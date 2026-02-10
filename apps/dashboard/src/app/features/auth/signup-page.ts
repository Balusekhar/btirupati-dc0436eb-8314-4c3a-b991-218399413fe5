import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Role } from '@org/data';
import {
  AuthService,
  type SignupOrganization,
  type SignupRequest,
} from '../../core/auth/auth.service';
import { Spinner } from '../../shared/spinner';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterModule, Spinner],
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

  readonly organizations = signal<SignupOrganization[]>([]);
  readonly isLoadingOrgs = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: [Role.Owner as Role, [Validators.required]],
    organizationId: ['', [Validators.required]],
  });

  constructor() {
    // Load orgs for the default role on init
    void this.loadOrganizations(this.form.controls.role.value);
  }

  /** Called when the role dropdown changes. */
  async onRoleChange(role: Role): Promise<void> {
    this.form.controls.role.setValue(role);
    this.form.controls.organizationId.setValue('');
    await this.loadOrganizations(role);
  }

  private async loadOrganizations(role: string): Promise<void> {
    this.isLoadingOrgs.set(true);
    try {
      const orgs = await this.auth.getOrganisationsForSignup(role);
      this.organizations.set(orgs);
      // Auto-select first org if available
      if (orgs.length > 0) {
        this.form.controls.organizationId.setValue(orgs[0].id);
      }
    } catch {
      this.organizations.set([]);
    } finally {
      this.isLoadingOrgs.set(false);
    }
  }

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

    if (c.organizationId.hasError('required')) {
      errors.push('Please select an organization.');
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
      const raw = this.form.getRawValue();
      const dto: SignupRequest = {
        email: raw.email,
        password: raw.password,
        role: raw.role,
        organizationId: raw.organizationId,
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
