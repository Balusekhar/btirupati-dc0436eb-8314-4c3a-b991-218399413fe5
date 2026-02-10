import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppHeader } from './app-header';
import { AuthService } from '../core/auth/auth.service';
import { TokenStorageService } from '../core/auth/token-storage.service';
import { signal } from '@angular/core';

describe('AppHeader', () => {
  let component: AppHeader;
  let fixture: ComponentFixture<AppHeader>;
  let mockAuthService: { logout: ReturnType<typeof vi.fn> };
  let mockTokenStorage: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockAuthService = {
      logout: vi.fn(),
    };

    mockTokenStorage = {
      isAuthenticated: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [AppHeader],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: TokenStorageService, useValue: mockTokenStorage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reflect authenticated state from TokenStorageService', () => {
    expect(component.isAuthenticated()).toBe(false);

    mockTokenStorage.isAuthenticated.set(true);
    expect(component.isAuthenticated()).toBe(true);
  });

  it('should call auth.logout when logout is invoked', () => {
    component.logout();

    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
