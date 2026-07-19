import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Time entries roll up into timesheets, invoices, financial reports and
 * analytics. Any write to one of them must refresh the others, or the
 * screens disagree with each other.
 */
export function useInvalidateTimeData() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.time.all(),
      queryKeys.timer.all(),
      queryKeys.timesheets.all(),
      queryKeys.invoices.all(),
      queryKeys.financial.all(),
      queryKeys.analytics.all(),
      queryKeys.dashboard.all(),
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}
