import { Card, List, Tag, Typography, Button, Space, Empty } from 'antd';
import { CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { getPriorityConfig, formatDate } from '@lsm/utils';

const { Text } = Typography;

interface TodoListWidgetProps {
  todos?: any[];
  loading?: boolean;
}

export function TodoListWidget({ todos = [], loading = false }: TodoListWidgetProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#22c55e' }} />
          <span>{t('dashboard.myTasks')}</span>
        </Space>
      }
      extra={
        <Button type="link" onClick={() => navigate('/projects')}>
          {t('common.viewAll')}
        </Button>
      }
      style={{ 
        borderRadius: 16, 
        border: 'none',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { padding: 0, flex: 1, overflow: 'auto' } }}
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <List
          loading={loading}
          dataSource={todos}
          locale={{
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={t('dashboard.noPendingTasks')} 
              />
            )
          }}
          renderItem={(todo: any) => {
            const priorityConfig = getPriorityConfig(todo.priority);
            
            return (
              <List.Item
                style={{ 
                  padding: '16px 24px',
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                className="todo-item"
                onClick={() => navigate(`/projects/${todo.project_id}`)}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {todo.title}
                    </Text>
                    {['high', 'urgent', 'critical'].includes(todo.priority) && (
                      <Tag color={priorityConfig.color} style={{ margin: 0, borderRadius: 10 }}>
                        {todo.priority}
                      </Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {todo.project?.name || t('common.unknownProject')}
                    </Text>
                    {todo.due_date && (
                       <Space size={6}>
                         <CalendarOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
                         <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(todo.due_date)}</Text>
                       </Space>
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>
      
      <style>{`
        .todo-item:hover {
          background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
        }
      `}</style>
    </Card>
  );
}
