import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * A todo write touches the project detail (todos list), the cross-project
 * "My Tasks" widget, and dashboard counters. Callers should not have to
 * remember all three.
 */
export function useInvalidateTodos() {
  const queryClient = useQueryClient();
  return (projectId: number | string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.todos.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  };
}
