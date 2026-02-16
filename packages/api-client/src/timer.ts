/**
 * Timer API Module
 */

import type { AxiosInstance } from 'axios';

export interface TimeEntry {
  id: number;
  user_id: number;
  project_id: number;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  formatted_duration: string;
  duration_hours: number;
  is_running: boolean;
  is_billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  rejection_reason: string | null;
  timesheet_id: number | null;
  user?: { id: number; name: string };
  project?: { id: number; name: string; url: string };
  todo?: { id: number; title: string; status: string };
  approver?: { id: number; name: string } | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Timesheet {
  id: number;
  user_id: number;
  week_number: number;
  year: number;
  week_start: string;
  week_end: string;
  week_label: string;
  status: 'open' | 'submitted' | 'approved' | 'rejected' | 'paid';
  total_minutes: number;
  total_billable_minutes: number;
  formatted_total: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  user?: { id: number; name: string };
  approver?: { id: number; name: string } | null;
  entries?: TimeEntry[];
  entries_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TimerProject {
  id: number;
  name: string;
  url: string;
}

export interface StartTimerRequest {
  project_id: number;
  todo_id?: number;
  description?: string;
  is_billable?: boolean;
}

export interface StopTimerRequest {
  description?: string;
}

export interface CreateTimeEntryRequest {
  project_id: number;
  todo_id?: number;
  description?: string;
  started_at: string;
  ended_at: string;
  is_billable?: boolean;
}

export interface UpdateTimeEntryRequest {
  project_id?: number;
  todo_id?: number;
  description?: string;
  started_at?: string;
  ended_at?: string;
  is_billable?: boolean;
}

export interface TimeEntriesFilters {
  project_id?: number;
  todo_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  week?: number;
  year?: number;
  per_page?: number;
  page?: number;
}

export function createTimerApi(client: AxiosInstance) {
  return {
    // Timer operations
    getCurrent: () => 
      client.get<{ success: boolean; data: TimeEntry | null }>('/timer/current'),
    
    start: (data: StartTimerRequest) =>
      client.post<{ success: boolean; data: TimeEntry; message: string }>('/timer/start', data),
    
    stop: (data?: StopTimerRequest) =>
      client.post<{ success: boolean; data: TimeEntry; message: string }>('/timer/stop', data),
    
    discard: () =>
      client.post<{ success: boolean; message: string }>('/timer/discard'),
    
    getProjects: () =>
      client.get<{ success: boolean; data: TimerProject[] }>('/timer/projects'),
  };
}

export function createTimeEntriesApi(client: AxiosInstance) {
  return {
    list: (filters?: TimeEntriesFilters) =>
      client.get<{ data: TimeEntry[]; total: number; current_page: number }>('/time-entries', { params: filters }),
    
    get: (id: number) =>
      client.get<{ success: boolean; data: TimeEntry }>(`/time-entries/${id}`),
    
    create: (data: CreateTimeEntryRequest) =>
      client.post<{ success: boolean; data: TimeEntry; message: string }>('/time-entries', data),
    
    update: (id: number, data: UpdateTimeEntryRequest) =>
      client.put<{ success: boolean; data: TimeEntry; message: string }>(`/time-entries/${id}`, data),
    
    delete: (id: number) =>
      client.delete<{ success: boolean; message: string }>(`/time-entries/${id}`),
    
    today: () =>
      client.get<{ success: boolean; data: { entries: TimeEntry[]; total_minutes: number; formatted_total: string } }>('/time-entries-today'),
  };
}

export function createTimesheetsApi(client: AxiosInstance) {
  return {
    list: (filters?: { status?: string; year?: number }) =>
      client.get<{ data: Timesheet[]; total: number }>('/timesheets', { params: filters }),
    
    getCurrent: () =>
      client.get<{ success: boolean; data: Timesheet }>('/timesheets/current'),
    
    get: (id: number) =>
      client.get<{ success: boolean; data: Timesheet }>(`/timesheets/${id}`),
    
    getByWeek: (week: number, year: number) =>
      client.get<{ success: boolean; data: Timesheet }>('/timesheets/by-week', { params: { week, year } }),
    
    submit: (id: number) =>
      client.post<{ success: boolean; data: Timesheet; message: string }>(`/timesheets/${id}/submit`),
    
    pending: () =>
      client.get<{ success: boolean; data: Timesheet[] }>('/timesheets/pending'),
    
    approve: (id: number, options?: { entry_ids?: number[]; rate_overrides?: Record<number, number> }) =>
      client.post<{ success: boolean; data: Timesheet; message: string }>(`/timesheets/${id}/approve`, options),
    
    reject: (id: number, reason: string, entryIds?: number[]) =>
      client.post<{ success: boolean; data: Timesheet; message: string }>(`/timesheets/${id}/reject`, { reason, entry_ids: entryIds }),
  };
}

// Invoice Types
export interface Invoice {
  id: number;
  user_id: number;
  timesheet_id: number | null;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_amount: number;
  status: 'draft' | 'pending' | 'approved' | 'declined' | 'paid';
  notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  paid_at: string | null;
  user?: { id: number; name: string; hourly_rate?: number };
  timesheet?: Timesheet;
  approver?: { id: number; name: string } | null;
  entries?: TimeEntry[];
  formatted_total?: string;
  formatted_hours?: string;
  created_at: string;
  updated_at: string;
}

export function createInvoicesApi(client: AxiosInstance) {
  return {
    list: (filters?: { status?: string; user_id?: number }) =>
      client.get<{ success: boolean; data: { data: Invoice[]; meta: { total: number } } }>('/invoices', { params: filters }),
    
    get: (id: number) =>
      client.get<{ success: boolean; data: Invoice }>(`/invoices/${id}`),
    
    pending: () =>
      client.get<{ success: boolean; data: Invoice[] }>('/invoices/pending'),
    
    createFromTimesheet: (timesheetId: number, notes?: string) =>
      client.post<{ success: boolean; data: Invoice; message: string }>('/invoices/from-timesheet', { timesheet_id: timesheetId, notes }),
    
    approve: (id: number) =>
      client.post<{ success: boolean; data: Invoice; message: string }>(`/invoices/${id}/approve`),
    
    decline: (id: number) =>
      client.post<{ success: boolean; data: Invoice; message: string }>(`/invoices/${id}/decline`),
    
    markAsPaid: (id: number) =>
      client.post<{ success: boolean; data: Invoice; message: string }>(`/invoices/${id}/mark-paid`),

    downloadPdf: (id: number, params?: { custom_invoice_number?: string; from_name?: string }) =>
      client.get<Blob>(`/invoices/${id}/download-pdf`, { responseType: 'blob', params }),
  };
}

