/**
 * Authentication API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  User,
} from '@lsm/types';

export function createAuthApi(client: AxiosInstance) {
  return {
    /**
     * Authenticate user and get token
     */
    login: (credentials: LoginRequest) =>
      client.post<ApiResponse<AuthResponse>>('/login', credentials),

    /**
     * Revoke current token
     */
    logout: () =>
      client.post<ApiResponse<null>>('/logout'),

    /**
     * Revoke all tokens (logout from all devices)
     */
    logoutAll: () =>
      client.post<ApiResponse<null>>('/logout-all'),

    /**
     * Get currently authenticated user
     */
    getUser: () =>
      client.get<ApiResponse<User>>('/user'),

    /**
     * Refresh the current token
     */
    refreshToken: () =>
      client.post<ApiResponse<{ token: string; token_type: 'Bearer' }>>('/refresh-token'),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
