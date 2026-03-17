import type { AxiosInstance } from 'axios';

export interface AvailabilityLog {
  id: number;
  user_id: number;
  set_by_user_id?: number | null;
  user?: any;
  set_by_user?: any;
  status: string;
  start_date: string;
  end_date?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAvailabilityRequest {
  status: string;
  start_date: string;
  end_date?: string;
  note?: string;
  user_id?: number;
}

export interface UpdateAvailabilityRequest {
  status?: string;
  start_date?: string;
  end_date?: string | null;
  note?: string | null;
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
    update: (id: number, data: UpdateAvailabilityRequest) =>
      client.put<ApiResponse<AvailabilityLog>>(`/availability/${id}`, data),
    destroy: (id: number) =>
      client.delete<ApiResponse<null>>(`/availability/${id}`),
  };
}
