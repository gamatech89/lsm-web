/**
 * Server hardening (.htaccess) card
 *
 * Three rules the LSM plugin writes into wp-content/.htaccess and
 * uploads/.htaccess. Everything shown here is the server's view: a switch
 * follows the state the plugin read from the file, never the click, and what
 * the user may do comes from the API's `can`, never from their role.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined, LockOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { useHardening } from '../hooks/useHardening';
import type {
  HardeningPauseMinutes,
  HardeningRuleKey,
  HardeningRuleState,
  HardeningRuleStatus,
} from '@/lib/lsm-api';

const { Text } = Typography;

interface HardeningCardProps {
  project: { id: number; has_health_check_secret?: boolean };
}

// The file each rule lives in, for the confirm texts. Paths are not translated.
const RULES: Array<{ key: HardeningRuleKey; file: string }> = [
  { key: 'block_archives', file: 'wp-content/.htaccess' },
  { key: 'block_debug_log', file: 'wp-content/.htaccess' },
  { key: 'block_uploads_php', file: 'uploads/.htaccess' },
];

const STATE_COLOR: Record<HardeningRuleState, string> = {
  on: 'success',
  off: 'default',
  paused: 'warning',
  manual: 'blue',
  drift: 'orange',
  unsupported: 'default',
};

const PAUSE_OPTIONS: HardeningPauseMinutes[] = [15, 30, 60];

/**
 * Explains a disabled control. A disabled button swallows mouse events, so a
 * Tooltip attached to it never opens — the outer span takes the hover instead.
 */
function Explained({ reason, children }: { reason?: string; children: ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip title={reason} color="#1e293b">
      <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
        <span style={{ display: 'inline-block', pointerEvents: 'none' }}>{children}</span>
      </span>
    </Tooltip>
  );
}

