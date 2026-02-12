/**
 * Projects Page - Polished
 * 
 * Features:
 * - Stats Cards (Down, Hacked/At Risk, Monitoring, Total)
 * - Enhanced filters in single row
 * - Rich table with inline status editing
 * - PM vs Developer color distinction
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Tooltip,
  App,
  Avatar,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  FolderOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  HeartOutlined,
  SafetyOutlined,
  RightOutlined,
  MenuOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  extractDomain,
} from '@lsm/utils';
import { ProjectFormModal } from '../components/ProjectFormModal';
import type { Project, ProjectFilters } from '@lsm/types';
import type { ColumnsType } from 'antd/es/table';
import { useThemeStore } from '@/stores/theme';

const { Title, Text } = Typography;

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { t } = useTranslation();
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    per_page: 15,
    search: '',
    health: 'all',
    security: 'all',
  });

  // Fetch projects
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => api.projects.list(filters).then(r => r.data),
  });

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['projects', 'stats'],
    queryFn: () => api.projects.getStats().then(r => r.data.data),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['projects', 'filter-options'],
    queryFn: () => api.projects.getFilterOptions().then(r => r.data.data),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Capture user_id from URL on first render (before searchParams changes)
  const initialUserIdRef = useRef(searchParams.get('user_id'));

  // Resolve user_id URL param → apply the correct manager/developer filter
  useEffect(() => {
    const userId = initialUserIdRef.current;
    if (!userId || !filterOptions) return;

    const uid = Number(userId);
    const isManager = filterOptions.managers?.some((m: any) => m.id === uid);
    const isDeveloper = filterOptions.developers?.some((d: any) => d.id === uid);

    if (isManager) {
      setFilters(f => ({ ...f, manager_id: uid, page: 1 }));
    } else if (isDeveloper) {
      setFilters(f => ({ ...f, developer_id: uid, page: 1 }));
    }

    // Mark as processed and clean up URL
    initialUserIdRef.current = null;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('user_id');
    setSearchParams(newParams, { replace: true });
  }, [filterOptions]);

  // Update project mutation (for inline status changes)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.projects.update(id, data),
    onSuccess: () => {
      message.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      message.error('Failed to update status');
    },
  });

  // Health/Security options for inline editing
  const healthOptions = [
    { label: `● ${t('projects.health.online')}`, value: 'online', color: '#10b981' },
    { label: `● ${t('projects.health.down_error')}`, value: 'down_error', color: '#ef4444' },
    { label: `● ${t('projects.health.maintenance')}`, value: 'updating', color: '#f59e0b' },
  ];

  const securityOptions = [
    { label: `● ${t('projects.security.secure')}`, value: 'secure', color: '#10b981' },
    { label: `● ${t('projects.security.monitoring')}`, value: 'monitoring', color: '#f59e0b' },
    { label: `● ${t('projects.security.compromised')}`, value: 'compromised', color: '#f97316' },
    { label: `● ${t('projects.security.hacked')}`, value: 'hacked', color: '#ef4444' },
  ];

  // Table columns - Professional layout
  const columns: ColumnsType<Project> = [
    {
      title: t('projects.table.project'),
      key: 'name',
      width: 260,
      render: (_, record) => {
        const isConnected = !!(record as any).health_check_secret;
        return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tooltip title={isConnected ? 'Plugin connected' : 'No plugin'}>
            <div style={{ 
              position: 'relative',
              flexShrink: 0,
              borderRadius: '50%',
              padding: isConnected ? 2 : 0,
              background: isConnected ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : 'transparent',
              boxShadow: isConnected ? '0 0 10px rgba(139, 92, 246, 0.35)' : 'none',
            }}>
              <Avatar 
                style={{ 
                  background: isConnected ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : (isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'),
                  color: isConnected ? '#fff' : '#8b5cf6',
                  fontSize: 13,
                  fontWeight: 600,
                  border: isConnected ? `2px solid ${isDark ? '#1e293b' : '#fff'}` : 'none',
                }}
                size={isConnected ? 32 : 36}
              >
                {record.name.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          </Tooltip>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ display: 'block', color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 13.5, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {record.name}
            </Text>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              {record.url && (
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  {extractDomain(record.url)}
                </Text>
              )}
              {(record.project_external_id || (record as any).maintenance_id) && (
                <Text type="secondary" style={{ fontSize: 10.5, opacity: 0.6 }}>
                  {[record.project_external_id, (record as any).maintenance_id].filter(Boolean).join(' · ')}
                </Text>
              )}
            </div>
          </div>
        </div>
        );
      },
    },
    {
      title: t('projects.table.team'),
      key: 'team',
      width: 180,
      render: (_, record) => {
        const pms = record.managers || (record.manager ? [record.manager] : []);
        const devs = record.developers || [];
        
        if (pms.length === 0 && devs.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12, opacity: 0.5 }}>—</Text>;
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pms.length > 0 && (
              <Avatar.Group
                max={{ count: 2, style: { backgroundColor: '#8b5cf6', fontSize: 10, width: 24, height: 24 } }}
                size={24}
              >
                {pms.map((pm: any, idx: number) => (
                  <Tooltip key={idx} title={`${pm.name} (PM)`}>
                    <Avatar
                      size={24}
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#8b5cf6',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {pm.name.split(' ')[0][0]}{pm.name.split(' ')[1]?.[0] || ''}
                    </Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            )}
            {devs.length > 0 && (
              <Avatar.Group
                max={{ count: 2, style: { backgroundColor: '#06b6d4', fontSize: 10, width: 24, height: 24 } }}
                size={24}
              >
                {devs.map((dev: any, idx: number) => (
                  <Tooltip key={idx} title={`${dev.name} (Dev)`}>
                    <Avatar
                      size={24}
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#06b6d4',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {dev.name.split(' ')[0][0]}{dev.name.split(' ')[1]?.[0] || ''}
                    </Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            )}
          </div>
        );
      },
    },
    {
      title: t('projects.table.todos'),
      key: 'todos',
      width: 70,
      align: 'center',
      render: (_, record) => {
        const count = record.pending_todos_count || 0;
        const bg = count === 0 
          ? (isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(203, 213, 225, 0.3)')
          : count < 5 
            ? 'rgba(245, 158, 11, 0.12)'
            : 'rgba(239, 68, 68, 0.12)';
        const color = count === 0 ? (isDark ? '#64748b' : '#94a3b8') : count < 5 ? '#d97706' : '#dc2626';
        return (
          <span style={{ 
            display: 'inline-block',
            minWidth: 28,
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            background: bg,
            color,
          }}>
            {count}
          </span>
        );
      },
    },
    {
      title: t('projects.table.tags'),
      key: 'tags',
      width: 130,
      render: (_: unknown, record: Project) => {
        const projectTags = (record as any).tags || [];
        if (projectTags.length === 0) return <Text type="secondary" style={{ fontSize: 11, opacity: 0.4 }}>—</Text>;
        return (
          <Space size={4} wrap>
            {projectTags.slice(0, 2).map((tag: any) => (
              <Tag key={tag.id} color={tag.color || 'default'} style={{ margin: 0, fontSize: 11, borderRadius: 6 }}>
                {tag.name}
              </Tag>
            ))}
            {projectTags.length > 2 && (
              <Tooltip title={projectTags.slice(2).map((t: any) => t.name).join(', ')}>
                <Tag style={{ margin: 0, fontSize: 11, borderRadius: 6 }}>+{projectTags.length - 2}</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },

    {
      title: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HeartOutlined style={{ fontSize: 12 }} /> {t('projects.table.health')}</span>,
      key: 'health',
      width: 130,
      render: (_, record) => (
          <Select
            size="small"
            value={record.health_status}
            style={{ width: '100%' }}
            variant="borderless"
            onChange={(value) => {
              updateMutation.mutate({ id: record.id, data: { health_status: value } });
            }}
            onClick={(e) => e.stopPropagation()}
            options={healthOptions.map(o => ({
              label: <span style={{ color: o.color, fontSize: 12.5 }}>{o.label}</span>,
              value: o.value,
            }))}
            dropdownStyle={{ minWidth: 120 }}
          />
        ),
    },
    {
      title: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SafetyOutlined style={{ fontSize: 12 }} /> {t('projects.table.security')}</span>,
      key: 'security',
      width: 150,
      render: (_, record) => {
        const secStyles: Record<string, { bg: string; color: string; border: string }> = {
          secure: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
          monitoring: { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
          compromised: { bg: 'rgba(249, 115, 22, 0.1)', color: '#ea580c', border: 'rgba(249, 115, 22, 0.25)' },
          hacked: { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
        };
        const s = secStyles[record.security_status] || secStyles.secure;
        const secLabel = securityOptions.find(o => o.value === record.security_status)?.label || record.security_status;
        return (
          <Select
            size="small"
            value={record.security_status}
            style={{ width: '100%' }}
            variant="borderless"
            onChange={(value) => {
              updateMutation.mutate({ id: record.id, data: { security_status: value } });
            }}
            onClick={(e) => e.stopPropagation()}
            labelRender={() => (
              <span style={{
                display: 'inline-block',
                padding: '1px 10px',
                borderRadius: 10,
                fontSize: 11.5,
                fontWeight: 600,
                background: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
              }}>
                {secLabel.replace('● ', '')}
              </span>
            )}
            options={securityOptions.map(o => ({
              label: <span style={{ color: o.color, fontSize: 12.5 }}>{o.label}</span>,
              value: o.value,
            }))}
            dropdownStyle={{ minWidth: 140 }}
          />
        );
      },
    },
    {
      title: '',
      key: 'arrow',
      width: 36,
      fixed: 'right',
      render: () => (
        <RightOutlined className="row-arrow" style={{ fontSize: 11, color: isDark ? '#475569' : '#cbd5e1', transition: 'all 0.2s' }} />
      ),
    },
  ];

  // Calculate additional stats
  const downCount = data?.data?.filter((p: Project) => p.health_status === 'down_error').length || 0;
  const hackedCount = data?.data?.filter((p: Project) => p.security_status === 'hacked').length || 0;
  const compromisedCount = data?.data?.filter((p: Project) => p.security_status === 'compromised').length || 0;
  const monitoringCount = data?.data?.filter((p: Project) => p.security_status === 'monitoring').length || 0;

  // Responsive - simple matchMedia hook
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
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');

  return (
    <div className="page-container">
      {/* Header Row with Title + Stats + Button */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 16,
        marginBottom: 20,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center', 
            gap: isMobile ? 10 : 24,
          }}>
            <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap', fontSize: isMobile ? 18 : undefined }}>
              <FolderOutlined style={{ marginRight: 8 }} />
              {t('projects.title')}
              <Text type="secondary" style={{ marginLeft: 12, fontSize: isMobile ? 12 : 14, fontWeight: 400 }}>
                {stats?.total || 0} {t('common.total')}
              </Text>
            </Title>
            {/* Stats pills - hide on mobile, wrap on tablet */}
            {!isMobile && (
              <Space size={8} wrap>
              <Tooltip title={t('projects.stats.downTooltip')}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  background: downCount > 0 
                    ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                    : (isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)'),
                  color: downCount > 0 ? '#ef4444' : (isDark ? '#64748b' : '#94a3b8'),
                  border: `1px solid ${downCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                }}>
                  <CloseCircleOutlined style={{ fontSize: 12 }} />
                  <span>{downCount}</span>
                  <span style={{ opacity: 0.8 }}>{t('projects.stats.down')}</span>
                </div>
              </Tooltip>
              <Tooltip title={t('projects.stats.hackedTooltip')}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background: hackedCount > 0 
                    ? (isDark ? 'rgba(220, 38, 38, 0.25)' : 'rgba(220, 38, 38, 0.15)')
                    : (isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)'),
                  color: hackedCount > 0 ? '#dc2626' : (isDark ? '#64748b' : '#94a3b8'),
                  border: `1px solid ${hackedCount > 0 ? 'rgba(220, 38, 38, 0.5)' : 'transparent'}`,
                  boxShadow: hackedCount > 0 ? '0 0 12px rgba(220, 38, 38, 0.3)' : 'none',
                }}>
                  <LockOutlined style={{ fontSize: 12 }} />
                  <span>{hackedCount}</span>
                  <span style={{ opacity: 0.9 }}>{t('projects.stats.hacked')}</span>
                </div>
              </Tooltip>
              <Tooltip title={t('projects.stats.atRiskTooltip')}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  background: compromisedCount > 0 
                    ? (isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)')
                    : (isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)'),
                  color: compromisedCount > 0 ? '#f97316' : (isDark ? '#64748b' : '#94a3b8'),
                  border: `1px solid ${compromisedCount > 0 ? 'rgba(249, 115, 22, 0.3)' : 'transparent'}`,
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: 12 }} />
                  <span>{compromisedCount}</span>
                  <span style={{ opacity: 0.8 }}>{t('projects.stats.atRisk')}</span>
                </div>
              </Tooltip>
              <Tooltip title={t('projects.stats.monitoringTooltip')}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  background: monitoringCount > 0 
                    ? (isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.1)')
                    : (isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)'),
                  color: monitoringCount > 0 ? '#eab308' : (isDark ? '#64748b' : '#94a3b8'),
                  border: `1px solid ${monitoringCount > 0 ? 'rgba(234, 179, 8, 0.3)' : 'transparent'}`,
                }}>
                  <WarningOutlined style={{ fontSize: 12 }} />
                  <span>{monitoringCount}</span>
                  <span style={{ opacity: 0.8 }}>{t('projects.stats.monitoring')}</span>
                </div>
              </Tooltip>
              </Space>
            )}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
          style={isMobile ? { width: '100%' } : undefined}
        >
          {t('projects.newProject')}
        </Button>
      </div>

      {/* Create Modal */}
      <ProjectFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Table with integrated filters */}
      <Card 
        className="projects-table-card"
        style={{ borderRadius: 16, background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none' }} 
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input
                placeholder={t('common.search')}
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                allowClear
                style={{ width: '100%', borderRadius: 8 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Select
                  value={filters.health}
                  onChange={(value) => setFilters(f => ({ ...f, health: value, page: 1 }))}
                  options={[
                    { label: t('projects.filters.allHealth'), value: 'all' },
                    { label: t('projects.health.online'), value: 'online' },
                    { label: t('projects.health.down_error'), value: 'down_error' },
                    { label: t('projects.health.maintenance'), value: 'updating' },
                  ]}
                />
                <Select
                  value={filters.security}
                  onChange={(value) => setFilters(f => ({ ...f, security: value, page: 1 }))}
                  options={[
                    { label: t('projects.filters.allSecurity'), value: 'all' },
                    { label: t('projects.security.secure'), value: 'secure' },
                    { label: t('projects.security.monitoring'), value: 'monitoring' },
                    { label: t('projects.stats.atRisk'), value: 'compromised' },
                    { label: t('projects.stats.hacked'), value: 'hacked' },
                  ]}
                />
                {filterOptions?.managers && (
                  <Select
                    value={filters.manager_id}
                    onChange={(value) => setFilters(f => ({ ...f, manager_id: value, page: 1 }))}
                    options={[
                      { label: t('projects.filters.allManagers'), value: undefined },
                      ...filterOptions.managers.map((m: any) => ({ label: m.name, value: m.id })),
                    ]}
                    placeholder={t('projects.form.manager')}
                    allowClear
                  />
                )}
                {filterOptions?.developers && (
                  <Select
                    value={filters.developer_id}
                    onChange={(value) => setFilters(f => ({ ...f, developer_id: value, page: 1 }))}
                    options={[
                      { label: t('projects.filters.allDevelopers'), value: undefined },
                      ...filterOptions.developers.map((d: any) => ({ label: d.name, value: d.id })),
                    ]}
                    placeholder={t('projects.form.developer')}
                    allowClear
                  />
                )}
                {filterOptions?.tags && filterOptions.tags.length > 0 && (
                  <Select
                    value={(filters as any).tag || undefined}
                    onChange={(value) => setFilters(f => ({ ...f, tag: value || undefined, page: 1 }))}
                    options={[
                      { label: t('projects.filters.allTags'), value: '' },
                      ...filterOptions.tags.map((t: any) => ({ 
                        label: <Tag color={t.color || 'default'}>{t.name}</Tag>, 
                        value: t.slug 
                      })),
                    ]}
                    placeholder="Tag"
                    allowClear
                  />
                )}
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { refetch(); refetchStats(); }}
                type="text"
                block
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              />
            </div>
          ) : (
            <Space wrap size={8} style={{ width: '100%' }}>
              <Input
                placeholder={t('common.search')}
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                allowClear
                style={{ width: 200, borderRadius: 8 }}
              />
              <Select
                style={{ width: 120 }}
                value={filters.health}
                onChange={(value) => setFilters(f => ({ ...f, health: value, page: 1 }))}
                options={[
                  { label: t('projects.filters.allHealth'), value: 'all' },
                  { label: t('projects.health.online'), value: 'online' },
                  { label: t('projects.health.down_error'), value: 'down_error' },
                  { label: t('projects.health.maintenance'), value: 'updating' },
                ]}
              />
              <Select
                style={{ width: 130 }}
                value={filters.security}
                onChange={(value) => setFilters(f => ({ ...f, security: value, page: 1 }))}
                options={[
                  { label: t('projects.filters.allSecurity'), value: 'all' },
                  { label: t('projects.security.secure'), value: 'secure' },
                  { label: t('projects.security.monitoring'), value: 'monitoring' },
                  { label: t('projects.stats.atRisk'), value: 'compromised' },
                  { label: t('projects.stats.hacked'), value: 'hacked' },
                ]}
              />
              {filterOptions?.managers && (
                <Select
                  style={{ width: 150 }}
                  value={filters.manager_id}
                  onChange={(value) => setFilters(f => ({ ...f, manager_id: value, page: 1 }))}
                  options={[
                    { label: t('projects.filters.allManagers'), value: undefined },
                    ...filterOptions.managers.map((m: any) => ({ label: m.name, value: m.id })),
                  ]}
                  placeholder={t('projects.form.manager')}
                  allowClear
                />
              )}
              {filterOptions?.developers && (
                <Select
                  style={{ width: 150 }}
                  value={filters.developer_id}
                  onChange={(value) => setFilters(f => ({ ...f, developer_id: value, page: 1 }))}
                  options={[
                    { label: t('projects.filters.allDevelopers'), value: undefined },
                    ...filterOptions.developers.map((d: any) => ({ label: d.name, value: d.id })),
                  ]}
                  placeholder={t('projects.form.developer')}
                  allowClear
                />
              )}
              {filterOptions?.tags && filterOptions.tags.length > 0 && (
                <Select
                  style={{ width: 140 }}
                  value={(filters as any).tag || undefined}
                  onChange={(value) => setFilters(f => ({ ...f, tag: value || undefined, page: 1 }))}
                  options={[
                    { label: t('projects.filters.allTags'), value: '' },
                    ...filterOptions.tags.map((t: any) => ({ 
                      label: <Tag color={t.color || 'default'}>{t.name}</Tag>, 
                      value: t.slug 
                    })),
                  ]}
                  placeholder="Tag"
                  allowClear
                />
              )}
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => { refetch(); refetchStats(); }}
                type="text"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              />
            </Space>
          )}
        </div>

        {/* Table */}
        <Table
          className="projects-pro-table"
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: data?.current_page || 1,
            total: data?.total || 0,
            pageSize: filters.per_page,
            onChange: (page, pageSize) => setFilters(f => ({ ...f, page, per_page: pageSize })),
            showSizeChanger: !isMobile,
            pageSizeOptions: ['15', '30', '50', '100'],
            showTotal: isMobile ? undefined : (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total}`,
            size: isMobile ? 'small' : 'default',
            style: { padding: '12px 16px', margin: 0 },
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/projects/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 950 }}
          size="small"
        />
      </Card>

      {/* Table hover styles */}
      <style>{`
        .projects-pro-table .ant-table-thead > tr > th {
          background: ${isDark ? 'rgba(255,255,255,0.02)' : '#fafbfc'} !important;
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${isDark ? '#64748b' : '#94a3b8'} !important;
          padding: 10px 12px !important;
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'} !important;
        }
        .projects-pro-table .ant-table-tbody > tr > td {
          padding: 10px 12px !important;
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'} !important;
          transition: all 0.15s ease;
        }
        .projects-pro-table .ant-table-tbody > tr:hover > td {
          background: ${isDark ? 'rgba(139, 92, 246, 0.06)' : 'rgba(139, 92, 246, 0.03)'} !important;
        }
        .projects-pro-table .ant-table-tbody > tr:hover > td:first-child {
          box-shadow: inset 3px 0 0 #8b5cf6;
        }
        .projects-pro-table .ant-table-tbody > tr:hover .row-arrow {
          color: #8b5cf6 !important;
          transform: translateX(2px);
        }
        .projects-pro-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
