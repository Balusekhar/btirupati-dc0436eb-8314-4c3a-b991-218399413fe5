import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { LoginDto, Role } from '@org/data';
import { TokenStorageService } from './token-storage.service';
import { ApiClientService } from '../http/api-client.service';

type LoginResponse = { access_token: string };
type SignupResponse = {
  access_token: string;
  user: { id: string; email: string; role: Role; organizationId: string | null };
};

export type SignupRequest = {
  email: string;
  password: string;
  name?: string;
  organizationId?: string;
  role?: Role;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly api = inject(ApiClientService);

  async login(dto: LoginDto): Promise<void> {
    const res = await this.api.post<LoginResponse>('/auth/login', dto);

    if (!res?.access_token) {
      throw new Error('Login failed: missing access token');
    }

    this.tokenStorage.setAccessToken(res.access_token);
  }

  async signup(dto: SignupRequest): Promise<void> {
    const res = await this.api.post<SignupResponse>('/auth/signup', dto);
    if (!res?.access_token) {
      throw new Error('Signup failed: missing access token');
    }
    this.tokenStorage.setAccessToken(res.access_token);
  }

  logout(): void {
    this.tokenStorage.clear();
    void this.router.navigate(['/login']);
  }
}

