import type { AxiosInstance } from 'axios';
import type { ApiResponse, User } from '@lsm/types';

export interface AvailabilityLog {
  id: number;
  user_id: number;
  user?: User;
  status: string;
  start_date: string;
  end_date?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAvailabilityRequest {
  status: string;
  start_date: string;
  end_date?: string;
  note?: string;
}

export function createAvailabilityApi(client: AxiosInstance) {
  return {
    list: () => client.get<ApiResponse<AvailabilityLog[]>>('/availability'),
    create: (data: CreateAvailabilityRequest) =>
      client.post<ApiResponse<AvailabilityLog>>('/availability', data),
  };
}
