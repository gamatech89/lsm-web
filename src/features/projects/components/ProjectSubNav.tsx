/**
 * Project Sub-Navigation Component V4
 * 
 * Clean WP Umbrella-style navigation with:
 * - PROJECT group first (main work area)
 * - Collapsible groups
 * - Better organization
 */

import { useState } from 'react';
import { Menu, Badge, Typography, Divider } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  BugOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  RightOutlined,
  DownOutlined,
  ToolOutlined,
  HistoryOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/theme';
import { ProjectSelector } from './ProjectSelector';
import type { Project } from '@lsm/types';

const { Text } = Typography;

interface ProjectSubNavProps {
  project: Project;
  activeSection: string;
  onSectionChange: (section: string) => void;
  counts?: {
    plugins?: number;
    themes?: number;
    core?: number;
    backups?: number;
    vulnerabilities?: number;
    issues?: number;
    todos?: number;
    resources?: number;
    credentials?: number;
  };
  hasLsmConnection?: boolean;
  canManageCredentials?: boolean;
}

export function ProjectSubNav({
  project,
  activeSection,
  onSectionChange,
  counts = {},
  hasLsmConnection = false,
  canManageCredentials = false,
}: ProjectSubNavProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['project', 'monitoring', 'wordpress']);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupKey)
        ? prev.filter(k => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  // Section label with badge
  const withBadge = (label: string, count?: number, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <Badge 
          count={count} 
          size="small" 
          style={{ 
            backgroundColor: color || '#6366f1',
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: '18px',
          }} 
        />
      )}
    </div>
  );

  // Collapsible group header
  const groupHeader = (label: string, key: string, icon: React.ReactNode) => (
    <div
      onClick={(e) => { e.stopPropagation(); toggleGroup(key); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        padding: '4px 0',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 14 }}>{icon}</span>
        <Text style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>{label}</Text>
      </span>
      {expandedGroups.includes(key) ? (
        <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
      ) : (
        <RightOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
      )}
    </div>
  );

  // Build menu items - PROJECT first since it's the main work area
  const menuItems: MenuProps['items'] = [
    // Overview - always visible at top
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: 'Overview',
    },
    { type: 'divider' },
    
    // PROJECT Group (first - main work area)
    {
      key: 'project-group',
      label: groupHeader('Project', 'project', <FolderOutlined />),
      type: 'group',
      children: expandedGroups.includes('project') ? [
        {
          key: 'todos',
          icon: <CheckSquareOutlined />,
          label: withBadge('Todos', counts.todos),
        },
        {
          key: 'resources',
          icon: <FolderOutlined />,
          label: withBadge('Resources', counts.resources),
        },
        {
          key: 'reports',
          icon: <FileTextOutlined />,
          label: 'Reports',
        },
        {
          key: 'support',
          icon: <CustomerServiceOutlined />,
          label: 'Support Tickets',
        },
        ...(canManageCredentials ? [{
          key: 'credentials',
          icon: <LockOutlined />,
          label: withBadge('Credentials', counts.credentials),
        }] : []),
      ] : [],
    },
    
    // Monitoring Group
    {
      key: 'monitoring-group',
      label: groupHeader('Monitoring', 'monitoring', <DesktopOutlined />),
      type: 'group',
      children: expandedGroups.includes('monitoring') ? [
        {
          key: 'uptime',
          icon: <DesktopOutlined />,
          label: 'Uptime',
        },
        {
          key: 'performance',
          icon: <ThunderboltOutlined />,
          label: 'Performance',
          disabled: true,
        },
      ] : [],
    },
    
    // WordPress Management Group
    {
      key: 'wordpress-group',
      label: groupHeader('WordPress', 'wordpress', <AppstoreOutlined />),
      type: 'group',
      children: expandedGroups.includes('wordpress') ? [
        {
          key: 'security',
          icon: <SafetyOutlined />,
          label: withBadge('Security', counts.vulnerabilities, '#ef4444'),
          disabled: !hasLsmConnection,
        },
        {
          key: 'malware',
          icon: <SecurityScanOutlined />,
          label: 'Malware Scanner',
          disabled: !hasLsmConnection,
        },
        {
          key: 'maintenance',
          icon: <ToolOutlined />,
          label: 'Maintenance',
          disabled: !hasLsmConnection,
        },
        {
          key: 'plugins',
          icon: <AppstoreOutlined />,
          label: withBadge('Plugins', counts.plugins, '#f59e0b'),
          disabled: !hasLsmConnection,
        },
        {
          key: 'themes',
          icon: <AppstoreOutlined />,
          label: withBadge('Themes', counts.themes, '#f59e0b'),
          disabled: !hasLsmConnection,
        },
        {
          key: 'backups',
          icon: <CloudOutlined />,
          label: 'Backups',
          disabled: !hasLsmConnection,
        },
        {
          key: 'issues',
          icon: <BugOutlined />,
          label: withBadge('PHP Errors', counts.issues, '#ef4444'),
          disabled: !hasLsmConnection,
        },
        {
          key: 'activity',
          icon: <HistoryOutlined />,
          label: 'Activity Log',
          disabled: !hasLsmConnection,
        },
      ] : [],
    },
    
    { type: 'divider' },
    
    // Settings - always visible at bottom
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  return (
    <div className="project-subnav-container">
      {/* Project Selector Dropdown */}
      <ProjectSelector currentProject={project} />
      
      <Divider style={{ margin: '4px 0 8px' }} />
      
      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[activeSection]}
        onClick={({ key }) => onSectionChange(key)}
        items={menuItems}
        style={{
          background: 'transparent',
          border: 0,
        }}
        className="project-subnav-menu"
      />
    </div>
  );
}
