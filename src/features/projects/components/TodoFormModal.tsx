/**
 * Todo Form Modal
 * Used for creating and editing todos within a project
 * Features: File attachments, library resource linking, consistent styling
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  App,
  Upload,
  Button,
  Typography,
  Tag,
  Space,
} from 'antd';
import { UploadOutlined, PaperClipOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { priorityOptions, CONTROL_HEIGHT } from '../constants';
import type { Todo } from '@lsm/types';
import type { UploadFile } from 'antd';
import type { LibraryResource } from '@/lib/library-resources-api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const { Text } = Typography;

interface TodoFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  todo?: Todo | null;
  teamMembers: any[];
  projectResources?: any[];
}

// Consistent size for all form controls (matches MaintenanceReportFormModal)
const controlStyle = { height: CONTROL_HEIGHT };

export function TodoFormModal({
  open,
  onClose,
  projectId,
  todo,
  teamMembers,
  projectResources = [],
}: TodoFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!todo;
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [selectedProjectResourceIds, setSelectedProjectResourceIds] = useState<number[]>([]);

  // Fetch library resources for linking
  const { data: libraryResources = [] } = useQuery({
    queryKey: ['library-resources'],
    queryFn: () => api.libraryResources.getAll().then(r => r.data.data || r.data || []),
    enabled: open,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.todos.create(projectId, data),
    onSuccess: () => {
      message.success('Todo created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      handleClose();
    },
    onError: () => {
      message.error('Failed to create todo');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.todos.update(todo!.id, data),
    onSuccess: () => {
      message.success('Todo updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      handleClose();
    },
    onError: () => {
      message.error('Failed to update todo');
    },
  });

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    setSelectedResourceIds([]);
    setSelectedProjectResourceIds([]);
    onClose();
  };

  // Set form values when editing
  useEffect(() => {
    if (todo && open) {
      form.setFieldsValue({
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        status: todo.status,
        due_date: todo.due_date ? dayjs(todo.due_date) : null,
        assigned_to: todo.assignee?.id,
        estimated_minutes: todo.estimated_minutes,
      });
      setSelectedResourceIds((todo as any).library_resources?.map((r: any) => r.id) || []);
      setSelectedProjectResourceIds((todo as any).resources?.map((r: any) => r.id) || []);
      setFileList([]);
    } else if (!todo && open) {
      form.resetFields();
      setFileList([]);
      setSelectedResourceIds([]);
      setSelectedProjectResourceIds([]);
    }
  }, [todo, open, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    priority: string;
    due_date?: dayjs.Dayjs;
    assigned_to?: number;
  }) => {
    let data: any;

    if (fileList.length > 0) {
      const formData = new FormData();
      formData.append('title', values.title);
      if (values.description) formData.append('description', values.description);
      formData.append('priority', values.priority);
      formData.append('status', 'pending');
      if (values.due_date) formData.append('due_date', values.due_date.format('YYYY-MM-DD'));
      if (values.assigned_to) formData.append('assignee_id', values.assigned_to.toString());

      fileList.forEach(f => {
        if (f.originFileObj) {
          formData.append('files[]', f.originFileObj);
        }
      });

      selectedResourceIds.forEach(id => {
        formData.append('library_resource_ids[]', id.toString());
      });

      selectedProjectResourceIds.forEach(id => {
        formData.append('resource_ids[]', id.toString());
      });

      data = formData;
    } else {
      data = {
        ...values,
        status: 'pending',
        due_date: values.due_date?.format('YYYY-MM-DD'),
        assignee_id: values.assigned_to,
        library_resource_ids: selectedResourceIds,
        resource_ids: selectedProjectResourceIds,
      };
      delete data.assigned_to;
    }

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList);
  };

  // Clipboard paste handler for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        // Create a descriptive filename with timestamp
        const ext = blob.type.split('/')[1] || 'png';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `clipboard-${timestamp}.${ext}`;

        const file = new File([blob], fileName, { type: blob.type });

        const uploadFile: UploadFile = {
          uid: `paste-${Date.now()}`,
          name: fileName,
          status: 'done',
          originFileObj: file as any,
          size: file.size,
          type: file.type,
        };

        setFileList(prev => {
          if (prev.length >= 5) {
            message.warning('Maximum 5 attachments allowed');
            return prev;
          }
          return [...prev, uploadFile];
        });
        message.success('📋 Image pasted from clipboard');
        break;
      }
    }
  }, [message]);

  // Attach paste listener when modal is open
  useEffect(() => {
    if (!open) return;
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, handlePaste]);

  const userOptions = teamMembers.map(u => ({ label: u.name, value: u.id }));

  const libraryResourceOptions = (libraryResources as LibraryResource[]).map(r => ({
    label: (
      <Space size={4}>
        {r.type === 'link' ? <LinkOutlined style={{ color: '#3b82f6' }} /> : <FileTextOutlined style={{ color: '#a855f7' }} />}
        {r.title}
        {r.type === 'link' && <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>LINK</Tag>}
      </Space>
    ),
    value: r.id,
    searchLabel: r.title,
  }));

  return (
    <Modal
      title={isEditMode ? 'Edit Todo' : 'Add Todo'}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText={isEditMode ? 'Update' : 'Create'}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          priority: 'medium',
        }}
        style={{ marginTop: 16 }}
      >
        {/* Title */}
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="e.g. Update WordPress plugins" style={controlStyle} />
        </Form.Item>

        {/* Priority / Due Date / Assigned To — single row */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="priority" label="Priority">
              <Select options={priorityOptions} style={controlStyle} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="due_date" label="Due Date">
              <DatePicker style={{ width: '100%', ...controlStyle }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="assigned_to" label="Assigned To">
              <Select
                options={userOptions}
                placeholder="Select assignee"
                allowClear
                showSearch
                optionFilterProp="label"
                style={controlStyle}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Description — larger WYSIWYG editor */}
        <Form.Item name="description" label="Description">
          <ReactQuill
            theme="snow"
            placeholder="Additional details, notes, instructions..."
            modules={{
              toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link'],
                ['clean'],
              ],
            }}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* File Attachments — Drop / Paste Zone */}
        <Form.Item label={<><PaperClipOutlined /> Attachments {fileList.length > 0 && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>({fileList.length}/5)</Text>}</>}>
          {fileList.length > 0 && (
            /* ── File List ── */
            <div style={{ marginBottom: fileList.length < 5 ? 8 : 0 }}>
              {fileList.map((file, index) => (
                <div key={file.uid} style={{
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: index < fileList.length - 1 ? 6 : 0,
                }}>
                  {file.originFileObj?.type?.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file.originFileObj as Blob)}
                      alt="preview"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      background: '#f5f3ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <PaperClipOutlined style={{ fontSize: 18, color: '#a855f7' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ display: 'block', fontSize: 12 }} ellipsis>
                      {file.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => setFileList(prev => prev.filter(f => f.uid !== file.uid))}
                    style={{ fontSize: 11 }}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          {fileList.length < 5 && (
            /* ── Drop/Paste Zone ── */
            <Upload.Dragger
              fileList={[]}
              onChange={handleFileChange}
              beforeUpload={(file) => {
                setFileList(prev => {
                  if (prev.length >= 5) {
                    message.warning('Maximum 5 attachments allowed');
                    return prev;
                  }
                  const uploadFile: UploadFile = {
                    uid: `upload-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    status: 'done',
                    originFileObj: file as any,
                    size: file.size,
                    type: file.type,
                  };
                  return [...prev, uploadFile];
                });
                return false;
              }}
              multiple
              showUploadList={false}
              style={{ padding: '12px 0' }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#8c8c8c' }}>
                <UploadOutlined style={{ fontSize: 20, color: '#a855f7', display: 'block', marginBottom: 4 }} />
                Drop files, <Text style={{ color: '#6366f1', fontWeight: 500 }}>browse</Text>, or{' '}
                <Text style={{ color: '#6366f1', fontWeight: 500 }}>paste screenshot</Text>
                <span style={{ opacity: 0.6, fontSize: 11 }}> (Ctrl+V / ⌘V)</span>
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                Up to 5 files · Max 10 MB each
              </p>
            </Upload.Dragger>
          )}
        </Form.Item>

        {/* Library Resources */}
        <Form.Item label={<><LinkOutlined /> Library Resources</>}>
          <Select
            mode="multiple"
            placeholder="Link resources from library..."
            value={selectedResourceIds}
            onChange={setSelectedResourceIds}
            options={libraryResourceOptions}
            optionFilterProp="searchLabel"
            allowClear
            showSearch
            style={{ width: '100%' }}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            Link guides, videos, or reference materials from the Library
          </Text>
        </Form.Item>

        {/* Project Resource Links */}
        {projectResources.filter((r: any) => r.type === 'link' && r.url).length > 0 && (
          <Form.Item label={<><LinkOutlined /> Project Resource Links</>}>
            <Select
              mode="multiple"
              placeholder="Link resources from this project..."
              value={selectedProjectResourceIds}
              onChange={setSelectedProjectResourceIds}
              optionFilterProp="searchLabel"
              allowClear
              showSearch
              style={{ width: '100%' }}
              options={projectResources
                .filter((r: any) => r.type === 'link' && r.url)
                .map((r: any) => ({
                  label: `🔗 ${r.title}`,
                  value: r.id,
                  searchLabel: r.title,
                }))
              }
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Link project resource URLs to this todo
            </Text>
          </Form.Item>
        )}
      </Form>

      {/* Quill editor height override */}
      <style>{`
        .ql-editor {
          min-height: 160px !important;
        }
      `}</style>
    </Modal>
  );
}
