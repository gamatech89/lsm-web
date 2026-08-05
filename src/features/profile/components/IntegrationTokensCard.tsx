/**
 * Lists the current user's integration tokens.
 *
 * "Nie verwendet" is the interesting state, not an empty one: a token that was
 * minted and never used is the one worth cleaning up.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Tag, Button, Typography, Space, Empty, App } from 'antd';
import { ApiOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { IntegrationToken, IntegrationTokenScope } from '@lsm/types';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { CreateTokenModal } from './CreateTokenModal';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

// Maps each scope to the i18n key segment used under integrationTokens.scopeTags,
// plus the antd tag color (not user-visible text, so it stays out of i18n).
const SCOPE_META: Record<IntegrationTokenScope, { key: string; color: string }> = {
  'mcp:read': { key: 'read', color: 'blue' },
  'mcp:write': { key: 'write', color: 'green' },
  'mcp:wp': { key: 'wp', color: 'purple' },
  'mcp:wp-destructive': { key: 'wpDestructive', color: 'red' },
};

export function IntegrationTokensCard() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.integrationTokens.all(),
    queryFn: async () => (await api.integrationTokens.list()).data.data,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => api.integrationTokens.revoke(id),
    onSuccess: () => {
      message.success(t('integrationTokens.toasts.revoked'));
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationTokens.all() });
    },
    onError: () => message.error(t('integrationTokens.toasts.revokeError')),
  });

  const confirmRevoke = (token: IntegrationToken) => {
    modal.confirm({
      title: t('integrationTokens.revokeConfirm.title', { name: token.name }),
      content: t('integrationTokens.revokeConfirm.content'),
      okText: t('integrationTokens.revokeConfirm.okText'),
      okButtonProps: { danger: true },
      cancelText: t('integrationTokens.revokeConfirm.cancelText'),
      onOk: () => revokeMutation.mutateAsync(token.id),
    });
  };

  const columns = [
    {
      title: t('integrationTokens.table.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: IntegrationToken) => (
        <Text delete={row.is_expired} type={row.is_expired ? 'secondary' : undefined}>
          {name}
        </Text>
      ),
    },
    {
      title: t('integrationTokens.table.scopes'),
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: IntegrationTokenScope[]) => (
        <Space size={4} wrap>
          {scopes.map((scope) => (
            <Tag key={scope} color={SCOPE_META[scope]?.color ?? 'default'}>
              {SCOPE_META[scope] ? t(`integrationTokens.scopeTags.${SCOPE_META[scope].key}`) : scope}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('integrationTokens.table.expiry'),
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt: string | null, row: IntegrationToken) => {
        if (expiresAt === null) return <Text type="secondary">{t('integrationTokens.neverExpires')}</Text>;
        if (row.is_expired) return <Tag color="red">{t('integrationTokens.expired')}</Tag>;

        return (
          <Text>
            {t('integrationTokens.expiresIn', { relative: dayjs(expiresAt).fromNow() })}
          </Text>
        );
      },
    },
    {
      title: t('integrationTokens.table.lastUsed'),
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (lastUsedAt: string | null, row: IntegrationToken) =>
        lastUsedAt === null ? (
          <Tag>{t('integrationTokens.neverUsed')}</Tag>
        ) : (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(lastUsedAt).fromNow()}</Text>
            {row.last_used_ip && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.last_used_ip}
              </Text>
            )}
          </Space>
        ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right' as const,
      render: (_: unknown, row: IntegrationToken) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => confirmRevoke(row)}
        >
          {t('integrationTokens.revoke')}
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          <Title level={5} style={{ margin: 0 }}>
            {t('integrationTokens.card.title')}
          </Title>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          {t('integrationTokens.card.createButton')}
        </Button>
      }
      style={{ borderRadius: 12, marginBottom: 24 }}
    >
      <Text type="secondary">{t('integrationTokens.card.description')}</Text>
      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
        {t('integrationTokens.card.revokeAllNotice')}
      </Text>

      <Table<IntegrationToken>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={false}
        style={{ marginTop: 16 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('integrationTokens.empty')}
            />
          ),
        }}
      />

      <CreateTokenModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Card>
  );
}
