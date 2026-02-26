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
import { UploadOutlined, PaperClipOutlined, ClockCircleOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { priorityOptions, statusOptions, CONTROL_HEIGHT } from '../constants';
import type { Todo } from '@lsm/types';
import type { UploadFile } from 'antd';
import type { LibraryResource } from '@/lib/library-resources-api';

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
      // Load existing library resources if any
      setSelectedResourceIds(
        (todo as any).library_resources?.map((r: any) => r.id) || []
      );
      setFileList([]);
    } else if (!todo && open) {
      form.resetFields();
      setFileList([]);
      setSelectedResourceIds([]);
    }
  }, [todo, open, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    priority: string;
    status: string;
    due_date?: dayjs.Dayjs;
    assigned_to?: number;
    estimated_minutes?: number;
  }) => {
    // Append project resource links to description if selected
    const projectResourceUrls: string[] = form.getFieldValue('_project_resource_urls') || [];
    let description = values.description || '';
    if (projectResourceUrls.length > 0) {
      const linksSection = '\n\n--- Resource Links ---\n' + projectResourceUrls.join('\n');
      // Remove any previously appended resource links section before re-adding
      description = description.replace(/\n\n--- Resource Links ---\n[\s\S]*$/, '');
      description += linksSection;
    }
    values.description = description || undefined;

    let data: any;

    if (fileList.length > 0) {
      const formData = new FormData();
      formData.append('title', values.title);
      if (values.description) formData.append('description', values.description);
      formData.append('priority', values.priority);
      formData.append('status', values.status);
      if (values.due_date) formData.append('due_date', values.due_date.format('YYYY-MM-DD'));
      if (values.assigned_to) formData.append('assignee_id', values.assigned_to.toString());
      if (values.estimated_minutes) formData.append('estimated_minutes', values.estimated_minutes.toString());

      if (fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }

      // Append library resource IDs
      selectedResourceIds.forEach(id => {
        formData.append('library_resource_ids[]', id.toString());
      });

      data = formData;
    } else {
      data = {
        ...values,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        assignee_id: values.assigned_to,
        library_resource_ids: selectedResourceIds,
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

        setFileList([uploadFile]);
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
      width={540}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          priority: 'medium',
          status: 'pending',
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="e.g. Update WordPress plugins" style={controlStyle} />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Additional details..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="priority" label="Priority">
              <Select options={priorityOptions} style={controlStyle} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="status" label="Status">
              <Select options={statusOptions} style={controlStyle} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="due_date" label="Due Date">
              <DatePicker style={{ width: '100%', ...controlStyle }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
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
          <Col span={10}>
            <Form.Item name="estimated_minutes" label="Est. Time (minutes)">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 60"
                suffix={<ClockCircleOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                style={controlStyle}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* File Attachments */}
        <Form.Item label={<><PaperClipOutlined /> Attachments</>}>
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            multiple={false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>
              Attach Files
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            Attach screenshots, documents, or feedback files{' '}
            <Tag color="geekblue" style={{ fontSize: 10, cursor: 'default' }}>📋 Paste supported</Tag>
          </Text>
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
              optionFilterProp="searchLabel"
              allowClear
              showSearch
              style={{ width: '100%' }}
              value={(form.getFieldValue('_project_resource_urls') || [])}
              onChange={(val: string[]) => form.setFieldsValue({ _project_resource_urls: val })}
              options={projectResources
                .filter((r: any) => r.type === 'link' && r.url)
                .map((r: any) => ({
                  label: `🔗 ${r.title}`,
                  value: r.url,
                  searchLabel: r.title,
                }))
              }
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Include project resource links in the todo description
            </Text>
          </Form.Item>
        )}
      </Form>
    </Modal >
  );
}

