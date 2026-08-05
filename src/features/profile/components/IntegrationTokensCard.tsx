/**
 * Lists the current user's integration tokens.
 *
 * "Nie verwendet" is the interesting state, not an empty one: a token that was
 * minted and never used is the one worth cleaning up.
 */

import { useState } from 'react';
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

const SCOPE_LABELS: Record<IntegrationTokenScope, { label: string; color: string }> = {
  'mcp:read': { label: 'Lesen', color: 'blue' },
  'mcp:write': { label: 'Schreiben', color: 'green' },
  'mcp:wp': { label: 'WordPress', color: 'purple' },
  'mcp:wp-destructive': { label: 'WP kritisch', color: 'red' },
};

export function IntegrationTokensCard() {
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
      message.success('Token widerrufen');
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationTokens.all() });
    },
    onError: () => message.error('Token konnte nicht widerrufen werden'),
  });

  const confirmRevoke = (token: IntegrationToken) => {
    modal.confirm({
      title: `Token „${token.name}“ widerrufen?`,
      content:
        'Jeder Client, der diesen Token verwendet, verliert sofort den Zugriff. Das lässt sich nicht rückgängig machen.',
      okText: 'Widerrufen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: () => revokeMutation.mutateAsync(token.id),
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: IntegrationToken) => (
        <Text delete={row.is_expired} type={row.is_expired ? 'secondary' : undefined}>
          {name}
        </Text>
      ),
    },
    {
      title: 'Berechtigungen',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: IntegrationTokenScope[]) => (
        <Space size={4} wrap>
          {scopes.map((scope) => (
            <Tag key={scope} color={SCOPE_LABELS[scope]?.color ?? 'default'}>
              {SCOPE_LABELS[scope]?.label ?? scope}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Gültigkeit',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (expiresAt: string | null, row: IntegrationToken) => {
        if (expiresAt === null) return <Text type="secondary">Läuft nie ab</Text>;
        if (row.is_expired) return <Tag color="red">Abgelaufen</Tag>;

        return <Text>läuft {dayjs(expiresAt).fromNow()} ab</Text>;
      },
    },
    {
      title: 'Zuletzt verwendet',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (lastUsedAt: string | null, row: IntegrationToken) =>
        lastUsedAt === null ? (
          <Tag>Nie verwendet</Tag>
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
          Widerrufen
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
            API &amp; Integrationen
          </Title>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Token erstellen
        </Button>
      }
      style={{ borderRadius: 12, marginBottom: 24 }}
    >
      <Text type="secondary">
        Langlebige Tokens für KI-Clients über MCP. Jeder Token gilt nur für die gewählten
        Berechtigungen — und nie für mehr, als deine Rolle ohnehin darf.
      </Text>
      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
        Mit „Überall abmelden" werden auch alle deine Integrations-Tokens widerrufen.
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
              description="Noch keine Integrations-Tokens"
            />
          ),
        }}
      />

      <CreateTokenModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Card>
  );
}
