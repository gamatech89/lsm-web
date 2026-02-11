/**
 * Todo Form Modal
 * Used for creating and editing todos within a project
 * Features: File attachments, consistent styling
 */

import { useEffect, useState } from 'react';
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
} from 'antd';
import { UploadOutlined, PaperClipOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { priorityOptions, statusOptions, CONTROL_HEIGHT } from '../constants';
import type { Todo } from '@lsm/types';
import type { UploadFile } from 'antd';

const { Text } = Typography;

interface TodoFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  todo?: Todo | null;
  teamMembers: any[];
}

// Consistent size for all form controls (matches MaintenanceReportFormModal)
const controlStyle = { height: CONTROL_HEIGHT };

export function TodoFormModal({
  open,
  onClose,
  projectId,
  todo,
  teamMembers,
}: TodoFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!todo;
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Fetch users removed - received via props

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
      // Load existing attachments if any
      setFileList([]);
    } else if (!todo && open) {
      form.resetFields();
      setFileList([]);
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
      data = formData;
    } else {
      data = {
        ...values,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        // Map assigned_to to assignee_id for API consistency
        assignee_id: values.assigned_to,
      };
      // cleanup assigned_to from spread
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

  const userOptions = teamMembers.map(u => ({ label: u.name, value: u.id }));

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
            Attach screenshots, documents, or feedback files
          </Text>
        </Form.Item>
      </Form>
    </Modal>
  );
}
