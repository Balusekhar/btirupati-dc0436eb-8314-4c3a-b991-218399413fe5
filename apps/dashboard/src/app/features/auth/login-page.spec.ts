import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { LoginPage } from './login-page';
import { AuthService } from '../../core/auth/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([
          { path: 'tasks', component: LoginPage },
          { path: 'login', component: LoginPage },
        ]),
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: vi.fn().mockReturnValue(null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an email and password form control', () => {
    expect(component.form.controls.email).toBeDefined();
    expect(component.form.controls.password).toBeDefined();
  });

  it('should start with form invalid (empty values)', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should be valid with proper email and password', () => {
    component.form.controls.email.setValue('test@example.com');
    component.form.controls.password.setValue('password123');

    expect(component.form.valid).toBe(true);
  });

  it('should show validation error for invalid email', () => {
    component.form.controls.email.setValue('not-an-email');
    component.form.controls.password.setValue('password123');

    expect(component.form.controls.email.hasError('email')).toBe(true);
  });

  it('should show validation error for short password', () => {
    component.form.controls.email.setValue('test@example.com');
    component.form.controls.password.setValue('short');

    expect(component.form.controls.password.hasError('minlength')).toBe(true);
  });

  describe('submit', () => {
    it('should set error message when form is invalid', async () => {
      await component.submit();

      expect(component.errorMessage()).toContain('Please fix the following');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should call auth.login with form values on valid submit', async () => {
      mockAuthService.login.mockResolvedValue(undefined);
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');

      await component.submit();

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should navigate to /tasks after successful login', async () => {
      mockAuthService.login.mockResolvedValue(undefined);
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');

      await component.submit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
    });

    it('should set error message on login failure', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');

      await component.submit();

      expect(component.errorMessage()).toBe('Invalid credentials');
    });

    it('should reset isSubmitting after login attempt', async () => {
      mockAuthService.login.mockRejectedValue(new Error('fail'));
      component.form.controls.email.setValue('test@example.com');
      component.form.controls.password.setValue('password123');

      await component.submit();

      expect(component.isSubmitting()).toBe(false);
    });
  });
});
