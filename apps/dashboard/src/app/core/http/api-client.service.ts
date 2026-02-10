import { Injectable, inject } from '@angular/core';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api-config';
import { TokenStorageService } from '../auth/token-storage.service';

// ---------------------------------------------------------------------------
// Structured API error – preserves HTTP status, error name, and full details
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /** HTTP status code (0 if the request never reached the server). */
  readonly status: number;
  /** Short error tag from the server (e.g. "Forbidden", "Not Found"). */
  readonly error: string;
  /** Raw response body for further inspection by callers. */
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    error: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

function toApiError(err: unknown): ApiError {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as Record<string, unknown> | undefined;

    let message = 'Request failed';
    let errorTag = err.response?.statusText ?? 'Unknown Error';

    if (data && typeof data === 'object') {
      if ('error' in data && typeof data['error'] === 'string') {
        errorTag = data['error'];
      }
      if ('message' in data) {
        const msg = data['message'];
        if (typeof msg === 'string') message = msg;
        else if (Array.isArray(msg))
          message = msg.filter((x) => typeof x === 'string').join(', ');
      }
    }

    // Fallback to the Axios-provided message when the server sent nothing useful
    if (message === 'Request failed') {
      message = err.message;
    }

    return new ApiError(message, status, errorTag, data);
  }

  if (err instanceof Error) {
    return new ApiError(err.message, 0, 'NetworkError');
  }

  return new ApiError('Request failed', 0, 'UnknownError');
}

// ---------------------------------------------------------------------------
// Retry helper – retries transient failures (5xx, network errors)
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function isTransient(err: unknown): boolean {
  if (err instanceof AxiosError) {
    // Network error (no response received) or server error (5xx)
    if (!err.response) return true;
    return err.response.status >= 500;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === MAX_RETRIES) break;
      await delay(RETRY_DELAY_MS * Math.pow(2, attempt)); // exponential backoff
    }
  }
  throw toApiError(lastError);
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

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
    return withRetry(() =>
      this.client.get<T>(url, config).then((r) => r.data),
    );
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(() =>
      this.client.post<T>(url, data, config).then((r) => r.data),
    );
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(() =>
      this.client.put<T>(url, data, config).then((r) => r.data),
    );
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(() =>
      this.client.delete<T>(url, config).then((r) => r.data),
    );
  }
}

