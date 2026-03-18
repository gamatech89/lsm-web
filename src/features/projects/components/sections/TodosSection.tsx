/**
 * Todos Section - Project Task Management
 * 
 * Displays project todos with filtering, sorting, and task management.
 * Features: Filter bar, show/hide completed, sortable columns, overdue highlighting,
 * drag & drop Kanban, quick complete/reassign, and bulk actions.
 */

import { useState, useMemo, useCallback } from 'react';
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
  Popconfirm,
  Switch,
  Tooltip,
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
  EyeOutlined,
  FilterOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  WarningOutlined,
  PaperClipOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { TodoFormModal } from '../TodoFormModal';
import { TodoDetailModal } from '../TodoDetailModal';
import { priorityOptions, statusOptions } from '../../constants';

const { Title, Text } = Typography;

interface TodosSectionProps {
  project: any;
}

const priorityConfig: Record<string, { color: string; label: string; sort: number }> = {
  critical: { color: 'red', label: 'Critical', sort: 1 },
  high: { color: 'orange', label: 'High', sort: 2 },
  medium: { color: 'blue', label: 'Medium', sort: 3 },
  low: { color: 'default', label: 'Low', sort: 4 },
};

const statusConfig: Record<string, { color: string; icon: any; label: string; sort: number }> = {
  pending: { color: 'default', icon: ClockCircleOutlined, label: 'Pending', sort: 1 },
  in_progress: { color: 'processing', icon: ClockCircleOutlined, label: 'In Progress', sort: 2 },
  in_review: { color: 'purple', icon: EyeOutlined, label: 'In Review', sort: 3 },
  completed: { color: 'success', icon: CheckCircleOutlined, label: 'Completed', sort: 4 },
  cancelled: { color: 'default', icon: ExclamationCircleOutlined, label: 'Cancelled', sort: 5 },
};

type ViewMode = 'table' | 'kanban';

