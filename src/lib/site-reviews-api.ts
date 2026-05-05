import type { AxiosInstance } from 'axios';

export interface SiteReview {
  id: number;
  project_id: number;
  title: string;
  url: string;
  status: 'draft' | 'active' | 'archived';
  share_url: string | null;
  share_has_password: boolean;
  share_expires_at: string | null;
  share_active: boolean;
  annotation_count?: number;
  pins?: SiteReviewAnnotation[];
  creator: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteReviewAnnotation {
  id: number;
  review_id: number;
  parent_id: number | null;
  todo_id: number | null;
  x_percent: number | null;
  y_percent: number | null;
  scroll_y: number | null;
  comment: string;
  author_type: 'internal' | 'client';
  author_name: string;
  author_email: string | null;
  screenshot_url: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  replies: SiteReviewAnnotation[];
  created_at: string;
}

export interface CreateReviewParams {
  title: string;
  url: string;
}

export interface CreateAnnotationParams {
  parent_id?: number;
  x_percent?: number;
  y_percent?: number;
  scroll_y?: number;
  comment: string;
  create_todo?: boolean;
}

export interface CreateShareAnnotationParams extends CreateAnnotationParams {
  author_name: string;
  author_email?: string;
  password?: string;
}

export interface GenerateShareParams {
  password?: string;
  expires_at?: string;
}

export function createSiteReviewsApi(client: AxiosInstance) {
  return {
    list: (projectId: number) =>
      client.get<{ data: SiteReview[] }>(`/projects/${projectId}/site-reviews`),

    get: (reviewId: number) =>
      client.get<{ data: SiteReview }>(`/site-reviews/${reviewId}`),

    create: (projectId: number, params: CreateReviewParams) =>
      client.post<{ data: SiteReview }>(`/projects/${projectId}/site-reviews`, params),

    update: (reviewId: number, params: Partial<CreateReviewParams & { status: string }>) =>
      client.put<{ data: SiteReview }>(`/site-reviews/${reviewId}`, params),

    delete: (reviewId: number) =>
      client.delete(`/site-reviews/${reviewId}`),

    generateShare: (reviewId: number, params: GenerateShareParams = {}) =>
      client.post<{ data: { share_url: string; has_password: boolean; expires_at: string | null } }>(
        `/site-reviews/${reviewId}/share`,
        params,
      ),

    revokeShare: (reviewId: number) =>
      client.delete(`/site-reviews/${reviewId}/share`),

    // Annotations
    addAnnotation: (reviewId: number, params: CreateAnnotationParams) =>
      client.post<{ data: SiteReviewAnnotation }>(`/site-reviews/${reviewId}/annotations`, params),

    updateAnnotation: (annotationId: number, comment: string) =>
      client.put<{ data: SiteReviewAnnotation }>(`/site-review-annotations/${annotationId}`, { comment }),

    deleteAnnotation: (annotationId: number) =>
      client.delete(`/site-review-annotations/${annotationId}`),

    resolveAnnotation: (annotationId: number) =>
      client.post<{ data: SiteReviewAnnotation }>(`/site-review-annotations/${annotationId}/resolve`),

    uploadScreenshot: (annotationId: number, blob: Blob) => {
      const form = new FormData();
      form.append('screenshot', blob, 'screenshot.png');
      return client.post(`/site-review-annotations/${annotationId}/screenshot`, form);
    },

    // Public share endpoints (no auth token needed — use apiClient directly)
    getShare: (token: string) =>
      client.get<{ data: { title: string; url: string; has_password: boolean; expires_at: string | null } }>(
        `/review-share/${token}`,
      ),

    accessShare: (token: string, password?: string) =>
      client.post<{ data: { id: number; title: string; url: string; pins: SiteReviewAnnotation[] } }>(
        `/review-share/${token}/access`,
        { password },
      ),

    addShareAnnotation: (token: string, params: CreateShareAnnotationParams) =>
      client.post<{ data: SiteReviewAnnotation }>(`/review-share/${token}/annotations`, params),

    uploadShareScreenshot: (token: string, annotationId: number, blob: Blob) => {
      const form = new FormData();
      form.append('screenshot', blob, 'screenshot.png');
      return client.post(`/review-share/${token}/annotations/${annotationId}/screenshot`, form);
    },

    createTodoFromAnnotation: (annotationId: number, data: { title?: string; priority?: string; screenshot?: File }) => {
      const form = new FormData();
      if (data.title) form.append('title', data.title);
      if (data.priority) form.append('priority', data.priority);
      if (data.screenshot) form.append('screenshot', data.screenshot, data.screenshot.name);
      return client.post<{ data: { todo_id: number; todo_title: string } }>(
        `/site-review-annotations/${annotationId}/todo`, form,
      );
    },
  };
}

export type SiteReviewsApi = ReturnType<typeof createSiteReviewsApi>;
