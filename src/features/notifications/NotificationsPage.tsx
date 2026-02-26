/**
 * Notifications Page
 * 
 * Full-page view of all notifications with pagination, filtering, and bulk actions.
 */

import { useState, useEffect } from 'react';
import {
    Typography,
    Button,
    Card,
    Empty,
    Spin,
    Space,
    Pagination,
    Tag,
    Segmented,
    App,
} from 'antd';
import {
    BellOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    CheckOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/theme';

const { Title, Text } = Typography;

/* ── responsive hook ─────────────────────────────── */
const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);
    return matches;
};

/**
 * Get human-readable notification message
 */
function getNotificationMessage(notification: any): string {
    const { data } = notification;
    if (!data) return 'New notification';
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
 * Get appropriate icon for notification
 */
function getNotificationIcon(notification: any) {
    const type = notification.data?.type || '';
    switch (type) {
        case 'site_down':
        case 'backup_failed':
            return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 20 }} />;
        case 'malware_detected':
        case 'ssl_expiring':
            return <WarningOutlined style={{ color: '#f59e0b', fontSize: 20 }} />;
        case 'backup_completed':
        case 'project_assigned':
        case 'todo_added':
        case 'todo_assigned':
            return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 20 }} />;
        default:
            return <InfoCircleOutlined style={{ color: '#6366f1', fontSize: 20 }} />;
    }
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { message } = App.useApp();
    const { resolvedTheme } = useThemeStore();
    const isDark = resolvedTheme === 'dark';
    const isMobile = useMediaQuery('(max-width: 767px)');

    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const perPage = 20;

    // Fetch notifications
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications', 'page', page, perPage],
        queryFn: () => api.notifications.list(page, perPage).then(r => r.data),
    });

    const notifications = notificationsData?.data?.data || [];
    const pagination = notificationsData?.data?.pagination;
    const unreadCount = notificationsData?.data?.unread_count || 0;

    // Filter
    const filtered = filter === 'unread'
        ? notifications.filter((n: any) => !n.read_at)
        : notifications;

    // Mark as read
    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.notifications.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read
    const markAllReadMutation = useMutation({
        mutationFn: () => api.notifications.markAllAsRead(),
        onSuccess: () => {
            message.success('All notifications marked as read');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const handleClick = (notification: any) => {
        if (!notification.read_at) {
            markReadMutation.mutate(notification.id);
        }
        const { data } = notification;
        if (data?.project_id) {
            navigate(`/projects/${data.project_id}`);
        } else if (data?.url) {
            navigate(data.url);
        }
    };

    return (
        <div style={{ padding: isMobile ? 16 : 24, maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 12,
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(-1)}
                        style={{ padding: 0 }}
                    />
                    <div>
                        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BellOutlined style={{ color: '#6366f1' }} />
                            Notifications
                            {unreadCount > 0 && (
                                <Tag color="purple" style={{ fontSize: 12, fontWeight: 600 }}>
                                    {unreadCount} unread
                                </Tag>
                            )}
                        </Title>
                    </div>
                </div>

                <Space>
                    {unreadCount > 0 && (
                        <Button
                            icon={<CheckOutlined />}
                            onClick={() => markAllReadMutation.mutate()}
                            loading={markAllReadMutation.isPending}
                        >
                            Mark all read
                        </Button>
                    )}
                </Space>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: 16 }}>
                <Segmented
                    options={[
                        { label: `All (${pagination?.total || 0})`, value: 'all' },
                        { label: `Unread (${unreadCount})`, value: 'unread' },
                    ]}
                    value={filter}
                    onChange={(val) => setFilter(val as 'all' | 'unread')}
                />
            </div>

            {/* Notification List */}
            <Card
                styles={{ body: { padding: 0 } }}
                style={{ borderRadius: 12, overflow: 'hidden' }}
            >
                {isLoading ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : filtered.length === 0 ? (
                    <Empty
                        image={<BellOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
                        description={
                            <Text type="secondary">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </Text>
                        }
                        style={{ padding: 48 }}
                    />
                ) : (
                    <div>
                        {filtered.map((item: any, index: number) => (
                            <div
                                key={item.id}
                                onClick={() => handleClick(item)}
                                style={{
                                    padding: '16px 20px',
                                    cursor: item.data?.project_id || item.data?.url ? 'pointer' : 'default',
                                    background: !item.read_at
                                        ? (isDark ? 'rgba(99, 102, 241, 0.08)' : '#f5f3ff')
                                        : 'transparent',
                                    borderBottom: index < filtered.length - 1
                                        ? (isDark ? '1px solid #334155' : '1px solid #f0f0f0')
                                        : 'none',
                                    transition: 'background 0.2s',
                                    display: 'flex',
                                    gap: 16,
                                    alignItems: 'flex-start',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#fafafa';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = !item.read_at
                                        ? (isDark ? 'rgba(99, 102, 241, 0.08)' : '#f5f3ff')
                                        : 'transparent';
                                }}
                            >
                                {/* Icon */}
                                <div style={{ marginTop: 2, flexShrink: 0 }}>
                                    {getNotificationIcon(item)}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ marginBottom: 4 }}>
                                        <Text style={{ fontSize: 14, fontWeight: !item.read_at ? 600 : 400 }}>
                                            {getNotificationMessage(item)}
                                        </Text>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatRelativeTime(item.created_at)}
                                    </Text>
                                </div>

                                {/* Unread dot + mark read button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    {!item.read_at && (
                                        <>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CheckOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markReadMutation.mutate(item.id);
                                                }}
                                                style={{ fontSize: 11, color: '#6366f1' }}
                                            >
                                                {!isMobile && 'Read'}
                                            </Button>
                                            <div style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: '#6366f1',
                                                flexShrink: 0,
                                            }} />
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Pagination */}
            {pagination && pagination.total > perPage && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Pagination
                        current={pagination.current_page}
                        total={pagination.total}
                        pageSize={perPage}
                        onChange={(p) => setPage(p)}
                        showSizeChanger={false}
                        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
                    />
                </div>
            )}
        </div>
    );
}
