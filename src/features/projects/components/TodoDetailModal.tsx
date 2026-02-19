/**
 * Todo Detail Modal - Clean Trello-style popup
 * Redesigned with cleaner UI and better organization
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  Input,
  Popconfirm,
  App,
  Space,
  Button,
  Select,
  Divider,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileOutlined,
  DownloadOutlined,
  SaveOutlined,
  CloseOutlined,
  LinkOutlined,
  GlobalOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@lsm/utils';
import { useThemeStore } from '@/stores/theme';
import { statusOptions, priorityOptions } from '../constants';
import type { Todo } from '@lsm/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TodoDetailModalProps {
  open: boolean;
  onClose: () => void;
  todo: Todo | null;
  projectId: number;
  teamMembers?: any[];
  onEdit?: () => void;
}

// Time Entry Row Component
function TimeEntryRow({ entry, onDelete, isDark }: { entry: any, onDelete: (id: number) => void, isDark: boolean }) {
  const boxStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)',
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 12px',
      ...boxStyle,
      borderRadius: 6,
      marginBottom: 8
    }}>
      <Space>
        <Text style={{ fontSize: 13 }}>{formatDate(entry.started_at)}</Text>
        <Divider type="vertical" />
        <Text>{entry.formatted_duration || `${entry.duration_minutes}m`}</Text>
        {entry.description && <Text type="secondary" style={{ fontSize: 12 }}>- {entry.description}</Text>}
      </Space>
      {entry.status === 'draft' && (
        <Button 
          type="text" 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={() => onDelete(entry.id)}
        />
      )}
    </div>
  );
}

export function TodoDetailModal({
  open,
  onClose,
  todo,
  projectId,
  teamMembers = [],
  onEdit,
}: TodoDetailModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  
  // Theme-aware box style for containers
  const boxStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)',
  };
  
  // Time Tracking State
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [logTimeMinutes, setLogTimeMinutes] = useState<string>('');
  const [logTimeDescription, setLogTimeDescription] = useState('');

  // Fetch linked time entries
  const { data: timeEntries, refetch: refetchTimeEntries } = useQuery({
    queryKey: ['time-entries', 'todo', todo?.id],
    queryFn: () => api.timeEntries.list({ todo_id: todo?.id }).then(r => r.data.data),
    enabled: !!todo?.id,
  });

  // Calculate actual time
  const actualMinutes = timeEntries?.reduce((sum: number, entry: any) => sum + (entry.duration_minutes || 0), 0) || 0;
  const estimatedMinutes = todo?.estimated_minutes || 0;

  // Reset description editing state when modal opens/closes
  useEffect(() => {
    if (open && todo) {
      setDescription(todo.description || '');
      setIsEditingDescription(false);
    }
  }, [open, todo]);

  // Update todo mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.todos.update(todo!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onError: () => message.error('Failed to update todo'),
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.todos.delete(todo!.id),
    onSuccess: () => {
      message.success('Todo deleted');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      onClose();
    },
    onError: () => message.error('Failed to delete todo'),
  });

  // Log Time Mutation
  const logTimeMutation = useMutation({
    mutationFn: (data: any) => api.timeEntries.create(data),
    onSuccess: () => {
      message.success('Time logged');
      setIsLoggingTime(false);
      setLogTimeMinutes('');
      setLogTimeDescription('');
      refetchTimeEntries();
    },
    onError: () => message.error('Failed to log time'),
  });

  // Delete Time Mutation
  const deleteTimeMutation = useMutation({
    mutationFn: (id: number) => api.timeEntries.delete(id),
    onSuccess: () => {
      message.success('Time entry deleted');
      refetchTimeEntries();
    },
  });

  const handleLogTime = () => {
    if (!logTimeMinutes || isNaN(Number(logTimeMinutes))) {
      message.error('Please enter valid minutes');
      return;
    }
    
    const minutes = Number(logTimeMinutes);
    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60000);

    logTimeMutation.mutate({
      project_id: projectId,
      todo_id: todo!.id,
      description: logTimeDescription,
      started_at: startTime.toISOString(),
      ended_at: now.toISOString(),
      is_billable: true,
    });
  };

  if (!todo) return null;

  const handleStatusChange = (value: string) => {
    updateMutation.mutate({ status: value });
  };

  const handlePriorityChange = (value: string) => {
    updateMutation.mutate({ priority: value });
  };

  const handleAssigneeChange = (value: number | undefined) => {
    updateMutation.mutate({ assigned_to: value });
  };

  const handleDescriptionSave = () => {
    updateMutation.mutate({ description });
    setIsEditingDescription(false);
  };

  const handleDownload = async () => {
    try {
      const response = await api.todos.downloadFile(todo.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', todo.file_name || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      message.error('Failed to download file');
    }
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== 'completed';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Popconfirm
            title="Delete this todo?"
            description="This action cannot be undone."
            onConfirm={() => deleteMutation.mutate()}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </Popconfirm>
          <Space>
            {onEdit && (
              <Button icon={<EditOutlined />} onClick={onEdit}>
                Edit Full
              </Button>
            )}
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </Space>
        </div>
      }
      title={null}
      styles={{ body: { padding: '20px 24px' } }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Space align="start" size={12}>
          {todo.status === 'completed' ? (
            <CheckCircleOutlined style={{ fontSize: 22, color: '#10b981', marginTop: 4 }} />
          ) : (
            <ClockCircleOutlined style={{ fontSize: 22, color: '#94a3b8', marginTop: 4 }} />
          )}
          <div>
            <Title 
              level={4} 
              style={{ margin: 0, textDecoration: todo.status === 'completed' ? 'line-through' : 'none' }}
            >
              {todo.title}
            </Title>
            {todo.due_date && (
              <Space size={4} style={{ marginTop: 4 }}>
                <CalendarOutlined style={{ color: isOverdue ? '#ef4444' : '#94a3b8', fontSize: 12 }} />
                <Text 
                  type={isOverdue ? 'danger' : 'secondary'} 
                  style={{ fontSize: 12 }}
                >
                  Due: {formatDate(todo.due_date)}
                </Text>
              </Space>
            )}
          </div>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Properties Row */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Status
          </Text>
          <Select
            size="small"
            value={todo.status}
            style={{ width: '100%' }}
            onChange={handleStatusChange}
            loading={updateMutation.isPending}
            options={statusOptions}
          />
        </div>

        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Priority
          </Text>
          <Select
            size="small"
            value={todo.priority}
            style={{ width: '100%' }}
            onChange={handlePriorityChange}
            loading={updateMutation.isPending}
            options={priorityOptions}
          />
        </div>

        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Assignee
          </Text>
          <Select
            size="small"
            value={todo.assignee?.id}
            style={{ width: '100%' }}
            placeholder="Unassigned"
            allowClear
            onChange={handleAssigneeChange}
            loading={updateMutation.isPending}
            options={teamMembers.map((m: any) => ({ label: m.name, value: m.id }))}
          />
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Description</Text>
          {!isEditingDescription && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => setIsEditingDescription(true)}
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
            >
              Edit
            </Button>
          )}
        </div>
        {isEditingDescription ? (
          <div>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add a description..."
              style={{ marginBottom: 8 }}
            />
            <Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<SaveOutlined />}
                onClick={handleDescriptionSave} 
                loading={updateMutation.isPending}
              >
                Save
              </Button>
              <Button 
                size="small" 
                icon={<CloseOutlined />}
                onClick={() => {
                  setIsEditingDescription(false);
                  setDescription(todo.description || '');
                }}
              >
                Cancel
              </Button>
            </Space>
          </div>
        ) : (
          <div 
            style={{ 
              padding: 12, 
              ...boxStyle,
              borderRadius: 6,
              minHeight: 60,
            }}
          >
            {todo.description ? (
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{todo.description}</Paragraph>
            ) : (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>No description</Text>
            )}
          </div>
        )}
      </div>

      {/* Attachments - Show only if there are files */}
      {/* Time Tracking Section */}
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <ClockCircleOutlined />
            <Text type="secondary" style={{ fontSize: 12 }}>Time Tracking</Text>
          </Space>
          <Space size={16}>
             <Text type="secondary" style={{ fontSize: 12 }}>
               Est: <Text strong>{estimatedMinutes}m</Text>
             </Text>
             <Text type="secondary" style={{ fontSize: 12 }}>
               Actual: <Text strong style={{ color: actualMinutes > estimatedMinutes ? '#ef4444' : 'inherit' }}>{actualMinutes}m</Text>
             </Text>
          </Space>
        </div>

        {isLoggingTime ? (
          <div style={{ padding: 12, ...boxStyle, borderRadius: 6 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input 
                type="number" 
                placeholder="Minutes (e.g. 30)" 
                value={logTimeMinutes}
                onChange={e => setLogTimeMinutes(e.target.value)}
                autoFocus
              />
              <Input 
                placeholder="Description (optional)" 
                value={logTimeDescription}
                onChange={e => setLogTimeDescription(e.target.value)}
              />
              <Space>
                <Button type="primary" size="small" onClick={handleLogTime} loading={logTimeMutation.isPending}>Save</Button>
                <Button size="small" onClick={() => setIsLoggingTime(false)}>Cancel</Button>
              </Space>
            </Space>
          </div>
        ) : (
          <Button 
            type="dashed" 
            block 
            icon={<ClockCircleOutlined />} 
            onClick={() => setIsLoggingTime(true)}
            style={{ marginBottom: 12 }}
          >
            Log Time
          </Button>
        )}

        {/* Recent Entries */}
        {timeEntries && timeEntries.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {timeEntries.map((entry: any) => (
              <TimeEntryRow 
                key={entry.id} 
                entry={entry} 
                onDelete={(id) => deleteTimeMutation.mutate(id)}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Attachments - Show only if there are files */}
      {todo.has_attachment && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Attachment
            </Text>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px 12px',
              ...boxStyle,
              borderRadius: 6,
            }}>
              <Space>
                <FileOutlined />
                <Text>{todo.file_name || 'Attached File'}</Text>
              </Space>
              <Button 
                type="link" 
                size="small" 
                icon={<DownloadOutlined />} 
                onClick={handleDownload}
              >
                Download
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Linked Library Resources */}
      {(todo as any).library_resources && (todo as any).library_resources.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div>
            <Space style={{ marginBottom: 8 }}>
              <LinkOutlined />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Library Resources ({(todo as any).library_resources.length})
              </Text>
            </Space>
            {(todo as any).library_resources.map((resource: any) => (
              <div 
                key={resource.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  ...boxStyle,
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              >
                <Space>
                  {resource.type === 'link' 
                    ? <GlobalOutlined style={{ color: '#3b82f6' }} />
                    : <FileTextOutlined style={{ color: '#a855f7' }} />
                  }
                  <Text>{resource.title}</Text>
                </Space>
                {resource.type === 'link' ? (
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<GlobalOutlined />} 
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    Open
                  </Button>
                ) : (
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<DownloadOutlined />} 
                    onClick={async () => {
                      try {
                        const response = await api.libraryResources.download(resource.id);
                        const blob = new Blob([response.data]);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = resource.file_name || 'download';
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch {
                        message.error('Failed to download');
                      }
                    }}
                  >
                    Download
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
