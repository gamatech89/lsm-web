/**
 * Authenticated Layout
 *
 * Redesigned layout with:
 * - Landeseiten.de brand colors (purple theme)
 * - Dark/Light theme support
 * - German/English i18n
 * - Grouped sidebar navigation
 * - Theme & language toggles in header
 * - Responsive design (mobile drawer, tablet auto-collapse)
 */

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Switch, Tooltip, AutoComplete, Tag, Input, Drawer } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  LockOutlined,
  TeamOutlined,
  TagsOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  SearchOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  DollarOutlined,
  MoonOutlined,
  SunOutlined,
  GlobalOutlined,
  MedicineBoxOutlined,
  CustomerServiceOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ItemType } from 'antd/es/menu/interface';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useIsAdmin, useCanManageProjects } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { api, apiClient } from '@/lib/api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Custom hook for responsive breakpoints
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

const FloatingTimerWidget = lazy(() => import('@/features/time/components/FloatingTimerWidget').then(m => ({ default: m.FloatingTimerWidget })));
const SetAvailabilityModal = lazy(() => import('@/features/team/components/SetAvailabilityModal').then(m => ({ default: m.SetAvailabilityModal })));
const NotificationsPopover = lazy(() => import('@/components/common/NotificationsPopover').then(m => ({ default: m.NotificationsPopover })));
const AiChatPanel = lazy(() => import('@/components/chat/AiChatPanel').then(m => ({ default: m.AiChatPanel })));

/**
 * Menu items for the sidebar - grouped by category
 */
function useMenuItems(): ItemType[] {
  const isAdmin = useIsAdmin();
  const canManageProjects = useCanManageProjects();
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const labelStyle = {
    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    padding: '16px 24px 8px',
    display: 'block',
  };

  const items: ItemType[] = [
    // Main section label
    {
      key: 'main-label',
      type: 'group',
      label: <span style={labelStyle}>{t('nav.main')}</span>,
      children: [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: <Link to="/dashboard">{t('nav.dashboard')}</Link>,
        },
        {
          key: '/projects',
          icon: <ProjectOutlined />,
          label: <Link to="/projects">{t('nav.projects')}</Link>,
        },
        {
          key: '/vault',
          icon: <LockOutlined />,
          label: <Link to="/vault">{t('nav.vault')}</Link>,
        },
        {
          key: '/library',
          icon: <FolderOpenOutlined />,
          label: <Link to="/library">{t('nav.library')}</Link>,
        },
        // Support Tickets - only for PM/Admin
        ...(canManageProjects ? [{
          key: '/support',
          icon: <CustomerServiceOutlined />,
          label: <Link to="/support">{t('nav.support')}</Link>,
        }] : []),
      ],
    },
  ];

  // Time Tracking section
  const timeItems: ItemType[] = [
    {
      key: '/time',
      icon: <ClockCircleOutlined />,
      label: <Link to="/time">{t('nav.myTime')}</Link>,
    },
  ];

  if (canManageProjects) {
    timeItems.push({
      key: '/time/approvals',
      icon: <CheckCircleOutlined />,
      label: <Link to="/time/approvals">{t('nav.approvals')}</Link>,
    });
  }

  if (canManageProjects) {
    timeItems.push({
      key: '/time/analytics',
      icon: <BarChartOutlined />,
      label: <Link to="/time/analytics">{t('nav.analytics')}</Link>,
    });
  }

  if (canManageProjects) {
    timeItems.push({
      key: '/time/invoices',
      icon: <DollarOutlined />,
      label: <Link to="/time/invoices">{t('nav.invoices')}</Link>,
    });
  }

  items.push({
    key: 'time-label',
    type: 'group',
    label: <span style={labelStyle}>{t('nav.timeTracking')}</span>,
    children: timeItems,
  });

  // Management section (for managers/admins)
  if (canManageProjects || isAdmin) {
    const managementItems: ItemType[] = [];

    if (canManageProjects) {
      managementItems.push({
        key: '/team',
        icon: <TeamOutlined />,
        label: <Link to="/team">{t('nav.team')}</Link>,
      });
    }

    if (isAdmin) {
      managementItems.push(
        {
          key: '/tags',
          icon: <TagsOutlined />,
          label: <Link to="/tags">{t('nav.tags')}</Link>,
        },
        {
          key: '/activity',
          icon: <HistoryOutlined />,
          label: <Link to="/activity">{t('nav.activityLog')}</Link>,
        },
        {
          key: '/settings',
          icon: <SettingOutlined />,
          label: <Link to="/settings">{t('nav.settings')}</Link>,
        }
      );
    }

    if (managementItems.length > 0) {
      items.push({
        key: 'management-label',
        type: 'group',
        label: <span style={labelStyle}>{t('nav.management')}</span>,
        children: managementItems,
      });
    }
  }

  return items;
}

