/**
 * Generalized Fetch API Utility
 * Provides a unified interface for making API requests with session management
 */

import { sessionManager } from './sessionManager';

export interface FetchConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Custom error class for API errors
 */
export class FetchApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'FetchApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Build headers with authentication
 */
function buildHeaders(customHeaders?: HeadersInit): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  // Add session ID if available
  const sessionId = sessionManager.getSessionId();
  if (sessionId) {
    headers.set('X-Session-ID', sessionId);
  }

  // Add JWT token as fallback
  const token = sessionManager.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Merge custom headers
  if (customHeaders) {
    const customHeadersObj =
      customHeaders instanceof Headers
        ? Object.fromEntries(customHeaders.entries())
        : customHeaders;
    
    if (Array.isArray(customHeadersObj)) {
      customHeadersObj.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(customHeadersObj).forEach(([key, value]) => {
        if (value) headers.set(key, value);
      });
    }
  }

  return headers;
}

/**
 * Build full URL
 */
function buildUrl(endpoint: string, params?: Record<string, any>): string {
  // If endpoint is already a full URL, use it
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const url = new URL(endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  // Build relative URL
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${baseUrl}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.pathname + url.search;
}

/**
 * Handle response parsing and error handling
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data: T;

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else if (contentType?.includes('text/')) {
    data = (await response.text()) as unknown as T;
  } else {
    data = (await response.blob()) as unknown as T;
  }

  if (!response.ok) {
    const errorData = data as any;
    throw new FetchApiError(
      errorData?.message || `Request failed with status ${response.status}`,
      response.status,
      errorData?.code,
      errorData?.details || errorData
    );
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
    ok: response.ok,
  };
}

/**
 * Handle 401 unauthorized errors
 */
function handleUnauthorized(): void {
  console.warn('🔴 Session expired or invalid. Redirecting to login...');
  sessionManager.clearAuth();
  
  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core fetch function with all features
 */
async function fetchWithConfig<T>(
  endpoint: string,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    headers: customHeaders,
    ...fetchOptions
  } = config;

  const url = buildUrl(endpoint);
  const headers = buildHeaders(customHeaders);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= retries) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        handleUnauthorized();
        throw new FetchApiError('Unauthorized', 401);
      }

      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or abort
      if (
        error instanceof FetchApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new FetchApiError('Request timeout', 408);
      }

      // Retry on network errors
      if (attempts < retries) {
        attempts++;
        console.warn(`Request failed, retrying (${attempts}/${retries})...`);
        await sleep(retryDelay * attempts);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * HTTP Method helpers
 */

export async function get<T>(
  endpoint: string,
  params?: Record<string, any>,
  config?: FetchConfig
): Promise<T> {
  const url = params ? buildUrl(endpoint, params) : endpoint;
  const response = await fetchWithConfig<T>(url, {
    ...config,
    method: 'GET',
  });
  return response.data;
}

export async function post<T>(
  endpoint: string,
  data?: any,
  config?: FetchConfig
): Promise<T> {
  const response = await fetchWithConfig<T>(endpoint, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.data;
}

export async function put<T>(
  endpoint: string,
  data?: any,
  config?: FetchConfig
): Promise<T> {
  const response = await fetchWithConfig<T>(endpoint, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.data;
}

export async function patch<T>(
  endpoint: string,
  data?: any,
  config?: FetchConfig
): Promise<T> {
  const response = await fetchWithConfig<T>(endpoint, {
    ...config,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.data;
}

export async function del<T>(
  endpoint: string,
  config?: FetchConfig
): Promise<T> {
  const response = await fetchWithConfig<T>(endpoint, {
    ...config,
    method: 'DELETE',
  });
  return response.data;
}

/**
 * File upload helper
 */
export async function upload<T>(
  endpoint: string,
  file: File | FormData,
  config?: FetchConfig
): Promise<T> {
  const formData = file instanceof FormData ? file : new FormData();
  if (file instanceof File) {
    formData.append('file', file);
  }

  const headers = buildHeaders();
  // Remove Content-Type for FormData (browser will set it with boundary)
  headers.delete('Content-Type');

  const response = await fetchWithConfig<T>(endpoint, {
    ...config,
    method: 'POST',
    headers,
    body: formData,
  });
  return response.data;
}

/**
 * Download helper
 */
export async function download(
  endpoint: string,
  filename?: string,
  config?: FetchConfig
): Promise<void> {
  const response = await fetchWithConfig<Blob>(endpoint, {
    ...config,
    method: 'GET',
  });

  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * API object for named imports
 */
export const fetchApi = {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  download,
};

export default fetchApi;
