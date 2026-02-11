/**
 * Validation Utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate password strength
 */
export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong';
  suggestions: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Include both uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else suggestions.push('Include at least one number');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else suggestions.push('Include at least one special character');

  const labels: PasswordStrength['label'][] = ['weak', 'weak', 'fair', 'good', 'strong'];
  
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    suggestions,
  };
}

/**
 * Check if a string is empty or only whitespace
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: (keyof T)[] } {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}
