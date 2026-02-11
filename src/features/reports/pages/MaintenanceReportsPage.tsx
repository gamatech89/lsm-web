/**
 * Maintenance Reports Page
 * List and manage maintenance reports for a project
 */

import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Row,
  Col,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  App,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { formatDate } from '@lsm/utils';
import type { MaintenanceReport } from '@lsm/types';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const reportTypeOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Ad-hoc', value: 'ad-hoc' },
];

export function MaintenanceReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = parseInt(projectId!, 10);
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [showModal, setShowModal] = useState(false);

  // Fetch project for name
  const { data: project } = useQuery({
    queryKey: ['projects', pid],
    queryFn: () => api.projects.get(pid).then(r => r.data.data),
    enabled: !!pid,
  });

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['projects', pid, 'reports'],
    queryFn: () => api.maintenanceReports.list(pid).then(r => r.data.data),
    enabled: !!pid,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      report_date: string;
      type: 'monthly' | 'weekly' | 'ad-hoc';
      summary: string;
      tasks_completed?: string[];
      issues_found?: string[];
      notes?: string;
    }) => api.maintenanceReports.create(pid, data),
    onSuccess: () => {
      message.success('Report created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', pid, 'reports'] });
      setShowModal(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Failed to create report');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => api.maintenanceReports.delete(pid, reportId),
    onSuccess: () => {
      message.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['projects', pid, 'reports'] });
    },
    onError: () => {
      message.error('Failed to delete report');
    },
  });

  const handleDelete = (report: MaintenanceReport) => {
    modal.confirm({
      title: 'Delete Report',
      content: `Are you sure you want to delete this report from ${formatDate(report.report_date)}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(report.id),
    });
  };

  const handleSubmit = (values: {
    report_date: dayjs.Dayjs;
    type: 'monthly' | 'weekly' | 'ad-hoc';
    summary: string;
    tasks_completed?: string;
    issues_found?: string;
    notes?: string;
  }) => {
    const data = {
      report_date: values.report_date.format('YYYY-MM-DD'),
      type: values.type,
      summary: values.summary,
      tasks_completed: values.tasks_completed?.split('\n').filter(t => t.trim()),
      issues_found: values.issues_found?.split('\n').filter(t => t.trim()),
      notes: values.notes,
    };
    createMutation.mutate(data);
  };

  const columns: ColumnsType<MaintenanceReport> = [
    {
      title: 'Date',
      key: 'date',
      width: 120,
      render: (_, record) => formatDate(record.report_date),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'monthly' ? 'blue' : type === 'weekly' ? 'green' : 'default'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Summary',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: 'By',
      key: 'user',
      width: 120,
      render: (_, record) => record.user?.name || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.pdf_url && (
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              href={record.pdf_url}
              target="_blank"
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <Link to={`/projects/${pid}`}>
              <Button>← Back</Button>
            </Link>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                <FileTextOutlined /> Maintenance Reports
              </Title>
              <Text type="secondary">{project?.name || 'Loading...'}</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ report_date: dayjs() });
              setShowModal(true);
            }}
          >
            New Report
          </Button>
        </Col>
      </Row>

      {/* Table */}
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={reports || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No maintenance reports yet' }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="New Maintenance Report"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={() => form.submit()}
        okText="Create"
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="report_date"
                label="Report Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true }]}
              >
                <Select options={reportTypeOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="summary"
            label="Summary"
            rules={[{ required: true, message: 'Please enter a summary' }]}
          >
            <Input.TextArea rows={2} placeholder="Brief summary of this maintenance..." />
          </Form.Item>

          <Form.Item
            name="tasks_completed"
            label="Tasks Completed (one per line)"
          >
            <Input.TextArea rows={3} placeholder="Updated WordPress core&#10;Updated plugins&#10;Cleared cache" />
          </Form.Item>

          <Form.Item
            name="issues_found"
            label="Issues Found (one per line)"
          >
            <Input.TextArea rows={3} placeholder="Broken contact form&#10;Slow image loading" />
          </Form.Item>

          <Form.Item name="notes" label="Additional Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
