import type { AxiosInstance } from 'axios';
import type {
  CreateIntegrationTokenPayload,
  CreatedIntegrationToken,
  IntegrationToken,
} from '@lsm/types';

export function createIntegrationTokensApi(client: AxiosInstance) {
  return {
    list: () =>
      client.get<{ data: IntegrationToken[] }>('/integration-tokens'),
    create: (payload: CreateIntegrationTokenPayload) =>
      client.post<{ data: CreatedIntegrationToken }>('/integration-tokens', payload),
    revoke: (id: number) =>
      client.delete<{ success: boolean }>(`/integration-tokens/${id}`),
  };
}
