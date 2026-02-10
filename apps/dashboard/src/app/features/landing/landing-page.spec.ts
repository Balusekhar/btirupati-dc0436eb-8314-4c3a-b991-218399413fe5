import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing-page';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { signal } from '@angular/core';

describe('LandingPage', () => {
  let component: LandingPage;
  let fixture: ComponentFixture<LandingPage>;
  let mockTokenStorage: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockTokenStorage = {
      isAuthenticated: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        { provide: TokenStorageService, useValue: mockTokenStorage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose isAuthenticated from TokenStorageService', () => {
    expect(component.isAuthenticated()).toBe(false);

    mockTokenStorage.isAuthenticated.set(true);
    expect(component.isAuthenticated()).toBe(true);
  });
});
