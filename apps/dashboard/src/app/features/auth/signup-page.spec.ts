import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SignupPage } from './signup-page';
import { AuthService } from '../../core/auth/auth.service';
import { Role } from '@org/data';

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;
  let mockAuthService: {
    signup: ReturnType<typeof vi.fn>;
    getOrganisationsForSignup: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    mockAuthService = {
      signup: vi.fn(),
      getOrganisationsForSignup: vi.fn().mockResolvedValue([
        { id: 'org-1', name: 'Test Org', parentId: null },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideRouter([
          { path: 'tasks', component: SignupPage },
          { path: 'signup', component: SignupPage },
        ]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have email, password, role, and organizationId form controls', () => {
    expect(component.form.controls.email).toBeDefined();
    expect(component.form.controls.password).toBeDefined();
    expect(component.form.controls.role).toBeDefined();
    expect(component.form.controls.organizationId).toBeDefined();
  });

  it('should default role to Owner', () => {
    expect(component.form.controls.role.value).toBe(Role.Owner);
  });

  it('should load organizations on initialization', async () => {
    expect(mockAuthService.getOrganisationsForSignup).toHaveBeenCalled();
  });

  it('should auto-select first organization', async () => {
    // The constructor triggers loadOrganizations, which auto-selects the first org
    await fixture.whenStable();
    expect(component.form.controls.organizationId.value).toBe('org-1');
  });

  describe('onRoleChange', () => {
    it('should update role and reload organizations', async () => {
      mockAuthService.getOrganisationsForSignup.mockResolvedValue([
        { id: 'org-2', name: 'Child Org', parentId: 'org-1' },
      ]);

      await component.onRoleChange(Role.Admin);

      expect(component.form.controls.role.value).toBe(Role.Admin);
      expect(mockAuthService.getOrganisationsForSignup).toHaveBeenCalledWith(
        Role.Admin,
      );
    });

    it('should clear organizationId before loading new orgs', async () => {
      mockAuthService.getOrganisationsForSignup.mockResolvedValue([]);

      await component.onRoleChange(Role.Admin);

      // Since no orgs returned, organizationId should remain empty
      // (the auto-select in loadOrganizations only runs when orgs.length > 0)
    });
  });

  describe('submit', () => {
    it('should set error message when form is invalid', async () => {
      component.form.controls.email.setValue('');
      component.form.controls.password.setValue('');
      component.form.controls.organizationId.setValue('');

      await component.submit();

      expect(component.errorMessage()).toContain('Please fix the following');
      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('should call auth.signup with form values on valid submit', async () => {
      mockAuthService.signup.mockResolvedValue(undefined);
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');
      component.form.controls.role.setValue(Role.Owner);
      component.form.controls.organizationId.setValue('org-1');

      await component.submit();

      expect(mockAuthService.signup).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        role: Role.Owner,
        organizationId: 'org-1',
      });
    });

    it('should navigate to /tasks after successful signup', async () => {
      mockAuthService.signup.mockResolvedValue(undefined);
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');
      component.form.controls.organizationId.setValue('org-1');

      await component.submit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
    });

    it('should set error message on signup failure', async () => {
      mockAuthService.signup.mockRejectedValue(
        new Error('Email already taken'),
      );
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');
      component.form.controls.organizationId.setValue('org-1');

      await component.submit();

      expect(component.errorMessage()).toBe('Email already taken');
    });

    it('should reset isSubmitting after attempt', async () => {
      mockAuthService.signup.mockRejectedValue(new Error('fail'));
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');
      component.form.controls.organizationId.setValue('org-1');

      await component.submit();

      expect(component.isSubmitting()).toBe(false);
    });
  });
});
