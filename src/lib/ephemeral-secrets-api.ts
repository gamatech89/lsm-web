import type { AxiosInstance } from 'axios';
import type { EphemeralSecretInput, EphemeralSecretMeta, EphemeralSecretReveal } from '@lsm/types';

export function createEphemeralSecretsApi(client: AxiosInstance) {
  return {
    create: (payload: EphemeralSecretInput) =>
      client.post<{ data: { link: string; expires_at: string } }>('/ephemeral-secrets', payload),
    show: (token: string) =>
      client.get<EphemeralSecretMeta>(`/s/${token}`),
    access: (token: string, password?: string) =>
      client.post<EphemeralSecretReveal>(`/s/${token}/access`, password ? { password } : {}),
  };
}
