import type { AxiosInstance } from 'axios';

// Define types locally since getting them from @lsm/types might also be risky if that wasn't built, 
// though usually types are source. But let's be safe.
export interface AvailabilityLog {
  id: number;
  user_id: number;
  user?: any;
  status: string;
  start_date: string;
  end_date?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAvailabilityRequest {
  status: string;
  start_date: string;
  end_date?: string;
  note?: string;
}

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
}

export function createAvailabilityApi(client: AxiosInstance) {
  return {
    list: () => client.get<ApiResponse<AvailabilityLog[]>>('/availability'),
    create: (data: CreateAvailabilityRequest) =>
      client.post<ApiResponse<AvailabilityLog>>('/availability', data),
  };
}
