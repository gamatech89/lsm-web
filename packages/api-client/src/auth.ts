/**
 * Authentication API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  TwoFactorPendingResponse,
  TwoFactorVerifyRequest,
  TwoFactorEnableResponse,
  TwoFactorRecoveryCodesResponse,
  User,
} from '@lsm/types';

export function createAuthApi(client: AxiosInstance) {
  return {
    /**
     * Authenticate user and get token (may return two_factor_required instead)
     */
    login: (credentials: LoginRequest) =>
      client.post<ApiResponse<AuthResponse | TwoFactorPendingResponse>>('/login', credentials),

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

    /**
     * Reset password using token from email link (public endpoint)
     */
    resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
      client.post<ApiResponse<null>>('/reset-password', data),

    updateProfile: (data: { name?: string; email?: string }) =>
      client.put<ApiResponse<User>>('/user/profile', data),

    updateBilling: (data: { billing_company_name?: string | null; billing_address?: string | null; billing_tax_id?: string | null; invoice_prefix?: string | null }) =>
      client.put<ApiResponse<User>>('/user/billing', data),

    twoFactorEnable: () =>
      client.post<ApiResponse<TwoFactorEnableResponse>>('/two-factor/enable'),

    twoFactorConfirm: (code: string) =>
      client.post<ApiResponse<TwoFactorRecoveryCodesResponse>>('/two-factor/confirm', { code }),

    twoFactorDisable: (password: string) =>
      client.post<ApiResponse<null>>('/two-factor/disable', { password }),

    twoFactorVerify: (data: TwoFactorVerifyRequest) =>
      client.post<ApiResponse<AuthResponse>>('/two-factor/verify', data),

    twoFactorRegenerateCodes: () =>
      client.post<ApiResponse<TwoFactorRecoveryCodesResponse>>('/two-factor/recovery-codes'),

    twoFactorSendEmailCode: (twoFactorToken: string) =>
      client.post<ApiResponse<null>>('/two-factor/email/send', { two_factor_token: twoFactorToken }),

    twoFactorEnableEmail: () =>
      client.post<ApiResponse<null>>('/two-factor/email/enable'),

    twoFactorDisableEmail: (password: string) =>
      client.post<ApiResponse<null>>('/two-factor/email/disable', { password }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
