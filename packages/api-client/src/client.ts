/**
 * LSM API Client
 *
 * Shared API client for web and mobile applications.
 * Provides type-safe API calls with automatic token handling.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@lsm/types';

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export interface ApiClientConfig {
  /**
   * Base URL for the API (e.g., 'http://localhost:8000/api/v1')
   */
  baseURL: string;

  /**
   * Function to retrieve the current auth token
   */
  getToken: () => string | null;

  /**
   * Callback when a 401 Unauthorized response is received
   */
  onUnauthorized?: () => void;

  /**
   * Optional timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Creates a configured Axios instance for API calls
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 30000,
    headers: {
      Accept: 'application/json',
    },
  });

  // Request interceptor: Add auth token
  client.interceptors.request.use(
    (requestConfig) => {
      const token = config.getToken();
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: Handle errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        config.onUnauthorized?.();
      }

      // Enhance error with API message if available
      if (error.response?.data?.message) {
        error.message = error.response.data.message;
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type ApiClient = AxiosInstance;

/**
 * Unwraps the data from an API response
 */
export function unwrapResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message ?? 'API request failed');
  }
  return response.data.data as T;
}

/**
 * Unwraps paginated response
 */
export function unwrapPaginatedResponse<T>(
  response: { data: T }
): T {
  return response.data;
}

// Re-export types for convenience
export type { AxiosInstance, AxiosError, AxiosRequestConfig };
