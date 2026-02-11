import { Card, Typography, Button, Space, Avatar, Tag } from 'antd';
import { CheckCircleOutlined, UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Text } = Typography;

export function ApprovalsWidget() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const { data: pendingTimesheets } = useQuery({
    queryKey: ['timesheets', 'pending'],
    queryFn: () => api.timesheets.pending().then(r => r.data.data),
  });

  const pendingCount = pendingTimesheets?.length || 0;

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#3b82f6' }} />
          <span>{t('dashboard.pendingApprovals')}</span>
          {pendingCount > 0 && (
             <Tag color="blue" style={{ borderRadius: 10, marginLeft: 8 }}>{pendingCount} {t('dashboard.new')}</Tag>
          )}
        </Space>
      }
      extra={
        <Button type="link" onClick={() => navigate('/time/approvals')}>
          {t('dashboard.reviewAll')}
        </Button>
      }
      style={{ 
        borderRadius: 16, 
        border: 'none',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        height: '100%',
        borderLeft: pendingCount > 0 ? '4px solid #3b82f6' : 'none',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {(pendingTimesheets || []).slice(0, 5).map((ts, index) => (
         <div 
           key={ts.id}
           style={{ 
             padding: '16px 20px',
             borderBottom: index < Math.min((pendingTimesheets?.length || 0), 5) - 1 
               ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` 
               : 'none',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             cursor: 'pointer',
           }}
           onClick={() => navigate(`/time/approvals/${ts.id}`)}
         >
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <Avatar 
                size={32} 
                style={{ background: '#3b82f6' }}
                icon={<UserOutlined />}
             >
               {ts.user?.name?.charAt(0)}
             </Avatar>
             <div>
               <Text strong style={{ display: 'block' }}>{ts.user?.name}</Text>
               <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('dashboard.week')} {ts.week_number} • {ts.formatted_total}
               </Text>
             </div>
           </div>
           <Button type="text" shape="circle" icon={<ArrowRightOutlined />} />
         </div>
      ))}

      {(!pendingTimesheets || pendingTimesheets.length === 0) && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 32, color: '#22c55e', marginBottom: 12, opacity: 0.5 }} />
          <div>
             <Text type="secondary">{t('dashboard.allCaughtUp')}</Text>
          </div>
        </div>
      )}
    </Card>
  );
}