export default function TodosSection({ project }: TodosSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [viewingTodo, setViewingTodo] = useState<any>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);
  const [filterAssignee, setFilterAssignee] = useState<number | undefined>(undefined);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Drag & Drop state
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const allTodos = project.todos || [];

  // Calculate team members from project
  const teamMembers = [
    ...(project.manager ? [project.manager] : []),
    ...(project.developers || []),
  ];

  // Filter todos
  const filteredTodos = useMemo(() => {
    let result = [...allTodos];

    if (hideCompleted && viewMode === 'table') {
      result = result.filter((t: any) => t.status !== 'completed');
    }
    if (filterStatus) {
      result = result.filter((t: any) => t.status === filterStatus);
    }
    if (filterPriority) {
      result = result.filter((t: any) => t.priority === filterPriority);
    }
    if (filterAssignee) {
      result = result.filter((t: any) => t.assignee?.id === filterAssignee);
    }

    return result;
  }, [allTodos, hideCompleted, viewMode, filterStatus, filterPriority, filterAssignee]);

  // Stats
  const pendingCount = allTodos.filter((t: any) => t.status === 'pending').length;
  const inProgressCount = allTodos.filter((t: any) => t.status === 'in_progress').length;
  const inReviewCount = allTodos.filter((t: any) => t.status === 'in_review').length;
  const completedCount = allTodos.filter((t: any) => t.status === 'completed').length;
  const overdueCount = allTodos.filter(
    (t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  ).length;

  const hasActiveFilters = !!filterStatus || !!filterPriority || !!filterAssignee;

  const { message } = App.useApp();

  // Update status mutation (used by both table dropdown and kanban drag)
  const updateStatusMutation = useMutation({
    mutationFn: ({ todoId, status }: { todoId: number; status: string }) =>
      api.todos.update(todoId, { status } as any),
    onSuccess: (_, { status }) => {
      const label = statusConfig[status]?.label || status;
      message.success(`Status changed to ${label}`);
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => {
      message.error('Failed to update status');
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

  // Bulk complete mutation
  const bulkCompleteMutation = useMutation({
    mutationFn: async (todoIds: number[]) => {
      await Promise.all(todoIds.map(id => api.todos.update(id, { status: 'completed' } as any)));
    },
    onSuccess: () => {
      message.success(`${selectedRowKeys.length} tasks completed`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (todoIds: number[]) => {
      await Promise.all(todoIds.map(id => api.todos.delete(id)));
    },
    onSuccess: () => {
      message.success(`${selectedRowKeys.length} tasks deleted`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });

  // Drag & Drop handlers for Kanban
  const handleDragStart = useCallback((e: React.DragEvent, todoId: number) => {
    setDraggedTodoId(todoId);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTodoId !== null) {
      const todo = allTodos.find((t: any) => t.id === draggedTodoId);
      if (todo && todo.status !== targetStatus) {
        updateStatusMutation.mutate({ todoId: draggedTodoId, status: targetStatus });
      }
      setDraggedTodoId(null);
    }
  }, [draggedTodoId, allTodos, updateStatusMutation]);

  const handleDragEnd = useCallback(() => {
    setDraggedTodoId(null);
    setDragOverColumn(null);
  }, []);

  const isOverdue = (record: any) =>
    record.due_date && new Date(record.due_date) < new Date() && record.status !== 'completed';

  const columns: TableProps<any>['columns'] = [
    {
      title: '',
      key: 'complete',
      width: 40,
      render: (_: any, record: any) => (
        <Checkbox
          checked={record.status === 'completed'}
          onChange={(e) => {
            const newStatus = e.target.checked ? 'completed' : 'pending';
            updateStatusMutation.mutate({ todoId: record.id, status: newStatus });
          }}
          disabled={updateStatusMutation.isPending}
        />
      ),
    },
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div>
          <Space size={4}>
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
            {record.has_attachment && (
              <PaperClipOutlined style={{ color: '#a855f7', fontSize: 12 }} />
            )}
            {isOverdue(record) && (
              <Tooltip title="Overdue!">
                <WarningOutlined style={{ color: '#ef4444', fontSize: 12 }} />
              </Tooltip>
            )}
          </Space>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description.replace(/<[^>]+>/g, '').substring(0, 60)}
                {record.description.replace(/<[^>]+>/g, '').length > 60 ? '...' : ''}
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
      width: 150,
      sorter: (a: any, b: any) =>
        (statusConfig[a.status]?.sort ?? 99) - (statusConfig[b.status]?.sort ?? 99),
      render: (status: string, record: any) => (
        <Select
          size="small"
          value={status}
          style={{ width: '100%', minWidth: 130 }}
          onChange={(value) => updateStatusMutation.mutate({ todoId: record.id, status: value })}
          loading={updateStatusMutation.isPending}
          onClick={(e) => e.stopPropagation()}
          options={statusOptions.map(opt => {
            const cfg = statusConfig[opt.value];
            const Icon = cfg?.icon || ClockCircleOutlined;
            return {
              label: (
                <Space size={4}>
                  <Icon style={{ fontSize: 12 }} />
                  {opt.label}
                </Space>
              ),
              value: opt.value,
            };
          })}
        />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a: any, b: any) =>
        (priorityConfig[a.priority]?.sort ?? 99) - (priorityConfig[b.priority]?.sort ?? 99),
      render: (priority: string) => {
        const config = priorityConfig[priority] || priorityConfig.medium;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      sorter: (a: any, b: any) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      },
      render: (date: string, record: any) => {
        const overdue = isOverdue(record);
        return date ? (
          <Text style={{ color: overdue ? '#ef4444' : undefined, fontWeight: overdue ? 600 : 400 }}>
            {new Date(date).toLocaleDateString()}
          </Text>
        ) : (
          '-'
        );
      },
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
            label: (
              <Popconfirm
                title="Delete this task?"
                description="This action cannot be undone."
                onConfirm={(e) => {
                  e?.stopPropagation();
                  deleteMutation.mutate(record.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <span onClick={(e) => e.stopPropagation()}>Delete</span>
              </Popconfirm>
            ),
            danger: true,
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

  // Kanban columns
  const kanbanColumns = [
    { key: 'pending', title: 'Pending', count: pendingCount, color: '#f59e0b' },
    { key: 'in_progress', title: 'In Progress', count: inProgressCount, color: '#3b82f6' },
    { key: 'in_review', title: 'In Review', count: inReviewCount, color: '#8b5cf6' },
    { key: 'completed', title: 'Completed', count: completedCount, color: '#22c55e' },
  ];

  const clearFilters = () => {
    setFilterStatus(undefined);
    setFilterPriority(undefined);
    setFilterAssignee(undefined);
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Tasks</Title>
          <Space size={16}>
            <Text type="secondary">
              {pendingCount} pending · {inProgressCount} in progress · {completedCount} completed
            </Text>
            {overdueCount > 0 && (
              <Tag color="error" icon={<WarningOutlined />}>{overdueCount} overdue</Tag>
            )}
          </Space>
        </div>
        <Space>
          {/* View Mode Toggle */}
          <Space.Compact>
            <Tooltip title="Table View">
              <Button
                type={viewMode === 'table' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('table')}
              />
            </Tooltip>
            <Tooltip title="Kanban View">
              <Button
                type={viewMode === 'kanban' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('kanban')}
              />
            </Tooltip>
          </Space.Compact>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Add Task
          </Button>
        </Space>
      </div>

      {/* Filter Bar */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#f8fafc',
          border: hasActiveFilters ? '1px solid #6366f1' : undefined,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterOutlined style={{ color: '#94a3b8' }} />
          <Select
            size="small"
            placeholder="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            allowClear
            style={{ minWidth: 120 }}
            options={statusOptions}
          />
          <Select
            size="small"
            placeholder="Priority"
            value={filterPriority}
            onChange={setFilterPriority}
            allowClear
            style={{ minWidth: 120 }}
            options={priorityOptions}
          />
          <Select
            size="small"
            placeholder="Assignee"
            value={filterAssignee}
            onChange={setFilterAssignee}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 140 }}
            options={teamMembers.map((m: any) => ({ label: m.name, value: m.id }))}
          />
          <div style={{ flex: 1 }} />
          <Space>
            {hasActiveFilters && (
              <Button size="small" type="link" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            {viewMode === 'table' && (
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>Hide completed</Text>
                <Switch size="small" checked={hideCompleted} onChange={setHideCompleted} />
              </Space>
            )}
          </Space>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <Card
          size="small"
          style={{
            marginBottom: 12,
            borderRadius: 12,
            background: isDark ? '#312e81' : '#eef2ff',
            border: '1px solid #6366f1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text strong>{selectedRowKeys.length} selected</Text>
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => bulkCompleteMutation.mutate(selectedRowKeys)}
              loading={bulkCompleteMutation.isPending}
            >
              Mark Complete
            </Button>
            <Popconfirm
              title={`Delete ${selectedRowKeys.length} tasks?`}
              description="This action cannot be undone."
              onConfirm={() => bulkDeleteMutation.mutate(selectedRowKeys)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleteMutation.isPending}>
                Delete
              </Button>
            </Popconfirm>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          {filteredTodos.length > 0 ? (
            <Card
              style={{ borderRadius: 12, background: isDark ? '#1e293b' : '#fff' }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={filteredTodos}
                columns={columns}
                rowKey="id"
                pagination={filteredTodos.length > 15 ? { pageSize: 15 } : false}
                size="middle"
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as number[]),
                }}
                rowClassName={(record) =>
                  isOverdue(record) ? 'todo-row-overdue' : ''
                }
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
                    <Text type="secondary">
                      {hasActiveFilters ? 'No tasks match filters' : 'No tasks yet'}
                    </Text>
                    <div style={{ marginTop: 16 }}>
                      {hasActiveFilters ? (
                        <Button onClick={clearFilters}>Clear Filters</Button>
                      ) : (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                          Create First Task
                        </Button>
                      )}
                    </div>
                  </div>
                }
              />
            </Card>
          )}
        </>
      )}

      {/* Kanban View with Drag & Drop */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {kanbanColumns.map((col) => {
            const columnTodos = filteredTodos.filter((t: any) => t.status === col.key);
            const isDropTarget = dragOverColumn === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{
                  flex: 1,
                  minWidth: 250,
                  background: isDropTarget
                    ? isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'
                    : isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
                  borderRadius: 12,
                  padding: 12,
                  border: isDropTarget
                    ? '2px dashed #6366f1'
                    : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                  transition: 'all 0.2s ease',
                  minHeight: 200,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Space>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <Text strong>{col.title}</Text>
                  </Space>
                  <Tag>{columnTodos.length}</Tag>
                </div>
                {columnTodos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {columnTodos.map((todo: any) => {
                      const pConfig = priorityConfig[todo.priority] || priorityConfig.medium;
                      const overdue = isOverdue(todo);
                      const isDragging = draggedTodoId === todo.id;
                      const borderColor = pConfig.color === 'default' ? '#94a3b8'
                        : pConfig.color === 'blue' ? '#3b82f6'
                        : pConfig.color === 'orange' ? '#f97316'
                        : '#ef4444';
                      return (
                        <Card
                          key={todo.id}
                          size="small"
                          draggable
                          onDragStart={(e) => handleDragStart(e, todo.id)}
                          onDragEnd={handleDragEnd}
                          style={{
                            borderRadius: 8,
                            cursor: 'grab',
                            borderLeft: `3px solid ${borderColor}`,
                            border: isDark ? `1px solid rgba(255,255,255,0.08)` : undefined,
                            borderLeftWidth: 3,
                            borderLeftStyle: 'solid',
                            borderLeftColor: borderColor,
                            opacity: isDragging ? 0.5 : 1,
                            transform: isDragging ? 'scale(0.95)' : 'none',
                            transition: 'all 0.15s ease',
                            background: overdue
                              ? isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.04)'
                              : isDark ? '#1e293b' : '#fff',
                            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                          onClick={() => setViewingTodo(todo)}
                        >
                          <div>
                            <Space size={4} style={{ marginBottom: 4 }}>
                              <HolderOutlined style={{ color: '#94a3b8', fontSize: 10, cursor: 'grab' }} />
                              <Text strong style={{ fontSize: 13 }}>{todo.title}</Text>
                              {todo.has_attachment && <PaperClipOutlined style={{ color: '#a855f7', fontSize: 11 }} />}
                            </Space>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space size={4}>
                                <Tag color={pConfig.color} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                  {pConfig.label}
                                </Tag>
                                {overdue && (
                                  <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                    Overdue
                                  </Tag>
                                )}
                              </Space>
                              {todo.assignee && (
                                <Text type="secondary" style={{ fontSize: 11 }}>{todo.assignee.name}</Text>
                              )}
                            </div>
                            {todo.due_date && (
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                Due: {new Date(todo.due_date).toLocaleDateString()}
                              </Text>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: 24,
                    borderRadius: 8,
                    background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.5)',
                    border: isDark ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed #e2e8f0',
                  }}>
                    <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                      {isDropTarget ? 'Drop here' : 'No tasks'}
                    </Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Overdue row styling */}
      <style>{`
        .todo-row-overdue td {
          background: ${isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)'} !important;
        }
        .todo-row-overdue:hover td {
          background: ${isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)'} !important;
        }
      `}</style>

      {/* Modals */}
      <TodoFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={project.id}
        teamMembers={teamMembers}
        projectResources={project.resources}
      />

      {editingTodo && (
        <TodoFormModal
          open={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          projectId={project.id}
          todo={editingTodo}
          teamMembers={teamMembers}
          projectResources={project.resources}
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
