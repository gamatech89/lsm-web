/**
 * Project Form Modal
 * Used for both creating and editing projects
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Divider,
  App,
} from 'antd';
import {
  GlobalOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project, CreateProjectRequest } from '@lsm/types';

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null; // If provided, edit mode
}

const healthStatusOptions = [
  { label: 'Online', value: 'online' },
  { label: 'Down', value: 'down_error' },
  { label: 'Updating', value: 'updating' },
];

const securityStatusOptions = [
  { label: 'Secure', value: 'secure' },
  { label: 'Monitoring', value: 'monitoring' },
  { label: 'At Risk', value: 'compromised' },
  { label: 'Hacked', value: 'hacked' },
];

export function ProjectFormModal({ open, onClose, project }: ProjectFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!project;

  // Fetch users for manager/developer dropdowns
  const { data: users } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.team.list({}).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list().then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => api.projects.create(data),
    onSuccess: () => {
      message.success('Project created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      form.resetFields();
    },
    onError: () => {
      message.error('Failed to create project');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateProjectRequest>) =>
      api.projects.update(project!.id, data),
    onSuccess: () => {
      message.success('Project updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', project!.id] });
      onClose();
    },
    onError: () => {
      message.error('Failed to update project');
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (project && open) {
      form.setFieldsValue({
        name: project.name,
        url: project.url,
        client_email: project.client_email,
        notes: project.notes,
        health_status: project.health_status,
        security_status: project.security_status,
        manager_id: project.manager_id,
        developer_ids: project.developers?.map(d => d.id) || [],
        tag_ids: project.tags?.map(t => t.id) || [],
        health_check_secret: project.health_check_secret,
        project_external_id: project.project_external_id,
        maintenance_id: project.maintenance_id,
      });
    } else if (!project && open) {
      form.resetFields();
    }
  }, [project, open, form]);

  const handleSubmit = async (values: CreateProjectRequest) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const managerOptions = users
    ?.filter(u => u.role === 'manager' || u.role === 'admin')
    .map(u => ({ label: u.name, value: u.id })) || [];
    
  const developerOptions = users
    ?.filter(u => u.role === 'developer')
    .map(u => ({ label: u.name, value: u.id })) || [];

  const tagOptions = tags?.map(t => ({ label: t.name, value: t.id })) || [];

  return (
    <Modal
      title={isEditMode ? 'Edit Project' : 'New Project'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEditMode ? 'Update' : 'Create'}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          health_status: 'online',
          security_status: 'secure',
        }}
      >
        {/* Basic Info */}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Project Name"
              rules={[{ required: true, message: 'Please enter project name' }]}
            >
              <Input placeholder="My Website" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="client_email"
              label="Client Email"
            >
              <Input prefix={<MailOutlined />} placeholder="client@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="url"
          label="URL"
          rules={[
            { required: true, message: 'Please enter URL' },
            { type: 'url', message: 'Please enter a valid URL' },
          ]}
        >
          <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
        </Form.Item>

        {/* External IDs - moved to top */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="project_external_id"
              label="External ID"
              tooltip="External project identifier (e.g., LP10001)"
            >
              <Input placeholder="LP10001" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maintenance_id"
              label="Maintenance ID"
              tooltip="Maintenance contract identifier"
            >
              <Input placeholder="M-2025-001" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="health_status" label="Health Status">
              <Select options={healthStatusOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="security_status" label="Security Status">
              <Select options={securityStatusOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Team</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="manager_id" label="Manager">
              <Select
                options={managerOptions}
                placeholder="Select manager"
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="developer_ids" label="Developers">
              <Select
                mode="multiple"
                options={developerOptions}
                placeholder="Select developers"
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>



        <Form.Item name="tag_ids" label="Tags">
          <Select
            mode="multiple"
            options={tagOptions}
            placeholder="Select tags"
            allowClear
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="Additional notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
