/**
 * API Error Message Extraction
 *
 * Pulls the real server message out of a failed request so mutation toasts
 * don't swallow it behind a generic string. Handles the Laravel shapes:
 *
 *   422 validation -> { message, errors: { field: [messages] } } — first field's message
 *   403 / 500 etc. -> { message } — e.g. "This action is unauthorized.", "Server Error"
 *   network error  -> no response body — caller's fallback
 */

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;

  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) return fallback;

  const data = (response as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return fallback;

  const { errors, message } = data as { errors?: unknown; message?: unknown };

  // Validation errors: surface the first field's first message
  if (typeof errors === 'object' && errors !== null) {
    const first = Object.values(errors).flat()[0];
    if (typeof first === 'string' && first) return first;
  }

  if (typeof message === 'string' && message) return message;

  return fallback;
}
