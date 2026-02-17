/**
 * Plugins Section - Simplified Plugin Management
 * 
 * Features:
 * - Plugin table with name, version, and update status
 * - Active toggle (activate/deactivate)
 * - Auto-update toggle (enable/disable auto-updates)
 * - Update button with version info
 * - Bulk selection and actions
 * - Search functionality
 */

import { useState, useMemo } from 'react';
import {
  Table,
  Typography,
  Switch,
  Button,
  Input,
  Space,
  Tooltip,
  Empty,
  Alert,
  Badge,
  Dropdown,
  Popconfirm,
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  DownOutlined,
  ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Text, Title } = Typography;

interface Plugin {
  slug: string;
  name: string;
  version: string;
  new_version?: string;
  update_available: boolean;
  is_active: boolean;
  auto_update: boolean;
  vulnerability?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    link?: string;
  };
}

interface PluginsSectionProps {
  project: any;
}


export default function PluginsSection({ project }: PluginsSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Check if WordPress is connected
  const hasLsmConnection = !!project.health_check_secret;

  // Fetch all plugins
  const { data: pluginsData, isLoading: pluginsLoading, refetch } = useQuery({
    queryKey: ['project-plugins', project.id],
    queryFn: () => api.lsm.getPlugins(project.id).then(r => r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Fetch updates data for available plugin updates
  const { data: updatesData, isLoading: updatesLoading } = useQuery({
    queryKey: ['project-updates', project.id],
    queryFn: () => api.lsm.getUpdates(project.id).then(r => r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  const isLoading = pluginsLoading || updatesLoading;

  // Transform API data into Plugin format
  const plugins: Plugin[] = useMemo(() => {
    // Handle nested response
    const pluginList = (pluginsData as any)?.data || pluginsData || [];
    const updates = (updatesData as any)?.data || updatesData;
    const pluginUpdates = updates?.plugins || [];
    
    console.log('🔍 [PLUGINS DEBUG] Raw pluginsData:', pluginsData);
    console.log('🔍 [PLUGINS DEBUG] Raw updatesData:', updatesData);
    console.log('🔍 [PLUGINS DEBUG] Parsed pluginList:', pluginList);
    console.log('🔍 [PLUGINS DEBUG] Parsed pluginUpdates:', pluginUpdates);
    
    // Create a map of update info by slug as fallback
    const updateMap = new Map<string, any>();
    for (const u of pluginUpdates) {
      const slug = u.slug || u.plugin?.replace(/^.*\/|\.php$/g, '') || u.file?.replace(/^.*\/|\.php$/g, '');
      console.log('🔍 [UPDATE MAP] Processing update:', { u, computed_slug: slug });
      if (slug) updateMap.set(slug, u);
    }
    console.log('🔍 [UPDATE MAP] Final updateMap:', Array.from(updateMap.entries()));

    // If pluginList is an array, use it; otherwise check if it has a plugins key
    const rawPlugins = Array.isArray(pluginList) ? pluginList : (pluginList?.plugins || []);
    console.log('🔍 [PLUGINS DEBUG] rawPlugins count:', rawPlugins.length);
    
    if (rawPlugins.length === 0) {
      console.log('⚠️ [PLUGINS DEBUG] NO PLUGINS - Using fallback to updates-only');
      // Fallback to updates-only if no plugins endpoint
      return pluginUpdates.map((p: any) => {
        const slug = p.slug || p.plugin?.replace(/^.*\/|\.php$/g, '') || p.file?.replace(/^.*\/|\.php$/g, '') || 'unknown';
        console.log('🔍 [FALLBACK] Processing:', { p, computed_slug: slug });
        return {
          slug,
          name: p.name || p.plugin?.split('/')[0]?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || p.slug || 'Unknown Plugin',
          version: p.current || p.current_version || p.version || '?',
          new_version: p.new_version,
          update_available: !!p.new_version,
          is_active: true,
          auto_update: false,
          vulnerability: undefined,
        };
      });
    }
    
    // Build plugin list from all plugins
    // PREFER the plugin's own update_available field (from /plugins endpoint)
    // Only fall back to updates map if the plugin doesn't have that info
    return rawPlugins.map((p: any) => {
      const slug = p.slug || p.plugin?.replace(/^.*\/|\.php$/g, '') || 'unknown';
      const updateInfo = updateMap.get(slug);
      
      console.log('🔍 [PLUGIN MAPPING] Processing:', {
        raw_plugin: p,
        computed_slug: slug,
        has_p_slug: !!p.slug,
        has_p_plugin: !!p.plugin,
        updateInfo: updateInfo,
      });
      
      // Plugin's own fields take priority
      const hasUpdate = p.update_available ?? !!updateInfo?.new_version;
      const newVersion = p.new_version || updateInfo?.new_version;
      
      return {
        slug,
        name: p.name || p.Name || p.plugin?.split('/')[0]?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || slug || 'Unknown Plugin',
        version: p.version ?? p.Version ?? '?',
        new_version: newVersion,
        update_available: hasUpdate,
        is_active: p.active ?? p.is_active ?? true,
        auto_update: p.auto_update ?? false,
        vulnerability: undefined,
      };
    });
  }, [pluginsData, updatesData]);

  // Compute stats for display
  const stats = useMemo(() => {
    const active = plugins.filter(p => p.is_active).length;
    const inactive = plugins.filter(p => !p.is_active).length;
    const outdated = plugins.filter(p => p.update_available).length;
    return { total: plugins.length, active, inactive, outdated };
  }, [plugins]);

  // Filter plugins by search
  const filteredPlugins = useMemo(() => {
    if (!searchTerm) return plugins;
    const term = searchTerm.toLowerCase();
    return plugins.filter(
      (p: Plugin) =>
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term)
    );
  }, [plugins, searchTerm]);

  // Update plugin mutation - REAL API
  const updatePluginMutation = useMutation({
    mutationFn: async (pluginSlug: string) => {
      return api.lsm.updatePlugin(project.id, pluginSlug).then(r => r.data);
    },
    onSuccess: () => {
      message.success('Plugin updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-updates', project.id] });
    },
    onError: (error: any) => message.error(error?.response?.data?.error || 'Failed to update plugin'),
  });

  // Toggle active mutation - REAL API
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ slug, active }: { slug: string; active: boolean }) => {
      if (active) {
        return api.lsm.activatePlugin(project.id, slug).then(r => r.data);
      } else {
        return api.lsm.deactivatePlugin(project.id, slug).then(r => r.data);
      }
    },
    onSuccess: (data, variables) => {
      message.success(`Plugin ${variables.active ? 'activated' : 'deactivated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
    },
    onError: (error: any, variables) => {
      // Check for protected plugin error
      if (error?.response?.status === 403) {
        message.error('Cannot deactivate this plugin - it would break the remote connection');
      } else {
        message.error(error?.response?.data?.error || `Failed to ${variables.active ? 'activate' : 'deactivate'} plugin`);
      }
    },
  });

  // Toggle auto-update mutation - Note: This would require a new backend endpoint
  const toggleAutoUpdateMutation = useMutation({
    mutationFn: async ({ slug, enabled }: { slug: string; enabled: boolean }) => {
      message.info('Auto-update toggle coming soon');
      return { success: false };
    },
  });

  // Delete plugin mutation - REAL API
  const deletePluginMutation = useMutation({
    mutationFn: async (pluginSlug: string) => {
      return api.lsm.deletePlugin(project.id, pluginSlug).then(r => r.data);
    },
    onSuccess: (_, pluginSlug) => {
      message.success('Plugin deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
      queryClient.invalidateQueries({ queryKey: ['lsm-health', project.id] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || 'Failed to delete plugin';
      message.error(errorMsg);
    },
  });

  // Update ALL plugins mutation - REAL API
  const updateAllPluginsMutation = useMutation({
    mutationFn: async () => {
      return api.lsm.updateAllPlugins(project.id).then(r => r.data);
    },
    onSuccess: () => {
      message.success('All plugins updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-updates', project.id] });
    },
    onError: (error: any) => message.error(error?.response?.data?.error || 'Failed to update plugins'),
  });

  // Bulk actions
  const bulkActions: MenuProps['items'] = [
    {
      key: 'update',
      label: 'Update Selected',
      icon: <SyncOutlined />,
      onClick: () => message.info(`Updating ${selectedRowKeys.length} plugins...`),
    },
    {
      key: 'activate',
      label: 'Activate Selected',
      onClick: () => message.info(`Activating ${selectedRowKeys.length} plugins...`),
    },
    {
      key: 'deactivate',
      label: 'Deactivate Selected',
      onClick: () => message.info(`Deactivating ${selectedRowKeys.length} plugins...`),
    },
    {
      key: 'enable-autoupdate',
      label: 'Enable Auto-update',
      onClick: () => message.info(`Enabling auto-update for ${selectedRowKeys.length} plugins...`),
    },
    {
      key: 'disable-autoupdate',
      label: 'Disable Auto-update',
      onClick: () => message.info(`Disabling auto-update for ${selectedRowKeys.length} plugins...`),
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: 'Delete Selected',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => message.warning(`Delete ${selectedRowKeys.length} plugins...`),
    },
  ];

  // Table columns - simplified view
  const columns: ColumnsType<Plugin> = [
    {
      title: 'Installed plugin',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Plugin) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              v{record.version}
              {record.update_available && record.new_version && (
                <span style={{ color: '#667eea', marginLeft: 8 }}>
                  → v{record.new_version}
                </span>
              )}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Active',
      key: 'active',
      width: 80,
      align: 'center',
      render: (_, record: Plugin) => (
        <Switch
          checked={record.is_active}
          loading={toggleActiveMutation.isPending}
          onChange={(checked) =>
            toggleActiveMutation.mutate({ slug: record.slug, active: checked })
          }
          size="small"
        />
      ),
    },
    {
      title: (
        <Tooltip title="Automatically update plugins when new versions are released">
          <span>Auto-update</span>
        </Tooltip>
      ),
      key: 'auto_update',
      width: 100,
      align: 'center',
      render: (_, record: Plugin) => (
        <Switch
          checked={record.auto_update}
          loading={toggleAutoUpdateMutation.isPending}
          onChange={(checked) =>
            toggleAutoUpdateMutation.mutate({ slug: record.slug, enabled: checked })
          }
          size="small"
          disabled={!record.is_active}
        />
      ),
    },
    {
      title: 'Update',
      key: 'update',
      width: 180,
      align: 'center',
      render: (_, record: Plugin) => {
        if (!record.update_available) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 4 }} />
              Up to date
            </Text>
          );
        }
        return (
          <Tooltip title={`Update from ${record.version} to ${record.new_version}`}>
            <Button
              type="primary"
              size="small"
              icon={<SyncOutlined />}
              loading={updatePluginMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🚀 [UPDATE CLICK] Updating plugin:', {
                  record,
                  slug: record.slug,
                  name: record.name,
                });
                updatePluginMutation.mutate(record.slug);
              }}
              style={{ 
                borderRadius: 6,
                background: record.vulnerability 
                  ? '#ef4444' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              {record.new_version}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'right',
      render: (_, record: Plugin) => (
        <Popconfirm
          title="Delete plugin?"
          description="This will permanently remove the plugin from your site."
          onConfirm={() => deletePluginMutation.mutate(record.slug)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            loading={deletePluginMutation.isPending}
          />
        </Popconfirm>
      ),
    },
  ];

  // Show empty state if not connected
  if (!hasLsmConnection) {
    return (
      <Empty
        image={<AppstoreOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={
          <Text type="secondary">
            Connect WordPress to manage plugins remotely
          </Text>
        }
      />
    );
  }

  // Count updates available and vulnerabilities
  const updatesCount = plugins.filter((p: Plugin) => p.update_available).length;
  const vulnerabilitiesCount = plugins.filter((p: Plugin) => p.vulnerability).length;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Stats Summary */}
      <div style={{ 
        display: 'flex', 
        gap: 24, 
        marginBottom: 20,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 8,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status="processing" />
          <Text type="secondary">Total:</Text>
          <Text strong>{stats.total}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status="success" />
          <Text type="secondary">Active:</Text>
          <Text strong style={{ color: '#22c55e' }}>{stats.active}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status="default" />
          <Text type="secondary">Inactive:</Text>
          <Text strong style={{ color: '#94a3b8' }}>{stats.inactive}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status="warning" />
          <Text type="secondary">Outdated:</Text>
          <Text strong style={{ color: stats.outdated > 0 ? '#f59e0b' : '#22c55e' }}>{stats.outdated}</Text>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space align="center">
          <Title level={5} style={{ margin: 0 }}>Installed plugins</Title>
        </Space>
        <Space>
          {updatesCount > 0 && (
            <Button 
              type="primary" 
              icon={<SyncOutlined />} 
              onClick={() => updateAllPluginsMutation.mutate()}
              loading={updateAllPluginsMutation.isPending}
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              Update All ({updatesCount})
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Alerts */}
      {vulnerabilitiesCount > 0 && (
        <Alert
          type="error"
          message={`${vulnerabilitiesCount} plugin${vulnerabilitiesCount > 1 ? 's have' : ' has'} security vulnerabilities`}
          description="Update these plugins immediately to protect your site."
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {updatesCount > 0 && vulnerabilitiesCount === 0 && (
        <Alert
          type="info"
          message={`${updatesCount} update${updatesCount > 1 ? 's' : ''} available`}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {/* Search and Bulk Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="Search plugins..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
          allowClear
        />
        {selectedRowKeys.length > 0 && (
          <Dropdown menu={{ items: bulkActions }} trigger={['click']}>
            <Button>
              Bulk Actions ({selectedRowKeys.length}) <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </div>

      {/* Table */}
      <div style={{ 
        background: isDark ? '#1e293b' : '#fff',
        borderRadius: 12,
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          columns={columns}
          dataSource={filteredPlugins}
          rowKey="slug"
          loading={isLoading}
          pagination={filteredPlugins.length > 20 ? { pageSize: 20 } : false}
          size="middle"
        />
      </div>
    </div>
  );
}
