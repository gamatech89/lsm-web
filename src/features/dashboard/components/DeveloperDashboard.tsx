import { Row, Col, Typography, Card, Space } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { ActiveTimerWidget } from './widgets/ActiveTimerWidget';
import { GlassStatCard } from './widgets/GlassStatCard';
import { TodoListWidget } from './widgets/TodoListWidget';

const { Title, Text } = Typography;

export function DeveloperDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Fetch Timer Stats (Hours Today)
  const { data: timerStats } = useQuery({
    queryKey: ['time-entries', 'today-stats'],
    queryFn: () => api.timeEntries.today().then(r => r.data.data),
    refetchInterval: 60000, 
  });

  // Fetch Assigned Tasks (limit 20 from backend)
  const { data: myTodos } = useQuery({
    queryKey: ['todos', 'my-tasks'],
    queryFn: () => apiClient.get('/my-todos').then(r => r.data.data),
  });

  // Fetch Active Projects
  const { data: activeProjects } = useQuery({
    queryKey: ['projects', 'active', user?.id],
    queryFn: () => api.projects.list({ developer_id: user?.id, health: 'all' }).then(r => r.data.data),
    enabled: !!user?.id,
  });
  
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  // Calculate high priority tasks
  const highPriorityCount = myTodos?.filter((todo: any) => 
    ['high', 'urgent', 'critical'].includes(todo.priority)
  ).length || 0;

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          {getGreeting()}, {user?.name?.split(' ')[0]}! 👨‍💻
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          {t('dashboard.developerSubtitle')}
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column - Main Work Area */}
        <Col xs={24} lg={16}>
          {/* Active Timer - Center stage for developers */}
          <ActiveTimerWidget />
          
          {/* My Tasks List */}
          <div style={{ minHeight: 400 }}>
             <TodoListWidget todos={myTodos || []} loading={!myTodos} />
          </div>
        </Col>

        {/* Right Column - Stats & Quick Links */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             {/* Key Personal Stats */}
            <GlassStatCard
              title={t('dashboard.hoursToday')}
              value={timerStats?.formatted_total || '0h 0m'} 
              icon={<ClockCircleOutlined />}
              color="#6366f1"
            />
            
            <GlassStatCard
              title={t('dashboard.assignedTasks')}
              value={myTodos?.length || '0'}
              icon={<CheckCircleOutlined />}
              color="#22c55e"
              suffix={t('dashboard.highPriority', { count: highPriorityCount })}
            />

            {/* Quick Project Links */}
             <Card
                title={
                  <Space>
                    <ProjectOutlined style={{ color: '#6366f1' }} />
                    <span>{t('dashboard.myActiveProjects')}</span>
                  </Space>
                }
                style={{ borderRadius: 16, border: 'none', marginTop: 8 }}
                styles={{ body: { padding: 0 } }}
             >
                {/* Real project list */}
                {activeProjects?.slice(0, 5).map((project: any, i: number) => (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{ 
                      padding: '16px 20px', 
                      borderBottom: i < (activeProjects.length - 1) ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 500 }}>{project.name}</span>
                    <ThunderboltOutlined style={{ color: project.health_status === 'online' ? '#22c55e' : '#fbbf24' }} />
                  </div>
                ))}
                
                {(!activeProjects || activeProjects.length === 0) && (
                   <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                     {t('dashboard.noActiveProjects')}
                   </div>
                )}
             </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
