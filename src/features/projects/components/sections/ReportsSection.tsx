/**
 * Reports Section - Maintenance Reports Management
 * 
 * Features:
 * - List of maintenance reports
 * - Create new report with comprehensive form
 * - Download report as PDF
 * - View report details
 */

import { useState } from 'react';
import { Card, Table, Typography, Button, Space, Tag, Empty, App, Modal, Dropdown, List, Divider } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { apiClient } from '@/lib/api';
import { formatDate } from '@lsm/utils';
import { saveAs } from 'file-saver';
import type { ColumnsType } from 'antd/es/table';
import { MaintenanceReportFormModal } from '../MaintenanceReportFormModal';
import type { MaintenanceReport } from '@lsm/types';

const { Title, Text, Paragraph } = Typography;

interface ReportsSectionProps {
  project: any;
}

export default function ReportsSection({ project }: ReportsSectionProps) {
  const { message, modal } = App.useApp();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingReport, setViewingReport] = useState<MaintenanceReport | null>(null);
  const [editingReport, setEditingReport] = useState<MaintenanceReport | null>(null);

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['project-reports', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/maintenance-reports`).then(r => r.data.data),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/maintenance-reports/${id}`),
    onSuccess: () => {
      message.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['project-reports', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => {
      message.error('Failed to delete report');
    },
  });

  // Download PDF
  const handleDownloadPdf = async (reportId: number) => {
    try {
      message.loading('Generating PDF...');
      const response = await apiClient.get(`/maintenance-reports/${reportId}/pdf`, {
        responseType: 'blob',
      });
      saveAs(new Blob([response.data], { type: 'application/pdf' }), `maintenance-report-${project.name}-${reportId}.pdf`);
      message.destroy();
      message.success('PDF downloaded');
    } catch {
      message.destroy();
      message.error('Failed to download PDF');
    }
  };

  // Handle delete
  const handleDelete = (report: MaintenanceReport) => {
    modal.confirm({
      title: 'Delete Report',
      content: 'Are you sure you want to delete this report? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(report.id),
    });
  };

  const columns: ColumnsType<MaintenanceReport> = [
    {
      title: 'Report',
      key: 'report',
      render: (_, record) => (
        <div>
          <Space>
            <Text strong style={{ cursor: 'pointer' }} onClick={() => setViewingReport(record)}>
              {formatDate(record.report_date)} - {record.type}
            </Text>
            {(record as any).has_uploaded_pdf && (
              <Tag icon={<FilePdfOutlined />} color="red" style={{ marginLeft: 4 }}>PDF</Tag>
            )}
          </Space>
          {record.summary && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.summary.substring(0, 80)}{record.summary.length > 80 ? '...' : ''}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'monthly' ? 'blue' : type === 'weekly' ? 'green' : 'default'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Tasks',
      key: 'tasks',
      width: 80,
      render: (_, record) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#22c55e' }} />
          <Text>{record.tasks_completed?.length || 0}</Text>
        </Space>
      ),
    },
    {
      title: 'Issues',
      key: 'issues',
      width: 80,
      render: (_, record) => {
        const found = record.issues_found?.length || 0;
        const resolved = record.issues_resolved?.length || 0;
        return (
          <Space>
            <WarningOutlined style={{ color: found > resolved ? '#f59e0b' : '#22c55e' }} />
            <Text>{resolved}/{found}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Time',
      key: 'time',
      width: 80,
      render: (_, record) => record.time_spent_minutes ? (
        <Space>
          <ClockCircleOutlined />
          <Text>{record.time_spent_minutes}m</Text>
        </Space>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Details',
            onClick: () => setViewingReport(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit Report',
            onClick: () => setEditingReport(record),
          },
          {
            key: 'download',
            icon: <DownloadOutlined />,
            label: 'Download PDF',
            onClick: () => handleDownloadPdf(record.id),
          },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => handleDelete(record),
          },
        ];

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadPdf(record.id)}
            >
              PDF
            </Button>
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // Empty state
  if (!isLoading && (!reports || reports.length === 0)) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Empty
          image={<FileTextOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
          description={<Text type="secondary">No maintenance reports yet</Text>}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Create First Report
          </Button>
        </Empty>

        {/* Create Modal */}
        <MaintenanceReportFormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          projectId={project.id}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Maintenance Reports</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
          New Report
        </Button>
      </div>

      {/* Reports Table */}
      <Card
        style={{ borderRadius: 12, background: isDark ? '#1e293b' : '#fff' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={reports || []}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Modal */}
      <MaintenanceReportFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={project.id}
      />

      {/* Edit Modal */}
      {editingReport && (
        <MaintenanceReportFormModal
          open={!!editingReport}
          onClose={() => setEditingReport(null)}
          projectId={project.id}
          report={editingReport}
        />
      )}

      {/* View Modal */}
      <Modal
        title={`Maintenance Report - ${viewingReport ? formatDate(viewingReport.report_date) : ''}`}
        open={!!viewingReport}
        onCancel={() => setViewingReport(null)}
        footer={[
          <Button 
            key="edit" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingReport(viewingReport);
              setViewingReport(null);
            }}
          >
            Edit
          </Button>,
          <Button 
            key="download" 
            type="primary"
            icon={<DownloadOutlined />} 
            onClick={() => viewingReport && handleDownloadPdf(viewingReport.id)}
          >
            Download PDF
          </Button>,
        ]}
        width={700}
      >
        {viewingReport && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={viewingReport.type === 'monthly' ? 'blue' : viewingReport.type === 'weekly' ? 'green' : 'default'}>
                {viewingReport.type}
              </Tag>
              {viewingReport.time_spent_minutes && (
                <Tag icon={<ClockCircleOutlined />}>
                  {viewingReport.time_spent_minutes} minutes
                </Tag>
              )}
              {(viewingReport as any).has_uploaded_pdf && (
                <Tag icon={<FilePdfOutlined />} color="red">Uploaded PDF</Tag>
              )}
            </Space>

            {(viewingReport as any).has_uploaded_pdf && (
              <>
                <Divider>Uploaded Report</Divider>
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 12 }} />
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                      This report was uploaded as a PDF file.
                    </Text>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />} 
                      onClick={() => handleDownloadPdf(viewingReport.id)}
                    >
                      Download PDF Report
                    </Button>
                  </div>
                </div>
              </>
            )}

            {viewingReport.summary && (
              <>
                <Divider>Summary</Divider>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {viewingReport.summary}
                </Paragraph>
              </>
            )}

            {viewingReport.tasks_completed && viewingReport.tasks_completed.length > 0 && (
              <>
                <Divider><CheckCircleOutlined style={{ color: '#22c55e' }} /> Tasks Completed ({viewingReport.tasks_completed.length})</Divider>
                <List
                  size="small"
                  dataSource={viewingReport.tasks_completed}
                  renderItem={(task: string) => (
                    <List.Item>
                      <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 8 }} />
                      {task}
                    </List.Item>
                  )}
                />
              </>
            )}

            {viewingReport.issues_found && viewingReport.issues_found.length > 0 && (
              <>
                <Divider><WarningOutlined style={{ color: '#f59e0b' }} /> Issues Found ({viewingReport.issues_found.length})</Divider>
                <List
                  size="small"
                  dataSource={viewingReport.issues_found}
                  renderItem={(issue: string) => {
                    const isResolved = viewingReport.issues_resolved?.includes(issue);
                    return (
                      <List.Item>
                        {isResolved ? (
                          <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 8 }} />
                        ) : (
                          <WarningOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                        )}
                        <span style={{ textDecoration: isResolved ? 'line-through' : 'none', opacity: isResolved ? 0.7 : 1 }}>
                          {issue}
                        </span>
                        {isResolved && <Tag color="success" style={{ marginLeft: 8 }}>Resolved</Tag>}
                      </List.Item>
                    );
                  }}
                />
              </>
            )}

            {viewingReport.notes && (
              <>
                <Divider>Notes</Divider>
                <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#64748b' }}>
                  {viewingReport.notes}
                </Paragraph>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
