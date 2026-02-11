import { useState, useEffect } from 'react';
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
  Tooltip
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
  ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiClient } from '@/lib/api';
import type { Credential } from '@lsm/types';
import type { VaultFilters } from '@lsm/api-client';
import type { ColumnsType } from 'antd/es/table';
import { AddCredentialModal } from '../components/AddCredentialModal';
import { ShareCredentialModal } from '../components/ShareCredentialModal';
import { EditCredentialModal } from '../components/EditCredentialModal';

const { Title, Text } = Typography;

/* ── responsive hook ─────────────────────────────── */
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

export function VaultPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const [filters, setFilters] = useState<VaultFilters>({
    page: 1,
    per_page: 20,
    search: '',
    type: undefined,
    sort_by: 'updated_at',
    sort_order: 'desc',
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [shareCredential, setShareCredential] = useState<Credential | null>(null);
  const [editCredential, setEditCredential] = useState<Credential | null>(null);

  /* ── credential type options ─────────────────────── */
  const credentialTypeOptions = [
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

  /* ── queries & mutations ─────────────────────────── */
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vault', filters],
    queryFn: () => api.vault.list(filters).then(r => r.data),
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
    onError: () => {
      message.error(t('vault.messages.revealError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/credentials/${id}`),
    onSuccess: () => {
      message.success(t('vault.messages.deleted'));
      queryClient.invalidateQueries({ queryKey: ['vault'] });
    },
    onError: () => {
      message.error(t('common.deleteError'));
    },
  });

  /* ── type badge color map ────────────────────────── */
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

  /* ── columns ─────────────────────────────────────── */
  const columns: ColumnsType<Credential> = [
    {
      title: t('vault.table.title'),
      key: 'title',
      render: (_, record) => (
        <div>
          <Text strong>{record.title}</Text>
          <div>
            <Link to={`/projects/${record.project_id}`} style={{ fontSize: 12 }}>
              {record.project?.name || 'Unknown Project'}
            </Link>
          </div>
        </div>
      ),
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
            {!isMobile && t('vault.copyPassword').split(' ').pop()}
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
      width: isMobile ? 100 : 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('vault.share')}>
            <Button
              type="text"
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => setShareCredential(record)}
              style={{ color: '#8b5cf6' }}
            >
              {!isMobile && t('vault.share')}
            </Button>
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditCredential(record)}
              style={{ color: '#64748b' }}
            >
              {!isMobile && t('common.edit')}
            </Button>
          </Tooltip>
          <Popconfirm
            title={t('vault.deleteCredential')}
            description={t('vault.deleteConfirm')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('common.delete')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                {!isMobile && t('common.delete')}
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── render ──────────────────────────────────────── */
  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 0,
        marginBottom: 24,
      }}>
        <Space>
          <LockOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>{t('vault.title')}</Title>
            <Text type="secondary">{t('vault.subtitle')}</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalOpen(true)}
          style={isMobile ? { width: '100%' } : undefined}
        >
          {t('vault.addCredential')}
        </Button>
      </div>

      {/* Table with integrated filters */}
      <Card
        className="vault-table-card"
        style={{ borderRadius: 16, background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Filter bar */}
        <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input
                placeholder={t('vault.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                allowClear
                style={{ width: '100%', borderRadius: 8 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Select
                  value={filters.type}
                  onChange={(value) => setFilters(f => ({ ...f, type: value, page: 1 }))}
                  options={credentialTypeOptions}
                  placeholder={t('vault.filterByType')}
                  allowClear
                />
                <Select
                  value={filters.sort_by}
                  onChange={(value) => setFilters(f => ({ ...f, sort_by: value as VaultFilters['sort_by'] }))}
                  options={[
                    { label: t('vault.sort.recentlyUpdated'), value: 'updated_at' },
                    { label: t('vault.sort.title'), value: 'title' },
                    { label: t('vault.sort.project'), value: 'project' },
                  ]}
                />
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                type="text"
                block
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              />
            </div>
          ) : (
            <Space wrap size={8} style={{ width: '100%' }}>
              <Input
                placeholder={t('vault.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                allowClear
                style={{ width: 220, borderRadius: 8 }}
              />
              <Select
                style={{ width: 140 }}
                value={filters.type}
                onChange={(value) => setFilters(f => ({ ...f, type: value, page: 1 }))}
                options={credentialTypeOptions}
                placeholder={t('vault.filterByType')}
                allowClear
              />
              <Select
                style={{ width: 180 }}
                value={filters.sort_by}
                onChange={(value) => setFilters(f => ({ ...f, sort_by: value as VaultFilters['sort_by'] }))}
                options={[
                  { label: t('vault.sort.recentlyUpdated'), value: 'updated_at' },
                  { label: t('vault.sort.title'), value: 'title' },
                  { label: t('vault.sort.project'), value: 'project' },
                ]}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                type="text"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              />
            </Space>
          )}
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: data?.current_page || 1,
            total: data?.total || 0,
            pageSize: filters.per_page,
            onChange: (page) => setFilters(f => ({ ...f, page })),
            showSizeChanger: !isMobile,
            size: isMobile ? 'small' : 'default',
            style: { padding: '0 16px' },
          }}
        />
      </Card>

      <AddCredentialModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ShareCredentialModal
        open={!!shareCredential}
        credential={shareCredential}
        onClose={() => setShareCredential(null)}
      />

      <EditCredentialModal
        open={!!editCredential}
        credential={editCredential}
        onClose={() => setEditCredential(null)}
      />
    </div>
  );
}
