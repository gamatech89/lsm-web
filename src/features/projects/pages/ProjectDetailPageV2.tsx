/**
 * Project Detail Page V2 - WP Umbrella Style
 * 
 * Features:
 * - Secondary sidebar navigation (like WP Umbrella)
 * - Sections for: Overview, WordPress (Plugins/Themes/Core), Backups, Security, Issues, Reports, Settings
 * - Clean header with project info
 * - Mobile responsive
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Spin,
  App,
  Empty,
  Avatar,
  Popconfirm,
  Modal,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  LoginOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  MenuOutlined,
  PlusOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getHealthStatusConfig, getSecurityStatusConfig } from '@lsm/utils';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore, useIsAdmin, useCurrentUser } from '@/stores/auth';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectSubNav } from '../components/ProjectSubNav';
import { OverviewSection } from '../components/sections/OverviewSection';
import PluginsSection from '../components/sections/PluginsSection';
import ThemesSection from '../components/sections/ThemesSection';
import CoreSection from '../components/sections/CoreSection';
import BackupsSection from '../components/sections/BackupsSection';
import SecuritySection from '../components/sections/SecuritySection';
import IssuesSection from '../components/sections/IssuesSection';
import ActivitySection from '../components/sections/ActivitySection';
import SettingsSection from '../components/sections/SettingsSection';
import UptimeSection from '../components/sections/UptimeSection';
import ReportsSection from '../components/sections/ReportsSection';
import TodosSection from '../components/sections/TodosSection';
import ResourcesSection from '../components/sections/ResourcesSection';
import MaintenanceSection from '../components/sections/MaintenanceSection';

// Import existing tab components for reuse
import { TodoFormModal } from '../components/TodoFormModal';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { TodoDetailModal } from '../components/TodoDetailModal';
import { MaintenanceReportFormModal } from '../components/MaintenanceReportFormModal';
import { WordPressManagementTab } from '../components/WordPressManagementTab';
import { SupportTicketsTab } from '../components/SupportTicketsTab';

// Inline sections for Todos, Resources, Reports (existing functionality)
// Note: Todos, Resources, and Reports sections reuse existing components

const { Title, Text, Paragraph } = Typography;

export function ProjectDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id!, 10);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const currentUser = useCurrentUser();
  const isAdmin = useIsAdmin();

  // Active section from URL or default to 'overview'
  const activeSection = searchParams.get('section') || 'overview';
  const setActiveSection = (section: string) => {
    setSearchParams({ section });
  };

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Fetch project
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.projects.get(projectId).then(r => r.data.data),
    enabled: !!projectId,
  });

  // Check RMB connection status
  const { data: rmbStatus } = useQuery({
    queryKey: ['rmb-status', projectId],
    queryFn: () => api.rmb.getStatus(projectId).then(r => (r.data as any)?.data || r.data),
    enabled: !!project?.health_check_secret,
    staleTime: 30000,
  });

  // Get recovery status
  const { data: recoveryStatus, refetch: refetchRecoveryStatus } = useQuery({
    queryKey: ['rmb-recovery-status', projectId],
    queryFn: () => api.rmb.getRecoveryStatus(projectId).then(r => (r.data as any)?.data || r.data),
    enabled: !!project?.health_check_secret && rmbStatus?.connected,
    staleTime: 10000,
  });

  // SSO Login
  const [ssoLoading, setSsoLoading] = useState(false);
  const handleSsoLogin = async () => {
    if (!project) return;
    setSsoLoading(true);
    try {
      const response = await api.rmb.generateLoginToken(projectId);
      // Handle both response formats: direct or nested in .data
      const responseData = response.data as any;
      const data = responseData?.data || responseData;
      if (data?.success && data?.login_url) {
        window.open(data.login_url, '_blank');
      } else {
        message.error('Failed to generate login token');
      }
    } catch {
      message.error('SSO login failed');
    } finally {
      setSsoLoading(false);
    }
  };

  // Maintenance mode
  const enableMaintenanceMutation = useMutation({
    mutationFn: () => api.rmb.enableMaintenance(projectId),
    onSuccess: () => {
      message.success('Maintenance mode enabled');
      refetchRecoveryStatus();
    },
    onError: () => message.error('Failed to enable maintenance mode'),
  });

  const disableMaintenanceMutation = useMutation({
    mutationFn: () => api.rmb.disableMaintenance(projectId),
    onSuccess: () => {
      message.success('Maintenance mode disabled');
      refetchRecoveryStatus();
    },
    onError: () => message.error('Failed to disable maintenance mode'),
  });

  // Delete project
  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(projectId),
    onSuccess: () => {
      message.success('Project deleted');
      navigate('/projects');
    },
    onError: () => message.error('Failed to delete project'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !project) {
    return <Empty description="Project not found" />;
  }

  // Permission checks
  const canEdit = isAdmin || (currentUser?.role === 'manager' && project.manager_id === currentUser?.id);
  const canDelete = isAdmin; // Only admins can delete

  const healthConfig = getHealthStatusConfig(project.health_status);
  const securityConfig = getSecurityStatusConfig(project.security_status);

  // Counts for badges
  const pendingTodosCount = project.todos?.filter((t: any) => t.status !== 'completed').length || 0;
  const resourcesCount = project.resources?.length || 0;

  // Render active section content
  const renderSectionContent = () => {
    const commonProps = { project };

    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            project={project}
            rmbStatus={rmbStatus}
            recoveryStatus={recoveryStatus}
            onSsoLogin={handleSsoLogin}
            ssoLoading={ssoLoading}
          />
        );
      case 'uptime':
        return <UptimeSection project={project} />;
      case 'plugins':
        return <PluginsSection {...commonProps} />;
      case 'themes':
        return <ThemesSection {...commonProps} />;
      case 'core':
        return <CoreSection {...commonProps} />;
      case 'backups':
        return <BackupsSection {...commonProps} />;
      case 'security':
        return <SecuritySection {...commonProps} />;
      case 'issues':
        return <IssuesSection {...commonProps} />;
      case 'activity':
        return <ActivitySection {...commonProps} />;
      case 'todos':
        return <TodosSection {...commonProps} />;
      case 'resources':
        return <ResourcesSection {...commonProps} />;
      case 'reports':
        return <ReportsSection project={project} />;
      case 'support':
        return <SupportTicketsTab project={project} />;
      case 'maintenance':
        return <MaintenanceSection {...commonProps} />;
      case 'settings':
        return <SettingsSection {...commonProps} />;
      default:
        return <OverviewSection {...commonProps} rmbStatus={rmbStatus} recoveryStatus={recoveryStatus} onSsoLogin={handleSsoLogin} ssoLoading={ssoLoading} />;
    }
  };

  return (
    <div 
      className="project-detail-page"
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: 'calc(100vh - 64px)', // Account for main header
        overflow: 'hidden',
        padding: 16,
        gap: 12,
      }}
    >
      {/* Header Bar - Single bar aligned with content width */}
      <div
        style={{
          flexShrink: 0,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space align="center" size={12}>
          <Link to="/projects">
            <Button icon={<ArrowLeftOutlined />} type="text" size="small" />
          </Link>
          <Avatar
            shape="square"
            size={32}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 6,
            }}
          >
            {project.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 14 }}>{project.name}</Text>
            {project.url && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {project.url.replace(/^https?:\/\//, '')}
                </Text>
              </div>
            )}
          </div>
          <Tag bordered={false} color={healthConfig.color} style={{ margin: 0 }}>
            {healthConfig.label}
          </Tag>
          {project.security_status !== 'secure' && (
            <Tag bordered={false} color={securityConfig.color} style={{ margin: 0 }}>
              <LockOutlined /> {securityConfig.label}
            </Tag>
          )}
        </Space>
        <Space size={8}>
          {project.url && (
            <Button icon={<GlobalOutlined />} href={project.url} target="_blank" size="small" />
          )}
          <Button icon={<SyncOutlined />} size="small">Re-sync</Button>
          {rmbStatus?.connected && (
            <Button type="primary" icon={<LoginOutlined />} onClick={handleSsoLogin} loading={ssoLoading} size="small">
              Admin
            </Button>
          )}
          {canEdit && (
            <Button icon={<EditOutlined />} onClick={() => setShowEditModal(true)} size="small">
              Edit
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete project?"
              description="This action cannot be undone. All associated data will be deleted."
              onConfirm={() => deleteMutation.mutate()}
              okText="Yes, delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<DeleteOutlined />} danger size="small">
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Main Content Area - Fills remaining height */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 16 }}>
        {/* Sub-Navigation Sidebar */}
        <div
          className="project-sidebar-card"
          style={{
            width: 240,
            flexShrink: 0,
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            overflowY: 'auto',
            display: window.innerWidth < 992 ? 'none' : 'block',
          }}
        >
          <ProjectSubNav
            project={project}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            counts={{
              todos: pendingTodosCount,
              resources: resourcesCount,
            }}
            hasRmbConnection={!!project.health_check_secret && rmbStatus?.connected}
          />
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            overflowY: 'auto',
            padding: 24,
          }}
          className="project-content-area"
        >
          {renderSectionContent()}
        </div>
      </div>

      {/* Mobile Nav Toggle - Fixed at bottom */}
      <div 
        style={{ 
          display: window.innerWidth >= 992 ? 'none' : 'block',
          padding: '0 16px 16px',
        }}
      >
        <Button
          block
          icon={<MenuOutlined />}
          onClick={() => setShowMobileNav(true)}
          style={{
            background: isDark ? '#1e293b' : '#fff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          }}
        >
          {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} ▼
        </Button>
      </div>

      {/* Modals */}
      <ProjectFormModal open={showEditModal} onClose={() => setShowEditModal(false)} project={project} />

      {/* Notes Modal */}
      <Modal
        title="Project Notes"
        open={showDescriptionModal}
        onCancel={() => setShowDescriptionModal(false)}
        footer={null}
        width={500}
      >
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {project.notes || 'No notes for this project.'}
        </Paragraph>
      </Modal>

      {/* Mobile Navigation Drawer */}
      <Modal
        title="Navigation"
        open={showMobileNav}
        onCancel={() => setShowMobileNav(false)}
        footer={null}
        width={300}
      >
        <ProjectSubNav
          project={project}
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setShowMobileNav(false);
          }}
          counts={{
            todos: pendingTodosCount,
            resources: resourcesCount,
          }}
          hasRmbConnection={!!project.health_check_secret && rmbStatus?.connected}
        />
      </Modal>
    </div>
  );
}
