import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { TokenStorageService } from './core/auth/token-storage.service';
import { ApiClientService } from './core/http/api-client.service';
import { signal } from '@angular/core';

describe('App', () => {
  let mockTokenStorage: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    getAccessToken: ReturnType<typeof vi.fn>;
    jwtPayload: ReturnType<typeof signal<null>>;
  };

  beforeEach(async () => {
    mockTokenStorage = {
      isAuthenticated: signal(false),
      getAccessToken: vi.fn().mockReturnValue(null),
      jwtPayload: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { login: vi.fn(), logout: vi.fn() },
        },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: ApiClientService, useValue: {} },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