export function AuthenticatedLayout() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const menuItems = useMenuItems();
  const isDark = resolvedTheme === 'dark';

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Header search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search handler
  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchOptions([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await apiClient.get('/projects-quick-search', { params: { q: value } });
      const projects = response.data?.data || [];
      setSearchOptions(projects.map((p: any) => ({
        value: String(p.id),
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <div style={{ fontWeight: 500, color: isDark ? '#f8fafc' : '#1f2937' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#6b7280' }}>
                {p.url?.replace(/^https?:\/\//, '') || 'No URL'}
                {p.external_id && <span style={{ marginLeft: 8 }}>ID: {p.external_id}</span>}
              </div>
            </div>
            <Space size={4}>
              {p.tags?.slice(0, 2).map((t: any) => (
                <Tag key={t.id} color={t.color || 'default'} style={{ margin: 0, fontSize: 10 }}>{t.name}</Tag>
              ))}
            </Space>
          </div>
        ),
      })));
    } catch {
      setSearchOptions([]);
    } finally {
      setIsSearching(false);
    }
  }, [isDark]);

  const handleSearchSelect = (projectId: string) => {
    setSearchQuery('');
    setSearchOptions([]);
    navigate(`/projects/${projectId}`);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore errors, just logout locally
    }
    logout();
    navigate('/login');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const languageItems: MenuProps['items'] = [
    { key: 'en', label: '🇬🇧 English' },
    { key: 'de', label: '🇩🇪 Deutsch' },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: handleLogout,
      danger: true,
    },
  ];

  // Theme-aware colors
  const sidebarBg = isDark ? '#1F1A23' : '#2D2735';
  const headerBg = isDark ? '#1F1A23' : '#FFFFFF';
  const contentBg = isDark ? '#161218' : '#F8F9FC';
  const borderColor = isDark ? '#3D3347' : '#E2E8F0';
  const textColor = isDark ? '#F8FAFC' : '#1F1A23';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  // Sidebar content — shared between Sider and Drawer
  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
          padding: (collapsed && !isMobile) ? 0 : '0 24px',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        {(collapsed && !isMobile) ? (
          <img
            src="/logo-landeseiten.svg"
            alt="L"
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
        ) : (
          <img
            src="/logo-landeseiten.svg"
            alt="Landeseiten"
            style={{ height: 36, objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{
          background: 'transparent',
          borderRight: 0,
          marginTop: 8,
        }}
        className="sidebar-menu"
      />
    </>
  );

  // Calculate sidebar width for desktop/tablet
  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  return (
    <Layout style={{ minHeight: '100vh', background: contentBg }}>
      {/* Mobile: Drawer sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0, background: sidebarBg }, header: { display: 'none' } }}
          style={{ zIndex: 1001 }}
        >
          <div style={{ height: '100%', background: sidebarBg }}>
            {sidebarContent}
          </div>
        </Drawer>
      )}

      {/* Desktop/Tablet: Fixed Sider */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          collapsedWidth={80}
          style={{
            background: sidebarBg,
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
            boxShadow: isDark ? 'none' : '2px 0 12px rgba(0,0,0,0.05)',
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Main Content Area */}
      <Layout 
        style={{ 
          marginLeft: siderWidth, 
          transition: 'margin-left 0.2s',
          background: contentBg,
        }}
      >
        {/* Header */}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            height: isMobile ? 56 : 72,
            background: headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${borderColor}`,
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
              style={{ 
                fontSize: 18, 
                width: 44, 
                height: 44,
                color: textSecondary,
              }}
            />
          </Space>

          <Space size={isMobile ? 6 : 12}>
            {/* Project Search — hidden on mobile */}
            {!isMobile && (
              <AutoComplete
                value={searchQuery}
                options={searchOptions}
                onSearch={handleSearch}
                onSelect={handleSearchSelect}
                style={{ width: isTablet ? 180 : 280 }}
                popupMatchSelectWidth={400}
                notFoundContent={searchQuery.length >= 2 && !isSearching ? (
                  <div style={{ padding: '8px 12px', color: isDark ? '#94a3b8' : '#6b7280' }}>{t('projects.noProjects')}</div>
                ) : null}
              >
                <Input
                  prefix={<SearchOutlined style={{ color: textSecondary }} />}
                  placeholder={t('common.search')}
                  className="header-search-input"
                  style={{
                    height: 40,
                    borderRadius: 20,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  }}
                />
              </AutoComplete>
            )}

            {/* Set Status — icon only on mobile */}
            <Button 
                type="text" 
                danger
                icon={<MedicineBoxOutlined />}
                onClick={() => setIsAvailabilityModalOpen(true)}
                style={{ borderRadius: 10, color: '#ef4444' }}
            >
                {!isMobile && t('availability.setStatus')}
            </Button>

            {/* Notifications */}
            <NotificationsPopover />

            {/* Divider — hidden on mobile */}
            {!isMobile && (
              <div style={{ 
                width: 1, 
                height: 24, 
                background: borderColor,
                margin: '0 4px',
              }} />
            )}

            {/* Language Dropdown — icon only on mobile */}
            <Dropdown
              menu={{
                items: languageItems,
                onClick: ({ key }) => changeLanguage(key),
                selectedKeys: [i18n.language?.split('-')[0] || 'en'],
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<GlobalOutlined />}
                style={{
                  color: textSecondary,
                  fontWeight: 500,
                  borderRadius: 10,
                }}
              >
                {!isMobile && !collapsed && (i18n.language?.split('-')[0].toUpperCase() || 'EN')}
              </Button>
            </Dropdown>

            {/* Theme Toggle */}
            <Tooltip title={isDark ? t('theme.light') : t('theme.dark')}>
              <Switch
                checked={isDark}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                style={{
                  background: isDark ? '#6B21A8' : '#E2E8F0',
                }}
              />
            </Tooltip>

            {/* User Menu */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space 
                style={{ 
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  marginLeft: isMobile ? 0 : 8,
                  transition: 'background 0.2s',
                }}
                className="user-dropdown-trigger"
              >
                <Avatar
                  size={isMobile ? 32 : 36}
                  style={{ 
                    background: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)',
                    fontWeight: 600,
                  }}
                  icon={<UserOutlined />}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                {/* Hide user text on mobile */}
                {!isMobile && (
                  <div style={{ lineHeight: 1.2 }}>
                    <Text 
                      strong 
                      style={{ 
                        display: 'block', 
                        color: textColor,
                        fontSize: 13,
                      }}
                    >
                      {user?.name}
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 11, 
                        color: textSecondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {user?.role}
                    </Text>
                  </div>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Page Content */}
        <Content
          style={{
            margin: isMobile ? 12 : (isTablet ? 16 : 24),
            minHeight: `calc(100vh - ${isMobile ? 56 : 72}px - 48px)`,
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* Floating Timer Widget */}
      <Suspense fallback={null}>
        <FloatingTimerWidget />
        <SetAvailabilityModal 
          open={isAvailabilityModalOpen} 
          onClose={() => setIsAvailabilityModalOpen(false)} 
        />
        <AiChatPanel />
      </Suspense>

      {/* Sidebar Styles */}
      <style>{`
        .sidebar-menu .ant-menu-item-group-title {
          padding: 0 !important;
        }
        
        .sidebar-menu .ant-menu-item {
          margin: 4px 12px !important;
          padding-left: 16px !important;
          border-radius: 10px !important;
          height: 44px !important;
          line-height: 44px !important;
          color: rgba(255, 255, 255, 0.7) !important;
        }
        
        .sidebar-menu .ant-menu-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }
        
        .sidebar-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, rgba(107, 33, 168, 0.8) 0%, rgba(168, 85, 247, 0.6) 100%) !important;
          color: #fff !important;
        }
        
        .sidebar-menu .ant-menu-item-selected::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: #A855F7;
          border-radius: 0 4px 4px 0;
        }
        
        .sidebar-menu .ant-menu-item .anticon {
          font-size: 18px !important;
        }
        
        .sidebar-menu .ant-menu-item a {
          color: inherit !important;
        }
        
        /* User dropdown hover */
        .user-dropdown-trigger:hover {
          background: rgba(107, 33, 168, 0.1) !important;
        }
        
        /* Search input styling */
        .header-search-input.ant-input-affix-wrapper {
          border: none !important;
          box-shadow: none !important;
        }
        .header-search-input.ant-input-affix-wrapper:focus,
        .header-search-input.ant-input-affix-wrapper.ant-input-affix-wrapper-focused {
          border: none !important;
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2) !important;
        }
        
        /* Dark mode adjustments */
        [data-theme="dark"] .ant-layout-header {
          background: #1F1A23 !important;
        }
        
        [data-theme="dark"] .ant-layout-content {
          background: #161218 !important;
        }
        
        /* Remove any body margin */
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Dark mode dropdown fixes */
        [data-theme="dark"] .ant-select-dropdown {
          background: #1e293b !important;
        }
        
        [data-theme="dark"] .ant-select-item {
          color: #e2e8f0 !important;
        }
        
        [data-theme="dark"] .ant-select-item-option-selected {
          background: #334155 !important;
          color: #f8fafc !important;
        }
        
        [data-theme="dark"] .ant-select-item-option-active {
          background: rgba(139, 92, 246, 0.2) !important;
        }
        
        [data-theme="dark"] .ant-select-item-option-content {
          color: inherit !important;
        }
        
        [data-theme="dark"] .ant-select-selection-item {
          color: #f8fafc !important;
        }

        /* Responsive overrides */
        @media (max-width: 767px) {
          .page-container {
            padding: 0 !important;
          }
          .ant-layout-header {
            padding: 0 12px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1024px) {
          .page-container {
            padding: 0 !important;
          }
        }
      `}</style>
    </Layout>
  );
}
