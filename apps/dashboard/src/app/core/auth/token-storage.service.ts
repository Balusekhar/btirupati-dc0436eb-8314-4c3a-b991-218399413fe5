import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'auth.access_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly accessToken = signal<string | null>(
    localStorage.getItem(STORAGE_KEY),
  );

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
    this.accessToken.set(token);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.accessToken.set(null);
  }
}

