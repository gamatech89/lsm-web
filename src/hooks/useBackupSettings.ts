import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Server-side backup configuration as returned by GET /backups/settings.
 * `enabled` is the backup feature master switch (BACKUP_ENABLED on the API);
 * when false every other backup endpoint answers 403 and the UI hides itself.
 */
export interface BackupSettings {
  enabled: boolean;
  driver: string;
  available_drivers: string[];
  retention: {
    max_backups: number;
    max_age_days: number;
    min_backups: number;
  };
  schedule: {
    enabled: boolean;
    frequency: string;
    time: string;
    day_of_week: number;
  };
  defaults: {
    includes_database: boolean;
    includes_files: boolean;
    includes_uploads: boolean;
  };
}

/** Single shared query for the backup config — every consumer dedupes on the same key. */
export function useBackupSettings() {
  return useQuery<BackupSettings>({
    queryKey: queryKeys.settings.backup(),
    queryFn: () => apiClient.get('/backups/settings').then(r => r.data?.data || r.data),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Whether the backup feature is switched on for this platform.
 *
 * `enabled` is `undefined` until the server has answered (or the request
 * failed), then a definite boolean. Callers hide backup UI unless it is
 * exactly `true`, and only redirect/fall back once it is exactly `false` —
 * so a page deep-linked to the backups tab shows a spinner rather than
 * flashing Overview while the flag is still loading.
 */
export function useBackupsEnabled(): { enabled: boolean | undefined; isPending: boolean } {
  const { data, isPending } = useBackupSettings();
  if (isPending) return { enabled: undefined, isPending: true };
  return { enabled: data?.enabled === true, isPending: false };
}
