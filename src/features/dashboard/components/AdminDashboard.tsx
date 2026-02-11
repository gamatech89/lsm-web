import { useMemo, useState } from 'react';
import { Row, Col, Typography, Card, Space, Tag, Avatar, Table, Radio } from 'antd';
import {
  SafetyOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  UnorderedListOutlined,
  CustomerServiceOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { GlassStatCard } from './widgets/GlassStatCard';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

const BRAND = {
  purple: '#7C3AED',
};

interface TeamMember {
  id: number;
  name: string;
  role: string;
  status: string;
  until: string | null | undefined;
  projects_assigned: number;
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { resolvedTheme: _resolvedTheme } = useThemeStore();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.get().then(r => r.data.data),
  });

  const { data: availabilityLogs } = useQuery({
    queryKey: ['availability'],
    queryFn: () => api.availability.list().then(r => r.data.data),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.team.list().then(r => r.data.data),
  });

  const stats = (dashboardData?.stats || { total: 0, online: 0, at_risk: 0, hacked: 0, open_todos: 0, open_tickets: 0 }) as any;

  // Merge team data with availability
  const teamData = useMemo(() => {
    if (!allUsers) return [];
    
    return allUsers.map((u: any) => {
      const activeLog = availabilityLogs?.find((l: any) => l.user_id === u.id);
      const projectCount = (u.managed_projects_count || 0) + (u.assigned_projects_count || 0);

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        status: activeLog ? activeLog.status : 'available',
        until: activeLog?.end_date || null,
        projects_assigned: projectCount,
        managed_projects_count: u.managed_projects_count || 0,
        assigned_projects_count: u.assigned_projects_count || 0,
      };
    });
  }, [allUsers, availabilityLogs]);

  // Filter by role
  const filteredTeam = useMemo(() => {
    if (roleFilter === 'all') return teamData;
    return teamData.filter(m => m.role === roleFilter);
  }, [teamData, roleFilter]);

  const unavailableMembers = useMemo(() => 
    teamData.filter(m => m.status !== 'available'),
  [teamData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const getStatusTag = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      sick: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: t('dashboard.statuses.sick') },
      vacation: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: t('dashboard.statuses.vacation') },
      parental: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', label: t('dashboard.statuses.parental') },
    };
    const s = styles[status] || { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b', label: status };
    return (
      <Tag style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        fontWeight: 500,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
      }}>
        {s.label}
      </Tag>
    );
  };

  const getRoleTag = (role: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      admin: { bg: 'rgba(124, 58, 237, 0.12)', color: BRAND.purple, label: t('dashboard.roles.admin') },
      manager: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', label: t('dashboard.roles.pm') },
      developer: { bg: 'rgba(58, 166, 141, 0.12)', color: '#6366f1', label: t('dashboard.roles.dev') },
      viewer: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', label: t('dashboard.roles.viewer') },
    };
    const s = styles[role] || styles.viewer;
    return (
      <Tag style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}25`,
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {s.label}
      </Tag>
    );
  };

  // Unavailable team table columns
  const unavailableColumns = [
    {
      title: t('dashboard.team.teamMember'),
      key: 'member',
      render: (_: unknown, record: TeamMember) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{
              backgroundColor: record.status === 'sick' ? '#ef4444' : record.status === 'vacation' ? '#f59e0b' : '#8b5cf6',
            }}
            icon={<UserOutlined />}
          />
          <div>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>{record.role}</Text>
          </div>
        </div>
      ),
    },
    {
      title: t('dashboard.team.status'),
      key: 'status',
      width: 150,
      render: (_: unknown, record: TeamMember) => getStatusTag(record.status),
    },
    {
      title: t('dashboard.team.returnDate'),
      key: 'until',
      width: 150,
      render: (_: unknown, record: TeamMember) => (
        <Space>
          <CalendarOutlined style={{ opacity: 0.5 }} />
          <Text>{record.until ? new Date(record.until).toLocaleDateString() : t('dashboard.team.na')}</Text>
        </Space>
      ),
    },
    {
      title: t('dashboard.team.projects'),
      key: 'projects',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: any) => {
        const count = record.projects_assigned || 0;
        return (
          <Tag
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              navigate(`/projects?user_id=${record.id}`);
            }}
            style={{
              background: count > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.08)',
              color: count > 0 ? '#ef4444' : '#94a3b8',
              border: `1px solid ${count > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 116, 139, 0.15)'}`,
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            <FolderOutlined style={{ marginRight: 4 }} />
            {count} {count === 1 ? t('dashboard.team.project') : t('dashboard.team.projects')}
          </Tag>
        );
      },
    },
  ];

  // Team overview table columns
  const teamColumns = [
    {
      title: t('dashboard.team.name'),
      key: 'name',
      render: (_: unknown, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: record.status === 'available' ? '#22c55e' : '#f59e0b',
          }} />
          <Text strong>{record.name}</Text>
        </div>
      ),
    },
    {
      title: t('dashboard.team.role'),
      key: 'role',
      width: 100,
      render: (_: unknown, record: any) => getRoleTag(record.role),
    },
    {
      title: t('dashboard.team.projects'),
      key: 'projects',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: any) => (
        <Tag
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            navigate(`/projects?user_id=${record.id}`);
          }}
          style={{
            background: record.projects_assigned > 0 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(100, 116, 139, 0.08)',
            color: record.projects_assigned > 0 ? '#8b5cf6' : '#94a3b8',
            border: `1px solid ${record.projects_assigned > 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(100, 116, 139, 0.15)'}`,
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: 12,
          }}
        >
          <FolderOutlined style={{ marginRight: 4 }} />
          {record.projects_assigned}
        </Tag>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(18px, 4vw, 24px)' }}>
           {getGreeting()}, {user?.name?.split(' ')[0]}! 🛡️
        </Title>
        <Text type="secondary" style={{ fontSize: 'clamp(12px, 3vw, 15px)' }}>
          {t('dashboard.subtitle')}
        </Text>
      </div>

      {/* Quick Stats */}
      <Title level={5} style={{ marginBottom: 16 }}>{t('dashboard.overview')}</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={12} lg={6}>
          <GlassStatCard
            title={t('dashboard.stats.openTodos')}
            value={stats.open_todos || 0}
            icon={<UnorderedListOutlined />}
            color={BRAND.purple}
            suffix={t('dashboard.suffixes.tasks')}
            onClick={() => navigate('/projects')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <GlassStatCard
            title={t('dashboard.stats.supportTickets')}
            value={stats.open_tickets || 0}
            icon={<CustomerServiceOutlined />}
            color={BRAND.purple}
            suffix={t('dashboard.suffixes.open')}
            onClick={() => navigate('/support')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <GlassStatCard
            title={t('dashboard.stats.atRisk')}
            value={stats.at_risk}
            icon={<AlertOutlined />}
            color="#f59e0b"
            suffix={t('dashboard.suffixes.warnings')}
            onClick={() => navigate('/projects?status=risk')}
          />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6}>
          <GlassStatCard
            title={t('dashboard.stats.hackedDown')}
            value={(stats.hacked || 0) + (stats.down || 0)}
            icon={<SafetyOutlined />}
            color="#ef4444"
            trend={stats.hacked > 0 ? 'down' : 'neutral'}
            trendValue={stats.hacked > 0 ? t('dashboard.suffixes.criticalAlert') : t('dashboard.suffixes.allClear')}
          />
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        {/* Team Availability Risk Monitor */}
        {unavailableMembers.length > 0 && (
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <MedicineBoxOutlined style={{ color: BRAND.purple }} />
                  <span>{t('dashboard.team.availability')}</span>
                </Space>
              }
              style={{ borderRadius: 16, border: 'none', marginBottom: 20 }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                columns={unavailableColumns}
                dataSource={unavailableMembers}
                rowKey="id"
                pagination={false}
                scroll={{ x: 600 }}
              />
            </Card>
          </Col>
        )}

        {/* Team Overview with role filter */}
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <Space>
                  <TeamOutlined style={{ color: BRAND.purple }} />
                  <span>{t('dashboard.team.overview')}</span>
                  <Tag style={{ marginLeft: 4, borderRadius: 12 }}>{filteredTeam.length}</Tag>
                </Space>
                <Radio.Group
                  size="small"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  buttonStyle="solid"
                  optionType="button"
                >
                  <Radio.Button value="all">{t('dashboard.filters.all')}</Radio.Button>
                  <Radio.Button value="developer">{t('dashboard.filters.developers')}</Radio.Button>
                  <Radio.Button value="manager">{t('dashboard.filters.managers')}</Radio.Button>
                  <Radio.Button value="admin">{t('dashboard.filters.admins')}</Radio.Button>
                </Radio.Group>
              </div>
            }
            style={{ borderRadius: 16, border: 'none' }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={teamColumns}
              dataSource={filteredTeam}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 600 }}
              locale={{
                emptyText: (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ fontSize: 32, color: '#6366f1', marginBottom: 12 }} />
                    <div><Text>{t('dashboard.team.noMembers')}</Text></div>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
