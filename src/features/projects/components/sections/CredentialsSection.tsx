/**
 * Credentials Section — Project-scoped credential vault
 *
 * Shows a table of credentials for the current project with:
 * - Search/filter by type
 * - Copy password (reveal)
 * - Add / Edit / Share / Delete
 *
 * Reuses existing CredentialFormModal and ShareCredentialModal.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Typography,
  Space,
  App,
  Popconfirm,
  Tooltip,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  LockOutlined,
  CopyOutlined,
  LinkOutlined,
  ShareAltOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import type { Credential } from '@lsm/types';
import type { ColumnsType } from 'antd/es/table';
import { CredentialFormModal } from '../CredentialFormModal';
import { ShareCredentialModal } from '@/features/vault/components/ShareCredentialModal';
import { useThemeStore } from '@/stores/theme';

const { Text, Title } = Typography;

interface CredentialsSectionProps {
  project: any;
}

export default function CredentialsSection({ project }: CredentialsSectionProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCredential, setEditCredential] = useState<Credential | null>(null);
  const [shareCredential, setShareCredential] = useState<Credential | null>(null);

  /* ── data ─────────────────────────────────────────── */
  const { data: credentials, isLoading, refetch } = useQuery({
    queryKey: ['project-credentials', project.id],
    queryFn: () => api.credentials.listByProject(project.id).then(r => r.data.data || r.data),
  });

  const revealMutation = useMutation({
    mutationFn: (id: number) => api.credentials.reveal(id),
    onSuccess: (response) => {
      const password = response.data.data?.password;
      if (password) {
        navigator.clipboard.writeText(password);
        message.success(t('vault.copied'));
      }
    },
    onError: () => message.error(t('vault.messages.revealError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/credentials/${id}`),
    onSuccess: () => {
      message.success(t('vault.messages.deleted'));
      queryClient.invalidateQueries({ queryKey: ['project-credentials', project.id] });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  /* ── type helpers ─────────────────────────────────── */
  const typeColor = (type: string) => {
    switch (type) {
      case 'ssh': return 'geekblue';
      case 'database': return 'orange';
      case 'wordpress': return 'blue';
      case 'ftp': return 'cyan';
      case 'api': return 'purple';
      case 'email': return 'green';
      case 'hosting': return 'magenta';
      default: return 'default';
    }
  };

  const typeOptions = [
    { label: t('vault.types.all'), value: undefined },
    { label: t('vault.types.wordpress'), value: 'wordpress' },
    { label: t('vault.types.ssh'), value: 'ssh' },
    { label: t('vault.types.ftp'), value: 'ftp' },
    { label: t('vault.types.database'), value: 'database' },
    { label: t('vault.types.hosting'), value: 'hosting' },
    { label: t('vault.types.email'), value: 'email' },
    { label: t('vault.types.api'), value: 'api' },
    { label: t('vault.types.other'), value: 'other' },
  ];

  /* ── filter credentials locally ───────────────────── */
  const filtered = (Array.isArray(credentials) ? credentials : []).filter((c: Credential) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !c.title?.toLowerCase().includes(s) &&
        !c.username?.toLowerCase().includes(s) &&
        !c.type?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  /* ── columns ──────────────────────────────────────── */
  const columns: ColumnsType<Credential> = [
    {
      title: t('vault.table.title'),
      key: 'title',
      render: (_, record) => <Text strong>{record.title}</Text>,
    },
    {
      title: t('vault.table.type'),
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type) => <Tag color={typeColor(type)}>{type?.toUpperCase()}</Tag>,
    },
    {
      title: t('vault.table.username'),
      dataIndex: 'username',
      key: 'username',
      width: 180,
      render: (username) =>
        username ? (
          <Text style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{username}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: t('vault.table.password'),
      key: 'password',
      width: 120,
      render: (_, record) =>
        record.has_password ? (
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => revealMutation.mutate(record.id)}
            loading={revealMutation.isPending && revealMutation.variables === record.id}
          >
            Copy
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>{t('vault.noPassword')}</Text>
        ),
    },
    {
      title: t('vault.table.url'),
      key: 'url',
      width: 80,
      render: (_, record) =>
        record.url ? (
          <a href={record.url} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: 'nowrap' }}>
            <LinkOutlined /> {t('vault.open')}
          </a>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: t('vault.table.actions'),
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('vault.share')}>
            <Button
              type="text"
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => setShareCredential(record)}
              style={{ color: '#8b5cf6' }}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditCredential(record)}
              style={{ color: '#64748b' }}
            />
          </Tooltip>
          <Popconfirm
            title={t('vault.deleteCredential')}
            description={t('vault.deleteConfirm')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('common.delete')}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── render ───────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <LockOutlined style={{ fontSize: 22, color: '#6366f1' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>Credentials</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Secure credentials for {project.name}</Text>
          </div>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
          Add Credential
        </Button>
      </div>

      {/* Table Card */}
      <Card
        style={{ borderRadius: 12, background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Filter bar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
          <Space wrap size={8}>
            <Input
              placeholder={t('vault.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 220, borderRadius: 8 }}
            />
            <Select
              style={{ width: 140 }}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              options={typeOptions}
              placeholder={t('vault.filterByType')}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              type="text"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 700 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No credentials yet"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
                  Add First Credential
                </Button>
              </Empty>
            ),
          }}
          pagination={filtered.length > 10 ? { pageSize: 10 } : false}
        />
      </Card>

      {/* Add / Edit Modal */}
      <CredentialFormModal
        open={addModalOpen || !!editCredential}
        onClose={() => {
          setAddModalOpen(false);
          setEditCredential(null);
          queryClient.invalidateQueries({ queryKey: ['project-credentials', project.id] });
        }}
        projectId={project.id}
        credential={editCredential}
      />

      {/* Share Modal */}
      <ShareCredentialModal
        open={!!shareCredential}
        credential={shareCredential}
        onClose={() => setShareCredential(null)}
      />
    </div>
  );
}
