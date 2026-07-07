import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

// The server expires Sanctum tokens after 8h. Refresh well before that
// (7h buffer) so active sessions never hit an expiry. Idle sessions whose
// token lapses are logged out by the api client's onUnauthorized handler.
const REFRESH_INTERVAL_MS = 7 * 60 * 60 * 1000;

/**
 * While authenticated, silently refreshes the access token on an interval.
 */
export function useTokenRefresh() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = async () => {
      try {
        const res = await api.auth.refreshToken();
        const newToken = res.data?.data?.token;
        const user = useAuthStore.getState().user;
        if (newToken && user) {
          useAuthStore.getState().setAuth(user, newToken);
        }
      } catch {
        // Refresh failed (e.g. token already expired) — the next API call's
        // 401 handler will log the user out. Nothing to do here.
      }
    };

    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated]);
}
