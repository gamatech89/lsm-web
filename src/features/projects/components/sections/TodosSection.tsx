/**
 * Todos Section - Project Task Management
 * 
 * Displays project todos and allows creating/managing tasks.
 */

import { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Empty,
  Table,
  Tag,
  Space,
  Dropdown,
  Checkbox,
  App,
  Select,
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { TodoFormModal } from '../TodoFormModal';
import { TodoDetailModal } from '../TodoDetailModal';

const { Title, Text } = Typography;

interface TodosSectionProps {
  project: any;
}

const priorityConfig = {
  low: { color: 'default', label: 'Low' },
  medium: { color: 'blue', label: 'Medium' },
  high: { color: 'orange', label: 'High' },
  urgent: { color: 'red', label: 'Urgent' },
};

const statusConfig = {
  pending: { color: 'default', icon: ClockCircleOutlined, label: 'Pending' },
  in_progress: { color: 'processing', icon: ClockCircleOutlined, label: 'In Progress' },
  completed: { color: 'success', icon: CheckCircleOutlined, label: 'Completed' },
  blocked: { color: 'error', icon: ExclamationCircleOutlined, label: 'Blocked' },
};

export default function TodosSection({ project }: TodosSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [viewingTodo, setViewingTodo] = useState<any>(null);

  const todos = project.todos || [];
  const pendingTodos = todos.filter((t: any) => t.status !== 'completed');
  const completedTodos = todos.filter((t: any) => t.status === 'completed');

  // Calculate team members from project
  const teamMembers = [
    ...(project.manager ? [project.manager] : []),
    ...(project.developers || []),
  ];

  const { message } = App.useApp();

  // Toggle status mutation - for quick complete/uncomplete
  const toggleStatusMutation = useMutation({
    mutationFn: ({ todoId, status }: { todoId: number; status: string }) => 
      api.todos.update(todoId, { status } as any),
    onSuccess: (_, { status }) => {
      message.success(status === 'completed' ? 'Task completed!' : 'Task reopened');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => {
      message.error('Failed to update task status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (todoId: number) => api.todos.delete(todoId),
    onSuccess: () => {
      message.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });

  // Update assignee mutation
  const updateAssigneeMutation = useMutation({
    mutationFn: ({ todoId, assigneeId }: { todoId: number; assigneeId: number | null }) => 
      api.todos.update(todoId, { assignee_id: assigneeId } as any),
    onSuccess: () => {
      message.success('Assignee updated');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => {
      message.error('Failed to update assignee');
    },
  });

  const columns: TableProps<any>['columns'] = [
    {
      title: '',
      key: 'complete',
      width: 50,
      render: (_: any, record: any) => (
        <Checkbox
          checked={record.status === 'completed'}
          onChange={(e) => {
            const newStatus = e.target.checked ? 'completed' : 'pending';
            toggleStatusMutation.mutate({ todoId: record.id, status: newStatus });
          }}
          disabled={toggleStatusMutation.isPending}
        />
      ),
    },
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div>
          <Text 
            strong 
            style={{ 
              cursor: 'pointer',
              textDecoration: record.status === 'completed' ? 'line-through' : 'none',
              opacity: record.status === 'completed' ? 0.6 : 1,
            }} 
            onClick={() => setViewingTodo(record)}
          >
            {title}
          </Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description.substring(0, 60)}
                {record.description.length > 60 ? '...' : ''}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 160,
      render: (assignee: any, record: any) => (
        <Select
          size="small"
          style={{ width: '100%', minWidth: 120 }}
          value={assignee?.id}
          placeholder="Assign..."
          allowClear
          onChange={(value) => updateAssigneeMutation.mutate({ 
            todoId: record.id, 
            assigneeId: value || null 
          })}
          loading={updateAssigneeMutation.isPending}
          options={teamMembers.map((m: any) => ({ 
            label: m.name, 
            value: m.id 
          }))}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: keyof typeof statusConfig) => {
        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <Tag color={config.color} icon={<Icon />}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: keyof typeof priorityConfig) => {
        const config = priorityConfig[priority] || priorityConfig.medium;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: any) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Details',
            onClick: () => setViewingTodo(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
            onClick: () => setEditingTodo(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => deleteMutation.mutate(record.id),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Tasks</Title>
          <Text type="secondary">{pendingTodos.length} pending, {completedTodos.length} completed</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{pendingTodos.length}</div>
            <Text type="secondary">Pending</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{completedTodos.length}</div>
            <Text type="secondary">Completed</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>{todos.length}</div>
            <Text type="secondary">Total</Text>
          </div>
        </Card>
      </div>

      {/* Tasks Table */}
      {todos.length > 0 ? (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={todos}
            columns={columns}
            rowKey="id"
            pagination={todos.length > 10 ? { pageSize: 10 } : false}
            size="middle"
          />
        </Card>
      ) : (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            textAlign: 'center',
            padding: 48,
          }}
        >
          <Empty
            image={<CheckCircleOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
            description={
              <div>
                <Text type="secondary">No tasks yet</Text>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                    Create First Task
                  </Button>
                </div>
              </div>
            }
          />
        </Card>
      )}

      {/* Modals */}
      <TodoFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={project.id}
        teamMembers={teamMembers}
      />

      {editingTodo && (
        <TodoFormModal
          open={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          projectId={project.id}
          todo={editingTodo}
          teamMembers={teamMembers}
        />
      )}

      {viewingTodo && (
        <TodoDetailModal
          open={!!viewingTodo}
          onClose={() => setViewingTodo(null)}
          todo={viewingTodo}
          projectId={project.id}
          teamMembers={teamMembers}
          onEdit={() => {
            setViewingTodo(null);
            setEditingTodo(viewingTodo);
          }}
        />
      )}
    </div>
  );
}

