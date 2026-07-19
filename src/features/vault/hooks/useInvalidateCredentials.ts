import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * The same credential is listed both in the vault and on its project's
 * Credentials tab. Writes from either side must refresh both.
 */
export function useInvalidateCredentials() {
  const queryClient = useQueryClient();
  return (projectId?: number | string | null) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vault.all() });
    if (projectId != null) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.credentials(projectId) });
    }
  };
}
