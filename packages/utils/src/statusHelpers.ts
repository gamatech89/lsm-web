/**
 * Status Helper Utilities
 */

import type { HealthStatus, SecurityStatus, TodoPriority, UserRole } from '@lsm/types';

// =============================================================================
// HEALTH STATUS
// =============================================================================

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const healthStatusConfig: Record<HealthStatus, StatusConfig> = {
  online: {
    label: 'Online',
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: 'CheckCircle',
  },
  down_error: {
    label: 'Down',
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    icon: 'CloseCircle',
  },
  updating: {
    label: 'Updating',
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: 'SyncOutlined',
  },
};

export function getHealthStatusConfig(status: HealthStatus): StatusConfig {
  return healthStatusConfig[status] ?? healthStatusConfig.online;
}

// =============================================================================
// SECURITY STATUS
// =============================================================================

export const securityStatusConfig: Record<SecurityStatus, StatusConfig> = {
  secure: {
    label: 'Secure',
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: 'SafetyOutlined',
  },
  monitoring: {
    label: 'Monitoring',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: 'EyeOutlined',
  },
  compromised: {
    label: 'At Risk',
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: 'WarningOutlined',
  },
  hacked: {
    label: 'Hacked',
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    icon: 'BugOutlined',
  },
};

export function getSecurityStatusConfig(status: SecurityStatus): StatusConfig {
  return securityStatusConfig[status] ?? securityStatusConfig.secure;
}

// =============================================================================
// TODO PRIORITY
// =============================================================================

export const priorityConfig: Record<TodoPriority, StatusConfig> = {
  low: {
    label: 'Low',
    color: '#8c8c8c',
    bgColor: '#fafafa',
    icon: 'MinusOutlined',
  },
  medium: {
    label: 'Medium',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: 'ArrowRightOutlined',
  },
  high: {
    label: 'High',
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: 'ArrowUpOutlined',
  },
  urgent: {
    label: 'Urgent',
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    icon: 'ExclamationOutlined',
  },
  critical: {
    label: 'Critical',
    color: '#cf1322',
    bgColor: '#ffccc7',
    icon: 'FireOutlined',
  },
};

export function getPriorityConfig(priority: TodoPriority): StatusConfig {
  return priorityConfig[priority] ?? priorityConfig.medium;
}

// =============================================================================
// USER ROLES
// =============================================================================

export const roleConfig: Record<UserRole, StatusConfig> = {
  admin: {
    label: 'Admin',
    color: '#722ed1',
    bgColor: '#f9f0ff',
    icon: 'CrownOutlined',
  },
  manager: {
    label: 'Manager',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: 'TeamOutlined',
  },
  developer: {
    label: 'Developer',
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: 'CodeOutlined',
  },
  viewer: {
    label: 'Viewer',
    color: '#8c8c8c',
    bgColor: '#fafafa',
    icon: 'EyeOutlined',
  },
};

export function getRoleConfig(role: UserRole): StatusConfig {
  return roleConfig[role] ?? roleConfig.viewer;
}

// =============================================================================
// PERMISSION HELPERS
// =============================================================================

export function canManageProjects(role: UserRole): boolean {
  return ['admin', 'manager'].includes(role);
}

export function canManageTeam(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewActivity(role: UserRole): boolean {
  return role === 'admin';
}

export function canAssignDevelopers(role: UserRole): boolean {
  return ['admin', 'manager'].includes(role);
}
