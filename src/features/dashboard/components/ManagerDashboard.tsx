import { useMemo } from 'react';
import { Row, Col, Typography, Card, Space, Tag, Avatar } from 'antd';
import {
  WarningOutlined,
  ProjectOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { GlassStatCard } from './widgets/GlassStatCard';
import { ApprovalsWidget } from './widgets/ApprovalsWidget';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

export function ManagerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Data Fetching
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

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list().then(r => r.data.data),
  });

  const stats = (dashboardData?.stats || { total: 0, online: 0, at_risk: 0, hacked: 0, updating: 0, down: 0 }) as any;

  // Process Availability (Same logic as Admin)
  const teamAvailability = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.map(u => {
      const activeLog = availabilityLogs?.find(l => l.user_id === u.id);
      return {
        id: u.id,
        name: u.name,
        status: activeLog?.status || 'online',
      };
    });
  }, [allUsers, availabilityLogs]);

  // Identify Critical Projects
  const criticalProjects = useMemo(() => {
     const list: { id: string | number; name: string; issue: string; type: string; tag: string }[] = [];
     
     // 1. Hacked / Down Sites
     if ((stats.hacked || 0) + (stats.down || 0) > 0) {
        list.push({
            id: 'security-alert',
            name: t('dashboard.criticalInfrastructure'),
            issue: t('dashboard.sitesHackedDown', { count: (stats.hacked || 0) + (stats.down || 0) }),
            type: 'security',
            tag: 'CRITICAL'
        });
     }

     // 2. Overdue Projects
     if (projects) {
         projects.forEach((p: any) => {
             if (p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed') {
                 list.push({
                     id: p.id,
                     name: p.name,
                     issue: t('dashboard.deadlinePassed', { date: new Date(p.deadline).toLocaleDateString() }),
                     type: 'overdue',
                     tag: 'OVERDUE'
                 });
             }
         });
     }
     
     return list;
  }, [stats, projects, t]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          {getGreeting()}, {user?.name?.split(' ')[0]}! 🚀
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          {t('dashboard.managerSubtitle')}
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Top Row: Key Metrics */}
        <Col xs={12} lg={6}>
          <GlassStatCard
            title={t('dashboard.managedProjects')}
            value={projects?.length || 0}
            icon={<ProjectOutlined />}
            color="#6366f1"
            trend="neutral"
          />
        </Col>
        <Col xs={12} lg={6}>
           <GlassStatCard
            title={t('dashboard.projectsAtRisk')}
            value={stats.at_risk}
            icon={<WarningOutlined />}
            color="#f59e0b"
            trend={stats.at_risk > 0 ? 'down' : 'neutral'}
            trendValue={stats.at_risk > 0 ? t('dashboard.needsAttentionSuffix') : ''}
            onClick={() => navigate('/projects?status=risk')}
          />
        </Col>
         <Col xs={12} lg={6}>
           <GlassStatCard
            title={t('dashboard.teamAvailability')}
            value={`${teamAvailability.filter(m => m.status === 'online').length}/${teamAvailability.length}`}
            icon={<TeamOutlined />}
            color="#22c55e"
            suffix={t('dashboard.onlineSuffix')}
          />
        </Col>
         <Col xs={12} lg={6}>
           <GlassStatCard
            title={t('dashboard.stats.hackedDown')}
            value={(stats.hacked || 0) + (stats.down || 0)}
            icon={<SafetyOutlined />}
            color="#ef4444"
            trend="down"
            trendValue={t('dashboard.criticalSuffix')}
          />
        </Col>

        {/* Middle Row: Approvals & Project Status */}
        <Col xs={24} lg={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             {/* Approvals Queue */}
             <ApprovalsWidget />

             {/* Projects Needing Attention */}
             <Card 
               title={<Space><WarningOutlined style={{ color: '#ef4444' }} /><span>{t('dashboard.projectsNeedingAttention')}</span></Space>}
               style={{ borderRadius: 16, border: 'none' }}
               styles={{ body: { padding: 0 } }}
             >
                {criticalProjects.length > 0 ? criticalProjects.map((item, index) => (
                    <div key={index} style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>{item.name}</Text>
                          <Tag color={item.type === 'security' ? '#ef4444' : 'purple'}>
                              {item.tag}
                          </Tag>
                       </div>
                       <Text type="secondary" style={{ fontSize: 13 }}>{item.issue}</Text>
                    </div>
                )) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                        <Text type="secondary">{t('dashboard.allOnTrack')}</Text>
                    </div>
                )}
             </Card>
          </div>
        </Col>

        {/* Right Column: Team Availability */}
        <Col xs={24} lg={10}>
           <Card
              title={<Space><TeamOutlined style={{ color: '#6366f1' }} /><span>{t('dashboard.teamStatus')}</span></Space>}
              style={{ borderRadius: 16, border: 'none', height: '100%' }}
              styles={{ body: { padding: 16 } }}
           >
              {teamAvailability.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                     <Avatar 
                        size={8} 
                        style={{ 
                            background: member.status === 'online' ? '#22c55e' : 
                                        member.status === 'sick' ? '#ef4444' : '#f59e0b', 
                            marginRight: 12 
                        }} 
                     />
                     <Text strong>{member.name}</Text>
                     <div style={{ marginLeft: 'auto' }}>
                        {member.status === 'online' ? (
                            <Tag color="success" style={{ border: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>{t('dashboard.online')}</Tag>
                        ) : (
                            <Tag color={member.status === 'sick' ? 'error' : 'warning'}>
                                {member.status === 'sick' ? t('dashboard.sickLeave') : t('dashboard.away')}
                            </Tag>
                        )}
                     </div>
                  </div>
              ))}
           </Card>
        </Col>
      </Row>
    </div>
  );
}
