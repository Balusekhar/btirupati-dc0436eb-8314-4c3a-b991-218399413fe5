import { Injectable, inject } from '@angular/core';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api-config';
import { TokenStorageService } from '../auth/token-storage.service';

function toErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as unknown;
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.filter((x) => typeof x === 'string').join(', ');
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Request failed';
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly client: AxiosInstance = axios.create({
    baseURL: this.baseUrl,
  });

  constructor() {
    this.client.interceptors.request.use((config) => {
      const token = this.tokenStorage.getAccessToken();
      if (!token) return config;

      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client
      .get<T>(url, config)
      .then((r) => r.data)
      .catch((e: unknown) => {
        throw new Error(toErrorMessage(e));
      });
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.client
      .post<T>(url, data, config)
      .then((r) => r.data)
      .catch((e: unknown) => {
        throw new Error(toErrorMessage(e));
      });
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.client
      .put<T>(url, data, config)
      .then((r) => r.data)
      .catch((e: unknown) => {
        throw new Error(toErrorMessage(e));
      });
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client
      .delete<T>(url, config)
      .then((r) => r.data)
      .catch((e: unknown) => {
        throw new Error(toErrorMessage(e));
      });
  }
}

