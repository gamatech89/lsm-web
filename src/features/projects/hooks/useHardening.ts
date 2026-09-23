import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  HardeningAbilities,
  HardeningActionResponse,
  HardeningErrorBody,
  HardeningOverview,
  HardeningPauseMinutes,
  HardeningRuleKey,
} from '@/lib/lsm-api';

/** `can` missing from the response (web deployed before the API) means: nothing is allowed. */
const NO_ABILITIES: HardeningAbilities = { pause: false, enable: false, disable: false };

/**
 * A 2xx answer that does not say `success: true`. The API is specified to
 * answer 409/422 for a refused or rolled-back change, but a rolled-back change
 * must never read as "applied" just because something in between passed the
 * plugin's HTTP 200 through. Thrown from mutationFn so it lands in onError
 * exactly like a 4xx.
 */
class HardeningFailure extends Error {
  readonly body: Partial<HardeningErrorBody>;

  constructor(body: Partial<HardeningErrorBody>) {
    super(body.message ?? 'Hardening change failed');
    this.body = body;
  }
}

function unwrap(res: { data: HardeningActionResponse }): HardeningActionResponse {
  if (res.data?.success !== true) {
    throw new HardeningFailure((res.data ?? {}) as Partial<HardeningErrorBody>);
  }
  return res.data;
}

/**
 * The JSON body of a failed call, whichever way it failed. `undefined` when
 * there was no usable answer — nothing came back, or what came back is not a
 * JSON object (an HTML gateway page, with a 2xx or an error status alike).
 */
function failureBody(error: unknown): Partial<HardeningErrorBody> | undefined {
  const data: unknown =
    error instanceof HardeningFailure
      ? error.body
      : (error as { response?: { data?: unknown } } | null)?.response?.data;
  return typeof data === 'object' && data !== null ? (data as Partial<HardeningErrorBody>) : undefined;
}

/**
 * Status query plus the three write actions for the managed .htaccess
 * hardening card.
 *
 * Every write can take up to two minutes (the plugin backs the file up, writes
 * it and tests the live site), and any of them can end in an automatic
 * rollback. So: failures are toasted here by machine `reason`, the status is
 * always re-read afterwards — even after a timeout, when nobody knows whether
 * the change went through — and the mutation only settles once that re-read
 * is in, so the card never shows a state the server did not report.
 */
export function useHardening(projectId: number, enabled: boolean) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const query = useQuery<HardeningOverview>({
    queryKey: queryKeys.projects.securityHardening(projectId),
    queryFn: () => api.lsm.getHardening(projectId).then(r => r.data),
    enabled,
    staleTime: 30000,
    // Once a pause has run out the rule comes back on the site's own schedule
    // (its next page load, or the platform's 10-minute backstop), so keep
    // looking until it has — otherwise the overdue alert outlives the problem.
    // Not while the countdown is still running: the card refetches at zero
    // anyway, and every read is a round-trip to the customer's site.
    refetchInterval: q => {
      const overview = q.state.data;
      const until = overview?.status?.pause_until;
      return overview?.pause_overdue || (until != null && until * 1000 <= Date.now()) ? 30000 : false;
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.securityHardening(projectId) });

  const describeError = (error: unknown): string => {
    const body = failureBody(error);
    const fallback =
      (typeof body?.message === 'string' && body.message) || t('projects.hardening.toasts.genericError');
    // No usable answer (browser timeout, network, an HTML gateway page): the
    // change may or may not have been applied — same wording as the API's own
    // 'unreachable'.
    const reason = typeof body?.reason === 'string' ? body.reason : body ? undefined : 'unreachable';
    if (!reason) return fallback;
    return t(`projects.hardening.reasons.${reason}`, {
      defaultValue: fallback,
      version: body?.min_version ?? '2.10.0',
    });
  };

  const showWarnings = (warnings: string[] | undefined) => {
    (warnings ?? []).forEach(warning =>
      message.warning(t(`projects.hardening.warnings.${warning}`, { defaultValue: warning }), 8)
    );
  };

  const onError = (error: unknown) => {
    message.error(describeError(error), 8);
  };

  const ruleMutation = useMutation({
    mutationFn: ({ rule, enabled: on }: { rule: HardeningRuleKey; enabled: boolean }) =>
      api.lsm.setHardeningRule(projectId, rule, on).then(unwrap),
    onSuccess: (body, { rule, enabled: on }) => {
      const label = t(`projects.hardening.rules.${rule}.label`);
      message.success(
        t(on ? 'projects.hardening.toasts.enabled' : 'projects.hardening.toasts.disabled', { rule: label })
      );
      showWarnings(body.warnings);
    },
    onError,
    onSettled: refresh,
  });

  const pauseMutation = useMutation({
    mutationFn: (minutes: HardeningPauseMinutes) =>
      api.lsm.pauseHardening(projectId, minutes).then(unwrap),
    onSuccess: (body, minutes) => {
      message.success(t('projects.hardening.toasts.paused', { minutes }));
      showWarnings(body.warnings);
    },
    onError,
    onSettled: refresh,
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.lsm.resumeHardening(projectId).then(unwrap),
    onSuccess: body => {
      message.success(t('projects.hardening.toasts.resumed'));
      showWarnings(body.warnings);
    },
    onError,
    onSettled: refresh,
  });

  // The confirm dialogs hand these straight to antd's onOk. They must not
  // reject: the failure is already toasted above, and a rejected onOk would
  // keep the dialog open over a card that has just refreshed.
  const settle = (promise: Promise<unknown>): Promise<void> =>
    promise.then(
      () => undefined,
      () => undefined
    );

  return {
    query,
    can: { ...NO_ABILITIES, ...query.data?.can },
    setRule: (rule: HardeningRuleKey, on: boolean) => settle(ruleMutation.mutateAsync({ rule, enabled: on })),
    pause: (minutes: HardeningPauseMinutes) => settle(pauseMutation.mutateAsync(minutes)),
    resume: () => settle(resumeMutation.mutateAsync()),
    /** The rule whose row shows a spinner right now, if any. */
    pendingRule: ruleMutation.isPending ? ruleMutation.variables?.rule ?? null : null,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    /** One write at a time — the plugin answers `busy` to a second one anyway. */
    isBusy: ruleMutation.isPending || pauseMutation.isPending || resumeMutation.isPending,
  };
}