export function HardeningCard({ project }: HardeningCardProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const hasLsmConnection = !!project.has_health_check_secret;

  // Lives beside the button, not inside the confirm: modal.confirm renders its
  // content once and would not follow a Select's state.
  const [pauseMinutes, setPauseMinutes] = useState<HardeningPauseMinutes>(60);

  const { query, can, setRule, pause, resume, pendingRule, isPausing, isResuming, isBusy } =
    useHardening(project.id, hasLsmConnection);
  const { data, isLoading, isError, refetch } = query;
  const status = data?.status ?? null;

  const ruleLabel = (rule: HardeningRuleKey) => t(`projects.hardening.rules.${rule}.label`);

  // Turn on, Adopt and Re-apply are the same call — only the wording differs.
  const confirmEnable = (rule: HardeningRuleKey, file: string, kind: 'enable' | 'adopt' | 'reapply') => {
    // Adopting changes nothing for visitors: the manual rule already blocks these files.
    const attachments =
      rule === 'block_archives' && kind !== 'adopt' ? status?.archive_attachments ?? 0 : 0;
    modal.confirm({
      title: t(`projects.hardening.confirm.${kind}.title`, { rule: ruleLabel(rule) }),
      content: (
        <div>
          {attachments > 0 && (
            <Alert
              type="warning"
              showIcon
              message={t('projects.hardening.confirm.archiveAttachments', { count: attachments })}
              style={{ marginBottom: 12 }}
            />
          )}
          <Text>{t(`projects.hardening.confirm.${kind}.content`, { file })}</Text>
        </div>
      ),
      okText: t(`projects.hardening.confirm.${kind}.okText`),
      cancelText: t('common.cancel'),
      onOk: () => setRule(rule, true),
    });
  };

  const confirmDisable = (rule: HardeningRuleKey, file: string) => {
    modal.confirm({
      title: t('projects.hardening.confirm.disable.title', { rule: ruleLabel(rule) }),
      content: (
        <div>
          <Text>{t('projects.hardening.confirm.disable.content', { file })}</Text>
          {rule === 'block_archives' && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{t('projects.hardening.confirm.disable.archivesNote')}</Text>
            </div>
          )}
        </div>
      ),
      okText: t('projects.hardening.confirm.disable.okText'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => setRule(rule, false),
    });
  };

  const confirmPause = () => {
    const minutes = pauseMinutes;
    modal.confirm({
      title: t('projects.hardening.confirm.pause.title', { minutes }),
      content: t('projects.hardening.confirm.pause.content', { minutes }),
      okText: t('projects.hardening.confirm.pause.okText'),
      cancelText: t('common.cancel'),
      onOk: () => pause(minutes),
    });
  };

  const renderStateTag = (rule: HardeningRuleStatus | undefined) => {
    // A status object missing this rule entirely (partial/malformed API reply)
    // gets the same raw-grey-tag treatment as an unknown state, below.
    if (!rule) {
      return (
        <Tag style={{ margin: 0 }}>
          {t('projects.hardening.states.unknown', { defaultValue: 'unknown' })}
        </Tag>
      );
    }
    // A state this build does not know (newer plugin) shows as its raw name in a
    // grey tag, not as an i18n key.
    const tag = (
      <Tag color={STATE_COLOR[rule.state]} style={{ margin: 0 }}>
        {t(`projects.hardening.states.${rule.state}`, { defaultValue: rule.state })}
      </Tag>
    );
    let hint: string | undefined;
    if (rule.state === 'unsupported' && rule.unsupported_reason) {
      hint = t(`projects.hardening.unsupportedReasons.${rule.unsupported_reason}`, {
        defaultValue: rule.unsupported_reason,
        server: status?.server ?? '?',
      });
    } else if (rule.state === 'manual' || rule.state === 'drift') {
      hint = t(`projects.hardening.stateHints.${rule.state}`);
    }
    return hint ? (
      <Tooltip title={hint} color="#1e293b">
        <span style={{ cursor: 'help' }}>{tag}</span>
      </Tooltip>
    ) : (
      tag
    );
  };

  const renderControl = (key: HardeningRuleKey, file: string, rule: HardeningRuleStatus) => {
    const loading = pendingRule === key;

    if (rule.state === 'paused') {
      return (
        <Space size={12}>
          {!data?.pause_overdue && status?.pause_until != null && (
            <Statistic.Timer
              type="countdown"
              value={status.pause_until * 1000}
              format="mm:ss"
              onFinish={() => refetch()}
              valueStyle={{ fontSize: 14 }}
            />
          )}
          <Explained reason={can.pause ? undefined : t('projects.hardening.noPermission.pause')}>
            <Button
              size="small"
              type="primary"
              loading={isResuming}
              disabled={!can.pause || (isBusy && !isResuming)}
              onClick={() => resume()}
            >
              {t('projects.hardening.actions.resume')}
            </Button>
          </Explained>
        </Space>
      );
    }

    if (rule.state === 'manual' || rule.state === 'drift') {
      const kind = rule.state === 'manual' ? 'adopt' : 'reapply';
      return (
        <Explained reason={can.enable ? undefined : t('projects.hardening.noPermission.enable')}>
          <Button
            size="small"
            loading={loading}
            disabled={!can.enable || (isBusy && !loading)}
            onClick={() => confirmEnable(key, file, kind)}
          >
            {t(`projects.hardening.actions.${kind}`)}
          </Button>
        </Explained>
      );
    }

    if (rule.state === 'unsupported') {
      return <Switch checked={false} disabled aria-label={ruleLabel(key)} />;
    }

    // A state this build does not know (newer plugin): show the tag, offer nothing.
    if (rule.state !== 'on' && rule.state !== 'off') return null;

    const isOn = rule.state === 'on';
    const allowed = isOn ? can.disable : can.enable;
    const denied = t(isOn ? 'projects.hardening.noPermission.disable' : 'projects.hardening.noPermission.enable');
    return (
      <Space size={12}>
        {isOn && key === 'block_archives' && (
          <Space size={4}>
            <Select<HardeningPauseMinutes>
              size="small"
              value={pauseMinutes}
              onChange={setPauseMinutes}
              disabled={!can.pause || isBusy}
              options={PAUSE_OPTIONS.map(minutes => ({
                value: minutes,
                label: t('projects.hardening.pauseOption', { minutes }),
              }))}
              style={{ width: 90 }}
            />
            <Explained reason={can.pause ? undefined : t('projects.hardening.noPermission.pause')}>
              <Button
                size="small"
                icon={<PauseCircleOutlined />}
                loading={isPausing}
                disabled={!can.pause || (isBusy && !isPausing)}
                onClick={confirmPause}
              >
                {t('projects.hardening.actions.pause')}
              </Button>
            </Explained>
          </Space>
        )}
        <Explained reason={allowed ? undefined : denied}>
          <Switch
            checked={isOn}
            loading={loading}
            disabled={!allowed || (isBusy && !loading)}
            onChange={checked => (checked ? confirmEnable(key, file, 'enable') : confirmDisable(key, file))}
            aria-label={ruleLabel(key)}
          />
        </Explained>
      </Space>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      );
    }

    if (isError || !data) {
      return (
        <Space>
          <Text type="secondary">{t('projects.hardening.quiet.loadError')}</Text>
          <Button type="link" size="small" onClick={() => refetch()}>
            {t('projects.hardening.quiet.retry')}
          </Button>
        </Space>
      );
    }

    // The platform keeps its own record of an open pause, so an overdue one
    // shows even when the site itself cannot be asked.
    const overdueAlert = data.pause_overdue && (
      <Alert
        type="warning"
        showIcon
        message={t('projects.hardening.overdue.title')}
        description={t('projects.hardening.overdue.description')}
        style={{ marginBottom: 12 }}
      />
    );

    // A status object without a `rules` map (e.g. `{}` from a plugin reply
    // that didn't parse, or a partial object) is truthy but unusable — treat
    // it the same as "site not reachable" rather than reading status.rules
    // below and throwing.
    if (data.plugin_outdated || !data.reachable || !status?.rules) {
      return (
        <div>
          {overdueAlert}
          <Text type="secondary">
            {data.plugin_outdated
              ? t('projects.hardening.quiet.pluginOutdated', { version: data.min_version || '2.10.0' })
              : t('projects.hardening.quiet.unreachable')}
          </Text>
          {!data.pause_overdue && data.open_pause && (
            <div style={{ marginTop: 4 }}>
              <Text type="warning">{t('projects.hardening.quiet.openPause')}</Text>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        {overdueAlert}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {RULES.map(({ key, file }, index) => {
            // status.rules is typed as always carrying all three keys, but the
            // API passes the plugin's reply through — a partial object leaves
            // this undefined for one key. Render that row as the unknown-state
            // row (raw grey tag, no control) instead of throwing.
            const rule = status.rules[key];
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '16px 0',
                  borderBottom:
                    index < RULES.length - 1 ? `1px solid ${isDark ? '#334155' : '#e2e8f0'}` : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <Space>
                    <Text strong>{ruleLabel(key)}</Text>
                    <Tooltip title={t(`projects.hardening.rules.${key}.hint`)} color="#1e293b">
                      <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                    </Tooltip>
                    {renderStateTag(rule)}
                  </Space>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {t(`projects.hardening.rules.${key}.description`)}
                    </Text>
                  </div>
                  {rule?.last_failure && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="danger" style={{ fontSize: 12 }}>
                        {t('projects.hardening.lastFailure', {
                          reason: t(`projects.hardening.reasons.${rule.last_failure.reason}`, {
                            defaultValue: rule.last_failure.reason,
                            version: data.min_version || '2.10.0',
                          }),
                        })}
                      </Text>
                    </div>
                  )}
                </div>
                {rule && renderControl(key, file, rule)}
              </div>
            );
          })}
        </div>
        {/* The one last_result reason that belongs to no rule row. */}
        {(status.last_result?.reason === 'crash_recovered' || status.last_result?.reason === 'rollback_failed') && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t(`projects.hardening.reasons.${status.last_result.reason}`)}
            </Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      title={
        <Space>
          <LockOutlined style={{ color: '#3b82f6' }} />
          <span>{t('projects.hardening.title')}</span>
          <Tooltip title={t('projects.hardening.titleHint')} color="#1e293b">
            <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
          </Tooltip>
        </Space>
      }
      style={{
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 12,
        background: isDark ? '#1e293b' : '#fff',
      }}
    >
      {renderBody()}
    </Card>
  );
}
