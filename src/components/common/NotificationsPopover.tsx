import { useState, useEffect, useRef } from 'react';
import { Button, Badge, Popover, List, Typography, Empty, Spin } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/theme';

const { Text } = Typography;

/**
 * Generate a human-readable notification message from the notification data.
 */
function getNotificationMessage(notification: any): string {
  const { data } = notification;
  if (!data) return 'New notification';

  // If a message field exists, use it directly
  if (data.message) return data.message;

  const name = data.project_name || 'Unknown project';

  switch (data.type) {
    case 'site_down':
      return `🚨 ${name} is down — ${data.error_message || 'connection error'}`;
    case 'malware_detected':
      return `⚠️ ${name} — ${data.threats_found || 0} threat${data.threats_found !== 1 ? 's' : ''} found`;
    case 'backup_completed':
      return `✅ Backup completed for ${name}`;
    case 'backup_failed':
      return `❌ Backup failed for ${name}`;
    case 'ssl_expiring':
      return `🔒 SSL certificate expiring soon for ${name}`;
    case 'project_assigned':
      return `📋 You were assigned to ${name}`;
    case 'project_status_changed':
      return `📊 ${name} status changed to ${data.status || 'unknown'}`;
    case 'todo_added':
      return `📝 New todo added${data.todo_title ? ': ' + data.todo_title : ''}`;
    case 'todo_assigned':
      return `📝 Todo assigned to you${data.todo_title ? ': ' + data.todo_title : ''}`;
    default:
      return `Notification for ${name}`;
  }
}

/**
 * Get the appropriate icon for a notification.
 */
function getNotificationIcon(notification: any) {
  const type = notification.data?.type || '';
  switch (type) {
    case 'site_down':
      return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
    case 'malware_detected':
      return <WarningOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
    case 'backup_completed':
    case 'project_assigned':
    case 'todo_added':
    case 'todo_assigned':
      return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 16 }} />;
    case 'backup_failed':
      return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
    case 'ssl_expiring':
      return <WarningOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#6366f1', fontSize: 16 }} />;
  }
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // Fetch unread count (every 10s for near-real-time updates)
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.getUnreadCount().then(r => r.data),
    refetchInterval: 10000,
  });

  const unreadCount = unreadData?.data?.count || 0;
  const prevUnreadRef = useRef(unreadCount);

  // Auto-refresh notification list when unread count changes
  useEffect(() => {
    if (unreadCount !== prevUnreadRef.current) {
      prevUnreadRef.current = unreadCount;
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    }
  }, [unreadCount, queryClient]);

  // Fetch notifications list (also refetch when popover opens)
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.notifications.list().then(r => r.data),
    enabled: open,
    refetchInterval: open ? 10000 : false,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate based on type/data
    const { data } = notification;

    if (data.project_id) {
       navigate(`/projects/${data.project_id}`);
    } else if (data.url) {
        navigate(data.url);
    }
    
    setOpen(false);
  };

  const notifications = notificationsData?.data?.data || [];

  const content = (
    <div style={{ width: 350, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: isDark ? '1px solid #334155' : '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
            style={{ padding: 0 }}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description="No notifications" 
            style={{ margin: '24px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item: any) => (
              <div 
                onClick={() => handleNotificationClick(item)}
                style={{ 
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: !item.read_at 
                    ? (isDark ? 'rgba(99, 102, 241, 0.1)' : '#f0f9ff') 
                    : 'transparent',
                  borderBottom: isDark ? '1px solid #334155' : '1px solid #f0f0f0',
                  transition: 'background 0.2s',
                  display: 'flex',
                  gap: 12
                }}
                className="notification-item"
              >
                  {/* Icon based on notification data type */}
                  <div style={{ marginTop: 2 }}>
                     {getNotificationIcon(item)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4 }}>
                       <Text style={{ fontSize: 13 }}>
                          {getNotificationMessage(item)}
                       </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </div>
                  
                  {!item.read_at && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                       <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                    </div>
                  )}
              </div>
            )}
          />
        )}
      </div>
      
      <style>{`
          .notification-item:hover {
              background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fafafa'} !important;
          }
      `}</style>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayInnerStyle={{ padding: 0 }}
    >
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{
            width: 40,
            height: 40,
            color: open ? '#6366f1' : undefined,
            borderRadius: 10,
          }}
        />
      </Badge>
    </Popover>
  );
}
