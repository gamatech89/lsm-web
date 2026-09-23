/**
 * Server hardening (.htaccess) card
 *
 * Three rules the LSM plugin writes into wp-content/.htaccess and
 * uploads/.htaccess. Everything shown here is the server's view: a switch
 * follows the state the plugin read from the file, never the click, and what
 * the user may do comes from the API's `can`, never from their role.
 */

import { Alert, Button, Card, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { useHardening } from '../hooks/useHardening';
import type { HardeningRuleKey, HardeningRuleState, HardeningRuleStatus } from '@/lib/lsm-api';

const { Text } = Typography;

interface HardeningCardProps {
  project: { id: number; has_health_check_secret?: boolean };
}

const RULES: HardeningRuleKey[] = ['block_archives', 'block_debug_log', 'block_uploads_php'];

const STATE_COLOR: Record<HardeningRuleState, string> = {
  on: 'success',
  off: 'default',
  paused: 'warning',
  manual: 'blue',
  drift: 'orange',
  unsupported: 'default',
};

export function HardeningCard({ project }: HardeningCardProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const hasLsmConnection = !!project.has_health_check_secret;

  const { query } = useHardening(project.id, hasLsmConnection);
  const { data, isLoading, isError, refetch } = query;
  const status = data?.status ?? null;

  const ruleLabel = (rule: HardeningRuleKey) => t(`projects.hardening.rules.${rule}.label`);

  const renderStateTag = (rule: HardeningRuleStatus) => {
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

    if (data.plugin_outdated || !data.reachable || !status) {
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
          {RULES.map((key, index) => {
            const rule = status.rules[key];
            if (!rule) return null;
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
                  {rule.last_failure && (
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
